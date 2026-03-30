import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
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

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // --- Admin-only authentication ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const sbUrl = Deno.env.get("SUPABASE_URL")!;
    const sbServiceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sbAdmin = createClient(sbUrl, sbServiceRole);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userErr } = await sbAdmin.auth.getUser(token);
    if (userErr || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Verify admin role from users table
    const { data: userData } = await sbAdmin
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!userData || userData.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Forbidden: admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

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
    console.error("create-stripe-prices error:", e);
    return new Response(JSON.stringify({ error: "An error occurred. Please try again." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
