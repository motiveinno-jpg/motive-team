import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const PLATFORM_FEE_RATE = Number(Deno.env.get("PLATFORM_FEE_RATE") || "0.025");
const AUTO_SETTLE_DAYS = 7;

// Zero-decimal currencies — amount is already in smallest unit
const ZERO_DECIMAL_CURRENCIES = ["jpy", "krw", "vnd", "clp", "pyg", "rwf", "ugx", "xof", "xaf"];

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
      "authorization, x-client-info, apikey, content-type, x-cron-secret, x-service-key",
  };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth: cron secret (env or DB) → service_role key → admin JWT
    const cronSecret = Deno.env.get("CRON_SECRET");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sbUrl = Deno.env.get("SUPABASE_URL")!;
    const sbCheck = createClient(sbUrl, serviceRoleKey);
    const authHeader = req.headers.get("Authorization");
    const cronHeader = req.headers.get("x-cron-secret");

    let isAuthorized = false;

    // 1. Check env-based cron secret
    if (cronSecret && cronHeader && cronHeader.trim() === cronSecret.trim()) {
      isAuthorized = true;
    }

    // 2. Check DB-based cron secret (fallback when env var missing)
    if (!isAuthorized && cronHeader) {
      const { data: cfg } = await sbCheck.from("system_config").select("value").eq("key", "cron_secret").single();
      if (cfg && cronHeader.trim() === cfg.value.trim()) {
        isAuthorized = true;
      }
    }

    // 3. Check service role key via custom header
    const serviceKeyHeader = req.headers.get("x-service-key");
    if (!isAuthorized && serviceKeyHeader && serviceKeyHeader === serviceRoleKey) {
      isAuthorized = true;
    }

    // 4. Check service role key in Authorization header
    if (!isAuthorized && authHeader) {
      const token = authHeader.replace("Bearer ", "");
      if (token === serviceRoleKey) {
        isAuthorized = true;
      }
    }

    // 5. Check valid admin user JWT
    if (!isAuthorized && authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const {
        data: { user },
        error,
      } = await sbCheck.auth.getUser(token);
      if (error || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: userData } = await sbCheck
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();
      if (!userData || userData.role !== "admin") {
        return new Response(JSON.stringify({ error: "Admin only" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      isAuthorized = true;
    }

    if (!isAuthorized) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!stripeKey) {
      return new Response(
        JSON.stringify({ error: "Stripe not configured" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find escrow payments eligible for auto-settlement:
    // status = 'held' (charged but not yet released to seller),
    // delivery confirmed, and 7+ days since confirmation
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - AUTO_SETTLE_DAYS);

    const { data: eligiblePayments, error: fetchErr } = await supabase
      .from("payments")
      .select(
        "id, stripe_payment_intent, deal_id, amount, currency, user_id",
      )
      .eq("status", "held")
      .eq("type", "escrow")
      .not("stripe_payment_intent", "is", null);

    if (fetchErr) {
      console.error("Fetch error:", fetchErr);
      return new Response(JSON.stringify({ error: "An error occurred. Please try again." }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const results: Array<{ id: string; status: string; error?: string }> =
      [];

    for (const payment of eligiblePayments || []) {
      if (!payment.deal_id) continue;

      const { data: deal } = await supabase
        .from("matchings")
        .select(
          "delivered_at, buyer_confirmed_at, settlement_status, user_id",
        )
        .eq("id", payment.deal_id)
        .single();

      if (!deal) continue;
      if (deal.settlement_status === "settled") continue;

      // Auto-settle if: delivery confirmed AND 7 days passed
      const confirmDate = deal.buyer_confirmed_at || deal.delivered_at;
      if (!confirmDate) continue;

      const confirmTime = new Date(confirmDate).getTime();
      if (confirmTime > cutoffDate.getTime()) continue;

      // "Charge now, transfer later" model:
      // Payment was already fully captured at checkout time.
      // Now we mark it as settled and (optionally) create a Stripe Transfer
      // to the seller's connected account if they have one.
      try {
        const platformFee = payment.amount * PLATFORM_FEE_RATE;
        const netAmount = payment.amount - platformFee;
        const netAmountCents = ZERO_DECIMAL_CURRENCIES.includes(payment.currency?.toLowerCase())
          ? Math.round(netAmount)
          : Math.round(netAmount * 100);

        // Check if seller has a Stripe connected account for direct transfer
        const { data: sellerProfile } = await supabase
          .from("users")
          .select("stripe_connect_account_id")
          .eq("id", deal.user_id)
          .single();

        let transferSuccess = true;
        if (sellerProfile?.stripe_connect_account_id) {
          try {
            await stripe.transfers.create({
              amount: netAmountCents,
              currency: payment.currency.toLowerCase(),
              destination: sellerProfile.stripe_connect_account_id,
              transfer_group: `escrow_${payment.deal_id}`,
              metadata: {
                deal_id: payment.deal_id,
                payment_id: payment.id,
                type: "escrow_settlement",
              },
            });
          } catch (transferErr: unknown) {
            transferSuccess = false;
            const tMsg = transferErr instanceof Error ? transferErr.message : String(transferErr);
            console.error(`[auto-settle] Transfer failed for payment ${payment.id}:`, tMsg);
            // Mark as transfer_failed, do NOT mark as settled
            await supabase
              .from("payments")
              .update({
                status: "transfer_failed",
                metadata: { transfer_error: tMsg, attempted_at: new Date().toISOString() },
              })
              .eq("id", payment.id);
            results.push({ id: payment.id, status: "failed", error: `Transfer failed: ${tMsg}` });
            continue;
          }
        }

        // Update payment status — only if transfer succeeded or no connected account
        await supabase
          .from("payments")
          .update({
            status: "settled",
            settled_at: new Date().toISOString(),
            auto_settled: true,
            platform_fee: platformFee,
            net_amount: netAmount,
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
        const netAmtStr = netAmount.toFixed(2);
        await supabase.from("notifications").insert({
          user_id: deal.user_id,
          type: "payment",
          title: "Auto-Settlement Complete",
          body: `Auto-settled after ${AUTO_SETTLE_DAYS} days since delivery confirmation. ${payment.currency} ${netAmtStr} (2.5% platform fee deducted).`,
          link_page: "deals",
          link_id: payment.deal_id,
          is_read: false,
        });

        results.push({ id: payment.id, status: "settled" });
        console.log(
          `Auto-settled payment ${payment.id} for deal ${payment.deal_id}`,
        );
      } catch (settleErr: unknown) {
        const errMsg =
          settleErr instanceof Error ? settleErr.message : String(settleErr);
        console.error(`Failed to settle ${payment.id}:`, errMsg);
        results.push({ id: payment.id, status: "failed", error: errMsg });
      }
    }

    return new Response(
      JSON.stringify({
        processed: results.length,
        settled: results.filter((r) => r.status === "settled").length,
        failed: results.filter((r) => r.status === "failed").length,
        results,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("Auto-settle error:", errMsg);
    return new Response(JSON.stringify({ error: "An error occurred. Please try again." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
