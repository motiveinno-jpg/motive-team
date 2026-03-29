import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://whistle-ai.com",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Multi-language support: map language codes to full names for Claude prompts
const LANG_NAMES: Record<string, string> = {
  ko: "Korean", en: "English", ja: "Japanese", zh: "Chinese (Simplified)",
  vi: "Vietnamese", th: "Thai", de: "German", fr: "French",
  es: "Spanish", pt: "Portuguese", id: "Indonesian", tr: "Turkish", ar: "Arabic",
  it: "Italian", nl: "Dutch", pl: "Polish", cs: "Czech", ru: "Russian",
  bn: "Bengali", ur: "Urdu", fa: "Persian",
};

function resolveLang(body: any): string {
  // Accept both 'language' and 'lang' from client
  const raw = body.language || body.lang || "en";
  // Validate it's a known language code
  return LANG_NAMES[raw] ? raw : "en";
}


// Repair common JSON issues from AI output (trailing commas, unclosed braces, unescaped newlines)
function repairJSON(str: string): string {
  let s = str;
  // Remove trailing commas before } or ]
  s = s.replace(/,\s*([\]}])/g, "$1");
  // Fix unescaped newlines inside string values
  s = s.replace(/(?<=:\s*"[^"]*)\n([^"]*")/g, "\\n$1");
  // Close unclosed braces/brackets
  let opens = 0, closesObj = 0, openArr = 0, closeArr = 0;
  for (const ch of s) {
    if (ch === "{") opens++;
    else if (ch === "}") closesObj++;
    else if (ch === "[") openArr++;
    else if (ch === "]") closeArr++;
  }
  while (closeArr < openArr) { s += "]"; closeArr++; }
  while (closesObj < opens) { s += "}"; closesObj++; }
  // Remove any text after the last matching }
  let depth = 0, lastClose = -1;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "{") depth++;
    else if (s[i] === "}") { depth--; if (depth === 0) lastClose = i; }
  }
  if (lastClose > 0 && lastClose < s.length - 1) s = s.substring(0, lastClose + 1);
  return s;
}

// Assemble 8-stage export journey from flat AI analysis results
function assembleExportJourney(r: any, isKo: boolean, origin: string, originLabel: string) {
  const t = (ko: string, en: string) => isKo ? ko : en;
  const score = (v: any) => typeof v === "number" ? v : parseInt(v) || 0;
  const status = (s: number) => s >= 70 ? "ready" : s >= 40 ? "needs_work" : "blocked";

  const markets = r.market_analysis || [];
  const certs = r.cert_details || [];
  const comp = r.competitor_analysis || {};
  const pricing = r.pricing_strategy || {};
  const logistics = r.logistics || {};
  const fta = r.fta_tariff_table || [];
  const actions = r.action_plan || [];
  const risks = r.risk_matrix || r.risks || [];
  const readiness = r.export_readiness || {};
  const gov = r.government_support || {};
  const margin = r.margin_analysis || {};

  const stageScores = {
    market: score(r.market_fit),
    regulatory: score(r.regulatory),
    price: score(r.price_competitiveness),
    logistics: score(r.logistics_score) || score(readiness.logistics),
    buyer: Math.round((score(r.market_fit) + score(r.brand_power || 50)) / 2),
    contract: score(readiness.documentation) || 50,
    customs: Math.round((score(r.regulatory) + score(readiness.logistics || 50)) / 2),
    postExport: 40,
  };

  const stages = [
    {
      stage: 1, id: "market_validation",
      title: t("시장 검증", "Market Validation"), icon: "🎯",
      status: status(stageScores.market),
      readiness_score: stageScores.market,
      summary: r.summary || "",
      key_findings: markets.slice(0, 3).map((m: any) => ({
        type: parseFloat(String(m.grow)) > 5 ? "positive" : "neutral",
        text: `${m.name}: ${t("시장규모", "Market size")} ${m.size}, ${t("성장률", "Growth")} ${m.grow}`,
      })),
      data_points: {
        target_markets: (r.recommended_markets || []).slice(0, 5),
        market_details: markets.slice(0, 3).map((m: any) => ({
          name: m.name, size: m.size, growth: m.grow, channel: m.key_channel || "",
        })),
        industry_trend: r.industry_trend || "",
      },
      action_items: (actions[0]?.items || []).slice(0, 3).map((item: string) => ({
        priority: "important", action: item,
      })),
      next_stage_gate: t("타겟 시장 최소 1개 확정", "At least 1 target market confirmed"),
    },
    {
      stage: 2, id: "regulatory_certification",
      title: t("규제/인증", "Regulatory & Certification"), icon: "📜",
      status: status(stageScores.regulatory),
      readiness_score: stageScores.regulatory,
      summary: r.score_details?.regulatory_reason || "",
      key_findings: certs.slice(0, 3).map((c: any) => ({
        type: c.priority === "Required" || c.priority === "필수" ? "negative" : "neutral",
        text: `${c.name} (${c.market}): ${c.duration}, ${c.cost}`,
      })),
      data_points: {
        required_certs: r.required_certs || [],
        existing_certs: r.existing_certs || [],
        cert_details: certs,
        cert_gap_count: Math.max(0, (r.required_certs?.length || 0) - (r.existing_certs?.length || 0)),
      },
      action_items: certs.slice(0, 3).map((c: any) => ({
        priority: c.priority === "Required" || c.priority === "필수" ? "critical" : "important",
        action: `${c.name}: ${c.note || ""}`,
        estimated_cost: c.cost, estimated_time: c.duration,
      })),
      next_stage_gate: t("필수 인증 신청 완료", "Required certifications applied for"),
    },
    {
      stage: 3, id: "price_competitiveness",
      title: t("가격 경쟁력", "Price Competitiveness"), icon: "💰",
      status: status(stageScores.price),
      readiness_score: stageScores.price,
      summary: r.score_details?.price_reason || pricing.strategy || "",
      key_findings: [
        { type: "neutral", text: `FOB: ${margin.fob_cost || pricing.recommended_fob || "N/A"}` },
        { type: "neutral", text: `${t("소매가", "Retail")}: ${margin.retail_price || pricing.recommended_retail || "N/A"}` },
        { type: stageScores.price >= 60 ? "positive" : "negative",
          text: `${t("마진", "Margin")}: ${margin.gross_margin || "N/A"}` },
      ].filter(f => !f.text.includes("N/A")),
      data_points: {
        margin_chain: margin,
        fta_savings: r.duty_savings_estimate || {},
        competitor_price_range: comp.price_range || "",
        our_positioning: comp.our_positioning || "",
      },
      action_items: [],
      next_stage_gate: t("FOB 가격 확정, 마진 목표 달성 가능 확인", "FOB pricing confirmed, margin target achievable"),
    },
    {
      stage: 4, id: "logistics_shipping",
      title: t("물류/운송", "Logistics & Shipping"), icon: "🚢",
      status: status(stageScores.logistics),
      readiness_score: stageScores.logistics,
      summary: r.score_details?.logistics_reason || "",
      key_findings: [
        logistics.method ? { type: "neutral", text: `${t("운송방법", "Method")}: ${logistics.method}` } : null,
        logistics.cost_per_unit ? { type: "neutral", text: `${t("단가 운임", "Cost/unit")}: ${logistics.cost_per_unit}` } : null,
        logistics.lead_time ? { type: "neutral", text: `${t("리드타임", "Lead time")}: ${logistics.lead_time}` } : null,
      ].filter(Boolean),
      data_points: {
        logistics,
        hs_code: r.hs_code, hs_description: r.hs_description,
        tariff_table: fta.slice(0, 5),
      },
      action_items: [],
      next_stage_gate: t("물류 파트너 선정, 비용 확정", "Logistics partner identified, costs confirmed"),
    },
    {
      stage: 5, id: "buyer_discovery",
      title: t("바이어 발굴", "Buyer Discovery"), icon: "🔍",
      status: status(stageScores.buyer),
      readiness_score: stageScores.buyer,
      summary: comp.overview || "",
      key_findings: [
        ...(comp.global_competitors || []).slice(0, 2).map((c: any) => ({
          type: "neutral", text: `${t("글로벌 경쟁사", "Global")}: ${c.name} (${c.price})`,
        })),
        r.alibaba_suitability?.score ? {
          type: r.alibaba_suitability.score >= 60 ? "positive" : "neutral",
          text: `${t("알리바바 적합도", "Alibaba fit")}: ${r.alibaba_suitability.score}/100 (${r.alibaba_suitability.grade})`,
        } : null,
      ].filter(Boolean),
      data_points: {
        recommended_channels: r.recommended_channels || [],
        alibaba_suitability: r.alibaba_suitability || {},
        swot: comp.swot || {},
      },
      action_items: (actions[1]?.items || []).slice(0, 3).map((item: string) => ({
        priority: "important", action: item,
      })),
      next_stage_gate: t("바이어 리드 최소 3건 확보", "At least 3 qualified buyer leads"),
    },
    {
      stage: 6, id: "contract_payment",
      title: t("계약/결제", "Contracts & Payment"), icon: "📝",
      status: status(stageScores.contract),
      readiness_score: stageScores.contract,
      summary: t(
        "수출 계약서, 결제조건, 무역서류를 준비해야 합니다.",
        "Export contracts, payment terms, and trade documents need to be prepared."
      ),
      key_findings: [
        { type: "neutral", text: `Incoterms: ${logistics.incoterms || "FOB"}` },
      ],
      data_points: {
        recommended_incoterms: logistics.incoterms || "FOB",
        required_documents: ["Proforma Invoice", "Commercial Invoice", "Packing List", "Bill of Lading", "Certificate of Origin"],
      },
      action_items: [],
      next_stage_gate: t("계약서 템플릿 준비, 결제조건 합의", "Contract template ready, payment terms agreed"),
    },
    {
      stage: 7, id: "customs_clearance",
      title: t("통관/선적", "Customs & Clearance"), icon: "🏛️",
      status: status(stageScores.customs),
      readiness_score: stageScores.customs,
      summary: t(
        `HS코드 ${r.hs_code || "미정"}으로 수출신고 진행. 원산지증명서 발급 필요.`,
        `Export declaration with HS code ${r.hs_code || "TBD"}. Certificate of Origin required.`
      ),
      key_findings: [
        r.hs_code ? { type: "neutral", text: `HS: ${r.hs_code} — ${r.hs_description?.substring(0, 80) || ""}` } : null,
      ].filter(Boolean),
      data_points: {
        hs_code: r.hs_code, hs_code_detail: r.hs_code_detail || {},
        fta_tariff_table: fta,
      },
      action_items: [],
      next_stage_gate: t("통관 서류 전체 준비 완료", "All clearance documents prepared"),
    },
    {
      stage: 8, id: "post_export",
      title: t("사후관리", "Post-Export Management"), icon: "🔄",
      status: status(stageScores.postExport),
      readiness_score: stageScores.postExport,
      summary: t(
        "수출 후 클레임 대응, 재주문 관리, 현지 CS 체계를 구축해야 합니다.",
        "Post-export claim handling, reorder management, and local CS systems need to be established."
      ),
      key_findings: [],
      data_points: {},
      action_items: (actions[2]?.items || actions[1]?.items || []).slice(0, 2).map((item: string) => ({
        priority: "nice_to_have", action: item,
      })),
      next_stage_gate: t("CS 프로세스 및 재주문 파이프라인 구축", "CS process and reorder pipeline established"),
    },
  ];

  const overallScore = Math.round(
    Object.values(stageScores).reduce((a, b) => a + b, 0) / Object.keys(stageScores).length
  );
  const blockers = stages.filter(s => s.status === "blocked").map(s => `${s.icon} ${s.title}`);
  const quickWins = stages.filter(s => s.status === "ready").map(s => `${s.icon} ${s.title}`);

  // Estimate total cost from cert costs + logistics setup
  const certCosts = certs.reduce((sum: number, c: any) => {
    const m = String(c.cost || "").match(/[\d,]+/);
    return sum + (m ? parseInt(m[0].replace(/,/g, "")) : 0);
  }, 0);

  return {
    version: "1.0",
    current_stage_recommendation: stages.findIndex(s => s.status !== "ready") + 1 || 1,
    stages,
    overall_journey_score: overallScore,
    critical_blockers: blockers.slice(0, 3),
    quick_wins: quickWins.slice(0, 3),
    estimated_total_cost: certCosts > 0 ? `$${(certCosts).toLocaleString()}~$${(certCosts * 1.5).toLocaleString()}` : t("분석 데이터 기반 추정 필요", "Estimation needed based on analysis data"),
    estimated_timeline: t("6~12개월 (인증 포함)", "6-12 months (including certifications)"),
  };
}

const CRAWL_TIMEOUT_MS = 5000; // 5s — faster cutoff, most pages load in 2-3s
const MAX_CRAWL_TEXT_LENGTH = 12000;
const MAX_IMAGE_BASE64_BYTES = 4 * 1024 * 1024; // 4MB limit for vision input
const AI_CALL_TIMEOUT_MS = 65000; // 65s per AI call — cosmetics/complex categories need more time
const AI_CALL_RETRY_DELAY_MS = 2000; // 2s delay before retry
const WALL_CLOCK_LIMIT_MS = 140000; // 140s — hard cutoff with 10s buffer before Supabase 150s

function makeBrowserHeaders(url?: string): Record<string, string> {
  // Detect likely language from URL domain to get native-language content
  let acceptLang = "en-US,en;q=0.9,ko-KR;q=0.8,ko;q=0.7";
  if (url) {
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      if (hostname.endsWith(".kr") || hostname.includes("naver") || hostname.includes("coupang"))
        acceptLang = "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7";
      else if (hostname.endsWith(".jp") || hostname.includes("rakuten") || hostname.includes("yahoo.co.jp"))
        acceptLang = "ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7";
      else if (hostname.endsWith(".cn") || hostname.includes("taobao") || hostname.includes("tmall") || hostname.includes("jd.com"))
        acceptLang = "zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7";
      else if (hostname.endsWith(".de")) acceptLang = "de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7";
      else if (hostname.endsWith(".fr")) acceptLang = "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7";
      else if (hostname.endsWith(".es")) acceptLang = "es-ES,es;q=0.9,en-US;q=0.8,en;q=0.7";
      else if (hostname.endsWith(".it")) acceptLang = "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7";
      else if (hostname.endsWith(".vn")) acceptLang = "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7";
      else if (hostname.endsWith(".th")) acceptLang = "th-TH,th;q=0.9,en-US;q=0.8,en;q=0.7";
    } catch {}
  }
  return {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept":
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": acceptLang,
    "Accept-Encoding": "gzip, deflate",
    "Cache-Control": "no-cache",
  };
}

interface CrawlResult {
  url: string;
  success: boolean;
  title?: string;
  text?: string;
  image?: string;
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
      headers: makeBrowserHeaders(url),
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
      "[class*='detail']", "[class*='description']", "[class*='spec']",
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
      if (extractedText.length > 6000) break;
    }

    // Extract tables (spec sheets, pricing tables, cert info)
    let tableText = "";
    doc.querySelectorAll("table").forEach((tbl: any) => {
      if (tableText.length > 3000) return;
      const rows: string[] = [];
      tbl.querySelectorAll("tr").forEach((tr: any) => {
        const cells: string[] = [];
        tr.querySelectorAll("th, td").forEach((td: any) => {
          cells.push(td.textContent?.trim() || "");
        });
        if (cells.some((c) => c.length > 0)) rows.push(cells.join(" | "));
      });
      if (rows.length > 1) tableText += "\n[Table] " + rows.join(" / ") + "\n";
    });

    // Extract structured data (JSON-LD)
    let structuredData = "";
    doc.querySelectorAll('script[type="application/ld+json"]').forEach((s: any) => {
      try {
        const ld = JSON.parse(s.textContent || "");
        if (ld["@type"] === "Product" || ld["@type"] === "IndividualProduct") {
          if (ld.name) structuredData += `LD-제품명: ${ld.name}\n`;
          if (ld.description) structuredData += `LD-설명: ${String(ld.description).substring(0, 500)}\n`;
          if (ld.offers?.price) structuredData += `LD-가격: ${ld.offers.priceCurrency || ""} ${ld.offers.price}\n`;
          if (ld.brand?.name) structuredData += `LD-브랜드: ${ld.brand.name}\n`;
          if (ld.weight) structuredData += `LD-무게: ${ld.weight}\n`;
          if (ld.image) structuredData += `LD-이미지: ${Array.isArray(ld.image) ? ld.image[0] : ld.image}\n`;
        }
      } catch {}
    });

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

    // Find detail/more links for deeper crawling
    const detailLinks: string[] = [];
    const linkPatterns = /상세|detail|more|spec|설명|보기|view|info/i;
    doc.querySelectorAll("a[href]").forEach((a: any) => {
      const href = a.getAttribute("href") || "";
      const text = a.textContent?.trim() || "";
      if ((linkPatterns.test(text) || linkPatterns.test(href)) && href.length > 1) {
        try {
          const fullUrl = new URL(href, url).href;
          if (isSafeUrl(fullUrl) && !detailLinks.includes(fullUrl) && fullUrl !== url) {
            detailLinks.push(fullUrl);
          }
        } catch {}
      }
    });

    const finalText = (structuredData + metaInfo + extractedText + tableText).slice(0, MAX_CRAWL_TEXT_LENGTH);

    return {
      url, success: true, title, text: finalText, image: ogImage || undefined,
      _detailLinks: detailLinks.slice(0, 2), // pass up to 2 detail links for deeper crawl
    } as any;
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
  }).slice(0, 3); // Max 3 URLs

  // Phase 1: Crawl main URLs
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
      crawledText += `\n--- 크롤링 성공: ${cr.url} ---\n`;
      if (cr.title) crawledText += `페이지 제목: ${cr.title}\n`;
      crawledText += cr.text + "\n";
    } else {
      crawledText += `\n--- 크롤링 실패: ${cr.url} (${cr.error}) ---\n`;
    }
  }

  return { crawledText: crawledText.slice(0, 18000), crawlResults };
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
    const sbServiceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sbAdmin = createClient(sbUrl, sbServiceRole);

    // Extract and validate user from JWT
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userErr } = await sbAdmin.auth.getUser(token);
    if (!user || userErr) {
      return new Response(
        JSON.stringify({ ok: false, error: "Unauthorized" }),
        { status: 401, headers },
      );
    }

    // Create user-scoped client for RLS operations
    const sbAnon = Deno.env.get("CUSTOM_ANON_KEY") || Deno.env.get("SUPABASE_ANON_KEY")!;
    const sb = createClient(sbUrl, sbAnon, {
      global: { headers: { Authorization: authHeader } },
    });

    // ─── Plan enforcement: check user's plan and usage limits ───
    const PLAN_LIMITS: Record<string, number> = {
      free: 1,
      starter: 20,
      pro: 50,
      professional: 50,
      enterprise: -1, // unlimited
      alibaba: -1,    // unlimited
    };

    const { data: userData } = await sbAdmin
      .from("users")
      .select("plan, analysis_credits")
      .eq("id", user.id)
      .single();

    const userPlan = userData?.plan || "free";
    const singleCredits = userData?.analysis_credits || 0;
    const monthlyLimit = PLAN_LIMITS[userPlan] ?? 1;

    // Count this month's analyses (skip for unlimited plans)
    if (monthlyLimit !== -1) {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count: monthlyUsage } = await sbAdmin
        .from("analyses")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", startOfMonth.toISOString());

      const used = monthlyUsage || 0;

      if (used >= monthlyLimit && singleCredits <= 0) {
        const isKo = req.headers.get("accept-language")?.includes("ko");
        return new Response(
          JSON.stringify({
            ok: false,
            error: isKo
              ? `월간 분석 한도(${monthlyLimit}회)를 초과했습니다. 플랜을 업그레이드하거나 단건 분석을 구매해주세요.`
              : `Monthly analysis limit (${monthlyLimit}) exceeded. Please upgrade your plan or purchase a single analysis.`,
            code: "PLAN_LIMIT_EXCEEDED",
            limit: monthlyLimit,
            used,
          }),
          { status: 403, headers },
        );
      }

      // Deduct single analysis credit atomically if over monthly limit
      if (used >= monthlyLimit && singleCredits > 0) {
        const { data: remaining, error: rpcErr } = await sbAdmin.rpc("deduct_analysis_credit", { p_user_id: user.id });
        if (rpcErr || remaining === -1) {
          return new Response(
            JSON.stringify({ ok: false, error: "No credits available", code: "PLAN_LIMIT_EXCEEDED", limit: monthlyLimit, used }),
            { status: 403, headers },
          );
        }
        console.log(`[plan] User ${user.id} used single credit (${remaining} remaining)`);
      }
    }
    // ─── End plan enforcement ───

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
      origin_country = "",
      language: _rawLang = "ko",
      image_base64 = "",
      image_type = "image/jpeg",
    } = body;

    // Resolve language: accept both 'language' and 'lang', support all 13+ languages
    const language = resolveLang(body);
    const isKo = language === "ko";
    // For prompt structure: Korean prompts for ko, English prompts for all others
    const isEn = language !== "ko";
    // For non-ko/non-en languages, use English prompt structure + language override
    const langOverride = (language !== "ko" && language !== "en") ? `\n\n**CRITICAL LANGUAGE REQUIREMENT: You MUST write your ENTIRE response in ${LANG_NAMES[language] || "English"}. All text fields, descriptions, reasons, notes, and advice must be in ${LANG_NAMES[language] || "English"}. Only keep technical terms (HS codes, FTA names, certification names) in their original form. This is a paid service for a ${LANG_NAMES[language] || "English"}-speaking manufacturer.**` : "";

    // Resolve origin country: explicit > auto-detect from URL > default KR
    let resolvedOrigin = origin_country || "";
    if (!resolvedOrigin && urls.length > 0) {
      const firstUrl = urls.find((u: string) => u && u.trim());
      if (firstUrl) {
        try {
          const hostname = new URL(firstUrl).hostname.toLowerCase();
          if (hostname.endsWith(".jp") || hostname.includes("rakuten") || hostname.includes("yahoo.co.jp")) resolvedOrigin = "JP";
          else if (hostname.endsWith(".cn") || hostname.includes("taobao") || hostname.includes("tmall") || hostname.includes("1688.com")) resolvedOrigin = "CN";
          else if (hostname.endsWith(".de")) resolvedOrigin = "DE";
          else if (hostname.endsWith(".fr")) resolvedOrigin = "FR";
          else if (hostname.endsWith(".uk") || hostname.endsWith(".co.uk")) resolvedOrigin = "GB";
          else if (hostname.includes("amazon.com") || hostname.endsWith(".us")) resolvedOrigin = "US";
          else if (hostname.includes("amazon.co.jp")) resolvedOrigin = "JP";
          else if (hostname.includes("amazon.de")) resolvedOrigin = "DE";
          else if (hostname.includes("amazon.co.uk")) resolvedOrigin = "GB";
          else if (hostname.includes("alibaba.com") || hostname.includes("aliexpress")) resolvedOrigin = "CN";
          else if (hostname.endsWith(".vn")) resolvedOrigin = "VN";
          else if (hostname.endsWith(".th")) resolvedOrigin = "TH";
          else if (hostname.endsWith(".in") || hostname.includes("flipkart")) resolvedOrigin = "IN";
          else if (hostname.endsWith(".kr") || hostname.includes("naver") || hostname.includes("coupang")) resolvedOrigin = "KR";
        } catch {}
      }
    }
    if (!resolvedOrigin) resolvedOrigin = "KR"; // default for Korean platform users

    const ORIGIN_NAMES: Record<string, { ko: string; en: string }> = {
      KR: { ko: "한국", en: "South Korea" },
      US: { ko: "미국", en: "United States" },
      JP: { ko: "일본", en: "Japan" },
      CN: { ko: "중국", en: "China" },
      DE: { ko: "독일", en: "Germany" },
      FR: { ko: "프랑스", en: "France" },
      GB: { ko: "영국", en: "United Kingdom" },
      VN: { ko: "베트남", en: "Vietnam" },
      TH: { ko: "태국", en: "Thailand" },
      IN: { ko: "인도", en: "India" },
      TW: { ko: "대만", en: "Taiwan" },
      IT: { ko: "이탈리아", en: "Italy" },
      AU: { ko: "호주", en: "Australia" },
      CA: { ko: "캐나다", en: "Canada" },
      BR: { ko: "브라질", en: "Brazil" },
      MX: { ko: "멕시코", en: "Mexico" },
      ID: { ko: "인도네시아", en: "Indonesia" },
      MY: { ko: "말레이시아", en: "Malaysia" },
      SG: { ko: "싱가포르", en: "Singapore" },
      PH: { ko: "필리핀", en: "Philippines" },
    };
    const originLabel = ORIGIN_NAMES[resolvedOrigin]?.[isKo ? "ko" : "en"] || resolvedOrigin;
    const isKoreaOrigin = resolvedOrigin === "KR";

    // Validate image if provided
    let validatedImageBase64 = "";
    let validatedImageType = image_type || "image/jpeg";
    const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

    if (image_base64) {
      const imageBytes = Math.ceil(image_base64.length * 3 / 4);
      if (imageBytes > MAX_IMAGE_BASE64_BYTES) {
        console.warn(`[vision] Image too large: ${(imageBytes / 1024 / 1024).toFixed(1)}MB, max 4MB`);
      } else if (!ALLOWED_IMAGE_TYPES.includes(validatedImageType)) {
        console.warn(`[vision] Unsupported image type: ${validatedImageType}`);
      } else {
        validatedImageBase64 = image_base64;
        console.log(`[vision] Image accepted: ${validatedImageType}, ${(imageBytes / 1024).toFixed(0)}KB`);
      }
    }

    if (!analysis_id || !product_name) {
      return new Response(
        JSON.stringify({ ok: false, error: "analysis_id and product_name are required" }),
        { status: 400, headers },
      );
    }

    const marketNamesKo: Record<string, string> = {
      US: "미국", JP: "일본", CN: "중국", EU: "유럽(독일 기준)",
      SEA: "동남아(베트남 기준)", ME: "중동(UAE 기준)", AU: "호주",
      LATAM: "남미(브라질 기준)", IN: "인도", GB: "영국", CA: "캐나다",
    };
    const marketNamesEn: Record<string, string> = {
      US: "United States", JP: "Japan", CN: "China", EU: "Europe (Germany)",
      SEA: "Southeast Asia (Vietnam)", ME: "Middle East (UAE)", AU: "Australia",
      LATAM: "Latin America (Brazil)", IN: "India", GB: "United Kingdom", CA: "Canada",
    };
    const marketNames = isKo ? marketNamesKo : marketNamesEn;

    // Sanctions screening for target markets
    const SANCTIONED_MARKETS = ["KP", "IR", "SY", "CU", "SS", "AF", "CF", "CD", "LY", "SO", "YE", "ZW", "NI"];
    const HIGH_RISK_MARKETS = ["RU", "BY", "VE", "MM", "SD"];
    const sanctionedTargets = target_markets.filter((m: string) => SANCTIONED_MARKETS.includes(m.toUpperCase()));
    if (sanctionedTargets.length > 0) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: `Target market(s) ${sanctionedTargets.join(", ")} are under comprehensive international sanctions. Export analysis cannot proceed.`,
          sanctioned: true,
        }),
        { status: 403, headers },
      );
    }
    const highRiskTargets = target_markets.filter((m: string) => HIGH_RISK_MARKETS.includes(m.toUpperCase()));

    const marketList = target_markets
      .map((m: string) => marketNames[m] || m)
      .join(", ");

    // Crawl URLs for product data extraction (skip if only image provided)
    const hasUrls = urls.filter((u: string) => u && u.trim()).length > 0;
    const { crawledText, crawlResults } = hasUrls
      ? await crawlUrls(urls)
      : { crawledText: "", crawlResults: [] as CrawlResult[] };

    if (hasUrls) {
      console.log(
        "[crawl] results:",
        crawlResults.map((r) => `${r.url}: ${r.success ? "OK" : r.error}`),
      );
    } else if (validatedImageBase64) {
      console.log("[vision] No URLs provided, using image-only analysis");
    }

    // Progressive update: crawl phase complete
    const crawlMeta = crawlResults.map((cr) => ({
      url: cr.url,
      success: cr.success,
      title: cr.title || "",
      image: cr.image || "",
      error: cr.error || "",
    }));
    await sbAdmin
      .from("analyses")
      .update({
        ai_result: {
          _progress: "crawl_done",
          _progress_pct: 15,
          crawl_results: crawlMeta,
        },
      })
      .eq("id", analysis_id)
      .eq("user_id", user.id);

    // ─── Parallel 3-Call Architecture ───
    // Call 1: Scores + HS Code + FTA (~25s)
    // Call 2: Market + Competition + Certification (~25s)
    // Call 3: Pricing + Action Plan + Summary (~20s)
    // All run in parallel → total ~30s instead of 120s+

    // isEn already defined at top level
    const na = isEn ? "N/A" : "미입력";
    const none = isEn ? "None" : "없음";

    const productContext = isEn
      ? `Product: ${product_name}
English Name: ${product_name_en || na}
Origin Country: ${originLabel} (${resolvedOrigin})
Category: ${category || na}
FOB Price: ${fob_price || na}
MOQ: ${moq || na}
Brand: ${brand_name || na}
Manufacturer: ${manufacturer || na}
Export Experience: ${export_experience || na}
Annual Capacity: ${annual_capacity || na}
Weight: ${weight_kg || na} kg
Selling Points: ${selling_points.filter(Boolean).join(", ") || na}
Existing Certs: ${existing_certs.join(", ") || none}
Known HS Code: ${known_hs_code || na}
Description: ${description || na}
Target Markets: ${marketList}`
      : `제품명: ${product_name}
영문명: ${product_name_en || na}
원산지: ${originLabel} (${resolvedOrigin})
카테고리: ${category || "미지정"}
FOB가격: ${fob_price || na}
MOQ: ${moq || na}
브랜드: ${brand_name || na}
제조사: ${manufacturer || na}
수출경험: ${export_experience || na}
연간생산능력: ${annual_capacity || na}
중량: ${weight_kg || na} kg
셀링포인트: ${selling_points.filter(Boolean).join(", ") || na}
보유인증: ${existing_certs.join(", ") || none}
알려진 HS코드: ${known_hs_code || na}
설명: ${description || na}
타겟시장: ${marketList}`;

    const crawlCtx = crawledText ? (isEn
      ? `\n## Crawled Product Data\n${crawledText}`
      : `\n## 크롤링 제품 데이터\n${crawledText}`) : "";
    // Multi-language context injected into all prompts
    const langCtx = langOverride;

    // Vision context: inform AI that a product image is attached
    const visionCtx = validatedImageBase64 ? (isEn
      ? `\n## Product Image Attached\nA product image has been provided above. Use visual analysis to identify: product name, category, materials, estimated weight, key features, packaging details, and potential HS code hints. Combine visual observations with the text data below for the most accurate analysis.`
      : `\n## 제품 이미지 첨부됨\n위에 제품 이미지가 첨부되어 있습니다. 시각 분석을 통해 제품명, 카테고리, 소재, 예상 중량, 핵심 특징, 포장 상세, HS코드 힌트를 파악하세요. 시각 분석 결과와 아래 텍스트 데이터를 결합하여 가장 정확한 분석을 제공하세요.`) : "";

    // Prepare vision image data for Panel 1
    const visionImage: VisionImage | undefined = validatedImageBase64
      ? { base64: validatedImageBase64, mediaType: validatedImageType }
      : undefined;

    const hrWarning = highRiskTargets.length > 0
      ? `\n⚠️ HIGH-RISK: ${highRiskTargets.join(", ")} — include sanctions/ECCN/EAR warnings.\n` : "";

    const toneRule = isEn
      ? `TONE: Warm consulting tone. Example: "You don't have FDA yet, but positioning as a wellness device is a smart workaround." Never telegraphic. 2-4 complete sentences per field.`
      : `톤: 친절한 존댓말 컨설팅 톤. 예: "현재 FDA가 아직 없으시기 때문에 의료기기 판매는 어렵지만, 웰니스 기기로 포지셔닝하시면 충분히 가능합니다." 딱딱한 보고서체 금지. 필드당 2~4문장.`;

    const sysMsg = isEn
      ? "You are an export intelligence engine. Output ONLY valid JSON. No markdown. Start with { end with }."
      : "수출 인텔리전스 엔진. JSON만 출력. 마크다운 금지. {로 시작 }로 끝내세요.";

    // Helper: non-streaming AI call with timeout + retry
    // Strategy: Haiku PRIMARY (fast 10-15s, reliable) → retry once on failure
    // Haiku produces excellent structured JSON. Speed = reliability.
    // Optional imageData param enables Claude Vision for image-based analysis
    interface VisionImage {
      base64: string;
      mediaType: string;
    }

    async function callAI(
      prompt: string,
      maxTokens: number,
      imageData?: VisionImage,
      wallClockStart?: number,
    ): Promise<{ result: any; model: string }> {
      const MODEL = "claude-haiku-4-5-20251001";

      // Build message content: image block + text block when vision is used
      const userContent: any[] = [];
      if (imageData) {
        userContent.push({
          type: "image",
          source: {
            type: "base64",
            media_type: imageData.mediaType,
            data: imageData.base64,
          },
        });
      }
      userContent.push({ type: "text", text: prompt });

      const doCall = async (attempt: number): Promise<{ result: any; model: string }> => {
        // Wall clock guard: abort if nearing 150s limit
        if (wallClockStart && (Date.now() - wallClockStart) > WALL_CLOCK_LIMIT_MS) {
          throw new Error("WALL_CLOCK_EXCEEDED");
        }

        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), AI_CALL_TIMEOUT_MS);
        try {
          console.log(`[AI] Attempt ${attempt}, model: ${MODEL}, maxTokens: ${maxTokens}${imageData ? ", +vision" : ""}, elapsed: ${wallClockStart ? Date.now() - wallClockStart : 0}ms`);
          const resp = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": anthropicKey,
              "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
              model: MODEL,
              max_tokens: maxTokens,
              system: sysMsg,
              messages: [{ role: "user", content: userContent }],
            }),
            signal: ctrl.signal,
          });
          clearTimeout(timer);
          if (!resp.ok) {
            const errBody = await resp.text().catch(() => "");
            throw new Error(`API ${resp.status}: ${errBody.substring(0, 200)}`);
          }
          const data = await resp.json();
          const text = data.content?.[0]?.text || "";
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (!jsonMatch) throw new Error("No JSON in response: " + text.substring(0, 100));
          let jsonStr = jsonMatch[0];
          try {
            return { result: JSON.parse(jsonStr), model: MODEL };
          } catch (parseErr) {
            // Attempt JSON repair for common AI output issues
            console.warn(`[AI] JSON parse failed, attempting repair: ${(parseErr as Error).message.substring(0, 80)}`);
            jsonStr = repairJSON(jsonStr);
            return { result: JSON.parse(jsonStr), model: MODEL + "-repaired" };
          }
        } catch (err) {
          clearTimeout(timer);
          throw err;
        }
      };

      // Attempt 1
      try {
        return await doCall(1);
      } catch (firstErr) {
        const errMsg = (firstErr as Error).message || "";
        // Don't retry if wall clock exceeded
        if (errMsg === "WALL_CLOCK_EXCEEDED") throw firstErr;
        // Don't retry if we don't have enough time for another attempt
        if (wallClockStart && (Date.now() - wallClockStart) > (WALL_CLOCK_LIMIT_MS - AI_CALL_TIMEOUT_MS)) {
          console.warn(`[AI] No time for retry, elapsed: ${Date.now() - (wallClockStart || 0)}ms`);
          throw firstErr;
        }
        // Retry once after delay
        console.warn(`[AI] Attempt 1 failed (${errMsg}), retrying in ${AI_CALL_RETRY_DELAY_MS}ms...`);
        await new Promise((r) => setTimeout(r, AI_CALL_RETRY_DELAY_MS));
        return await doCall(2);
      }
    }

    // ─── PHASE 1: Quick HS + Scores (show result in 5-10s) ───
    console.log("[phase1] Starting quick analysis...");
    const phase1Start = Date.now();

    const phase1Prompt = `${isEn ? "# Quick Export Assessment" : "# 빠른 수출 평가"}
${productContext}
${visionCtx}
${crawlCtx}
${isEn ? "Output ONLY this JSON — no explanation:" : "이 JSON만 출력 — 설명 금지:"}
{
  "overall_score": 0~100,
  "market_fit": 0~100,
  "competition": 0~100,
  "regulatory": 0~100,
  "price_competitiveness": 0~100,
  "hs_code": "XXXX.XX",
  "hs_description": "${isEn ? "1 sentence" : "1문장"}",
  "summary": "${isEn ? "2 sentences with key export insight" : "2문장, 핵심 수출 인사이트"}"
}
${isEn ? "Rules: Be specific. Real HS code with 6-digit precision. Conservative scoring." : "규칙: 구체적. 6자리 HS코드. 보수적 채점."}${langOverride}`;

    try {
      const phase1Res = await callAI(phase1Prompt, 800, visionImage, phase1Start);
      console.log("[phase1] Done in", Date.now() - phase1Start, "ms");
      // Save Phase 1 result immediately — frontend can display this
      sbAdmin.from("analyses").update({
        ai_result: {
          ...phase1Res.result,
          _progress: "phase1_done",
          _progress_pct: 25,
          _phase: 1,
          crawl_results: crawlMeta,
        },
      }).eq("id", analysis_id).eq("user_id", user.id).then(() => {}).catch(() => {});
    } catch (p1err) {
      console.warn("[phase1] Failed:", (p1err as Error).message, "— continuing to full analysis");
      // Phase 1 failure is non-blocking
      sbAdmin.from("analyses").update({
        ai_result: {
          _progress: "ai_parallel_started",
          _progress_pct: 20,
          crawl_results: crawlMeta,
        },
      }).eq("id", analysis_id).eq("user_id", user.id).then(() => {}).catch(() => {});
    }

    // ─── Category-specific certification reference data ───
    const CERT_REFERENCE: Record<string, string> = {
      cosmetics: "US: FDA registration+NDC, EU: CPNP notification+EU Cosmetics Regulation (EC 1223/2009), JP: PMDA notification+drug/quasi-drug classification, CN: NMPA registration, KR: MFDS notification. Labs: KTR, KCL, KOTITI.",
      food: "US: FDA FCE/SID+FSMA compliance, EU: EFSA novel food+health claims, JP: MHLW import notification+JAS, CN: GACC registration, Halal (MUI/JAKIM), Kosher. Labs: KFRI, KAT, KOTITI.",
      electronics: "US: FCC Part 15, EU: CE (RED/LVD/EMC), JP: PSE+TELEC, CN: CCC, KR: KC. Safety: IEC 62368-1, EMC: CISPR 32. Labs: KTL, KTC, TTA.",
      medical_devices: "US: FDA 510(k)/PMA+establishment registration, EU: CE MDR 2017/745+notified body, JP: PMDA Shonin, CN: NMPA. ISO 13485 mandatory. Labs: KTL, MFDS designated labs.",
      chemicals: "US: EPA TSCA, EU: REACH+CLP, JP: CSCL, CN: MEE/IECSC. GHS classification, MSDS mandatory. Labs: KTR, KIST, KRICT.",
      textiles: "US: CPSIA (children's)+CA Prop 65+AATCC standards, EU: REACH Annex XVII+OEKO-TEX, JP: JIS. Fiber content labeling, flammability testing. Labs: FITI, KATRI, KOTITI.",
      machinery: "US: OSHA/ANSI, EU: CE Machinery Directive 2006/42/EC, JP: Industrial Safety Act. ISO 12100 risk assessment. Labs: KTL, KGS.",
      general: "Basic: Certificate of Origin, Phytosanitary (if applicable), Free Sale Certificate. Check destination country specific import requirements.",
    };

    let certRef = CERT_REFERENCE[category?.toLowerCase()] || CERT_REFERENCE["general"];
    // For non-Korean origins, append a note to use origin-country labs instead
    if (!isKoreaOrigin) {
      certRef += ` Note: The product originates from ${originLabel}. Recommend testing labs and certification agencies accessible in ${originLabel}, not Korean labs.`;
    }

    // ─── Scoring rubric for consistent, evidence-based scores ───
    const scoringRubric = isEn
      ? `SCORING RUBRIC (apply strictly):
90-100: Clear competitive advantage, proven demand, minimal barriers
70-89: Strong potential, some barriers manageable with preparation
50-69: Moderate opportunity, significant preparation or investment needed
30-49: Challenging, major barriers exist (regulatory, competition, logistics)
0-29: Not recommended without fundamental changes
Score CONSERVATIVELY when information is lacking. Do not inflate.`
      : `채점 루브릭 (엄격 적용):
90-100: 명확한 경쟁우위, 입증된 수요, 장벽 최소
70-89: 강한 잠재력, 준비로 극복 가능한 장벽
50-69: 중간 기회, 상당한 준비/투자 필요
30-49: 도전적, 주요 장벽 존재 (규제/경쟁/물류)
0-29: 근본적 변경 없이 비추천
정보 부족 시 보수적 채점. 점수 부풀리기 금지.`;

    // ─── PHASE 2: Full 3-Call Parallel Analysis ───
    // ─── CALL 1: Core (Scores + HS + FTA) — includes Vision when image provided ───
    const prompt1 = `${isEn ? "# Export Analysis — Core Scores & Trade Classification" : "# 수출 분석 — 핵심 점수 & 통관 분류"}

${productContext}
${visionCtx}
${crawlCtx}
${hrWarning}
${scoringRubric}
${toneRule}

${isEn ? "Analyze this product and output JSON:" : "이 제품을 분석하고 JSON으로 출력하세요:"}
{
  "overall_score": 0~100,
  "market_fit": 0~100,
  "competition": 0~100,
  "regulatory": 0~100,
  "price_competitiveness": 0~100,
  "brand_power": 0~100,
  "logistics_score": 0~100,
  "score_details": {
    "overall_reason": "2~4${isEn ? " sentences" : "문장"}",
    "market_fit_reason": "2~4${isEn ? " sentences" : "문장"}",
    "price_reason": "2~4${isEn ? " sentences" : "문장"}",
    "brand_reason": "2~4${isEn ? " sentences" : "문장"}",
    "competition_reason": "2~4${isEn ? " sentences" : "문장"}",
    "regulatory_reason": "2~4${isEn ? " sentences" : "문장"}",
    "logistics_reason": "2~4${isEn ? " sentences" : "문장"}"
  },
  "product_detail": {"actual_name": "", "image": "", "retail_price": ""},
  "estimated_fob": "$X.X~$X.X",
  "estimated_retail": {"US": "$XX~$XX"},
  "hs_code": "XXXX.XX",
  "hs_description": "2~4${isEn ? " sentences" : "문장"}",
  "hs_code_detail": {
    "hs2": "XX", "hs2_desc": "", "hs4": "XXXX", "hs4_desc": "",
    "hs6": "XXXX.XX", "hs6_desc": "", "hs10": "XXXX.XX.XXXX", "hs10_desc": "",
    "basis": "${isEn ? "GIR rule basis" : "통칙 분류 근거"}", "alts": []
  },
  "hs_alternatives": [],
  "fta_tariff_table": [{"mkt": "", "fta": "", "mfn": "", "pref": "", "save": "", "rule": "", "fta_name": ""}],
  "duty_savings_estimate": {"annual_volume": "", "fob_per_unit": "", "avg_mfn": "", "avg_fta": "", "estimated_annual_saving": ""},
  "summary": "3~4${isEn ? " sentences with key figures" : "문장, 핵심 수치 포함"}",
  "executive_summary": {"situation": "", "complication": "", "resolution": ""}
}
${isEn
  ? `Rules: Specific HS code with GIR basis. Real FTA rates between ${originLabel} and target markets (not just Korea FTAs). Conservative scoring when info lacking. The product origin is ${originLabel} — analyze FTAs applicable to ${originLabel} as the exporting country.`
  : `규칙: GIR 근거 포함한 HS코드. ${originLabel}에서 타겟시장으로의 실제 FTA 양허율 (한국 FTA만이 아닌, ${originLabel}이 체결한 FTA 기준). 정보 부족 시 보수적 채점. 존댓말 필수.`}`;

    // ─── CALL 2: Market & Competition & Certs ───
    const prompt2 = `${isEn ? "# Export Analysis — Market Intelligence & Certification" : "# 수출 분석 — 시장 인텔리���스 & 인증"}

${productContext}
${crawlCtx}
${toneRule}

${isEn ? "## Certification Reference (use as basis, verify and expand):" : "## 인증 참��� 데이터 (기반으로 활용, 검증 및 확장):"}
${certRef}

${isEn ? "Analyze markets, competition, and certifications. Output JSON:" : "시장, 경쟁환경, 인증을 분��하세요. JSON 출력:"}
{
  "required_certs": ["cert1"],
  "existing_certs": ${JSON.stringify(existing_certs)},
  "cert_details": [
    {
      "name": "", "market": "", "duration": "", "cost": "", "priority": "${isEn ? "Required/Recommended" : "필수/권장"}",
      "note": "${isEn ? '(1) agency+website, (2) required docs, (3) labs in ' + originLabel + ' that can test. 2-3 sentences.' : '(1) 인증기관+웹사이트, (2) 필요서류 목록, (3) ' + originLabel + ' 내 시험기관명. 2~3문장.'}"
    }
  ],
  "recommended_markets": ["US", "JP"],
  "market_analysis": [
    {"name": "", "size": "", "grow": "", "entry": "", "note": "2~4${isEn ? " sentences" : "문장"}", "gdp": "", "key_channel": "", "price_sensitivity": ""}
  ],
  "competitor_analysis": {
    "overview": "2~4${isEn ? " sentences" : "문장"}",
    "swot": {"strength": "", "weakness": "", "opportunity": "", "threat": ""},
    "global_competitors": [{"name": "${isEn ? "Real brand" : "실제 브랜드"}", "price": "", "note": ""}],
    "local_competitors": [{"name": "", "price": ""}],
    "price_range": "",
    "our_positioning": ""
  },
  "industry_trend": "3~4${isEn ? " sentences with figures" : "문장, 수치 포함"}",
  "recommended_channels": ["${isEn ? "Specific channel" : "구체적 채널명"}"],
  "opportunities": ["${isEn ? "With figures" : "수치 포함"}", "", ""],
  "risks": ["${isEn ? "With mitigation" : "대응방안 포함"}", "", ""]
}
${isEn
  ? `Rules:
★★★ ALL fields above are REQUIRED — do not omit any field. Every field must have meaningful content.
- Max 5 cert_details with ALL needed certs per target market. Use the certification reference above as starting point — add market-specific requirements. Include REAL agency names, websites, estimated costs (USD), and timeline. The product originates from ${originLabel} — recommend labs/agencies accessible from ${originLabel}.
- competitor_analysis: MUST include overview (2-4 sentences), SWOT (all 4 fields filled), at least 2 global competitors with real names and prices, and our_positioning.
- market_analysis: MUST include at least 1 target market with size, growth rate, entry barriers, key channels.
- industry_trend: MUST be 3-4 sentences with specific figures and growth rates.
- opportunities: MUST list 3 specific opportunities with figures.
- risks: MUST list 3 specific risks with mitigation strategies.
- Real competitor names with actual price points. Max 3 global, 2 local competitors. Market size in USD with source year.`
  : `규칙:
★★★ 위 모든 필드는 필수 — 어떤 필드도 생략하지 마세요. 모든 필드에 의미 있는 내용을 채우세요.
- cert_details 최대 5개, 타겟시장별 필요인증 전부 포함. 위 인증 참조 데이터를 기반으로 시장별 요구사항 추가. 실제 기관명, 웹사이트, 예상비용(USD), 소요기간 포함. 제품 원산지는 ${originLabel} — ${originLabel}에서 접근 가능한 시험기관/인증기관 추천.
- competitor_analysis: overview(2~4문장), SWOT(4개 필드 전부), 글로벌 경쟁사 최소 2개 실명+가격, our_positioning 필수.
- market_analysis: 타겟 시장 최소 1개, 시장규모/성장률/진입장벽/핵심채널 필수.
- industry_trend: 3~4문장, 구체적 수치와 성장률 필수.
- opportunities: 수치 포함 기회 3개 필수.
- risks: 대응방안 포함 리스크 3개 필수.
- 경쟁사 실명+실제 가격대. global 최대 3, local 최대 2. 시장규모 USD+출처연도. 존댓말 필수.`}`;

    // ─── CALL 3: Pricing & Action Plan ───
    const prompt3 = `${isEn ? "# Export Analysis — Pricing Strategy & Action Plan" : "# 수출 분석 — 가격 전략 & 실행 계획"}

${productContext}
${crawlCtx}
${toneRule}

${isEn ? "Analyze pricing strategy and create actionable export plan. Output JSON:" : "가격 전략 분석 및 실행 가능한 수출 계획을 작성하세요. JSON 출력:"}
{
  "pricing_strategy": {
    "recommended_fob": "$X.X",
    "recommended_retail": "$XX~$XX",
    "margin_structure": "${isEn ? "FOB→CIF→Wholesale→Retail" : "FOB→CIF→도매→소매"} margin",
    "strategy": "2~3${isEn ? " sentences" : "문장"}"
  },
  "action_plan": [
    {
      "phase": "${isEn ? "Phase 1 (1-3 months)" : "1단계 (1~3개월)"}",
      "title": "${isEn ? "Export Preparation" : "수출 준비"}",
      "items": ["${isEn ? "Specific action (agency/cost/timeline)" : "구체적 액션 (기관/비용/기간)"}"]
    },
    {
      "phase": "${isEn ? "Phase 2 (3-6 months)" : "2단계 (3~6개월)"}",
      "title": "${isEn ? "Market Entry" : "시장 진입"}",
      "items": [""]
    }
  ],
  "alibaba_suitability": {
    "score": 0~100,
    "grade": "${isEn ? "Recommended/Average/Not Recommended" : "추천/보통/비추천"}",
    "verdict": "",
    "reasons": ["", ""],
    "tips": ["", ""]
  },
  "margin_analysis": {
    "fob_cost": "$XX",
    "landed_cost": "$XX (${isEn ? "FOB + freight + insurance + duties" : "FOB + 운임 + 보험 + 관세"})",
    "wholesale_price": "$XX",
    "retail_price": "$XX",
    "gross_margin": "XX%"
  },
  "logistics": {
    "method": "${isEn ? "Air/Sea/Express" : "항공/해운/특송"}",
    "cost_per_unit": "$X.XX",
    "lead_time": "${isEn ? "X-X weeks" : "X~X주"}",
    "packaging": "${isEn ? "Specific packaging requirements" : "포장 요건 설명"}",
    "incoterms": "FOB/CIF/DDP"
  },
  "risk_matrix": [
    {"risk": "", "likelihood": "${isEn ? "High/Med/Low" : "높음/중간/낮음"}", "impact": "${isEn ? "High/Med/Low" : "높음/중간/낮음"}", "mitigation": ""}
  ],
  "export_readiness": {
    "documentation": 0~100,
    "certification": 0~100,
    "logistics": 0~100,
    "marketing": 0~100,
    "verdict": "${isEn ? "1-2 sentence overall readiness assessment" : "1~2문장 종합 수출 준비도 평가"}"
  },
  "government_support": {
    "export_voucher": "${isEn ? "Applicable export support programs" : "활용 가능한 수출 바우처/지원사업"}",
    "kotra_support": "${isEn ? "KOTRA/trade agency support available" : "KOTRA/무역관 지원 내용"}",
    "sme_support": "${isEn ? "SME-specific programs" : "중소기업 전용 지원사업"}",
    "estimated_subsidy": "$X,XXX~$XX,XXX"
  }
}
${isEn
  ? "Rules: ★★★ ALL fields above are REQUIRED. Practical actions with real agencies/URLs/costs. No generic advice. margin_analysis must show complete FOB→Landed→Wholesale→Retail chain. risk_matrix must have 3-4 risks. export_readiness scores must be evidence-based. government_support should reference real programs from the origin country."
  : "규칙: ★★★ 위 모든 필드 필수. 실무 수준 액션 (기관명/URL/비용/기간). 일반론 금지. margin_analysis는 FOB→도착원가→도매→소매 전체 체인 필수. risk_matrix 3~4개 리스크 필수. export_readiness는 근거 기반 점수. government_support는 원산지국의 실제 지원사업 기재. 존댓말 필수."}`;

    // ─── Run all 3 calls in parallel with wall clock guard ───
    console.log("[parallel] Starting 3 AI calls simultaneously...");
    const startTime = Date.now();

    // Track completed results for progressive merge
    const completedResults: any = {};

    // Fire-and-forget DB progress update (don't await)
    const saveProgress = (progress: string, pct: number) => {
      sbAdmin.from("analyses").update({
        ai_result: {
          ...completedResults,
          _progress: progress,
          _progress_pct: pct,
          _partial: { ...completedResults },
          crawl_results: crawlMeta,
        },
      }).eq("id", analysis_id).eq("user_id", user.id).then(() => {}).catch(() => {});
    };

    // All 3 calls run truly parallel — no stagger needed (timeout was the issue, not rate limits)
    const [r1, r2, r3] = await Promise.allSettled([
      callAI(prompt1 + langCtx, 5000, visionImage, startTime).then((res) => {
        console.log("[call1] Core done in", Date.now() - startTime, "ms, model:", res.model);
        Object.assign(completedResults, res.result);
        saveProgress("core_done", 50);
        return res;
      }),
      callAI(prompt2 + langCtx, 5000, undefined, startTime).then((res) => {
        console.log("[call2] Market done in", Date.now() - startTime, "ms, model:", res.model);
        Object.assign(completedResults, res.result);
        saveProgress("market_done", 75);
        return res;
      }),
      callAI(prompt3 + langCtx, 4500, undefined, startTime).then((res) => {
        console.log("[call3] Action done in", Date.now() - startTime, "ms, model:", res.model);
        Object.assign(completedResults, res.result);
        return res;
      }),
    ]);

    const totalTime = Date.now() - startTime;
    const elapsedSinceStart = Date.now() - startTime;
    console.log("[parallel] All calls settled in", totalTime, "ms");

    // ─── Merge results ───
    const result: any = {};
    const usedModels: string[] = [];
    let failedCalls = 0;

    if (r1.status === "fulfilled") {
      Object.assign(result, r1.value.result);
      usedModels.push(r1.value.model);
    } else {
      console.error("[call1] FAILED:", r1.reason);
      failedCalls++;
    }

    if (r2.status === "fulfilled") {
      Object.assign(result, r2.value.result);
      usedModels.push(r2.value.model);
    } else {
      const errMsg = (r2.reason as Error)?.message || String(r2.reason);
      console.error("[call2] FAILED:", errMsg);
      result._call2_error = errMsg.substring(0, 500);
      failedCalls++;
    }

    if (r3.status === "fulfilled") {
      Object.assign(result, r3.value.result);
      usedModels.push(r3.value.model);
    } else {
      console.error("[call3] FAILED:", r3.reason);
      failedCalls++;
    }

    // ─── Wall clock check: if nearing 150s, save partial and return ───
    if (failedCalls > 0 && (Date.now() - startTime) > WALL_CLOCK_LIMIT_MS) {
      console.warn(`[wall-clock] Exceeded ${WALL_CLOCK_LIMIT_MS}ms, returning partial results (${3 - failedCalls}/3 calls succeeded)`);

      // isKo already defined at top level
      // If we have at least 1 successful call, save as partial completion
      if (failedCalls < 3) {
        result._partial_failure = true;
        result._failed_calls = failedCalls;
        result._timeout = true;
        result.crawl_results = crawlMeta;
        result.language = language;
        result.analysis_version = "EF-v11-timeout-partial";
        result.model_used = usedModels.join("+");
        result.analyzed_at = new Date().toISOString();
        result.processing_time_ms = Date.now() - startTime;

        await sbAdmin.from("analyses").update({
          status: "completed",
          ai_result: result,
        }).eq("id", analysis_id).eq("user_id", user.id);

        return new Response(
          JSON.stringify({
            ok: true,
            partial: true,
            result,
            message: "Analysis timed out. Partial results returned. Please try again later for full analysis.",
          }),
          { status: 200, headers },
        );
      }

      // All 3 failed + wall clock exceeded
      await sbAdmin.rpc("refund_analysis_credit", { p_user_id: user.id }).catch(() => {});
      await sbAdmin.from("analyses").update({
        status: "failed",
        ai_result: {
          error: "Wall clock timeout — all AI calls failed",
          _timeout: true,
          crawl_results: crawlMeta,
        },
      }).eq("id", analysis_id).eq("user_id", user.id);

      return new Response(
        JSON.stringify({
          ok: false,
          error: "Analysis timed out. Please try again later.",
          code: "ANALYSIS_TIMEOUT",
        }),
        { status: 504, headers },
      );
    }

    // If ALL 3 failed (within wall clock), report failure
    if (failedCalls === 3) {
      // isKo already defined at top level
      await sbAdmin.rpc("refund_analysis_credit", { p_user_id: user.id }).catch(() => {});
      await sbAdmin.from("analyses").update({
        status: "failed",
        ai_result: { error: "All 3 parallel AI calls failed", crawl_results: crawlMeta },
      }).eq("id", analysis_id).eq("user_id", user.id);
      return new Response(
        JSON.stringify({
          ok: false,
          error: isKo
            ? "AI 분석 서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요."
            : "Unable to connect to AI analysis server. Please try again shortly.",
          code: "AI_SERVER_ERROR",
        }),
        { status: 502, headers },
      );
    }

    // ─── RESCUE: If 1-2 calls failed AND we have time, retry ───
    if (failedCalls > 0 && (Date.now() - startTime) < (WALL_CLOCK_LIMIT_MS - AI_CALL_TIMEOUT_MS)) {
      console.log(`[rescue] ${failedCalls} call(s) failed, attempting rescue (elapsed: ${Date.now() - startTime}ms)...`);
      const rescuePromises: Promise<void>[] = [];

      if (r1.status !== "fulfilled") {
        rescuePromises.push(
          callAI(prompt1 + langCtx, 5000, undefined, startTime).then((res) => {
            Object.assign(result, res.result);
            usedModels.push(res.model + "-rescue");
            failedCalls--;
            console.log("[rescue] Call 1 recovered");
          }).catch((e) => console.error("[rescue] Call 1 still failed:", (e as Error).message))
        );
      }
      if (r2.status !== "fulfilled") {
        // Split Call 2 into two smaller calls for better reliability
        const remainingMs = WALL_CLOCK_LIMIT_MS - (Date.now() - startTime);
        if (remainingMs > AI_CALL_TIMEOUT_MS + 5000) {
          // Enough time: try split rescue (market + certs separately)
          const prompt2a = `${isEn ? "# Export Analysis — Market & Competition" : "# 수출 분석 — 시장 & 경쟁"}
${productContext}
${crawlCtx}
${toneRule}
${isEn ? "Output JSON:" : "JSON 출력:"}
{
  "recommended_markets": ["US", "JP"],
  "market_analysis": [{"name": "", "size": "", "grow": "", "entry": "", "note": "2${isEn ? " sentences" : "문장"}", "key_channel": ""}],
  "competitor_analysis": {
    "overview": "2${isEn ? " sentences" : "문장"}",
    "swot": {"strength": "", "weakness": "", "opportunity": "", "threat": ""},
    "global_competitors": [{"name": "", "price": "", "note": ""}],
    "local_competitors": [{"name": "", "price": ""}],
    "price_range": "", "our_positioning": ""
  },
  "industry_trend": "2${isEn ? " sentences" : "문장"}",
  "recommended_channels": [""],
  "opportunities": ["", ""],
  "risks": ["", ""]
}`;
          const prompt2b = `${isEn ? "# Export Analysis — Certifications" : "# 수출 분석 — 인증"}
${productContext}
${crawlCtx}
${toneRule}
${isEn ? "Output JSON:" : "JSON 출력:"}
{
  "required_certs": ["cert1"],
  "existing_certs": ${JSON.stringify(existing_certs)},
  "cert_details": [{"name": "", "market": "", "duration": "", "cost": "", "priority": "${isEn ? "Required/Recommended" : "필수/권장"}", "note": "2${isEn ? " sentences" : "문장"}"}]
}`;
          rescuePromises.push(
            Promise.allSettled([
              callAI(prompt2a + langCtx, 3500, undefined, startTime),
              callAI(prompt2b + langCtx, 2500, undefined, startTime),
            ]).then(([ra, rb]) => {
              let recovered = false;
              if (ra.status === "fulfilled") {
                Object.assign(result, ra.value.result);
                usedModels.push(ra.value.model + "-rescue-market");
                recovered = true;
              }
              if (rb.status === "fulfilled") {
                Object.assign(result, rb.value.result);
                usedModels.push(rb.value.model + "-rescue-cert");
                recovered = true;
              }
              if (recovered) {
                failedCalls--;
                console.log("[rescue] Call 2 recovered via split");
              } else {
                console.error("[rescue] Call 2 split rescue also failed");
              }
            })
          );
        } else {
          // Not enough time: try single rescue with reduced tokens
          rescuePromises.push(
            callAI(prompt2 + langCtx, 5000, undefined, startTime).then((res) => {
              Object.assign(result, res.result);
              usedModels.push(res.model + "-rescue");
              failedCalls--;
              console.log("[rescue] Call 2 recovered");
            }).catch((e) => console.error("[rescue] Call 2 still failed:", (e as Error).message))
          );
        }
      }
      if (r3.status !== "fulfilled") {
        rescuePromises.push(
          callAI(prompt3 + langCtx, 4500, undefined, startTime).then((res) => {
            Object.assign(result, res.result);
            usedModels.push(res.model + "-rescue");
            failedCalls--;
            console.log("[rescue] Call 3 recovered");
          }).catch((e) => console.error("[rescue] Call 3 still failed:", (e as Error).message))
        );
      }

      await Promise.allSettled(rescuePromises);
      console.log(`[rescue] Done. Remaining failures: ${failedCalls}`);
    } else if (failedCalls > 0) {
      console.warn(`[rescue] Skipped — not enough time (elapsed: ${Date.now() - startTime}ms)`);
    }

    // Attach metadata
    const firstImage = crawlResults.find((cr) => cr.success && cr.image);
    result.crawl_results = crawlMeta;
    if (firstImage?.image) result.thumbnail = firstImage.image;
    result.language = language;
    result.analysis_version = "EF-v11-resilient";
    result.model_used = usedModels.join("+");
    result.analyzed_at = new Date().toISOString();
    result.processing_time_ms = totalTime;
    result.input_data = {
      product_name_en, category, fob_price, moq, description,
      urls, file_urls, selling_points: selling_points.filter(Boolean),
      target_markets, existing_certs, brand_name, manufacturer,
      origin_country: resolvedOrigin,
      thumbnail: firstImage?.image || "",
      has_vision_image: !!validatedImageBase64,
    };
    if (failedCalls > 0) {
      result._partial_failure = true;
      result._failed_calls = failedCalls;
    }

    // ─── Fallback: generate Call 2 data from available results if missing ───
    if (!result.competitor_analysis && result.summary) {
      const fb = isKo;
      result.competitor_analysis = {
        overview: fb ? "경쟁사 상세 분석이 일시적으로 불가합니다. 재분석 시 포함됩니다." : "Detailed competitor analysis temporarily unavailable. Will be included on re-analysis.",
        swot: {
          strength: result.scores?.brand_power > 50 ? (fb ? "브랜드 인지도 보유" : "Brand recognition") : (fb ? "가격 경쟁력" : "Price competitiveness"),
          weakness: fb ? "해외 시장 인지도 부족" : "Limited overseas market awareness",
          opportunity: fb ? "글로벌 시장 성장 트렌드" : "Global market growth trend",
          threat: fb ? "현지 경쟁사 및 대체품" : "Local competitors and substitutes",
        },
        global_competitors: [],
        local_competitors: [],
      };
      result._call2_fallback = true;
    }
    if (!result.industry_trend && result.summary) {
      result.industry_trend = result.summary;
    }
    if ((!result.opportunities || result.opportunities.length === 0) && result.action_plan) {
      result.opportunities = [
        isKo ? "글로벌 시장 진출 기회 (상세 분석은 재분석 시 제공)" : "Global market entry opportunity (details on re-analysis)",
        isKo ? "온라인 채널 확대 가능성" : "Online channel expansion potential",
        isKo ? "FTA 활용 관세 절감" : "FTA tariff reduction opportunity",
      ];
    }
    if ((!result.risks || result.risks.length === 0) && result.action_plan) {
      result.risks = [
        isKo ? "인증/규제 준수 리스크" : "Certification/regulatory compliance risk",
        isKo ? "브랜드 인지도 부재로 인한 초기 진입 어려움" : "Initial market entry difficulty due to low brand awareness",
        isKo ? "환율 변동 및 물류비 증가 리스크" : "Exchange rate fluctuation and logistics cost risk",
      ];
    }

    // ─── Assemble 8-Stage Export Journey from merged results ───
    result.export_journey = assembleExportJourney(result, isKo, resolvedOrigin, originLabel);

    // Save final merged result
    await sbAdmin
      .from("analyses")
      .update({ status: "completed", ai_result: result })
      .eq("id", analysis_id)
      .eq("user_id", user.id);

    // Send analysis completion email
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({
          user_id: user.id,
          type: "analysis_complete",
          data: {
            product_name: product_name || product_name_en || "Product",
            hs_code: result.hs_code || "",
            target_markets: Array.isArray(result.recommended_markets) ? result.recommended_markets.join(", ") : "",
            export_score: result.overall_score || "",
          },
        }),
      });
    } catch (emailErr) {
      console.error("Email notification failed:", emailErr);
    }

    return new Response(
      JSON.stringify({ ok: true, result }),
      { status: 200, headers },
    );
  } catch (err) {
    const errMsg = (err as Error).message || "";
    console.error("analyze-export error:", errMsg, err);

    // Refund credit + mark analysis as failed on unhandled errors
    const body = await req.clone().json().catch(() => ({}));
    const failAnalysisId = body?.analysis_id;
    if (failAnalysisId) {
      const sbUrl = Deno.env.get("SUPABASE_URL")!;
      const sbServiceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const sbFail = createClient(sbUrl, sbServiceRole);
      const token = req.headers.get("Authorization")?.replace("Bearer ", "") || "";
      const { data: { user: failUser } } = await sbFail.auth.getUser(token).catch(() => ({ data: { user: null } }));
      if (failUser) {
        await sbFail.rpc("refund_analysis_credit", { p_user_id: failUser.id }).catch(() => {});
        await sbFail.from("analyses").update({
          status: "failed",
          ai_result: { error: errMsg, _timeout: errMsg.includes("WALL_CLOCK") || errMsg.includes("abort") || errMsg.includes("timeout") },
        }).eq("id", failAnalysisId).eq("user_id", failUser.id);
        console.log(`[catch] Refunded credit + marked analysis ${failAnalysisId} as failed`);
      }
    }

    // Detect timeout-related errors and return user-friendly message
    if (errMsg.includes("WALL_CLOCK") || errMsg.includes("abort") || errMsg.includes("timeout")) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Analysis timed out. Please try again later.",
          code: "ANALYSIS_TIMEOUT",
        }),
        { status: 504, headers },
      );
    }

    return new Response(
      JSON.stringify({
        ok: false,
        error: "Internal server error. Please try again later.",
        code: "SERVER_ERROR",
      }),
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
  language: string;
  highRiskTargets?: string[];
}

function buildPrompt(d: PromptInput): string {
  const isKo = d.language === "ko";
  const isEn = d.language !== "ko";
  const na = isEn ? "N/A" : "미입력";
  const none = isEn ? "None" : "없음";

  const intro = isEn
    ? `# Whistle AI Export Intelligence Engine v5

You are Whistle AI's export intelligence engine. You perform integrated analysis combining triple expertise: customs specialist (tariffs, HS codes, FTA), international logistics expert (shipping, customs clearance, Incoterms), and global marketing strategist (market entry, channels, pricing).

This analysis is a paid service ($9.90~$25 per analysis) provided to manufacturers and export companies worldwide.
The analysis target includes export companies from all countries, not just Korean companies.
Never write generalities, obvious statements, or generic advice. All content must be specific analysis for this "particular product".`
    : `# Whistle AI Export Intelligence Engine v5

당신은 Whistle AI의 수출 인텔리전스 엔진입니다. 관세사(관세·HS코드·FTA), 국제물류전문가(선적·통관·인코텀즈), 해외마케팅전략가(시장진입·채널·가격)의 3중 전문성을 통합한 분석을 수행합니다.

이 분석은 유료 서비스(건당 $9.90~₩25,000)로 전 세계 제조사/수출기업에게 제공됩니다.
분석 대상은 한국 기업뿐 아니라 전 세계 모든 국가의 수출 기업입니다.
일반론, 당연한 말, 뻔한 조언은 절대 쓰지 마세요. 모든 내용은 이 "특정 제품"에 대한 구체적 분석이어야 합니다.`;

  const productInfo = isEn
    ? `## Product Information
- Product Name: ${d.product_name}
- Product Name (English): ${d.product_name_en || na}
- Category: ${d.category || na}
- FOB Price (USD): ${d.fob_price || na}
- MOQ: ${d.moq || na}
- Brand: ${d.brand_name || na}
- Manufacturer: ${d.manufacturer || na}
- Export Experience: ${d.export_experience || na}
- Annual Capacity: ${d.annual_capacity || na}
- Weight (kg): ${d.weight_kg || na}
- Package Dimensions: ${d.package_dimensions || na}
- Units per Carton: ${d.units_per_carton || na}
- Selling Points: ${d.selling_points.filter(Boolean).join(", ") || na}
- Existing Certifications: ${d.existing_certs.join(", ") || none}
- Known HS Code: ${d.known_hs_code || na}
- Special Requirements: ${d.special_requirements || none}
- Product Description: ${d.description || na}
- Product URL: ${d.urls.filter(Boolean).join(", ") || none}
- Product Images: ${d.file_urls.length ? d.file_urls.join(", ") : none}
- Target Markets: ${d.marketList}`
    : `## 제품 정보
- 제품명(한글): ${d.product_name}
- 제품명(영문): ${d.product_name_en || na}
- 카테고리: ${d.category || "미지정"}
- FOB 가격(USD): ${d.fob_price || na}
- MOQ: ${d.moq || na}
- 브랜드: ${d.brand_name || na}
- 제조사: ${d.manufacturer || na}
- 수출 경험: ${d.export_experience || na}
- 연간 생산능력: ${d.annual_capacity || na}
- 중량(kg): ${d.weight_kg || na}
- 포장 치수: ${d.package_dimensions || na}
- 박스 당 수량: ${d.units_per_carton || na}
- 셀링포인트: ${d.selling_points.filter(Boolean).join(", ") || na}
- 보유 인증: ${d.existing_certs.join(", ") || none}
- 알려진 HS코드: ${d.known_hs_code || na}
- 특별 요구사항: ${d.special_requirements || none}
- 제품 설명: ${d.description || na}
- 제품 URL: ${d.urls.filter(Boolean).join(", ") || none}
- 제품 이미지: ${d.file_urls.length ? d.file_urls.join(", ") : none}
- 타겟 시장: ${d.marketList}`;

  const crawlSection = d.crawledText
    ? isEn
      ? `\n## Crawled Product Page Data\nBelow is text extracted by crawling the product URLs. Actively use this data in your analysis. It contains real information such as product name, ingredients, price, and detailed descriptions.\n${d.crawledText}`
      : `\n## 크롤링으로 수집한 제품 페이지 데이터\n아래는 제품 URL에서 실제 크롤링하여 추출한 텍스트입니다. 이 데이터를 분석에 적극 활용하세요. 제품명, 성분, 가격, 상세 설명 등 실제 정보가 포함되어 있습니다.\n${d.crawledText}`
    : "";

  const principles = isEn
    ? `## Core Principles
1. Provide specific reasoning for each score (no generalities)
2. HS Code: specify classification basis per General Interpretive Rules
3. Tariff rates: based on actual FTA concession schedules, PSR-level rules of origin
4. Competitors: use real names + price ranges (no fictitious names)
5. Markets: specific analysis limited to the relevant category
6. Pricing: number-based comparisons
7. Action plan: practical level (agencies/URLs/costs/timelines)
**★★★ TOP PRIORITY — Tone & Style:**
- Write as if you are a warm, encouraging export consultant speaking directly to the manufacturer.
- Use a friendly, supportive tone throughout. Acknowledge challenges but always point toward solutions.
- Example: (X) "FDA clearance absent. Market entry blocked." → (O) "You don't have FDA clearance yet, which means you can't sell as a medical device in the US right now. However, positioning as a wellness device is a smart workaround that many Korean brands have used successfully."
- Example: (X) "Entry barrier high." → (O) "The entry barrier is relatively high, but with step-by-step preparation, this market is absolutely worth pursuing."
**Length:**
- Each text field should be 2-4 sentences: enough to explain WHY, not just WHAT.
- Use clear explanations a non-expert manufacturer can understand. Avoid jargon without context.
- For score reasons: explain the logic behind the score, what factors helped/hurt, and what could improve it.
- Never use telegraphic fragments like "bottleneck high. needed." — always write complete, readable sentences.`
    : `## 핵심 원칙
1. 점수마다 구체적 이유 기재 (일반론 금지)
2. HS코드: 통칙에 따라 분류 근거 명시
3. 관세율: 실제 FTA 양허표 기준, PSR 수준 원산지 기준
4. 경쟁사: 실명 + 가격대 (가명 금지)
5. 시장: 해당 카테고리 한정 구체적 분석
6. 가격: 숫자 기반 비교
7. 행동계획: 실무 수준 (기관/URL/비용/기간)
**★★★ 최우선 — 톤 & 어투:**
- 반드시 "~입니다", "~하세요", "~드립니다" 등 친절한 존댓말로 작성하세요.
- 제조사 대표님에게 1:1로 컨설팅하듯 따뜻하고 격려하는 톤을 유지하세요.
- "~이다", "~된다", "~않다" 같은 딱딱한 논문체/보고서체는 절대 사용하지 마세요.
- 예시: (X) "FDA 510(k) 미보유 상태로 판매 불가하다" → (O) "현재 FDA 510(k)가 아직 없으시기 때문에 미국에서 의료기기로 판매하기 어려운 상황이에요. 하지만 웰니스 기기로 포지셔닝하시면 이 문제를 우회할 수 있습니다."
- 예시: (X) "진입 장벽이 높다" → (O) "진입 장벽이 다소 높은 편이지만, 단계적으로 준비하시면 충분히 도전해볼 만한 시장입니다."
**길이:**
- 각 텍스트 필드는 2~4문장: "왜"를 충분히 설명하되 핵심을 놓치지 마세요.
- 수출 비전문가인 제조사도 이해할 수 있는 쉬운 말로 작성하세요. 전문 용어는 반드시 풀어서 설명합니다.
- 점수 근거: 어떤 요인이 점수에 긍정적/부정적 영향을 줬는지, 개선 방법은 무엇인지 설명합니다.
- "병목이다 높다. 필요하다." 같은 단편적 서술 금지 — 반드시 완전한 문장으로 읽기 쉽게 작성합니다.`;

  const hrWarning = d.highRiskTargets && d.highRiskTargets.length > 0
    ? `\n## ⚠️ ${isEn ? "HIGH-RISK MARKET WARNING" : "고위험 시장 경고"}
${isEn
  ? `The following target market(s) are classified as HIGH-RISK under international trade controls: ${d.highRiskTargets.join(", ")}.
In your analysis, you MUST include: (1) specific sanctions/export control warnings, (2) ECCN/EAR classification requirements, (3) end-use/end-user screening requirements, (4) enhanced due diligence steps, (5) potential license requirements. Add these to the risks array and regulatory_score rationale.`
  : `다음 타겟 시장은 국제 수출통제 고위험 국가입니다: ${d.highRiskTargets.join(", ")}.
분석 시 반드시 포함: (1) 제재/수출통제 경고, (2) ECCN/EAR 분류 요건, (3) 최종용도/최종사용자 스크리닝, (4) 강화된 실사 절차, (5) 잠재 수출허가 요건. risks 배열과 regulatory_score에 반영하세요.`}\n`
    : "";

  // For non-ko/non-en: add language override instruction
  const bpLangOverride = (d.language !== "ko" && d.language !== "en") ? `\n\n**CRITICAL LANGUAGE REQUIREMENT: You MUST write your ENTIRE response in ${LANG_NAMES[d.language] || "English"}. All text fields, descriptions, reasons, notes, and advice must be in ${LANG_NAMES[d.language] || "English"}. Only keep technical terms (HS codes, FTA names, certification names) in their original form.**` : "";

  return `${intro}${bpLangOverride}

${productInfo}
${crawlSection}
${hrWarning}
${principles}

## ${isEn ? "Response JSON Structure (all fields required)" : "응답 JSON 구조 (모든 필드 필수)"}
{
  "overall_score": 0~100 (종합),
  "market_fit": 0~100,
  "competition": 0~100,
  "regulatory": 0~100,
  "price_competitiveness": 0~100,
  "brand_power": 0~100,
  "logistics_score": 0~100,
  "score_details": {
    "overall_reason": "${isEn ? "Overall score rationale — explain key factors and what could improve it (2-4 sentences)" : "종합 점수 근거 — 주요 요인과 개선 가능한 부분을 설명 (2~4문장)"}",
    "market_fit_reason": "${isEn ? "Market fit rationale (2-4 sentences, friendly professional tone)" : "시장 적합성 근거 (2~4문장, 친절한 전문가 톤)"}",
    "price_reason": "${isEn ? "Price competitiveness rationale (2-4 sentences, friendly professional tone)" : "가격 경쟁력 근거 (2~4문장, 친절한 전문가 톤)"}",
    "brand_reason": "${isEn ? "Brand power rationale (2-4 sentences, friendly professional tone)" : "브랜드 파워 근거 (2~4문장, 친절한 전문가 톤)"}",
    "competition_reason": "${isEn ? "Competitive landscape rationale (2-4 sentences, friendly professional tone)" : "경쟁 환경 근거 (2~4문장, 친절한 전문가 톤)"}",
    "regulatory_reason": "${isEn ? "Regulatory compliance rationale (2-4 sentences, friendly professional tone)" : "규제 대응 근거 (2~4문장, 친절한 전문가 톤)"}",
    "logistics_reason": "${isEn ? "Logistics suitability rationale (2-4 sentences, friendly professional tone)" : "물류 적합성 근거 (2~4문장, 친절한 전문가 톤)"}"
  },
  "product_detail": {
    "actual_name": "${isEn ? "Actual product name from crawled data or input" : "크롤링/입력에서 확인된 실제 제품명"}",
    "image": "${isEn ? "Product image URL from crawled og:image or provided image URL (empty string if none)" : "크롤링 og:image 또는 제공된 이미지 URL (없으면 빈 문자열)"}",
    "retail_price": "${isEn ? "Retail price found from crawled data" : "크롤링에서 확인된 소비자가"}"
  },
  "estimated_fob": "$X.X~$X.X",
  "estimated_retail": {"US": "$XX~$XX", "JP": "¥X,XXX~¥X,XXX"},
  "hs_code": "XXXX.XX",
  "hs_description": "${isEn ? "HS code classification summary for this product (2-4 sentences, friendly professional tone)" : "이 제품에 대한 HS코드 분류 요약 (2~4문장, 친절한 전문가 톤)"}",
  "hs_code_detail": {
    "hs2": "XX", "hs2_desc": "${isEn ? "Chapter description" : "류 설명"}",
    "hs4": "XXXX", "hs4_desc": "${isEn ? "Heading description" : "호 설명"}",
    "hs6": "XXXX.XX", "hs6_desc": "${isEn ? "Subheading description" : "소호 설명"}",
    "hs10": "XXXX.XX.XXXX", "hs10_desc": "${isEn ? "National tariff line description" : "HSK 설명"}",
    "basis": "${isEn ? "Detailed explanation of which GIR rule was applied, and what criteria (essential character/use/material) determined this code" : "관세율표 통칙 몇 호에 따라, 어떤 기준(주된 특성/용도/재질)으로 이 코드를 선택했는지 상세 기재"}",
    "alts": [{"code": "XXXX.XX.XXXX", "reason": "${isEn ? "Why this code is an alternative and conditions for application" : "이 코드가 대안인 이유와 적용 조건"}"}]
  },
  "hs_alternatives": [{"code": "XXXX.XX", "reason": "${isEn ? "Brief explanation" : "간단 설명"}"}],
  "fta_tariff_table": [
    {
      "mkt": "US",
      "fta": "${isEn ? "KORUS FTA" : "한-미 FTA (KORUS)"}",
      "mfn": "X.X%",
      "pref": "X%",
      "save": "X.X%p",
      "rule": "${isEn ? "Specific PSR-level rules of origin (e.g., CC or RVC 35%, Annex 4-B)" : "PSR 수준의 구체적 원산지 기준 (예: CC 또는 RVC 35%, Annex 4-B 참조)"}",
      "fta_name": "${isEn ? "Korea-US Free Trade Agreement" : "한-미 자유무역협정"}"
    }
  ],
  "duty_savings_estimate": {
    "annual_volume": "${isEn ? "Estimated annual export volume" : "추정 연간 수출량"}",
    "fob_per_unit": "$X.X",
    "avg_mfn": "X.X%",
    "avg_fta": "X%",
    "estimated_annual_saving": "$X,XXX"
  },
  "required_certs": ["cert1", "cert2"],
  "existing_certs": ${JSON.stringify(d.existing_certs)},
  "cert_details": [
    {
      "name": "${isEn ? "Certification name" : "인증명"}",
      "market": "${isEn ? "Target country" : "대상국"}",
      "duration": "${isEn ? "Estimated processing time (e.g., 3-6 months)" : "예상 소요 기간 (예: 3~6개월)"}",
      "cost": "${isEn ? "Cost range in USD (e.g., $5,000~$15,000)" : "비용 범위 USD (예: $5,000~$15,000)"}",
      "priority": "${isEn ? "Required/Recommended/Optional" : "필수/권장/선택"}",
      "note": "${isEn ? "Step-by-step application process: (1) where to apply (agency name + website), (2) required documents, (3) Korean testing labs that can help (e.g., KTL, KTC, KOTITI), (4) tips to save time/cost. Write 3-5 sentences in friendly tone." : "취득 절차를 단계별로 안내하세요: (1) 어디서 신청하는지 (기관명 + 웹사이트), (2) 필요 서류, (3) 한국에서 도움받을 수 있는 시험기관 (예: KTL, KTC, KOTITI), (4) 시간/비용 절약 팁. 친절한 톤으로 3~5문장 작성."}"
    }
  ],
  "recommended_markets": ["US", "JP"],
  "market_analysis": [
    {
      "name": "${isEn ? "Country name" : "국가명"}",
      "size": "${isEn ? "Category market size" : "해당 카테고리 시장 규모"}",
      "grow": "${isEn ? "Growth rate" : "성장률"}",
      "entry": "${isEn ? "Entry barrier level" : "진입장벽 수준"}",
      "note": "${isEn ? "Product-specific market entry advice (2-4 sentences, friendly professional tone)" : "이 제품에 특화된 진출 조언 (2~4문장, 친절한 전문가 톤)"}",
      "gdp": "GDP",
      "key_channel": "${isEn ? "Key distribution channel" : "주력 유통 채널명"}",
      "price_sensitivity": "${isEn ? "Price sensitivity" : "가격 민감도"}"
    }
  ],
  "competitor_analysis": {
    "overview": "${isEn ? "Competitive landscape overview (2-4 sentences, friendly professional tone)" : "경쟁 환경 개요 (2~4문장, 친절한 전문가 톤)"}",
    "swot": {
      "strength": "${isEn ? "Specific strengths of this product" : "이 제품의 구체적 강점"}",
      "weakness": "${isEn ? "Specific weaknesses of this product" : "이 제품의 구체적 약점"}",
      "opportunity": "${isEn ? "Opportunities this product can leverage" : "이 제품이 활용 가능한 기회"}",
      "threat": "${isEn ? "Threats this product faces" : "이 제품이 직면할 위협"}"
    },
    "global_competitors": [
      {"name": "${isEn ? "Actual brand name" : "실제 브랜드명"}", "price": "${isEn ? "FOB price range" : "FOB가격대"}", "note": "${isEn ? "One-line summary" : "한줄 요약"}"}
    ],
    "local_competitors": [
      {"name": "${isEn ? "Local competitor name" : "한국 경쟁사명"}", "price": "${isEn ? "Price range" : "가격대"}"}
    ],
    "price_range": "${isEn ? "Competitor price range" : "경쟁사 가격 범위"}",
    "our_positioning": "${isEn ? "Positioning strategy (1 sentence)" : "포지셔닝 전략 (1문장)"}"
  },
  "pricing_strategy": {
    "recommended_fob": "$X.X",
    "recommended_retail": "$XX~$XX",
    "margin_structure": "${isEn ? "FOB→CIF→Wholesale→Retail margin structure" : "FOB→CIF→도매→소매 마진 구조"}",
    "strategy": "${isEn ? "Pricing strategy explanation (2-3 sentences)" : "가격 전략 설명 (2~3문장)"}"
  },
  "industry_trend": "${isEn ? "Global trends for this category with specific figures (3-4 sentences)" : "이 카테고리의 글로벌 트렌드를 구체적 수치와 함께 작성 (3~4문장)"}",
  "recommended_channels": ["${isEn ? "Specific channel name (e.g., Amazon FBA US, Qoo10 Japan)" : "구체적 채널명 (예: Amazon FBA US, Qoo10 Japan)"}"],
  "summary": "${isEn ? "Comprehensive export suitability summary (3-4 sentences with key figures)" : "이 제품의 수출 적합도 종합 요약 (3~4문장, 핵심 수치 포함)"}",
  "executive_summary": {
    "situation": "${isEn ? "Current situation (2-4 sentences, friendly professional tone)" : "현재 상황 (2~4문장, 친절한 전문가 톤)"}",
    "complication": "${isEn ? "Key challenges (2-4 sentences, friendly professional tone)" : "핵심 과제 (2~4문장, 친절한 전문가 톤)"}",
    "resolution": "${isEn ? "Resolution direction (2-4 sentences, friendly professional tone)" : "해결 방향 (2~4문장, 친절한 전문가 톤)"}"
  },
  "opportunities": ["${isEn ? "Opportunity 1 (with figures)" : "기회 1 (수치 포함)"}", "${isEn ? "Opportunity 2" : "기회 2"}", "${isEn ? "Opportunity 3" : "기회 3"}"],
  "risks": ["${isEn ? "Risk 1 (with mitigation)" : "리스크 1 (대응 방안 포함)"}", "${isEn ? "Risk 2" : "리스크 2"}", "${isEn ? "Risk 3" : "리스크 3"}"],
  "action_plan": [
    {
      "phase": "${isEn ? "Phase 1 (1-3 months)" : "1단계 (1~3개월)"}",
      "title": "${isEn ? "Export Preparation & Certification" : "수출 준비 & 인증"}",
      "items": ["${isEn ? "Specific action 1 (agency/cost/timeline)" : "구체적 액션1 (담당기관/비용/기간)"}", "${isEn ? "Action 2" : "액션2"}", "${isEn ? "Action 3" : "액션3"}"]
    },
    {
      "phase": "${isEn ? "Phase 2 (3-6 months)" : "2단계 (3~6개월)"}",
      "title": "${isEn ? "Buyer Discovery & First Export" : "바이어 발굴 & 첫 수출"}",
      "items": ["${isEn ? "Specific action 1" : "구체적 액션1"}", "${isEn ? "Action 2" : "액션2"}", "${isEn ? "Action 3" : "액션3"}"]
    }
  ],
  "alibaba_suitability": {
    "score": 0~100,
    "grade": "${isEn ? "Recommended/Average/Not Recommended" : "추천/보통/비추천"}",
    "verdict": "${isEn ? "Recommended/Average/Not Recommended" : "추천/보통/비추천"}",
    "reasons": ["${isEn ? "Rationale 1" : "판단 근거 1"}", "${isEn ? "Rationale 2" : "근거 2"}"],
    "tips": ["${isEn ? "Practical tip for Alibaba listing 1" : "알리바바 입점 시 실무 팁 1"}", "${isEn ? "Tip 2" : "팁 2"}"]
  },
  "margin_analysis": {
    "fob_cost": "$XX",
    "landed_cost": "$XX (${isEn ? "FOB + freight + insurance + duties" : "FOB + 운임 + 보험 + 관세"})",
    "wholesale_price": "$XX",
    "retail_price": "$XX",
    "gross_margin": "XX%"
  },
  "logistics": {
    "method": "${isEn ? "Recommended shipping method" : "추천 운송방법"}",
    "cost_per_unit": "$X.XX",
    "lead_time": "${isEn ? "X-X weeks" : "X~X주"}",
    "packaging": "${isEn ? "Specific packaging requirements" : "포장 요건"}",
    "incoterms": "FOB/CIF/DDP"
  },
  "risk_matrix": [
    {"risk": "${isEn ? "Risk factor" : "리스크 요인"}", "likelihood": "${isEn ? "High/Med/Low" : "높음/중간/낮음"}", "impact": "${isEn ? "High/Med/Low" : "높음/중간/낮음"}", "mitigation": "${isEn ? "Mitigation strategy" : "대응 전략"}"}
  ],
  "export_readiness": {
    "documentation": 0~100,
    "certification": 0~100,
    "logistics": 0~100,
    "marketing": 0~100,
    "verdict": "${isEn ? "Overall readiness assessment (1-2 sentences)" : "종합 수출 준비도 평가 (1~2문장)"}"
  },
  "government_support": {
    "export_voucher": "${isEn ? "Export voucher/support programs from origin country" : "원산지국 수출 바우처/지원사업"}",
    "kotra_support": "${isEn ? "Trade promotion agency support" : "무역관/KOTRA 지원 내용"}",
    "sme_support": "${isEn ? "SME-specific programs" : "중소기업 전용 지원사업"}",
    "estimated_subsidy": "$X,XXX~$XX,XXX"
  }
}

## ${isEn ? "Rules" : "규칙"}
- ${isEn ? "★★★ ALL fields above are REQUIRED — do not omit any field. Every field must have meaningful content." : "★★★ 위 모든 필드 필수 — 어떤 필드도 생략 금지. 모든 필드에 의미 있는 내용 필수."}
- ${isEn ? "ALL text fields must be in English. Output JSON only. Use real competitor names. No generalities. Write in friendly, clear consulting tone." : "한국어로 작성. JSON만 출력. 경쟁사 실명 사용. 일반론 금지. 친절하고 명확한 컨설팅 톤으로 작성."}
- ${isEn ? "Conservative scoring when information is insufficient. Max 3 global_competitors. Max 2 local_competitors." : "정보 부족 시 보수적 채점. global_competitors 최대 3개. local_competitors 최대 2개."}
- ${isEn ? "Max 5 cert_details — include ALL certifications needed for the recommended markets. market_analysis only for requested target markets." : "cert_details 최대 5개 — 추천 시장에서 필요한 모든 인증을 포함하세요. market_analysis는 요청된 타겟 시장만."}
- ${isEn ? "risk_matrix: 3-4 rows. margin_analysis: complete FOB→Landed→Wholesale→Retail chain. export_readiness: evidence-based scores." : "risk_matrix: 3~4행. margin_analysis: FOB→도착원가→도매→소매 전체 체인. export_readiness: 근거 기반 점수."}`;
}
