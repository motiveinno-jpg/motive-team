import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const PLATFORM_FEE_RATE = 0.025;

/** Valid escrow state transitions: from → [allowed next states] */
const VALID_TRANSITIONS: Record<string, string[]> = {
  none:              ["requested"],
  requested:         ["buyer_paid", "cancelled"],
  buyer_paid:        ["secured", "shipping", "cancelled", "platform_hold"],
  secured:           ["shipping", "cancelled", "platform_hold"],
  shipping:          ["delivered", "disputed"],
  delivered:         ["release_requested", "released", "disputed"],
  release_requested: ["released", "disputed"],
  platform_hold:     ["released", "refunded", "disputed"],
  disputed:          ["released", "refunded"],
};

/** Who can trigger each transition */
const ROLE_PERMISSIONS: Record<string, string[]> = {
  requested:         ["seller"],
  buyer_paid:        ["buyer", "system"],
  secured:           ["seller", "system"],
  shipping:          ["seller"],
  delivered:         ["buyer"],
  release_requested: ["seller"],
  released:          ["admin", "system"],
  cancelled:         ["seller", "buyer", "system"],
  disputed:          ["buyer", "seller"],
  refunded:          ["admin"],
  platform_hold:     ["system"],
};

const ALLOWED_ORIGINS = [
  "https://whistle-ai.com",
  "https://www.whistle-ai.com",
];

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") || "";
  const isAllowed = ALLOWED_ORIGINS.includes(origin);
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

function jsonRes(body: Record<string, unknown>, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sbAdmin = createClient(supabaseUrl, serviceRoleKey);

    // ── Auth ──
    const authHeader = req.headers.get("Authorization");
    const cronHeader = req.headers.get("x-cron-secret");
    const cronSecret = Deno.env.get("CRON_SECRET");
    let callerUserId: string | null = null;
    let callerRole: "seller" | "buyer" | "admin" | "system" = "system";

    if (cronSecret && cronHeader === cronSecret) {
      callerRole = "system";
    } else if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      if (token === serviceRoleKey) {
        callerRole = "system";
      } else {
        const { data: { user }, error } = await sbAdmin.auth.getUser(token);
        if (error || !user) return jsonRes({ error: "Unauthorized" }, 401, cors);
        callerUserId = user.id;
        const { data: userData } = await sbAdmin.from("users").select("role").eq("id", user.id).single();
        if (userData?.role === "admin") callerRole = "admin";
      }
    } else {
      return jsonRes({ error: "Unauthorized" }, 401, cors);
    }

    // ── Parse body ──
    const body = await req.json();
    const { deal_id, new_status, metadata } = body;

    if (!deal_id || !new_status) {
      return jsonRes({ error: "deal_id and new_status required" }, 400, cors);
    }

    if (typeof new_status !== "string" || new_status.length > 30) {
      return jsonRes({ error: "Invalid new_status" }, 400, cors);
    }

    // ── Fetch current order ──
    const { data: order, error: orderErr } = await sbAdmin
      .from("orders")
      .select("id, user_id, buyer_id, deal_id, escrow_status, escrow_amount, escrow_currency, escrow_fee, escrow_net_amount, stripe_payment_intent")
      .eq("deal_id", deal_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (orderErr || !order) {
      return jsonRes({ error: "Order not found for this deal" }, 404, cors);
    }

    const currentStatus = order.escrow_status || "none";

    // ── Determine caller role relative to this order ──
    if (callerUserId && callerRole !== "admin") {
      if (callerUserId === order.user_id) callerRole = "seller";
      else if (callerUserId === order.buyer_id) callerRole = "buyer";
      else {
        // Check if caller is linked via buyers table
        const { data: buyerLink } = await sbAdmin
          .from("buyers")
          .select("id")
          .eq("buyer_user_id", callerUserId)
          .limit(1)
          .single();
        if (buyerLink) callerRole = "buyer";
        else return jsonRes({ error: "Not a participant in this order" }, 403, cors);
      }
    }

    // ── Validate transition ──
    const allowed = VALID_TRANSITIONS[currentStatus];
    if (!allowed || !allowed.includes(new_status)) {
      return jsonRes({
        error: `Invalid transition: ${currentStatus} → ${new_status}`,
        current_status: currentStatus,
      }, 400, cors);
    }

    // ── Validate role permission ──
    const allowedRoles = ROLE_PERMISSIONS[new_status] || [];
    if (!allowedRoles.includes(callerRole)) {
      return jsonRes({
        error: `Role '${callerRole}' cannot trigger '${new_status}' transition`,
      }, 403, cors);
    }

    // ── Build update ──
    const now = new Date().toISOString();
    const update: Record<string, unknown> = {
      escrow_status: new_status,
      updated_at: now,
    };

    // Set timestamps based on transition
    switch (new_status) {
      case "requested":
        update.escrow_requested_at = now;
        if (metadata?.amount) {
          const amt = Number(metadata.amount);
          const fee = Math.round(amt * PLATFORM_FEE_RATE * 100) / 100;
          update.escrow_amount = amt;
          update.escrow_currency = metadata.currency || "USD";
          update.escrow_terms = metadata.terms || "50/50";
          update.escrow_confirm_days = metadata.confirm_days || 7;
          update.escrow_method = metadata.method || null;
          update.escrow_fee = fee;
          update.escrow_net_amount = Math.round((amt - fee) * 100) / 100;
        }
        break;
      case "buyer_paid":
        update.escrow_paid_at = now;
        if (metadata?.stripe_payment_intent) {
          update.stripe_payment_intent = metadata.stripe_payment_intent;
        }
        if (metadata?.method) update.escrow_method = metadata.method;
        break;
      case "secured":
        update.escrow_secured_at = now;
        break;
      case "shipping":
        update.escrow_shipped_at = now;
        if (!order.escrow_secured_at) update.escrow_secured_at = now;
        break;
      case "delivered":
        update.escrow_delivered_at = now;
        break;
      case "released":
        update.escrow_released_at = now;
        update.status = "completed";
        break;
      case "release_requested":
        break;
      case "cancelled":
        update.status = "cancelled";
        break;
      case "disputed":
        update.escrow_disputed_at = now;
        if (metadata?.dispute) update.escrow_dispute = metadata.dispute;
        break;
      case "refunded":
        update.status = "cancelled";
        break;
      case "platform_hold":
        update.platform_captured_at = now;
        break;
    }

    // ── Apply update ──
    const { data: updated, error: updateErr } = await sbAdmin
      .from("orders")
      .update(update)
      .eq("id", order.id)
      .select("id, escrow_status, escrow_amount, escrow_currency, escrow_fee, escrow_net_amount, escrow_terms, escrow_method, escrow_confirm_days, escrow_requested_at, escrow_paid_at, escrow_secured_at, escrow_shipped_at, escrow_delivered_at, escrow_released_at, escrow_disputed_at, stripe_payment_intent, escrow_dispute")
      .single();

    if (updateErr) {
      console.error("Failed to update order escrow:", updateErr.message);
      return jsonRes({ error: "Failed to update escrow status" }, 500, cors);
    }

    // ── Log ──
    await sbAdmin.from("escrow_auto_log").insert({
      order_id: order.id,
      action: `transition_${currentStatus}_to_${new_status}`,
      detail: `Role: ${callerRole}, User: ${callerUserId || "system"}`,
      created_at: now,
    }).catch(() => {});

    return jsonRes({
      ok: true,
      order_id: order.id,
      previous_status: currentStatus,
      new_status: new_status,
      escrow: updated,
    }, 200, cors);

  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("escrow-transition error:", errMsg);
    return jsonRes({ error: "An error occurred. Please try again." }, 500, cors);
  }
});
