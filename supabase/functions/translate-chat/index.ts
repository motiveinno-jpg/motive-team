import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://whistle-ai.com",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LANG_NAMES: Record<string, string> = {
  ko: "Korean",
  en: "English",
  zh: "Chinese (Simplified)",
  ja: "Japanese",
  es: "Spanish",
  fr: "French",
  de: "German",
  pt: "Portuguese",
  ar: "Arabic",
  vi: "Vietnamese",
  th: "Thai",
  id: "Indonesian",
  ms: "Malay",
  ru: "Russian",
  tr: "Turkish",
  hi: "Hindi",
  it: "Italian",
  nl: "Dutch",
  pl: "Polish",
  sv: "Swedish",
};

// Per-user rate limiting (resets on cold start)
const userRateMap = new Map<string, { count: number; resetAt: number }>();
const TRANSLATE_RATE_LIMIT = 30;
const TRANSLATE_RATE_WINDOW_MS = 60_000; // 1 minute

function checkUserRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = userRateMap.get(userId);
  if (!entry || now > entry.resetAt) {
    userRateMap.set(userId, { count: 1, resetAt: now + TRANSLATE_RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= TRANSLATE_RATE_LIMIT) return false;
  entry.count++;
  return true;
}

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

    // Rate limit per user
    if (!checkUserRateLimit(user.id)) {
      return new Response(
        JSON.stringify({ ok: false, error: "Rate limit exceeded. Please wait a moment." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "60" } },
      );
    }

    // Create user-scoped client for RLS operations
    const sbAnon = Deno.env.get("CUSTOM_ANON_KEY") || Deno.env.get("SUPABASE_ANON_KEY")!;
    const sb = createClient(sbUrl, sbAnon, {
      global: { headers: { Authorization: authHeader } },
    });

    const body = await req.json();
    const text = String(body.text || "").substring(0, 5000);
    const target = String(body.target || "").substring(0, 10);

    if (!text || !target) {
      return new Response(
        JSON.stringify({ ok: false, error: "text and target required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) {
      return new Response(
        JSON.stringify({ ok: false, error: "API key not set" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const langName = LANG_NAMES[target] || target;

    const aiController = new AbortController();
    const aiTimeout = setTimeout(() => aiController.abort(), 15000);

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 500,
        messages: [
          {
            role: "user",
            content: `Translate to ${langName}. Return ONLY the translation, nothing else. Keep tone natural and professional for business context.\n\n${text}`,
          },
        ],
      }),
      signal: aiController.signal,
    }).finally(() => clearTimeout(aiTimeout));

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("Anthropic error:", resp.status, errText);
      return new Response(
        JSON.stringify({ ok: false, error: "Translation API error" }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const aiResp = await resp.json();
    const translated = aiResp.content?.[0]?.text || "";

    return new Response(
      JSON.stringify({ ok: true, translated }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("translate-chat error:", err);
    return new Response(
      JSON.stringify({ ok: false, error: "Server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
