import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://whistle-ai.com",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/* HS코드 분류 체계 — 주요 21개 류(Chapter) + 세번 힌트 */
const HS_CHAPTERS: Record<string, string> = {
  "01-05": "살아있는 동물 및 동물성 생산품",
  "06-14": "식물성 생산품",
  "15": "동식물성 유지",
  "16-24": "조제 식료품, 음료, 주류, 담배",
  "25-27": "광물성 생산품",
  "28-38": "화학공업 생산품",
  "39-40": "플라스틱 및 고무",
  "41-43": "원피, 가죽, 모피",
  "44-46": "목재, 코르크",
  "47-49": "펄프, 종이, 인쇄물",
  "50-63": "방직용 섬유, 의류",
  "64-67": "신발, 모자, 우산",
  "68-70": "석, 시멘트, 유리",
  "71": "귀금속, 보석",
  "72-83": "비금속(철강, 알루미늄 등)",
  "84-85": "기계류, 전기기기",
  "86-89": "차량, 항공기, 선박",
  "90-92": "광학기기, 의료기기, 악기",
  "93": "무기, 탄약",
  "94-96": "가구, 완구, 잡품",
  "97": "예술품, 골동품",
};

/* 화장품/K-Beauty 세부 HS코드 (가장 빈번한 수출품) */
const COSMETICS_HS: Record<string, string> = {
  "3304.10": "입술 화장용 제품류 (립스틱, 립글로스 등)",
  "3304.20": "눈 화장용 제품류 (아이섀도, 마스카라 등)",
  "3304.30": "매니큐어·페디큐어용 제품류",
  "3304.91": "파우더류 (파운데이션, 팩트, 루스파우더)",
  "3304.99": "기타 미용·메이크업용 제품 (세럼, 에센스, 크림, 로션, 마스크팩, 선크림 등)",
  "3305.10": "샴푸",
  "3305.20": "퍼머넌트 웨이빙·스트레이트닝용",
  "3305.30": "헤어 래커 (헤어스프레이)",
  "3305.90": "기타 두발용 제품 (컨디셔너, 헤어오일, 헤어에센스 등)",
  "3307.10": "면도용 제품류",
  "3307.20": "데오도란트, 체취방지제",
  "3307.30": "방향용 목욕 제품 (입욕제, 바스솔트)",
  "3307.49": "실내 방향제, 탈취제",
  "3307.90": "기타 조제향료(핸드크림, 바디로션 등 별도 분류 안될 때)",
  "3401.11": "화장용 비누 (고체)",
  "3401.20": "기타 비누 (액체비누 포함)",
  "3401.30": "피부 세정용 유기계면활성제품 (클렌징폼, 워시 등)",
};

/* 식품 관련 HS */
const FOOD_HS: Record<string, string> = {
  "0409.00": "천연꿀",
  "0901": "커피",
  "0902": "차(茶)",
  "1704": "설탕 과자류 (캔디, 초콜릿 제외)",
  "1806": "초콜릿 및 코코아 조제품",
  "1902": "면류 (라면, 파스타 등)",
  "1905": "빵, 비스킷, 케이크류",
  "2001-2008": "채소·과실 조제품",
  "2009": "과실주스, 채소주스",
  "2103": "소스류, 조미료",
  "2104": "수프, 브로스",
  "2106": "기타 조제 식료품 (건강기능식품 포함)",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const sbUrl = Deno.env.get("SUPABASE_URL")!;
    const sbServiceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sbAdmin = createClient(sbUrl, sbServiceRole);

    // Extract and validate user from JWT
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userErr } = await sbAdmin.auth.getUser(token);
    if (!user || userErr) {
      return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Create user-scoped client for RLS operations
    const sbAnon = Deno.env.get("CUSTOM_ANON_KEY") || Deno.env.get("SUPABASE_ANON_KEY")!;
    const sb = createClient(sbUrl, sbAnon, {
      global: { headers: { Authorization: authHeader } },
    });

    // ─── Plan enforcement: check user's plan and usage limits ───
    const PLAN_LIMITS: Record<string, number> = {
      free: 1,
      starter: -1,    // unlimited
      pro: -1,         // unlimited
      professional: -1, // unlimited
      enterprise: -1,  // unlimited
      alibaba: -1,     // unlimited
    };

    const { data: userData } = await sbAdmin
      .from("users")
      .select("plan, analysis_credits")
      .eq("id", user.id)
      .single();

    const userPlan = userData?.plan || "free";
    const singleCredits = userData?.analysis_credits || 0;
    const monthlyLimit = PLAN_LIMITS[userPlan] ?? 3;

    // Count this month's HS classifications (skip for unlimited plans)
    if (monthlyLimit !== -1) {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count: monthlyUsage } = await sbAdmin
        .from("rate_limits")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("action", "classify_hs")
        .gte("window_start", startOfMonth.toISOString());

      const used = monthlyUsage || 0;

      if (used >= monthlyLimit && singleCredits <= 0) {
        const isKo = req.headers.get("accept-language")?.includes("ko");
        return new Response(
          JSON.stringify({
            ok: false,
            error: isKo
              ? `월간 HS코드 분류 한도(${monthlyLimit}회)를 초과했습니다. 플랜을 업그레이드하거나 단건 분석을 구매해주세요.`
              : `Monthly HS classification limit (${monthlyLimit}) exceeded. Please upgrade your plan or purchase a single analysis.`,
            code: "PLAN_LIMIT_EXCEEDED",
            limit: monthlyLimit,
            used,
          }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Deduct single analysis credit atomically if over monthly limit
      if (used >= monthlyLimit && singleCredits > 0) {
        const { data: remaining, error: rpcErr } = await sbAdmin.rpc("deduct_analysis_credit", { p_user_id: user.id });
        if (rpcErr || remaining === -1) {
          return new Response(
            JSON.stringify({ ok: false, error: "No credits available", code: "PLAN_LIMIT_EXCEEDED", limit: monthlyLimit, used }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        console.log(`[plan] User ${user.id} used single credit for classify_hs (${remaining} remaining)`);
      }
    }
    // ─── End plan enforcement ───

    const {
      product_name,
      description = "",
      category = "",
      ingredients = "",
      usage = "",
      material = "",
      process = "",
      weight = "",
      origin_country = "KR",
    } = await req.json();

    const ORIGIN_LABELS: Record<string, string> = {
      KR: "한국/South Korea", US: "미국/United States", JP: "일본/Japan", CN: "중국/China",
      DE: "독일/Germany", FR: "프랑스/France", GB: "영국/United Kingdom", VN: "베트남/Vietnam",
      TH: "태국/Thailand", IN: "인도/India", TW: "대만/Taiwan", IT: "이탈리아/Italy",
      AU: "호주/Australia", CA: "캐나다/Canada", BR: "브라질/Brazil", MX: "멕시코/Mexico",
    };
    const originLabel = ORIGIN_LABELS[origin_country] || origin_country;
    const isKoreaOrigin = origin_country === "KR";

    if (!product_name) {
      return new Response(
        JSON.stringify({ ok: false, error: "제품명을 입력하세요" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) {
      return new Response(
        JSON.stringify({ ok: false, error: "API 키가 설정되지 않았습니다. Supabase 대시보드에서 ANTHROPIC_API_KEY를 설정하세요." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    /* 분류 참고용 힌트 구성 */
    let hsHint = "";
    const catLower = (category || "").toLowerCase();
    if (
      catLower.includes("beauty") ||
      catLower.includes("cosmetic") ||
      catLower.includes("skin") ||
      catLower.includes("화장")
    ) {
      hsHint =
        "화장품 관련 HS코드 참고:\n" +
        Object.entries(COSMETICS_HS)
          .map(([k, v]) => `${k}: ${v}`)
          .join("\n");
    } else if (
      catLower.includes("food") ||
      catLower.includes("식품") ||
      catLower.includes("건강")
    ) {
      hsHint =
        "식품 관련 HS코드 참고:\n" +
        Object.entries(FOOD_HS)
          .map(([k, v]) => `${k}: ${v}`)
          .join("\n");
    }

    const prompt = `You are an international HS code classification expert with deep knowledge of the Harmonized System.
Classify the product below with the most appropriate HS code (10 digits).

## Product Information
- Product Name: ${product_name}
- Origin Country: ${originLabel}
- Category: ${category || "Not specified"}
- Key Ingredients/Materials: ${ingredients || "Not provided"}
- Usage/Function: ${usage || "Not provided"}
- Material/Packaging: ${material || "Not provided"}
- Manufacturing Process: ${process || "Not provided"}
- Weight/Volume: ${weight || "Not provided"}
- Description: ${description || "None"}

${hsHint ? "## HS Code Reference Data\n" + hsHint : ""}

## Classification Principles
1. Follow General Interpretive Rules (GIR 1→6)
2. Finished products: classify by material/use that gives essential character
3. Sets: classify by essential character
4. Mixtures/composites: classify under the most specific heading

## Response Format (JSON only)
{
  "primary": {
    "code": "XXXX.XX.XXXX",
    "description": "품명 (Korean)",
    "description_en": "English description",
    "confidence": 85,
    "basis": "Classification basis (which GIR rule, which criteria)"
  },
  "alternatives": [
    {"code": "YYYY.YY.YYYY", "description": "Alternative name", "confidence": 70, "reason": "Why this is an alternative"}
  ],
  "tariff_preview": [
    {"market": "US", "country": "US", "mfn": "6.5%", "fta": "${isKoreaOrigin ? '0% (KORUS)' : 'Check applicable FTA'}", "note": "${isKoreaOrigin ? 'Korea-US FTA C/O required' : 'Check FTA between ' + origin_country + ' and US'}"},
    {"market": "JP", "country": "JP", "mfn": "5.8%", "fta": "", "note": ""},
    {"market": "CN", "country": "CN", "mfn": "10%", "fta": "", "note": ""},
    {"market": "EU", "country": "DE", "mfn": "6.5%", "fta": "", "note": ""},
    {"market": "VN", "country": "VN", "mfn": "20%", "fta": "", "note": ""}
  ],
  "notes": "Additional classification notes",
  "required_docs": ["Certificate of Origin", "Product composition analysis"]
}

IMPORTANT: The product originates from ${originLabel}.
- In tariff_preview, show FTA rates applicable when exporting FROM ${originLabel} to each market.
- If ${origin_country} has an FTA with the destination, show the preferential rate.
- If no FTA exists, show "N/A" for fta field.
- Estimate tariff rates as close to actual rates as possible for this HS code.
Output JSON only.`;

    const aiController = new AbortController();
    const aiTimeout = setTimeout(() => aiController.abort(), 30000);

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: aiController.signal,
    }).finally(() => clearTimeout(aiTimeout));

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("Anthropic API error:", resp.status, errText);
      return new Response(
        JSON.stringify({
          ok: false,
          error: `AI API error (${resp.status})`,
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const aiResp = await resp.json();
    const text =
      aiResp.content?.[0]?.text || "";

    /* JSON 추출 */
    let result;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("JSON not found in response");
      }
    } catch (parseErr) {
      console.error("JSON parse error:", parseErr, "Raw:", text);
      return new Response(
        JSON.stringify({
          ok: false,
          error: "AI 응답 파싱 실패",
          raw: text.substring(0, 500),
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Track usage in rate_limits
    await sbAdmin
      .from("rate_limits")
      .insert({
        user_id: user.id,
        action: "classify_hs",
        window_start: new Date().toISOString(),
        count: 1,
      });

    return new Response(
      JSON.stringify({ ok: true, result }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("classify-hs error:", err);
    return new Response(
      JSON.stringify({ ok: false, error: "서버 오류가 발생했습니다" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
