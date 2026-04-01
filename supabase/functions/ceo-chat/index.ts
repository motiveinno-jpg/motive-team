import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `너는 하준 PM이다. 채희웅 대표님의 첫 번째 AI 파트너.
항상 한글로, 친근하고 유능하게 대화한다.
대표님이 묻는 것에 직접적으로 답하고, 필요하면 팀원을 언급한다.
짧고 핵심적으로 답한다. 불필요한 인사말은 생략한다.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const headers = { ...corsHeaders, "Content-Type": "application/json" };

  try {
    const sbUrl = Deno.env.get("SUPABASE_URL")!;
    const sbServiceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY")!;

    // 인증 확인
    const token = req.headers.get("Authorization")?.replace("Bearer ", "") || "";
    const sbUser = createClient(sbUrl, sbServiceRole);
    const { data: { user }, error: authErr } = await sbUser.auth.getUser(token);

    if (authErr || !user) {
      return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), { status: 401, headers });
    }

    // 이메일 도메인 또는 admin 역할 확인
    const { data: userRow } = await sbUser.from("users").select("role, email").eq("id", user.id).single();
    const domain = (userRow?.email || user.email || "").split("@")[1] || "";
    const allowed = ["motiveinno.com", "mo-tive.com"].includes(domain) || userRow?.role === "admin";
    if (!allowed) {
      return new Response(JSON.stringify({ ok: false, error: "Forbidden" }), { status: 403, headers });
    }

    const body = await req.json();
    const { message, channel_id = "ceo-direct" } = body as { message: string; channel_id?: string };

    if (!message?.trim()) {
      return new Response(JSON.stringify({ ok: false, error: "Empty message" }), { status: 400, headers });
    }

    // 최근 대화 히스토리 로드 (최근 20개)
    const { data: history } = await sbUser
      .from("ceo_chat_messages")
      .select("role, content")
      .eq("channel_id", channel_id)
      .order("created_at", { ascending: true })
      .limit(20);

    // 사용자 메시지 저장
    await sbUser.from("ceo_chat_messages").insert({
      channel_id,
      role: "user",
      content: message,
      user_id: user.id,
    });

    // Claude API 호출
    const claudeMessages = [
      ...(history || []).map((h) => ({ role: h.role, content: h.content })),
      { role: "user", content: message },
    ];

    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: Deno.env.get("CLAUDE_MODEL") ?? "claude-sonnet-4-6",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: claudeMessages,
      }),
    });

    if (!claudeRes.ok) {
      const errText = await claudeRes.text();
      console.error("Claude API error:", errText);
      throw new Error("Claude API failed");
    }

    const claudeData = await claudeRes.json();
    const reply = claudeData.content?.[0]?.text || "응답 생성 실패";

    // AI 응답 저장 (Realtime으로 클라이언트에 푸시됨)
    await sbUser.from("ceo_chat_messages").insert({
      channel_id,
      role: "assistant",
      content: reply,
      user_id: null,
    });

    return new Response(JSON.stringify({ ok: true, reply }), { status: 200, headers });

  } catch (err) {
    console.error("ceo-chat error:", (err as Error).message);
    return new Response(
      JSON.stringify({ ok: false, error: "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요." }),
      { status: 500, headers },
    );
  }
});
