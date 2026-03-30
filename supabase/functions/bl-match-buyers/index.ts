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

/* ── Country name mapping (ISO2 → EN / KO) ── */
const COUNTRY_NAMES: Record<string, { en: string; ko: string }> = {
  US: { en: "United States", ko: "미국" },
  DE: { en: "Germany", ko: "독일" },
  JP: { en: "Japan", ko: "일본" },
  CN: { en: "China", ko: "중국" },
  GB: { en: "United Kingdom", ko: "영국" },
  FR: { en: "France", ko: "프랑스" },
  NL: { en: "Netherlands", ko: "네덜란드" },
  VN: { en: "Vietnam", ko: "베트남" },
  TH: { en: "Thailand", ko: "태국" },
  ID: { en: "Indonesia", ko: "인도네시아" },
  SG: { en: "Singapore", ko: "싱가포르" },
  AE: { en: "United Arab Emirates", ko: "아랍에미리트" },
  SA: { en: "Saudi Arabia", ko: "사우디아라비아" },
  TR: { en: "Turkey", ko: "튀르키예" },
  CA: { en: "Canada", ko: "캐나다" },
  MX: { en: "Mexico", ko: "멕시코" },
  BR: { en: "Brazil", ko: "브라질" },
  KR: { en: "South Korea", ko: "한국" },
  AU: { en: "Australia", ko: "호주" },
  IN: { en: "India", ko: "인도" },
  IT: { en: "Italy", ko: "이탈리아" },
  ES: { en: "Spain", ko: "스페인" },
  PL: { en: "Poland", ko: "폴란드" },
  SE: { en: "Sweden", ko: "스웨덴" },
  CH: { en: "Switzerland", ko: "스위스" },
  BE: { en: "Belgium", ko: "벨기에" },
  AT: { en: "Austria", ko: "오스트리아" },
  MY: { en: "Malaysia", ko: "말레이시아" },
  PH: { en: "Philippines", ko: "필리핀" },
  HK: { en: "Hong Kong", ko: "홍콩" },
  TW: { en: "Taiwan", ko: "대만" },
  CL: { en: "Chile", ko: "칠레" },
  CO: { en: "Colombia", ko: "콜롬비아" },
  PE: { en: "Peru", ko: "페루" },
  EG: { en: "Egypt", ko: "이집트" },
  ZA: { en: "South Africa", ko: "남아프리카공화국" },
  NG: { en: "Nigeria", ko: "나이지리아" },
  KE: { en: "Kenya", ko: "케냐" },
  IL: { en: "Israel", ko: "이스라엘" },
  RU: { en: "Russia", ko: "러시아" },
  UA: { en: "Ukraine", ko: "우크라이나" },
  CZ: { en: "Czech Republic", ko: "체코" },
  DK: { en: "Denmark", ko: "덴마크" },
  NO: { en: "Norway", ko: "노르웨이" },
  FI: { en: "Finland", ko: "핀란드" },
  PT: { en: "Portugal", ko: "포르투갈" },
  GR: { en: "Greece", ko: "그리스" },
  RO: { en: "Romania", ko: "루마니아" },
  NZ: { en: "New Zealand", ko: "뉴질랜드" },
  BD: { en: "Bangladesh", ko: "방글라데시" },
  PK: { en: "Pakistan", ko: "파키스탄" },
  KW: { en: "Kuwait", ko: "쿠웨이트" },
  QA: { en: "Qatar", ko: "카타르" },
  BH: { en: "Bahrain", ko: "바레인" },
  OM: { en: "Oman", ko: "오만" },
  JO: { en: "Jordan", ko: "요르단" },
  MM: { en: "Myanmar", ko: "미얀마" },
  KH: { en: "Cambodia", ko: "캄보디아" },
  LA: { en: "Laos", ko: "라오스" },
};

function getCountryName(code: string): { en: string; ko: string } {
  const upper = code.toUpperCase();
  return COUNTRY_NAMES[upper] || { en: upper, ko: upper };
}

/* ── Scoring constants ── */
const SIX_MONTHS_MS = 180 * 24 * 60 * 60 * 1000;
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
const TWO_YEARS_MS = 730 * 24 * 60 * 60 * 1000;

const WEIGHT_HS_PRECISION = 0.35;
const WEIGHT_VOLUME = 0.25;
const WEIGHT_RECENCY = 0.20;
const WEIGHT_FREQUENCY = 0.10;
const WEIGHT_QUALITY = 0.10;
const COUNTRY_BONUS = 10;
const MAX_SCORE = 100;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const TOP_COUNTRIES_LIMIT = 10;

interface BlBuyerLead {
  id: string;
  company_name: string;
  country: string | null;
  country_code: string | null;
  hs_codes: string[] | null;
  hs_prefixes: string[] | null;
  import_volume_usd: number | null;
  import_count: number | null;
  import_frequency: string | null;
  last_import_date: string | null;
  has_email: boolean | null;
  website: string | null;
  categories: string[] | null;
  data_quality_score: number | null;
  created_at: string;
  updated_at: string | null;
}

interface ScoreBreakdown {
  hs_precision: number;
  volume: number;
  recency: number;
  frequency: number;
  quality: number;
}

interface CountryAggregation {
  country_code: string;
  country_name_en: string;
  country_name_ko: string;
  total_volume_usd: number;
  importer_count: number;
}

interface MarketOverview {
  total_importers_found: number;
  top_importing_countries: CountryAggregation[];
}

function normalizeHsCode(raw: string): string {
  return raw.replace(/[.\-\s]/g, "");
}

function scoreHsPrecision(
  leadHsCodes: string[],
  hs6digit: string,
  hs4digit: string,
): number {
  const normalizedLeadCodes = leadHsCodes.map(normalizeHsCode);

  for (const code of normalizedLeadCodes) {
    if (code === hs6digit || code.startsWith(hs6digit)) {
      return 100;
    }
  }

  for (const code of normalizedLeadCodes) {
    if (code.startsWith(hs4digit)) {
      return 60;
    }
  }

  return 0;
}

function scoreRecency(lastImportDate: string | null): number {
  if (!lastImportDate) return 20;

  const elapsed = Date.now() - new Date(lastImportDate).getTime();
  if (elapsed <= SIX_MONTHS_MS) return 100;
  if (elapsed <= ONE_YEAR_MS) return 70;
  if (elapsed <= TWO_YEARS_MS) return 40;
  return 20;
}

function scoreFrequency(frequency: string | null): number {
  if (!frequency) return 20;

  const freq = frequency.toLowerCase();
  if (freq === "weekly") return 100;
  if (freq === "monthly") return 70;
  if (freq === "quarterly") return 40;
  return 20;
}

function findMatchedHsCodes(
  leadHsCodes: string[],
  hs6digit: string,
  hs4digit: string,
): string[] {
  const matched: string[] = [];

  for (const code of leadHsCodes) {
    const normalized = normalizeHsCode(code);
    if (normalized === hs6digit || normalized.startsWith(hs6digit)) {
      matched.push(code);
    } else if (normalized.startsWith(hs4digit)) {
      matched.push(code);
    }
  }

  return matched;
}

function formatUsd(amount: number): string {
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(0)}M`;
  }
  if (amount >= 1_000) {
    return `$${(amount / 1_000).toFixed(0)}K`;
  }
  return `$${amount.toLocaleString()}`;
}

function formatUsdKo(amount: number): string {
  if (amount >= 100_000_000) {
    return `$${(amount / 100_000_000).toFixed(1)}억`;
  }
  if (amount >= 10_000) {
    return `$${(amount / 10_000).toFixed(0)}만`;
  }
  return `$${amount.toLocaleString()}`;
}

const FREQUENCY_KO: Record<string, string> = {
  weekly: "주간",
  monthly: "월간",
  quarterly: "분기",
  sporadic: "비정기",
};

/**
 * Build market overview by aggregating leads per country.
 * Returns top importing countries sorted by total volume.
 */
function buildMarketOverview(
  leads: BlBuyerLead[],
  targetCountries: string[] | null,
): MarketOverview {
  const countryMap = new Map<string, { totalVolume: number; count: number }>();

  for (const lead of leads) {
    const code = (lead.country_code || "").toUpperCase();
    if (!code) continue;

    if (targetCountries && targetCountries.length > 0) {
      if (!targetCountries.includes(code)) continue;
    }

    const existing = countryMap.get(code);
    const volume = lead.import_volume_usd || 0;

    if (existing) {
      existing.totalVolume += volume;
      existing.count += 1;
    } else {
      countryMap.set(code, { totalVolume: volume, count: 1 });
    }
  }

  const aggregated: CountryAggregation[] = [];
  for (const [code, data] of countryMap.entries()) {
    const names = getCountryName(code);
    aggregated.push({
      country_code: code,
      country_name_en: names.en,
      country_name_ko: names.ko,
      total_volume_usd: data.totalVolume,
      importer_count: data.count,
    });
  }

  aggregated.sort((a, b) => b.total_volume_usd - a.total_volume_usd);

  return {
    total_importers_found: leads.length,
    top_importing_countries: aggregated.slice(0, TOP_COUNTRIES_LIMIT),
  };
}

/**
 * Find the rank of a country in the top importing countries list.
 * Returns 0 if not found.
 */
function findCountryRank(
  topCountries: CountryAggregation[],
  countryCode: string,
): number {
  const upper = countryCode.toUpperCase();
  const idx = topCountries.findIndex((c) => c.country_code === upper);
  return idx >= 0 ? idx + 1 : 0;
}

/**
 * Generate bilingual match reasons with country context.
 */
function generateMatchReason(
  lead: BlBuyerLead,
  matchedHsCodes: string[],
  topCountries: CountryAggregation[],
): { en: string; ko: string } {
  const freq = lead.import_frequency || "sporadic";
  const hsDisplay = matchedHsCodes[0] || "N/A";
  const cats = lead.categories?.join(", ") || "general goods";
  const catsKo = lead.categories?.join(", ") || "일반 상품";
  const volume = lead.import_volume_usd || 0;
  const countryCode = (lead.country_code || "").toUpperCase();
  const countryNames = getCountryName(countryCode);
  const rank = findCountryRank(topCountries, countryCode);

  if (rank > 0 && volume > 0) {
    const rankSuffix = rank === 1 ? "st" : rank === 2 ? "nd" : rank === 3 ? "rd" : "th";
    const en = `${countryNames.en} is the #${rank} importer of ${cats} (HS ${hsDisplay}). ${lead.company_name} imports ${formatUsd(volume)}/year.`;
    const ko = `${countryNames.ko}은(는) ${catsKo}(HS ${hsDisplay}) 세계 ${rank}위 수입국입니다. ${lead.company_name}은(는) 연간 ${formatUsdKo(volume)} 수입합니다.`;
    return { en, ko };
  }

  if (volume > 0) {
    const freqEn = freq.charAt(0).toUpperCase() + freq.slice(1);
    const freqKo = FREQUENCY_KO[freq.toLowerCase()] || "비정기";
    const period = scoreRecency(lead.last_import_date) >= 100
      ? "last 6 months"
      : "recent period";
    const periodKo = scoreRecency(lead.last_import_date) >= 100
      ? "최근 6개월"
      : "최근 기간";

    const en = `${freqEn} importer of ${cats} (HS ${hsDisplay}) in ${countryNames.en} — ${formatUsd(volume)} in ${period}`;
    const ko = `${countryNames.ko}의 ${catsKo}(HS ${hsDisplay}) ${freqKo} 수입업체 — ${periodKo} ${formatUsdKo(volume)}`;
    return { en, ko };
  }

  const freqEn = freq.charAt(0).toUpperCase() + freq.slice(1);
  const freqKo = FREQUENCY_KO[freq.toLowerCase()] || "비정기";
  const en = `${freqEn} importer of ${cats} (HS ${hsDisplay}) in ${countryNames.en}`;
  const ko = `${countryNames.ko}의 ${catsKo}(HS ${hsDisplay}) ${freqKo} 수입업체`;
  return { en, ko };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sbAdmin = createClient(supabaseUrl, supabaseServiceRole);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userErr } = await sbAdmin.auth.getUser(
      token,
    );
    if (!user || userErr) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const body = await req.json();
    const {
      hs_code: rawHsCode,
      product_name: productName,
      country_preference: countryPref,
      target_countries: targetCountries,
      limit: requestedLimit,
    } = body;

    if (!rawHsCode || typeof rawHsCode !== "string") {
      return new Response(
        JSON.stringify({ error: "hs_code is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const maxResults = Math.min(requestedLimit || DEFAULT_LIMIT, MAX_LIMIT);

    /* ── Validate target_countries if provided ── */
    let validTargetCountries: string[] | null = null;
    if (targetCountries && Array.isArray(targetCountries) && targetCountries.length > 0) {
      validTargetCountries = targetCountries
        .filter((c: unknown) => typeof c === "string" && c.length === 2)
        .map((c: string) => c.toUpperCase());
    }

    /* ── Parse HS code into 4-digit and 6-digit prefixes ── */
    const hsNormalized = normalizeHsCode(rawHsCode);
    if (hsNormalized.length < 4) {
      return new Response(
        JSON.stringify({
          error: "hs_code must be at least 4 digits (e.g., '3304' or '3304.99')",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const hs4digit = hsNormalized.substring(0, 4);
    const hs6digit = hsNormalized.substring(0, 6);

    /* ── Query bl_buyer_leads by HS prefix ── */
    const { data: leads, error: queryErr } = await sbAdmin
      .from("bl_buyer_leads")
      .select("*")
      .contains("hs_prefixes", [hs4digit]);

    if (queryErr) {
      console.error("bl-match-buyers query error:", queryErr.message);
      return new Response(
        JSON.stringify({ error: "Failed to query B/L buyer leads" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const allMatchedLeads: BlBuyerLead[] = leads || [];

    /* ── Get total count for metadata ── */
    const { count: totalInDb } = await sbAdmin
      .from("bl_buyer_leads")
      .select("*", { count: "exact", head: true });

    /* ── Build market overview from ALL matched leads (before country filter) ── */
    const marketOverview = buildMarketOverview(allMatchedLeads, null);

    /* ── Apply country filter to individual matches if specified ── */
    let filteredLeads = allMatchedLeads;
    if (validTargetCountries && validTargetCountries.length > 0) {
      filteredLeads = allMatchedLeads.filter((lead) => {
        const code = (lead.country_code || "").toUpperCase();
        return validTargetCountries!.includes(code);
      });
    }

    /* ── Find max volume for normalization ── */
    let maxVolume = 0;
    for (const lead of filteredLeads) {
      if (lead.import_volume_usd && lead.import_volume_usd > maxVolume) {
        maxVolume = lead.import_volume_usd;
      }
    }

    /* ── Score each lead ── */
    const scored = filteredLeads.map((lead) => {
      const leadHsCodes = lead.hs_codes || [];

      const hsPrecisionScore = scoreHsPrecision(leadHsCodes, hs6digit, hs4digit);

      const volumeScore = maxVolume > 0 && lead.import_volume_usd
        ? Math.round((lead.import_volume_usd / maxVolume) * 100)
        : 0;

      const recencyScore = scoreRecency(lead.last_import_date);
      const frequencyScore = scoreFrequency(lead.import_frequency);
      const qualityScore = lead.data_quality_score || 0;

      let totalScore = Math.round(
        hsPrecisionScore * WEIGHT_HS_PRECISION +
        volumeScore * WEIGHT_VOLUME +
        recencyScore * WEIGHT_RECENCY +
        frequencyScore * WEIGHT_FREQUENCY +
        qualityScore * WEIGHT_QUALITY,
      );

      /* ── Country preference bonus ── */
      if (countryPref) {
        const prefUpper = countryPref.toUpperCase().trim();
        const leadCountryCode = (lead.country_code || "").toUpperCase().trim();
        const leadCountry = (lead.country || "").toUpperCase().trim();

        if (leadCountryCode === prefUpper || leadCountry.includes(prefUpper)) {
          totalScore = Math.min(totalScore + COUNTRY_BONUS, MAX_SCORE);
        }
      }

      const breakdown: ScoreBreakdown = {
        hs_precision: hsPrecisionScore,
        volume: volumeScore,
        recency: recencyScore,
        frequency: frequencyScore,
        quality: qualityScore,
      };

      const matchedHsCodes = findMatchedHsCodes(leadHsCodes, hs6digit, hs4digit);
      const reasons = generateMatchReason(
        lead,
        matchedHsCodes,
        marketOverview.top_importing_countries,
      );

      return {
        lead_id: lead.id,
        company_name: lead.company_name,
        country: lead.country || "",
        country_code: lead.country_code || "",
        country_name_en: getCountryName(lead.country_code || "").en,
        country_name_ko: getCountryName(lead.country_code || "").ko,
        hs_codes_matched: matchedHsCodes,
        import_volume_usd: lead.import_volume_usd || 0,
        import_count: lead.import_count || 0,
        import_frequency: lead.import_frequency || "sporadic",
        last_import_date: lead.last_import_date || null,
        has_email: lead.has_email || false,
        website: lead.website || null,
        categories: lead.categories || [],
        score: totalScore,
        score_breakdown: breakdown,
        match_reason_en: reasons.en,
        match_reason_ko: reasons.ko,
      };
    });

    /* ── Sort by score DESC, apply limit ── */
    scored.sort((a, b) => b.score - a.score);
    const matches = scored.slice(0, maxResults);

    const queryTimeMs = Date.now() - startTime;

    return new Response(
      JSON.stringify({
        market_overview: marketOverview,
        matches,
        total_in_db: totalInDb || 0,
        hs_code_searched: rawHsCode,
        target_countries_applied: validTargetCountries,
        query_time_ms: queryTimeMs,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("bl-match-buyers error:", errMsg);
    return new Response(
      JSON.stringify({ error: "An error occurred. Please try again." }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
