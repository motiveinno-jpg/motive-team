import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: "Stripe not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Create Buyer Starter product
    const starterProduct = await stripe.products.create({
      name: "Whistle AI — Buyer Starter",
      description: "AI-powered supplier discovery, sample requests, and basic trade tools",
    });

    const starterMonthly = await stripe.prices.create({
      product: starterProduct.id,
      unit_amount: 2900,
      currency: "usd",
      recurring: { interval: "month" },
      metadata: { plan: "buyer_starter", cycle: "monthly" },
    });

    const starterSemiannual = await stripe.prices.create({
      product: starterProduct.id,
      unit_amount: 15660,
      currency: "usd",
      recurring: { interval: "month", interval_count: 6 },
      metadata: { plan: "buyer_starter", cycle: "semiannual" },
    });

    const starterAnnual = await stripe.prices.create({
      product: starterProduct.id,
      unit_amount: 27840,
      currency: "usd",
      recurring: { interval: "year" },
      metadata: { plan: "buyer_starter", cycle: "annual" },
    });

    // Create Buyer Pro product
    const proProduct = await stripe.products.create({
      name: "Whistle AI — Buyer Pro",
      description: "Full AI analysis, unlimited supplier matching, escrow protection, priority support",
    });

    const proMonthly = await stripe.prices.create({
      product: proProduct.id,
      unit_amount: 8900,
      currency: "usd",
      recurring: { interval: "month" },
      metadata: { plan: "buyer_pro", cycle: "monthly" },
    });

    const proSemiannual = await stripe.prices.create({
      product: proProduct.id,
      unit_amount: 48060,
      currency: "usd",
      recurring: { interval: "month", interval_count: 6 },
      metadata: { plan: "buyer_pro", cycle: "semiannual" },
    });

    const proAnnual = await stripe.prices.create({
      product: proProduct.id,
      unit_amount: 85440,
      currency: "usd",
      recurring: { interval: "year" },
      metadata: { plan: "buyer_pro", cycle: "annual" },
    });

    // Create Buyer Enterprise product (contact sales, but monthly option)
    const entProduct = await stripe.products.create({
      name: "Whistle AI — Buyer Enterprise",
      description: "Custom integrations, dedicated account manager, SLA guarantees",
    });

    const entMonthly = await stripe.prices.create({
      product: entProduct.id,
      unit_amount: 29900,
      currency: "usd",
      recurring: { interval: "month" },
      metadata: { plan: "buyer_enterprise", cycle: "monthly" },
    });

    return new Response(
      JSON.stringify({
        ok: true,
        prices: {
          starter: {
            m: starterMonthly.id,
            s: starterSemiannual.id,
            a: starterAnnual.id,
          },
          pro: {
            m: proMonthly.id,
            s: proSemiannual.id,
            a: proAnnual.id,
          },
          enterprise: {
            m: entMonthly.id,
          },
        },
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
