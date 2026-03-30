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

const RATE_LIMITS = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW = 24 * 60 * 60 * 1000;

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

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!checkRateLimit(user.id)) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
        {
          status: 429,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const body = await req.json();
    const { email, type, inviter_name, inviter_company } = body;

    if (!email || !type) {
      return new Response(JSON.stringify({ error: "email and type required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Generate referral code from user ID
    const referralCode = user.id.slice(0, 8).toUpperCase();

    // Create invitation record
    const { data: invitation, error: insertErr } = await supabase
      .from("invitations")
      .insert({
        inviter_id: user.id,
        invitee_email: email,
        invite_type: type,
        referral_code: referralCode,
        status: "pending",
      })
      .select()
      .single();

    if (insertErr) {
      console.error("Insert error:", insertErr);
      return new Response(JSON.stringify({ error: "An error occurred. Please try again." }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Update user's referral_code if not set
    await supabase
      .from("users")
      .update({ referral_code: referralCode })
      .eq("id", user.id)
      .is("referral_code", null);

    // Build invite link
    const baseUrl = "https://whistle-ai.com";
    const inviteLink = type === "buyer"
      ? `${baseUrl}/buyer?ref=${referralCode}&invite=${invitation.invite_token}`
      : `${baseUrl}/app?ref=${referralCode}&invite=${invitation.invite_token}`;

    // Send actual email via Resend
    let emailSent = false;
    if (resendKey) {
      const senderName = inviter_name || inviter_company || "A colleague";
      const emailSubject = type === "buyer"
        ? `${senderName} invited you to source products on Whistle AI`
        : `${senderName} invited you to join Whistle AI for exporters`;

      const emailBody = type === "buyer"
        ? `<div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:600px;margin:0 auto;padding:32px">
            <div style="text-align:center;margin-bottom:32px">
              <h1 style="font-size:28px;font-weight:800;background:linear-gradient(135deg,#00d4ff,#7C4DFF);-webkit-background-clip:text;-webkit-text-fill-color:transparent">Whistle AI</h1>
            </div>
            <h2 style="font-size:20px;font-weight:700;margin-bottom:16px">You're Invited!</h2>
            <p style="font-size:15px;color:#555;line-height:1.7;margin-bottom:24px">
              <strong>${senderName}</strong> has invited you to discover and source premium Korean products through Whistle AI — the AI-powered export management platform.
            </p>
            <div style="padding:20px;border-radius:12px;background:#f8f9fa;margin-bottom:24px">
              <div style="font-size:14px;color:#333;line-height:1.8">
                ✅ Browse 100+ verified Korean manufacturers<br>
                ✅ Secure escrow payments with buyer protection<br>
                ✅ AI-powered product matching & market analysis<br>
                ✅ Real-time deal tracking & document management
              </div>
            </div>
            <div style="text-align:center;margin-bottom:32px">
              <a href="${inviteLink}" style="display:inline-block;padding:14px 40px;background:linear-gradient(135deg,#00d4ff,#7C4DFF);color:#fff;text-decoration:none;border-radius:10px;font-size:16px;font-weight:700">Start Sourcing →</a>
            </div>
            <p style="font-size:12px;color:#999;text-align:center">
              This invitation was sent by ${senderName} via Whistle AI.<br>
              If you didn't expect this email, you can safely ignore it.
            </p>
          </div>`
        : `<div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:600px;margin:0 auto;padding:32px">
            <div style="text-align:center;margin-bottom:32px">
              <h1 style="font-size:28px;font-weight:800;background:linear-gradient(135deg,#00d4ff,#7C4DFF);-webkit-background-clip:text;-webkit-text-fill-color:transparent">Whistle AI</h1>
            </div>
            <h2 style="font-size:20px;font-weight:700;margin-bottom:16px">수출을 함께 하실 제조사를 초대합니다</h2>
            <p style="font-size:15px;color:#555;line-height:1.7;margin-bottom:24px">
              <strong>${senderName}</strong>님이 AI 수출 통합 관리 플랫폼 Whistle AI에 초대했습니다.
            </p>
            <div style="padding:20px;border-radius:12px;background:#f8f9fa;margin-bottom:24px">
              <div style="font-size:14px;color:#333;line-height:1.8">
                ✅ AI 수출 분석 리포트 — 수출 준비도 자동 진단<br>
                ✅ 글로벌 바이어 AI 매칭 — 15개국+ 바이어 DB<br>
                ✅ 에스크로 안전결제 — 수수료 2.5%<br>
                ✅ 수출 서류 자동 생성 — PI, CI, PL, CO, BL
              </div>
            </div>
            <div style="text-align:center;margin-bottom:32px">
              <a href="${inviteLink}" style="display:inline-block;padding:14px 40px;background:linear-gradient(135deg,#00d4ff,#7C4DFF);color:#fff;text-decoration:none;border-radius:10px;font-size:16px;font-weight:700">무료로 시작하기 →</a>
            </div>
            <p style="font-size:12px;color:#999;text-align:center">
              이 초대는 ${senderName}님이 Whistle AI를 통해 보냈습니다.
            </p>
          </div>`;

      try {
        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendKey}`,
          },
          body: JSON.stringify({
            from: "Whistle AI <noreply@whistle-ai.com>",
            to: [email],
            subject: emailSubject,
            html: emailBody,
          }),
        });

        if (emailRes.ok) {
          emailSent = true;
          await supabase
            .from("invitations")
            .update({
              email_sent: true,
              email_sent_at: new Date().toISOString(),
            })
            .eq("id", invitation.id);
        } else {
          const errData = await emailRes.json();
          console.error("Resend error:", errData);
        }
      } catch (emailErr) {
        console.error("Email send failed:", emailErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        invitation_id: invitation.id,
        invite_token: invitation.invite_token,
        invite_link: inviteLink,
        email_sent: emailSent,
        referral_code: referralCode,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (err: any) {
    console.error("Send invite error:", err);
    return new Response(
      JSON.stringify({ error: "An error occurred. Please try again." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
