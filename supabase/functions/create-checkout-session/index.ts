import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://whistle-ai.com",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ONE_ANALYSIS_AMOUNT_CENTS = 990;
const ESCROW_MIN_AMOUNT_DOLLARS = 1;
const ESCROW_MAX_AMOUNT_DOLLARS = 1_000_000;
const ALLOWED_CURRENCIES = ["usd", "eur", "gbp", "jpy", "krw", "cny"];

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
      console.error("[checkout] STRIPE_SECRET_KEY not configured");
      return jsonResponse({ error: "Payment service unavailable" }, 500);
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

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

    const supabaseKey =
      Deno.env.get("CUSTOM_ANON_KEY") || Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const body = await req.json();
    const {
      type,
      deal_id,
      currency,
      price_id,
      plan,
      billing_cycle,
    } = body;

    // Validate redirect URLs — prevent open redirect
    const ALLOWED_ORIGINS = ["https://whistle-ai.com", "https://www.whistle-ai.com"];
    const validateRedirectUrl = (url: string | undefined): string | undefined => {
      if (!url) return undefined;
      try {
        const parsed = new URL(url);
        if (ALLOWED_ORIGINS.includes(parsed.origin)) return url;
      } catch { /* invalid URL */ }
      return undefined;
    };
    const success_url = validateRedirectUrl(body.success_url);
    const cancel_url = validateRedirectUrl(body.cancel_url);

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
        metadata: {
          supabase_uid: user.id,
          company: profile?.company_name || "",
        },
      });
      customerId = customer.id;
      await supabase
        .from("users")
        .update({ stripe_customer_id: customer.id })
        .eq("id", user.id);
    }

    let sessionConfig: Stripe.Checkout.SessionCreateParams;

    if (type === "escrow") {
      // --- ESCROW: Server-side amount verification ---
      if (!deal_id || typeof deal_id !== "string") {
        return jsonResponse({ error: "Missing or invalid deal_id" }, 400);
      }

      // Look up the escrow request from service_requests to get the
      // seller-set amount. The seller creates a record with
      // type = 'escrow_<dealId>' containing the agreed amount.
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
        // Use the seller-set amount from the database
        verifiedAmountDollars = Number(escrowRecord.details.amount);
        verifiedCurrency = (
          escrowRecord.details.currency || "USD"
        ).toLowerCase();

        if (!isPositiveFiniteNumber(verifiedAmountDollars)) {
          console.error(
            `[checkout] Invalid escrow amount in DB for deal ${deal_id}:`,
            escrowRecord.details.amount,
          );
          return jsonResponse(
            { error: "Invalid escrow amount on record" },
            422,
          );
        }
      } else {
        // Fallback: no DB record found. Validate client amount strictly.
        console.warn(
          `[checkout] No escrow record in DB for deal ${deal_id}, using client amount with strict validation`,
        );
        const clientAmount = Number(body.amount);

        if (!isPositiveFiniteNumber(clientAmount)) {
          return jsonResponse(
            { error: "Invalid payment amount" },
            400,
          );
        }

        if (clientAmount < ESCROW_MIN_AMOUNT_DOLLARS) {
          return jsonResponse(
            {
              error: `Amount must be at least $${ESCROW_MIN_AMOUNT_DOLLARS}`,
            },
            400,
          );
        }

        if (clientAmount > ESCROW_MAX_AMOUNT_DOLLARS) {
          return jsonResponse(
            { error: "Amount exceeds maximum allowed" },
            400,
          );
        }

        verifiedAmountDollars = clientAmount;
        verifiedCurrency = (currency || "USD").toLowerCase();

        // Alert: client-provided amount used without DB verification
        console.warn(
          `[checkout] ALERT: Escrow using client amount $${clientAmount} ${verifiedCurrency} for deal ${deal_id}, user ${user.id}`,
        );
      }

      if (!ALLOWED_CURRENCIES.includes(verifiedCurrency)) {
        return jsonResponse({ error: "Unsupported currency" }, 400);
      }

      // Zero-decimal currencies (JPY, KRW) — amount is already in smallest unit
      const ZERO_DECIMAL_CURRENCIES = ["jpy", "krw", "vnd", "clp", "pyg", "rwf", "ugx", "xof", "xaf"];
      const unitAmountCents = ZERO_DECIMAL_CURRENCIES.includes(verifiedCurrency)
        ? Math.round(verifiedAmountDollars)
        : Math.round(verifiedAmountDollars * 100);

      sessionConfig = {
        customer: customerId,
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: verifiedCurrency,
              product_data: {
                name: `Escrow Payment`,
                description: "Secure escrow payment via Whistle AI",
              },
              unit_amount: unitAmountCents,
            },
            quantity: 1,
          },
        ],
        payment_intent_data: {
          metadata: { deal_id, user_id: user.id, type: "escrow" },
          // Full capture (no manual hold). Funds are charged immediately and
          // held in our Stripe account. Settlement to seller happens via
          // separate transfer after buyer confirms receipt.
        },
        payment_method_options: {
          card: { setup_future_usage: undefined },
        },
        allow_promotion_codes: true,
        automatic_tax: { enabled: false },
        success_url: success_url || "https://whistle-ai.com/app/buyer#deals",
        cancel_url: cancel_url || "https://whistle-ai.com/app/buyer#deals",
        metadata: { deal_id, user_id: user.id, type: "escrow" },
      };
    } else if (type === "one_analysis") {
      // --- ONE-TIME ANALYSIS: Always use price_data to avoid live/test mode mismatch ---
      const lineItem = {
        price_data: {
          currency: "usd",
          product_data: {
            name: "Whistle AI — Export Analysis",
            description: "One-time market analysis report",
          },
          unit_amount: ONE_ANALYSIS_AMOUNT_CENTS,
        },
        quantity: 1,
      };

      sessionConfig = {
        customer: customerId,
        mode: "payment",
        line_items: [lineItem],
        payment_method_options: {
          card: { setup_future_usage: undefined },
        },
        allow_promotion_codes: true,
        automatic_tax: { enabled: false },
        success_url: success_url || "https://whistle-ai.com/app#analysis",
        cancel_url: cancel_url || "https://whistle-ai.com/app#analysis",
        metadata: { user_id: user.id, type: "one_analysis" },
      };
    } else if (price_id || plan) {
      // --- SUBSCRIPTION ---
      // Map plan + billing_cycle to price_data to avoid live/test mode mismatch
      const PLAN_PRICES: Record<string, number> = {
        starter: 2900,
        pro: 7900,
        enterprise: 19900,
      };
      const BILLING_INTERVALS: Record<string, { interval: string; count: number; multiplier: number }> = {
        m: { interval: "month", count: 1, multiplier: 1 },
        s: { interval: "month", count: 6, multiplier: 6 },
        a: { interval: "year", count: 1, multiplier: 12 },
      };
      const BILLING_DISCOUNTS: Record<string, number> = {
        m: 1.0,
        s: 0.9,
        a: 0.8,
      };

      const planKey = (plan || "starter").toLowerCase();
      const cycleKey = (billing_cycle || "m").toLowerCase();
      const baseAmount = PLAN_PRICES[planKey];
      const billingInfo = BILLING_INTERVALS[cycleKey];
      const discount = BILLING_DISCOUNTS[cycleKey] || 1.0;

      if (!baseAmount || !billingInfo) {
        return jsonResponse({ error: "Invalid plan or billing cycle" }, 400);
      }

      const unitAmount = Math.round(baseAmount * discount * billingInfo.multiplier);
      const planNames: Record<string, string> = {
        starter: "Starter",
        pro: "Professional",
        enterprise: "Enterprise",
      };

      // Try using price_id first, fall back to price_data if it fails
      let lineItem: Stripe.Checkout.SessionCreateParams.LineItem;
      let usePriceData = false;

      // Detect test mode by checking if key starts with sk_test_
      const isTestMode = stripeKey?.startsWith("sk_test_");
      if (isTestMode || !price_id) {
        usePriceData = true;
        lineItem = {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Whistle AI — ${planNames[planKey] || planKey} Plan`,
              description: `${planNames[planKey] || planKey} subscription`,
            },
            unit_amount: unitAmount,
            recurring: {
              interval: billingInfo.interval as "month" | "year",
              interval_count: billingInfo.count,
            },
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
        allow_promotion_codes: true,
        automatic_tax: { enabled: false },
        success_url:
          success_url || "https://whistle-ai.com/app#subscription",
        cancel_url:
          cancel_url || "https://whistle-ai.com/app#subscription",
        subscription_data: {
          metadata: {
            user_id: user.id,
            plan: plan || "",
            billing_cycle: billing_cycle || "m",
          },
        },
        metadata: {
          user_id: user.id,
          type: "subscription",
          plan: plan || "",
        },
      };
    } else {
      return jsonResponse({ error: "Invalid payment type" }, 400);
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    return jsonResponse({ url: session.url, sessionId: session.id });
  } catch (err) {
    const stripeMsg = err?.message || String(err);
    const stripeCode = err?.code || "unknown";
    const stripeType = err?.type || "unknown";
    console.error("[checkout] Unhandled error:", stripeMsg, "code:", stripeCode, "type:", stripeType);
    return jsonResponse(
      { error: `Payment error: ${stripeMsg}` },
      500,
    );
  }
});
