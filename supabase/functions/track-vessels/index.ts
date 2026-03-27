import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// ── Carrier detection patterns ──
const CARRIER_PATTERNS: Record<string, RegExp[]> = {
  dhl: [/^\d{10,11}$/, /^JD\d{18}$/i, /^\d{4}-\d{4}-\d{4}$/],
  fedex: [/^\d{12,22}$/, /^[0-9]{15}$/],
  ups: [/^1Z[A-Z0-9]{16}$/i, /^T\d{10}$/],
  ems: [/^E[A-Z]\d{9}[A-Z]{2}$/i],
  maersk: [/^MAEU\d{7}$/i, /^MSKU\d{7}$/i, /^\d{9}$/],
  msc: [/^MSCU\d{7}$/i, /^MEDU\d{7}$/i],
  cosco: [/^COSU\d{7}$/i, /^CSLU\d{7}$/i],
  evergreen: [/^EGHU\d{7}$/i, /^EISU\d{7}$/i],
  one: [/^ONEU\d{7}$/i, /^KKFU\d{7}$/i],
  yangming: [/^YMLU\d{7}$/i],
  cmacgm: [/^CMAU\d{7}$/i, /^TCLU\d{7}$/i],
  cj: [/^\d{10,12}$/],
  hanjin: [/^\d{10,14}$/],
};

// ── Carrier tracking URLs ──
const CARRIER_TRACK: Record<string, string> = {
  dhl: "https://www.dhl.com/kr-ko/home/tracking/tracking-express.html?submit=1&tracking-id=",
  fedex: "https://www.fedex.com/fedextrack/?trknbr=",
  ups: "https://www.ups.com/track?tracknum=",
  ems: "https://service.epost.go.kr/trace.RetrieveEmsRi498TraceList.comm?POST_CODE=",
  cj: "https://www.cjlogistics.com/ko/tool/parcel/tracking?gnbInvcNo=",
  lotte: "https://www.lotteglogis.com/home/reservation/tracking/link498View?InvNo=",
  hanjin: "https://www.hanjin.com/kor/CMS/DeliveryMgr/WaybillResult.do?wblnum=",
  evergreen: "https://www.shipmentlink.com/tvs2/servlet/TDB1_CargoTracking.do?BLNo=",
  maersk: "https://www.maersk.com/tracking/",
  msc: "https://www.msc.com/track-a-shipment?trackingNumber=",
  cosco: "https://elines.coscoshipping.com/ebtracking/public/containers/",
  one: "https://ecomm.one-line.com/ecom/CUP_HOM_3301GS.do?f_cmd=121&cust_ref_no=",
  yangming: "https://www.yangming.com/e-service/track-trace/track-trace_cargo_tracking.aspx?BillOfLading=",
  cmacgm: "https://www.cma-cgm.com/ebusiness/tracking/search?SearchBy=BL&Reference=",
  korean_air: "https://cargo.koreanair.com/tracking?awbPrefix=180&awbNumber=",
  asiana_cargo: "https://cargo.flyasiana.com/tracking.do?awbNo=",
  default: "https://www.17track.net/ko#nums=",
};

// ── Ocean shipping stage definitions ──
const OCEAN_STAGES = [
  "production_complete",
  "warehouse",
  "customs_export",
  "loaded",
  "in_transit",
  "customs_import",
  "delivered",
] as const;

// ── Transit time estimates (days) by route ──
const TRANSIT_ESTIMATES: Record<string, number> = {
  "KR-US": 18,
  "KR-EU": 30,
  "KR-JP": 3,
  "KR-CN": 4,
  "KR-SE": 12,
  "KR-VN": 7,
  "KR-ID": 10,
  "KR-AU": 14,
  "KR-IN": 16,
  default: 21,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret, x-service-key",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  try {
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const cronSecret = Deno.env.get("CRON_SECRET");

    // Auth: service_role_key OR cron secret OR user JWT
    const authHeader = req.headers.get("Authorization");
    const cronHeader = req.headers.get("x-cron-secret");
    const serviceKeyHeader = req.headers.get("x-service-key");
    let userId: string | null = null;
    let isCron = false;
    let isService = false;

    if (cronSecret && cronHeader && cronHeader.trim() === cronSecret.trim()) {
      isCron = true;
    } else if (serviceKeyHeader === serviceRoleKey) {
      isService = true;
    } else if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      if (token === serviceRoleKey) {
        isService = true;
      } else {
        const supabaseUser = createClient(supabaseUrl, serviceRoleKey);
        const { data: { user }, error } = await supabaseUser.auth.getUser(token);
        if (error || !user) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: corsHeaders,
          });
        }
        userId = user.id;
      }
    } else {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const body = await req.json().catch(() => ({}));

    // ── Mode 1: Cron bulk refresh ──
    if (isCron || body.mode === "bulk_refresh") {
      return await handleBulkRefresh(supabase, supabaseUrl, serviceRoleKey, corsHeaders);
    }

    // ── Mode 2: Single shipment track ──
    if (body.shipment_id) {
      return await handleSingleTrack(supabase, body.shipment_id, userId, isService, corsHeaders);
    }

    // ── Mode 3: Tracking number lookup (no DB update) ──
    if (body.tracking_no) {
      const carrier = body.carrier || detectCarrier(body.tracking_no);
      const result = estimateTracking(body.tracking_no, carrier, body.etd, body.eta, body.port_of_loading, body.port_of_discharge);
      return new Response(JSON.stringify({ ok: true, ...result }), {
        status: 200,
        headers: corsHeaders,
      });
    }

    return new Response(JSON.stringify({ error: "Missing shipment_id or tracking_no" }), {
      status: 400,
      headers: corsHeaders,
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("track-vessels fatal:", errMsg);
    return new Response(
      JSON.stringify({ ok: false, error: "An error occurred. Please try again." }),
      { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } },
    );
  }
});

// ── Bulk refresh: update all active shipments ──
async function handleBulkRefresh(
  supabase: ReturnType<typeof createClient>,
  supabaseUrl: string,
  serviceRoleKey: string,
  corsHeaders: Record<string, string>,
) {
  const staleThreshold = new Date(Date.now() - 6 * 3600000).toISOString(); // 6 hours ago

  const { data: shipments, error } = await supabase
    .from("shipments")
    .select("id, tracking_no:bl_number, awb_number, carrier, etd, eta, port_of_loading, port_of_discharge, status, tracking_status, tracking_history, type, last_tracked_at")
    .not("status", "in", "(delivered,canceled)")
    .or(`last_tracked_at.is.null,last_tracked_at.lt.${staleThreshold}`)
    .limit(50);

  if (error) {
    console.error("Bulk refresh fetch error:", error.message);
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }

  let updated = 0;
  const errors: string[] = [];

  for (const ship of shipments || []) {
    try {
      const trackNo = ship.tracking_no || ship.awb_number || "";
      if (!trackNo) {
        // Still update based on ETD/ETA timeline even without tracking number
        await updateShipmentFromEstimate(supabase, ship, supabaseUrl, serviceRoleKey);
        updated++;
        continue;
      }

      const carrier = ship.carrier || detectCarrier(trackNo);
      const estimate = estimateTracking(
        trackNo,
        carrier,
        ship.etd,
        ship.eta,
        ship.port_of_loading,
        ship.port_of_discharge,
      );

      // Only update if status changed
      if (estimate.estimated_status !== ship.tracking_status) {
        const history = Array.isArray(ship.tracking_history) ? ship.tracking_history : [];
        history.push({
          status: estimate.estimated_status,
          timestamp: new Date().toISOString(),
          source: "auto",
          details: estimate.status_message,
        });

        const updateData: Record<string, unknown> = {
          tracking_status: estimate.estimated_status,
          tracking_history: history,
          tracking_url: estimate.tracking_url,
          tracking_metadata: {
            carrier_detected: estimate.carrier,
            progress_pct: estimate.progress_pct,
            days_remaining: estimate.days_remaining,
            last_auto_update: new Date().toISOString(),
          },
          last_tracked_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        // Map tracking_status to shipment status
        const mappedStatus = mapTrackingToShipmentStatus(estimate.estimated_status);
        if (mappedStatus && mappedStatus !== ship.status) {
          updateData.status = mappedStatus;
          if (mappedStatus === "delivered" && !ship.status.includes("delivered")) {
            updateData.actual_arrival = new Date().toISOString().split("T")[0];
          }
        }

        await supabase.from("shipments").update(updateData).eq("id", ship.id);

        // Send notification if status changed significantly
        if (isSignificantChange(ship.tracking_status, estimate.estimated_status)) {
          await sendTrackingNotification(supabaseUrl, serviceRoleKey, ship, estimate.estimated_status);
        }
      } else {
        // Just update last_tracked_at
        await supabase
          .from("shipments")
          .update({ last_tracked_at: new Date().toISOString() })
          .eq("id", ship.id);
      }
      updated++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${ship.id}: ${msg}`);
    }
  }

  return new Response(JSON.stringify({
    ok: true,
    total: (shipments || []).length,
    updated,
    errors: errors.length > 0 ? errors : undefined,
    processed_at: new Date().toISOString(),
  }), { status: 200, headers: corsHeaders });
}

// ── Single shipment track with DB update ──
async function handleSingleTrack(
  supabase: ReturnType<typeof createClient>,
  shipmentId: string,
  userId: string | null,
  isService: boolean,
  corsHeaders: Record<string, string>,
) {
  const { data: ship, error } = await supabase
    .from("shipments")
    .select("*")
    .eq("id", shipmentId)
    .single();

  if (error || !ship) {
    return new Response(JSON.stringify({ error: "Shipment not found" }), {
      status: 404,
      headers: corsHeaders,
    });
  }

  // Auth check: user must be seller or buyer of the order
  if (userId && !isService) {
    if (ship.user_id !== userId) {
      // Check if user is buyer
      const { data: order } = await supabase
        .from("orders")
        .select("buyer_id")
        .eq("id", ship.order_id)
        .single();
      if (!order || order.buyer_id !== userId) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: corsHeaders,
        });
      }
    }
  }

  const trackNo = ship.bl_number || ship.awb_number || "";
  const carrier = ship.carrier || detectCarrier(trackNo);
  const estimate = estimateTracking(
    trackNo,
    carrier,
    ship.etd,
    ship.eta,
    ship.port_of_loading,
    ship.port_of_discharge,
  );

  // Update DB
  const history = Array.isArray(ship.tracking_history) ? [...ship.tracking_history] : [];

  if (estimate.estimated_status !== ship.tracking_status) {
    history.push({
      status: estimate.estimated_status,
      timestamp: new Date().toISOString(),
      source: "refresh",
      details: estimate.status_message,
    });
  }

  const updatePayload: Record<string, unknown> = {
    tracking_status: estimate.estimated_status,
    tracking_history: history,
    tracking_url: estimate.tracking_url,
    tracking_metadata: {
      carrier_detected: estimate.carrier,
      progress_pct: estimate.progress_pct,
      days_remaining: estimate.days_remaining,
      transit_estimate_days: estimate.transit_days,
      last_refresh: new Date().toISOString(),
    },
    last_tracked_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mappedStatus = mapTrackingToShipmentStatus(estimate.estimated_status);
  if (mappedStatus && mappedStatus !== ship.status) {
    updatePayload.status = mappedStatus;
  }

  await supabase.from("shipments").update(updatePayload).eq("id", shipmentId);

  return new Response(JSON.stringify({
    ok: true,
    shipment_id: shipmentId,
    carrier: estimate.carrier,
    tracking_url: estimate.tracking_url,
    estimated_status: estimate.estimated_status,
    status_message: estimate.status_message,
    progress_pct: estimate.progress_pct,
    days_remaining: estimate.days_remaining,
    transit_days: estimate.transit_days,
    history,
  }), { status: 200, headers: corsHeaders });
}

// ── Core: estimate tracking status from ETD/ETA timeline ──
function estimateTracking(
  trackNo: string,
  carrier: string,
  etd: string | null,
  eta: string | null,
  pol: string | null,
  pod: string | null,
): TrackingEstimate {
  const now = new Date();
  const trackUrl = buildTrackingUrl(trackNo, carrier);

  // If no ETD/ETA, return basic info
  if (!etd && !eta) {
    return {
      carrier,
      tracking_url: trackUrl,
      estimated_status: "warehouse",
      status_message: "Awaiting departure schedule",
      progress_pct: 10,
      days_remaining: null,
      transit_days: null,
    };
  }

  const etdDate = etd ? new Date(etd) : null;
  const etaDate = eta ? new Date(eta) : null;

  // Estimate transit time if only one date is available
  const routeKey = extractRouteKey(pol, pod);
  const transitDays = TRANSIT_ESTIMATES[routeKey] || TRANSIT_ESTIMATES.default;

  const departureDate = etdDate || (etaDate ? new Date(etaDate.getTime() - transitDays * 86400000) : null);
  const arrivalDate = etaDate || (etdDate ? new Date(etdDate.getTime() + transitDays * 86400000) : null);

  if (!departureDate || !arrivalDate) {
    return {
      carrier,
      tracking_url: trackUrl,
      estimated_status: "warehouse",
      status_message: "Schedule pending",
      progress_pct: 10,
      days_remaining: null,
      transit_days: transitDays,
    };
  }

  const totalTransitMs = arrivalDate.getTime() - departureDate.getTime();
  const elapsedMs = now.getTime() - departureDate.getTime();
  const progressRatio = totalTransitMs > 0 ? elapsedMs / totalTransitMs : 0;
  const daysRemaining = Math.max(0, Math.ceil((arrivalDate.getTime() - now.getTime()) / 86400000));

  // Map progress to stage
  let estimatedStatus: string;
  let statusMessage: string;
  let progressPct: number;

  if (now < new Date(departureDate.getTime() - 3 * 86400000)) {
    estimatedStatus = "production_complete";
    statusMessage = `Preparing for shipment. Departure in ${Math.ceil((departureDate.getTime() - now.getTime()) / 86400000)} days`;
    progressPct = 5;
  } else if (now < new Date(departureDate.getTime() - 1 * 86400000)) {
    estimatedStatus = "warehouse";
    statusMessage = `Cargo at warehouse. ETD: ${etd || departureDate.toISOString().split("T")[0]}`;
    progressPct = 15;
  } else if (now < departureDate) {
    estimatedStatus = "customs_export";
    statusMessage = "Export customs clearance in progress";
    progressPct = 25;
  } else if (progressRatio < 0.05) {
    estimatedStatus = "loaded";
    statusMessage = `Loaded and departed from ${pol || "origin port"}`;
    progressPct = 35;
  } else if (progressRatio < 0.85) {
    estimatedStatus = "in_transit";
    const pct = Math.round(progressRatio * 100);
    statusMessage = `In transit to ${pod || "destination"}. ETA: ${eta || arrivalDate.toISOString().split("T")[0]} (${daysRemaining} days)`;
    progressPct = 35 + Math.round(progressRatio * 40);
  } else if (progressRatio < 1.0) {
    estimatedStatus = "customs_import";
    statusMessage = `Arriving at ${pod || "destination port"}. Import customs processing`;
    progressPct = 85;
  } else if (daysRemaining <= 0 && progressRatio >= 1.0 && progressRatio < 1.15) {
    estimatedStatus = "customs_import";
    statusMessage = `At destination. Customs clearance in progress`;
    progressPct = 90;
  } else {
    estimatedStatus = "delivered";
    statusMessage = "Shipment delivered";
    progressPct = 100;
  }

  return {
    carrier,
    tracking_url: trackUrl,
    estimated_status: estimatedStatus,
    status_message: statusMessage,
    progress_pct: progressPct,
    days_remaining: daysRemaining,
    transit_days: transitDays,
  };
}

// ── Helpers ──

interface TrackingEstimate {
  carrier: string;
  tracking_url: string;
  estimated_status: string;
  status_message: string;
  progress_pct: number;
  days_remaining: number | null;
  transit_days: number | null;
}

function detectCarrier(trackNo: string): string {
  const clean = trackNo.trim().toUpperCase();
  for (const [carrier, patterns] of Object.entries(CARRIER_PATTERNS)) {
    for (const pat of patterns) {
      if (pat.test(clean)) return carrier;
    }
  }
  // Container number format: 4 letters + 7 digits
  if (/^[A-Z]{4}\d{7}$/.test(clean)) {
    const prefix = clean.substring(0, 4);
    if (prefix.startsWith("MAEU") || prefix.startsWith("MSKU")) return "maersk";
    if (prefix.startsWith("MSCU") || prefix.startsWith("MEDU")) return "msc";
    if (prefix.startsWith("COSU") || prefix.startsWith("CSLU")) return "cosco";
    if (prefix.startsWith("EGHU") || prefix.startsWith("EISU")) return "evergreen";
    if (prefix.startsWith("CMAU") || prefix.startsWith("TCLU")) return "cmacgm";
    if (prefix.startsWith("ONEU") || prefix.startsWith("KKFU")) return "one";
    if (prefix.startsWith("YMLU")) return "yangming";
  }
  return "default";
}

function buildTrackingUrl(trackNo: string, carrier: string): string {
  if (!trackNo) return "";
  const baseUrl = CARRIER_TRACK[carrier] || CARRIER_TRACK.default;
  return baseUrl + encodeURIComponent(trackNo);
}

function extractRouteKey(pol: string | null, pod: string | null): string {
  if (!pol || !pod) return "default";
  const origin = extractCountryCode(pol);
  const dest = extractCountryCode(pod);
  if (!origin || !dest) return "default";
  const key = `${origin}-${dest}`;
  return TRANSIT_ESTIMATES[key] ? key : "default";
}

function extractCountryCode(port: string): string | null {
  // Try "City, XX" format
  const match = port.match(/,\s*([A-Z]{2})\s*$/i);
  if (match) return match[1].toUpperCase();
  // Try "(XX)" format
  const match2 = port.match(/\(([A-Z]{2})\)/i);
  if (match2) return match2[1].toUpperCase();
  return null;
}

function mapTrackingToShipmentStatus(trackingStatus: string): string | null {
  const map: Record<string, string> = {
    production_complete: "booked",
    warehouse: "booked",
    customs_export: "shipped",
    loaded: "shipped",
    in_transit: "in_transit",
    customs_import: "in_transit",
    delivered: "delivered",
  };
  return map[trackingStatus] || null;
}

function isSignificantChange(oldStatus: string | null, newStatus: string): boolean {
  const significantStages = ["loaded", "in_transit", "customs_import", "delivered"];
  return significantStages.includes(newStatus) && oldStatus !== newStatus;
}

async function updateShipmentFromEstimate(
  supabase: ReturnType<typeof createClient>,
  ship: Record<string, unknown>,
  supabaseUrl: string,
  serviceRoleKey: string,
): Promise<void> {
  const estimate = estimateTracking(
    "",
    (ship.carrier as string) || "",
    ship.etd as string | null,
    ship.eta as string | null,
    ship.port_of_loading as string | null,
    ship.port_of_discharge as string | null,
  );

  if (estimate.estimated_status !== ship.tracking_status) {
    const history = Array.isArray(ship.tracking_history) ? ship.tracking_history : [];
    history.push({
      status: estimate.estimated_status,
      timestamp: new Date().toISOString(),
      source: "auto",
      details: estimate.status_message,
    });

    const updateData: Record<string, unknown> = {
      tracking_status: estimate.estimated_status,
      tracking_history: history,
      tracking_metadata: {
        progress_pct: estimate.progress_pct,
        days_remaining: estimate.days_remaining,
        last_auto_update: new Date().toISOString(),
      },
      last_tracked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const mappedStatus = mapTrackingToShipmentStatus(estimate.estimated_status);
    if (mappedStatus && mappedStatus !== ship.status) {
      updateData.status = mappedStatus;
    }

    await supabase.from("shipments").update(updateData).eq("id", ship.id);

    if (isSignificantChange(ship.tracking_status as string | null, estimate.estimated_status)) {
      await sendTrackingNotification(supabaseUrl, serviceRoleKey, ship as Record<string, string>, estimate.estimated_status);
    }
  } else {
    await supabase
      .from("shipments")
      .update({ last_tracked_at: new Date().toISOString() })
      .eq("id", ship.id);
  }
}

async function sendTrackingNotification(
  supabaseUrl: string,
  serviceRoleKey: string,
  ship: Record<string, unknown>,
  newStatus: string,
): Promise<void> {
  const stageLabels: Record<string, string> = {
    loaded: "Cargo Loaded & Departed",
    in_transit: "In Transit",
    customs_import: "Arrived at Destination",
    delivered: "Delivered",
  };

  try {
    await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        target_user_id: ship.user_id,
        type: "shipment",
        title: "Shipment Update",
        message: `Shipment status: ${stageLabels[newStatus] || newStatus}`,
        link_page: "tracking",
        link_id: ship.id as string,
        email_data: {
          action: "Shipment Status Update",
          status: stageLabels[newStatus] || newStatus,
          tracking_no: (ship.bl_number || ship.awb_number || "") as string,
        },
      }),
    });
  } catch {
    console.error("Failed to send tracking notification for shipment:", ship.id);
  }
}
