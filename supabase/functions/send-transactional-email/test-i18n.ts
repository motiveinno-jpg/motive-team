// 12-language template rendering verification
// Run: deno run --allow-read test-i18n.ts
import { LP, getTemplate } from "./index.ts";

const LANGS = ["en","ko","ja","zh","es","de","fr","vi","id","th","ar","pt"];
const TYPES = [
  "welcome",
  "payment_confirmation",
  "analysis_complete",
  "buyer_matched",
  "new_message",
  "subscription_change",
  "escrow_update",
  "shipment_update",
  "quote_received",
  "order_update",
  "document_ready",
  "sample_update",
];

const sampleData = {
  name: "Test User",
  currency: "USD",
  amount: "99.00",
  payment_type: "Subscription",
  plan: "Professional",
  product_name: "Test Product",
  hs_code: "0902.30.00",
  target_markets: "Japan, US",
  export_score: "85",
  buyer_name: "ACME Corp",
  buyer_country: "US",
  match_score: "92",
  sender_name: "John",
  message_preview: "Hello world",
  conversation_id: "abc",
  old_plan: "Starter",
  new_plan: "Pro",
  effective_date: "2026-04-10",
  escrow_status: "released",
  order_id: "o-1",
  amount_released: "500",
  tracking_number: "1Z123",
  carrier: "DHL",
  estimated_delivery: "2026-04-15",
  status: "in_transit",
  quote_id: "q-1",
  supplier_name: "Motive Co",
  total_price: "USD 1,500",
  valid_until: "2026-04-30",
  status_label: "Confirmed",
  doc_type: "Commercial Invoice",
  doc_name: "CI-001.pdf",
  doc_url: "https://whistle-ai.com/app",
  sample_status: "shipped",
};

let failures = 0;
const report: Array<{ lang: string; type: string; ok: boolean; reason?: string }> = [];

for (const lang of LANGS) {
  // LP existence (skip for welcome which uses WELCOME_I18N separately)
  if (!LP[lang]) {
    console.error(`✘ LP missing for lang=${lang}`);
    failures++;
    continue;
  }
  const pack = LP[lang];
  // sanity check key fields
  const requiredKeys = ["amount","type","date","plan","status","pay_head","ana_head"];
  for (const k of requiredKeys) {
    if (!(k in pack)) {
      console.error(`✘ LP[${lang}] missing key: ${k}`);
      failures++;
    }
  }

  for (const type of TYPES) {
    try {
      const tpl = getTemplate(type, sampleData, lang);
      const issues: string[] = [];
      if (!tpl.subject || typeof tpl.subject !== "string") issues.push("empty subject");
      if (!tpl.html || tpl.html.length < 200) issues.push("empty html");
      if (tpl.html.includes("undefined")) issues.push("html contains 'undefined'");
      if (tpl.subject.includes("undefined")) issues.push("subject contains 'undefined'");
      // RTL check for Arabic on non-welcome
      if (lang === "ar" && type !== "welcome" && !tpl.html.includes('dir="rtl"')) {
        issues.push("missing dir=rtl wrapper");
      }
      if (issues.length) {
        failures++;
        report.push({ lang, type, ok: false, reason: issues.join("; ") });
      } else {
        report.push({ lang, type, ok: true });
      }
    } catch (e) {
      failures++;
      report.push({ lang, type, ok: false, reason: `threw: ${e instanceof Error ? e.message : String(e)}` });
    }
  }
}

const passed = report.filter(r => r.ok).length;
const total = report.length;
console.log(`\n=== i18n Template Verification ===`);
console.log(`Passed: ${passed}/${total}`);
console.log(`Languages: ${LANGS.length}, Types: ${TYPES.length}`);

const fails = report.filter(r => !r.ok);
if (fails.length) {
  console.log(`\nFailures:`);
  for (const f of fails) {
    console.log(`  ✘ ${f.lang}/${f.type}: ${f.reason}`);
  }
}

// Language-specific word spot-check
console.log(`\n=== Native word spot-check (payment_confirmation subject) ===`);
for (const lang of LANGS) {
  const tpl = getTemplate("payment_confirmation", sampleData, lang);
  console.log(`  ${lang}: ${tpl.subject}`);
}

Deno.exit(failures > 0 ? 1 : 0);
