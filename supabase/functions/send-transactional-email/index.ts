import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://whistle-ai.com",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const FROM_EMAIL = "Whistle AI <noreply@whistle-ai.com>";

// ─── Email Templates ───────────────────────────────────────

interface EmailTemplate {
  subject: string;
  html: string;
}

function baseLayout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:40px 0">
<tr><td align="center">
  <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
    <tr><td style="background:linear-gradient(135deg,#1a1a2e,#16213e);padding:32px 40px;text-align:center">
      <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700">
        <span style="color:#F97316">W</span>histle AI
      </h1>
    </td></tr>
    <tr><td style="padding:32px 40px">
      <h2 style="margin:0 0 16px;color:#1a1a2e;font-size:20px">${title}</h2>
      ${body}
    </td></tr>
    <tr><td style="padding:24px 40px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center">
      <p style="margin:0;color:#9ca3af;font-size:12px">
        &copy; 2026 MOTIVE Innovation Inc. &middot; MOTIVE Global, Inc.<br>
        <a href="https://whistle-ai.com/terms" style="color:#6b7280">Terms</a> &middot;
        <a href="https://whistle-ai.com/privacy" style="color:#6b7280">Privacy</a> &middot;
        <a href="https://whistle-ai.com/refund" style="color:#6b7280">Refund</a>
      </p>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;
}

function ctaButton(text: string, url: string): string {
  return `<div style="text-align:center;margin:24px 0">
    <a href="${url}" style="display:inline-block;padding:12px 32px;background:linear-gradient(135deg,#F97316,#FB923C);color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px">${text}</a>
  </div>`;
}

function getTemplate(
  type: string,
  data: Record<string, string>,
  lang: string
): EmailTemplate {
  const isKo = lang === "ko";
  const appUrl = "https://whistle-ai.com/app";

  switch (type) {
    case "welcome":
      return {
        subject: isKo
          ? "Whistle AI에 오신 것을 환영합니다!"
          : "Welcome to Whistle AI!",
        html: baseLayout(
          isKo ? "환영합니다! 🎉" : "Welcome! 🎉",
          `<p style="color:#4b5563;line-height:1.6">${
            isKo
              ? `${data.name || "회원"}님, Whistle AI에 가입해 주셔서 감사합니다.<br><br>
                 무료 AI 수출 분석 1회가 제공됩니다. 제품 사진 한 장으로 HS코드, 타겟 시장, 가격 전략까지 60초 안에 받아보세요.`
              : `Thank you for joining Whistle AI, ${data.name || "there"}!<br><br>
                 You have 1 free AI export analysis. Upload a product photo to get HS codes, target markets, and pricing strategy in under 60 seconds.`
          }</p>
          ${ctaButton(isKo ? "첫 분석 시작하기" : "Start Your First Analysis", appUrl + "#analysis")}
          <p style="color:#9ca3af;font-size:13px">${
            isKo
              ? "질문이 있으시면 support@whistle-ai.com으로 문의해 주세요."
              : "Questions? Contact us at support@whistle-ai.com"
          }</p>`
        ),
      };

    case "payment_confirmation":
      return {
        subject: isKo
          ? `결제 확인 — ${data.currency} ${data.amount}`
          : `Payment Confirmed — ${data.currency} ${data.amount}`,
        html: baseLayout(
          isKo ? "결제가 완료되었습니다 ✅" : "Payment Confirmed ✅",
          `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0">
            <table width="100%" style="font-size:14px;color:#4b5563">
              <tr><td style="padding:4px 0"><strong>${isKo ? "금액" : "Amount"}:</strong></td><td style="text-align:right">${data.currency} ${data.amount}</td></tr>
              <tr><td style="padding:4px 0"><strong>${isKo ? "유형" : "Type"}:</strong></td><td style="text-align:right">${data.payment_type || "Payment"}</td></tr>
              <tr><td style="padding:4px 0"><strong>${isKo ? "날짜" : "Date"}:</strong></td><td style="text-align:right">${data.date || new Date().toISOString().split("T")[0]}</td></tr>
              ${data.plan ? `<tr><td style="padding:4px 0"><strong>${isKo ? "플랜" : "Plan"}:</strong></td><td style="text-align:right">${data.plan}</td></tr>` : ""}
            </table>
          </div>
          ${ctaButton(isKo ? "대시보드로 이동" : "Go to Dashboard", appUrl)}
          <p style="color:#9ca3af;font-size:13px">${
            isKo
              ? "영수증은 Stripe 결제 포털에서 확인하실 수 있습니다."
              : "You can view your receipt in the Stripe billing portal."
          }</p>`
        ),
      };

    case "analysis_complete":
      return {
        subject: isKo
          ? `AI 분석 완료 — ${data.product_name || "제품"}`
          : `AI Analysis Complete — ${data.product_name || "Product"}`,
        html: baseLayout(
          isKo ? "AI 분석이 완료되었습니다 📊" : "AI Analysis Complete 📊",
          `<p style="color:#4b5563;line-height:1.6">${
            isKo
              ? `<strong>${data.product_name || "제품"}</strong>의 AI 수출 분석이 완료되었습니다.`
              : `Your AI export analysis for <strong>${data.product_name || "your product"}</strong> is ready.`
          }</p>
          <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;margin:16px 0">
            ${data.hs_code ? `<p style="margin:4px 0;color:#4b5563"><strong>HS Code:</strong> ${data.hs_code}</p>` : ""}
            ${data.target_markets ? `<p style="margin:4px 0;color:#4b5563"><strong>${isKo ? "추천 시장" : "Target Markets"}:</strong> ${data.target_markets}</p>` : ""}
            ${data.export_score ? `<p style="margin:4px 0;color:#4b5563"><strong>${isKo ? "수출 적합도" : "Export Score"}:</strong> ${data.export_score}/100</p>` : ""}
          </div>
          ${ctaButton(isKo ? "전체 보고서 보기" : "View Full Report", appUrl + "#analysis")}
          <p style="color:#9ca3af;font-size:13px">${
            isKo
              ? "보고서는 대시보드에서 언제든 다시 확인할 수 있습니다."
              : "You can access this report anytime from your dashboard."
          }</p>`
        ),
      };

    case "buyer_matched":
      return {
        subject: isKo
          ? `새로운 바이어 매칭 — ${data.buyer_name || "Buyer"}`
          : `New Buyer Match — ${data.buyer_name || "Buyer"}`,
        html: baseLayout(
          isKo ? "새로운 바이어가 매칭되었습니다 🤝" : "New Buyer Match 🤝",
          `<p style="color:#4b5563;line-height:1.6">${
            isKo
              ? `<strong>${data.buyer_name || "바이어"}</strong>${data.buyer_country ? " (" + data.buyer_country + ")" : ""}가 관심을 보였습니다.`
              : `<strong>${data.buyer_name || "A buyer"}</strong>${data.buyer_country ? " from " + data.buyer_country : ""} is interested in your product.`
          }</p>
          ${data.product_name ? `<p style="color:#4b5563"><strong>${isKo ? "관심 제품" : "Product"}:</strong> ${data.product_name}</p>` : ""}
          ${ctaButton(isKo ? "바이어 확인하기" : "View Buyer Details", appUrl + "#deals")}
          <p style="color:#9ca3af;font-size:13px">${
            isKo
              ? "24시간 이내 응답하면 매칭 성사율이 3배 높아집니다."
              : "Responding within 24 hours triples your matching success rate."
          }</p>`
        ),
      };

    case "new_message":
      return {
        subject: isKo
          ? `새 메시지 — ${data.sender_name || "상대방"}`
          : `New Message — ${data.sender_name || "Partner"}`,
        html: baseLayout(
          isKo ? "새 메시지가 도착했습니다 💬" : "New Message 💬",
          `<p style="color:#4b5563;line-height:1.6">${
            isKo
              ? `<strong>${data.sender_name || "상대방"}</strong>이 메시지를 보냈습니다.`
              : `<strong>${data.sender_name || "Your partner"}</strong> sent you a message.`
          }</p>
          ${data.preview ? `<div style="background:#f9fafb;border-left:3px solid #F97316;padding:12px 16px;margin:16px 0;color:#6b7280;font-style:italic">"${data.preview.substring(0, 150)}${data.preview.length > 150 ? "..." : ""}"</div>` : ""}
          ${ctaButton(isKo ? "메시지 확인하기" : "View Message", appUrl + "#messages")}
          <p style="color:#9ca3af;font-size:13px">${
            isKo
              ? "이 알림을 받고 싶지 않으시면 설정에서 변경할 수 있습니다."
              : "You can manage your notification preferences in Settings."
          }</p>`
        ),
      };

    case "subscription_change":
      return {
        subject: isKo
          ? `구독 변경 — ${data.action || "업데이트"}`
          : `Subscription ${data.action || "Updated"}`,
        html: baseLayout(
          isKo ? "구독이 변경되었습니다" : "Subscription Updated",
          `<div style="background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:16px;margin:16px 0">
            <p style="margin:0;color:#92400e;font-size:14px">
              <strong>${isKo ? "변경 내용" : "Change"}:</strong> ${data.details || ""}
            </p>
          </div>
          ${data.new_plan ? `<p style="color:#4b5563"><strong>${isKo ? "현재 플랜" : "Current Plan"}:</strong> ${data.new_plan}</p>` : ""}
          ${ctaButton(isKo ? "구독 관리" : "Manage Subscription", appUrl + "#subscription")}
          <p style="color:#9ca3af;font-size:13px">${
            isKo
              ? "구독 관련 문의: support@whistle-ai.com"
              : "Subscription questions: support@whistle-ai.com"
          }</p>`
        ),
      };

    case "escrow_update":
      return {
        subject: isKo
          ? `에스크로 업데이트 — ${data.action || ""}`
          : `Escrow Update — ${data.action || ""}`,
        html: baseLayout(
          isKo ? "에스크로 결제 업데이트" : "Escrow Payment Update",
          `<p style="color:#4b5563;line-height:1.6">${data.message || ""}</p>
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0">
            ${data.amount ? `<p style="margin:4px 0;color:#4b5563"><strong>${isKo ? "금액" : "Amount"}:</strong> ${data.currency || "USD"} ${data.amount}</p>` : ""}
            ${data.deal_name ? `<p style="margin:4px 0;color:#4b5563"><strong>${isKo ? "거래" : "Deal"}:</strong> ${data.deal_name}</p>` : ""}
            <p style="margin:4px 0;color:#4b5563"><strong>${isKo ? "상태" : "Status"}:</strong> ${data.status || ""}</p>
          </div>
          ${ctaButton(isKo ? "거래 확인하기" : "View Deal", appUrl + "#deals")}`
        ),
      };

    case "shipment_update":
      return {
        subject: isKo
          ? `배송 업데이트 — ${data.title || ""}`
          : `Shipment Update — ${data.title || ""}`,
        html: baseLayout(
          isKo ? "배송 상태가 업데이트되었습니다 🚢" : "Shipment Update 🚢",
          `<p style="color:#4b5563;line-height:1.6">${data.message || ""}</p>
          <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;margin:16px 0">
            ${data.tracking_no ? `<p style="margin:4px 0;color:#4b5563"><strong>${isKo ? "운송장" : "Tracking No"}:</strong> ${data.tracking_no}</p>` : ""}
            ${data.carrier ? `<p style="margin:4px 0;color:#4b5563"><strong>${isKo ? "운송사" : "Carrier"}:</strong> ${data.carrier}</p>` : ""}
            ${data.eta ? `<p style="margin:4px 0;color:#4b5563"><strong>ETA:</strong> ${data.eta}</p>` : ""}
          </div>
          ${ctaButton(isKo ? "배송 추적하기" : "Track Shipment", appUrl + "#deals")}`
        ),
      };

    case "quote_received":
      return {
        subject: isKo
          ? `견적서 수신 — ${data.title || ""}`
          : `Quote Received — ${data.title || ""}`,
        html: baseLayout(
          isKo ? "새 견적서가 도착했습니다 📋" : "New Quote Received 📋",
          `<p style="color:#4b5563;line-height:1.6">${data.message || ""}</p>
          <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:16px;margin:16px 0">
            ${data.amount ? `<p style="margin:4px 0;color:#92400e"><strong>${isKo ? "견적 금액" : "Quote Amount"}:</strong> ${data.amount}</p>` : ""}
          </div>
          <p style="color:#4b5563;font-size:13px">${
            isKo
              ? "견적서를 검토하고 승인 또는 수정 요청을 해주세요."
              : "Please review the quote and approve or request changes."
          }</p>
          ${ctaButton(isKo ? "견적서 확인하기" : "Review Quote", appUrl + "#deals")}`
        ),
      };

    case "order_update":
      return {
        subject: isKo
          ? `주문 상태 변경 — ${data.title || ""}`
          : `Order Status Update — ${data.title || ""}`,
        html: baseLayout(
          isKo ? "주문 상태가 변경되었습니다 📦" : "Order Status Updated 📦",
          `<p style="color:#4b5563;line-height:1.6">${data.message || ""}</p>
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0">
            ${data.order_status ? `<p style="margin:4px 0;color:#4b5563"><strong>${isKo ? "상태" : "Status"}:</strong> ${data.order_status}</p>` : ""}
            ${data.order_id ? `<p style="margin:4px 0;color:#4b5563"><strong>${isKo ? "주문번호" : "Order No"}:</strong> ${data.order_id}</p>` : ""}
          </div>
          ${ctaButton(isKo ? "주문 확인하기" : "View Order", appUrl + "#deals")}`
        ),
      };

    case "document_ready":
      return {
        subject: isKo
          ? `서류 준비 완료 — ${data.title || ""}`
          : `Document Ready — ${data.title || ""}`,
        html: baseLayout(
          isKo ? "서류가 준비되었습니다 📄" : "Document Ready 📄",
          `<p style="color:#4b5563;line-height:1.6">${data.message || ""}</p>
          <div style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:8px;padding:16px;margin:16px 0">
            ${data.doc_type ? `<p style="margin:4px 0;color:#4b5563"><strong>${isKo ? "서류 유형" : "Document Type"}:</strong> ${data.doc_type}</p>` : ""}
            ${data.doc_number ? `<p style="margin:4px 0;color:#4b5563"><strong>${isKo ? "문서 번호" : "Doc No"}:</strong> ${data.doc_number}</p>` : ""}
          </div>
          <p style="color:#4b5563;font-size:13px">${
            isKo
              ? "서류를 검토하고 서명해 주세요."
              : "Please review and sign the document."
          }</p>
          ${ctaButton(isKo ? "서류 확인하기" : "View Document", appUrl + "#deals")}`
        ),
      };

    case "sample_update":
      return {
        subject: isKo
          ? `샘플 업데이트 — ${data.title || ""}`
          : `Sample Update — ${data.title || ""}`,
        html: baseLayout(
          isKo ? "샘플 상태가 업데이트되었습니다 📦" : "Sample Update 📦",
          `<p style="color:#4b5563;line-height:1.6">${data.message || ""}</p>
          ${ctaButton(isKo ? "샘플 상태 확인" : "View Sample Status", appUrl + "#deals")}`
        ),
      };

    default:
      return {
        subject: data.subject || "Whistle AI Notification",
        html: baseLayout(
          data.title || "Notification",
          `<p style="color:#4b5563;line-height:1.6">${data.message || ""}</p>
          ${ctaButton(isKo ? "앱으로 이동" : "Go to App", appUrl)}`
        ),
      };
  }
}

// ─── Main Handler ──────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sbAdmin = createClient(supabaseUrl, serviceKey);

    // Parse body first to check email type for auth exceptions
    const body = await req.json();

    // Auth check — require JWT or valid internal secret
    const authHeader = req.headers.get("Authorization");
    const internalSecret = req.headers.get("X-Internal-Secret");
    const expectedSecret = Deno.env.get("INTERNAL_SERVICE_SECRET");

    const hasValidInternal = expectedSecret && internalSecret === expectedSecret;

    // Allow "welcome" type without full JWT auth (user just signed up, may not have session yet)
    // The Supabase API gateway already validates the apikey header
    const isPublicType = body.type === "welcome";

    if (!authHeader && !hasValidInternal && !isPublicType) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (authHeader && !hasValidInternal && !isPublicType) {
      const token = authHeader.replace("Bearer ", "");
      // Allow service role key for server-to-server calls (send-notification → send-transactional-email)
      if (token !== serviceKey) {
        const { error: authErr } = await sbAdmin.auth.getUser(token);
        if (authErr) {
          return new Response(
            JSON.stringify({ error: "Invalid token" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      }
    }
    const {
      to,
      user_id,
      type,
      data = {},
      lang = "en",
    } = body;

    // Resolve email address
    let toEmail = to;
    if (!toEmail && user_id) {
      const { data: userData } = await sbAdmin
        .from("users")
        .select("email, display_name, preferred_language")
        .eq("id", user_id)
        .single();
      if (userData) {
        toEmail = userData.email;
        if (!data.name) data.name = userData.display_name;
      }
    }

    if (!toEmail) {
      return new Response(
        JSON.stringify({ error: "No recipient email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!type) {
      return new Response(
        JSON.stringify({ error: "Missing email type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const template = getTemplate(type, data, lang);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [toEmail],
        subject: template.subject,
        html: template.html,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Resend API error:", res.status, errText);
      return new Response(
        JSON.stringify({ error: "Failed to send email" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await res.json();

    // Log email sent
    try {
      await sbAdmin.from("email_logs").insert({
        to_email: toEmail,
        user_id: user_id || null,
        type,
        subject: template.subject,
        resend_id: result.id,
        status: "sent",
        created_at: new Date().toISOString(),
      });
    } catch {
      // email_logs table may not exist yet — don't fail
    }

    return new Response(
      JSON.stringify({ success: true, id: result.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("send-transactional-email error:", e instanceof Error ? e.message : String(e));
    return new Response(
      JSON.stringify({ error: "An error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
