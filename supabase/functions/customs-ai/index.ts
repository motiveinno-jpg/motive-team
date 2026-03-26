import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://whistle-ai.com",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MAX_CONTEXT_ENTRIES = 5;
const MAX_CONTEXT_LENGTH = 4000;

const RATE_LIMITS = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW = 60 * 60 * 1000;

function checkRateLimit(
  userId: string,
  max: number = RATE_LIMIT_MAX,
  windowMs: number = RATE_LIMIT_WINDOW,
): boolean {
  const now = Date.now();
  const entry = RATE_LIMITS.get(userId);
  if (!entry || now > entry.resetAt) {
    RATE_LIMITS.set(userId, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count++;
  return true;
}

interface KnowledgeEntry {
  id: string;
  title: string;
  content: string;
  category: string;
  country: string | null;
  metadata: Record<string, unknown>;
  rank?: number;
}

/**
 * Search customs_knowledge using text-based search (ILIKE + full-text).
 * Falls back to category-based retrieval when text search yields no results.
 */
async function searchKnowledge(
  sbAdmin: ReturnType<typeof createClient>,
  query: string,
  category?: string,
  country?: string,
): Promise<KnowledgeEntry[]> {
  // Extract meaningful keywords from the query
  const keywords = extractKeywords(query);

  // Try full-text search via the database function
  if (keywords.length > 0) {
    const searchQuery = keywords.join(" ");
    const { data, error } = await sbAdmin.rpc("search_customs_knowledge", {
      query_text: searchQuery,
      match_count: MAX_CONTEXT_ENTRIES,
      filter_category: category || null,
      filter_country: country || null,
    });

    if (!error && data && data.length > 0) {
      return data as KnowledgeEntry[];
    }
  }

  // Fallback: try individual keyword ILIKE search
  for (const keyword of keywords) {
    let q = sbAdmin
      .from("customs_knowledge")
      .select("id, title, content, category, country, metadata")
      .or(`title.ilike.%${keyword.replace(/[%_,.()"']/g, "")}%,content.ilike.%${keyword.replace(/[%_,.()"']/g, "")}%`)
      .limit(MAX_CONTEXT_ENTRIES);

    if (category) {
      q = q.eq("category", category);
    }
    if (country) {
      q = q.eq("country", country);
    }

    const { data, error } = await q;
    if (!error && data && data.length > 0) {
      return data as KnowledgeEntry[];
    }
  }

  // Last fallback: get recent entries by category if detected
  const detectedCategory = detectCategory(query);
  if (detectedCategory) {
    const { data, error } = await sbAdmin
      .from("customs_knowledge")
      .select("id, title, content, category, country, metadata")
      .eq("category", detectedCategory)
      .limit(MAX_CONTEXT_ENTRIES)
      .order("created_at", { ascending: false });

    if (!error && data && data.length > 0) {
      return data as KnowledgeEntry[];
    }
  }

  return [];
}

/** Extract meaningful search keywords from the user query. */
function extractKeywords(query: string): string[] {
  const stopWords = new Set([
    "이", "가", "은", "는", "을", "를", "에", "의", "와", "과", "도", "로",
    "으로", "에서", "까지", "부터", "대해", "대한", "관련", "관하여",
    "어떻게", "무엇", "어디", "언제", "왜", "얼마", "어떤",
    "하는", "하고", "하면", "하여", "합니다", "입니다", "있는", "없는",
    "the", "is", "are", "what", "how", "for", "and", "or", "in", "to", "of",
    "알려주세요", "알려줘", "설명해주세요", "설명해줘", "해주세요",
  ]);

  const words = query
    .replace(/[?!.,;:'"()[\]{}]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !stopWords.has(w));

  return [...new Set(words)].slice(0, 8);
}

/** Detect the most likely knowledge category from the query. */
function detectCategory(query: string): string | null {
  const lower = query.toLowerCase();

  if (/fta|자유무역|관세.*특혜|원산지.*증명|원산지.*기준|협정/.test(lower)) {
    return "fta";
  }
  if (/hs\s*코드|hs코드|세번|품목분류|관세율표/.test(lower)) {
    return "hs_code";
  }
  if (/인증|ce\s*마킹|fda|ccc|pse|psc|certification/.test(lower)) {
    return "certification";
  }
  if (/규제|라벨|라벨링|검역|위생|비관세|통관/.test(lower)) {
    return "regulation";
  }
  if (/관세법|통칙|환급|aeo|수출신고|수출통관/.test(lower)) {
    return "customs_law";
  }

  return null;
}

/** Detect the target country from the query. */
function detectCountry(query: string): string | null {
  const countryMap: Record<string, string> = {
    "미국": "US", "america": "US", "usa": "US", "us": "US",
    "일본": "JP", "japan": "JP",
    "중국": "CN", "china": "CN",
    "eu": "EU", "유럽": "EU", "독일": "EU", "프랑스": "EU",
    "베트남": "VN", "vietnam": "VN",
    "태국": "TH", "thailand": "TH",
    "인도네시아": "ID", "indonesia": "ID",
    "싱가포르": "SG", "singapore": "SG",
    "호주": "AU", "australia": "AU",
    "캐나다": "CA", "canada": "CA",
    "인도": "IN", "india": "IN",
    "영국": "GB", "uk": "GB",
  };

  const lower = query.toLowerCase();
  for (const [keyword, code] of Object.entries(countryMap)) {
    if (lower.includes(keyword)) {
      return code;
    }
  }
  return null;
}

/** Build RAG context string from knowledge entries. */
function buildContext(entries: KnowledgeEntry[]): string {
  if (entries.length === 0) return "";

  let context = "\n\n## 참고 자료 (관세 지식 데이터베이스)\n";
  let totalLength = 0;

  for (const entry of entries) {
    const block = `\n### ${entry.title} [${entry.category}${entry.country ? ` | ${entry.country}` : ""}]\n${entry.content}\n`;

    if (totalLength + block.length > MAX_CONTEXT_LENGTH) {
      // Truncate to fit within budget
      const remaining = MAX_CONTEXT_LENGTH - totalLength;
      if (remaining > 200) {
        context += block.substring(0, remaining) + "\n...(truncated)";
      }
      break;
    }

    context += block;
    totalLength += block.length;
  }

  return context;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ ok: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
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
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!checkRateLimit(user.id)) {
      return new Response(
        JSON.stringify({ ok: false, error: "Rate limit exceeded. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json();
    const prompt = String(body.prompt || "").substring(0, 2000);
    const question = String(body.question || "").substring(0, 2000);
    const product = String(body.product || "").substring(0, 500);
    const country = String(body.country || "").substring(0, 100);

    if (!question && !prompt) {
      return new Response(
        JSON.stringify({ ok: false, error: "질문을 입력하세요" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) {
      return new Response(
        JSON.stringify({ ok: false, error: "API 키가 설정되지 않았습니다." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const userMsg = prompt || question;

    // RAG: search knowledge base for relevant context
    const detectedCategory = detectCategory(userMsg);
    const detectedCountry = country || detectCountry(userMsg);

    let knowledgeEntries: KnowledgeEntry[] = [];
    let ragContext = "";

    try {
      knowledgeEntries = await searchKnowledge(
        sbAdmin,
        userMsg,
        detectedCategory || undefined,
        detectedCountry || undefined,
      );
      ragContext = buildContext(knowledgeEntries);
    } catch (ragErr) {
      // RAG failure should not block the response — fall back to pure prompt
      console.error("RAG search failed, falling back to prompt-only:", ragErr);
    }

    const systemPrompt = `You are a Korean export customs specialist AI (관세사 AI). Answer in Korean.

Rules:
- Give practical, actionable information for Korean exporters
- HS codes: provide 6-digit (international) + 4-digit (Korea-specific) format
- For FTA: specify origin determination criteria and certificate types
- Distinguish between basic tariff rates and FTA preferential rates
- Include required permits, quarantine, and labeling requirements
- Be concise but thorough. Use bullet points and structured formatting.
- If uncertain, say so clearly rather than guessing.
- When reference material is provided below, prioritize that information and cite specific details from it.
- If the reference material does not cover the question, use your general knowledge but note that the information should be verified.
${ragContext}`;

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
        system: systemPrompt,
        messages: [{ role: "user", content: userMsg }],
      }),
      signal: aiController.signal,
    }).finally(() => clearTimeout(aiTimeout));

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("Anthropic API error:", resp.status, errText);
      return new Response(
        JSON.stringify({
          ok: false,
          error: `AI API 오류 (${resp.status})`,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const aiResp = await resp.json();
    const answer = aiResp.content?.[0]?.text || "";

    return new Response(
      JSON.stringify({
        ok: true,
        answer,
        sources: knowledgeEntries.map((e) => ({
          id: e.id,
          title: e.title,
          category: e.category,
          country: e.country,
        })),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("customs-ai error:", err);
    return new Response(
      JSON.stringify({ ok: false, error: "An error occurred. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
