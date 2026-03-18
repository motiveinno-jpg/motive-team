import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://whistle-ai.com",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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
          pause_collection: "",
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
          free: 1, starter: 10, pro: 50, enterprise: 999,
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

      /* ─── RELEASE ESCROW (auto or manual) ─── */
      case "release_escrow": {
        const { payment_intent_id, deal_id } = body;
        if (!payment_intent_id) {
          return respond({ error: "payment_intent_id required" }, 400);
        }

        // Authorization: verify caller owns this payment or the related deal
        const { data: paymentRecord } = await supabase
          .from("payments")
          .select("user_id, deal_id")
          .eq("stripe_payment_intent", payment_intent_id)
          .single();

        if (!paymentRecord) {
          return respond({ error: "Payment record not found" }, 404);
        }

        // Check: caller must be the buyer (payment owner) or the seller (deal owner via matchings)
        let isAuthorized = paymentRecord.user_id === user.id;
        if (!isAuthorized && paymentRecord.deal_id) {
          const { data: deal } = await supabase
            .from("matchings")
            .select("user_id")
            .eq("id", paymentRecord.deal_id)
            .single();
          isAuthorized = deal?.user_id === user.id;
        }
        if (!isAuthorized) {
          return respond({ error: "Not authorized to release this payment" }, 403);
        }

        // Capture the held payment
        const pi = await stripe.paymentIntents.capture(payment_intent_id);

        // Update payment record
        await supabase
          .from("payments")
          .update({
            status: "released",
            released_at: new Date().toISOString(),
          })
          .eq("stripe_payment_intent", payment_intent_id);

        // Notify seller
        if (deal_id) {
          const { data: matching } = await supabase
            .from("matchings")
            .select("user_id")
            .eq("id", deal_id)
            .single();
          if (matching) {
            await supabase.from("notifications").insert({
              user_id: matching.user_id,
              type: "payment",
              title: "Payment Released",
              body: `Escrow payment of ${pi.currency.toUpperCase()} ${(pi.amount / 100).toFixed(2)} has been released to your account.`,
              link_page: "deals",
              link_id: deal_id,
              is_read: false,
            });
          }
        }

        return respond({
          ok: true,
          amount: pi.amount / 100,
          currency: pi.currency.toUpperCase(),
        });
      }

      default:
        return respond({ error: "Unknown action: " + action }, 400);
    }
  } catch (err) {
    console.error("manage-subscription error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
