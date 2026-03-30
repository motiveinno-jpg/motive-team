import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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

/* ISO2 → UN Comtrade M49 numeric codes (60+ countries) */
const COUNTRY_CODES: Record<string, number> = {
  KR: 410, US: 842, CN: 156, JP: 392, DE: 276, FR: 250,
  GB: 826, VN: 704, TH: 764, ID: 360, SG: 702, MY: 458,
  AU: 36, IN: 356, AE: 784, SA: 682, BR: 76, MX: 484,
  IT: 380, ES: 724, NL: 528, CA: 124, PH: 608, TW: 490,
  TR: 792, PL: 616, SE: 752, NO: 578, DK: 208, FI: 246,
  BE: 56, AT: 40, CH: 756, IE: 372, PT: 620, GR: 300,
  CZ: 203, HU: 348, RO: 642, IL: 376, EG: 818, ZA: 710,
  NG: 566, KE: 404, MA: 504, CL: 152, CO: 170, PE: 604,
  AR: 32, EC: 218, BD: 50, PK: 586, LK: 144, MM: 104,
  KH: 116, NZ: 554, RU: 643, UA: 804, KZ: 398, UZ: 860,
  QA: 634, KW: 414, BH: 48, OM: 512, JO: 400, LB: 422,
  PA: 591, CR: 188, GT: 320, DO: 214, HN: 340, SV: 222,
};

/* M49 → country name (EN) */
const COUNTRY_NAMES: Record<number, string> = {
  410: "Korea", 842: "United States", 156: "China", 392: "Japan",
  276: "Germany", 250: "France", 826: "United Kingdom", 704: "Vietnam",
  764: "Thailand", 360: "Indonesia", 702: "Singapore", 458: "Malaysia",
  36: "Australia", 356: "India", 784: "UAE", 682: "Saudi Arabia",
  76: "Brazil", 484: "Mexico", 380: "Italy", 724: "Spain",
  528: "Netherlands", 124: "Canada", 608: "Philippines", 490: "Taiwan",
  792: "Turkey", 616: "Poland", 752: "Sweden", 578: "Norway",
  208: "Denmark", 246: "Finland", 56: "Belgium", 40: "Austria",
  756: "Switzerland", 372: "Ireland", 620: "Portugal", 300: "Greece",
  203: "Czech Republic", 348: "Hungary", 642: "Romania", 376: "Israel",
  818: "Egypt", 710: "South Africa", 566: "Nigeria", 404: "Kenya",
  504: "Morocco", 152: "Chile", 170: "Colombia", 604: "Peru",
  32: "Argentina", 218: "Ecuador", 50: "Bangladesh", 586: "Pakistan",
  144: "Sri Lanka", 104: "Myanmar", 116: "Cambodia", 554: "New Zealand",
  643: "Russia", 804: "Ukraine", 398: "Kazakhstan", 860: "Uzbekistan",
  634: "Qatar", 414: "Kuwait", 48: "Bahrain", 512: "Oman",
  400: "Jordan", 422: "Lebanon", 591: "Panama", 188: "Costa Rica",
  320: "Guatemala", 214: "Dominican Republic", 340: "Honduras", 222: "El Salvador",
};

/* Numeric code → ISO2 */
const CODE_TO_ISO2: Record<number, string> = {};
for (const [iso, num] of Object.entries(COUNTRY_CODES)) {
  CODE_TO_ISO2[num] = iso;
}

/* Free Preview API — no auth key needed, max 500 records */
const COMTRADE_BASE = "https://comtradeapi.un.org/public/v1/preview/C/A/HS";
const CACHE_TTL_HOURS = 24;
const MAX_YEARS = 5;
const DEFAULT_YEARS = 3;
const DEFAULT_TOP_PARTNERS = 10;
const ANONYMOUS_DAILY_LIMIT = 1;

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const sbUrl = Deno.env.get("SUPABASE_URL")!;
    const sbServiceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sbAdmin = createClient(sbUrl, sbServiceRole);

    // --- Mandatory auth ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ ok: false, error: "Authentication required", code: "AUTH_REQUIRED" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: authUser }, error: userErr } = await sbAdmin.auth.getUser(token);
    if (!authUser || userErr) {
      console.warn("[comtrade-data] JWT validation failed:", userErr?.message);
      return new Response(
        JSON.stringify({ ok: false, error: "Authentication required", code: "AUTH_REQUIRED" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const user = authUser;

    // --- Rate limiting ---
    const { data: userData } = await sbAdmin
      .from("users")
      .select("plan")
      .eq("id", user.id)
      .single();

    const userPlan = userData?.plan || "free";
    const isFree = userPlan === "free";

    if (isFree) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { count } = await sbAdmin
        .from("analyses")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("analysis_type", "comtrade_query")
        .gte("created_at", todayStart.toISOString());

      if ((count || 0) >= ANONYMOUS_DAILY_LIMIT) {
        const isKo = req.headers.get("accept-language")?.includes("ko");
        return new Response(
          JSON.stringify({
            ok: false,
            error: isKo
              ? "무료 플랜은 하루 1회 실시간 데이터 조회가 가능합니다. 플랜을 업그레이드해주세요."
              : "Free plan allows 1 live data query per day. Please upgrade your plan.",
            code: "DAILY_LIMIT_EXCEEDED",
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // --- Parse request body ---
    const body = await req.json();
    const hsCode = normalizeHsCode(body.hs_code);
    const reporterIso = (body.reporter || "KR").toUpperCase();
    const flow = (body.flow || "export").toLowerCase();
    const years = Math.min(Math.max(body.years || DEFAULT_YEARS, 1), MAX_YEARS);
    const topPartners = Math.min(Math.max(body.top_partners || DEFAULT_TOP_PARTNERS, 1), 30);

    if (!hsCode || hsCode.length < 2) {
      return new Response(
        JSON.stringify({ ok: false, error: "HS code is required (minimum 2 digits)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const reporterCode = COUNTRY_CODES[reporterIso];
    if (!reporterCode) {
      return new Response(
        JSON.stringify({ ok: false, error: `Unknown reporter country: ${reporterIso}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const flowCode = flow === "import" ? "M" : "X";

    // --- Check cache ---
    const cacheKey = `${reporterIso}_${hsCode}_${flow}_${years}`;

    const { data: cached } = await sbAdmin
      .from("comtrade_cache")
      .select("data, fetched_at")
      .eq("cache_key", cacheKey)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (cached) {
      const result = buildResponse(cached.data, hsCode, reporterIso, flow, topPartners);
      return new Response(
        JSON.stringify({ ok: true, ...result, cached: true, fetched_at: cached.fetched_at }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // --- Fetch from UN Comtrade ---
    const currentYear = new Date().getFullYear();
    const periodYears: number[] = [];
    for (let i = 0; i < years; i++) {
      periodYears.push(currentYear - 1 - i);
    }
    const period = periodYears.join(",");

    // Preview API: single call returns both world totals and partner breakdown
    // (max 500 records, no auth needed)
    const comtradeUrl = new URL(COMTRADE_BASE);
    comtradeUrl.searchParams.set("reporterCode", String(reporterCode));
    comtradeUrl.searchParams.set("period", period);
    comtradeUrl.searchParams.set("cmdCode", hsCode);
    comtradeUrl.searchParams.set("flowCode", flowCode);
    // Dedup filters required by Preview API
    comtradeUrl.searchParams.set("customsCode", "C00");
    comtradeUrl.searchParams.set("partner2Code", "0");
    comtradeUrl.searchParams.set("motCode", "0");

    let comtradeData: ComtradeRecord[] = [];
    let fetchError: string | null = null;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);

      console.log("[comtrade-data] Fetching:", comtradeUrl.toString());
      const resp = await fetch(comtradeUrl.toString(), {
        signal: controller.signal,
      }).finally(() => clearTimeout(timeout));

      if (!resp.ok) {
        const errText = await resp.text();
        console.error("[comtrade-data] Preview API error:", resp.status, errText);
        fetchError = `Comtrade API returned ${resp.status}`;
      } else {
        const json = await resp.json();
        comtradeData = json.data || [];
        console.log("[comtrade-data] Got", comtradeData.length, "records");
      }
    } catch (err) {
      console.error("[comtrade-data] Comtrade fetch failed:", err);
      fetchError = err instanceof Error ? err.message : "Network error";
    }

    // Preview API returns all partners in one call — separate world vs partner
    const partnerData = comtradeData.filter(
      (r: ComtradeRecord) => r.partnerCode !== 0,
    );

    if (fetchError && comtradeData.length === 0) {
      const isKo = req.headers.get("accept-language")?.includes("ko");
      return new Response(
        JSON.stringify({
          ok: false,
          error: isKo
            ? "실시간 데이터를 가져올 수 없습니다. 잠시 후 다시 시도해주세요."
            : "Real-time data unavailable. Please try again later.",
          code: "COMTRADE_UNAVAILABLE",
          detail: fetchError,
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // --- Assemble raw data for caching ---
    const rawData = {
      world_records: comtradeData,
      partner_records: partnerData,
    };

    // --- Cache the result ---
    const expiresAt = new Date(Date.now() + CACHE_TTL_HOURS * 60 * 60 * 1000).toISOString();
    await sbAdmin
      .from("comtrade_cache")
      .upsert({
        cache_key: cacheKey,
        data: rawData,
        fetched_at: new Date().toISOString(),
        expires_at: expiresAt,
      }, { onConflict: "cache_key" });

    // --- Track usage ---
    await sbAdmin.from("analyses").insert({
      user_id: user.id,
      product_name: `Comtrade: ${hsCode} (${reporterIso} ${flow})`,
      analysis_type: "comtrade_query",
      status: "completed",
      ai_result: { hs_code: hsCode, reporter: reporterIso, flow },
    });

    const result = buildResponse(rawData, hsCode, reporterIso, flow, topPartners);
    return new Response(
      JSON.stringify({ ok: true, ...result, cached: false, fetched_at: new Date().toISOString() }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[comtrade-data] Unhandled error:", err);
    return new Response(
      JSON.stringify({ ok: false, error: "서버 오류가 발생했습니다" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

/* ─── Types ─── */

interface ComtradeRecord {
  period: number;
  reporterCode: number;
  reporterISO?: string;
  reporterDesc?: string;
  partnerCode: number;
  partnerISO?: string;
  partnerDesc?: string;
  primaryValue: number;
  netWgt?: number;
  qty?: number;
  cmdCode?: string;
  flowCode?: string;
  fobvalue?: number;
  cifvalue?: number;
}

interface RawCacheData {
  world_records: ComtradeRecord[];
  partner_records: ComtradeRecord[];
}

/* ─── Helpers ─── */

function normalizeHsCode(code: string | undefined): string {
  if (!code) return "";
  return String(code).replace(/[^0-9]/g, "").slice(0, 6);
}

function buildResponse(
  raw: RawCacheData,
  hsCode: string,
  reporter: string,
  flow: string,
  topPartners: number,
) {
  const worldRecords = raw.world_records || [];
  const partnerRecords = raw.partner_records || [];

  // Build yearly trend from world records (partner=0 means World total)
  const worldTotals = worldRecords
    .filter((r) => r.partnerCode === 0)
    .sort((a, b) => b.period - a.period);

  const trend = worldTotals.map((r) => ({
    year: r.period,
    value: r.primaryValue || 0,
  }));

  const latestValue = trend.length > 0 ? trend[0].value : 0;
  const previousValue = trend.length > 1 ? trend[1].value : 0;
  const yoyGrowth = previousValue > 0
    ? Math.round(((latestValue - previousValue) / previousValue) * 1000) / 10
    : 0;

  // Top partners from latest year only
  const latestYear = worldTotals.length > 0 ? worldTotals[0].period : 0;
  const sortedPartners = partnerRecords
    .filter((r) => r.primaryValue > 0 && r.period === latestYear)
    .sort((a, b) => (b.primaryValue || 0) - (a.primaryValue || 0))
    .slice(0, topPartners);

  const partnerTotal = sortedPartners.reduce((s, r) => s + (r.primaryValue || 0), 0);

  const topPartnersResult = sortedPartners.map((r) => {
    const iso2 = r.partnerISO || CODE_TO_ISO2[r.partnerCode] || "";
    const countryName = r.partnerDesc || COUNTRY_NAMES[r.partnerCode] || `Code ${r.partnerCode}`;
    const share = latestValue > 0
      ? Math.round((r.primaryValue / latestValue) * 1000) / 10
      : 0;

    // Calculate YoY growth for this partner
    const prevYearRecord = partnerRecords.find(
      (pr) => pr.partnerCode === r.partnerCode && pr.period === latestYear - 1,
    );
    const partnerGrowth = prevYearRecord && prevYearRecord.primaryValue > 0
      ? Math.round(((r.primaryValue - prevYearRecord.primaryValue) / prevYearRecord.primaryValue) * 1000) / 10
      : 0;

    return {
      country: iso2,
      country_name: countryName,
      value: r.primaryValue || 0,
      share,
      growth: partnerGrowth,
    };
  });

  // Global context: approximate Korea's share if we have world export data
  const globalContext = {
    world_total: latestValue,
    korea_share: 0,
    korea_rank: 0,
  };

  return {
    hs_code: hsCode,
    reporter,
    flow,
    data: {
      total_value_usd: latestValue,
      yoy_growth: yoyGrowth,
      trend,
      top_partners: topPartnersResult,
      global_context: globalContext,
    },
  };
}
