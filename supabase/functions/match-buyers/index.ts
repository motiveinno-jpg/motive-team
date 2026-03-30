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

const MATCH_LIMITS: Record<string, number> = {
  free: 0,
  starter: 0,
  pro: 3,
  enterprise: -1,
  alibaba: -1,
};

const CATEGORY_RELATIONS: Record<string, string[]> = {
  "Beauty": ["Health", "Organic", "Fashion"],
  "Health": ["Beauty", "Organic", "Medical", "Food"],
  "Food": ["Health", "Organic"],
  "Organic": ["Food", "Health", "Beauty"],
  "Electronics": ["Industrial", "Home"],
  "Fashion": ["Beauty", "Home"],
  "Home": ["Electronics", "Fashion"],
  "Medical": ["Health", "Industrial"],
  "Industrial": ["Electronics", "Medical"],
};

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

const WEIGHT_CATEGORY = 0.30;
const WEIGHT_COUNTRY = 0.25;
const WEIGHT_VOLUME = 0.20;
const WEIGHT_VERIFICATION = 0.15;
const WEIGHT_ACTIVITY = 0.10;

interface BuyerRow {
  id: string;
  buyer_user_id: string | null;
  company_name: string;
  contact_name: string | null;
  country: string;
  email: string | null;
  categories: string[] | null;
  interests: string | null;
  moq_range: string | null;
  trust_score: number | null;
  source: string | null;
  created_at: string;
  updated_at: string | null;
}

interface UserRow {
  id: string;
  email: string;
  role: string;
  company_name: string | null;
  display_name: string | null;
  country: string | null;
  interests: string | null;
  plan: string | null;
  verification_level: string | null;
  last_sign_in_at: string | null;
  created_at: string;
}

interface ProductRow {
  id: string;
  name_en: string;
  name_ko: string | null;
  category: string | null;
  fob_price: number | null;
  moq: number | null;
  analysis_id: string | null;
}

interface AnalysisRow {
  id: string;
  ai_result: {
    target_markets?: string[];
    recommended_markets?: Array<{ country?: string; rank?: number }>;
    hs_code?: string;
    product_category?: string;
  } | null;
}

interface ScoreBreakdown {
  category: number;
  country_demand: number;
  volume_fit: number;
  verification: number;
  activity: number;
}

function scoreCategoryMatch(
  productCategory: string,
  buyerCategories: string[],
): number {
  if (!productCategory || !buyerCategories.length) return 0;
  const prodCatLower = productCategory.toLowerCase();

  for (const bc of buyerCategories) {
    if (bc.toLowerCase() === prodCatLower) return 100;
  }

  const related = CATEGORY_RELATIONS[productCategory] || [];
  for (const bc of buyerCategories) {
    if (related.some((r) => r.toLowerCase() === bc.toLowerCase())) return 60;
  }

  return 0;
}

function scoreCountryDemand(
  buyerCountry: string,
  targetMarkets: string[],
): number {
  if (!buyerCountry || !targetMarkets.length) return 10;
  const cc = buyerCountry.toUpperCase().trim();

  for (let i = 0; i < targetMarkets.length; i++) {
    const tm = targetMarkets[i].toUpperCase().trim();
    if (cc === tm || cc.includes(tm) || tm.includes(cc)) {
      if (i < 3) return 100;
      if (i < 5) return 70;
      if (i < 10) return 40;
    }
  }

  return 10;
}

function scoreVolumeFit(
  productMoq: number | null,
  buyerMoqRange: string | null,
): number {
  if (!productMoq || !buyerMoqRange) return 50;

  const numMatch = buyerMoqRange.replace(/[^0-9\-~]/g, "").match(
    /(\d+)[\-~]?(\d*)/,
  );
  if (!numMatch) return 50;

  const buyerMin = parseInt(numMatch[1]) || 0;
  const buyerMax = numMatch[2] ? parseInt(numMatch[2]) : buyerMin * 2;
  const buyerMid = (buyerMin + buyerMax) / 2 || buyerMin;

  if (!buyerMid) return 50;

  const ratio = productMoq / buyerMid;
  if (ratio >= 0.5 && ratio <= 2.0) return 100;
  if (ratio >= 0.25 && ratio <= 4.0) return 60;
  return 20;
}

function scoreVerification(
  buyerSource: string | null,
  trustScore: number | null,
  verificationLevel: string | null,
): number {
  if (verificationLevel === "premium") return 100;
  if (verificationLevel === "business") return 80;
  if (verificationLevel === "email") return 40;

  if (trustScore && trustScore >= 80) return 80;
  if (trustScore && trustScore >= 50) return 60;

  if (buyerSource === "platform" || buyerSource === "verified") return 80;
  if (buyerSource === "ai_generated") return 40;
  if (buyerSource === "direct") return 50;

  return 10;
}

function scoreActivity(
  lastSignIn: string | null,
  updatedAt: string | null,
): number {
  const refDate = lastSignIn || updatedAt;
  if (!refDate) return 10;

  const elapsed = Date.now() - new Date(refDate).getTime();
  if (elapsed <= SEVEN_DAYS_MS) return 100;
  if (elapsed <= THIRTY_DAYS_MS) return 60;
  if (elapsed <= NINETY_DAYS_MS) return 30;
  return 10;
}

function generateMatchReason(
  breakdown: ScoreBreakdown,
  buyerCountry: string,
  productCategory: string,
  isKorean: boolean,
): string {
  const top = Object.entries(breakdown).sort((a, b) => b[1] - a[1]);
  const strongest = top[0][0];

  const reasons: Record<string, [string, string]> = {
    category: [
      `${buyerCountry} 바이어가 ${productCategory} 카테고리에 높은 관심을 보이고 있습니다.`,
      `This ${buyerCountry} buyer shows strong interest in ${productCategory} products.`,
    ],
    country_demand: [
      `${buyerCountry}는 이 제품의 핵심 수출 타겟 시장입니다.`,
      `${buyerCountry} is a key target market for this product.`,
    ],
    volume_fit: [
      `주문 물량이 제조 역량에 잘 맞는 바이어입니다.`,
      `Order volume aligns well with your manufacturing capacity.`,
    ],
    verification: [
      `검증된 바이어로 거래 신뢰도가 높습니다.`,
      `Verified buyer with high transaction reliability.`,
    ],
    activity: [
      `최근 플랫폼 활동이 활발한 바이어입니다.`,
      `Buyer is highly active on the platform recently.`,
    ],
  };

  const pair = reasons[strongest] || reasons["category"];
  return isKorean ? pair[0] : pair[1];
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

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

    const supabaseKey = Deno.env.get("CUSTOM_ANON_KEY") ||
      Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const body = await req.json();
    const { product_id, project_id, limit: resultLimit, lang } = body;
    const maxResults = Math.min(resultLimit || 10, 50);
    const isKorean = lang === "ko";

    if (!product_id) {
      return new Response(
        JSON.stringify({
          error: isKorean
            ? "제품 ID가 필요합니다"
            : "product_id is required",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    /* ── Plan limit check ── */
    const { data: profile } = await supabase
      .from("users")
      .select("plan, id")
      .eq("id", user.id)
      .single();

    const plan = profile?.plan || "free";
    const monthlyLimit = MATCH_LIMITS[plan] ?? 0;

    if (monthlyLimit === 0) {
      return new Response(
        JSON.stringify({
          error: isKorean
            ? "AI 바이어 매칭은 Pro 이상 플랜에서 사용 가능합니다."
            : "AI Buyer Matching is available from Pro plan.",
          upgrade_required: true,
          min_plan: "pro",
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (monthlyLimit > 0) {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count } = await supabase
        .from("usage_events")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("event_type", "buyer_matching")
        .gte("created_at", startOfMonth.toISOString());

      if ((count || 0) >= monthlyLimit) {
        return new Response(
          JSON.stringify({
            error: isKorean
              ? `이번 달 매칭 한도(${monthlyLimit}건)에 도달했습니다.`
              : `Monthly matching limit (${monthlyLimit}) reached.`,
            limit_reached: true,
            used: count || 0,
            limit: monthlyLimit,
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    /* ── Fetch product ── */
    const { data: product, error: prodErr } = await supabase
      .from("products")
      .select("id, name_en, name_ko, category, fob_price, moq, analysis_id")
      .eq("id", product_id)
      .eq("user_id", user.id)
      .single();

    if (!product || prodErr) {
      return new Response(
        JSON.stringify({
          error: isKorean ? "제품을 찾을 수 없습니다" : "Product not found",
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    /* ── Fetch analysis for target_markets ── */
    let targetMarkets: string[] = [];
    if (product.analysis_id) {
      const { data: analysis } = await supabase
        .from("analyses")
        .select("id, ai_result")
        .eq("id", product.analysis_id)
        .single();

      if (analysis?.ai_result) {
        const aiResult = analysis.ai_result as AnalysisRow["ai_result"];
        if (aiResult?.target_markets) {
          targetMarkets = aiResult.target_markets;
        } else if (aiResult?.recommended_markets) {
          targetMarkets = aiResult.recommended_markets
            .sort((a, b) => (a.rank || 99) - (b.rank || 99))
            .map((m) => m.country || "")
            .filter(Boolean);
        }
      }
    }

    /* ── If project has target countries, use those too ── */
    if (project_id) {
      const { data: proj } = await supabase
        .from("projects")
        .select("target_countries, target_market")
        .eq("id", project_id)
        .eq("user_id", user.id)
        .single();

      if (proj) {
        const projMarkets = proj.target_countries ||
          (proj.target_market ? [proj.target_market] : []);
        for (const pm of projMarkets) {
          if (pm && !targetMarkets.includes(pm)) {
            targetMarkets.push(pm);
          }
        }
      }
    }

    /* ── Fetch buyer-role users with service_role (cross-user) ── */
    const { data: buyerUsers } = await sbAdmin
      .from("users")
      .select(
        "id, email, role, company_name, display_name, country, interests, plan, verification_level, last_sign_in_at, created_at",
      )
      .eq("role", "buyer")
      .limit(500);

    /* ── Fetch buyer records from buyers table ── */
    const { data: buyerRecords } = await sbAdmin
      .from("buyers")
      .select("*")
      .neq("registered_by", user.id)
      .limit(500);

    /* ── Build candidate pool ── */
    interface Candidate {
      buyerId: string;
      buyerName: string;
      company: string;
      country: string;
      categories: string[];
      moqRange: string | null;
      trustScore: number | null;
      verificationLevel: string | null;
      source: string | null;
      lastSignIn: string | null;
      updatedAt: string | null;
    }

    const candidates: Candidate[] = [];
    const seenIds = new Set<string>();

    if (buyerUsers) {
      for (const bu of buyerUsers) {
        if (bu.id === user.id) continue;
        seenIds.add(bu.id);

        let cats: string[] = [];
        if (bu.interests) {
          try {
            const parsed = typeof bu.interests === "string"
              ? JSON.parse(bu.interests)
              : bu.interests;
            cats = Array.isArray(parsed) ? parsed : [];
          } catch {
            cats = [];
          }
        }

        candidates.push({
          buyerId: bu.id,
          buyerName: bu.display_name || bu.company_name || bu.email || "",
          company: bu.company_name || "",
          country: bu.country || "",
          categories: cats,
          moqRange: null,
          trustScore: null,
          verificationLevel: bu.verification_level || null,
          source: "platform",
          lastSignIn: bu.last_sign_in_at || null,
          updatedAt: bu.created_at,
        });
      }
    }

    if (buyerRecords) {
      for (const br of buyerRecords) {
        if (br.buyer_user_id && seenIds.has(br.buyer_user_id)) {
          const existing = candidates.find((c) =>
            c.buyerId === br.buyer_user_id
          );
          if (existing) {
            if (br.categories?.length) existing.categories = br.categories;
            if (br.moq_range) existing.moqRange = br.moq_range;
            if (br.trust_score) existing.trustScore = br.trust_score;
            if (br.updated_at) existing.updatedAt = br.updated_at;
          }
          continue;
        }

        const bId = br.buyer_user_id || br.id;
        if (seenIds.has(bId)) continue;
        seenIds.add(bId);

        candidates.push({
          buyerId: bId,
          buyerName: br.contact_name || br.company_name || "",
          company: br.company_name || "",
          country: br.country || "",
          categories: br.categories || [],
          moqRange: br.moq_range || null,
          trustScore: br.trust_score || null,
          verificationLevel: null,
          source: br.source || null,
          lastSignIn: null,
          updatedAt: br.updated_at || br.created_at,
        });
      }
    }

    /* ── Score each candidate ── */
    const productCategory = product.category || "";
    const productMoq = product.moq || null;

    const scored = candidates.map((c) => {
      const catScore = scoreCategoryMatch(productCategory, c.categories);
      const countryScore = scoreCountryDemand(c.country, targetMarkets);
      const volumeScore = scoreVolumeFit(productMoq, c.moqRange);
      const verifyScore = scoreVerification(
        c.source,
        c.trustScore,
        c.verificationLevel,
      );
      const actScore = scoreActivity(c.lastSignIn, c.updatedAt);

      const total = Math.round(
        catScore * WEIGHT_CATEGORY +
          countryScore * WEIGHT_COUNTRY +
          volumeScore * WEIGHT_VOLUME +
          verifyScore * WEIGHT_VERIFICATION +
          actScore * WEIGHT_ACTIVITY,
      );

      const breakdown: ScoreBreakdown = {
        category: catScore,
        country_demand: countryScore,
        volume_fit: volumeScore,
        verification: verifyScore,
        activity: actScore,
      };

      return {
        buyer_id: c.buyerId,
        buyer_name: c.buyerName,
        company: c.company,
        country: c.country,
        score: total,
        breakdown,
        match_reason: generateMatchReason(
          breakdown,
          c.country || "Unknown",
          productCategory || "General",
          isKorean,
        ),
      };
    });

    /* ── Sort and take top N ── */
    scored.sort((a, b) => b.score - a.score);
    const matches = scored.slice(0, maxResults);

    /* ── Record usage event ── */
    await supabase.from("usage_events").insert({
      user_id: user.id,
      event_type: "buyer_matching",
      details: {
        product_id,
        project_id: project_id || null,
        matches_returned: matches.length,
        top_score: matches[0]?.score || 0,
      },
      created_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({ matches }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("match-buyers error:", errMsg);
    return new Response(
      JSON.stringify({
        error: "An error occurred. Please try again.",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
