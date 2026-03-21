import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://whistle-ai.com",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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

    // Validate return_url — prevent open redirect
    const ALLOWED_ORIGINS = ["https://whistle-ai.com", "https://www.whistle-ai.com"];
    let safeReturnUrl = "https://whistle-ai.com";
    if (body.return_url) {
      try {
        const parsed = new URL(body.return_url);
        if (ALLOWED_ORIGINS.includes(parsed.origin)) {
          safeReturnUrl = body.return_url;
        }
      } catch { /* invalid URL, use default */ }
    }

    const { data: profile } = await supabase
      .from("users")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    if (!profile?.stripe_customer_id) {
      return new Response(
        JSON.stringify({ error: "No billing account found. Please subscribe first." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate the customer exists in Stripe (handles live/test mode mismatch)
    let customerId = profile.stripe_customer_id;
    try {
      await stripe.customers.retrieve(customerId);
    } catch (customerErr: any) {
      console.error("Stripe customer lookup failed:", customerErr.message);

      // Customer ID from different mode (live vs test) — create new customer
      const isModeMismatch = customerErr.message?.includes("No such customer") ||
                             customerErr.statusCode === 404;
      if (isModeMismatch) {
        // Create a new customer in the current Stripe mode
        const newCustomer = await stripe.customers.create({
          email: user.email,
          metadata: { user_id: user.id, source: "billing_portal_mode_fix" },
        });
        customerId = newCustomer.id;

        // Update the stored customer ID
        await sbAdmin
          .from("users")
          .update({
            stripe_customer_id: customerId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", user.id);

        console.log(`Created new Stripe customer ${customerId} for user ${user.id} (mode mismatch fix)`);

        // New customer has no subscriptions, so portal won't be useful
        return new Response(
          JSON.stringify({
            error: "Your billing account was reset for the current payment environment. Please subscribe again.",
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw customerErr;
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: safeReturnUrl,
    });

    return new Response(
      JSON.stringify({ url: portalSession.url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Billing portal error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
