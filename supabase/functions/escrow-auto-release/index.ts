import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const PLATFORM_FEE_RATE = 0.025;
const AUTO_CANCEL_BUSINESS_DAYS = 3;
const AUTO_CONFIRM_DAYS = 14;
const STRIPE_AUTH_EXPIRY_DAYS = 6;

const ZERO_DECIMAL_CURRENCIES = [
  "jpy", "krw", "vnd", "clp", "pyg", "rwf", "ugx", "xof", "xaf",
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200 });
  }

  try {
    // ── Auth: cron secret or service role key ──
    const cronSecret = Deno.env.get("CRON_SECRET");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const cronHeader = req.headers.get("x-cron-secret");
    const serviceKeyHeader = req.headers.get("x-service-key");
    const authHeader = req.headers.get("Authorization");

    let isAuthorized = false;

    if (cronSecret && cronHeader && cronHeader.trim() === cronSecret.trim()) {
      isAuthorized = true;
    }

    if (!isAuthorized && serviceKeyHeader && serviceKeyHeader === serviceRoleKey) {
      isAuthorized = true;
    }

    if (!isAuthorized && authHeader) {
      const token = authHeader.replace("Bearer ", "");
      if (token === serviceRoleKey) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      );
    }

    // ── Init clients ──
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");

    if (!stripeKey) {
      return new Response(
        JSON.stringify({ error: "Stripe not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date();
    const details: Array<{
      order_id: string;
      action: string;
      status: string;
      error?: string;
    }> = [];

    let autoCancelled = 0;
    let autoConfirmed = 0;
    let autoCaptured = 0;

    // ═══════════════════════════════════════════════════════
    // 1. Auto-cancel unaccepted orders (3 business days)
    // ═══════════════════════════════════════════════════════
    const cancelCutoff = subtractBusinessDays(now, AUTO_CANCEL_BUSINESS_DAYS);

    const { data: unacceptedOrders, error: cancelFetchErr } = await supabase
      .from("orders")
      .select("id, payment_intent_id, amount, currency, buyer_id, user_id, escrow_status, created_at")
      .eq("escrow_status", "buyer_paid")
      .lt("created_at", cancelCutoff.toISOString());

    if (cancelFetchErr) {
      console.error("Failed to fetch unaccepted orders:", cancelFetchErr.message);
    }

    for (const order of unacceptedOrders || []) {
      try {
        // Refund via Stripe
        if (order.payment_intent_id) {
          await stripeRefund(stripeKey, order.payment_intent_id);
        }

        // Update order status
        await supabase
          .from("orders")
          .update({
            status: "cancelled",
            escrow_status: "cancelled",
            cancelled_at: now.toISOString(),
            cancel_reason: "auto_cancel_unaccepted",
            updated_at: now.toISOString(),
          })
          .eq("id", order.id);

        // Notify buyer
        if (order.buyer_id) {
          await supabase.from("notifications").insert({
            user_id: order.buyer_id,
            type: "payment",
            title: "Order Auto-Cancelled",
            body: "Your order was automatically cancelled because the seller did not accept it within 3 business days. A full refund has been issued.",
            link_page: "deals",
            link_id: order.id,
            is_read: false,
          });
        }

        // Notify seller
        if (order.user_id) {
          await supabase.from("notifications").insert({
            user_id: order.user_id,
            type: "payment",
            title: "Order Auto-Cancelled (Unaccepted)",
            body: "An order was automatically cancelled because it was not accepted within 3 business days.",
            link_page: "deals",
            link_id: order.id,
            is_read: false,
          });
        }

        await logAction(supabase, order.id, "auto_cancel", "Unaccepted order auto-cancelled after 3 business days");

        autoCancelled++;
        details.push({ order_id: order.id, action: "auto_cancel", status: "ok" });
        console.log(`Auto-cancelled order ${order.id}`);
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error(`Failed to auto-cancel order ${order.id}:`, errMsg);
        details.push({ order_id: order.id, action: "auto_cancel", status: "failed", error: errMsg });
        await logAction(supabase, order.id, "auto_cancel_failed", errMsg);
      }
    }

    // ═══════════════════════════════════════════════════════
    // 2. Auto-confirm delivery (14 days after shipping)
    // ═══════════════════════════════════════════════════════
    const confirmCutoff = new Date(now.getTime() - AUTO_CONFIRM_DAYS * 24 * 60 * 60 * 1000);

    const { data: shippedOrders, error: shippedFetchErr } = await supabase
      .from("orders")
      .select("id, payment_intent_id, amount, currency, buyer_id, user_id, escrow_status, shipped_at")
      .in("escrow_status", ["shipping", "delivered"])
      .not("shipped_at", "is", null)
      .lt("shipped_at", confirmCutoff.toISOString());

    if (shippedFetchErr) {
      console.error("Failed to fetch shipped orders:", shippedFetchErr.message);
    }

    for (const order of shippedOrders || []) {
      try {
        // Capture remaining 50% via Stripe
        if (order.payment_intent_id && order.amount) {
          const remainingAmount = Math.round(order.amount * 0.5);
          const captureAmount = toSmallestUnit(remainingAmount, order.currency);
          await stripeCapture(stripeKey, order.payment_intent_id, captureAmount);
        }

        // Update order status
        await supabase
          .from("orders")
          .update({
            status: "completed",
            escrow_status: "released",
            released_at: now.toISOString(),
            auto_confirmed: true,
            updated_at: now.toISOString(),
          })
          .eq("id", order.id);

        // Notify buyer
        if (order.buyer_id) {
          await supabase.from("notifications").insert({
            user_id: order.buyer_id,
            type: "payment",
            title: "Delivery Auto-Confirmed",
            body: "Your delivery was automatically confirmed after 14 days. The remaining payment has been released to the seller.",
            link_page: "deals",
            link_id: order.id,
            is_read: false,
          });
        }

        // Notify seller
        if (order.user_id) {
          const netAmount = order.amount ? (order.amount * (1 - PLATFORM_FEE_RATE)).toFixed(2) : "0";
          await supabase.from("notifications").insert({
            user_id: order.user_id,
            type: "payment",
            title: "Payment Released (Auto-Confirmed)",
            body: `Delivery was auto-confirmed after 14 days. ${order.currency || "USD"} ${netAmount} has been released (2.5% platform fee deducted).`,
            link_page: "deals",
            link_id: order.id,
            is_read: false,
          });
        }

        await logAction(supabase, order.id, "auto_confirm", "Delivery auto-confirmed after 14 days, remaining 50% captured");

        autoConfirmed++;
        details.push({ order_id: order.id, action: "auto_confirm", status: "ok" });
        console.log(`Auto-confirmed delivery for order ${order.id}`);
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error(`Failed to auto-confirm order ${order.id}:`, errMsg);
        details.push({ order_id: order.id, action: "auto_confirm", status: "failed", error: errMsg });
        await logAction(supabase, order.id, "auto_confirm_failed", errMsg);
      }
    }

    // ═══════════════════════════════════════════════════════
    // 3. Stripe authorization expiry prevention (6 days)
    // ═══════════════════════════════════════════════════════
    const authExpiryCutoff = new Date(now.getTime() - STRIPE_AUTH_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    const { data: expiringOrders, error: expiryFetchErr } = await supabase
      .from("orders")
      .select("id, payment_intent_id, amount, currency, buyer_id, user_id, escrow_status, created_at")
      .in("escrow_status", ["buyer_paid", "secured"])
      .not("payment_intent_id", "is", null)
      .lt("created_at", authExpiryCutoff.toISOString());

    if (expiryFetchErr) {
      console.error("Failed to fetch expiring orders:", expiryFetchErr.message);
    }

    for (const order of expiringOrders || []) {
      try {
        // Capture full amount before Stripe 7-day expiry
        if (order.payment_intent_id && order.amount) {
          const captureAmount = toSmallestUnit(order.amount, order.currency);
          await stripeCapture(stripeKey, order.payment_intent_id, captureAmount);
        }

        // Update order: funds now held by platform
        await supabase
          .from("orders")
          .update({
            escrow_status: "platform_hold",
            platform_captured_at: now.toISOString(),
            updated_at: now.toISOString(),
          })
          .eq("id", order.id);

        await logAction(
          supabase,
          order.id,
          "auth_expiry_capture",
          "Full amount captured before Stripe 7-day authorization expiry. Funds held by platform.",
        );

        autoCaptured++;
        details.push({ order_id: order.id, action: "auth_expiry_capture", status: "ok" });
        console.log(`Auth-expiry capture for order ${order.id}`);
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error(`Failed auth-expiry capture for order ${order.id}:`, errMsg);
        details.push({ order_id: order.id, action: "auth_expiry_capture", status: "failed", error: errMsg });
        await logAction(supabase, order.id, "auth_expiry_capture_failed", errMsg);
      }
    }

    // ── Response ──
    return new Response(
      JSON.stringify({
        ok: true,
        actions: {
          auto_cancelled: autoCancelled,
          auto_confirmed: autoConfirmed,
          auto_captured: autoCaptured,
        },
        details,
        processed_at: now.toISOString(),
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("escrow-auto-release fatal error:", errMsg);
    return new Response(
      JSON.stringify({ ok: false, error: errMsg }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});

// ── Helpers ──

/** Subtract N business days from a date (excludes Sat/Sun). */
function subtractBusinessDays(fromDate: Date, days: number): Date {
  const result = new Date(fromDate);
  let remaining = days;

  while (remaining > 0) {
    result.setDate(result.getDate() - 1);
    const dayOfWeek = result.getDay();
    // 0 = Sunday, 6 = Saturday
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      remaining--;
    }
  }

  return result;
}

/** Convert display amount to smallest currency unit (cents/won). */
function toSmallestUnit(amount: number, currency?: string): number {
  if (ZERO_DECIMAL_CURRENCIES.includes(currency?.toLowerCase() || "")) {
    return Math.round(amount);
  }
  return Math.round(amount * 100);
}

/** Refund a payment intent via Stripe REST API. */
async function stripeRefund(apiKey: string, paymentIntentId: string): Promise<void> {
  const response = await fetch("https://api.stripe.com/v1/refunds", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${btoa(apiKey + ":")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `payment_intent=${encodeURIComponent(paymentIntentId)}`,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Stripe refund failed (${response.status}): ${errorBody}`);
  }
}

/** Capture a specific amount on a payment intent via Stripe REST API. */
async function stripeCapture(
  apiKey: string,
  paymentIntentId: string,
  amountInSmallestUnit: number,
): Promise<void> {
  const response = await fetch(
    `https://api.stripe.com/v1/payment_intents/${encodeURIComponent(paymentIntentId)}/capture`,
    {
      method: "POST",
      headers: {
        "Authorization": `Basic ${btoa(apiKey + ":")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `amount_to_capture=${amountInSmallestUnit}`,
    },
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Stripe capture failed (${response.status}): ${errorBody}`);
  }
}

/** Log an escrow auto-action to the escrow_auto_log table. */
async function logAction(
  supabase: ReturnType<typeof createClient>,
  orderId: string,
  action: string,
  detail: string,
): Promise<void> {
  try {
    await supabase.from("escrow_auto_log").insert({
      order_id: orderId,
      action,
      detail,
      created_at: new Date().toISOString(),
    });
  } catch (err: unknown) {
    // Log insert failure should not block processing
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`Failed to log action for order ${orderId}:`, errMsg);
  }
}
