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
      "authorization, x-client-info, apikey, content-type, x-cron-secret",
  };
}

// ─── Source: data.go.kr (Korean public data API) ─────────

interface DataGoKrConfig {
  apiKey: string;
  endpoint: string;
  category: string;
  tags: string[];
}

const DATA_GO_KR_SOURCES: DataGoKrConfig[] = [
  {
    // 화장품 제조업 등록현황
    apiKey: "DATA_GO_KR_API_KEY",
    endpoint: "https://apis.data.go.kr/1471000/CsmtcsEntrpPrmsnInfoService/getCsmtcsEntrpPrmsnInfo",
    category: "beauty",
    tags: ["beauty", "cosmetics", "k-beauty"],
  },
  {
    // 식품제조가공업 등록현황
    apiKey: "DATA_GO_KR_API_KEY",
    endpoint: "https://apis.data.go.kr/1471000/FoodMnfctrInfoService/getFoodMnfctrInfo",
    category: "food",
    tags: ["food", "k-food", "food-manufacturing"],
  },
];

async function collectFromDataGoKr(
  sbAdmin: ReturnType<typeof createClient>,
  apiKey: string,
): Promise<{ imported: number; skipped: number; errors: number }> {
  const results = { imported: 0, skipped: 0, errors: 0 };

  if (!apiKey) {
    console.error("DATA_GO_KR_API_KEY not configured — skipping Korean public data");
    return results;
  }

  for (const source of DATA_GO_KR_SOURCES) {
    try {
      const url = new URL(source.endpoint);
      url.searchParams.set("serviceKey", apiKey);
      url.searchParams.set("type", "json");
      url.searchParams.set("numOfRows", "100");
      url.searchParams.set("pageNo", "1");

      const response = await fetch(url.toString());
      if (!response.ok) {
        console.error(`data.go.kr ${source.category} API error: ${response.status}`);
        results.errors++;
        continue;
      }

      const data = await response.json();
      const items = data?.body?.items || data?.response?.body?.items?.item || [];

      if (!Array.isArray(items)) {
        console.error(`data.go.kr ${source.category}: unexpected response format`);
        results.errors++;
        continue;
      }

      for (const item of items) {
        const companyName = item.ENTRPS_NM || item.BSSH_NM || item.entrpsNm || item.bsshNm || "";
        const address = item.SITE_ADDR || item.ADDR || item.siteAddr || item.addr || "";

        if (!companyName) {
          results.skipped++;
          continue;
        }

        // Generate a deterministic placeholder email for contact-less entries
        const normalizedName = companyName.replace(/[^a-zA-Z0-9가-힣]/g, "").toLowerCase();
        const contactEmail = `info@${normalizedName.substring(0, 30)}.placeholder`;

        const { error } = await sbAdmin
          .from("marketing_contacts")
          .upsert(
            {
              email: contactEmail,
              name: companyName,
              company_name: companyName,
              country: "KR",
              language: "ko",
              contact_type: "manufacturer",
              tags: source.tags,
              source: `data.go.kr/${source.category}`,
              is_subscribed: false, // Placeholder emails — don't send until real email is found
            },
            { onConflict: "email" },
          );

        if (error) {
          results.errors++;
        } else {
          results.imported++;
        }
      }
    } catch (e) {
      console.error(`data.go.kr ${source.category} collection error:`, e instanceof Error ? e.message : String(e));
      results.errors++;
    }
  }

  return results;
}

// ─── Source: openFDA (US FDA registered facilities) ──────

async function collectFromOpenFDA(
  sbAdmin: ReturnType<typeof createClient>,
): Promise<{ imported: number; skipped: number; errors: number }> {
  const results = { imported: 0, skipped: 0, errors: 0 };

  // Search for Korean-origin food/cosmetics facilities registered with FDA
  const queries = [
    {
      url: "https://api.fda.gov/food/enforcement.json?search=country_code:KR&limit=100",
      tags: ["food", "k-food", "fda-registered"],
      category: "food",
    },
    {
      url: "https://api.fda.gov/drug/enforcement.json?search=country_code:KR&limit=100",
      tags: ["health", "pharmaceutical", "fda-registered"],
      category: "health",
    },
  ];

  for (const q of queries) {
    try {
      const response = await fetch(q.url);
      if (!response.ok) {
        // openFDA returns 404 when no results — not an error
        if (response.status === 404) continue;
        console.error(`openFDA ${q.category} error: ${response.status}`);
        results.errors++;
        continue;
      }

      const data = await response.json();
      const items = data?.results || [];

      for (const item of items) {
        const companyName = item.recalling_firm || item.firm_name || "";
        const city = item.city || "";
        const state = item.state || "";
        const country = item.country || "US";

        if (!companyName) {
          results.skipped++;
          continue;
        }

        const normalizedName = companyName.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
        const contactEmail = `contact@${normalizedName.substring(0, 30)}.placeholder`;

        // Determine if this is a Korean or US company
        const isKorean = country === "KR" || country === "Korea" || country === "South Korea";

        const { error } = await sbAdmin
          .from("marketing_contacts")
          .upsert(
            {
              email: contactEmail,
              name: companyName,
              company_name: companyName,
              country: isKorean ? "KR" : "US",
              language: isKorean ? "ko" : "en",
              contact_type: isKorean ? "manufacturer" : "buyer",
              tags: q.tags,
              source: `openfda/${q.category}`,
              is_subscribed: false,
            },
            { onConflict: "email" },
          );

        if (error) {
          results.errors++;
        } else {
          results.imported++;
        }
      }
    } catch (e) {
      console.error(`openFDA ${q.category} collection error:`, e instanceof Error ? e.message : String(e));
      results.errors++;
    }
  }

  return results;
}

// ─── Source: ImportYeti-style US customs data (public B/L) ──

async function collectFromTradeData(
  sbAdmin: ReturnType<typeof createClient>,
): Promise<{ imported: number; skipped: number; errors: number }> {
  const results = { imported: 0, skipped: 0, errors: 0 };

  // ITC Trade Map — free trade statistics API
  // Use to identify top importing countries for key Korean export categories
  const categories = [
    { hs: "3304", name: "Beauty/Cosmetics", tags: ["beauty", "cosmetics", "importer"] },
    { hs: "2106", name: "Food Preparations", tags: ["food", "k-food", "importer"] },
    { hs: "8542", name: "Electronic Integrated Circuits", tags: ["electronics", "semiconductor", "importer"] },
  ];

  for (const cat of categories) {
    try {
      // UN Comtrade API — identify top importers of Korean products
      const url = `https://comtradeapi.un.org/public/v1/preview/C/A/HS/M/${cat.hs}?reporterCode=410&period=2025&motCode=0&partnerCode=0`;

      const response = await fetch(url);
      if (!response.ok) continue;

      const data = await response.json();
      const records = data?.data || [];

      // Extract top importing countries (partners)
      for (const record of records.slice(0, 20)) {
        const partnerDesc = record.partnerDesc || "";
        const tradeValue = record.primaryValue || 0;

        if (!partnerDesc || partnerDesc === "World") continue;

        // Store as market intelligence (not direct contact)
        // These help identify which countries to target for outreach
        const { error } = await sbAdmin
          .from("marketing_contacts")
          .upsert(
            {
              email: `market-intel-${cat.hs}-${partnerDesc.toLowerCase().replace(/\s/g, "-")}@whistle.internal`,
              name: `${partnerDesc} ${cat.name} Market`,
              company_name: `${partnerDesc} — ${cat.name} importers ($${(tradeValue / 1000000).toFixed(0)}M)`,
              country: partnerDesc.substring(0, 2).toUpperCase(),
              language: "en",
              contact_type: "buyer",
              tags: [...cat.tags, "market-intel", partnerDesc.toLowerCase()],
              source: "un-comtrade",
              is_subscribed: false,
            },
            { onConflict: "email" },
          );

        if (error) results.errors++;
        else results.imported++;
      }
    } catch (e) {
      console.error(`Trade data ${cat.name} error:`, e instanceof Error ? e.message : String(e));
      results.errors++;
    }
  }

  return results;
}

// ─── Auto-Enroll New Contacts ────────────────────────────

async function autoEnrollNewContacts(
  sbAdmin: ReturnType<typeof createClient>,
): Promise<{ enrolled: number }> {
  let enrolled = 0;

  // Find contacts with real emails (not placeholder) that aren't enrolled in any drip
  const { data: unenrolledContacts } = await sbAdmin
    .from("marketing_contacts")
    .select("id, contact_type, language, email")
    .eq("is_subscribed", true)
    .not("email", "like", "%.placeholder")
    .not("email", "like", "%@whistle.internal")
    .limit(50);

  if (!unenrolledContacts || unenrolledContacts.length === 0) return { enrolled };

  // Map contact type + language to sequence
  const sequenceMap: Record<string, string> = {
    "manufacturer_ko": "a1000000-0000-0000-0000-000000000001", // korean_mfg_drip
    "manufacturer_en": "a2000000-0000-0000-0000-000000000002", // global_mfg_drip
    "buyer_en": "a3000000-0000-0000-0000-000000000003",        // global_buyer_drip
    "buyer_ko": "a3000000-0000-0000-0000-000000000003",        // buyers get global_buyer_drip regardless
  };

  for (const contact of unenrolledContacts) {
    const key = `${contact.contact_type}_${contact.language || "en"}`;
    const sequenceId = sequenceMap[key];
    if (!sequenceId) continue;

    // Check if already enrolled
    const { data: existing } = await sbAdmin
      .from("drip_enrollments")
      .select("id")
      .eq("contact_id", contact.id)
      .eq("sequence_id", sequenceId)
      .single();

    if (existing) continue;

    const { error } = await sbAdmin
      .from("drip_enrollments")
      .insert({
        contact_id: contact.id,
        sequence_id: sequenceId,
        current_step: 0,
        status: "active",
        next_send_at: new Date().toISOString(),
      });

    if (!error) enrolled++;
  }

  return { enrolled };
}

// ─── Main Handler ────────────────────────────────────────

serve(async (req) => {
  const CORS_HEADERS = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const cronSecret = Deno.env.get("CRON_SECRET");
    const dataGoKrKey = Deno.env.get("DATA_GO_KR_API_KEY") || "";

    // Auth
    const reqCronSecret = req.headers.get("x-cron-secret");
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");

    const isAuthorized =
      (cronSecret && reqCronSecret === cronSecret) ||
      (token && token === serviceKey);

    if (!isAuthorized) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    const sbAdmin = createClient(supabaseUrl, serviceKey);

    // Parse sources to collect from
    let sources = ["data_go_kr", "openfda", "trade_data"];
    try {
      const body = await req.json();
      if (body.sources && Array.isArray(body.sources)) sources = body.sources;
    } catch {
      // Use defaults
    }

    const collectionResults: Record<string, { imported: number; skipped: number; errors: number }> = {};

    // Collect from each source
    if (sources.includes("data_go_kr")) {
      collectionResults.data_go_kr = await collectFromDataGoKr(sbAdmin, dataGoKrKey);
    }

    if (sources.includes("openfda")) {
      collectionResults.openfda = await collectFromOpenFDA(sbAdmin);
    }

    if (sources.includes("trade_data")) {
      collectionResults.trade_data = await collectFromTradeData(sbAdmin);
    }

    // Auto-enroll new contacts with real emails into drip sequences
    const enrollResult = await autoEnrollNewContacts(sbAdmin);

    // Update automation log
    const totalImported = Object.values(collectionResults).reduce((sum, r) => sum + r.imported, 0);
    const totalErrors = Object.values(collectionResults).reduce((sum, r) => sum + r.errors, 0);

    await sbAdmin
      .from("marketing_automations")
      .update({
        last_run_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_error: totalErrors > 0 ? `${totalErrors} errors in collection` : null,
      })
      .eq("type", "lead_collection");

    return new Response(
      JSON.stringify({
        message: "Lead collection completed",
        sources: collectionResults,
        auto_enrolled: enrollResult.enrolled,
        total_imported: totalImported,
      }),
      { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("collect-public-leads error:", e instanceof Error ? e.message : String(e));
    return new Response(
      JSON.stringify({ error: "Internal error", detail: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }
});
