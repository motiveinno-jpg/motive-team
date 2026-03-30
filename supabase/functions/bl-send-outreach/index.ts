import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const RESEND_API = "https://api.resend.com/emails";
const FROM_EMAIL = "Whistle AI <noreply@whistle-ai.com>";

const ALLOWED_ORIGINS = [
  "https://whistle-ai.com",
  "https://motiveinno-jpg.github.io",
];

const DAILY_LIMITS: Record<string, number> = {
  free: 0,
  starter: 3,
  professional: 10,
  enterprise: 30,
};

const SEND_DELAY_MS = 300;

function getCorsHeaders(req?: Request) {
  const origin = req?.headers.get("origin") || "";
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };
}

function json(data: unknown, status = 200, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function buildEmailHtml(options: {
  productName: string;
  hsCode: string;
  productImageUrl?: string;
  fobPrice: string;
  moq: string;
  customMessage: string;
  companyName: string;
  companyCountry: string;
  magicToken: string;
  buyerName: string;
  lang: string;
}): string {
  const {
    productName,
    hsCode,
    productImageUrl,
    fobPrice,
    moq,
    customMessage,
    companyName,
    companyCountry,
    magicToken,
    buyerName,
    lang,
  } = options;

  const isKo = lang === "ko";
  const ctaUrl = `https://whistle-ai.com/app/buyer?outreach=${magicToken}`;

  const greeting = isKo
    ? `${buyerName} 담당자님께`
    : `Dear ${buyerName},`;

  const introText = isKo
    ? `<strong>${companyName}</strong> (${companyCountry})에서 귀사와의 거래를 제안드립니다.`
    : `<strong>${companyName}</strong> (${companyCountry}) would like to connect with you about an export opportunity.`;

  const specsLabel = isKo ? "제품 정보" : "Product Details";
  const fobLabel = isKo ? "FOB 가격" : "FOB Price";
  const moqLabel = isKo ? "최소 주문량" : "MOQ";
  const hsLabel = "HS Code";
  const messageLabel = isKo ? "제조사 메시지" : "Message from Manufacturer";
  const ctaLabel = isKo ? "제품 확인 및 연결하기" : "View Product & Connect";
  const unsubText = isKo
    ? "이 이메일 수신을 원치 않으시면 회신해 주세요."
    : "If you no longer wish to receive these emails, simply reply to unsubscribe.";

  const productImageSection = productImageUrl
    ? `<div style="text-align:center;margin:20px 0">
        <img src="${productImageUrl}" alt="${productName}" style="max-width:100%;max-height:240px;border-radius:8px;object-fit:cover" />
      </div>`
    : "";

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Noto Sans KR',sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:40px 0">
<tr><td align="center">
  <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">

    <!-- Header -->
    <tr><td style="background:linear-gradient(135deg,#1a1a2e,#16213e);padding:28px 40px;text-align:center">
      <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700">
        <span style="color:#F97316">W</span>histle AI
      </h1>
    </td></tr>

    <!-- Body -->
    <tr><td style="padding:32px 40px">

      <p style="color:#4b5563;font-size:15px;line-height:1.7;margin:0 0 16px">${greeting}</p>
      <p style="color:#4b5563;font-size:15px;line-height:1.7;margin:0 0 20px">${introText}</p>

      <!-- Product Hero -->
      ${productImageSection}

      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:20px;margin:20px 0">
        <h3 style="margin:0 0 12px;color:#1a1a2e;font-size:17px">${productName}</h3>
        <p style="margin:0 0 4px;color:#6b7280;font-size:13px"><strong>${hsLabel}:</strong> ${hsCode}</p>

        <table width="100%" style="margin-top:12px;font-size:14px;color:#4b5563">
          <tr>
            <td style="padding:8px 12px;background:#eff6ff;border-radius:6px;width:50%">
              <strong>${fobLabel}</strong><br/>
              <span style="font-size:16px;color:#1e40af;font-weight:600">${fobPrice}</span>
            </td>
            <td style="width:8px"></td>
            <td style="padding:8px 12px;background:#f0fdf4;border-radius:6px;width:50%">
              <strong>${moqLabel}</strong><br/>
              <span style="font-size:16px;color:#065f46;font-weight:600">${moq}</span>
            </td>
          </tr>
        </table>
      </div>

      <!-- Custom Message -->
      ${customMessage ? `
      <div style="border-left:3px solid #F97316;padding:12px 16px;margin:20px 0;background:#fff7ed;border-radius:0 8px 8px 0">
        <p style="margin:0 0 4px;color:#92400e;font-size:12px;font-weight:600;text-transform:uppercase">${messageLabel}</p>
        <p style="margin:0;color:#4b5563;font-size:14px;line-height:1.6">${customMessage}</p>
      </div>` : ""}

      <!-- CTA -->
      <div style="text-align:center;margin:28px 0">
        <a href="${ctaUrl}" style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#F97316,#FB923C);color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px">${ctaLabel}</a>
      </div>

      <p style="color:#9ca3af;font-size:12px;text-align:center;margin:20px 0 0">${unsubText}</p>

    </td></tr>

    <!-- Footer -->
    <tr><td style="padding:20px 40px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center">
      <p style="margin:0;color:#9ca3af;font-size:11px">
        &copy; 2026 MOTIVE Global, Inc. &middot; Powered by Whistle AI<br>
        <a href="https://whistle-ai.com/terms" style="color:#6b7280">Terms</a> &middot;
        <a href="https://whistle-ai.com/privacy" style="color:#6b7280">Privacy</a>
      </p>
    </td></tr>

  </table>
</td></tr></table>
</body></html>`;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const sb = createClient(supabaseUrl, serviceKey);

    if (!resendKey) {
      return json({ error: "RESEND_API_KEY not configured" }, 500, corsHeaders);
    }

    // --- Auth check ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Unauthorized" }, 401, corsHeaders);
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await sb.auth.getUser(token);
    if (authErr || !user) {
      return json({ error: "Invalid token" }, 401, corsHeaders);
    }

    // Get user + company info
    const { data: userData, error: userErr } = await sb
      .from("users")
      .select("id, email, company_name, country, subscription_plan")
      .eq("id", user.id)
      .single();

    if (userErr || !userData) {
      return json({ error: "User profile not found" }, 404, corsHeaders);
    }

    // --- Parse input ---
    const body = await req.json();
    const {
      lead_ids,
      product_name,
      hs_code,
      product_image_url,
      fob_price,
      moq,
      custom_message,
      lang = "en",
    } = body;

    if (!lead_ids?.length) {
      return json({ error: "lead_ids is required" }, 400, corsHeaders);
    }
    if (!product_name || !hs_code) {
      return json({ error: "product_name and hs_code are required" }, 400, corsHeaders);
    }

    // --- Rate limit check ---
    const plan = userData.subscription_plan || "free";
    const dailyLimit = DAILY_LIMITS[plan] ?? 0;

    if (dailyLimit === 0) {
      return json(
        { error: "Outreach is not available on the free plan. Please upgrade." },
        429,
        corsHeaders,
      );
    }

    const todayStr = new Date().toISOString().split("T")[0];

    const { data: rateRow } = await sb
      .from("bl_outreach_rate_limits")
      .select("id, sent_count")
      .eq("user_id", user.id)
      .eq("date", todayStr)
      .single();

    const currentCount = rateRow?.sent_count || 0;

    if (currentCount + lead_ids.length > dailyLimit) {
      const remaining = Math.max(0, dailyLimit - currentCount);
      return json(
        {
          error: `Daily outreach limit reached. You can send ${remaining} more today.`,
          daily_limit: dailyLimit,
          daily_remaining: remaining,
        },
        429,
        corsHeaders,
      );
    }

    // --- Fetch buyer leads ---
    const { data: leads, error: leadsErr } = await sb
      .from("bl_buyer_leads")
      .select("id, company_name, country_code, contact_email, contact_name")
      .in("id", lead_ids)
      .not("contact_email", "is", null);

    if (leadsErr || !leads?.length) {
      return json({ error: "No valid buyer leads found with contact emails" }, 404, corsHeaders);
    }

    // --- Create campaign ---
    const { data: campaign, error: campaignErr } = await sb
      .from("bl_outreach_campaigns")
      .insert({
        manufacturer_id: user.id,
        product_name,
        hs_code,
        product_image_url: product_image_url || null,
        fob_price: fob_price || null,
        moq: moq || null,
        custom_message: custom_message || null,
        lang,
        total_leads: leads.length,
        sent_count: 0,
        failed_count: 0,
        status: "sending",
      })
      .select("id")
      .single();

    if (campaignErr || !campaign) {
      console.error("Failed to create campaign:", campaignErr?.message);
      return json({ error: "Failed to create campaign" }, 500, corsHeaders);
    }

    // --- Send emails ---
    let sent = 0;
    let failed = 0;
    const isKo = lang === "ko";
    const emailSubject = isKo
      ? `[Whistle AI] ${userData.company_name || "Korean Manufacturer"} - ${product_name} 수출 제안`
      : `[Whistle AI] ${product_name} — Export Opportunity from ${userData.company_name || "Korean Manufacturer"}`;

    for (const lead of leads) {
      try {
        // Create outreach event (magic_token is auto-generated by DB default)
        const { data: event, error: eventErr } = await sb
          .from("bl_outreach_events")
          .insert({
            campaign_id: campaign.id,
            lead_id: lead.id,
            email_to: lead.contact_email,
            status: "pending",
          })
          .select("id, magic_token")
          .single();

        if (eventErr || !event) {
          console.error("Failed to create event for lead:", lead.id, eventErr?.message);
          failed++;
          continue;
        }

        const emailHtml = buildEmailHtml({
          productName: product_name,
          hsCode: hs_code,
          productImageUrl: product_image_url,
          fobPrice: fob_price || "Contact for pricing",
          moq: moq || "Negotiable",
          customMessage: custom_message || "",
          companyName: userData.company_name || "Korean Manufacturer",
          companyCountry: userData.country || "South Korea",
          magicToken: event.magic_token,
          buyerName: lead.contact_name || lead.company_name || "there",
          lang,
        });

        const res = await fetch(RESEND_API, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: [lead.contact_email],
            subject: emailSubject,
            html: emailHtml,
          }),
        });

        if (!res.ok) {
          const errBody = await res.text();
          console.error("Resend error for", lead.contact_email, ":", res.status, errBody);

          await sb
            .from("bl_outreach_events")
            .update({ status: "failed", error_message: `Resend ${res.status}: ${errBody.substring(0, 200)}` })
            .eq("id", event.id);

          failed++;
          continue;
        }

        const resData = await res.json();

        await sb
          .from("bl_outreach_events")
          .update({
            status: "sent",
            resend_id: resData.id,
            sent_at: new Date().toISOString(),
          })
          .eq("id", event.id);

        sent++;

        // Delay between sends to avoid rate limits
        if (leads.indexOf(lead) < leads.length - 1) {
          await new Promise((r) => setTimeout(r, SEND_DELAY_MS));
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("Send error for lead:", lead.id, msg);
        failed++;
      }
    }

    // --- Update campaign totals ---
    await sb
      .from("bl_outreach_campaigns")
      .update({
        sent_count: sent,
        failed_count: failed,
        status: failed === leads.length ? "failed" : "sent",
        completed_at: new Date().toISOString(),
      })
      .eq("id", campaign.id);

    // --- Update rate limit ---
    if (rateRow) {
      await sb
        .from("bl_outreach_rate_limits")
        .update({ sent_count: currentCount + sent })
        .eq("id", rateRow.id);
    } else {
      await sb
        .from("bl_outreach_rate_limits")
        .insert({
          user_id: user.id,
          date: todayStr,
          sent_count: sent,
        });
    }

    const dailyRemaining = Math.max(0, dailyLimit - (currentCount + sent));

    return json(
      {
        campaign_id: campaign.id,
        sent,
        failed,
        daily_remaining: dailyRemaining,
      },
      200,
      corsHeaders,
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("bl-send-outreach error:", msg);
    return json({ error: "Internal server error" }, 500, getCorsHeaders(req));
  }
});
