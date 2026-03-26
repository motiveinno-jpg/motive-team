import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://whistle-ai.com",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ONE_ANALYSIS_AMOUNT_CENTS = 990;
const ALLOWED_CURRENCIES = ["usd", "eur", "gbp", "jpy", "krw", "cny"];

const RATE_LIMITS = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW = 60 * 60 * 1000;

function checkRateLimit(
  userId: string,
  max: number = RATE_LIMIT_MAX,
  windowMs: number = RATE_LIMIT_WINDOW,
): boolean {
  const now = Date.now();
  const entry = RATE_LIMITS.get(userId);
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

function isPositiveFiniteNumber(value: unknown): value is number {
  const num = Number(value);
  return Number.isFinite(num) && num > 0;
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
      return jsonResponse({ error: "Rate limit exceeded. Please try again later." }, 429);
    }

    const supabaseKey =
      Deno.env.get("CUSTOM_ANON_KEY") || Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const body = await req.json();
    const { type, deal_id, price_id, plan, billing_cycle } = body;

    // Validate redirect URLs — hostname comparison to prevent open redirect
    const ALLOWED_ORIGINS = ["https://whistle-ai.com", "https://www.whistle-ai.com"];
    const validateRedirectUrl = (url: string | undefined): string | undefined => {
      if (!url) return undefined;
      try {
        const parsed = new URL(url);
        const isAllowed = ALLOWED_ORIGINS.some((origin) => {
          const allowedHost = new URL(origin).hostname;
          return parsed.hostname === allowedHost || parsed.hostname.endsWith("." + allowedHost);
        });
        if (isAllowed && parsed.protocol === "https:") return url;
      } catch { /* invalid URL */ }
      return undefined;
    };
    const success_url = validateRedirectUrl(body.success_url);
    const cancel_url = validateRedirectUrl(body.cancel_url);

    const { data: profile, error: profileErr } = await sbAdmin
      .from("users")
      .select("stripe_customer_id, email, company_name")
      .eq("id", user.id)
      .single();

    let customerId: string | undefined;
    if (profile?.stripe_customer_id) {
      customerId = profile.stripe_customer_id;
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_uid: user.id,
          company: profile?.company_name || "",
        },
      });
      customerId = customer.id;
      // Use sbAdmin to bypass RLS WITH CHECK policy on users table
      await sbAdmin
        .from("users")
        .update({ stripe_customer_id: customer.id })
        .eq("id", user.id);
    }

    let sessionConfig: Stripe.Checkout.SessionCreateParams;

    if (type === "escrow") {
      if (!deal_id || typeof deal_id !== "string") {
        return jsonResponse({ error: "Missing or invalid deal_id" }, 400);
      }

      const { data: escrowRecord, error: escrowErr } = await sbAdmin
        .from("service_requests")
        .select("details")
        .eq("service_type", `escrow_${deal_id}`)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      let verifiedAmountDollars: number;
      let verifiedCurrency: string;

      if (escrowRecord?.details?.amount && !escrowErr) {
        verifiedAmountDollars = Number(escrowRecord.details.amount);
        verifiedCurrency = (escrowRecord.details.currency || "USD").toLowerCase();

        if (!isPositiveFiniteNumber(verifiedAmountDollars)) {
          return jsonResponse({ error: "Invalid escrow amount on record" }, 422);
        }
      } else {
        return jsonResponse(
          { error: "Escrow amount not set. The seller must confirm the deal amount before payment can proceed." },
          400,
        );
      }

      if (!ALLOWED_CURRENCIES.includes(verifiedCurrency)) {
        return jsonResponse({ error: "Unsupported currency" }, 400);
      }

      const ZERO_DECIMAL_CURRENCIES = ["jpy", "krw", "vnd", "clp", "pyg", "rwf", "ugx", "xof", "xaf"];
      const unitAmountCents = ZERO_DECIMAL_CURRENCIES.includes(verifiedCurrency)
        ? Math.round(verifiedAmountDollars)
        : Math.round(verifiedAmountDollars * 100);

      sessionConfig = {
        customer: customerId,
        mode: "payment",
        line_items: [{
          price_data: {
            currency: verifiedCurrency,
            product_data: { name: "Escrow Payment", description: "Secure escrow payment via Whistle AI" },
            unit_amount: unitAmountCents,
          },
          quantity: 1,
        }],
        payment_intent_data: {
          metadata: { deal_id, user_id: user.id, type: "escrow" },
        },
        success_url: success_url || "https://whistle-ai.com/app/buyer#deals",
        cancel_url: cancel_url || "https://whistle-ai.com/app/buyer#deals",
        metadata: { deal_id, user_id: user.id, type: "escrow" },
      };
    } else if (type === "one_analysis") {
      sessionConfig = {
        customer: customerId,
        mode: "payment",
        line_items: [{
          price_data: {
            currency: "usd",
            product_data: { name: "Whistle AI — Export Analysis", description: "One-time market analysis report" },
            unit_amount: ONE_ANALYSIS_AMOUNT_CENTS,
          },
          quantity: 1,
        }],
        success_url: success_url || "https://whistle-ai.com/app#analysis",
        cancel_url: cancel_url || "https://whistle-ai.com/app#analysis",
        metadata: { user_id: user.id, type: "one_analysis" },
      };
    } else if (price_id || plan) {
      const PLAN_PRICES: Record<string, number> = { starter: 9900, pro: 19900, enterprise: 44900 };
      const BILLING_INTERVALS: Record<string, { interval: string; count: number; multiplier: number }> = {
        m: { interval: "month", count: 1, multiplier: 1 },
        s: { interval: "month", count: 6, multiplier: 6 },
        a: { interval: "year", count: 1, multiplier: 12 },
      };
      const BILLING_DISCOUNTS: Record<string, number> = { m: 1.0, s: 0.9, a: 0.8 };

      const planKey = (plan || "starter").toLowerCase();
      const cycleKey = (billing_cycle || "m").toLowerCase();
      const baseAmount = PLAN_PRICES[planKey];
      const billingInfo = BILLING_INTERVALS[cycleKey];
      const discount = BILLING_DISCOUNTS[cycleKey] || 1.0;

      if (!baseAmount || !billingInfo) {
        return jsonResponse({ error: "Invalid plan or billing cycle" }, 400);
      }

      const unitAmount = Math.round(baseAmount * discount * billingInfo.multiplier);
      const planNames: Record<string, string> = { starter: "Starter", pro: "Professional", enterprise: "Enterprise" };

      const isTestMode = stripeKey?.startsWith("sk_test_");
      let lineItem: Stripe.Checkout.SessionCreateParams.LineItem;

      if (isTestMode || !price_id) {
        lineItem = {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Whistle AI — ${planNames[planKey] || planKey} Plan`,
              description: `${planNames[planKey] || planKey} subscription`,
            },
            unit_amount: unitAmount,
            recurring: { interval: billingInfo.interval as "month" | "year", interval_count: billingInfo.count },
          },
          quantity: 1,
        };
      } else {
        lineItem = { price: price_id, quantity: 1 };
      }

      sessionConfig = {
        customer: customerId,
        mode: "subscription",
        line_items: [lineItem],
        success_url: success_url || "https://whistle-ai.com/app#subscription",
        cancel_url: cancel_url || "https://whistle-ai.com/app#subscription",
        subscription_data: {
          metadata: { user_id: user.id, plan: plan || "", billing_cycle: billing_cycle || "m" },
        },
        metadata: { user_id: user.id, type: "subscription", plan: plan || "" },
      };
    } else {
      return jsonResponse({ error: "Invalid payment type" }, 400);
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    return jsonResponse({ url: session.url, sessionId: session.id });
  } catch (err) {
    const msg = err?.message || String(err);
    console.error("[checkout] ERROR:", msg);
    return jsonResponse({ error: "Payment processing failed. Please try again." }, 500);
  }
});
