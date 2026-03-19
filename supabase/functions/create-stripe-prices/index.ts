import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://whistle-ai.com",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("No Stripe key");

    // First, get existing products to find product IDs
    const productsRes = await fetch("https://api.stripe.com/v1/products?active=true&limit=10", {
      headers: { Authorization: `Bearer ${stripeKey}` },
    });
    const products = await productsRes.json();

    // Find our products by name
    const findProduct = (name: string) =>
      products.data?.find((p: { name: string }) =>
        p.name.toLowerCase().includes(name.toLowerCase())
      );

    const starterProd = findProduct("starter");
    const proProd = findProduct("professional");
    const enterpriseProd = findProduct("enterprise");

    if (!starterProd || !proProd || !enterpriseProd) {
      return new Response(
        JSON.stringify({
          error: "Products not found",
          found: products.data?.map((p: { id: string; name: string }) => ({ id: p.id, name: p.name })),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const createPrice = async (productId: string, unitAmount: number, interval: string, intervalCount: number, nickname: string) => {
      const body = new URLSearchParams({
        product: productId,
        unit_amount: String(unitAmount),
        currency: "usd",
        "recurring[interval]": interval,
        "recurring[interval_count]": String(intervalCount),
        nickname: nickname,
      });

      const res = await fetch("https://api.stripe.com/v1/prices", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${stripeKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      });
      return res.json();
    };

    const results: Record<string, unknown> = {};

    // Starter: $29/mo → $26.10/mo (6mo) = $156.60/6mo, $23.20/mo (annual) = $278.40/yr
    results.starter_6mo = await createPrice(starterProd.id, 15660, "month", 6, "Starter 6-Month");
    results.starter_annual = await createPrice(starterProd.id, 27840, "year", 1, "Starter Annual");

    // Professional: $79/mo → $71.10/mo (6mo) = $426.60/6mo, $63.20/mo (annual) = $758.40/yr
    results.pro_6mo = await createPrice(proProd.id, 42660, "month", 6, "Professional 6-Month");
    results.pro_annual = await createPrice(proProd.id, 75840, "year", 1, "Professional Annual");

    // Enterprise: $199/mo → $179.10/mo (6mo) = $1074.60/6mo, $159.20/mo (annual) = $1910.40/yr
    results.enterprise_6mo = await createPrice(enterpriseProd.id, 107460, "month", 6, "Enterprise 6-Month");
    results.enterprise_annual = await createPrice(enterpriseProd.id, 191040, "year", 1, "Enterprise Annual");

    return new Response(JSON.stringify(results, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
