import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const RESEND_API = "https://api.resend.com/emails";
const FROM_EMAIL = "Whistle AI <noreply@whistle-ai.com>";
const FROM_EMAIL_FALLBACK = "Whistle AI <onboarding@resend.dev>";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Content-Type": "application/json",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS });
}

function generateToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  const arr = new Uint8Array(48);
  crypto.getRandomValues(arr);
  for (const byte of arr) {
    token += chars[byte % chars.length];
  }
  return token;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: CORS });
  }

  try {
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const resendKey = Deno.env.get("RESEND_API_KEY");

    // Auth: service_role or authenticated admin
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) return json({ error: "Unauthorized" }, 401);

    const sb = createClient(supabaseUrl, serviceKey);

    if (token !== serviceKey) {
      const { data: { user } } = await sb.auth.getUser(token);
      if (!user) return json({ error: "Unauthorized" }, 401);
      const { data: userData } = await sb.from("users").select("role").eq("id", user.id).single();
      if (!userData || userData.role !== "admin") return json({ error: "Admin only" }, 403);
    }

    if (!resendKey) return json({ error: "RESEND_API_KEY not configured" }, 500);

    const body = await req.json();
    const { action } = body;

    // ── ACTION: send_contract ──
    // Sends contract documents via email with a signing link
    if (action === "send_contract") {
      const {
        recipient_email,
        recipient_name,
        company_name,
        company_id,
        template_names,
        custom_message,
        expires_days = 14,
        sent_by,
      } = body;

      if (!recipient_email || !template_names?.length) {
        return json({ error: "recipient_email and template_names are required" }, 400);
      }

      // Generate unique signing token
      const sigToken = generateToken();
      const expiresAt = new Date(Date.now() + expires_days * 24 * 60 * 60 * 1000).toISOString();

      // Create signature_request record
      const { data: sigReq, error: sigErr } = await sb.from("signature_requests").insert({
        token: sigToken,
        status: "pending",
        company_id: company_id || null,
        template_names: template_names,
        signature_data: {
          company_name: company_name || "",
          signer_name: recipient_name || "",
          signer_email: recipient_email,
          custom_message: custom_message || "",
          documents: template_names.map((t: string) => ({
            template: t,
            label: getDocLabel(t),
          })),
        },
        expires_at: expiresAt,
        sent_by: sent_by || "admin",
        reminder_count: 0,
      }).select().single();

      if (sigErr) {
        console.error("Failed to create signature request:", sigErr);
        return json({ error: "Failed to create signature request: " + sigErr.message }, 500);
      }

      // Build signing URL
      const siteUrl = Deno.env.get("SITE_URL") || "https://whistle-ai.com";
      const signUrl = `${siteUrl}/sign-document.html?token=${sigToken}`;

      // Build email HTML
      const docListHtml = template_names.map((t: string) =>
        `<li style="padding:6px 0;color:#e0e0e0">${getDocLabel(t)}</li>`
      ).join("");

      const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<div style="max-width:600px;margin:0 auto;padding:40px 20px">
  <div style="background:#111;border:1px solid #222;border-radius:16px;overflow:hidden">
    <!-- Header -->
    <div style="padding:32px 32px 24px;border-bottom:1px solid #1a1a1a;background:linear-gradient(135deg,rgba(0,212,255,.06),rgba(0,136,255,.04))">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
        <div style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#00d4ff,#0088ff);display:inline-flex;align-items:center;justify-content:center;font-size:18px;font-weight:900;color:#0a0a0a">W</div>
        <span style="font-size:18px;font-weight:800;color:#fff;letter-spacing:-0.5px">Whistle AI</span>
      </div>
      <h1 style="margin:0;font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.5px">서명 요청 / Signature Request</h1>
      <p style="margin:8px 0 0;font-size:14px;color:#888">${company_name || "Whistle AI"} 로부터 서류 서명 요청이 도착했습니다.</p>
    </div>
    <!-- Body -->
    <div style="padding:28px 32px">
      <p style="color:#ccc;font-size:14px;line-height:1.8;margin:0 0 20px">
        안녕하세요${recipient_name ? " <strong style='color:#fff'>" + recipient_name + "</strong>" : ""}님,<br><br>
        아래 서류에 대한 전자서명을 요청드립니다. 버튼을 클릭하여 서류를 확인하고 서명해 주세요.
        ${custom_message ? '<br><br><em style="color:#aaa">' + custom_message + "</em>" : ""}
      </p>
      <!-- Document List -->
      <div style="background:#0a0a0a;border:1px solid #222;border-radius:12px;padding:16px 20px;margin-bottom:24px">
        <div style="font-size:12px;color:#666;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">서명 대상 서류</div>
        <ul style="margin:0;padding:0 0 0 20px;list-style:disc">${docListHtml}</ul>
      </div>
      <!-- CTA Button -->
      <div style="text-align:center;margin:28px 0">
        <a href="${signUrl}" style="display:inline-block;padding:14px 40px;background:linear-gradient(135deg,#00d4ff,#0088ff);color:#000;font-size:15px;font-weight:700;border-radius:12px;text-decoration:none;letter-spacing:-0.3px">서류 확인 및 서명하기</a>
      </div>
      <!-- Info -->
      <div style="background:rgba(255,184,0,.06);border:1px solid rgba(255,184,0,.15);border-radius:10px;padding:14px 16px;margin-bottom:20px">
        <div style="font-size:12px;color:#ffb800;font-weight:600;margin-bottom:4px">⏰ 서명 만료일</div>
        <div style="font-size:13px;color:#999">${new Date(expiresAt).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })} 까지 서명해 주세요.</div>
      </div>
      <p style="color:#666;font-size:12px;line-height:1.6;margin:0">
        본 이메일은 전자서명법 제2조에 근거하여 발송되었습니다.<br>
        링크를 통해 서명하시면 법적 효력이 있는 전자서명으로 간주됩니다.<br>
        문의: <a href="mailto:creative@mo-tive.com" style="color:#00d4ff">creative@mo-tive.com</a>
      </p>
    </div>
    <!-- Footer -->
    <div style="padding:20px 32px;border-top:1px solid #1a1a1a;background:#0a0a0a">
      <p style="margin:0;font-size:11px;color:#444;text-align:center">
        © 2026 (주)모티브이노베이션 · MOTIVE Global, Inc.<br>
        경기도 화성시 동탄중앙로 220, B동 1903호
      </p>
    </div>
  </div>
</div>
</body>
</html>`;

      // Send via Resend
      const emailRes = await fetch(RESEND_API, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [recipient_email],
          subject: `[Whistle AI] 서명 요청 — ${template_names.map((t: string) => getDocLabel(t)).join(", ")}`,
          html: emailHtml,
        }),
      });

      const emailResult = await emailRes.json();

      if (!emailRes.ok) {
        // Retry with fallback email
        const retryRes = await fetch(RESEND_API, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: FROM_EMAIL_FALLBACK,
            to: [recipient_email],
            subject: `[Whistle AI] 서명 요청 — ${template_names.map((t: string) => getDocLabel(t)).join(", ")}`,
            html: emailHtml,
          }),
        });
        const retryResult = await retryRes.json();
        if (!retryRes.ok) {
          return json({ error: "Email send failed", detail: retryResult }, 500);
        }
      }

      // Update signature_request with sent timestamp
      await sb.from("signature_requests").update({
        reminder_sent_at: new Date().toISOString(),
      }).eq("id", sigReq.id);

      return json({
        success: true,
        signature_request_id: sigReq.id,
        token: sigToken,
        sign_url: signUrl,
        expires_at: expiresAt,
        email_sent_to: recipient_email,
      });
    }

    // ── ACTION: send_reminder ──
    // Resend signing reminder for pending requests
    if (action === "send_reminder") {
      const { signature_request_id } = body;
      if (!signature_request_id) return json({ error: "signature_request_id required" }, 400);

      const { data: sigReq, error } = await sb.from("signature_requests")
        .select("*")
        .eq("id", signature_request_id)
        .single();

      if (error || !sigReq) return json({ error: "Signature request not found" }, 404);
      if (sigReq.status === "signed") return json({ error: "Already signed" }, 400);
      if (sigReq.expires_at && new Date(sigReq.expires_at) < new Date()) {
        return json({ error: "Request has expired" }, 400);
      }

      const sigData = sigReq.signature_data || {};
      const recipientEmail = sigData.signer_email;
      if (!recipientEmail) return json({ error: "No recipient email found" }, 400);

      const siteUrl = Deno.env.get("SITE_URL") || "https://whistle-ai.com";
      const signUrl = `${siteUrl}/sign-document.html?token=${sigReq.token}`;
      const reminderCount = (sigReq.reminder_count || 0) + 1;

      const reminderHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<div style="max-width:600px;margin:0 auto;padding:40px 20px">
  <div style="background:#111;border:1px solid #222;border-radius:16px;overflow:hidden">
    <div style="padding:28px 32px;border-bottom:1px solid #1a1a1a;background:linear-gradient(135deg,rgba(255,184,0,.06),rgba(255,152,0,.04))">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
        <div style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#00d4ff,#0088ff);display:inline-flex;align-items:center;justify-content:center;font-size:18px;font-weight:900;color:#0a0a0a">W</div>
        <span style="font-size:18px;font-weight:800;color:#fff">Whistle AI</span>
      </div>
      <h1 style="margin:0;font-size:20px;font-weight:800;color:#ffb800">⏰ 서명 리마인더 (${reminderCount}차)</h1>
    </div>
    <div style="padding:28px 32px">
      <p style="color:#ccc;font-size:14px;line-height:1.8;margin:0 0 20px">
        아직 서명이 완료되지 않은 서류가 있습니다.<br>
        만료일 전에 서명을 완료해 주세요.
      </p>
      <div style="text-align:center;margin:24px 0">
        <a href="${signUrl}" style="display:inline-block;padding:14px 40px;background:linear-gradient(135deg,#ffb800,#ff9500);color:#000;font-size:15px;font-weight:700;border-radius:12px;text-decoration:none">서명하러 가기</a>
      </div>
      <div style="font-size:12px;color:#666;text-align:center">
        만료일: ${sigReq.expires_at ? new Date(sigReq.expires_at).toLocaleDateString("ko-KR") : "미정"}
      </div>
    </div>
    <div style="padding:16px 32px;border-top:1px solid #1a1a1a;background:#0a0a0a">
      <p style="margin:0;font-size:11px;color:#444;text-align:center">© 2026 (주)모티브이노베이션</p>
    </div>
  </div>
</div>
</body>
</html>`;

      await fetch(RESEND_API, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [recipientEmail],
          subject: `[리마인더] 서명 미완료 서류가 있습니다 — Whistle AI`,
          html: reminderHtml,
        }),
      });

      await sb.from("signature_requests").update({
        reminder_sent_at: new Date().toISOString(),
        reminder_count: reminderCount,
      }).eq("id", signature_request_id);

      return json({ success: true, reminder_count: reminderCount });
    }

    // ── ACTION: list_requests ──
    // List signature requests with status filtering
    if (action === "list_requests") {
      const { status, limit = 50 } = body;
      let query = sb.from("signature_requests")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (status) query = query.eq("status", status);

      const { data, error } = await query;
      if (error) return json({ error: error.message }, 500);
      return json({ data });
    }

    // ── ACTION: cancel_request ──
    if (action === "cancel_request") {
      const { signature_request_id } = body;
      if (!signature_request_id) return json({ error: "signature_request_id required" }, 400);

      const { error } = await sb.from("signature_requests")
        .update({ status: "cancelled" })
        .eq("id", signature_request_id);

      if (error) return json({ error: error.message }, 500);
      return json({ success: true });
    }

    return json({ error: "Unknown action: " + action }, 400);
  } catch (err) {
    console.error("send-contract-email error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});

/** Map template filename to human-readable label */
function getDocLabel(template: string): string {
  const labels: Record<string, string> = {
    "sp-contract-customs-broker": "관세사 업무위탁 계약서",
    "sp-contract-forwarder": "포워더 업무위탁 계약서",
    "sp-terms-of-service": "서비스 이용약관",
    "sp-privacy-consent": "개인정보 처리동의서",
    "sp-nda": "비밀유지계약서 (NDA)",
    "settlement-process-guide": "정산 프로세스 가이드",
    "refund-policy": "환불/취소 규정",
    "fee-structure-guide": "수수료 체계 가이드",
    "dispute-resolution-policy": "분쟁 해결 정책",
    "settlement-error-manual": "정산 오류 대응 매뉴얼",
    "sp-onboarding-guide": "SP 온보딩 가이드",
    "sp-evaluation-criteria": "SP 평가 기준표",
    "deal-stage-operation-manual": "딜 단계별 운영 매뉴얼",
    "category-document-checklist": "카테고리별 서류 체크리스트",
    "emergency-response-manual": "긴급상황 대응 매뉴얼",
  };
  return labels[template] || template;
}
