import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader! } },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { type, deal_id, amount, currency, price_id, plan, billing_cycle, success_url, cancel_url } = body;

    // Find or create Stripe customer
    let customerId: string | undefined;
    const { data: profile } = await supabase
      .from("users")
      .select("stripe_customer_id, email, company_name")
      .eq("id", user.id)
      .single();

    if (profile?.stripe_customer_id) {
      customerId = profile.stripe_customer_id;
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_uid: user.id, company: profile?.company_name || "" },
      });
      customerId = customer.id;
      await supabase
        .from("users")
        .update({ stripe_customer_id: customer.id })
        .eq("id", user.id);
    }

    let sessionConfig: Stripe.Checkout.SessionCreateParams;

    if (type === "escrow") {
      // Escrow deal payment — one-time
      sessionConfig = {
        customer: customerId,
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: (currency || "USD").toLowerCase(),
              product_data: {
                name: `Escrow Payment — Deal ${deal_id}`,
                description: "Secure escrow payment via Whistle AI",
              },
              unit_amount: Math.round(Number(amount) * 100),
            },
            quantity: 1,
          },
        ],
        payment_intent_data: {
          metadata: { deal_id, user_id: user.id, type: "escrow" },
          capture_method: "manual", // Hold funds, release later
        },
        success_url: success_url || "https://whistle-ai.com/app/buyer#deals",
        cancel_url: cancel_url || "https://whistle-ai.com/app/buyer#deals",
        metadata: { deal_id, user_id: user.id, type: "escrow" },
      };
    } else if (type === "one_analysis") {
      // One-time analysis purchase
      sessionConfig = {
        customer: customerId,
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: "Whistle AI — Export Analysis",
                description: "One-time market analysis report",
              },
              unit_amount: Math.round(Number(amount || 2000)),
            },
            quantity: 1,
          },
        ],
        success_url: success_url || "https://whistle-ai.com/app#analysis",
        cancel_url: cancel_url || "https://whistle-ai.com/app#analysis",
        metadata: { user_id: user.id, type: "one_analysis" },
      };
    } else if (price_id) {
      // Subscription payment
      sessionConfig = {
        customer: customerId,
        mode: "subscription",
        line_items: [{ price: price_id, quantity: 1 }],
        success_url: success_url || "https://whistle-ai.com/app#subscription",
        cancel_url: cancel_url || "https://whistle-ai.com/app#subscription",
        subscription_data: {
          metadata: { user_id: user.id, plan: plan || "", billing_cycle: billing_cycle || "m" },
        },
        metadata: { user_id: user.id, type: "subscription", plan: plan || "" },
      };
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid payment type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    return new Response(
      JSON.stringify({ url: session.url, sessionId: session.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Checkout error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
