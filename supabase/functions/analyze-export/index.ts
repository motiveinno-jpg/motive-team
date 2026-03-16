import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://whistle-ai.com",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const CRAWL_TIMEOUT_MS = 15000;
const MAX_CRAWL_TEXT_LENGTH = 8000;

const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept":
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
  "Accept-Encoding": "gzip, deflate",
  "Cache-Control": "no-cache",
};

interface CrawlResult {
  url: string;
  success: boolean;
  title?: string;
  text?: string;
  error?: string;
}

async function crawlUrl(url: string): Promise<CrawlResult> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CRAWL_TIMEOUT_MS);

    const resp = await fetch(url, {
      headers: BROWSER_HEADERS,
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timer);

    if (!resp.ok) {
      return { url, success: false, error: `HTTP ${resp.status}` };
    }

    const contentType = resp.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      const rawText = await resp.text();
      return {
        url,
        success: true,
        title: "",
        text: rawText.slice(0, MAX_CRAWL_TEXT_LENGTH),
      };
    }

    const html = await resp.text();
    const doc = new DOMParser().parseFromString(html, "text/html");
    if (!doc) {
      return { url, success: false, error: "HTML parse failed" };
    }

    const title = doc.querySelector("title")?.textContent?.trim() || "";

    // Remove noise elements
    const removeSelectors = [
      "script", "style", "noscript", "iframe", "svg", "nav",
      "header", "footer", ".header", ".footer", ".nav",
      ".sidebar", ".cookie", ".popup", ".modal", ".ad",
      "[role='navigation']", "[role='banner']", "[role='contentinfo']",
    ];
    for (const sel of removeSelectors) {
      doc.querySelectorAll(sel).forEach((el: any) => el.remove());
    }

    // Extract meaningful text from product-relevant elements
    const prioritySelectors = [
      ".product-detail", ".product-info", ".item-detail",
      ".goods_description", ".prod_detail", "#productDetail",
      ".detail-content", ".product_detail", "[class*='product']",
      "[class*='detail']", "[class*='description']",
      "main", "article", ".content", "#content",
    ];

    let extractedText = "";

    // Try priority selectors first
    for (const sel of prioritySelectors) {
      const els = doc.querySelectorAll(sel);
      els.forEach((el: any) => {
        const t = el.textContent?.replace(/\s+/g, " ").trim() || "";
        if (t.length > 50) extractedText += t + "\n";
      });
      if (extractedText.length > 2000) break;
    }

    // Fallback: extract from body
    if (extractedText.length < 500) {
      const body = doc.querySelector("body");
      if (body) {
        extractedText = body.textContent?.replace(/\s+/g, " ").trim() || "";
      }
    }

    // Extract meta description and og tags
    const metaDesc = doc.querySelector('meta[name="description"]')
      ?.getAttribute("content") || "";
    const ogTitle = doc.querySelector('meta[property="og:title"]')
      ?.getAttribute("content") || "";
    const ogDesc = doc.querySelector('meta[property="og:description"]')
      ?.getAttribute("content") || "";
    const ogImage = doc.querySelector('meta[property="og:image"]')
      ?.getAttribute("content") || "";

    let metaInfo = "";
    if (ogTitle) metaInfo += `제품명: ${ogTitle}\n`;
    if (metaDesc || ogDesc) metaInfo += `설명: ${metaDesc || ogDesc}\n`;
    if (ogImage) metaInfo += `이미지: ${ogImage}\n`;

    const finalText = (metaInfo + extractedText).slice(0, MAX_CRAWL_TEXT_LENGTH);

    return { url, success: true, title, text: finalText };
  } catch (err) {
    const msg = (err as Error).message || "Unknown error";
    if (msg.includes("abort")) {
      return { url, success: false, error: "Timeout (15s)" };
    }
    return { url, success: false, error: msg };
  }
}

async function crawlUrls(urls: string[]): Promise<{
  crawledText: string;
  crawlResults: CrawlResult[];
}> {
  if (!urls.length) return { crawledText: "", crawlResults: [] };

  const validUrls = urls.filter((u) => {
    try { new URL(u); return true; } catch { return false; }
  }).slice(0, 5); // Max 5 URLs

  const results = await Promise.allSettled(
    validUrls.map((u) => crawlUrl(u)),
  );

  const crawlResults: CrawlResult[] = results.map((r, i) =>
    r.status === "fulfilled"
      ? r.value
      : { url: validUrls[i], success: false, error: "Promise rejected" }
  );

  let crawledText = "";
  for (const cr of crawlResults) {
    if (cr.success && cr.text) {
      crawledText += `\n--- 크롤링 결과: ${cr.url} ---\n`;
      if (cr.title) crawledText += `페이지 제목: ${cr.title}\n`;
      crawledText += cr.text + "\n";
    }
  }

  return { crawledText: crawledText.slice(0, 20000), crawlResults };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const headers = { ...corsHeaders, "Content-Type": "application/json" };

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ ok: false, error: "Unauthorized" }),
        { status: 401, headers },
      );
    }

    const sbUrl = Deno.env.get("SUPABASE_URL")!;
    const sbAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const sb = createClient(sbUrl, sbAnon, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ ok: false, error: "Unauthorized" }),
        { status: 401, headers },
      );
    }

    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) {
      return new Response(
        JSON.stringify({ ok: false, error: "ANTHROPIC_API_KEY not set" }),
        { status: 500, headers },
      );
    }

    const body = await req.json();
    const {
      analysis_id,
      product_name,
      product_name_en = "",
      category = "",
      fob_price,
      moq,
      description = "",
      urls = [],
      file_urls = [],
      selling_points = [],
      target_markets = ["US", "JP", "SEA"],
      existing_certs = [],
      brand_name = "",
      manufacturer = "",
      export_experience = "",
      annual_capacity = "",
      special_requirements = "",
      known_hs_code = "",
      weight_kg = "",
      package_dimensions = "",
      units_per_carton = "",
    } = body;

    if (!analysis_id || !product_name) {
      return new Response(
        JSON.stringify({ ok: false, error: "analysis_id, product_name 필수" }),
        { status: 400, headers },
      );
    }

    const marketNames: Record<string, string> = {
      US: "미국", JP: "일본", CN: "중국", EU: "유럽(독일 기준)",
      SEA: "동남아(베트남 기준)", ME: "중동(UAE 기준)", AU: "호주",
      LATAM: "남미(브라질 기준)", IN: "인도", GB: "영국", CA: "캐나다",
    };

    const marketList = target_markets
      .map((m: string) => marketNames[m] || m)
      .join(", ");

    // Crawl URLs for product data extraction
    const { crawledText, crawlResults } = await crawlUrls(urls);
    console.log(
      "[crawl] results:",
      crawlResults.map((r) => `${r.url}: ${r.success ? "OK" : r.error}`),
    );

    const prompt = buildPrompt({
      product_name,
      product_name_en,
      category,
      fob_price,
      moq,
      description,
      urls,
      file_urls,
      selling_points,
      target_markets,
      existing_certs,
      brand_name,
      manufacturer,
      export_experience,
      annual_capacity,
      special_requirements,
      known_hs_code,
      weight_kg,
      package_dimensions,
      units_per_carton,
      marketList,
      crawledText,
    });

    const aiResp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 8000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("Anthropic API error:", aiResp.status, errText);
      await sb
        .from("analyses")
        .update({
          status: "failed",
          ai_result: { error: `AI API ${aiResp.status}` },
        })
        .eq("id", analysis_id)
        .eq("user_id", user.id);
      return new Response(
        JSON.stringify({
          ok: false,
          error: `AI API 오류 (${aiResp.status})`,
        }),
        { status: 502, headers },
      );
    }

    const aiData = await aiResp.json();
    const rawText = aiData.content?.[0]?.text || "";

    let result;
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("JSON not found");
      result = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      console.error("JSON parse error:", parseErr, "Raw:", rawText.slice(0, 500));
      await sb
        .from("analyses")
        .update({
          status: "failed",
          ai_result: { error: "AI response parse failed", raw: rawText.slice(0, 300) },
        })
        .eq("id", analysis_id)
        .eq("user_id", user.id);
      return new Response(
        JSON.stringify({ ok: false, error: "AI 응답 파싱 실패" }),
        { status: 500, headers },
      );
    }

    // Attach crawl metadata
    result.crawl_results = crawlResults.map((cr) => ({
      url: cr.url,
      success: cr.success,
      title: cr.title || "",
      error: cr.error || "",
    }));
    result.analysis_version = "EF-v6";
    result.model_used = "claude-sonnet-4-6";
    result.analyzed_at = new Date().toISOString();
    result.input_data = {
      product_name_en,
      category,
      fob_price,
      moq,
      description,
      urls,
      selling_points: selling_points.filter(Boolean),
      target_markets,
      existing_certs,
      brand_name,
      manufacturer,
    };

    await sb
      .from("analyses")
      .update({ status: "completed", ai_result: result })
      .eq("id", analysis_id)
      .eq("user_id", user.id);

    return new Response(
      JSON.stringify({ ok: true, result }),
      { status: 200, headers },
    );
  } catch (err) {
    console.error("analyze-export error:", err);
    return new Response(
      JSON.stringify({ ok: false, error: (err as Error).message || "서버 오류" }),
      { status: 500, headers },
    );
  }
});

interface PromptInput {
  product_name: string;
  product_name_en: string;
  category: string;
  fob_price: number;
  moq: number;
  description: string;
  urls: string[];
  file_urls: string[];
  selling_points: string[];
  target_markets: string[];
  existing_certs: string[];
  brand_name: string;
  manufacturer: string;
  export_experience: string;
  annual_capacity: string;
  special_requirements: string;
  known_hs_code: string;
  weight_kg: string;
  package_dimensions: string;
  units_per_carton: string;
  marketList: string;
  crawledText: string;
}

function buildPrompt(d: PromptInput): string {
  return `# Whistle AI Export Intelligence Engine v5

당신은 Whistle AI의 수출 인텔리전스 엔진입니다. 관세사(관세·HS코드·FTA), 국제물류전문가(선적·통관·인코텀즈), 해외마케팅전략가(시장진입·채널·가격)의 3중 전문성을 통합한 분석을 수행합니다.

이 분석은 유료 서비스(건당 $9.90~₩25,000)로 전 세계 제조사/수출기업에게 제공됩니다.
분석 대상은 한국 기업뿐 아니라 전 세계 모든 국가의 수출 기업입니다.
일반론, 당연한 말, 뻔한 조언은 절대 쓰지 마세요. 모든 내용은 이 "특정 제품"에 대한 구체적 분석이어야 합니다.

## 제품 정보
- 제품명(한글): ${d.product_name}
- 제품명(영문): ${d.product_name_en || "미입력"}
- 카테고리: ${d.category || "미지정"}
- FOB 가격(USD): ${d.fob_price || "미입력"}
- MOQ: ${d.moq || "미입력"}
- 브랜드: ${d.brand_name || "미입력"}
- 제조사: ${d.manufacturer || "미입력"}
- 수출 경험: ${d.export_experience || "미입력"}
- 연간 생산능력: ${d.annual_capacity || "미입력"}
- 중량(kg): ${d.weight_kg || "미입력"}
- 포장 치수: ${d.package_dimensions || "미입력"}
- 박스 당 수량: ${d.units_per_carton || "미입력"}
- 셀링포인트: ${d.selling_points.filter(Boolean).join(", ") || "미입력"}
- 보유 인증: ${d.existing_certs.join(", ") || "없음"}
- 알려진 HS코드: ${d.known_hs_code || "미입력"}
- 특별 요구사항: ${d.special_requirements || "없음"}
- 제품 설명: ${d.description || "미입력"}
- 제품 URL: ${d.urls.filter(Boolean).join(", ") || "없음"}
- 제품 이미지: ${d.file_urls.length ? d.file_urls.join(", ") : "없음"}
- 타겟 시장: ${d.marketList}
${d.crawledText ? `\n## 크롤링으로 수집한 제품 페이지 데이터\n아래는 제품 URL에서 실제 크롤링하여 추출한 텍스트입니다. 이 데이터를 분석에 적극 활용하세요. 제품명, 성분, 가격, 상세 설명 등 실제 정보가 포함되어 있습니다.\n${d.crawledText}` : ""}

## 핵심 분석 원칙
1. **점수 근거 필수**: 각 점수마다 "왜 이 점수인지" 구체적 이유를 score_details에 기재. "시장이 크니까" 같은 일반론 금지. 이 제품의 어떤 특성이 어떤 시장 조건과 맞는지/안 맞는지를 분석.
2. **HS코드 정밀 분류**: 관세율표 통칙 1~6에 따라 분류 근거를 명시. 대안 코드는 "왜 이 코드가 아닌지"까지 설명.
3. **관세율은 실제 데이터 기준**: 2024-2025 관세양허표 기준. 제품의 원산국이 한국이면 한국의 21개 FTA 네트워크를, 다른 국가면 해당 국가의 FTA를 분석. FTA 원산지 기준은 품목별 규칙(PSR) 수준으로 구체화. (예: "HS 3304 → KORUS Annex 4-B: CC 또는 RVC 35%", "EU-Vietnam FTA: RVC 40%")
4. **경쟁사 실명 언급**: 해당 카테고리의 글로벌/한국 실제 경쟁사를 이름, 가격대, 강약점과 함께 분석. "경쟁사 A" 같은 가명 금지.
5. **시장 분석은 해당 제품 카테고리 한정**: "미국 시장이 크다" 말고 "미국의 [이 카테고리] 시장은 $XX규모, 유통은 XX 채널이 주력, 진입 시 XX가 관건" 수준.
6. **가격 전략은 숫자 기반**: 경쟁사 FOB/소매가 비교, 마진 구조, 추천 가격대를 구체적 금액으로.
7. **행동계획은 실무 수준**: "인증을 취득하세요"가 아니라 "FDA VCRP 등록: fda.gov/cosmetics → Facility Registration → 수수료 없음, 2~3주 소요, 준비서류: 성분표(INCI), 라벨링 샘플" 수준.

## 응답 JSON 구조 (모든 필드 필수)
{
  "overall_score": 0~100 (종합),
  "market_fit": 0~100,
  "competition": 0~100,
  "regulatory": 0~100,
  "price_competitiveness": 0~100,
  "brand_power": 0~100,
  "logistics_score": 0~100,
  "score_details": {
    "overall_reason": "종합 점수 판단 근거 (3~4문장, 이 제품만의 구체적 이유)",
    "market_fit_reason": "이 제품이 타겟 시장과 왜 맞는지/안 맞는지",
    "price_reason": "경쟁사 대비 가격 포지션 분석",
    "brand_reason": "브랜드 인지도/스토리/차별화 요소 분석",
    "competition_reason": "실제 경쟁사 대비 이 제품의 위치",
    "regulatory_reason": "필요 인증/규제 충족도 분석",
    "logistics_reason": "중량/부피/포장/운송 적합성 분석"
  },
  "estimated_fob": "$X.X~$X.X",
  "estimated_retail": {"US": "$XX~$XX", "JP": "¥X,XXX~¥X,XXX"},
  "hs_code": "XXXX.XX",
  "hs_description": "이 제품에 대한 HS코드 분류 요약 (1~2문장)",
  "hs_code_detail": {
    "hs2": "XX", "hs2_desc": "류 설명",
    "hs4": "XXXX", "hs4_desc": "호 설명",
    "hs6": "XXXX.XX", "hs6_desc": "소호 설명",
    "hs10": "XXXX.XX.XXXX", "hs10_desc": "HSK 설명",
    "basis": "관세율표 통칙 몇 호에 따라, 어떤 기준(주된 특성/용도/재질)으로 이 코드를 선택했는지 상세 기재",
    "alts": [{"code": "XXXX.XX.XXXX", "reason": "이 코드가 대안인 이유와 적용 조건"}]
  },
  "hs_alternatives": [{"code": "XXXX.XX", "reason": "간단 설명"}],
  "fta_tariff_table": [
    {
      "mkt": "US",
      "fta": "한-미 FTA (KORUS)",
      "mfn": "X.X%",
      "pref": "X%",
      "save": "X.X%p",
      "rule": "PSR 수준의 구체적 원산지 기준 (예: CC 또는 RVC 35%, Annex 4-B 참조)",
      "fta_name": "한-미 자유무역협정"
    }
  ],
  "duty_savings_estimate": {
    "annual_volume": "추정 연간 수출량",
    "fob_per_unit": "$X.X",
    "avg_mfn": "X.X%",
    "avg_fta": "X%",
    "estimated_annual_saving": "$X,XXX"
  },
  "required_certs": ["인증명1", "인증명2"],
  "existing_certs": ${JSON.stringify(d.existing_certs)},
  "cert_details": [
    {
      "name": "인증명",
      "market": "대상국",
      "duration": "소요 기간",
      "cost": "비용 범위 (USD)",
      "priority": "필수/권장/선택",
      "note": "신청 방법, 필요 서류, 주의사항 등 실무 정보"
    }
  ],
  "recommended_markets": ["US", "JP"],
  "market_analysis": [
    {
      "name": "국가명",
      "size": "해당 카테고리 시장 규모",
      "grow": "성장률",
      "entry": "진입장벽 수준",
      "note": "이 제품에 특화된 구체적 진출 조언 (3~4문장)",
      "gdp": "GDP (참고)",
      "key_channel": "주력 유통 채널명",
      "price_sensitivity": "가격 민감도"
    }
  ],
  "competitor_analysis": {
    "overview": "이 카테고리의 경쟁 환경 개요 (2~3문장)",
    "swot": {
      "strength": "이 제품의 구체적 강점",
      "weakness": "이 제품의 구체적 약점",
      "opportunity": "이 제품이 활용 가능한 기회",
      "threat": "이 제품이 직면할 위협"
    },
    "global_competitors": [
      {"name": "실제 브랜드명", "price": "가격대", "strength": "이 경쟁사의 강점", "weakness": "이 경쟁사의 약점"}
    ],
    "local_competitors": [
      {"name": "한국 경쟁사 실제 브랜드명", "price": "가격대"}
    ],
    "price_range": "경쟁사 가격 범위",
    "our_positioning": "경쟁사 대비 이 제품의 포지셔닝 전략 (2~3문장)"
  },
  "pricing_strategy": {
    "recommended_fob": "$X.X",
    "recommended_retail": "$XX~$XX",
    "margin_structure": "FOB→CIF→도매→소매 마진 구조",
    "strategy": "가격 전략 설명 (2~3문장)"
  },
  "industry_trend": "이 카테고리의 글로벌 트렌드를 구체적 수치와 함께 작성 (3~4문장)",
  "recommended_channels": ["구체적 채널명 (예: Amazon FBA US, Qoo10 Japan)"],
  "summary": "이 제품의 수출 적합도 종합 요약 (3~4문장, 핵심 수치 포함)",
  "executive_summary": {
    "situation": "현재 이 제품/시장의 상황 분석 (2~3문장)",
    "complication": "수출 시 직면할 핵심 과제/장벽 (2~3문장)",
    "resolution": "해결 방향과 우선 실행 사항 (2~3문장)"
  },
  "opportunities": ["구체적 기회 1 (수치 포함)", "기회 2", "기회 3", "기회 4", "기회 5"],
  "risks": ["구체적 리스크 1 (대응 방안 포함)", "리스크 2", "리스크 3", "리스크 4", "리스크 5"],
  "action_plan": [
    {
      "phase": "1단계 (1~2개월)",
      "title": "수출 준비",
      "items": ["실무 수준의 구체적 액션 (담당기관/URL/비용/기간 포함)", "액션 2", "액션 3"]
    },
    {
      "phase": "2단계 (2~4개월)",
      "title": "인증 취득 & 바이어 발굴",
      "items": ["구체적 액션", "액션 2", "액션 3"]
    },
    {
      "phase": "3단계 (4~6개월)",
      "title": "첫 수출 실행",
      "items": ["구체적 액션", "액션 2", "액션 3"]
    }
  ],
  "alibaba_suitability": {
    "score": 0~100,
    "verdict": "추천/보통/비추천",
    "reasons": ["판단 근거 1", "근거 2"],
    "tips": ["알리바바 입점 시 실무 팁 1", "팁 2"]
  }
}

## 금지사항
- "~을 추천합니다", "~이 필요합니다" 같은 당연한 조언 금지. 구체적 HOW를 써라.
- "시장이 크다", "한류 영향" 같은 일반론 금지. 이 제품에 해당하는 구체적 근거를 써라.
- 경쟁사를 "경쟁사 A/B/C"로 가명 쓰기 금지. 실제 브랜드명을 써라.
- 점수를 근거 없이 높게 주기 금지. 정보가 부족하면 보수적으로 채점하고 score_details에 "정보 부족으로 보수적 산정" 명시.
- "목업", "데모", "샘플" 같은 표현 금지. 이것은 실제 유료 분석 서비스임.
- 모든 텍스트는 한국어로 작성
- JSON만 출력하세요`;
}
