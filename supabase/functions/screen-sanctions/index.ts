import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://whistle-ai.com",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const CSL_BASE_URL =
  "https://api.trade.gov/v2/consolidated_screening_list/search";
const CSL_SOURCES = "SDN,DPL,EL,UVL,FSE,ISN,DTC,CMIC";
const CACHE_TTL_HOURS = 24;
const RATE_LIMIT_PER_MINUTE = 30;
const EXTERNAL_API_TIMEOUT_MS = 10_000;

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
}

serve(async (req: Request) => {
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

      // Log audit trail for cached result
      await sbAdmin.from("sanctions_screenings").insert({
        queried_name: queryName.toLowerCase(),
        queried_country: queryCountry || null,
        queried_type: queryType,
        result: cached.result,
        match_count: cached.match_count,
        matches: cached.matches,
        sources_checked: cached.sources_checked,
        cached: true,
        user_id: user?.id || null,
      });

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

    // --- Call US Trade.gov CSL API ---
    const cslUrl = new URL(CSL_BASE_URL);
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

    let cslResults: CslMatch[] = [];
    let fetchError: string | null = null;
    const sourcesChecked = CSL_SOURCES.split(",");

    try {
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        EXTERNAL_API_TIMEOUT_MS,
      );

      const resp = await fetch(cslUrl.toString(), {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      }).finally(() => clearTimeout(timeout));

      if (!resp.ok) {
        const errText = await resp.text();
        console.error(
          "[screen-sanctions] CSL API error:",
          resp.status,
          errText,
        );
        fetchError = `CSL API returned ${resp.status}`;
      } else {
        const json = await resp.json();
        const rawResults = json.results || [];

        cslResults = rawResults.map(
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
      }
    } catch (err) {
      console.error("[screen-sanctions] CSL fetch failed:", err);
      fetchError =
        err instanceof Error ? err.message : "CSL network error";
    }

    // --- Determine result ---
    let result: "clear" | "flagged" | "error";
    if (fetchError && cslResults.length === 0) {
      result = "error";
    } else if (cslResults.length > 0) {
      result = "flagged";
    } else {
      result = "clear";
    }

    // --- Save to DB (audit trail + cache source) ---
    await sbAdmin.from("sanctions_screenings").insert({
      queried_name: queryName.toLowerCase(),
      queried_country: queryCountry || null,
      queried_type: queryType,
      result,
      match_count: cslResults.length,
      matches: cslResults,
      sources_checked: sourcesChecked,
      cached: false,
      user_id: user?.id || null,
    });

    // --- Handle error case ---
    if (result === "error") {
      const isKo = req.headers.get("accept-language")?.includes("ko");
      return new Response(
        JSON.stringify({
          screened: false,
          result: "error",
          matches: [],
          timestamp: new Date().toISOString(),
          sources_checked: sourcesChecked,
          cached: false,
          error: isKo
            ? "제재 검색 서비스에 일시적 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
            : "Sanctions screening service temporarily unavailable. Please try again later.",
          detail: fetchError,
        }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // --- Success response ---
    const response: ScreeningResponse = {
      screened: true,
      result,
      matches: cslResults,
      timestamp: new Date().toISOString(),
      sources_checked: sourcesChecked,
      cached: false,
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
