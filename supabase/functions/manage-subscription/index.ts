import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://whistle-ai.com",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Zero-decimal currencies — amount is already in smallest unit
const ZERO_DECIMAL_CURRENCIES = ["jpy", "krw", "vnd", "clp", "pyg", "rwf", "ugx", "xof", "xaf"];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(
        JSON.stringify({ error: "Stripe not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sbAdmin = createClient(supabaseUrl, supabaseServiceRole);

    // Extract and validate user from JWT
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userErr } = await sbAdmin.auth.getUser(token);
    if (!user || userErr) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create user-scoped client for RLS operations
    const supabaseKey = Deno.env.get("CUSTOM_ANON_KEY") || Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const body = await req.json();
    const { action, event_type, details } = body;

    // Get user profile with stripe info
    const { data: profile } = await supabase
      .from("users")
      .select("stripe_customer_id, stripe_subscription_id, plan, subscription_status")
      .eq("id", user.id)
      .single();

    const respond = (data: Record<string, unknown>, status = 200) =>
      new Response(JSON.stringify(data), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    switch (action) {
      /* ─── CANCEL SUBSCRIPTION ─── */
      case "cancel": {
        if (!profile?.stripe_subscription_id) {
          return respond({ error: "No active subscription" }, 400);
        }
        await stripe.subscriptions.update(profile.stripe_subscription_id, {
          cancel_at_period_end: true,
        });
        await supabase
          .from("users")
          .update({ subscription_status: "canceling", updated_at: new Date().toISOString() })
          .eq("id", user.id);
        return respond({ ok: true, message: "Subscription will cancel at period end" });
      }

      /* ─── PAUSE SUBSCRIPTION ─── */
      case "pause": {
        if (!profile?.stripe_subscription_id) {
          return respond({ error: "No active subscription" }, 400);
        }
        await stripe.subscriptions.update(profile.stripe_subscription_id, {
          pause_collection: { behavior: "mark_uncollectible" },
        });
        await supabase
          .from("users")
          .update({ subscription_status: "paused", updated_at: new Date().toISOString() })
          .eq("id", user.id);
        return respond({ ok: true, message: "Subscription paused" });
      }

      /* ─── RESUME SUBSCRIPTION ─── */
      case "resume": {
        if (!profile?.stripe_subscription_id) {
          return respond({ error: "No active subscription" }, 400);
        }
        await stripe.subscriptions.update(profile.stripe_subscription_id, {
          pause_collection: null as unknown as Stripe.SubscriptionUpdateParams["pause_collection"],
          cancel_at_period_end: false,
        });
        await supabase
          .from("users")
          .update({ subscription_status: "active", updated_at: new Date().toISOString() })
          .eq("id", user.id);
        return respond({ ok: true, message: "Subscription resumed" });
      }

      /* ─── RECORD USAGE EVENT ─── */
      case "record_usage": {
        await supabase.from("usage_events").insert({
          user_id: user.id,
          event_type: event_type || "ai_analysis",
          details: details || {},
          created_at: new Date().toISOString(),
        });
        return respond({ ok: true });
      }

      /* ─── GET USAGE ─── */
      case "get_usage": {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const { count } = await supabase
          .from("usage_events")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .gte("created_at", startOfMonth.toISOString());

        const limits: Record<string, number> = {
          free: 1, starter: 20, pro: 50, enterprise: 999,
        };
        const plan = profile?.plan || "free";
        const limit = limits[plan] || 1;

        return respond({
          ok: true,
          usage: count || 0,
          limit,
          plan,
          remaining: Math.max(0, limit - (count || 0)),
        });
      }

      /* ─── RELEASE ESCROW (manual settlement) ─── */
      case "release_escrow": {
        const { payment_intent_id, deal_id } = body;
        if (!payment_intent_id) {
          return respond({ error: "payment_intent_id required" }, 400);
        }

        // Use admin client for cross-user payment lookup (buyer's payment, seller's deal)
        const { data: paymentRecord } = await sbAdmin
          .from("payments")
          .select("id, user_id, deal_id, amount, currency, status")
          .eq("stripe_payment_intent", payment_intent_id)
          .single();

        if (!paymentRecord) {
          return respond({ error: "Payment record not found" }, 404);
        }
        if (paymentRecord.status !== "held") {
          return respond({ error: "Payment is not in held status" }, 400);
        }

        // Check: only the BUYER (payment owner) or admin can release escrow
        // Sellers cannot self-release — this protects the buyer's escrow
        const isBuyer = paymentRecord.user_id === user.id;
        const { data: callerRole } = await sbAdmin
          .from("users")
          .select("role")
          .eq("id", user.id)
          .single();
        const isAdmin = callerRole?.role === "admin";

        if (!isBuyer && !isAdmin) {
          return respond({ error: "Only the buyer or admin can release escrow" }, 403);
        }

        // Full-capture model: payment already charged. Transfer full amount to seller.
        // Early partner benefit: 0% platform fee (Stripe processing fee already deducted at charge time).
        // Category-based fees reserved for future activation.
        const platformFee = 0;
        const netAmount = paymentRecord.amount;

        const releaseDealId = deal_id || paymentRecord.deal_id;
        if (releaseDealId) {
          const { data: dealData } = await supabase
            .from("matchings")
            .select("user_id")
            .eq("id", releaseDealId)
            .single();

          if (dealData) {
            // Check if seller has connected Stripe account
            const { data: sellerProfile } = await sbAdmin
              .from("users")
              .select("stripe_connect_account_id")
              .eq("id", dealData.user_id)
              .single();

            if (sellerProfile?.stripe_connect_account_id) {
              const transferAmount = ZERO_DECIMAL_CURRENCIES.includes(paymentRecord.currency?.toLowerCase())
                ? Math.round(netAmount)
                : Math.round(netAmount * 100);
              await stripe.transfers.create({
                amount: transferAmount,
                currency: paymentRecord.currency.toLowerCase(),
                destination: sellerProfile.stripe_connect_account_id,
                transfer_group: `escrow_${releaseDealId}`,
                metadata: {
                  deal_id: releaseDealId,
                  payment_id: paymentRecord.id || "",
                  type: "escrow_settlement",
                },
              });
            }

            // Notify seller
            await supabase.from("notifications").insert({
              user_id: dealData.user_id,
              type: "payment",
              title: "Payment Released",
              body: `Escrow payment of ${paymentRecord.currency} ${netAmount.toFixed(2)} has been released (full amount, 0% platform fee).`,
              link_page: "deals",
              link_id: releaseDealId,
              is_read: false,
            });

            // Update deal settlement
            await supabase
              .from("matchings")
              .update({
                settlement_status: "settled",
                settled_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq("id", releaseDealId);
          }
        }

        // Update payment record (admin client for cross-user writes)
        await sbAdmin
          .from("payments")
          .update({
            status: "settled",
            settled_at: new Date().toISOString(),
            platform_fee: platformFee,
            net_amount: netAmount,
          })
          .eq("stripe_payment_intent", payment_intent_id);

        return respond({
          ok: true,
          amount: netAmount,
          currency: paymentRecord.currency,
        });
      }

      /* ─── UPGRADE SUBSCRIPTION (change price, prorate) ─── */
      case "upgrade": {
        const { new_price_id, plan: newPlan, billing_cycle: newCycle } = body;
        if (!profile?.stripe_subscription_id) {
          return respond({ error: "No active subscription to upgrade" }, 400);
        }
        if (!new_price_id || typeof new_price_id !== "string" || !new_price_id.startsWith("price_")) {
          return respond({ error: "Invalid price identifier" }, 400);
        }

        // Retrieve current subscription to get the item ID
        const currentSub = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
        if (!currentSub || !currentSub.items?.data?.length) {
          return respond({ error: "Could not retrieve current subscription" }, 500);
        }

        const subscriptionItemId = currentSub.items.data[0].id;

        // Update the subscription with new price, prorating the difference
        const updatedSub = await stripe.subscriptions.update(profile.stripe_subscription_id, {
          items: [
            {
              id: subscriptionItemId,
              price: new_price_id,
            },
          ],
          proration_behavior: "create_prorations",
          cancel_at_period_end: false,
          metadata: {
            user_id: user.id,
            plan: newPlan || "",
            billing_cycle: newCycle || "m",
          },
        });

        // Update user profile with new plan
        await supabase
          .from("users")
          .update({
            plan: newPlan || profile.plan,
            subscription_status: "active",
            updated_at: new Date().toISOString(),
          })
          .eq("id", user.id);

        return respond({
          ok: true,
          message: "Subscription updated with proration",
          plan: newPlan,
          subscription_id: updatedSub.id,
        });
      }

      /* ─── REFUND ─── */
      case "refund": {
        const { payment_intent_id: refundPiId, reason, refund_type } = body;
        if (!refundPiId) {
          return respond({ error: "payment_intent_id required" }, 400);
        }

        // Look up the payment record
        const { data: refundPayment } = await supabase
          .from("payments")
          .select("id, user_id, deal_id, amount, currency, status, type, created_at, stripe_payment_intent")
          .eq("stripe_payment_intent", refundPiId)
          .single();

        if (!refundPayment) {
          return respond({ error: "Payment not found" }, 404);
        }

        // Authorization: only the payment owner or admin can request refund
        if (refundPayment.user_id !== user.id) {
          const { data: callerProfile } = await sbAdmin
            .from("users")
            .select("role")
            .eq("id", user.id)
            .single();
          if (!callerProfile || callerProfile.role !== "admin") {
            return respond({ error: "Not authorized to refund this payment" }, 403);
          }
        }

        // Subscription cooling period check (7 days)
        const COOLING_PERIOD_DAYS = 7;
        if (refund_type === "subscription_cooling") {
          const createdAt = new Date(refundPayment.created_at);
          const now = new Date();
          const daysSincePayment = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
          if (daysSincePayment > COOLING_PERIOD_DAYS) {
            return respond({
              error: `Cooling period refund is only available within ${COOLING_PERIOD_DAYS} days of payment`,
            }, 400);
          }
        }

        // Process refund via Stripe
        const refund = await stripe.refunds.create({
          payment_intent: refundPiId,
          reason: reason === "duplicate" ? "duplicate" :
                  reason === "fraudulent" ? "fraudulent" : "requested_by_customer",
          metadata: {
            user_id: user.id,
            refund_type: refund_type || "manual",
            deal_id: refundPayment.deal_id || "",
          },
        });

        // Update payment record
        await supabase
          .from("payments")
          .update({
            status: "refunded",
            refunded_at: new Date().toISOString(),
            refund_reason: reason || refund_type || "requested",
          })
          .eq("stripe_payment_intent", refundPiId);

        // If escrow refund, update deal status
        if (refundPayment.type === "escrow" && refundPayment.deal_id) {
          await supabase
            .from("matchings")
            .update({
              settlement_status: "refunded",
              updated_at: new Date().toISOString(),
            })
            .eq("id", refundPayment.deal_id);
        }

        // If subscription cancellation refund, cancel the subscription
        if (refund_type === "subscription_cooling" && profile?.stripe_subscription_id) {
          await stripe.subscriptions.cancel(profile.stripe_subscription_id);
          await supabase
            .from("users")
            .update({
              plan: "free",
              subscription_status: "canceled",
              stripe_subscription_id: null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", user.id);
        }

        // Notify user
        await supabase.from("notifications").insert({
          user_id: refundPayment.user_id,
          type: "payment",
          title: "Refund Processed",
          body: `A refund of ${refundPayment.currency} ${refundPayment.amount.toFixed(2)} has been processed. It may take 5-10 business days to appear.`,
          is_read: false,
        });

        return respond({
          ok: true,
          refund_id: refund.id,
          amount: refundPayment.amount,
          currency: refundPayment.currency,
          status: refund.status,
        });
      }

      default:
        return respond({ error: "Unknown action: " + action }, 400);
    }
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("manage-subscription error:", errMsg);
    return new Response(
      JSON.stringify({ error: "An error occurred. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
