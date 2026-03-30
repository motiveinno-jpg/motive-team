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

const CSL_SOURCES = "SDN,DPL,EL,UVL,FSE,ISN,DTC,CMIC";
const CACHE_TTL_HOURS = 24;
const RATE_LIMIT_PER_MINUTE = 30;
const EXTERNAL_API_TIMEOUT_MS = 10_000;

/**
 * Hardcoded sanctioned/embargoed countries (OFAC, EU, UN).
 * Used as last-resort fallback when all external APIs fail.
 */
const SANCTIONED_COUNTRIES: Record<string, string> = {
  KP: "North Korea",
  IR: "Iran",
  SY: "Syria",
  CU: "Cuba",
  RU: "Russia",
  BY: "Belarus",
  VE: "Venezuela",
  MM: "Myanmar",
  SD: "Sudan",
  SS: "South Sudan",
  AF: "Afghanistan",
  CF: "Central African Republic",
  CD: "DR Congo",
  LY: "Libya",
  SO: "Somalia",
  YE: "Yemen",
  ZW: "Zimbabwe",
  NI: "Nicaragua",
};

/**
 * Last-resort fallback: check if the queried country is in the hardcoded
 * sanctioned list. Returns a synthetic "flagged" match if the country matches,
 * or empty results otherwise. The caller must treat empty results as "error"
 * (not "clear") since no real API verification was performed.
 */
function fallbackCountryCheck(
  queryName: string,
  queryCountry: string,
): { results: CslMatch[]; provider: string } {
  const upperCountry = queryCountry.toUpperCase();
  if (upperCountry && SANCTIONED_COUNTRIES[upperCountry]) {
    return {
      results: [
        {
          source: "FALLBACK",
          source_description: {
            en: "Hardcoded sanctioned country list (OFAC/EU/UN)",
            ko: "하드코딩된 제재 국가 목록 (OFAC/EU/UN)",
          },
          matched_name: queryName,
          entity_type: "country",
          addresses: [],
          country: upperCountry,
          programs: ["OFAC", "EU", "UN"],
          remarks: `${SANCTIONED_COUNTRIES[upperCountry]} is a sanctioned/embargoed country`,
          score: 1,
        },
      ],
      provider: "hardcoded_country_list",
    };
  }
  return { results: [], provider: "hardcoded_country_list" };
}

/** Source list descriptions (EN / KO) */
const SOURCE_DESCRIPTIONS: Record<string, { en: string; ko: string }> = {
  SDN: {
    en: "Specially Designated Nationals (OFAC)",
    ko: "특별지정국민 목록 (OFAC)",
  },
  DPL: {
    en: "Denied Persons List (BIS)",
    ko: "수출거부자 목록 (BIS)",
  },
  EL: {
    en: "Entity List (BIS)",
    ko: "수출통제 엔티티 목록 (BIS)",
  },
  UVL: {
    en: "Unverified List (BIS)",
    ko: "미확인 최종사용자 목록 (BIS)",
  },
  FSE: {
    en: "Foreign Sanctions Evaders (OFAC)",
    ko: "해외제재회피자 목록 (OFAC)",
  },
  ISN: {
    en: "Nonproliferation Sanctions (State Dept)",
    ko: "비확산 제재 목록 (국무부)",
  },
  DTC: {
    en: "ITAR Debarred (State Dept)",
    ko: "ITAR 제재 목록 (국무부)",
  },
  CMIC: {
    en: "Chinese Military-Industrial Complex (OFAC)",
    ko: "중국 군산복합체 목록 (OFAC)",
  },
};

interface ScreeningRequest {
  name: string;
  country?: string;
  type?: "individual" | "entity";
}

interface CslMatch {
  source: string;
  source_description: { en: string; ko: string };
  matched_name: string;
  entity_type: string;
  addresses: string[];
  country: string;
  programs: string[];
  remarks: string;
  score: number;
}

interface ScreeningResponse {
  screened: boolean;
  result: "clear" | "flagged" | "error";
  matches: CslMatch[];
  timestamp: string;
  sources_checked: string[];
  cached: boolean;
  provider?: string;
  degraded?: boolean;
}

/**
 * Retry a fetch-based function with exponential backoff.
 * Retries on 5xx errors and network failures.
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 2,
  baseDelayMs = 500,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
}

/**
 * Try Trade.gov CSL API (new developer.trade.gov gateway).
 * Requires TRADE_GOV_API_KEY env var (free subscription at developer.trade.gov).
 */
async function fetchTradeGovCsl(
  queryName: string,
  queryCountry: string,
  queryType: string,
): Promise<{ results: CslMatch[]; error: string | null }> {
  const apiKey = Deno.env.get("TRADE_GOV_API_KEY");
  if (!apiKey) {
    return { results: [], error: "TRADE_GOV_API_KEY not configured" };
  }

  const cslUrl = new URL(
    "https://api.trade.gov/gateway/v2/consolidated_screening_list/search",
  );
  cslUrl.searchParams.set("q", queryName);
  cslUrl.searchParams.set("fuzzy_name", "true");
  cslUrl.searchParams.set("sources", CSL_SOURCES);
  if (queryCountry) {
    cslUrl.searchParams.set("countries", queryCountry);
  }
  if (queryType === "individual") {
    cslUrl.searchParams.set("types", "Individual");
  } else if (queryType === "entity") {
    cslUrl.searchParams.set("types", "Entity");
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    EXTERNAL_API_TIMEOUT_MS,
  );

  try {
    const resp = await fetch(cslUrl.toString(), {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "Ocp-Apim-Subscription-Key": apiKey,
      },
    }).finally(() => clearTimeout(timeout));

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      console.error(
        "[screen-sanctions] Trade.gov CSL error:",
        resp.status,
        errText,
      );
      return {
        results: [],
        error: `Trade.gov CSL returned ${resp.status}`,
      };
    }

    const json = await resp.json();
    const rawResults = json.results || [];

    const results: CslMatch[] = rawResults.map(
      (r: Record<string, unknown>): CslMatch => {
        const sourceCode = String(r.source || "");
        const sourceInfo = SOURCE_DESCRIPTIONS[sourceCode] || {
          en: sourceCode,
          ko: sourceCode,
        };
        const addresses = Array.isArray(r.addresses)
          ? (r.addresses as Record<string, string>[]).map(
              (a) =>
                [a.address, a.city, a.state, a.country]
                  .filter(Boolean)
                  .join(", "),
            )
          : [];

        return {
          source: sourceCode,
          source_description: sourceInfo,
          matched_name: String(r.name || ""),
          entity_type: String(r.type || "unknown"),
          addresses,
          country: String(
            (r.addresses as Record<string, string>[])?.[0]?.country || "",
          ),
          programs: Array.isArray(r.programs)
            ? (r.programs as string[])
            : [],
          remarks: String(r.remarks || ""),
          score: typeof r.score === "number" ? r.score : 0,
        };
      },
    );

    return { results, error: null };
  } catch (err) {
    console.error("[screen-sanctions] Trade.gov fetch failed:", err);
    return {
      results: [],
      error: err instanceof Error ? err.message : "Trade.gov network error",
    };
  }
}

/**
 * Fallback: OpenSanctions match API.
 * Works without API key for basic use; optionally uses OPENSANCTIONS_API_KEY
 * for higher rate limits.
 */
async function fetchOpenSanctions(
  queryName: string,
  queryCountry: string,
  queryType: string,
): Promise<{ results: CslMatch[]; error: string | null }> {
  const apiKey = Deno.env.get("OPENSANCTIONS_API_KEY");

  const schema =
    queryType === "individual" ? "Person" : "LegalEntity";

  const matchPayload = {
    schema,
    properties: {
      name: [queryName],
      ...(queryCountry
        ? { country: [queryCountry] }
        : {}),
    },
  };

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    EXTERNAL_API_TIMEOUT_MS,
  );

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    if (apiKey) {
      headers["Authorization"] = `ApiKey ${apiKey}`;
    }

    const resp = await fetch(
      "https://api.opensanctions.org/match/default",
      {
        method: "POST",
        signal: controller.signal,
        headers,
        body: JSON.stringify(matchPayload),
      },
    ).finally(() => clearTimeout(timeout));

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      console.error(
        "[screen-sanctions] OpenSanctions error:",
        resp.status,
        errText,
      );
      return {
        results: [],
        error: `OpenSanctions returned ${resp.status}`,
      };
    }

    const json = await resp.json();
    const queryResult = json.responses?.screening?.results
      || json.results
      || [];

    const results: CslMatch[] = queryResult.map(
      (r: Record<string, unknown>): CslMatch => {
        const datasets = Array.isArray(r.datasets)
          ? (r.datasets as string[])
          : [];
        const props = (r.properties || {}) as Record<string, string[]>;
        const sourceCode = datasets.includes("us_ofac_sdn")
          ? "SDN"
          : datasets.includes("us_bis_denied")
            ? "DPL"
            : datasets.includes("us_bis_entity")
              ? "EL"
              : datasets[0] || "OS";
        const sourceInfo = SOURCE_DESCRIPTIONS[sourceCode] || {
          en: `OpenSanctions (${sourceCode})`,
          ko: `OpenSanctions (${sourceCode})`,
        };

        return {
          source: sourceCode,
          source_description: sourceInfo,
          matched_name: String(
            (props.name || [])[0] || r.caption || "",
          ),
          entity_type: String(r.schema || "unknown"),
          addresses: props.address || [],
          country: String((props.country || [])[0] || ""),
          programs: props.program || [],
          remarks: String((props.notes || [])[0] || ""),
          score: typeof r.score === "number" ? r.score : 0,
        };
      },
    );

    return { results, error: null };
  } catch (err) {
    console.error("[screen-sanctions] OpenSanctions fetch failed:", err);
    return {
      results: [],
      error:
        err instanceof Error
          ? err.message
          : "OpenSanctions network error",
    };
  }
}

/**
 * Log screening result to sanctions_log table (for admin dashboard).
 * Fire-and-forget: errors are logged but do not affect the response.
 */
async function logToSanctionsLog(
  sbAdmin: ReturnType<typeof createClient>,
  data: {
    queried_name: string;
    queried_country: string | null;
    queried_type: string;
    result: string;
    match_count: number;
    matches: CslMatch[];
    sources_checked: string[];
    user_id: string | null;
  },
): Promise<void> {
  try {
    await sbAdmin.from("sanctions_log").insert({
      queried_name: data.queried_name,
      queried_country: data.queried_country,
      queried_type: data.queried_type,
      result: data.result,
      match_count: data.match_count,
      matches: data.matches,
      sources_checked: data.sources_checked,
      user_id: data.user_id,
    });
  } catch (err) {
    console.error("[screen-sanctions] Failed to write sanctions_log:", err);
  }
}

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const sbUrl = Deno.env.get("SUPABASE_URL")!;
    const sbServiceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sbAdmin = createClient(sbUrl, sbServiceRole);

    // --- Soft auth ---
    let user: { id: string; email?: string } | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      try {
        const token = authHeader.replace("Bearer ", "");
        const {
          data: { user: authUser },
          error: userErr,
        } = await sbAdmin.auth.getUser(token);
        if (authUser && !userErr) {
          user = authUser;
        } else {
          console.warn(
            "[screen-sanctions] JWT validation failed:",
            userErr?.message,
          );
        }
      } catch (authErr) {
        console.warn("[screen-sanctions] Auth error:", authErr);
      }
    }

    // --- Rate limiting (sliding window, 30 req/min) ---
    const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();
    const { count: recentCount } = await sbAdmin
      .from("sanctions_screenings")
      .select("id", { count: "exact", head: true })
      .gte("created_at", oneMinuteAgo);

    if ((recentCount || 0) >= RATE_LIMIT_PER_MINUTE) {
      const isKo = req.headers.get("accept-language")?.includes("ko");
      return new Response(
        JSON.stringify({
          screened: false,
          result: "error",
          error: isKo
            ? "요청이 너무 많습니다. 잠시 후 다시 시도해주세요."
            : "Too many requests. Please try again shortly.",
          code: "RATE_LIMIT_EXCEEDED",
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Retry-After": "60",
          },
        },
      );
    }

    // --- Parse request body ---
    const body: ScreeningRequest = await req.json();
    const queryName = (body.name || "").trim();
    const queryCountry = (body.country || "").trim().toUpperCase();
    const queryType = body.type || "entity";

    if (!queryName || queryName.length < 2) {
      return new Response(
        JSON.stringify({
          screened: false,
          result: "error",
          error: "Name is required (minimum 2 characters)",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // --- Check cache (24-hour TTL) ---
    const cacheThreshold = new Date(
      Date.now() - CACHE_TTL_HOURS * 60 * 60 * 1000,
    ).toISOString();
    const cacheQuery = sbAdmin
      .from("sanctions_screenings")
      .select("*")
      .eq("queried_name", queryName.toLowerCase())
      .eq("cached", false)
      .gte("created_at", cacheThreshold)
      .neq("result", "error")
      .order("created_at", { ascending: false })
      .limit(1);

    if (queryCountry) {
      cacheQuery.eq("queried_country", queryCountry);
    }

    const { data: cachedRows } = await cacheQuery;

    if (cachedRows && cachedRows.length > 0) {
      const cached = cachedRows[0];

      const logData = {
        queried_name: queryName.toLowerCase(),
        queried_country: queryCountry || null,
        queried_type: queryType,
        result: cached.result,
        match_count: cached.match_count,
        matches: cached.matches || [],
        sources_checked: cached.sources_checked || [],
        user_id: user?.id || null,
      };

      // Log to both tables in parallel
      await Promise.all([
        sbAdmin.from("sanctions_screenings").insert({
          ...logData,
          cached: true,
        }),
        logToSanctionsLog(sbAdmin, logData),
      ]);

      const response: ScreeningResponse = {
        screened: true,
        result: cached.result,
        matches: cached.matches || [],
        timestamp: new Date().toISOString(),
        sources_checked: cached.sources_checked || [],
        cached: true,
      };

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Call external APIs with fallback chain ---
    // Priority: 1) OpenSanctions (reliable, free)
    //           2) Trade.gov CSL (sometimes 503)
    //           3) Hardcoded sanctioned country list (last resort)
    let screeningResults: CslMatch[] = [];
    let provider = "opensanctions";
    let isDegraded = false;
    const sourcesChecked = CSL_SOURCES.split(",");

    // Primary: OpenSanctions (with retry)
    const osResult = await withRetry(
      () => fetchOpenSanctions(queryName, queryCountry, queryType),
      2,
      500,
    );

    if (osResult.error === null) {
      screeningResults = osResult.results;
      provider = "opensanctions";
    } else {
      console.error(
        "[screen-sanctions] OpenSanctions failed, trying Trade.gov fallback:",
        osResult.error,
      );

      // Fallback 1: Trade.gov CSL API (with retry)
      const tradeGovResult = await withRetry(
        () => fetchTradeGovCsl(queryName, queryCountry, queryType),
        2,
        500,
      );

      if (tradeGovResult.error === null) {
        screeningResults = tradeGovResult.results;
        provider = "trade_gov";
      } else {
        console.error(
          "[screen-sanctions] Trade.gov also failed, using hardcoded country list:",
          tradeGovResult.error,
        );

        // Fallback 2: Hardcoded sanctioned country list (last resort)
        // IMPORTANT: If country IS sanctioned, still return "flagged".
        // If country is NOT in the list, return "error" — NOT "clear".
        // We cannot confirm safety without a real API check.
        const fallback = fallbackCountryCheck(queryName, queryCountry);
        screeningResults = fallback.results;
        provider = fallback.provider;
        isDegraded = true;
      }
    }

    // --- Determine result ---
    // When degraded (both APIs failed): country match → "flagged", no match → "error"
    // When not degraded (real API succeeded): matches → "flagged", no matches → "clear"
    let result: "clear" | "flagged" | "error";
    if (screeningResults.length > 0) {
      result = "flagged";
    } else if (isDegraded) {
      result = "error";
    } else {
      result = "clear";
    }

    const logData = {
      queried_name: queryName.toLowerCase(),
      queried_country: queryCountry || null,
      queried_type: queryType,
      result,
      match_count: screeningResults.length,
      matches: screeningResults,
      sources_checked: sourcesChecked,
      user_id: user?.id || null,
    };

    // --- Save to both tables in parallel ---
    await Promise.all([
      sbAdmin.from("sanctions_screenings").insert({
        ...logData,
        cached: false,
      }),
      logToSanctionsLog(sbAdmin, logData),
    ]);

    // --- Build response ---
    const response: ScreeningResponse = {
      screened: true,
      result,
      matches: screeningResults,
      timestamp: new Date().toISOString(),
      sources_checked: sourcesChecked,
      cached: false,
      provider,
      ...(isDegraded ? { degraded: true } : {}),
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[screen-sanctions] Unhandled error:", err);
    return new Response(
      JSON.stringify({
        screened: false,
        result: "error",
        error: "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
