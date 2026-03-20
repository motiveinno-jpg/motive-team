import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://whistle-ai.com",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const CRAWL_TIMEOUT_MS = 8000;
const MAX_CRAWL_TEXT_LENGTH = 5000;

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

    return { url, success: true, title, text: finalText, image: ogImage || undefined };
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
  }).slice(0, 3); // Max 3 URLs to stay within timeout

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

  return { crawledText: crawledText.slice(0, 12000), crawlResults };
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
      starter: 10,
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
      language = "ko",
    } = body;

    if (!analysis_id || !product_name) {
      return new Response(
        JSON.stringify({ ok: false, error: "analysis_id, product_name 필수" }),
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
    const marketNames = language === "en" ? marketNamesEn : marketNamesKo;

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

    // Crawl URLs for product data extraction
    const { crawledText, crawlResults } = await crawlUrls(urls);
    console.log(
      "[crawl] results:",
      crawlResults.map((r) => `${r.url}: ${r.success ? "OK" : r.error}`),
    );

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
      language,
      highRiskTargets,
    });

    // Progressive update: AI analysis started
    await sbAdmin
      .from("analyses")
      .update({
        ai_result: {
          _progress: "ai_started",
          _progress_pct: 25,
          crawl_results: crawlMeta,
        },
      })
      .eq("id", analysis_id)
      .eq("user_id", user.id);

    const aiController = new AbortController();
    const aiTimer = setTimeout(() => aiController.abort(), 120000);

    const aiResp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 16000,
        stream: true,
        system: language === "en"
          ? "You are an export intelligence engine. Output ONLY valid JSON in English. No markdown code fences, no explanation text before or after the JSON. Start with { and end with }."
          : "You are an export intelligence engine. Output ONLY valid JSON. No markdown code fences, no explanation text before or after the JSON. Start with { and end with }.",
        messages: [{ role: "user", content: prompt }],
      }),
      signal: aiController.signal,
    });
    clearTimeout(aiTimer);

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("Anthropic API error:", aiResp.status, errText);
      await sbAdmin
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

    // Stream response and collect text + progressive DB updates
    let rawText = "";
    let stopReason = "end_turn";
    let aiModel = "claude-sonnet-4-6";
    let aiUsage: any = {};
    const reader = aiResp.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let lastProgressUpdate = 0;
    const progressSections = [
      { key: "hs_code", pct: 40, label: "hs_code" },
      { key: "fta_analysis", pct: 55, label: "fta_analysis" },
      { key: "market_analysis", pct: 65, label: "market_analysis" },
      { key: "competitive_landscape", pct: 75, label: "competitive" },
      { key: "price_competitiveness", pct: 85, label: "pricing" },
      { key: "action_plan", pct: 92, label: "action_plan" },
    ];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (data === "[DONE]") continue;
        try {
          const evt = JSON.parse(data);
          if (evt.type === "content_block_delta" && evt.delta?.text) {
            rawText += evt.delta.text;
          } else if (evt.type === "message_delta") {
            stopReason = evt.delta?.stop_reason || stopReason;
            if (evt.usage) aiUsage = { ...aiUsage, ...evt.usage };
          } else if (evt.type === "message_start" && evt.message) {
            aiModel = evt.message.model || aiModel;
            if (evt.message.usage) aiUsage = evt.message.usage;
          }
        } catch { /* skip malformed events */ }
      }
      // Progressive DB update when new sections detected (throttle to every 3s)
      // Include partial results so the client can show real data behind the overlay
      const now = Date.now();
      if (now - lastProgressUpdate > 3000) {
        for (const ps of progressSections) {
          if (rawText.includes(`"${ps.key}"`) && ps.pct > (lastProgressUpdate === 0 ? 0 : 25)) {
            // Extract partial results from rawText for live preview
            const partial: Record<string, unknown> = {};
            const partialKeys = [
              "executive_summary", "product_name", "hs_code", "hs_description",
              "overall_score", "market_fit", "price_competitiveness", "brand_power",
              "competition", "regulatory", "estimated_fob", "target_markets",
              "fta_analysis", "market_analysis", "competitive_landscape",
              "cert_requirements", "price_competitiveness_detail", "action_plan",
            ];
            for (const pk of partialKeys) {
              // Try to extract completed JSON values for each key
              const keyPattern = new RegExp(`"${pk}"\\s*:\\s*`);
              const match = rawText.match(keyPattern);
              if (match && match.index !== undefined) {
                const startIdx = match.index + match[0].length;
                try {
                  // Attempt to parse the value starting at this position
                  const sub = rawText.slice(startIdx);
                  // Simple extraction: find the value end
                  if (sub[0] === '"') {
                    const endQ = sub.indexOf('"', 1);
                    if (endQ > 0) partial[pk] = sub.slice(1, endQ);
                  } else if (sub[0] === '[' || sub[0] === '{') {
                    // Try to parse array/object — may be incomplete
                    let depth = 0; let inStr = false; let esc = false; let end = -1;
                    const open = sub[0]; const close = open === '[' ? ']' : '}';
                    for (let ci = 0; ci < sub.length && ci < 8000; ci++) {
                      const ch = sub[ci];
                      if (esc) { esc = false; continue; }
                      if (ch === '\\') { esc = true; continue; }
                      if (ch === '"') { inStr = !inStr; continue; }
                      if (inStr) continue;
                      if (ch === open || ch === '{' || ch === '[') depth++;
                      if (ch === close || ch === '}' || ch === ']') depth--;
                      if (depth === 0) { end = ci + 1; break; }
                    }
                    if (end > 0) {
                      try { partial[pk] = JSON.parse(sub.slice(0, end)); } catch { /* skip */ }
                    }
                  } else {
                    // number or boolean
                    const numMatch = sub.match(/^(-?\d+\.?\d*)/);
                    if (numMatch) partial[pk] = Number(numMatch[1]);
                  }
                } catch { /* skip unparseable */ }
              }
            }
            await sbAdmin
              .from("analyses")
              .update({
                ai_result: {
                  _progress: ps.label,
                  _progress_pct: ps.pct,
                  _partial: partial,
                  crawl_results: crawlMeta,
                },
              })
              .eq("id", analysis_id)
              .eq("user_id", user.id);
            lastProgressUpdate = now;
            break;
          }
        }
        if (lastProgressUpdate !== now) lastProgressUpdate = now;
      }
    }
    console.log("AI response - model:", aiModel, "stop_reason:", stopReason, "text_length:", rawText.length, "usage:", JSON.stringify(aiUsage));

    let result;
    try {
      // Try direct JSON parse first
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("JSON not found in response");
      result = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      // If truncated (max_tokens hit), try to fix incomplete JSON
      const _stopReason = stopReason;
      console.error("JSON parse error:", parseErr, "stop_reason:", stopReason, "Raw tail:", rawText.slice(-200));

      if (_stopReason === "max_tokens") {
        // Try to salvage truncated JSON by closing brackets
        try {
          let jsonStr = rawText.match(/\{[\s\S]*/)?.[0] || "";
          // Count unclosed braces/brackets and close them
          let braces = 0, brackets = 0;
          let inString = false, escape = false;
          for (const ch of jsonStr) {
            if (escape) { escape = false; continue; }
            if (ch === '\\') { escape = true; continue; }
            if (ch === '"') { inString = !inString; continue; }
            if (inString) continue;
            if (ch === '{') braces++;
            if (ch === '}') braces--;
            if (ch === '[') brackets++;
            if (ch === ']') brackets--;
          }
          // Close any open strings, brackets, braces
          if (inString) jsonStr += '"';
          for (let i = 0; i < brackets; i++) jsonStr += ']';
          for (let i = 0; i < braces; i++) jsonStr += '}';
          result = JSON.parse(jsonStr);
          console.log("Salvaged truncated JSON successfully");
        } catch (salvageErr) {
          console.error("Salvage also failed:", salvageErr);
          // Refund single credit on failure
          await sbAdmin.rpc("refund_analysis_credit", { p_user_id: user.id }).catch(() => {});
          await sbAdmin
            .from("analyses")
            .update({
              status: "failed",
              ai_result: { error: "AI response truncated and parse failed", raw: rawText.slice(0, 500) },
            })
            .eq("id", analysis_id)
            .eq("user_id", user.id);
          return new Response(
            JSON.stringify({ ok: false, error: "AI 응답 파싱 실패 (응답 길이 초과)" }),
            { status: 500, headers },
          );
        }
      } else {
        // Refund single credit on failure
        await sbAdmin.rpc("refund_analysis_credit", { p_user_id: user.id }).catch(() => {});
        await sbAdmin
          .from("analyses")
          .update({
            status: "failed",
            ai_result: { error: "AI response parse failed", raw: rawText.slice(0, 500) },
          })
          .eq("id", analysis_id)
          .eq("user_id", user.id);
        return new Response(
          JSON.stringify({ ok: false, error: "AI 응답 파싱 실패" }),
          { status: 500, headers },
        );
      }
    }

    // Attach crawl metadata (include image for thumbnail)
    result.crawl_results = crawlResults.map((cr) => ({
      url: cr.url,
      success: cr.success,
      title: cr.title || "",
      image: cr.image || "",
      error: cr.error || "",
    }));
    // Set thumbnail from first successful crawl with og:image
    const firstImage = crawlResults.find((cr) => cr.success && cr.image);
    if (firstImage?.image) {
      result.thumbnail = firstImage.image;
    }
    result.language = language;
    result.analysis_version = "EF-v8-friendly";
    result.model_used = aiModel;
    result.analyzed_at = new Date().toISOString();
    result.input_data = {
      product_name_en,
      category,
      fob_price,
      moq,
      description,
      urls,
      file_urls,
      selling_points: selling_points.filter(Boolean),
      target_markets,
      existing_certs,
      brand_name,
      manufacturer,
      thumbnail: firstImage?.image || "",
    };

    await sbAdmin
      .from("analyses")
      .update({ status: "completed", ai_result: result })
      .eq("id", analysis_id)
      .eq("user_id", user.id);

    // Send analysis completion email to user
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
            target_markets: Array.isArray(result.target_markets) ? result.target_markets.join(", ") : "",
            export_score: result.export_score || "",
          },
        }),
      });
    } catch (emailErr) {
      console.error("Analysis email notification failed:", emailErr);
    }

    return new Response(
      JSON.stringify({ ok: true, result }),
      { status: 200, headers },
    );
  } catch (err) {
    console.error("analyze-export error:", err);
    return new Response(
      JSON.stringify({ ok: false, error: "서버 오류가 발생했습니다" }),
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
  const isEn = d.language === "en";
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

  return `${intro}

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
  }
}

## ${isEn ? "Rules" : "규칙"}
- ${isEn ? "ALL text fields must be in English. Output JSON only. Use real competitor names. No generalities. Write in friendly, clear consulting tone." : "한국어로 작성. JSON만 출력. 경쟁사 실명 사용. 일반론 금지. 친절하고 명확한 컨설팅 톤으로 작성."}
- ${isEn ? "Conservative scoring when information is insufficient. Max 3 global_competitors. Max 2 local_competitors." : "정보 부족 시 보수적 채점. global_competitors 최대 3개. local_competitors 최대 2개."}
- ${isEn ? "Max 5 cert_details — include ALL certifications needed for the recommended markets. market_analysis only for requested target markets." : "cert_details 최대 5개 — 추천 시장에서 필요한 모든 인증을 포함하세요. market_analysis는 요청된 타겟 시장만."}`;
}
