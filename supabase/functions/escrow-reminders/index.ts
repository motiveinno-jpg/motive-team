import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const AUTO_CANCEL_DAYS = 3;
const AUTO_CONFIRM_DAYS = 14;
const SETTLEMENT_WINDOW_DAYS = 7;

const ACCEPTANCE_REMINDER_DAYS = [1, 2];
const DELIVERY_REMINDER_DAYS = [10, 12];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 200 });

  try {
    const cronSecret = Deno.env.get("CRON_SECRET");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

    if (!verifyAuth(req, cronSecret, serviceRoleKey)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const now = new Date();
    let remindersSent = 0;
    const errors: string[] = [];
    // 1. Order acceptance reminders (D+1, D+2)
    for (const dayOffset of ACCEPTANCE_REMINDER_DAYS) {
      const cutoffStart = new Date(now.getTime() - (dayOffset + 1) * 86400000);
      const cutoffEnd = new Date(now.getTime() - dayOffset * 86400000);
      const daysLeft = AUTO_CANCEL_DAYS - dayOffset;

      const { data: pendingOrders, error: fetchErr } = await supabase
        .from("orders")
        .select("id, seller_id, created_at")
        .eq("escrow_status", "buyer_paid")
        .gte("created_at", cutoffStart.toISOString())
        .lt("created_at", cutoffEnd.toISOString());

      if (fetchErr) {
        console.error(`Acceptance reminder fetch error (D+${dayOffset}):`, fetchErr.message);
        errors.push(`acceptance_d${dayOffset}: ${fetchErr.message}`);
        continue;
      }

      for (const order of pendingOrders || []) {
        try {
          await sendNotification(supabaseUrl, serviceRoleKey, {
            target_user_id: order.seller_id,
            type: "order",
            title: "Order Acceptance Reminder",
            message: `You have an unaccepted order. It will auto-cancel in ${daysLeft} business day${daysLeft > 1 ? "s" : ""} if not accepted.`,
            link_page: "deals",
            link_id: order.id,
            email_data: {
              order_status: "Pending Acceptance",
              order_id: order.id,
            },
          });
          remindersSent++;
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`Acceptance reminder failed for order ${order.id}:`, msg);
          errors.push(`order_${order.id}: ${msg}`);
        }
      }
    }
    // 2. Delivery confirmation reminders (D+10, D+12)
    for (const dayOffset of DELIVERY_REMINDER_DAYS) {
      const cutoffStart = new Date(now.getTime() - (dayOffset + 1) * 86400000);
      const cutoffEnd = new Date(now.getTime() - dayOffset * 86400000);
      const daysLeft = AUTO_CONFIRM_DAYS - dayOffset;

      const { data: shippedOrders, error: fetchErr } = await supabase
        .from("orders")
        .select("id, buyer_id, shipped_at")
        .in("escrow_status", ["shipping", "delivered"])
        .not("shipped_at", "is", null)
        .gte("shipped_at", cutoffStart.toISOString())
        .lt("shipped_at", cutoffEnd.toISOString());

      if (fetchErr) {
        console.error(`Delivery reminder fetch error (D+${dayOffset}):`, fetchErr.message);
        errors.push(`delivery_d${dayOffset}: ${fetchErr.message}`);
        continue;
      }

      for (const order of shippedOrders || []) {
        try {
          await sendNotification(supabaseUrl, serviceRoleKey, {
            target_user_id: order.buyer_id,
            type: "escrow",
            title: "Delivery Confirmation Reminder",
            message: `Please confirm receipt of your order. Auto-confirmation will occur in ${daysLeft} day${daysLeft > 1 ? "s" : ""} if no action is taken.`,
            link_page: "deals",
            link_id: order.id,
            email_data: {
              action: "Delivery Confirmation Needed",
              status: `Auto-confirms in ${daysLeft} days`,
            },
          });
          remindersSent++;
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`Delivery reminder failed for order ${order.id}:`, msg);
          errors.push(`order_${order.id}: ${msg}`);
        }
      }
    }
    // 3. Settlement notice (delivery confirmed recently)
    const settlementCutoffStart = new Date(now.getTime() - 2 * 86400000);
    const settlementCutoffEnd = new Date(now.getTime() - 1 * 86400000);

    const { data: confirmedOrders, error: confirmedErr } = await supabase
      .from("orders")
      .select("id, seller_id, delivered_at, amount, currency")
      .eq("escrow_status", "released")
      .not("delivered_at", "is", null)
      .gte("delivered_at", settlementCutoffStart.toISOString())
      .lt("delivered_at", settlementCutoffEnd.toISOString());

    if (confirmedErr) {
      console.error("Settlement notice fetch error:", confirmedErr.message);
      errors.push(`settlement: ${confirmedErr.message}`);
    }

    for (const order of confirmedOrders || []) {
      try {
        await sendNotification(supabaseUrl, serviceRoleKey, {
          target_user_id: order.seller_id,
          type: "payment",
          title: "Payment Settlement Notice",
          message: `Delivery has been confirmed. Payment settlement of ${order.currency || "USD"} ${order.amount || ""} will be processed within ${SETTLEMENT_WINDOW_DAYS} days.`,
          link_page: "deals",
          link_id: order.id,
          email_data: {
            amount: String(order.amount || ""),
            currency: order.currency || "USD",
            payment_type: "Escrow Settlement",
            date: new Date().toISOString().split("T")[0],
          },
        });
        remindersSent++;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`Settlement notice failed for order ${order.id}:`, msg);
        errors.push(`order_${order.id}: ${msg}`);
      }
    }

    return new Response(JSON.stringify({
      ok: true, reminders_sent: remindersSent,
      errors: errors.length > 0 ? errors : undefined, processed_at: now.toISOString(),
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("escrow-reminders fatal error:", errMsg);
    return new Response(
      JSON.stringify({ ok: false, error: errMsg }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
// ── Helpers ──

function verifyAuth(req: Request, cronSecret: string | undefined, serviceRoleKey: string): boolean {
  const cronHeader = req.headers.get("x-cron-secret");
  if (cronSecret && cronHeader && cronHeader.trim() === cronSecret.trim()) return true;
  const serviceKeyHeader = req.headers.get("x-service-key");
  if (serviceKeyHeader === serviceRoleKey) return true;
  const authHeader = req.headers.get("Authorization");
  if (authHeader && authHeader.replace("Bearer ", "") === serviceRoleKey) return true;
  return false;
}

interface NotificationPayload {
  target_user_id: string;
  type: string;
  title: string;
  message: string;
  link_page?: string;
  link_id?: string;
  email_data?: Record<string, string>;
}

async function sendNotification(
  supabaseUrl: string, serviceRoleKey: string, payload: NotificationPayload,
): Promise<void> {
  const res = await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${serviceRoleKey}` },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`send-notification returned ${res.status}: ${errText}`);
  }
}
