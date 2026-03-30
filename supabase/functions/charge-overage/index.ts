import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const ALLOWED_ORIGINS = [
  "https://whistle-ai.com",
  "https://motiveinno-jpg.github.io",
];

function getCorsHeaders(req?: Request) {
  const origin = req?.headers.get("origin") || "";
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };
}

const OVERAGE_AMOUNT_CENTS = 190;
const OVERAGE_CURRENCY = "usd";

const RATE_LIMITS = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = RATE_LIMITS.get(userId);
  const windowMs = 60 * 60 * 1000;
  const max = 20;
  if (!entry || now > entry.resetAt) {
    RATE_LIMITS.set(userId, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count++;
  return true;
}

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
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return jsonResponse({ error: "Payment service unavailable" }, 500);
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sbAdmin = createClient(supabaseUrl, supabaseServiceRole);

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userErr,
    } = await sbAdmin.auth.getUser(token);
    if (!user || userErr) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    if (!checkRateLimit(user.id)) {
      return jsonResponse(
        { error: "Rate limit exceeded. Please try again later." },
        429,
      );
    }

    const body = await req.json();
    const { product_name, analysis_id } = body;

    // Get user's Stripe customer ID
    const { data: profile } = await sbAdmin
      .from("users")
      .select("stripe_customer_id, email, company_name")
      .eq("id", user.id)
      .single();

    if (!profile?.stripe_customer_id) {
      return jsonResponse(
        { error: "No payment method on file. Please subscribe first." },
        400,
      );
    }

    // Verify user has an active subscription (overages only for paid plans)
    const { data: sub } = await sbAdmin
      .from("subscriptions")
      .select("id, plan, status, stripe_subscription_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!sub) {
      return jsonResponse(
        { error: "Active subscription required for overage billing." },
        400,
      );
    }

    // Get customer's default payment method
    const customer = await stripe.customers.retrieve(
      profile.stripe_customer_id,
    );
    if (customer.deleted) {
      return jsonResponse({ error: "Customer account not found." }, 400);
    }

    const defaultPaymentMethod =
      customer.invoice_settings?.default_payment_method ||
      customer.default_source;

    if (!defaultPaymentMethod) {
      return jsonResponse(
        {
          error:
            "No default payment method found. Please update your payment method.",
        },
        400,
      );
    }

    // Create off-session PaymentIntent for $1.90
    const paymentIntent = await stripe.paymentIntents.create({
      amount: OVERAGE_AMOUNT_CENTS,
      currency: OVERAGE_CURRENCY,
      customer: profile.stripe_customer_id,
      payment_method:
        typeof defaultPaymentMethod === "string"
          ? defaultPaymentMethod
          : defaultPaymentMethod.id,
      off_session: true,
      confirm: true,
      description: `Whistle AI — Analysis overage (${sub.plan} plan)`,
      metadata: {
        user_id: user.id,
        type: "overage",
        plan: sub.plan,
        product_name: product_name || "",
        analysis_id: analysis_id || "",
      },
    });

    // Record billing event
    await sbAdmin.from("billing_events").insert({
      user_id: user.id,
      event_type: "ai_analysis_overage",
      amount: 1.9,
      currency: "USD",
      status: paymentIntent.status === "succeeded" ? "charged" : "pending",
      provider: "stripe",
      provider_event_id: paymentIntent.id,
      metadata: {
        analysis_id: analysis_id || null,
        product: product_name || null,
        plan: sub.plan,
        stripe_payment_intent: paymentIntent.id,
        overage_rate: "$1.90/report",
      },
    });

    if (paymentIntent.status === "succeeded") {
      return jsonResponse({
        success: true,
        payment_intent_id: paymentIntent.id,
        amount: 1.9,
        currency: "USD",
      });
    } else {
      return jsonResponse(
        {
          error: "Payment requires additional action.",
          status: paymentIntent.status,
          client_secret: paymentIntent.client_secret,
        },
        402,
      );
    }
  } catch (err: unknown) {
    const stripeErr = err as { type?: string; code?: string; message?: string };
    if (stripeErr?.type === "StripeCardError") {
      console.error("[charge-overage] Card declined:", stripeErr.message);
      return jsonResponse(
        {
          error:
            "Payment declined. Please update your payment method and try again.",
          code: stripeErr.code,
        },
        402,
      );
    }

    console.error("[charge-overage] ERROR:", stripeErr?.message || String(err));
    return jsonResponse(
      { error: "Payment processing failed. Please try again." },
      500,
    );
  }
});
