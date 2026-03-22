import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "https://whistle-ai.com",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const FROM_EMAIL = "Whistle AI <hello@whistle-ai.com>";
const MAX_EMAILS_PER_HOUR = 50;
const ALLOWED_TEMPLATE_TYPES = new Set([
  "korean_manufacturer_intro",
  "global_buyer_intro",
  "global_manufacturer_intro",
  "welcome",
  "product_intro",
  "buyer_matching",
  "newsletter",
  "custom",
]);

// ─── Email Templates ──────────────────────────────────────

function darkBaseLayout(preheader: string, body: string, unsubscribeUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Whistle AI</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
  <style>
    body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
    table,td{mso-table-lspace:0;mso-table-rspace:0}
    img{-ms-interpolation-mode:bicubic;border:0;height:auto;line-height:100%;outline:none;text-decoration:none}
    @media only screen and (max-width:620px){
      .email-container{width:100%!important;max-width:100%!important}
      .fluid{max-width:100%!important;height:auto!important}
      .stack-column{display:block!important;width:100%!important}
      .pad-mobile{padding-left:20px!important;padding-right:20px!important}
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif">
  <span style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden">${preheader}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0f;padding:40px 0">
    <tr><td align="center">
      <table role="presentation" class="email-container" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#111118;border-radius:16px;overflow:hidden;border:1px solid #1e1e2e">
        <!-- Header -->
        <tr><td style="padding:32px 40px 24px;text-align:center;background:linear-gradient(135deg,#0B1120 0%,#111827 100%);border-bottom:1px solid #1e1e2e">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="text-align:center">
              <h1 style="margin:0;font-size:28px;font-weight:800;letter-spacing:-0.5px">
                <span style="color:#0B63F2">W</span><span style="color:#ffffff">histle AI</span>
              </h1>
              <p style="margin:8px 0 0;color:#6b7280;font-size:13px;letter-spacing:0.5px">AI-POWERED EXPORT MANAGEMENT</p>
            </td></tr>
          </table>
        </td></tr>
        <!-- Body -->
        <tr><td class="pad-mobile" style="padding:32px 40px">
          ${body}
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:24px 40px;background-color:#0a0a0f;border-top:1px solid #1e1e2e;text-align:center">
          <p style="margin:0 0 12px;color:#4b5563;font-size:12px;line-height:1.5">
            MOTIVE Innovation Inc. (Korea) &middot; MOTIVE Global, Inc. (USA, Delaware)<br>
            B-1903, 220 Dongtan Jungang-ro, Hwaseong-si, Gyeonggi-do, Korea
          </p>
          <p style="margin:0 0 12px;color:#4b5563;font-size:12px">
            <a href="https://whistle-ai.com/terms" style="color:#6b7280;text-decoration:underline">Terms</a> &nbsp;&middot;&nbsp;
            <a href="https://whistle-ai.com/privacy" style="color:#6b7280;text-decoration:underline">Privacy</a> &nbsp;&middot;&nbsp;
            <a href="https://whistle-ai.com/refund" style="color:#6b7280;text-decoration:underline">Refund</a>
          </p>
          <p style="margin:0;color:#6b7280;font-size:11px">
            <a href="${unsubscribeUrl}" style="color:#6b7280;text-decoration:underline">Unsubscribe</a> from marketing emails
          </p>
          <p style="margin:8px 0 0;color:#374151;font-size:10px">&copy; 2026 MOTIVE Innovation Inc. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function ctaButton(text: string, url: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0">
    <tr><td align="center">
      <a href="${url}" style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#0B63F2 0%,#3B82F6 100%);color:#ffffff;text-decoration:none;border-radius:10px;font-weight:700;font-size:15px;letter-spacing:0.3px;mso-padding-alt:14px 36px">${text}</a>
    </td></tr>
  </table>`;
}

function featureRow(icon: string, title: string, desc: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:12px 0">
    <tr>
      <td width="40" valign="top" style="padding-right:12px;font-size:20px">${icon}</td>
      <td>
        <p style="margin:0 0 2px;color:#f3f4f6;font-size:14px;font-weight:600">${title}</p>
        <p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.5">${desc}</p>
      </td>
    </tr>
  </table>`;
}

function divider(): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0"><tr><td style="border-top:1px solid #1e1e2e"></td></tr></table>`;
}

// ─── Template: Korean Manufacturer Intro ──────────────────

function koreanManufacturerIntro(unsubscribeUrl: string): { subject: string; html: string } {
  const subject = "AI로 수출 서류 자동화 — Whistle AI 무료 체험";
  const body = `
    <p style="margin:0 0 20px;color:#e5e7eb;font-size:16px;line-height:1.7">
      안녕하세요,<br><br>
      수출 서류 작성에 매번 몇 시간씩 소비하고 계신가요?<br>
      <strong style="color:#ffffff">HS코드 분류, FTA 원산지 판정, 바이어 매칭</strong>까지<br>
      AI가 60초 안에 처리해 드립니다.
    </p>

    ${divider()}

    <p style="margin:0 0 16px;color:#0B63F2;font-size:13px;font-weight:700;letter-spacing:1px">WHISTLE AI가 해결하는 문제</p>

    ${featureRow("📋", "HS코드 자동 분류", "제품 사진 한 장으로 HS코드 6자리 자동 분류. 관세율, FTA 특혜세율까지 즉시 확인.")}
    ${featureRow("🌍", "AI 타겟 시장 분석", "31개국 수출 적합도 분석. 시장 규모, 경쟁 강도, 규제 요건을 AI가 종합 판단.")}
    ${featureRow("🤝", "글로벌 바이어 매칭", "검증된 글로벌 바이어와 자동 매칭. 협상부터 결제까지 플랫폼 안에서 완결.")}
    ${featureRow("📄", "수출 서류 자동 생성", "Commercial Invoice, Packing List, 원산지증명서 등 AI가 자동 작성.")}

    ${divider()}

    <p style="margin:0 0 8px;color:#f3f4f6;font-size:15px;font-weight:600;text-align:center">지금 무료로 시작하세요</p>
    <p style="margin:0 0 4px;color:#9ca3af;font-size:13px;text-align:center">가입 후 AI 수출 분석 1회 무료 제공</p>

    ${ctaButton("무료로 시작하기", "https://whistle-ai.com/ko")}

    <p style="margin:0;color:#6b7280;font-size:12px;text-align:center;line-height:1.6">
      이미 <strong style="color:#9ca3af">500+</strong> 제조사가 Whistle AI를 사용하고 있습니다.<br>
      궁금한 점이 있으시면 <a href="mailto:support@whistle-ai.com" style="color:#0B63F2;text-decoration:none">support@whistle-ai.com</a>으로 문의해 주세요.
    </p>`;

  return {
    subject,
    html: darkBaseLayout(
      "수출 서류 자동화 — 제품 사진 한 장으로 HS코드, FTA, 바이어 매칭까지",
      body,
      unsubscribeUrl,
    ),
  };
}

// ─── Template: Global Buyer Intro ─────────────────────────

function globalBuyerIntro(unsubscribeUrl: string): { subject: string; html: string } {
  const subject = "Source Quality Products from Asia — AI-Powered Platform";
  const body = `
    <p style="margin:0 0 20px;color:#e5e7eb;font-size:16px;line-height:1.7">
      Finding reliable manufacturers in Asia shouldn't be this hard.<br><br>
      <strong style="color:#ffffff">Whistle AI</strong> connects you with verified Korean and Asian manufacturers,
      handles compliance checks, and manages the entire procurement workflow — all in one platform.
    </p>

    ${divider()}

    <p style="margin:0 0 16px;color:#0B63F2;font-size:13px;font-weight:700;letter-spacing:1px">WHY BUYERS CHOOSE WHISTLE AI</p>

    ${featureRow("🔍", "Verified Manufacturers", "Every supplier is pre-screened. Business registration, export history, and quality certifications verified by AI.")}
    ${featureRow("📊", "AI-Powered Matching", "Describe what you need — our AI finds the best-fit manufacturers based on capability, capacity, and track record.")}
    ${featureRow("🛡️", "Secure Transactions", "Escrow payments protect both parties. Funds are released only when you confirm delivery and quality.")}
    ${featureRow("📦", "End-to-End Management", "From sourcing to shipping — customs clearance, freight forwarding, and documentation handled in-platform.")}

    ${divider()}

    <p style="margin:0 0 8px;color:#f3f4f6;font-size:15px;font-weight:600;text-align:center">Start Sourcing Smarter</p>
    <p style="margin:0 0 4px;color:#9ca3af;font-size:13px;text-align:center">Free to join. No commitment required.</p>

    ${ctaButton("Find Suppliers Now", "https://whistle-ai.com/global-buyer/")}

    <p style="margin:0;color:#6b7280;font-size:12px;text-align:center;line-height:1.6">
      Sourcing from <strong style="color:#9ca3af">Korea, Vietnam, Thailand, China</strong> and more.<br>
      Questions? Reach us at <a href="mailto:support@whistle-ai.com" style="color:#0B63F2;text-decoration:none">support@whistle-ai.com</a>
    </p>`;

  return {
    subject,
    html: darkBaseLayout(
      "Find verified Asian manufacturers with AI-powered matching and secure escrow payments",
      body,
      unsubscribeUrl,
    ),
  };
}

// ─── Template: Global Manufacturer Intro ──────────────────

function globalManufacturerIntro(unsubscribeUrl: string): { subject: string; html: string } {
  const subject = "Automate Your Export Documents with AI — Free Trial";
  const body = `
    <p style="margin:0 0 20px;color:#e5e7eb;font-size:16px;line-height:1.7">
      Export compliance shouldn't slow you down.<br><br>
      <strong style="color:#ffffff">Whistle AI</strong> automates HS code classification, FTA analysis,
      and document generation — so you can focus on growing your international sales.
    </p>

    ${divider()}

    <p style="margin:0 0 16px;color:#0B63F2;font-size:13px;font-weight:700;letter-spacing:1px">WHAT WHISTLE AI DOES FOR EXPORTERS</p>

    ${featureRow("🤖", "AI Document Automation", "Upload a product photo — get HS codes, tariff rates, and FTA benefits in 60 seconds. No manual research needed.")}
    ${featureRow("🌐", "31-Country Market Intelligence", "AI analyzes market size, competition, regulations, and tariffs across 31 countries to find your best export opportunities.")}
    ${featureRow("💼", "Global Buyer Network", "Get matched with verified importers actively looking for products in your category. AI handles the introductions.")}
    ${featureRow("📋", "Compliance Made Simple", "Sanctions screening, export control checks, and required documentation — automated and always up-to-date.")}

    ${divider()}

    <p style="margin:0 0 8px;color:#f3f4f6;font-size:15px;font-weight:600;text-align:center">Ready to Export Smarter?</p>
    <p style="margin:0 0 4px;color:#9ca3af;font-size:13px;text-align:center">1 free AI analysis included. No credit card required.</p>

    ${ctaButton("Start Free Trial", "https://whistle-ai.com/en/")}

    <p style="margin:0;color:#6b7280;font-size:12px;text-align:center;line-height:1.6">
      Trusted by exporters in <strong style="color:#9ca3af">USA, Japan, Germany, UK, France</strong> and more.<br>
      Questions? <a href="mailto:support@whistle-ai.com" style="color:#0B63F2;text-decoration:none">support@whistle-ai.com</a>
    </p>`;

  return {
    subject,
    html: darkBaseLayout(
      "Automate HS codes, FTA analysis, and export documents with AI — start your free trial",
      body,
      unsubscribeUrl,
    ),
  };
}

// ─── Template Router ──────────────────────────────────────

interface TemplateResult {
  subject: string;
  html: string;
}

function getMarketingTemplate(
  templateType: string,
  unsubscribeUrl: string,
  subjectOverride?: string,
): TemplateResult {
  let result: TemplateResult;

  switch (templateType) {
    case "korean_manufacturer_intro":
      result = koreanManufacturerIntro(unsubscribeUrl);
      break;
    case "global_buyer_intro":
      result = globalBuyerIntro(unsubscribeUrl);
      break;
    case "global_manufacturer_intro":
      result = globalManufacturerIntro(unsubscribeUrl);
      break;
    default:
      result = {
        subject: "Whistle AI — AI-Powered Export Management",
        html: darkBaseLayout(
          "Discover how AI can transform your export business",
          `<p style="color:#e5e7eb;font-size:16px;line-height:1.7">
            Visit <a href="https://whistle-ai.com" style="color:#0B63F2">whistle-ai.com</a> to learn more.
          </p>
          ${ctaButton("Learn More", "https://whistle-ai.com")}`,
          unsubscribeUrl,
        ),
      };
  }

  if (subjectOverride) {
    result.subject = subjectOverride;
  }

  return result;
}

// ─── Input Validation ─────────────────────────────────────

function sanitizeEmail(email: string): string | null {
  const trimmed = email.trim().toLowerCase();
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(trimmed) || trimmed.length > 254) {
    return null;
  }
  return trimmed;
}

function sanitizeString(input: string, maxLength: number): string {
  return input
    .replace(/[<>]/g, "")
    .trim()
    .substring(0, maxLength);
}

// ─── Rate Limiter ─────────────────────────────────────────

async function checkRateLimit(
  sbAdmin: ReturnType<typeof createClient>,
): Promise<{ isAllowed: boolean; remaining: number }> {
  const windowStart = new Date();
  windowStart.setMinutes(0, 0, 0);

  const { data } = await sbAdmin
    .from("marketing_rate_limits")
    .select("send_count")
    .gte("window_start", windowStart.toISOString())
    .single();

  const currentCount = data?.send_count ?? 0;
  const isAllowed = currentCount < MAX_EMAILS_PER_HOUR;
  const remaining = Math.max(0, MAX_EMAILS_PER_HOUR - currentCount);

  return { isAllowed, remaining };
}

async function incrementRateLimit(
  sbAdmin: ReturnType<typeof createClient>,
): Promise<void> {
  const windowStart = new Date();
  windowStart.setMinutes(0, 0, 0);

  const { data: existing } = await sbAdmin
    .from("marketing_rate_limits")
    .select("id, send_count")
    .gte("window_start", windowStart.toISOString())
    .single();

  if (existing) {
    await sbAdmin
      .from("marketing_rate_limits")
      .update({ send_count: existing.send_count + 1 })
      .eq("id", existing.id);
  } else {
    await sbAdmin.from("marketing_rate_limits").insert({
      window_start: windowStart.toISOString(),
      send_count: 1,
    });
  }
}

// ─── Main Handler ─────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: { code: "SERVICE_UNAVAILABLE", message: "Email service not configured" } }),
        { status: 503, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sbAdmin = createClient(supabaseUrl, serviceKey);

    // Auth: require service role key or admin JWT or internal secret
    const authHeader = req.headers.get("Authorization");
    const internalSecret = req.headers.get("X-Internal-Secret");
    const expectedSecret = Deno.env.get("INTERNAL_SERVICE_SECRET");

    const hasValidInternal = expectedSecret && internalSecret === expectedSecret;

    if (!authHeader && !hasValidInternal) {
      return new Response(
        JSON.stringify({ error: { code: "UNAUTHORIZED", message: "Authentication required" } }),
        { status: 401, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    if (authHeader && !hasValidInternal) {
      const token = authHeader.replace("Bearer ", "");
      // Verify it's either service_role or an admin user
      if (token !== serviceKey) {
        const { data: { user }, error: authErr } = await sbAdmin.auth.getUser(token);
        if (authErr || !user) {
          return new Response(
            JSON.stringify({ error: { code: "UNAUTHORIZED", message: "Invalid token" } }),
            { status: 401, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
          );
        }
        // Check admin role
        const { data: userData } = await sbAdmin
          .from("users")
          .select("role")
          .eq("id", user.id)
          .single();
        if (userData?.role !== "admin") {
          return new Response(
            JSON.stringify({ error: { code: "FORBIDDEN", message: "Admin access required" } }),
            { status: 403, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
          );
        }
      }
    }

    const body = await req.json();
    const { to, subject, html_body, campaign_id, template_type, contact_id } = body;

    // Validate required fields
    if (!to) {
      return new Response(
        JSON.stringify({ error: { code: "VALIDATION_ERROR", message: "Recipient email is required", details: [{ field: "to", issue: "Must be a valid email address" }] } }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    const cleanEmail = sanitizeEmail(to);
    if (!cleanEmail) {
      return new Response(
        JSON.stringify({ error: { code: "VALIDATION_ERROR", message: "Invalid email format", details: [{ field: "to", issue: "Must be a valid email address" }] } }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    if (!template_type && !html_body) {
      return new Response(
        JSON.stringify({ error: { code: "VALIDATION_ERROR", message: "Either template_type or html_body is required" } }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    if (template_type && !ALLOWED_TEMPLATE_TYPES.has(template_type)) {
      return new Response(
        JSON.stringify({ error: { code: "VALIDATION_ERROR", message: `Invalid template_type. Allowed: ${[...ALLOWED_TEMPLATE_TYPES].join(", ")}` } }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    // Check unsubscribe status
    const { data: contact } = await sbAdmin
      .from("marketing_contacts")
      .select("is_subscribed")
      .eq("email", cleanEmail)
      .single();

    if (contact && !contact.is_subscribed) {
      return new Response(
        JSON.stringify({ error: { code: "UNSUBSCRIBED", message: "Recipient has unsubscribed from marketing emails" } }),
        { status: 422, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    // Rate limit check
    const { isAllowed, remaining } = await checkRateLimit(sbAdmin);
    if (!isAllowed) {
      return new Response(
        JSON.stringify({ error: { code: "RATE_LIMITED", message: "Hourly email limit reached. Try again later." } }),
        {
          status: 429,
          headers: {
            ...CORS_HEADERS,
            "Content-Type": "application/json",
            "Retry-After": "3600",
            "X-RateLimit-Limit": String(MAX_EMAILS_PER_HOUR),
            "X-RateLimit-Remaining": "0",
          },
        },
      );
    }

    // Build unsubscribe URL
    const unsubscribeToken = btoa(cleanEmail);
    const unsubscribeUrl = `https://whistle-ai.com/unsubscribe?token=${unsubscribeToken}&email=${encodeURIComponent(cleanEmail)}`;

    // Resolve template or use custom HTML
    let emailSubject: string;
    let emailHtml: string;

    if (template_type && template_type !== "custom") {
      const template = getMarketingTemplate(template_type, unsubscribeUrl, subject);
      emailSubject = template.subject;
      emailHtml = template.html;
    } else {
      emailSubject = sanitizeString(subject || "Whistle AI", 200);
      emailHtml = html_body;
    }

    // Log the event as queued
    const { data: eventRow } = await sbAdmin
      .from("marketing_events")
      .insert({
        campaign_id: campaign_id || null,
        contact_id: contact_id || null,
        to_email: cleanEmail,
        subject: emailSubject,
        template_type: template_type || "custom",
        status: "queued",
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    const eventId = eventRow?.id;

    // Send via Resend API
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [cleanEmail],
        subject: emailSubject,
        html: emailHtml,
        headers: {
          "List-Unsubscribe": `<${unsubscribeUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      }),
    });

    if (!resendResponse.ok) {
      const errText = await resendResponse.text();
      console.error("Resend API error:", resendResponse.status, errText);

      // Update event as failed
      if (eventId) {
        await sbAdmin
          .from("marketing_events")
          .update({ status: "failed", error_message: errText.substring(0, 500) })
          .eq("id", eventId);
      }

      return new Response(
        JSON.stringify({ error: { code: "SEND_FAILED", message: "Failed to send email" } }),
        { status: 502, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    const resendResult = await resendResponse.json();

    // Update event as sent
    if (eventId) {
      await sbAdmin
        .from("marketing_events")
        .update({
          status: "sent",
          resend_id: resendResult.id,
          sent_at: new Date().toISOString(),
        })
        .eq("id", eventId);
    }

    // Increment rate limit counter
    await incrementRateLimit(sbAdmin);

    return new Response(
      JSON.stringify({
        data: {
          success: true,
          id: resendResult.id,
          event_id: eventId,
        },
        meta: {
          rateLimit: {
            limit: MAX_EMAILS_PER_HOUR,
            remaining: remaining - 1,
          },
        },
      }),
      {
        headers: {
          ...CORS_HEADERS,
          "Content-Type": "application/json",
          "X-RateLimit-Limit": String(MAX_EMAILS_PER_HOUR),
          "X-RateLimit-Remaining": String(remaining - 1),
        },
      },
    );
  } catch (e) {
    console.error("send-marketing-email error:", e instanceof Error ? e.message : String(e));
    return new Response(
      JSON.stringify({ error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }
});
