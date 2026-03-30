import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts";

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

// Multi-language support
const LANG_NAMES: Record<string, string> = {
  ko: "Korean", en: "English", ja: "Japanese", zh: "Chinese (Simplified)",
  vi: "Vietnamese", th: "Thai", de: "German", fr: "French",
  es: "Spanish", pt: "Portuguese", id: "Indonesian", tr: "Turkish", ar: "Arabic",
  it: "Italian", nl: "Dutch", pl: "Polish", cs: "Czech", ru: "Russian",
};

// ---------------------------------------------------------------------------
// In-memory rate limiting (resets on cold start)
// ---------------------------------------------------------------------------
const hourlyMap = new Map<string, { count: number; resetAt: number }>();
const dailyMap = new Map<string, { count: number; resetAt: number }>();
const HOURLY_LIMIT = 1;
const HOURLY_WINDOW_MS = 3_600_000; // 1 hour
const DAILY_LIMIT = 2;
const DAILY_WINDOW_MS = 86_400_000; // 24 hours
const MAX_BODY_SIZE = 10_240; // 10KB

function checkRateLimit(ip: string): boolean {
  const now = Date.now();

  // Daily cap check
  const daily = dailyMap.get(ip);
  if (!daily || now > daily.resetAt) {
    dailyMap.set(ip, { count: 1, resetAt: now + DAILY_WINDOW_MS });
  } else {
    if (daily.count >= DAILY_LIMIT) {
      return false;
    }
    daily.count++;
  }

  // Hourly check
  const hourly = hourlyMap.get(ip);
  if (!hourly || now > hourly.resetAt) {
    hourlyMap.set(ip, { count: 1, resetAt: now + HOURLY_WINDOW_MS });
    return true;
  }

  if (hourly.count >= HOURLY_LIMIT) {
    // Roll back daily increment since hourly blocked it
    const d = dailyMap.get(ip);
    if (d) d.count--;
    return false;
  }

  hourly.count++;
  return true;
}

// ---------------------------------------------------------------------------
// Lightweight URL crawler
// ---------------------------------------------------------------------------
const CRAWL_TIMEOUT_MS = 8_000;
const MAX_CRAWL_TEXT = 3_000;

const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept:
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

function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
    const hostname = parsed.hostname.toLowerCase();
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0") return false;
    if (hostname.startsWith("10.") || hostname.startsWith("192.168.") || hostname.startsWith("169.254.")) return false;
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(hostname)) return false;
    if (hostname.endsWith(".internal") || hostname.endsWith(".local")) return false;
    return true;
  } catch { return false; }
}

async function crawlUrl(url: string): Promise<CrawlResult> {
  try {
    if (!isSafeUrl(url)) {
      return { url, success: false, error: "URL not allowed" };
    }
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
    if (
      !contentType.includes("text/html") &&
      !contentType.includes("application/xhtml")
    ) {
      const rawText = await resp.text();
      return { url, success: true, title: "", text: rawText.slice(0, MAX_CRAWL_TEXT) };
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

    // Priority selectors for product-relevant content
    const prioritySelectors = [
      ".product-detail", ".product-info", ".item-detail",
      ".goods_description", ".prod_detail", "#productDetail",
      ".detail-content", ".product_detail", "[class*='product']",
      "[class*='detail']", "[class*='description']",
      "main", "article", ".content", "#content",
    ];

    let extractedText = "";
    for (const sel of prioritySelectors) {
      const els = doc.querySelectorAll(sel);
      els.forEach((el: any) => {
        const t = el.textContent?.replace(/\s+/g, " ").trim() || "";
        if (t.length > 50) extractedText += t + "\n";
      });
      if (extractedText.length > 2000) break;
    }

    // Fallback: body text
    if (extractedText.length < 500) {
      const body = doc.querySelector("body");
      if (body) {
        extractedText = body.textContent?.replace(/\s+/g, " ").trim() || "";
      }
    }

    // Meta tags
    const metaDesc =
      doc.querySelector('meta[name="description"]')?.getAttribute("content") || "";
    const ogTitle =
      doc.querySelector('meta[property="og:title"]')?.getAttribute("content") || "";
    const ogDesc =
      doc.querySelector('meta[property="og:description"]')?.getAttribute("content") || "";

    let metaInfo = "";
    if (ogTitle) metaInfo += `Product: ${ogTitle}\n`;
    if (metaDesc || ogDesc) metaInfo += `Description: ${metaDesc || ogDesc}\n`;

    const finalText = (metaInfo + extractedText).slice(0, MAX_CRAWL_TEXT);
    return { url, success: true, title, text: finalText };
  } catch (err) {
    const msg = (err as Error).message || "Unknown error";
    if (msg.includes("abort")) {
      return { url, success: false, error: "Timeout" };
    }
    return { url, success: false, error: msg };
  }
}

// ---------------------------------------------------------------------------
// Build simplified prompt
// ---------------------------------------------------------------------------
function buildPreviewPrompt(
  productDescription: string,
  crawledText: string,
  language: string,
): string {
  const isKo = language === "ko";
  const isEn = language === "en";
  const langName = LANG_NAMES[language] || "English";
  // For non-ko/non-en: use English prompt structure + language override
  const langOverride = (!isKo && !isEn)
    ? `\n\n**CRITICAL: Write your ENTIRE response in ${langName}. All text fields must be in ${langName}. Only keep technical terms (HS codes) in original form.**`
    : "";

  const systemContext = isEn || (!isKo)
    ? `You are Whistle AI's export preview analyzer. Based on the product information below, provide a quick export suitability preview.`
    : `당신은 Whistle AI의 수출 프리뷰 분석기입니다. 아래 제품 정보를 바탕으로 간단한 수출 적합성 프리뷰를 제공하세요.`;

  const crawlBlock = crawledText
    ? `\n## ${isEn ? "Crawled Product Data" : "크롤링 제품 데이터"}\n${crawledText}\n`
    : "";

  const outputSpec = isKo
    ? `JSON 객체만 응답하세요 (마크다운 펜스, 추가 텍스트 없이). 구조:
{
  "product_name": "감지/추론된 제품명",
  "hs_code": "XXXX.XX (6자리 HS코드 제안)",
  "category": "제품 카테고리 (예: 전자제품, 식음료, 화장품)",
  "target_markets": ["US", "JP", "DE"],
  "brief_summary": "2~3문장 수출 적합성 요약 (핵심 인사이트 포함)"
}

규칙:
- target_markets: 적합도순 ISO 국가코드 정확히 3개
- hs_code: 최선의 6자리 HS코드 추정치
- brief_summary: 이 제품에 특화된 구체적 분석, 일반론 금지
- 한국어로 작성`
    : `Respond with ONLY a JSON object (no markdown fences, no extra text). Structure:
{
  "product_name": "Detected or inferred product name",
  "hs_code": "XXXX.XX (6-digit HS code suggestion)",
  "category": "Product category (e.g., Electronics, Food & Beverage, Cosmetics)",
  "target_markets": ["US", "JP", "DE"],
  "brief_summary": "2-3 sentence export suitability summary with key insights"
}

Rules:
- target_markets: exactly 3 ISO country codes, ranked by suitability
- hs_code: provide your best 6-digit HS code estimate
- brief_summary: be specific to this product, no generalities
- All text in English${langOverride}`;

  return `${systemContext}

## ${isKo ? "제품 정보" : "Product Information"}
${productDescription}
${crawlBlock}
${outputSpec}`;
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------
serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const headers = { ...corsHeaders, "Content-Type": "application/json" };

  try {
    // Rate limit by IP
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";

    if (!checkRateLimit(clientIp)) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Rate limit exceeded. Max 1 request per hour, 2 per day.",
          code: "RATE_LIMITED",
        }),
        { status: 429, headers: { ...headers, "Retry-After": "3600" } },
      );
    }

    // Body size check
    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_BODY_SIZE) {
      return new Response(
        JSON.stringify({ ok: false, error: "Request body too large (max 10KB)", code: "PAYLOAD_TOO_LARGE" }),
        { status: 413, headers },
      );
    }

    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) {
      return new Response(
        JSON.stringify({ ok: false, error: "Service configuration error" }),
        { status: 500, headers },
      );
    }

    const body = await req.json();
    const { url, fileBase64 } = body;
    // Accept both 'language' and 'lang', validate against known codes
    const rawLang = body.language || body.lang || "en";
    const language = LANG_NAMES[rawLang] ? rawLang : "en";

    if (!url && !fileBase64) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Either 'url' or 'fileBase64' is required.",
        }),
        { status: 400, headers },
      );
    }

    // Build product description from input
    let productDescription = "";
    let crawledText = "";

    if (url) {
      // Validate URL
      try {
        new URL(url);
      } catch {
        return new Response(
          JSON.stringify({ ok: false, error: "Invalid URL format." }),
          { status: 400, headers },
        );
      }

      const result = await crawlUrl(url);
      if (result.success && result.text) {
        crawledText = result.text;
        productDescription = `Source URL: ${url}\nPage title: ${result.title || "N/A"}`;
      } else {
        productDescription = `Source URL: ${url}\nCrawl failed: ${result.error || "Unknown error"}. Analyze based on URL pattern only.`;
      }
    } else if (fileBase64) {
      productDescription = "User uploaded a product file (image or PDF).";
    }

    const prompt = buildPreviewPrompt(productDescription, crawledText, language);

    // Call Anthropic API with 60s timeout
    const aiController = new AbortController();
    const aiTimer = setTimeout(() => aiController.abort(), 60_000);

    const isKo = language === "ko";
    const isEn = language === "en";
    const langName = LANG_NAMES[language] || "English";
    // System prompt: Korean for ko, English+lang override for others
    const sysPrompt = isKo
      ? "당신은 수출 분석 프리뷰 엔진입니다. 유효한 JSON만 출력하세요. 마크다운 코드 펜스 없이. {로 시작하고 }로 끝내세요."
      : (!isEn
        ? `You are an export analysis preview engine. Output ONLY valid JSON. No markdown code fences. Start with { and end with }. IMPORTANT: All text values in the JSON must be written in ${langName}.`
        : "You are an export analysis preview engine. Output ONLY valid JSON. No markdown code fences. Start with { and end with }.");

    const aiResp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2000,
        system: sysPrompt,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: aiController.signal,
    });
    clearTimeout(aiTimer);

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("Anthropic API error:", aiResp.status, errText);
      return new Response(
        JSON.stringify({ ok: false, error: `AI service error (${aiResp.status})` }),
        { status: 502, headers },
      );
    }

    const aiData = await aiResp.json();
    const rawText = aiData.content?.[0]?.text || "";
    console.log(
      "analyze-anonymous response - model:",
      aiData.model,
      "usage:",
      JSON.stringify(aiData.usage),
    );

    // Parse JSON from AI response
    let result;
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found in response");
      result = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      console.error("JSON parse error:", parseErr, "raw:", rawText.slice(0, 500));
      return new Response(
        JSON.stringify({ ok: false, error: "Failed to parse AI response" }),
        { status: 500, headers },
      );
    }

    // Ensure required fields exist with fallbacks
    const preview = {
      product_name: result.product_name || "Unknown Product",
      hs_code: result.hs_code || "0000.00",
      category: result.category || "Uncategorized",
      target_markets: Array.isArray(result.target_markets)
        ? result.target_markets.slice(0, 3)
        : ["US", "JP", "DE"],
      brief_summary: result.brief_summary || "",
      analyzed_at: new Date().toISOString(),
      model_used: "claude-haiku-4-5-20251001",
      is_preview: true,
    };

    return new Response(
      JSON.stringify({ ok: true, result: preview }),
      { status: 200, headers },
    );
  } catch (err) {
    const msg = (err as Error).message || "Server error";
    if (msg.includes("abort")) {
      return new Response(
        JSON.stringify({ ok: false, error: "Request timed out" }),
        { status: 504, headers },
      );
    }
    console.error("analyze-anonymous error:", err);
    return new Response(
      JSON.stringify({ ok: false, error: msg }),
      { status: 500, headers },
    );
  }
});
