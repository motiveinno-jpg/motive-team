import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const COOLING_PERIOD_DAYS = 7;
const PLATFORM_FEE_RATE = 0.025;

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://whistle-ai.com",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return jsonResponse({ error: "Payment service unavailable" }, 500);
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
        return jsonResponse({ error: "Unauthorized" }, 401);
      }
      callerUserId = user.id;
      const { data: userData } = await sbAdmin
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();
      isAdmin = userData?.role === "admin";
    } else {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const body = await req.json();
    const { refund_type } = body;

    switch (refund_type) {
      /* ─── SUBSCRIPTION COOLING PERIOD REFUND ─── */
      case "subscription_cooling": {
        const { payment_intent_id } = body;
        if (!payment_intent_id) {
          return jsonResponse(
            { error: "payment_intent_id required" },
            400,
          );
        }

        const { data: payment } = await sbAdmin
          .from("payments")
          .select("*")
          .eq("stripe_payment_intent", payment_intent_id)
          .single();

        if (!payment) {
          return jsonResponse({ error: "Payment not found" }, 404);
        }

        // Only the payment owner or admin can request
        if (!isAdmin && payment.user_id !== callerUserId) {
          return jsonResponse({ error: "Not authorized" }, 403);
        }

        // Check cooling period
        const createdAt = new Date(payment.created_at);
        const daysSince =
          (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince > COOLING_PERIOD_DAYS) {
          return jsonResponse(
            {
              error: `Cooling period expired. Refund available within ${COOLING_PERIOD_DAYS} days only.`,
            },
            400,
          );
        }

        // Process Stripe refund
        const refund = await stripe.refunds.create({
          payment_intent: payment_intent_id,
          reason: "requested_by_customer",
          metadata: {
            user_id: payment.user_id,
            refund_type: "subscription_cooling",
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

        // Update records
        await sbAdmin
          .from("payments")
          .update({
            status: "refunded",
            refunded_at: new Date().toISOString(),
            refund_reason: "subscription_cooling_period",
          })
          .eq("stripe_payment_intent", payment_intent_id);

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
        });
      }

      /* ─── ESCROW DISPUTE REFUND ─── */
      case "escrow_dispute": {
        const { payment_intent_id, deal_id, reason } = body;
        if (!payment_intent_id) {
          return jsonResponse(
            { error: "payment_intent_id required" },
            400,
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
          );
        }

        if (payment.status === "refunded" || payment.status === "settled") {
          return jsonResponse(
            { error: "Payment already settled or refunded" },
            400,
          );
        }

        // Only buyer (payment owner) or admin can dispute
        if (!isAdmin && payment.user_id !== callerUserId) {
          return jsonResponse({ error: "Not authorized" }, 403);
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
        });
      }

      /* ─── SINGLE ANALYSIS REFUND (fallback data served) ─── */
      case "analysis_fallback": {
        const { payment_intent_id, analysis_id } = body;
        if (!payment_intent_id) {
          return jsonResponse(
            { error: "payment_intent_id required" },
            400,
          );
        }

        const { data: payment } = await sbAdmin
          .from("payments")
          .select("*")
          .eq("stripe_payment_intent", payment_intent_id)
          .eq("type", "one_analysis")
          .single();

        if (!payment) {
          return jsonResponse(
            { error: "Analysis payment not found" },
            404,
          );
        }

        if (payment.status === "refunded") {
          return jsonResponse(
            { error: "Already refunded" },
            400,
          );
        }

        // Only payment owner or admin
        if (!isAdmin && payment.user_id !== callerUserId) {
          return jsonResponse({ error: "Not authorized" }, 403);
        }

        // Process refund
        const refund = await stripe.refunds.create({
          payment_intent: payment_intent_id,
          reason: "requested_by_customer",
          metadata: {
            user_id: payment.user_id,
            refund_type: "analysis_fallback",
            analysis_id: analysis_id || "",
          },
        });

        await sbAdmin
          .from("payments")
          .update({
            status: "refunded",
            refunded_at: new Date().toISOString(),
            refund_reason: "analysis_fallback_data",
          })
          .eq("stripe_payment_intent", payment_intent_id);

        // Re-grant the analysis credit since data was bad
        await sbAdmin.rpc("increment_analysis_credits", {
          uid: payment.user_id,
          credits: 1,
        });

        await sbAdmin.from("notifications").insert({
          user_id: payment.user_id,
          type: "payment",
          title: "Analysis Refund Processed",
          body: `Your analysis payment of ${payment.currency} ${payment.amount.toFixed(2)} has been refunded due to incomplete data. An analysis credit has been restored.`,
          is_read: false,
        });

        return jsonResponse({
          ok: true,
          refund_id: refund.id,
          amount: payment.amount,
          currency: payment.currency,
          credit_restored: true,
        });
      }

      default:
        return jsonResponse(
          {
            error:
              "Invalid refund_type. Use: subscription_cooling, escrow_dispute, or analysis_fallback",
          },
          400,
        );
    }
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("process-refund error:", errMsg);
    return jsonResponse({ error: errMsg || "Internal error" }, 500);
  }
});
