import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const RESEND_API = "https://api.resend.com/emails";
const FROM_EMAIL = "Whistle AI <noreply@whistle-ai.com>";
const FROM_EMAIL_FALLBACK = "Whistle AI <onboarding@resend.dev>";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" } });
  }

  try {
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const cronSecret = Deno.env.get("CRON_SECRET");

    // Auth: Bearer token OR x-cron-secret header
    let isAuthorized = false;

    const cronHeader = req.headers.get("x-cron-secret");
    if (cronSecret && cronHeader && cronHeader.trim() === cronSecret.trim()) {
      isAuthorized = true;
    }

    if (!isAuthorized) {
      const authHeader = req.headers.get("Authorization");
      const token = authHeader?.replace("Bearer ", "");
      if (!token) return json({ error: "Unauthorized" }, 401);

      if (token === serviceKey) {
        isAuthorized = true;
      } else {
        const sb = createClient(supabaseUrl, serviceKey);
        const { data: { user } } = await sb.auth.getUser(token);
        if (!user) return json({ error: "Unauthorized" }, 401);
        const { data: userData } = await sb.from("users").select("role").eq("id", user.id).single();
        if (!userData || userData.role !== "admin") return json({ error: "Admin only" }, 403);
        isAuthorized = true;
      }
    }

    if (!isAuthorized) return json({ error: "Unauthorized" }, 401);
    if (!resendKey) return json({ error: "RESEND_API_KEY not configured" }, 500);

    const sb = createClient(supabaseUrl, serviceKey);
    const body = await req.json();
    const { action } = body;

    // Action: send_campaign
    if (action === "send_campaign") {
      const { campaign_id, contact_ids, subject, template, html_content } = body;
      if (!campaign_id || !contact_ids?.length) return json({ error: "campaign_id and contact_ids required" }, 400);

      const { data: contacts } = await sb.from("outreach_contacts").select("*").in("id", contact_ids);
      if (!contacts?.length) return json({ error: "No contacts found" }, 404);

      let sent = 0, failed = 0;
      const results: Array<{ email: string; status: string; error?: string }> = [];

      for (const contact of contacts) {
        if (!contact.email) { results.push({ email: "(none)", status: "skipped" }); continue; }

        try {
          const emailHtml = template === "customs_broker"
            ? renderCustomsBrokerEmail(contact)
            : template === "forwarder"
            ? renderForwarderEmail(contact)
            : template === "manufacturer"
            ? renderManufacturerEmail(contact)
            : template === "buyer"
            ? renderBuyerEmail(contact)
            : template === "forwarder_3pl"
            ? renderForwarder3PLEmail(contact)
            : template === "brand"
            ? renderBrandEmail(contact)
            : template === "government"
            ? renderGovernmentEmail(contact)
            : html_content || "";

          const emailSubject = subject || getDefaultSubject(template, contact);

          let fromEmail = FROM_EMAIL;
          let res = await sendEmail(resendKey, fromEmail, contact.email, emailSubject, emailHtml);

          if (!res.ok) {
            const errData = await res.json();
            if (res.status === 403 && errData.message?.includes("not verified")) {
              fromEmail = FROM_EMAIL_FALLBACK;
              res = await sendEmail(resendKey, fromEmail, contact.email, emailSubject, emailHtml);
            }
            if (!res.ok) {
              const fallbackErr = await res.json().catch(() => ({}));
              throw new Error(fallbackErr.message || `HTTP ${res.status}`);
            }
          }

          const resData = await res.json();

          await sb.from("outreach_sends").insert({
            campaign_id,
            contact_id: contact.id,
            email_to: contact.email,
            subject: emailSubject,
            status: "sent",
            resend_id: resData.id,
          });

          sent++;
          results.push({ email: contact.email, status: "sent" });
          await new Promise(r => setTimeout(r, 500));
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          failed++;
          results.push({ email: contact.email, status: "failed", error: msg });
          await sb.from("outreach_sends").insert({
            campaign_id,
            contact_id: contact.id,
            email_to: contact.email,
            subject: subject || "",
            status: "failed",
            error: msg,
          });
        }
      }

      await sb.from("outreach_campaigns").update({
        total_sent: sent,
        status: "active",
        updated_at: new Date().toISOString(),
      }).eq("id", campaign_id);

      return json({ ok: true, sent, failed, results });
    }

    // Action: create_campaign
    if (action === "create_campaign") {
      const { name, category, template_type, subject } = body;
      const { data, error } = await sb.from("outreach_campaigns").insert({
        name, category, template_type, subject, status: "draft",
      }).select().single();
      if (error) throw error;
      return json({ ok: true, campaign: data });
    }

    // Action: add_contacts (bulk)
    if (action === "add_contacts") {
      const { contacts } = body;
      if (!contacts?.length) return json({ error: "contacts array required" }, 400);
      const { data, error } = await sb.from("outreach_contacts").insert(contacts).select();
      if (error) throw error;
      return json({ ok: true, count: data?.length || 0 });
    }

    // Action: get_stats
    if (action === "get_stats") {
      const { data: campaigns } = await sb.from("outreach_campaigns").select("*").order("created_at", { ascending: false });
      const { data: sends } = await sb.from("outreach_sends").select("status");
      const { data: contacts } = await sb.from("outreach_contacts").select("category");

      const stats = {
        total_campaigns: campaigns?.length || 0,
        total_contacts: contacts?.length || 0,
        total_sent: sends?.filter(s => s.status === "sent" || s.status === "delivered" || s.status === "opened").length || 0,
        total_opened: sends?.filter(s => s.status === "opened").length || 0,
        total_replied: sends?.filter(s => s.status === "replied").length || 0,
        total_failed: sends?.filter(s => s.status === "failed" || s.status === "bounced").length || 0,
        by_category: {
          customs_broker: contacts?.filter(c => c.category === "customs_broker").length || 0,
          forwarder: contacts?.filter(c => c.category === "forwarder").length || 0,
          manufacturer: contacts?.filter(c => c.category === "manufacturer").length || 0,
          buyer: contacts?.filter(c => c.category === "buyer").length || 0,
          forwarder_3pl: contacts?.filter(c => c.category === "forwarder_3pl").length || 0,
          brand: contacts?.filter(c => c.category === "brand").length || 0,
          government: contacts?.filter(c => c.category === "government").length || 0,
        },
        campaigns: campaigns || [],
      };
      return json({ ok: true, stats });
    }

    // Action: send_daily_batch — cron-triggered, finds unsent contacts and sends
    if (action === "send_daily_batch") {
      const batchSize = body.batch_size || 90;
      const { data: allContacts } = await sb.from("outreach_contacts").select("id, category, email");
      const { data: allSends } = await sb.from("outreach_sends").select("contact_id").eq("status", "sent");

      const sentContactIds = new Set((allSends || []).map(s => s.contact_id));
      const unsent = (allContacts || []).filter(c => c.email && !sentContactIds.has(c.id));

      if (!unsent.length) return json({ ok: true, message: "No unsent contacts", sent: 0 });

      const batch = unsent.slice(0, batchSize);
      let totalSent = 0, totalFailed = 0;
      const byCat: Record<string, number> = {};

      for (const contact of batch) {
        const template = contact.category || "manufacturer";
        const { data: fullContact } = await sb.from("outreach_contacts").select("*").eq("id", contact.id).single();
        if (!fullContact) continue;

        try {
          const emailHtml = template === "customs_broker"
            ? renderCustomsBrokerEmail(fullContact)
            : template === "forwarder"
            ? renderForwarderEmail(fullContact)
            : template === "manufacturer"
            ? renderManufacturerEmail(fullContact)
            : template === "buyer"
            ? renderBuyerEmail(fullContact)
            : template === "forwarder_3pl"
            ? renderForwarder3PLEmail(fullContact)
            : template === "brand"
            ? renderBrandEmail(fullContact)
            : template === "government"
            ? renderGovernmentEmail(fullContact)
            : renderManufacturerEmail(fullContact);

          const emailSubject = getDefaultSubject(template, fullContact);
          let fromEmail = FROM_EMAIL;
          let res = await sendEmail(resendKey, fromEmail, contact.email, emailSubject, emailHtml);

          if (!res.ok) {
            const errData = await res.json();
            if (res.status === 403 && errData.message?.includes("not verified")) {
              fromEmail = FROM_EMAIL_FALLBACK;
              res = await sendEmail(resendKey, fromEmail, contact.email, emailSubject, emailHtml);
            }
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
          }

          const resData = await res.json();
          const campaignCat = template;
          const { data: campaign } = await sb.from("outreach_campaigns").select("id").eq("category", campaignCat).limit(1).single();

          await sb.from("outreach_sends").insert({
            campaign_id: campaign?.id || null,
            contact_id: contact.id,
            email_to: contact.email,
            subject: emailSubject,
            status: "sent",
            resend_id: resData.id,
          });

          totalSent++;
          byCat[template] = (byCat[template] || 0) + 1;
          await new Promise(r => setTimeout(r, 500));
        } catch (err: unknown) {
          totalFailed++;
          const msg = err instanceof Error ? err.message : String(err);
          await sb.from("outreach_sends").insert({
            contact_id: contact.id,
            email_to: contact.email,
            subject: "",
            status: "failed",
            error: msg,
          });
        }
      }

      return json({ ok: true, sent: totalSent, failed: totalFailed, by_category: byCat, remaining: unsent.length - batch.length });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("send-outreach error:", msg);
    return json({ ok: false, error: msg }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}

async function sendEmail(apiKey: string, from: string, to: string, subject: string, html: string): Promise<Response> {
  return fetch(RESEND_API, {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });
}

function getDefaultSubject(template: string, contact: Record<string, string>): string {
  const name = contact.company_name || "";
  switch (template) {
    case "customs_broker": return `[Whistle AI] ${name} 관세사님, AI 수출 플랫폼 제휴 제안드립니다`;
    case "forwarder": return `[Whistle AI] ${name} 담당자님, AI 수출 물류 제휴 제안드립니다`;
    case "manufacturer": return `[Whistle AI] ${name} 대표님, AI가 수출을 도와드립니다 — 무료 분석 제공`;
    case "buyer": return `[Whistle AI] Source Quality Korean Products with AI — Free Analysis`;
    case "forwarder_3pl": return `[Whistle AI] ${name} 담당자님, AI 수출 플랫폼 3PL/물류 파트너 제안드립니다`;
    case "brand": return `[Whistle AI] ${name} 대표님, 사장님 제품도 수출할 수 있습니다 — 무료 AI 분석`;
    case "government": return `[Whistle AI] ${name} 담당자님, AI 수출지원 플랫폼 협력 제안드립니다`;
    default: return `[Whistle AI] Partnership Opportunity`;
  }
}

function wrapEmail(content: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Noto Sans KR',sans-serif"><div style="max-width:600px;margin:0 auto;padding:40px 24px"><div style="text-align:center;margin-bottom:32px"><img src="https://whistle-ai.com/favicon.svg" width="36" height="36" alt="Whistle AI" style="display:inline-block;vertical-align:middle"><span style="display:inline-block;vertical-align:middle;margin-left:8px;font-size:18px;font-weight:700;color:#0f172a">Whistle AI</span></div><div style="background:#fff;border-radius:12px;padding:32px 28px;border:1px solid #e2e8f0;color:#334155;font-size:15px;line-height:1.8">${content}</div><div style="text-align:center;margin-top:24px;color:#94a3b8;font-size:12px"><p>MOTIVE Global, Inc. · Delaware, USA</p><p><a href="https://whistle-ai.com" style="color:#2563eb">whistle-ai.com</a></p><p style="margin-top:8px">문의: <a href="mailto:creative@mo-tive.com" style="color:#2563eb">creative@mo-tive.com</a></p></div></div></body></html>`;
}

function btn(label: string, href: string): string {
  return `<div style="text-align:center;margin:24px 0"><a href="${href}" style="display:inline-block;padding:12px 32px;background:#2563eb;color:#fff;font-weight:600;font-size:14px;text-decoration:none;border-radius:8px">${label}</a></div>`;
}

function renderCustomsBrokerEmail(contact: Record<string, string>): string {
  const name = contact.company_name || "관세사님";
  return wrapEmail(`
    <h2 style="color:#0f172a;margin:0 0 16px;font-size:20px">${name} 담당자님께</h2>
    <p>안녕하세요, AI 기반 수출 통합 관리 플랫폼 <strong>Whistle AI</strong>를 운영하는 (주)모티브이노베이션 채희웅 대표입니다.</p>
    <p>저희는 현재 <strong>한국 중소 제조사의 수출</strong>을 AI로 지원하는 서비스를 운영 중이며, 관세사 파트너를 모시고 있습니다.</p>

    <div style="background:#f0f9ff;padding:20px;border-radius:10px;margin:20px 0;border-left:4px solid #2563eb">
      <p style="font-weight:700;color:#1e40af;margin:0 0 8px">제휴 혜택</p>
      <ul style="margin:0;padding-left:20px;color:#334155">
        <li>AI가 사전 분류한 HS코드/FTA 데이터 → 업무 효율 극대화</li>
        <li>플랫폼 내 전담 관세사 노출 → 신규 고객 유입</li>
        <li>건당 수수료 정산 → 안정적 수익</li>
        <li>실시간 고객 매칭 → 영업 비용 절감</li>
      </ul>
    </div>

    <p>상세 제안서를 첨부드리며, 15분 온라인 미팅으로 구체적인 협력 방안을 논의하고 싶습니다.</p>
    ${btn("제안서 보기", "https://whistle-ai.com/docs/partnership-proposal-customs-broker-ko.html")}
    ${btn("무료 데모 체험", "https://whistle-ai.com/app")}
    <p style="color:#64748b;font-size:13px;margin-top:20px">* 본 메일은 업무 제휴 목적으로 발송되었습니다. 수신을 원치 않으시면 회신 부탁드립니다.</p>
  `);
}

function renderForwarderEmail(contact: Record<string, string>): string {
  const name = contact.company_name || "담당자님";
  return wrapEmail(`
    <h2 style="color:#0f172a;margin:0 0 16px;font-size:20px">${name} 담당자님께</h2>
    <p>안녕하세요, AI 기반 수출 통합 관리 플랫폼 <strong>Whistle AI</strong>를 운영하는 (주)모티브이노베이션 채희웅 대표입니다.</p>
    <p>저희는 현재 한국 중소 제조사의 수출을 AI로 지원하며, <strong>물류 포워딩 파트너</strong>를 모시고 있습니다.</p>

    <div style="background:#f0fdf4;padding:20px;border-radius:10px;margin:20px 0;border-left:4px solid #10b981">
      <p style="font-weight:700;color:#065f46;margin:0 0 8px">제휴 혜택</p>
      <ul style="margin:0;padding-left:20px;color:#334155">
        <li>플랫폼 내 포워더 전용 매칭 시스템 → 신규 화주 확보</li>
        <li>AI 견적 자동화 연동 → 빠른 견적 응답</li>
        <li>실시간 선적 추적 API 연동 → 고객 신뢰도 향상</li>
        <li>건당 수수료 기반 → 리스크 없는 파트너십</li>
      </ul>
    </div>

    <p>구체적인 제휴 조건은 제안서에 정리되어 있습니다. 짧은 미팅으로 논의하면 좋겠습니다.</p>
    ${btn("제안서 보기", "https://whistle-ai.com/docs/partnership-proposal-forwarder-ko.html")}
    ${btn("무료 데모 체험", "https://whistle-ai.com/app")}
    <p style="color:#64748b;font-size:13px;margin-top:20px">* 본 메일은 업무 제휴 목적으로 발송되었습니다. 수신을 원치 않으시면 회신 부탁드립니다.</p>
  `);
}

function renderManufacturerEmail(contact: Record<string, string>): string {
  const name = contact.company_name || "대표님";
  const industry = contact.industry || "제품";
  return wrapEmail(`
    <h2 style="color:#0f172a;margin:0 0 16px;font-size:20px">${name} 대표님께</h2>
    <p>안녕하세요, AI 기반 수출 통합 관리 플랫폼 <strong>Whistle AI</strong>입니다.</p>
    <p>${name}의 <strong>${industry}</strong> 제품이 해외 시장에서 어떤 기회가 있는지, AI가 <strong>60초 만에 무료 분석</strong>해 드립니다.</p>

    <div style="background:#fffbeb;padding:20px;border-radius:10px;margin:20px 0;border-left:4px solid #f59e0b">
      <p style="font-weight:700;color:#92400e;margin:0 0 8px">AI 수출 분석 13개 항목 무료 제공</p>
      <ul style="margin:0;padding-left:20px;color:#334155">
        <li>HS코드 자동 분류 + 관세율 비교</li>
        <li>FTA 원산지 기준 + 관세 절감 시뮬레이션</li>
        <li>수출 규제/인증 요건 (CE, FDA, KC 등)</li>
        <li>타겟 시장 바이어 매칭 + 경쟁사 분석</li>
        <li>수출 가격 전략 + 물류비 추정</li>
      </ul>
    </div>

    <p>가입만 하시면 <strong>첫 분석이 무료</strong>입니다. 수출을 시작하거나 확대하려는 제조사에게 최적의 도구입니다.</p>
    ${btn("무료 수출 분석 시작하기", "https://whistle-ai.com/app")}
    <p style="color:#64748b;font-size:13px;margin-top:20px">* 본 메일은 한국 제조사 수출 지원 목적으로 발송되었습니다. 수신을 원치 않으시면 회신 부탁드립니다.</p>
  `);
}

function renderBuyerEmail(contact: Record<string, string>): string {
  const name = contact.company_name || "there";
  const country = contact.country || "";
  return wrapEmail(`
    <h2 style="color:#0f172a;margin:0 0 16px;font-size:20px">Hello ${name},</h2>
    <p>I'm reaching out from <strong>Whistle AI</strong>, an AI-powered export management platform connecting international buyers with verified Korean manufacturers.</p>
    <p>South Korea is home to world-class manufacturers in cosmetics, electronics, auto parts, food, and more — backed by <strong>21 Free Trade Agreements</strong> covering 59 countries.</p>

    <div style="background:#f0f9ff;padding:20px;border-radius:10px;margin:20px 0;border-left:4px solid #2563eb">
      <p style="font-weight:700;color:#1e40af;margin:0 0 8px">What Whistle AI Offers Buyers</p>
      <ul style="margin:0;padding-left:20px;color:#334155">
        <li>AI-verified Korean manufacturers with export readiness scores</li>
        <li>Instant HS code classification + tariff calculations for ${country}</li>
        <li>FTA duty savings analysis (average 5-15% cost reduction)</li>
        <li>Secure escrow payments + real-time shipment tracking</li>
        <li>Built-in translation (Korean ↔ English) for seamless communication</li>
      </ul>
    </div>

    <p>Create a free account to browse verified manufacturers and get instant product analysis.</p>
    ${btn("Explore Korean Manufacturers", "https://whistle-ai.com/buyer")}
    <p style="color:#64748b;font-size:13px;margin-top:20px">* This is a one-time business introduction email. Reply to unsubscribe.</p>
  `);
}

function renderForwarder3PLEmail(contact: Record<string, string>): string {
  const name = contact.company_name || "담당자님";
  return wrapEmail(`
    <h2 style="color:#0f172a;margin:0 0 16px;font-size:20px">${name} 담당자님께</h2>
    <p>안녕하세요, AI 기반 수출 통합 관리 플랫폼 <strong>Whistle AI</strong>를 운영하는 (주)모티브이노베이션 채희웅 대표입니다.</p>
    <p>저희는 한국 중소 제조사의 수출을 AI로 지원하며, <strong>3PL/물류 전문 파트너</strong>를 모시고 있습니다.</p>

    <div style="background:#faf5ff;padding:20px;border-radius:10px;margin:20px 0;border-left:4px solid #8b5cf6">
      <p style="font-weight:700;color:#6b21a8;margin:0 0 8px">3PL 파트너 제휴 혜택</p>
      <ul style="margin:0;padding-left:20px;color:#334155">
        <li>AI 기반 화주-물류사 자동 매칭 → <strong>신규 고객 지속 유입</strong></li>
        <li>수출 건별 풀필먼트/창고/라스트마일 연동</li>
        <li>플랫폼 내 3PL 전용 대시보드 → 주문·재고·출고 통합 관리</li>
        <li>건당 수수료 정산 → 초기 비용 없는 파트너십</li>
        <li>중소기업 수출 물량 집하 → 규모의 경제 실현</li>
      </ul>
    </div>

    <p>현재 플랫폼에 등록된 <strong>수출 준비 중인 제조사</strong>들이 물류 파트너를 찾고 있습니다. 짧은 미팅으로 구체적인 협력 방안을 논의하고 싶습니다.</p>
    ${btn("파트너 등록하기", "https://whistle-ai.com/ko#partner")}
    ${btn("무료 AI 수출분석 체험", "https://whistle-ai.com/ko")}
    <p style="color:#64748b;font-size:13px;margin-top:20px">* 본 메일은 업무 제휴 목적으로 발송되었습니다. 수신을 원치 않으시면 회신 부탁드립니다.</p>
  `);
}

function renderBrandEmail(contact: Record<string, string>): string {
  const name = contact.company_name || "대표님";
  const industry = contact.industry || "제품";
  return wrapEmail(`
    <h2 style="color:#0f172a;margin:0 0 16px;font-size:20px">${name} 대표님께</h2>
    <p>안녕하세요, AI 기반 수출 통합 관리 플랫폼 <strong>Whistle AI</strong>입니다.</p>
    <p><strong>사장님 제품도 수출할 수 있습니다.</strong></p>
    <p>${name}의 <strong>${industry}</strong> 제품이 해외에서 어떤 가능성이 있는지, AI가 <strong>60초 만에 무료 분석</strong>해 드립니다.</p>

    <div style="background:#fff7ed;padding:20px;border-radius:10px;margin:20px 0;border-left:4px solid #f97316">
      <p style="font-weight:700;color:#c2410c;margin:0 0 8px">무료 AI 수출분석 — 이런 걸 알 수 있습니다</p>
      <ul style="margin:0;padding-left:20px;color:#334155">
        <li>우리 제품 HS코드 + 수출국별 관세율 비교</li>
        <li>FTA 활용 시 관세 절감액 시뮬레이션</li>
        <li>수출 인증/규제 요건 (FDA, CE, HALAL 등)</li>
        <li>해외 바이어 매칭 + 경쟁 제품 가격 분석</li>
        <li>K-Beauty, K-Food 등 한류 프리미엄 활용 전략</li>
      </ul>
    </div>

    <div style="background:#f0fdf4;padding:16px;border-radius:10px;margin:20px 0">
      <p style="margin:0;color:#065f46;font-size:14px"><strong>수출이 처음이셔도 괜찮습니다.</strong> 관세사·포워더·바이어 매칭까지 AI가 한 번에 도와드립니다. 가입 후 첫 분석은 <strong>완전 무료</strong>입니다.</p>
    </div>

    ${btn("무료 수출분석 시작하기", "https://whistle-ai.com/ko")}
    <p style="color:#64748b;font-size:13px;margin-top:20px">* 본 메일은 한국 중소 브랜드 수출 지원 목적으로 발송되었습니다. 수신을 원치 않으시면 회신 부탁드립니다.</p>
  `);
}

function renderGovernmentEmail(contact: Record<string, string>): string {
  const name = contact.company_name || "담당자님";
  return wrapEmail(`
    <h2 style="color:#0f172a;margin:0 0 16px;font-size:20px">${name} 담당자님께</h2>
    <p>안녕하세요, AI 기반 수출 통합 관리 플랫폼 <strong>Whistle AI</strong>를 운영하는 (주)모티브이노베이션 채희웅 대표입니다.</p>
    <p>저희는 <strong>한국 중소기업의 수출 역량 강화</strong>를 AI 기술로 지원하는 스타트업으로, 귀 기관과의 협력을 제안드립니다.</p>

    <div style="background:#eff6ff;padding:20px;border-radius:10px;margin:20px 0;border-left:4px solid #1d4ed8">
      <p style="font-weight:700;color:#1e3a8a;margin:0 0 8px">Whistle AI 소개</p>
      <ul style="margin:0;padding-left:20px;color:#334155">
        <li>AI 기반 HS코드 분류 + FTA 원산지 판정 자동화</li>
        <li>수출 규제·인증 요건 실시간 분석 (13개 항목)</li>
        <li>해외 바이어 매칭 + 에스크로 결제 + 선적 추적</li>
        <li>관세사·포워더 연계 → 수출 원스톱 플랫폼</li>
      </ul>
    </div>

    <div style="background:#fefce8;padding:20px;border-radius:10px;margin:20px 0;border-left:4px solid #eab308">
      <p style="font-weight:700;color:#854d0e;margin:0 0 8px">협력 제안</p>
      <ul style="margin:0;padding-left:20px;color:#334155">
        <li><strong>수출바우처 수행기관</strong> 등록 — 중소기업 수출 지원 프로그램 연계</li>
        <li><strong>MOU 체결</strong> — 수출 교육·컨설팅 공동 사업</li>
        <li>지자체 수출 지원 사업 내 AI 도구 도입</li>
        <li>KOTRA 해외무역관·바이코리아 연계 협력</li>
        <li>수출 성공 사례 데이터 공유 및 정책 연구 협력</li>
      </ul>
    </div>

    <p>현재 플랫폼에서 <strong>무료 AI 수출분석</strong>을 제공하고 있으며, 중소기업의 수출 진입 장벽을 낮추는 데 실질적 기여를 하고 있습니다.</p>
    <p>구체적인 협력 방안을 논의하기 위해 미팅을 요청드립니다.</p>
    ${btn("Whistle AI 둘러보기", "https://whistle-ai.com/ko")}
    ${btn("파트너 페이지", "https://whistle-ai.com/ko#partner")}
    <p style="color:#64748b;font-size:13px;margin-top:20px">* 본 메일은 공공기관 협력 제안 목적으로 발송되었습니다. 수신을 원치 않으시면 회신 부탁드립니다.</p>
  `);
}
