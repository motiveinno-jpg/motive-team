import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const COOLING_PERIOD_DAYS = 7;

const ALLOWED_ORIGINS = [
  "https://whistle-ai.com",
  "https://www.whistle-ai.com",
];

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") || "";
  const isAllowed = ALLOWED_ORIGINS.includes(origin);
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  corsHeaders: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return jsonResponse({ error: "Payment service unavailable" }, 500, corsHeaders);
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sbAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Auth: cron secret or user JWT
    const cronSecret = Deno.env.get("CRON_SECRET");
    const authHeader = req.headers.get("Authorization");
    const cronHeader = req.headers.get("x-cron-secret");
    let callerUserId: string | null = null;
    let isAdmin = false;

    if (cronSecret && cronHeader === cronSecret) {
      isAdmin = true;
    } else if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const {
        data: { user },
        error,
      } = await sbAdmin.auth.getUser(token);
      if (error || !user) {
        return jsonResponse({ error: "Unauthorized" }, 401, corsHeaders);
      }
      callerUserId = user.id;
      const { data: userData } = await sbAdmin
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();
      isAdmin = userData?.role === "admin";
    } else {
      return jsonResponse({ error: "Unauthorized" }, 401, corsHeaders);
    }

    const body = await req.json();
    const { refund_type } = body;

    switch (refund_type) {
      /* ─── SUBSCRIPTION COOLING PERIOD REFUND ─── */
      case "subscription_cooling": {
        const { reason } = body;

        // Auto-lookup: find the user's latest subscription payment
        if (!callerUserId && !isAdmin) {
          return jsonResponse({ error: "User authentication required" }, 401, corsHeaders);
        }

        const targetUserId = callerUserId;
        if (!targetUserId) {
          return jsonResponse(
            { error: "User ID required for subscription refund" },
            400,
            corsHeaders,
          );
        }

        const { data: payment, error: paymentError } = await sbAdmin
          .from("payments")
          .select("*")
          .eq("user_id", targetUserId)
          .eq("type", "subscription")
          .eq("status", "completed")
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (paymentError || !payment) {
          return jsonResponse(
            { error: "No eligible subscription payment found" },
            404,
            corsHeaders,
          );
        }

        // Check cooling period
        const createdAt = new Date(payment.created_at);
        const daysSince =
          (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince > COOLING_PERIOD_DAYS) {
          return jsonResponse(
            {
              error: `Cooling period expired. Refund available within ${COOLING_PERIOD_DAYS} days of payment only.`,
            },
            400,
            corsHeaders,
          );
        }

        if (!payment.stripe_payment_intent) {
          return jsonResponse(
            { error: "Payment record missing Stripe reference" },
            400,
            corsHeaders,
          );
        }

        // Process Stripe refund
        const refund = await stripe.refunds.create({
          payment_intent: payment.stripe_payment_intent,
          reason: "requested_by_customer",
          metadata: {
            user_id: payment.user_id,
            refund_type: "subscription_cooling",
            reason: reason || "cooling_period",
          },
        });

        // Cancel subscription
        const { data: userProfile } = await sbAdmin
          .from("users")
          .select("stripe_subscription_id")
          .eq("id", payment.user_id)
          .single();

        if (userProfile?.stripe_subscription_id) {
          await stripe.subscriptions.cancel(
            userProfile.stripe_subscription_id,
          );
        }

        // Update payment record
        await sbAdmin
          .from("payments")
          .update({
            status: "refunded",
            refunded_at: new Date().toISOString(),
            refund_reason: reason || "subscription_cooling_period",
          })
          .eq("id", payment.id);

        // Downgrade user to free plan
        await sbAdmin
          .from("users")
          .update({
            plan: "free",
            subscription_status: "canceled",
            stripe_subscription_id: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", payment.user_id);

        await sbAdmin.from("notifications").insert({
          user_id: payment.user_id,
          type: "payment",
          title: "Subscription Refund Processed",
          body: `Your subscription has been canceled and ${payment.currency} ${payment.amount.toFixed(2)} will be refunded within 5-10 business days.`,
          is_read: false,
        });

        return jsonResponse({
          ok: true,
          refund_id: refund.id,
          amount: payment.amount,
          currency: payment.currency,
        }, 200, corsHeaders);
      }

      /* ─── ESCROW DISPUTE REFUND ─── */
      case "escrow_dispute": {
        const { payment_intent_id, deal_id, reason } = body;
        if (!payment_intent_id) {
          return jsonResponse(
            { error: "payment_intent_id required" },
            400,
            corsHeaders,
          );
        }

        const { data: payment } = await sbAdmin
          .from("payments")
          .select("*")
          .eq("stripe_payment_intent", payment_intent_id)
          .eq("type", "escrow")
          .single();

        if (!payment) {
          return jsonResponse(
            { error: "Escrow payment not found" },
            404,
            corsHeaders,
          );
        }

        if (payment.status === "refunded" || payment.status === "settled") {
          return jsonResponse(
            { error: "Payment already settled or refunded" },
            400,
            corsHeaders,
          );
        }

        // Only buyer (payment owner) or admin can dispute
        if (!isAdmin && payment.user_id !== callerUserId) {
          return jsonResponse({ error: "Not authorized" }, 403, corsHeaders);
        }

        // Process full refund
        const refund = await stripe.refunds.create({
          payment_intent: payment_intent_id,
          reason: "requested_by_customer",
          metadata: {
            user_id: payment.user_id,
            refund_type: "escrow_dispute",
            deal_id: deal_id || payment.deal_id || "",
            reason: reason || "buyer_dispute",
          },
        });

        // Update payment
        await sbAdmin
          .from("payments")
          .update({
            status: "refunded",
            refunded_at: new Date().toISOString(),
            refund_reason: reason || "escrow_dispute",
          })
          .eq("stripe_payment_intent", payment_intent_id);

        // Update deal
        const targetDealId = deal_id || payment.deal_id;
        if (targetDealId) {
          await sbAdmin
            .from("matchings")
            .update({
              settlement_status: "disputed_refunded",
              updated_at: new Date().toISOString(),
            })
            .eq("id", targetDealId);

          // Notify both parties
          const { data: deal } = await sbAdmin
            .from("matchings")
            .select("user_id, buyer_company")
            .eq("id", targetDealId)
            .single();

          if (deal) {
            // Notify seller
            await sbAdmin.from("notifications").insert({
              user_id: deal.user_id,
              type: "payment",
              title: "Escrow Dispute — Refund Issued",
              body: `The buyer has disputed the escrow payment. ${payment.currency} ${payment.amount.toFixed(2)} has been refunded.`,
              link_page: "deals",
              link_id: targetDealId,
              is_read: false,
            });
          }

          // Notify buyer
          await sbAdmin.from("notifications").insert({
            user_id: payment.user_id,
            type: "payment",
            title: "Escrow Refund Processed",
            body: `Your dispute has been processed. ${payment.currency} ${payment.amount.toFixed(2)} will be refunded within 5-10 business days.`,
            link_page: "deals",
            link_id: targetDealId,
            is_read: false,
          });
        }

        return jsonResponse({
          ok: true,
          refund_id: refund.id,
          amount: payment.amount,
          currency: payment.currency,
        }, 200, corsHeaders);
      }

      default:
        return jsonResponse(
          {
            error:
              "Invalid refund_type. Use: subscription_cooling or escrow_dispute",
          },
          400,
          corsHeaders,
        );
    }
  } catch (err: unknown) {
    const corsHeaders = getCorsHeaders(req);
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("process-refund error:", errMsg);
    return jsonResponse(
      { error: "An error occurred. Please try again." },
      500,
      corsHeaders,
    );
  }
});
