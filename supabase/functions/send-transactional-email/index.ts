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

// ─── Welcome Email i18n (12 major trade languages) ─────────
// Priority per CEO directive 2026-04-05: send welcome in the user's local language
// based on country → language mapping, not UI language.
type WelcomeStrings = {
  subject: string;
  heading: string;
  body: (name: string) => string;
  cta: string;
  footer: string;
  dir?: "ltr" | "rtl";
};

const WELCOME_I18N: Record<string, WelcomeStrings> = {
  en: {
    subject: "Welcome to Whistle AI!",
    heading: "Welcome! 🎉",
    body: (n) => `Thank you for joining Whistle AI, ${n || "there"}!<br><br>You have 1 free AI export analysis. Upload a product photo to get HS codes, target markets, and pricing strategy in under 60 seconds.`,
    cta: "Start Your First Analysis",
    footer: "Questions? Contact us at support@whistle-ai.com",
  },
  ko: {
    subject: "Whistle AI에 오신 것을 환영합니다!",
    heading: "환영합니다! 🎉",
    body: (n) => `${n || "회원"}님, Whistle AI에 가입해 주셔서 감사합니다.<br><br>무료 AI 수출 분석 1회가 제공됩니다. 제품 사진 한 장으로 HS코드, 타겟 시장, 가격 전략까지 60초 안에 받아보세요.`,
    cta: "첫 분석 시작하기",
    footer: "질문이 있으시면 support@whistle-ai.com으로 문의해 주세요.",
  },
  ja: {
    subject: "Whistle AI へようこそ!",
    heading: "ようこそ! 🎉",
    body: (n) => `${n || "お客様"}、Whistle AI にご登録いただきありがとうございます。<br><br>無料の AI 輸出分析が 1 回ご利用いただけます。製品写真 1 枚で、HS コード・ターゲット市場・価格戦略まで 60 秒で取得できます。`,
    cta: "最初の分析を始める",
    footer: "ご質問は support@whistle-ai.com までお問い合わせください。",
  },
  zh: {
    subject: "欢迎使用 Whistle AI!",
    heading: "欢迎! 🎉",
    body: (n) => `${n || "您好"},感谢您注册 Whistle AI。<br><br>您已获得 1 次免费 AI 出口分析额度。上传一张产品照片,即可在 60 秒内获取 HS 编码、目标市场和定价策略。`,
    cta: "开始第一次分析",
    footer: "如有疑问,请联系 support@whistle-ai.com",
  },
  es: {
    subject: "¡Bienvenido a Whistle AI!",
    heading: "¡Bienvenido! 🎉",
    body: (n) => `¡Gracias por unirte a Whistle AI, ${n || "amigo"}!<br><br>Tienes 1 análisis de exportación con IA gratis. Sube una foto de tu producto para obtener códigos HS, mercados objetivo y estrategia de precios en menos de 60 segundos.`,
    cta: "Comenzar mi primer análisis",
    footer: "¿Preguntas? Escríbenos a support@whistle-ai.com",
  },
  de: {
    subject: "Willkommen bei Whistle AI!",
    heading: "Willkommen! 🎉",
    body: (n) => `Vielen Dank für Ihre Registrierung bei Whistle AI, ${n || "willkommen"}!<br><br>Sie erhalten 1 kostenlose KI-Exportanalyse. Laden Sie ein Produktfoto hoch und erhalten Sie in unter 60 Sekunden HS-Codes, Zielmärkte und Preisstrategie.`,
    cta: "Erste Analyse starten",
    footer: "Fragen? Schreiben Sie uns an support@whistle-ai.com",
  },
  fr: {
    subject: "Bienvenue sur Whistle AI !",
    heading: "Bienvenue ! 🎉",
    body: (n) => `Merci de rejoindre Whistle AI, ${n || "cher utilisateur"} !<br><br>Vous bénéficiez d'une analyse d'exportation IA gratuite. Téléchargez une photo de produit pour obtenir les codes SH, les marchés cibles et la stratégie de prix en moins de 60 secondes.`,
    cta: "Lancer ma première analyse",
    footer: "Des questions ? Contactez-nous à support@whistle-ai.com",
  },
  vi: {
    subject: "Chào mừng đến với Whistle AI!",
    heading: "Chào mừng! 🎉",
    body: (n) => `Cảm ơn ${n || "bạn"} đã tham gia Whistle AI!<br><br>Bạn có 1 lượt phân tích xuất khẩu AI miễn phí. Tải lên một bức ảnh sản phẩm để nhận mã HS, thị trường mục tiêu và chiến lược giá trong vòng 60 giây.`,
    cta: "Bắt đầu phân tích đầu tiên",
    footer: "Câu hỏi? Liên hệ support@whistle-ai.com",
  },
  id: {
    subject: "Selamat Datang di Whistle AI!",
    heading: "Selamat Datang! 🎉",
    body: (n) => `Terima kasih telah bergabung dengan Whistle AI, ${n || "Anda"}!<br><br>Anda mendapatkan 1 analisis ekspor AI gratis. Unggah foto produk untuk mendapatkan kode HS, pasar target, dan strategi harga dalam waktu kurang dari 60 detik.`,
    cta: "Mulai Analisis Pertama",
    footer: "Ada pertanyaan? Hubungi support@whistle-ai.com",
  },
  th: {
    subject: "ยินดีต้อนรับสู่ Whistle AI!",
    heading: "ยินดีต้อนรับ! 🎉",
    body: (n) => `ขอบคุณที่เข้าร่วม Whistle AI ${n || ""}!<br><br>คุณได้รับการวิเคราะห์การส่งออก AI ฟรี 1 ครั้ง อัปโหลดรูปภาพสินค้าเพื่อรับรหัส HS ตลาดเป้าหมาย และกลยุทธ์ราคาภายใน 60 วินาที`,
    cta: "เริ่มการวิเคราะห์ครั้งแรก",
    footer: "มีคำถาม? ติดต่อ support@whistle-ai.com",
  },
  ar: {
    subject: "مرحبًا بك في Whistle AI!",
    heading: "مرحبًا! 🎉",
    body: (n) => `شكرًا لانضمامك إلى Whistle AI، ${n || "عزيزي"}!<br><br>لديك تحليل تصدير واحد مجاني بالذكاء الاصطناعي. قم بتحميل صورة المنتج للحصول على رموز HS والأسواق المستهدفة واستراتيجية التسعير في أقل من 60 ثانية.`,
    cta: "ابدأ التحليل الأول",
    footer: "أسئلة؟ راسلنا على support@whistle-ai.com",
    dir: "rtl",
  },
  pt: {
    subject: "Bem-vindo ao Whistle AI!",
    heading: "Bem-vindo! 🎉",
    body: (n) => `Obrigado por se juntar ao Whistle AI, ${n || "amigo"}!<br><br>Você tem 1 análise de exportação com IA gratuita. Envie uma foto do produto para obter códigos HS, mercados-alvo e estratégia de preços em menos de 60 segundos.`,
    cta: "Iniciar minha primeira análise",
    footer: "Dúvidas? Escreva para support@whistle-ai.com",
  },
};

// Country → language mapping (covers 31 target countries from whistle-target-countries.md)
export function countryToLang(country?: string | null): string {
  if (!country) return "en";
  const c = country.toUpperCase();
  const map: Record<string, string> = {
    KR: "ko",
    JP: "ja",
    CN: "zh", TW: "zh", HK: "zh", MO: "zh",
    US: "en", GB: "en", AU: "en", CA: "en", NZ: "en", IE: "en",
    SG: "en", PH: "en", IN: "en", PK: "en", MY: "en", ZA: "en", NG: "en",
    DE: "de", AT: "de", CH: "de",
    FR: "fr", BE: "fr", LU: "fr",
    ES: "es", MX: "es", AR: "es", CL: "es", CO: "es", PE: "es",
    BR: "pt", PT: "pt",
    VN: "vi",
    ID: "id",
    TH: "th",
    AE: "ar", SA: "ar", EG: "ar", QA: "ar", KW: "ar",
    BH: "ar", OM: "ar", JO: "ar", LB: "ar", MA: "ar",
  };
  return map[c] || "en";
}

function normalizeLang(lang?: string | null): string {
  if (!lang) return "en";
  const base = lang.toLowerCase().split(/[-_]/)[0];
  return WELCOME_I18N[base] ? base : "en";
}

// ─── Full i18n label pack (12 languages) ────────────────────
type LabelPack = {
  amount: string; type: string; date: string; plan: string; status: string;
  tracking: string; carrier: string; eta: string; product: string; deal: string;
  change: string; currentPlan: string; targetMarkets: string; exportScore: string;
  docType: string; docNumber: string; orderNo: string; quoteAmount: string;
  ctaDashboard: string; ctaDeal: string; ctaOrder: string; ctaDoc: string;
  ctaSample: string; ctaTrack: string; ctaQuote: string; ctaSub: string;
  ctaMsg: string; ctaBuyer: string; ctaReport: string; ctaApp: string;
  hintReceipt: string; hintReport: string; hintNotif: string; hint24h: string;
  hintSubQ: string; hintReviewSign: string; hintReviewQuote: string;
  pay_subj: (c: string, a: string) => string; pay_head: string;
  ana_subj: (p: string) => string; ana_head: string; ana_body: (p: string) => string;
  buy_subj: (n: string) => string; buy_head: string; buy_body: (n: string, c: string) => string;
  msg_subj: (n: string) => string; msg_head: string; msg_body: (n: string) => string;
  sub_subj: (a: string) => string; sub_head: string;
  escrow_subj: (a: string) => string; escrow_head: string;
  ship_subj: (t: string) => string; ship_head: string;
  quote_subj: (t: string) => string; quote_head: string;
  order_subj: (t: string) => string; order_head: string;
  doc_subj: (t: string) => string; doc_head: string;
  sample_subj: (t: string) => string; sample_head: string;
};

export const LP: Record<string, LabelPack> = {
  en: {
    amount: "Amount", type: "Type", date: "Date", plan: "Plan", status: "Status",
    tracking: "Tracking No", carrier: "Carrier", eta: "ETA", product: "Product", deal: "Deal",
    change: "Change", currentPlan: "Current Plan", targetMarkets: "Target Markets", exportScore: "Export Score",
    docType: "Document Type", docNumber: "Doc No", orderNo: "Order No", quoteAmount: "Quote Amount",
    ctaDashboard: "Go to Dashboard", ctaDeal: "View Deal", ctaOrder: "View Order", ctaDoc: "View Document",
    ctaSample: "View Sample Status", ctaTrack: "Track Shipment", ctaQuote: "Review Quote", ctaSub: "Manage Subscription",
    ctaMsg: "View Message", ctaBuyer: "View Buyer Details", ctaReport: "View Full Report", ctaApp: "Go to App",
    hintReceipt: "You can view your receipt in the Stripe billing portal.",
    hintReport: "You can access this report anytime from your dashboard.",
    hintNotif: "You can manage your notification preferences in Settings.",
    hint24h: "Responding within 24 hours triples your matching success rate.",
    hintSubQ: "Subscription questions: support@whistle-ai.com",
    hintReviewSign: "Please review and sign the document.",
    hintReviewQuote: "Please review the quote and approve or request changes.",
    pay_subj: (c, a) => `Payment Confirmed — ${c} ${a}`, pay_head: "Payment Confirmed ✅",
    ana_subj: (p) => `AI Analysis Complete — ${p || "Product"}`, ana_head: "AI Analysis Complete 📊",
    ana_body: (p) => `Your AI export analysis for <strong>${p || "your product"}</strong> is ready.`,
    buy_subj: (n) => `New Buyer Match — ${n || "Buyer"}`, buy_head: "New Buyer Match 🤝",
    buy_body: (n, c) => `<strong>${n || "A buyer"}</strong>${c ? " from " + c : ""} is interested in your product.`,
    msg_subj: (n) => `New Message — ${n || "Partner"}`, msg_head: "New Message 💬",
    msg_body: (n) => `<strong>${n || "Your partner"}</strong> sent you a message.`,
    sub_subj: (a) => `Subscription ${a || "Updated"}`, sub_head: "Subscription Updated",
    escrow_subj: (a) => `Escrow Update — ${a || ""}`, escrow_head: "Escrow Payment Update",
    ship_subj: (t) => `Shipment Update — ${t || ""}`, ship_head: "Shipment Update 🚢",
    quote_subj: (t) => `Quote Received — ${t || ""}`, quote_head: "New Quote Received 📋",
    order_subj: (t) => `Order Status Update — ${t || ""}`, order_head: "Order Status Updated 📦",
    doc_subj: (t) => `Document Ready — ${t || ""}`, doc_head: "Document Ready 📄",
    sample_subj: (t) => `Sample Update — ${t || ""}`, sample_head: "Sample Update 📦",
  },
  ko: {
    amount: "금액", type: "유형", date: "날짜", plan: "플랜", status: "상태",
    tracking: "운송장", carrier: "운송사", eta: "도착예정", product: "제품", deal: "거래",
    change: "변경 내용", currentPlan: "현재 플랜", targetMarkets: "추천 시장", exportScore: "수출 적합도",
    docType: "서류 유형", docNumber: "문서 번호", orderNo: "주문번호", quoteAmount: "견적 금액",
    ctaDashboard: "대시보드로 이동", ctaDeal: "거래 확인하기", ctaOrder: "주문 확인하기", ctaDoc: "서류 확인하기",
    ctaSample: "샘플 상태 확인", ctaTrack: "배송 추적하기", ctaQuote: "견적서 확인하기", ctaSub: "구독 관리",
    ctaMsg: "메시지 확인하기", ctaBuyer: "바이어 확인하기", ctaReport: "전체 보고서 보기", ctaApp: "앱으로 이동",
    hintReceipt: "영수증은 Stripe 결제 포털에서 확인하실 수 있습니다.",
    hintReport: "보고서는 대시보드에서 언제든 다시 확인할 수 있습니다.",
    hintNotif: "이 알림을 받고 싶지 않으시면 설정에서 변경할 수 있습니다.",
    hint24h: "24시간 이내 응답하면 매칭 성사율이 3배 높아집니다.",
    hintSubQ: "구독 관련 문의: support@whistle-ai.com",
    hintReviewSign: "서류를 검토하고 서명해 주세요.",
    hintReviewQuote: "견적서를 검토하고 승인 또는 수정 요청을 해주세요.",
    pay_subj: (c, a) => `결제 확인 — ${c} ${a}`, pay_head: "결제가 완료되었습니다 ✅",
    ana_subj: (p) => `AI 분석 완료 — ${p || "제품"}`, ana_head: "AI 분석이 완료되었습니다 📊",
    ana_body: (p) => `<strong>${p || "제품"}</strong>의 AI 수출 분석이 완료되었습니다.`,
    buy_subj: (n) => `새로운 바이어 매칭 — ${n || "Buyer"}`, buy_head: "새로운 바이어가 매칭되었습니다 🤝",
    buy_body: (n, c) => `<strong>${n || "바이어"}</strong>${c ? " (" + c + ")" : ""}가 관심을 보였습니다.`,
    msg_subj: (n) => `새 메시지 — ${n || "상대방"}`, msg_head: "새 메시지가 도착했습니다 💬",
    msg_body: (n) => `<strong>${n || "상대방"}</strong>이 메시지를 보냈습니다.`,
    sub_subj: (a) => `구독 변경 — ${a || "업데이트"}`, sub_head: "구독이 변경되었습니다",
    escrow_subj: (a) => `에스크로 업데이트 — ${a || ""}`, escrow_head: "에스크로 결제 업데이트",
    ship_subj: (t) => `배송 업데이트 — ${t || ""}`, ship_head: "배송 상태가 업데이트되었습니다 🚢",
    quote_subj: (t) => `견적서 수신 — ${t || ""}`, quote_head: "새 견적서가 도착했습니다 📋",
    order_subj: (t) => `주문 상태 변경 — ${t || ""}`, order_head: "주문 상태가 변경되었습니다 📦",
    doc_subj: (t) => `서류 준비 완료 — ${t || ""}`, doc_head: "서류가 준비되었습니다 📄",
    sample_subj: (t) => `샘플 업데이트 — ${t || ""}`, sample_head: "샘플 상태가 업데이트되었습니다 📦",
  },
  ja: {
    amount: "金額", type: "種別", date: "日付", plan: "プラン", status: "ステータス",
    tracking: "追跡番号", carrier: "配送業者", eta: "到着予定", product: "製品", deal: "取引",
    change: "変更内容", currentPlan: "現在のプラン", targetMarkets: "ターゲット市場", exportScore: "輸出適合度",
    docType: "書類種別", docNumber: "書類番号", orderNo: "注文番号", quoteAmount: "見積金額",
    ctaDashboard: "ダッシュボードへ", ctaDeal: "取引を見る", ctaOrder: "注文を見る", ctaDoc: "書類を見る",
    ctaSample: "サンプル状況を見る", ctaTrack: "配送を追跡", ctaQuote: "見積を確認", ctaSub: "サブスクリプション管理",
    ctaMsg: "メッセージを見る", ctaBuyer: "バイヤー詳細を見る", ctaReport: "レポート全文を見る", ctaApp: "アプリへ移動",
    hintReceipt: "領収書は Stripe 請求ポータルで確認できます。",
    hintReport: "レポートはダッシュボードからいつでも再確認できます。",
    hintNotif: "通知の設定は「設定」から変更できます。",
    hint24h: "24時間以内に返信すると成約率が3倍になります。",
    hintSubQ: "サブスクリプションのお問い合わせ: support@whistle-ai.com",
    hintReviewSign: "書類をご確認のうえ、署名してください。",
    hintReviewQuote: "見積を確認し、承認または修正を依頼してください。",
    pay_subj: (c, a) => `お支払い確認 — ${c} ${a}`, pay_head: "お支払いが完了しました ✅",
    ana_subj: (p) => `AI 分析完了 — ${p || "製品"}`, ana_head: "AI 分析が完了しました 📊",
    ana_body: (p) => `<strong>${p || "製品"}</strong> の AI 輸出分析が完了しました。`,
    buy_subj: (n) => `新規バイヤーマッチ — ${n || "バイヤー"}`, buy_head: "新しいバイヤーがマッチしました 🤝",
    buy_body: (n, c) => `<strong>${n || "バイヤー"}</strong>${c ? " (" + c + ")" : ""} が関心を示しています。`,
    msg_subj: (n) => `新着メッセージ — ${n || "パートナー"}`, msg_head: "新しいメッセージが届きました 💬",
    msg_body: (n) => `<strong>${n || "パートナー"}</strong> からメッセージが届きました。`,
    sub_subj: (a) => `サブスクリプション変更 — ${a || "更新"}`, sub_head: "サブスクリプションが更新されました",
    escrow_subj: (a) => `エスクロー更新 — ${a || ""}`, escrow_head: "エスクロー決済の更新",
    ship_subj: (t) => `配送更新 — ${t || ""}`, ship_head: "配送状況が更新されました 🚢",
    quote_subj: (t) => `見積受領 — ${t || ""}`, quote_head: "新しい見積が届きました 📋",
    order_subj: (t) => `注文ステータス変更 — ${t || ""}`, order_head: "注文ステータスが更新されました 📦",
    doc_subj: (t) => `書類準備完了 — ${t || ""}`, doc_head: "書類が準備されました 📄",
    sample_subj: (t) => `サンプル更新 — ${t || ""}`, sample_head: "サンプルが更新されました 📦",
  },
  zh: {
    amount: "金额", type: "类型", date: "日期", plan: "套餐", status: "状态",
    tracking: "运单号", carrier: "承运商", eta: "预计到达", product: "产品", deal: "交易",
    change: "变更内容", currentPlan: "当前套餐", targetMarkets: "目标市场", exportScore: "出口适合度",
    docType: "文件类型", docNumber: "文件编号", orderNo: "订单号", quoteAmount: "报价金额",
    ctaDashboard: "前往仪表板", ctaDeal: "查看交易", ctaOrder: "查看订单", ctaDoc: "查看文件",
    ctaSample: "查看样品状态", ctaTrack: "跟踪发货", ctaQuote: "查看报价", ctaSub: "管理订阅",
    ctaMsg: "查看消息", ctaBuyer: "查看买家详情", ctaReport: "查看完整报告", ctaApp: "前往应用",
    hintReceipt: "您可以在 Stripe 账单门户中查看收据。",
    hintReport: "您可以随时从仪表板访问此报告。",
    hintNotif: "可在设置中管理通知偏好。",
    hint24h: "24 小时内回复可将匹配成功率提高 3 倍。",
    hintSubQ: "订阅咨询: support@whistle-ai.com",
    hintReviewSign: "请查看并签署该文件。",
    hintReviewQuote: "请审核报价并批准或请求修改。",
    pay_subj: (c, a) => `付款确认 — ${c} ${a}`, pay_head: "付款已完成 ✅",
    ana_subj: (p) => `AI 分析完成 — ${p || "产品"}`, ana_head: "AI 分析已完成 📊",
    ana_body: (p) => `<strong>${p || "产品"}</strong> 的 AI 出口分析已完成。`,
    buy_subj: (n) => `新买家匹配 — ${n || "买家"}`, buy_head: "有新买家与您匹配 🤝",
    buy_body: (n, c) => `<strong>${n || "买家"}</strong>${c ? " (" + c + ")" : ""} 对您的产品感兴趣。`,
    msg_subj: (n) => `新消息 — ${n || "伙伴"}`, msg_head: "您有一条新消息 💬",
    msg_body: (n) => `<strong>${n || "伙伴"}</strong> 给您发送了消息。`,
    sub_subj: (a) => `订阅变更 — ${a || "更新"}`, sub_head: "订阅已更新",
    escrow_subj: (a) => `托管更新 — ${a || ""}`, escrow_head: "托管付款更新",
    ship_subj: (t) => `发货更新 — ${t || ""}`, ship_head: "发货状态已更新 🚢",
    quote_subj: (t) => `收到报价 — ${t || ""}`, quote_head: "收到新报价 📋",
    order_subj: (t) => `订单状态更新 — ${t || ""}`, order_head: "订单状态已更新 📦",
    doc_subj: (t) => `文件就绪 — ${t || ""}`, doc_head: "文件已准备好 📄",
    sample_subj: (t) => `样品更新 — ${t || ""}`, sample_head: "样品状态已更新 📦",
  },
  es: {
    amount: "Importe", type: "Tipo", date: "Fecha", plan: "Plan", status: "Estado",
    tracking: "N.º de seguimiento", carrier: "Transportista", eta: "Llegada estimada", product: "Producto", deal: "Operación",
    change: "Cambio", currentPlan: "Plan actual", targetMarkets: "Mercados objetivo", exportScore: "Puntuación de exportación",
    docType: "Tipo de documento", docNumber: "N.º de doc.", orderNo: "N.º de pedido", quoteAmount: "Importe de la cotización",
    ctaDashboard: "Ir al panel", ctaDeal: "Ver operación", ctaOrder: "Ver pedido", ctaDoc: "Ver documento",
    ctaSample: "Ver estado de muestra", ctaTrack: "Rastrear envío", ctaQuote: "Revisar cotización", ctaSub: "Gestionar suscripción",
    ctaMsg: "Ver mensaje", ctaBuyer: "Ver detalles del comprador", ctaReport: "Ver informe completo", ctaApp: "Ir a la app",
    hintReceipt: "Puedes ver tu recibo en el portal de facturación de Stripe.",
    hintReport: "Puedes acceder a este informe en cualquier momento desde tu panel.",
    hintNotif: "Puedes gestionar tus preferencias de notificación en Ajustes.",
    hint24h: "Responder en menos de 24 horas triplica tu tasa de éxito.",
    hintSubQ: "Consultas sobre suscripción: support@whistle-ai.com",
    hintReviewSign: "Por favor, revisa y firma el documento.",
    hintReviewQuote: "Revisa la cotización y apruébala o solicita cambios.",
    pay_subj: (c, a) => `Pago confirmado — ${c} ${a}`, pay_head: "Pago confirmado ✅",
    ana_subj: (p) => `Análisis IA completado — ${p || "Producto"}`, ana_head: "Análisis IA completado 📊",
    ana_body: (p) => `Tu análisis de exportación con IA de <strong>${p || "tu producto"}</strong> está listo.`,
    buy_subj: (n) => `Nuevo comprador coincidente — ${n || "Comprador"}`, buy_head: "Nueva coincidencia de comprador 🤝",
    buy_body: (n, c) => `<strong>${n || "Un comprador"}</strong>${c ? " de " + c : ""} está interesado en tu producto.`,
    msg_subj: (n) => `Nuevo mensaje — ${n || "Socio"}`, msg_head: "Nuevo mensaje 💬",
    msg_body: (n) => `<strong>${n || "Tu socio"}</strong> te ha enviado un mensaje.`,
    sub_subj: (a) => `Suscripción ${a || "actualizada"}`, sub_head: "Suscripción actualizada",
    escrow_subj: (a) => `Actualización de custodia — ${a || ""}`, escrow_head: "Actualización del pago en custodia",
    ship_subj: (t) => `Actualización de envío — ${t || ""}`, ship_head: "Actualización de envío 🚢",
    quote_subj: (t) => `Cotización recibida — ${t || ""}`, quote_head: "Nueva cotización recibida 📋",
    order_subj: (t) => `Actualización de pedido — ${t || ""}`, order_head: "Estado del pedido actualizado 📦",
    doc_subj: (t) => `Documento listo — ${t || ""}`, doc_head: "Documento listo 📄",
    sample_subj: (t) => `Actualización de muestra — ${t || ""}`, sample_head: "Actualización de muestra 📦",
  },
  de: {
    amount: "Betrag", type: "Typ", date: "Datum", plan: "Plan", status: "Status",
    tracking: "Sendungsnummer", carrier: "Spediteur", eta: "Voraussichtliche Ankunft", product: "Produkt", deal: "Transaktion",
    change: "Änderung", currentPlan: "Aktueller Plan", targetMarkets: "Zielmärkte", exportScore: "Export-Score",
    docType: "Dokumenttyp", docNumber: "Dok.-Nr.", orderNo: "Bestellnr.", quoteAmount: "Angebotsbetrag",
    ctaDashboard: "Zum Dashboard", ctaDeal: "Transaktion ansehen", ctaOrder: "Bestellung ansehen", ctaDoc: "Dokument ansehen",
    ctaSample: "Musterstatus ansehen", ctaTrack: "Sendung verfolgen", ctaQuote: "Angebot prüfen", ctaSub: "Abo verwalten",
    ctaMsg: "Nachricht ansehen", ctaBuyer: "Käuferdetails ansehen", ctaReport: "Vollständigen Bericht ansehen", ctaApp: "Zur App",
    hintReceipt: "Ihre Quittung finden Sie im Stripe-Abrechnungsportal.",
    hintReport: "Sie können diesen Bericht jederzeit über Ihr Dashboard abrufen.",
    hintNotif: "Sie können Ihre Benachrichtigungseinstellungen in den Einstellungen verwalten.",
    hint24h: "Eine Antwort innerhalb von 24 Stunden verdreifacht Ihre Erfolgsquote.",
    hintSubQ: "Abo-Fragen: support@whistle-ai.com",
    hintReviewSign: "Bitte prüfen und unterzeichnen Sie das Dokument.",
    hintReviewQuote: "Bitte prüfen Sie das Angebot und genehmigen Sie es oder fordern Sie Änderungen an.",
    pay_subj: (c, a) => `Zahlung bestätigt — ${c} ${a}`, pay_head: "Zahlung bestätigt ✅",
    ana_subj: (p) => `KI-Analyse abgeschlossen — ${p || "Produkt"}`, ana_head: "KI-Analyse abgeschlossen 📊",
    ana_body: (p) => `Ihre KI-Exportanalyse für <strong>${p || "Ihr Produkt"}</strong> ist fertig.`,
    buy_subj: (n) => `Neuer Käufer-Match — ${n || "Käufer"}`, buy_head: "Neuer Käufer-Match 🤝",
    buy_body: (n, c) => `<strong>${n || "Ein Käufer"}</strong>${c ? " aus " + c : ""} interessiert sich für Ihr Produkt.`,
    msg_subj: (n) => `Neue Nachricht — ${n || "Partner"}`, msg_head: "Neue Nachricht 💬",
    msg_body: (n) => `<strong>${n || "Ihr Partner"}</strong> hat Ihnen eine Nachricht gesendet.`,
    sub_subj: (a) => `Abonnement ${a || "aktualisiert"}`, sub_head: "Abonnement aktualisiert",
    escrow_subj: (a) => `Treuhand-Update — ${a || ""}`, escrow_head: "Treuhandzahlung aktualisiert",
    ship_subj: (t) => `Versand-Update — ${t || ""}`, ship_head: "Versandstatus aktualisiert 🚢",
    quote_subj: (t) => `Angebot erhalten — ${t || ""}`, quote_head: "Neues Angebot erhalten 📋",
    order_subj: (t) => `Bestellstatus-Update — ${t || ""}`, order_head: "Bestellstatus aktualisiert 📦",
    doc_subj: (t) => `Dokument bereit — ${t || ""}`, doc_head: "Dokument bereit 📄",
    sample_subj: (t) => `Muster-Update — ${t || ""}`, sample_head: "Muster aktualisiert 📦",
  },
  fr: {
    amount: "Montant", type: "Type", date: "Date", plan: "Forfait", status: "Statut",
    tracking: "N° de suivi", carrier: "Transporteur", eta: "Arrivée prévue", product: "Produit", deal: "Transaction",
    change: "Modification", currentPlan: "Forfait actuel", targetMarkets: "Marchés cibles", exportScore: "Score d'exportation",
    docType: "Type de document", docNumber: "N° de doc.", orderNo: "N° de commande", quoteAmount: "Montant du devis",
    ctaDashboard: "Accéder au tableau de bord", ctaDeal: "Voir la transaction", ctaOrder: "Voir la commande", ctaDoc: "Voir le document",
    ctaSample: "Voir l'état de l'échantillon", ctaTrack: "Suivre l'envoi", ctaQuote: "Examiner le devis", ctaSub: "Gérer l'abonnement",
    ctaMsg: "Voir le message", ctaBuyer: "Voir les détails de l'acheteur", ctaReport: "Voir le rapport complet", ctaApp: "Aller à l'app",
    hintReceipt: "Vous pouvez consulter votre reçu dans le portail de facturation Stripe.",
    hintReport: "Vous pouvez accéder à ce rapport à tout moment depuis votre tableau de bord.",
    hintNotif: "Vous pouvez gérer vos préférences de notification dans les paramètres.",
    hint24h: "Répondre en moins de 24 heures triple votre taux de réussite.",
    hintSubQ: "Questions sur l'abonnement : support@whistle-ai.com",
    hintReviewSign: "Veuillez examiner et signer le document.",
    hintReviewQuote: "Veuillez examiner le devis et l'approuver ou demander des modifications.",
    pay_subj: (c, a) => `Paiement confirmé — ${c} ${a}`, pay_head: "Paiement confirmé ✅",
    ana_subj: (p) => `Analyse IA terminée — ${p || "Produit"}`, ana_head: "Analyse IA terminée 📊",
    ana_body: (p) => `Votre analyse d'exportation IA pour <strong>${p || "votre produit"}</strong> est prête.`,
    buy_subj: (n) => `Nouvelle correspondance acheteur — ${n || "Acheteur"}`, buy_head: "Nouvelle correspondance acheteur 🤝",
    buy_body: (n, c) => `<strong>${n || "Un acheteur"}</strong>${c ? " de " + c : ""} est intéressé par votre produit.`,
    msg_subj: (n) => `Nouveau message — ${n || "Partenaire"}`, msg_head: "Nouveau message 💬",
    msg_body: (n) => `<strong>${n || "Votre partenaire"}</strong> vous a envoyé un message.`,
    sub_subj: (a) => `Abonnement ${a || "mis à jour"}`, sub_head: "Abonnement mis à jour",
    escrow_subj: (a) => `Mise à jour séquestre — ${a || ""}`, escrow_head: "Mise à jour du paiement sous séquestre",
    ship_subj: (t) => `Mise à jour d'expédition — ${t || ""}`, ship_head: "Statut d'expédition mis à jour 🚢",
    quote_subj: (t) => `Devis reçu — ${t || ""}`, quote_head: "Nouveau devis reçu 📋",
    order_subj: (t) => `Mise à jour de commande — ${t || ""}`, order_head: "Statut de commande mis à jour 📦",
    doc_subj: (t) => `Document prêt — ${t || ""}`, doc_head: "Document prêt 📄",
    sample_subj: (t) => `Mise à jour d'échantillon — ${t || ""}`, sample_head: "Échantillon mis à jour 📦",
  },
  vi: {
    amount: "Số tiền", type: "Loại", date: "Ngày", plan: "Gói", status: "Trạng thái",
    tracking: "Mã vận đơn", carrier: "Hãng vận chuyển", eta: "Dự kiến đến", product: "Sản phẩm", deal: "Giao dịch",
    change: "Thay đổi", currentPlan: "Gói hiện tại", targetMarkets: "Thị trường mục tiêu", exportScore: "Điểm xuất khẩu",
    docType: "Loại tài liệu", docNumber: "Số tài liệu", orderNo: "Số đơn hàng", quoteAmount: "Số tiền báo giá",
    ctaDashboard: "Đến trang quản lý", ctaDeal: "Xem giao dịch", ctaOrder: "Xem đơn hàng", ctaDoc: "Xem tài liệu",
    ctaSample: "Xem trạng thái mẫu", ctaTrack: "Theo dõi vận chuyển", ctaQuote: "Xem báo giá", ctaSub: "Quản lý đăng ký",
    ctaMsg: "Xem tin nhắn", ctaBuyer: "Xem chi tiết người mua", ctaReport: "Xem báo cáo đầy đủ", ctaApp: "Mở ứng dụng",
    hintReceipt: "Bạn có thể xem biên lai trong cổng thanh toán Stripe.",
    hintReport: "Bạn có thể truy cập báo cáo này bất kỳ lúc nào từ bảng điều khiển.",
    hintNotif: "Bạn có thể quản lý tùy chọn thông báo trong phần Cài đặt.",
    hint24h: "Trả lời trong vòng 24 giờ tăng tỷ lệ thành công lên 3 lần.",
    hintSubQ: "Câu hỏi về đăng ký: support@whistle-ai.com",
    hintReviewSign: "Vui lòng xem xét và ký tài liệu.",
    hintReviewQuote: "Vui lòng xem xét báo giá và phê duyệt hoặc yêu cầu thay đổi.",
    pay_subj: (c, a) => `Thanh toán đã xác nhận — ${c} ${a}`, pay_head: "Thanh toán đã xác nhận ✅",
    ana_subj: (p) => `Phân tích AI hoàn tất — ${p || "Sản phẩm"}`, ana_head: "Phân tích AI hoàn tất 📊",
    ana_body: (p) => `Phân tích xuất khẩu AI cho <strong>${p || "sản phẩm của bạn"}</strong> đã sẵn sàng.`,
    buy_subj: (n) => `Người mua mới phù hợp — ${n || "Người mua"}`, buy_head: "Người mua mới phù hợp 🤝",
    buy_body: (n, c) => `<strong>${n || "Một người mua"}</strong>${c ? " từ " + c : ""} đang quan tâm đến sản phẩm của bạn.`,
    msg_subj: (n) => `Tin nhắn mới — ${n || "Đối tác"}`, msg_head: "Tin nhắn mới 💬",
    msg_body: (n) => `<strong>${n || "Đối tác của bạn"}</strong> đã gửi cho bạn một tin nhắn.`,
    sub_subj: (a) => `Đăng ký ${a || "đã cập nhật"}`, sub_head: "Đăng ký đã cập nhật",
    escrow_subj: (a) => `Cập nhật ký quỹ — ${a || ""}`, escrow_head: "Cập nhật thanh toán ký quỹ",
    ship_subj: (t) => `Cập nhật vận chuyển — ${t || ""}`, ship_head: "Cập nhật vận chuyển 🚢",
    quote_subj: (t) => `Đã nhận báo giá — ${t || ""}`, quote_head: "Đã nhận báo giá mới 📋",
    order_subj: (t) => `Cập nhật đơn hàng — ${t || ""}`, order_head: "Trạng thái đơn hàng đã cập nhật 📦",
    doc_subj: (t) => `Tài liệu sẵn sàng — ${t || ""}`, doc_head: "Tài liệu đã sẵn sàng 📄",
    sample_subj: (t) => `Cập nhật mẫu — ${t || ""}`, sample_head: "Trạng thái mẫu đã cập nhật 📦",
  },
  id: {
    amount: "Jumlah", type: "Jenis", date: "Tanggal", plan: "Paket", status: "Status",
    tracking: "Nomor resi", carrier: "Kurir", eta: "Perkiraan tiba", product: "Produk", deal: "Transaksi",
    change: "Perubahan", currentPlan: "Paket saat ini", targetMarkets: "Pasar target", exportScore: "Skor ekspor",
    docType: "Jenis dokumen", docNumber: "Nomor dokumen", orderNo: "Nomor pesanan", quoteAmount: "Jumlah penawaran",
    ctaDashboard: "Buka dasbor", ctaDeal: "Lihat transaksi", ctaOrder: "Lihat pesanan", ctaDoc: "Lihat dokumen",
    ctaSample: "Lihat status sampel", ctaTrack: "Lacak pengiriman", ctaQuote: "Tinjau penawaran", ctaSub: "Kelola langganan",
    ctaMsg: "Lihat pesan", ctaBuyer: "Lihat detail pembeli", ctaReport: "Lihat laporan lengkap", ctaApp: "Buka aplikasi",
    hintReceipt: "Anda dapat melihat tanda terima di portal penagihan Stripe.",
    hintReport: "Anda dapat mengakses laporan ini kapan saja dari dasbor Anda.",
    hintNotif: "Anda dapat mengelola preferensi notifikasi di Pengaturan.",
    hint24h: "Membalas dalam 24 jam meningkatkan tingkat keberhasilan pencocokan 3 kali lipat.",
    hintSubQ: "Pertanyaan langganan: support@whistle-ai.com",
    hintReviewSign: "Silakan tinjau dan tanda tangani dokumen.",
    hintReviewQuote: "Silakan tinjau penawaran dan setujui atau minta perubahan.",
    pay_subj: (c, a) => `Pembayaran dikonfirmasi — ${c} ${a}`, pay_head: "Pembayaran dikonfirmasi ✅",
    ana_subj: (p) => `Analisis AI selesai — ${p || "Produk"}`, ana_head: "Analisis AI selesai 📊",
    ana_body: (p) => `Analisis ekspor AI untuk <strong>${p || "produk Anda"}</strong> sudah siap.`,
    buy_subj: (n) => `Pembeli baru cocok — ${n || "Pembeli"}`, buy_head: "Pembeli baru cocok 🤝",
    buy_body: (n, c) => `<strong>${n || "Seorang pembeli"}</strong>${c ? " dari " + c : ""} tertarik dengan produk Anda.`,
    msg_subj: (n) => `Pesan baru — ${n || "Mitra"}`, msg_head: "Pesan baru 💬",
    msg_body: (n) => `<strong>${n || "Mitra Anda"}</strong> mengirimi Anda pesan.`,
    sub_subj: (a) => `Langganan ${a || "diperbarui"}`, sub_head: "Langganan diperbarui",
    escrow_subj: (a) => `Pembaruan escrow — ${a || ""}`, escrow_head: "Pembaruan pembayaran escrow",
    ship_subj: (t) => `Pembaruan pengiriman — ${t || ""}`, ship_head: "Status pengiriman diperbarui 🚢",
    quote_subj: (t) => `Penawaran diterima — ${t || ""}`, quote_head: "Penawaran baru diterima 📋",
    order_subj: (t) => `Pembaruan pesanan — ${t || ""}`, order_head: "Status pesanan diperbarui 📦",
    doc_subj: (t) => `Dokumen siap — ${t || ""}`, doc_head: "Dokumen siap 📄",
    sample_subj: (t) => `Pembaruan sampel — ${t || ""}`, sample_head: "Status sampel diperbarui 📦",
  },
  th: {
    amount: "จำนวนเงิน", type: "ประเภท", date: "วันที่", plan: "แผน", status: "สถานะ",
    tracking: "หมายเลขติดตาม", carrier: "ผู้ขนส่ง", eta: "เวลาถึงโดยประมาณ", product: "สินค้า", deal: "ดีล",
    change: "การเปลี่ยนแปลง", currentPlan: "แผนปัจจุบัน", targetMarkets: "ตลาดเป้าหมาย", exportScore: "คะแนนการส่งออก",
    docType: "ประเภทเอกสาร", docNumber: "เลขที่เอกสาร", orderNo: "เลขที่คำสั่งซื้อ", quoteAmount: "จำนวนเงินใบเสนอราคา",
    ctaDashboard: "ไปที่แดชบอร์ด", ctaDeal: "ดูดีล", ctaOrder: "ดูคำสั่งซื้อ", ctaDoc: "ดูเอกสาร",
    ctaSample: "ดูสถานะตัวอย่าง", ctaTrack: "ติดตามการจัดส่ง", ctaQuote: "ตรวจสอบใบเสนอราคา", ctaSub: "จัดการการสมัครสมาชิก",
    ctaMsg: "ดูข้อความ", ctaBuyer: "ดูรายละเอียดผู้ซื้อ", ctaReport: "ดูรายงานฉบับเต็ม", ctaApp: "ไปที่แอป",
    hintReceipt: "คุณสามารถดูใบเสร็จได้ในพอร์ทัลการเรียกเก็บเงินของ Stripe",
    hintReport: "คุณสามารถเข้าถึงรายงานนี้ได้ทุกเมื่อจากแดชบอร์ดของคุณ",
    hintNotif: "คุณสามารถจัดการการตั้งค่าการแจ้งเตือนได้ในหน้าตั้งค่า",
    hint24h: "การตอบกลับภายใน 24 ชั่วโมงเพิ่มอัตราความสำเร็จของการจับคู่ 3 เท่า",
    hintSubQ: "สอบถามเรื่องการสมัครสมาชิก: support@whistle-ai.com",
    hintReviewSign: "โปรดตรวจสอบและลงนามในเอกสาร",
    hintReviewQuote: "โปรดตรวจสอบใบเสนอราคาและอนุมัติหรือขอการเปลี่ยนแปลง",
    pay_subj: (c, a) => `ยืนยันการชำระเงิน — ${c} ${a}`, pay_head: "ยืนยันการชำระเงินแล้ว ✅",
    ana_subj: (p) => `การวิเคราะห์ AI เสร็จสมบูรณ์ — ${p || "สินค้า"}`, ana_head: "การวิเคราะห์ AI เสร็จสมบูรณ์ 📊",
    ana_body: (p) => `การวิเคราะห์การส่งออกด้วย AI สำหรับ <strong>${p || "สินค้าของคุณ"}</strong> พร้อมแล้ว`,
    buy_subj: (n) => `ผู้ซื้อรายใหม่ที่ตรงกัน — ${n || "ผู้ซื้อ"}`, buy_head: "ผู้ซื้อรายใหม่ที่ตรงกัน 🤝",
    buy_body: (n, c) => `<strong>${n || "ผู้ซื้อ"}</strong>${c ? " จาก " + c : ""} สนใจสินค้าของคุณ`,
    msg_subj: (n) => `ข้อความใหม่ — ${n || "พาร์ทเนอร์"}`, msg_head: "ข้อความใหม่ 💬",
    msg_body: (n) => `<strong>${n || "พาร์ทเนอร์ของคุณ"}</strong> ส่งข้อความถึงคุณ`,
    sub_subj: (a) => `การสมัครสมาชิก ${a || "อัปเดตแล้ว"}`, sub_head: "การสมัครสมาชิกอัปเดตแล้ว",
    escrow_subj: (a) => `อัปเดตเอสโครว์ — ${a || ""}`, escrow_head: "อัปเดตการชำระเงินผ่านเอสโครว์",
    ship_subj: (t) => `อัปเดตการจัดส่ง — ${t || ""}`, ship_head: "สถานะการจัดส่งอัปเดตแล้ว 🚢",
    quote_subj: (t) => `ได้รับใบเสนอราคา — ${t || ""}`, quote_head: "ได้รับใบเสนอราคาใหม่ 📋",
    order_subj: (t) => `อัปเดตคำสั่งซื้อ — ${t || ""}`, order_head: "สถานะคำสั่งซื้ออัปเดตแล้ว 📦",
    doc_subj: (t) => `เอกสารพร้อมแล้ว — ${t || ""}`, doc_head: "เอกสารพร้อมแล้ว 📄",
    sample_subj: (t) => `อัปเดตตัวอย่าง — ${t || ""}`, sample_head: "สถานะตัวอย่างอัปเดตแล้ว 📦",
  },
  ar: {
    amount: "المبلغ", type: "النوع", date: "التاريخ", plan: "الخطة", status: "الحالة",
    tracking: "رقم التتبع", carrier: "شركة الشحن", eta: "الوصول المتوقع", product: "المنتج", deal: "الصفقة",
    change: "التغيير", currentPlan: "الخطة الحالية", targetMarkets: "الأسواق المستهدفة", exportScore: "درجة التصدير",
    docType: "نوع المستند", docNumber: "رقم المستند", orderNo: "رقم الطلب", quoteAmount: "مبلغ عرض السعر",
    ctaDashboard: "الذهاب إلى لوحة التحكم", ctaDeal: "عرض الصفقة", ctaOrder: "عرض الطلب", ctaDoc: "عرض المستند",
    ctaSample: "عرض حالة العينة", ctaTrack: "تتبع الشحنة", ctaQuote: "مراجعة عرض السعر", ctaSub: "إدارة الاشتراك",
    ctaMsg: "عرض الرسالة", ctaBuyer: "عرض تفاصيل المشتري", ctaReport: "عرض التقرير الكامل", ctaApp: "فتح التطبيق",
    hintReceipt: "يمكنك عرض إيصالك في بوابة فوترة Stripe.",
    hintReport: "يمكنك الوصول إلى هذا التقرير في أي وقت من لوحة التحكم.",
    hintNotif: "يمكنك إدارة تفضيلات الإشعارات في الإعدادات.",
    hint24h: "الرد خلال 24 ساعة يضاعف معدل نجاح المطابقة ثلاث مرات.",
    hintSubQ: "استفسارات الاشتراك: support@whistle-ai.com",
    hintReviewSign: "يرجى مراجعة المستند وتوقيعه.",
    hintReviewQuote: "يرجى مراجعة عرض السعر والموافقة عليه أو طلب التعديلات.",
    pay_subj: (c, a) => `تم تأكيد الدفع — ${c} ${a}`, pay_head: "تم تأكيد الدفع ✅",
    ana_subj: (p) => `اكتمل تحليل الذكاء الاصطناعي — ${p || "المنتج"}`, ana_head: "اكتمل تحليل الذكاء الاصطناعي 📊",
    ana_body: (p) => `تحليل التصدير بالذكاء الاصطناعي لـ <strong>${p || "منتجك"}</strong> جاهز.`,
    buy_subj: (n) => `مشترٍ جديد متطابق — ${n || "المشتري"}`, buy_head: "مشترٍ جديد متطابق 🤝",
    buy_body: (n, c) => `<strong>${n || "مشترٍ"}</strong>${c ? " من " + c : ""} مهتم بمنتجك.`,
    msg_subj: (n) => `رسالة جديدة — ${n || "شريك"}`, msg_head: "رسالة جديدة 💬",
    msg_body: (n) => `أرسل لك <strong>${n || "شريكك"}</strong> رسالة.`,
    sub_subj: (a) => `الاشتراك ${a || "تم التحديث"}`, sub_head: "تم تحديث الاشتراك",
    escrow_subj: (a) => `تحديث الضمان — ${a || ""}`, escrow_head: "تحديث دفع الضمان",
    ship_subj: (t) => `تحديث الشحنة — ${t || ""}`, ship_head: "تم تحديث حالة الشحنة 🚢",
    quote_subj: (t) => `تم استلام عرض السعر — ${t || ""}`, quote_head: "تم استلام عرض سعر جديد 📋",
    order_subj: (t) => `تحديث الطلب — ${t || ""}`, order_head: "تم تحديث حالة الطلب 📦",
    doc_subj: (t) => `المستند جاهز — ${t || ""}`, doc_head: "المستند جاهز 📄",
    sample_subj: (t) => `تحديث العينة — ${t || ""}`, sample_head: "تم تحديث حالة العينة 📦",
  },
  pt: {
    amount: "Valor", type: "Tipo", date: "Data", plan: "Plano", status: "Status",
    tracking: "Nº de rastreamento", carrier: "Transportadora", eta: "Chegada prevista", product: "Produto", deal: "Negócio",
    change: "Alteração", currentPlan: "Plano atual", targetMarkets: "Mercados-alvo", exportScore: "Pontuação de exportação",
    docType: "Tipo de documento", docNumber: "Nº do doc.", orderNo: "Nº do pedido", quoteAmount: "Valor da cotação",
    ctaDashboard: "Ir para o painel", ctaDeal: "Ver negócio", ctaOrder: "Ver pedido", ctaDoc: "Ver documento",
    ctaSample: "Ver status da amostra", ctaTrack: "Rastrear envio", ctaQuote: "Revisar cotação", ctaSub: "Gerenciar assinatura",
    ctaMsg: "Ver mensagem", ctaBuyer: "Ver detalhes do comprador", ctaReport: "Ver relatório completo", ctaApp: "Abrir app",
    hintReceipt: "Você pode visualizar seu recibo no portal de cobrança da Stripe.",
    hintReport: "Você pode acessar este relatório a qualquer momento pelo painel.",
    hintNotif: "Você pode gerenciar suas preferências de notificação nas Configurações.",
    hint24h: "Responder em até 24 horas triplica sua taxa de sucesso de correspondência.",
    hintSubQ: "Dúvidas sobre assinatura: support@whistle-ai.com",
    hintReviewSign: "Por favor, revise e assine o documento.",
    hintReviewQuote: "Revise a cotação e aprove ou solicite alterações.",
    pay_subj: (c, a) => `Pagamento confirmado — ${c} ${a}`, pay_head: "Pagamento confirmado ✅",
    ana_subj: (p) => `Análise de IA concluída — ${p || "Produto"}`, ana_head: "Análise de IA concluída 📊",
    ana_body: (p) => `Sua análise de exportação com IA para <strong>${p || "seu produto"}</strong> está pronta.`,
    buy_subj: (n) => `Nova correspondência de comprador — ${n || "Comprador"}`, buy_head: "Nova correspondência de comprador 🤝",
    buy_body: (n, c) => `<strong>${n || "Um comprador"}</strong>${c ? " de " + c : ""} está interessado no seu produto.`,
    msg_subj: (n) => `Nova mensagem — ${n || "Parceiro"}`, msg_head: "Nova mensagem 💬",
    msg_body: (n) => `<strong>${n || "Seu parceiro"}</strong> enviou uma mensagem.`,
    sub_subj: (a) => `Assinatura ${a || "atualizada"}`, sub_head: "Assinatura atualizada",
    escrow_subj: (a) => `Atualização de custódia — ${a || ""}`, escrow_head: "Atualização do pagamento em custódia",
    ship_subj: (t) => `Atualização de envio — ${t || ""}`, ship_head: "Status de envio atualizado 🚢",
    quote_subj: (t) => `Cotação recebida — ${t || ""}`, quote_head: "Nova cotação recebida 📋",
    order_subj: (t) => `Atualização de pedido — ${t || ""}`, order_head: "Status do pedido atualizado 📦",
    doc_subj: (t) => `Documento pronto — ${t || ""}`, doc_head: "Documento pronto 📄",
    sample_subj: (t) => `Atualização de amostra — ${t || ""}`, sample_head: "Amostra atualizada 📦",
  },
};

function getLP(lang: string): LabelPack {
  return LP[lang] || LP.en;
}

export function getTemplate(
  type: string,
  data: Record<string, string>,
  lang: string
): EmailTemplate {
  const appUrl = "https://whistle-ai.com/app";
  const l = getLP(lang);
  const isRtl = lang === "ar";
  const dirOpen = isRtl ? '<div dir="rtl">' : "";
  const dirClose = isRtl ? "</div>" : "";

  switch (type) {
    case "welcome": {
      const key = WELCOME_I18N[lang] ? lang : "en";
      const t = WELCOME_I18N[key];
      const name = data.name || "";
      const dirAttr = t.dir === "rtl" ? ' dir="rtl"' : "";
      return {
        subject: t.subject,
        html: baseLayout(
          t.heading,
          `<div${dirAttr}><p style="color:#4b5563;line-height:1.6">${t.body(name)}</p>
          ${ctaButton(t.cta, appUrl + "#analysis")}
          <p style="color:#9ca3af;font-size:13px">${t.footer}</p></div>`
        ),
      };
    }

    case "payment_confirmation":
      return {
        subject: l.pay_subj(data.currency || "", data.amount || ""),
        html: baseLayout(
          l.pay_head,
          `${dirOpen}<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0">
            <table width="100%" style="font-size:14px;color:#4b5563">
              <tr><td style="padding:4px 0"><strong>${l.amount}:</strong></td><td style="text-align:right">${data.currency} ${data.amount}</td></tr>
              <tr><td style="padding:4px 0"><strong>${l.type}:</strong></td><td style="text-align:right">${data.payment_type || "Payment"}</td></tr>
              <tr><td style="padding:4px 0"><strong>${l.date}:</strong></td><td style="text-align:right">${data.date || new Date().toISOString().split("T")[0]}</td></tr>
              ${data.plan ? `<tr><td style="padding:4px 0"><strong>${l.plan}:</strong></td><td style="text-align:right">${data.plan}</td></tr>` : ""}
            </table>
          </div>
          ${ctaButton(l.ctaDashboard, appUrl)}
          <p style="color:#9ca3af;font-size:13px">${l.hintReceipt}</p>${dirClose}`
        ),
      };

    case "analysis_complete":
      return {
        subject: l.ana_subj(data.product_name || ""),
        html: baseLayout(
          l.ana_head,
          `${dirOpen}<p style="color:#4b5563;line-height:1.6">${l.ana_body(data.product_name || "")}</p>
          <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;margin:16px 0">
            ${data.hs_code ? `<p style="margin:4px 0;color:#4b5563"><strong>HS Code:</strong> ${data.hs_code}</p>` : ""}
            ${data.target_markets ? `<p style="margin:4px 0;color:#4b5563"><strong>${l.targetMarkets}:</strong> ${data.target_markets}</p>` : ""}
            ${data.export_score ? `<p style="margin:4px 0;color:#4b5563"><strong>${l.exportScore}:</strong> ${data.export_score}/100</p>` : ""}
          </div>
          ${ctaButton(l.ctaReport, appUrl + "#analysis")}
          <p style="color:#9ca3af;font-size:13px">${l.hintReport}</p>${dirClose}`
        ),
      };

    case "buyer_matched":
      return {
        subject: l.buy_subj(data.buyer_name || ""),
        html: baseLayout(
          l.buy_head,
          `${dirOpen}<p style="color:#4b5563;line-height:1.6">${l.buy_body(data.buyer_name || "", data.buyer_country || "")}</p>
          ${data.product_name ? `<p style="color:#4b5563"><strong>${l.product}:</strong> ${data.product_name}</p>` : ""}
          ${ctaButton(l.ctaBuyer, appUrl + "#deals")}
          <p style="color:#9ca3af;font-size:13px">${l.hint24h}</p>${dirClose}`
        ),
      };

    case "new_message":
      return {
        subject: l.msg_subj(data.sender_name || ""),
        html: baseLayout(
          l.msg_head,
          `${dirOpen}<p style="color:#4b5563;line-height:1.6">${l.msg_body(data.sender_name || "")}</p>
          ${data.preview ? `<div style="background:#f9fafb;border-left:3px solid #F97316;padding:12px 16px;margin:16px 0;color:#6b7280;font-style:italic">"${data.preview.substring(0, 150)}${data.preview.length > 150 ? "..." : ""}"</div>` : ""}
          ${ctaButton(l.ctaMsg, appUrl + "#messages")}
          <p style="color:#9ca3af;font-size:13px">${l.hintNotif}</p>${dirClose}`
        ),
      };

    case "subscription_change":
      return {
        subject: l.sub_subj(data.action || ""),
        html: baseLayout(
          l.sub_head,
          `${dirOpen}<div style="background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:16px;margin:16px 0">
            <p style="margin:0;color:#92400e;font-size:14px">
              <strong>${l.change}:</strong> ${data.details || ""}
            </p>
          </div>
          ${data.new_plan ? `<p style="color:#4b5563"><strong>${l.currentPlan}:</strong> ${data.new_plan}</p>` : ""}
          ${ctaButton(l.ctaSub, appUrl + "#subscription")}
          <p style="color:#9ca3af;font-size:13px">${l.hintSubQ}</p>${dirClose}`
        ),
      };

    case "escrow_update":
      return {
        subject: l.escrow_subj(data.action || ""),
        html: baseLayout(
          l.escrow_head,
          `${dirOpen}<p style="color:#4b5563;line-height:1.6">${data.message || ""}</p>
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0">
            ${data.amount ? `<p style="margin:4px 0;color:#4b5563"><strong>${l.amount}:</strong> ${data.currency || "USD"} ${data.amount}</p>` : ""}
            ${data.deal_name ? `<p style="margin:4px 0;color:#4b5563"><strong>${l.deal}:</strong> ${data.deal_name}</p>` : ""}
            <p style="margin:4px 0;color:#4b5563"><strong>${l.status}:</strong> ${data.status || ""}</p>
          </div>
          ${ctaButton(l.ctaDeal, appUrl + "#deals")}${dirClose}`
        ),
      };

    case "shipment_update":
      return {
        subject: l.ship_subj(data.title || ""),
        html: baseLayout(
          l.ship_head,
          `${dirOpen}<p style="color:#4b5563;line-height:1.6">${data.message || ""}</p>
          <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;margin:16px 0">
            ${data.tracking_no ? `<p style="margin:4px 0;color:#4b5563"><strong>${l.tracking}:</strong> ${data.tracking_no}</p>` : ""}
            ${data.carrier ? `<p style="margin:4px 0;color:#4b5563"><strong>${l.carrier}:</strong> ${data.carrier}</p>` : ""}
            ${data.eta ? `<p style="margin:4px 0;color:#4b5563"><strong>${l.eta}:</strong> ${data.eta}</p>` : ""}
          </div>
          ${ctaButton(l.ctaTrack, appUrl + "#deals")}${dirClose}`
        ),
      };

    case "quote_received":
      return {
        subject: l.quote_subj(data.title || ""),
        html: baseLayout(
          l.quote_head,
          `${dirOpen}<p style="color:#4b5563;line-height:1.6">${data.message || ""}</p>
          <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:16px;margin:16px 0">
            ${data.amount ? `<p style="margin:4px 0;color:#92400e"><strong>${l.quoteAmount}:</strong> ${data.amount}</p>` : ""}
          </div>
          <p style="color:#4b5563;font-size:13px">${l.hintReviewQuote}</p>
          ${ctaButton(l.ctaQuote, appUrl + "#deals")}${dirClose}`
        ),
      };

    case "order_update":
      return {
        subject: l.order_subj(data.title || ""),
        html: baseLayout(
          l.order_head,
          `${dirOpen}<p style="color:#4b5563;line-height:1.6">${data.message || ""}</p>
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0">
            ${data.order_status ? `<p style="margin:4px 0;color:#4b5563"><strong>${l.status}:</strong> ${data.order_status}</p>` : ""}
            ${data.order_id ? `<p style="margin:4px 0;color:#4b5563"><strong>${l.orderNo}:</strong> ${data.order_id}</p>` : ""}
          </div>
          ${ctaButton(l.ctaOrder, appUrl + "#deals")}${dirClose}`
        ),
      };

    case "document_ready":
      return {
        subject: l.doc_subj(data.title || ""),
        html: baseLayout(
          l.doc_head,
          `${dirOpen}<p style="color:#4b5563;line-height:1.6">${data.message || ""}</p>
          <div style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:8px;padding:16px;margin:16px 0">
            ${data.doc_type ? `<p style="margin:4px 0;color:#4b5563"><strong>${l.docType}:</strong> ${data.doc_type}</p>` : ""}
            ${data.doc_number ? `<p style="margin:4px 0;color:#4b5563"><strong>${l.docNumber}:</strong> ${data.doc_number}</p>` : ""}
          </div>
          <p style="color:#4b5563;font-size:13px">${l.hintReviewSign}</p>
          ${ctaButton(l.ctaDoc, appUrl + "#deals")}${dirClose}`
        ),
      };

    case "sample_update":
      return {
        subject: l.sample_subj(data.title || ""),
        html: baseLayout(
          l.sample_head,
          `${dirOpen}<p style="color:#4b5563;line-height:1.6">${data.message || ""}</p>
          ${ctaButton(l.ctaSample, appUrl + "#deals")}${dirClose}`
        ),
      };

    default:
      return {
        subject: data.subject || "Whistle AI Notification",
        html: baseLayout(
          data.title || "Notification",
          `${dirOpen}<p style="color:#4b5563;line-height:1.6">${data.message || ""}</p>
          ${ctaButton(l.ctaApp, appUrl)}${dirClose}`
        ),
      };
  }
}

// ─── Main Handler ──────────────────────────────────────────

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
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
      lang: bodyLang,
      country: bodyCountry,
    } = body;

    // Resolve email + user locale. Language resolution priority:
    //   1. Explicit body.lang (caller override)
    //   2. User's stored `language` column
    //   3. Country → language map (body.country or user.country)
    //   4. 'en' fallback
    let toEmail = to;
    let userLang: string | null = null;
    let userCountry: string | null = bodyCountry || null;

    if (user_id) {
      const { data: userData } = await sbAdmin
        .from("users")
        .select("email, display_name, language, country")
        .eq("id", user_id)
        .single();
      if (userData) {
        if (!toEmail) toEmail = userData.email;
        if (!data.name) data.name = userData.display_name;
        userLang = userData.language || null;
        if (!userCountry) userCountry = userData.country || null;
      }
    }

    // If no user_id but we have email, try to find the user to get locale
    if (!user_id && toEmail && !bodyLang) {
      const { data: userData } = await sbAdmin
        .from("users")
        .select("display_name, language, country")
        .eq("email", toEmail)
        .maybeSingle();
      if (userData) {
        if (!data.name) data.name = userData.display_name;
        userLang = userData.language || null;
        if (!userCountry) userCountry = userData.country || null;
      }
    }

    // Priority: body.lang > body.country→lang > user.language > user.country→lang > 'en'
    const bodyCountryLang = bodyCountry ? countryToLang(bodyCountry) : null;
    const userCountryLang = userCountry && userCountry !== bodyCountry
      ? countryToLang(userCountry) : null;
    const resolvedLang = normalizeLang(
      bodyLang || bodyCountryLang || userLang || userCountryLang
    );

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

    const template = getTemplate(type, data, resolvedLang);

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

    // Log email sent — match actual email_logs schema
    try {
      const { error: logErr } = await sbAdmin.from("email_logs").insert({
        to_email: toEmail,
        user_id: user_id || null,
        subject: `[${type}] ${template.subject}`,
        body: template.html,
        status: "sent",
        message_id: result.id,
        created_at: new Date().toISOString(),
      });
      if (logErr) console.error("email_logs insert error:", logErr.message);
    } catch (logCatchErr) {
      console.error("email_logs insert exception:", logCatchErr);
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
