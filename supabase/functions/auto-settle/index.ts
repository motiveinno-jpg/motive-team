import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const PLATFORM_FEE_RATE = 0.025;
const AUTO_SETTLE_DAYS = 7;

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://whistle-ai.com",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth: require either cron secret or valid admin JWT
    const cronSecret = Deno.env.get("CRON_SECRET");
    const authHeader = req.headers.get("Authorization");
    const cronHeader = req.headers.get("x-cron-secret");

    if (cronSecret && cronHeader === cronSecret) {
      // Cron invocation — OK
    } else if (authHeader) {
      const sbUrl = Deno.env.get("SUPABASE_URL")!;
      const sbKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const sbCheck = (await import("https://esm.sh/@supabase/supabase-js@2.39.3")).createClient(sbUrl, sbKey);
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error } = await sbCheck.auth.getUser(token);
      if (error || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Verify admin role
      const { data: userData } = await sbCheck.from("users").select("role").eq("id", user.id).single();
      if (!userData || userData.role !== "admin") {
        return new Response(JSON.stringify({ error: "Admin only" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find payments eligible for auto-settlement:
    // status = 'held', delivery confirmed, and 7+ days since delivery
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - AUTO_SETTLE_DAYS);

    const { data: eligiblePayments, error: fetchErr } = await supabase
      .from("payments")
      .select("id, stripe_payment_intent, deal_id, amount, currency, user_id")
      .eq("status", "held")
      .eq("type", "escrow")
      .not("stripe_payment_intent", "is", null);

    if (fetchErr) {
      console.error("Fetch error:", fetchErr);
      return new Response(JSON.stringify({ error: fetchErr.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const results: Array<{ id: string; status: string; error?: string }> = [];

    for (const payment of eligiblePayments || []) {
      // Check if the deal has delivery confirmed and is past the auto-settle window
      if (!payment.deal_id) continue;

      const { data: deal } = await supabase
        .from("matchings")
        .select("delivered_at, buyer_confirmed_at, settlement_status")
        .eq("id", payment.deal_id)
        .single();

      if (!deal) continue;
      if (deal.settlement_status === "settled") continue;

      // Auto-settle if: delivery confirmed AND 7 days passed
      const confirmDate = deal.buyer_confirmed_at || deal.delivered_at;
      if (!confirmDate) continue;

      const confirmTime = new Date(confirmDate).getTime();
      if (confirmTime > cutoffDate.getTime()) continue; // Not yet 7 days

      // Capture the held payment via Stripe
      try {
        await stripe.paymentIntents.capture(payment.stripe_payment_intent);

        // Update payment status
        await supabase
          .from("payments")
          .update({
            status: "captured",
            captured_at: new Date().toISOString(),
            auto_settled: true,
          })
          .eq("id", payment.id);

        // Update deal settlement status
        await supabase
          .from("matchings")
          .update({
            settlement_status: "settled",
            settled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", payment.deal_id);

        // Notify seller
        const netAmt = (payment.amount * (1 - PLATFORM_FEE_RATE)).toFixed(2);
        await supabase.from("notifications").insert({
          user_id: payment.user_id,
          type: "payment",
          title: "🏦 자동 정산 완료",
          body: `수령 확인 후 ${AUTO_SETTLE_DAYS}일 경과로 자동 정산되었습니다. ${payment.currency} ${netAmt} (수수료 2.5% 차감)`,
          link_page: "deals",
          link_id: payment.deal_id,
          is_read: false,
        });

        results.push({ id: payment.id, status: "settled" });
        console.log(`Auto-settled payment ${payment.id} for deal ${payment.deal_id}`);
      } catch (captureErr: any) {
        console.error(`Failed to capture ${payment.id}:`, captureErr.message);
        results.push({ id: payment.id, status: "failed", error: captureErr.message });
      }
    }

    return new Response(
      JSON.stringify({
        processed: results.length,
        settled: results.filter((r) => r.status === "settled").length,
        failed: results.filter((r) => r.status === "failed").length,
        results,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Auto-settle error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
