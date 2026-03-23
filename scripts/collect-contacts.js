#!/usr/bin/env node

/**
 * collect-contacts.js
 *
 * Collects Korean manufacturer/brand company contact information
 * from public directory listings and inserts them into the
 * Supabase outreach_contacts table.
 *
 * Usage: node scripts/collect-contacts.js
 *
 * Required env: SUPABASE_SERVICE_ROLE_KEY
 * Optional env: SUPABASE_URL (defaults to project URL)
 */

const { readFileSync } = require("fs");
const { resolve } = require("path");

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const SUPABASE_URL =
  process.env.SUPABASE_URL || "https://lylktgxngrlxmsldxdqj.supabase.co";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) " +
  "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const REQUEST_DELAY_MS = 2000;
const MAX_RETRIES = 2;
const REQUEST_TIMEOUT_MS = 15000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadEnv() {
  const envPath = resolve(__dirname, ".env");
  try {
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIndex = trimmed.indexOf("=");
      if (eqIndex === -1) continue;
      const key = trimmed.slice(0, eqIndex).trim();
      const value = trimmed.slice(eqIndex + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // .env file is optional if env vars are set externally
  }
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchWithRetry(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const fetchOptions = {
    ...options,
    signal: controller.signal,
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
      ...options.headers,
    },
  };

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, fetchOptions);
      clearTimeout(timeout);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} for ${url}`);
      }
      return await res.text();
    } catch (err) {
      clearTimeout(timeout);
      if (attempt === MAX_RETRIES) {
        throw err;
      }
      console.warn(`  Retry ${attempt + 1}/${MAX_RETRIES} for ${url}: ${err.message}`);
      await delay(REQUEST_DELAY_MS);
    }
  }
}

/**
 * Extract all matches of a regex from HTML text.
 * Returns an array of full match strings or capture groups.
 */
function extractAll(html, regex) {
  const results = [];
  let match;
  while ((match = regex.exec(html)) !== null) {
    results.push(match);
  }
  return results;
}

function stripTags(str) {
  return str.replace(/<[^>]*>/g, "").trim();
}

function normalizePhone(phone) {
  if (!phone) return null;
  const cleaned = phone.replace(/[^\d+\-() ]/g, "").trim();
  return cleaned.length >= 8 ? cleaned : null;
}

function normalizeEmail(email) {
  if (!email) return null;
  const trimmed = email.trim().toLowerCase();
  const emailRegex = /^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$/;
  return emailRegex.test(trimmed) ? trimmed : null;
}

function normalizeUrl(url) {
  if (!url) return null;
  let trimmed = url.trim();
  if (!trimmed) return null;
  if (!trimmed.startsWith("http")) {
    trimmed = "https://" + trimmed;
  }
  try {
    new URL(trimmed);
    return trimmed;
  } catch {
    return null;
  }
}

function createContact({
  category = "manufacturer",
  companyName = null,
  companyNameEn = null,
  contactName = null,
  email = null,
  phone = null,
  website = null,
  country = "KR",
  industry = null,
  notes = null,
  source = null,
}) {
  return {
    category,
    company_name: companyName || null,
    company_name_en: companyNameEn || null,
    contact_name: contactName || null,
    email: normalizeEmail(email),
    phone: normalizePhone(phone),
    website: normalizeUrl(website),
    country,
    industry: industry || null,
    notes: notes || null,
    source: source || null,
  };
}

// ---------------------------------------------------------------------------
// Source collectors
// ---------------------------------------------------------------------------

/**
 * KITA (Korea International Trade Association) member directory.
 * Publicly available exporter listings.
 */
async function collectFromKita() {
  const contacts = [];
  const baseUrl = "https://www.kita.net";

  console.log("[KITA] Fetching exporter directory...");

  try {
    // KITA member search page — search for general manufacturers
    const searchUrl =
      "https://www.kita.net/cmmrcInfo/mnftrInfo/mnftrList.do?pageIndex=1&searchCondition=&searchKeyword=";

    const html = await fetchWithRetry(searchUrl);

    // Extract company listing blocks
    // KITA pages typically list companies in table rows or list items
    const companyBlocks = extractAll(
      html,
      /<tr[^>]*>[\s\S]*?<\/tr>/gi,
    );

    for (const block of companyBlocks) {
      const fullBlock = block[0];

      const nameMatch = fullBlock.match(/<a[^>]*>([\s\S]*?)<\/a>/i);
      const emailMatch = fullBlock.match(
        /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/,
      );
      const phoneMatch = fullBlock.match(
        /(\+?82[\-\s]?\d{1,2}[\-\s]?\d{3,4}[\-\s]?\d{4}|\d{2,3}[\-\s]\d{3,4}[\-\s]\d{4})/,
      );
      const websiteMatch = fullBlock.match(
        /https?:\/\/[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}[^\s"'<]*/,
      );

      if (nameMatch) {
        const companyName = stripTags(nameMatch[1]);
        if (companyName && companyName.length > 1) {
          contacts.push(
            createContact({
              companyName,
              email: emailMatch ? emailMatch[0] : null,
              phone: phoneMatch ? phoneMatch[0] : null,
              website: websiteMatch ? websiteMatch[0] : null,
              industry: "general",
              source: "kita.net",
              notes: "KITA member directory",
            }),
          );
        }
      }
    }

    await delay(REQUEST_DELAY_MS);
  } catch (err) {
    console.error(`[KITA] Error: ${err.message}`);
  }

  console.log(`[KITA] Collected ${contacts.length} contacts`);
  return contacts;
}

/**
 * KOTRA BuyKorea — Korean exporter directory.
 */
async function collectFromBuyKorea() {
  const contacts = [];

  console.log("[BuyKorea] Fetching exporter listings...");

  try {
    // BuyKorea supplier search — multiple categories
    const categories = ["cosmetics", "food", "electronics", "textile", "machinery"];

    for (const category of categories) {
      const url =
        `https://www.buykorea.org/e-catalog/company-list.do?searchKeyword=${category}&pageIndex=1`;

      try {
        const html = await fetchWithRetry(url);

        const companyBlocks = extractAll(
          html,
          /<div[^>]*class="[^"]*company[^"]*"[^>]*>[\s\S]*?<\/div>\s*<\/div>/gi,
        );

        for (const block of companyBlocks) {
          const fullBlock = block[0];

          const nameMatch = fullBlock.match(/<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/i)
            || fullBlock.match(/<a[^>]*class="[^"]*company[^"]*"[^>]*>([\s\S]*?)<\/a>/i);
          const emailMatch = fullBlock.match(
            /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/,
          );
          const websiteMatch = fullBlock.match(
            /https?:\/\/[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}[^\s"'<]*/,
          );

          if (nameMatch) {
            const companyName = stripTags(nameMatch[1]);
            if (companyName && companyName.length > 1) {
              contacts.push(
                createContact({
                  companyName,
                  companyNameEn: companyName,
                  email: emailMatch ? emailMatch[0] : null,
                  website: websiteMatch ? websiteMatch[0] : null,
                  industry: category,
                  source: "buykorea.org",
                  notes: `KOTRA BuyKorea - ${category}`,
                }),
              );
            }
          }
        }

        await delay(REQUEST_DELAY_MS);
      } catch (err) {
        console.warn(`[BuyKorea] Failed for category ${category}: ${err.message}`);
      }
    }
  } catch (err) {
    console.error(`[BuyKorea] Error: ${err.message}`);
  }

  console.log(`[BuyKorea] Collected ${contacts.length} contacts`);
  return contacts;
}

/**
 * EC21.com — Korean exporters directory.
 */
async function collectFromEc21() {
  const contacts = [];

  console.log("[EC21] Fetching Korean exporter listings...");

  try {
    const categories = [
      "cosmetics",
      "food-beverage",
      "electronics",
      "auto-parts",
      "machinery",
      "textile",
    ];

    for (const category of categories) {
      const url = `https://www.ec21.com/company/korean-${category}-manufacturers.html`;

      try {
        const html = await fetchWithRetry(url);

        // EC21 company listing blocks
        const companyBlocks = extractAll(
          html,
          /<div[^>]*class="[^"]*srch_company[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
        );

        // Fallback: try table rows or list items
        const altBlocks = companyBlocks.length === 0
          ? extractAll(html, /<li[^>]*class="[^"]*company[^"]*"[^>]*>[\s\S]*?<\/li>/gi)
          : [];

        const allBlocks = [...companyBlocks, ...altBlocks];

        for (const block of allBlocks) {
          const fullBlock = block[0];

          const nameMatch = fullBlock.match(/<a[^>]*>([\s\S]*?)<\/a>/i);
          const emailMatch = fullBlock.match(
            /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/,
          );
          const phoneMatch = fullBlock.match(
            /(\+?82[\-\s]?\d{1,2}[\-\s]?\d{3,4}[\-\s]?\d{4})/,
          );
          const websiteMatch = fullBlock.match(
            /https?:\/\/(?!www\.ec21\.com)[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}[^\s"'<]*/,
          );

          if (nameMatch) {
            const companyName = stripTags(nameMatch[1]);
            if (companyName && companyName.length > 1) {
              contacts.push(
                createContact({
                  companyNameEn: companyName,
                  email: emailMatch ? emailMatch[0] : null,
                  phone: phoneMatch ? phoneMatch[0] : null,
                  website: websiteMatch ? websiteMatch[0] : null,
                  industry: category.replace("-", " "),
                  source: "ec21.com",
                  notes: `EC21 Korean exporters - ${category}`,
                }),
              );
            }
          }
        }

        await delay(REQUEST_DELAY_MS);
      } catch (err) {
        console.warn(`[EC21] Failed for category ${category}: ${err.message}`);
      }
    }
  } catch (err) {
    console.error(`[EC21] Error: ${err.message}`);
  }

  console.log(`[EC21] Collected ${contacts.length} contacts`);
  return contacts;
}

/**
 * TradeKorea.com — Korean supplier listings.
 */
async function collectFromTradeKorea() {
  const contacts = [];

  console.log("[TradeKorea] Fetching supplier listings...");

  try {
    const categories = [
      "beauty-personal-care",
      "food-agriculture",
      "electronics",
      "machinery-parts",
      "fashion-accessories",
    ];

    for (const category of categories) {
      const url =
        `https://www.tradekorea.com/product/company_list.do?big_category=${category}&page=1`;

      try {
        const html = await fetchWithRetry(url);

        const companyBlocks = extractAll(
          html,
          /<div[^>]*class="[^"]*comp_info[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
        );

        const altBlocks = companyBlocks.length === 0
          ? extractAll(html, /<tr[^>]*>[\s\S]*?<\/tr>/gi)
          : [];

        const allBlocks = [...companyBlocks, ...altBlocks];

        for (const block of allBlocks) {
          const fullBlock = block[0];

          const nameMatch = fullBlock.match(/<a[^>]*>([\s\S]*?)<\/a>/i);
          const emailMatch = fullBlock.match(
            /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/,
          );
          const phoneMatch = fullBlock.match(
            /(\+?82[\-\s]?\d{1,2}[\-\s]?\d{3,4}[\-\s]?\d{4})/,
          );
          const websiteMatch = fullBlock.match(
            /https?:\/\/(?!www\.tradekorea\.com)[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}[^\s"'<]*/,
          );

          if (nameMatch) {
            const companyName = stripTags(nameMatch[1]);
            if (companyName && companyName.length > 1) {
              contacts.push(
                createContact({
                  companyNameEn: companyName,
                  email: emailMatch ? emailMatch[0] : null,
                  phone: phoneMatch ? phoneMatch[0] : null,
                  website: websiteMatch ? websiteMatch[0] : null,
                  industry: category.replace(/-/g, " "),
                  source: "tradekorea.com",
                  notes: `TradeKorea - ${category}`,
                }),
              );
            }
          }
        }

        await delay(REQUEST_DELAY_MS);
      } catch (err) {
        console.warn(`[TradeKorea] Failed for category ${category}: ${err.message}`);
      }
    }
  } catch (err) {
    console.error(`[TradeKorea] Error: ${err.message}`);
  }

  console.log(`[TradeKorea] Collected ${contacts.length} contacts`);
  return contacts;
}

/**
 * Korean cosmetics manufacturers from public data (MFDS registry).
 * Uses the publicly available open data API.
 */
async function collectFromCosmeticsRegistry() {
  const contacts = [];

  console.log("[Cosmetics] Fetching MFDS cosmetics manufacturer registry...");

  try {
    // Public data portal API for cosmetics manufacturers
    const url =
      "https://openapi.foodsafetykorea.go.kr/api/sample/C003/json/1/100";

    const html = await fetchWithRetry(url);

    try {
      const data = JSON.parse(html);
      const rows = data?.C003?.row || [];

      for (const row of rows) {
        const companyName = row.BSSH_NM || row.ENTRPS_NM || null;
        const address = row.ADDR || row.SITE_ADDR || null;
        const phone = row.TELNO || row.TEL_NO || null;

        if (companyName) {
          contacts.push(
            createContact({
              category: "manufacturer",
              companyName,
              phone,
              industry: "cosmetics",
              source: "foodsafetykorea.go.kr",
              notes: `Cosmetics manufacturer registry${address ? ` - ${address}` : ""}`,
            }),
          );
        }
      }
    } catch {
      // Response may not be JSON; try HTML parsing fallback
      const companyBlocks = extractAll(
        html,
        /<tr[^>]*>[\s\S]*?<\/tr>/gi,
      );

      for (const block of companyBlocks) {
        const cells = extractAll(block[0], /<td[^>]*>([\s\S]*?)<\/td>/gi);
        if (cells.length >= 2) {
          const companyName = stripTags(cells[0][1]);
          const phone = cells.length >= 3 ? stripTags(cells[2][1]) : null;

          if (companyName && companyName.length > 1) {
            contacts.push(
              createContact({
                category: "manufacturer",
                companyName,
                phone,
                industry: "cosmetics",
                source: "foodsafetykorea.go.kr",
                notes: "Cosmetics manufacturer registry",
              }),
            );
          }
        }
      }
    }

    await delay(REQUEST_DELAY_MS);
  } catch (err) {
    console.error(`[Cosmetics] Error: ${err.message}`);
  }

  console.log(`[Cosmetics] Collected ${contacts.length} contacts`);
  return contacts;
}

/**
 * Food manufacturers from the food safety portal (public data).
 */
async function collectFromFoodSafety() {
  const contacts = [];

  console.log("[Food] Fetching food manufacturer listings...");

  try {
    // Public food safety data portal
    const url =
      "https://openapi.foodsafetykorea.go.kr/api/sample/C002/json/1/100";

    const html = await fetchWithRetry(url);

    try {
      const data = JSON.parse(html);
      const rows = data?.C002?.row || [];

      for (const row of rows) {
        const companyName = row.BSSH_NM || row.ENTRPS_NM || null;
        const address = row.ADDR || row.SITE_ADDR || null;
        const phone = row.TELNO || row.TEL_NO || null;

        if (companyName) {
          contacts.push(
            createContact({
              category: "manufacturer",
              companyName,
              phone,
              industry: "food",
              source: "foodsafetykorea.go.kr",
              notes: `Food manufacturer${address ? ` - ${address}` : ""}`,
            }),
          );
        }
      }
    } catch {
      // Fallback HTML parsing
      const companyBlocks = extractAll(
        html,
        /<tr[^>]*>[\s\S]*?<\/tr>/gi,
      );

      for (const block of companyBlocks) {
        const cells = extractAll(block[0], /<td[^>]*>([\s\S]*?)<\/td>/gi);
        if (cells.length >= 2) {
          const companyName = stripTags(cells[0][1]);
          if (companyName && companyName.length > 1) {
            contacts.push(
              createContact({
                category: "manufacturer",
                companyName,
                industry: "food",
                source: "foodsafetykorea.go.kr",
                notes: "Food manufacturer registry",
              }),
            );
          }
        }
      }
    }

    await delay(REQUEST_DELAY_MS);
  } catch (err) {
    console.error(`[Food] Error: ${err.message}`);
  }

  console.log(`[Food] Collected ${contacts.length} contacts`);
  return contacts;
}

// ---------------------------------------------------------------------------
// Deduplication
// ---------------------------------------------------------------------------

function deduplicateContacts(contacts) {
  const seen = new Map();
  const deduplicated = [];
  let duplicateCount = 0;

  for (const contact of contacts) {
    // Build a dedup key: prefer email, fall back to company_name + source
    const dedupeKey = contact.email
      ? `email:${contact.email}`
      : `name:${(contact.company_name || contact.company_name_en || "").toLowerCase()}:${contact.source}`;

    if (dedupeKey === "name::") continue; // skip empty contacts

    if (seen.has(dedupeKey)) {
      duplicateCount++;
      // Merge: fill in missing fields from duplicate
      const existing = seen.get(dedupeKey);
      if (!existing.phone && contact.phone) existing.phone = contact.phone;
      if (!existing.email && contact.email) existing.email = contact.email;
      if (!existing.website && contact.website) existing.website = contact.website;
      if (!existing.company_name && contact.company_name) {
        existing.company_name = contact.company_name;
      }
      if (!existing.company_name_en && contact.company_name_en) {
        existing.company_name_en = contact.company_name_en;
      }
    } else {
      seen.set(dedupeKey, contact);
      deduplicated.push(contact);
    }
  }

  return { deduplicated, duplicateCount };
}

// ---------------------------------------------------------------------------
// Supabase upsert
// ---------------------------------------------------------------------------

async function upsertToSupabase(contacts) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    console.error(
      "ERROR: SUPABASE_SERVICE_ROLE_KEY is not set. " +
      "Set it in scripts/.env or as an environment variable.",
    );
    process.exit(1);
  }

  const url = `${SUPABASE_URL}/rest/v1/outreach_contacts`;
  const BATCH_SIZE = 50;
  let insertedCount = 0;
  let errorCount = 0;

  console.log(`\nUpserting ${contacts.length} contacts to Supabase...`);

  for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
    const batch = contacts.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(contacts.length / BATCH_SIZE);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          Prefer: "resolution=merge-duplicates,return=minimal",
        },
        body: JSON.stringify(batch),
      });

      if (res.ok) {
        insertedCount += batch.length;
        console.log(`  Batch ${batchNum}/${totalBatches}: ${batch.length} upserted`);
      } else {
        const errBody = await res.text();
        console.error(
          `  Batch ${batchNum}/${totalBatches}: HTTP ${res.status} - ${errBody}`,
        );
        errorCount += batch.length;
      }
    } catch (err) {
      console.error(`  Batch ${batchNum}/${totalBatches}: ${err.message}`);
      errorCount += batch.length;
    }

    if (i + BATCH_SIZE < contacts.length) {
      await delay(500);
    }
  }

  return { insertedCount, errorCount };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("=== Whistle Contact Collector ===");
  console.log(`Started at ${new Date().toISOString()}\n`);

  loadEnv();

  // Run all collectors. Each handles its own errors so one failure
  // does not prevent the others from completing.
  const collectorResults = await Promise.allSettled([
    collectFromKita(),
    collectFromBuyKorea(),
    collectFromEc21(),
    collectFromTradeKorea(),
    collectFromCosmeticsRegistry(),
    collectFromFoodSafety(),
  ]);

  // Flatten results
  const allContacts = [];
  for (const result of collectorResults) {
    if (result.status === "fulfilled" && Array.isArray(result.value)) {
      allContacts.push(...result.value);
    }
  }

  console.log(`\n--- Summary ---`);
  console.log(`Total collected (raw): ${allContacts.length}`);

  // Filter out contacts with no useful identifying info
  const validContacts = allContacts.filter(
    (c) => c.company_name || c.company_name_en || c.email,
  );
  console.log(`Valid contacts (has name or email): ${validContacts.length}`);

  // Deduplicate
  const { deduplicated, duplicateCount } = deduplicateContacts(validContacts);
  console.log(`Duplicates merged: ${duplicateCount}`);
  console.log(`Unique contacts: ${deduplicated.length}`);

  if (deduplicated.length === 0) {
    console.log(
      "\nNo contacts to insert. Sources may have changed their page structure.",
    );
    console.log(
      "Consider updating the parsing logic for each source.",
    );
    process.exit(0);
  }

  // Upsert to Supabase
  const { insertedCount, errorCount } = await upsertToSupabase(deduplicated);

  console.log(`\n--- Results ---`);
  console.log(`Upserted: ${insertedCount}`);
  console.log(`Errors: ${errorCount}`);
  console.log(`Completed at ${new Date().toISOString()}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
