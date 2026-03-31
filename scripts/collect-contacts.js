#!/usr/bin/env node

/**
 * collect-contacts.js
 *
 * Collects manufacturer/brand/buyer/partner contacts from public sources
 * and upserts them into the Supabase outreach_contacts table.
 *
 * Sources:
 *   Korean: Saramin, JobKorea, Food Safety Korea, KITA, BizInfo
 *   Global: Kompass, ThomasNet, GlobalSources, IndiaMART, Made-in-China
 *
 * Usage: node scripts/collect-contacts.js
 * Required env: SUPABASE_SERVICE_ROLE_KEY
 */

const { readFileSync, writeFileSync } = require("fs");
const { resolve } = require("path");

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const SUPABASE_URL =
  process.env.SUPABASE_URL || "https://lylktgxngrlxmsldxdqj.supabase.co";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) " +
  "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

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
    // .env file is optional
  }
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchPage(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const fetchOptions = {
    ...options,
    signal: controller.signal,
    headers: {
      "User-Agent": USER_AGENT,
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
      "Accept-Encoding": "identity",
      ...options.headers,
    },
  };

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, fetchOptions);
      clearTimeout(timeout);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
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

function extractAll(html, regex) {
  const results = [];
  let match;
  while ((match = regex.exec(html)) !== null) {
    results.push(match);
  }
  return results;
}

function stripTags(str) {
  return str
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
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

function findEmails(text) {
  const matches = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g);
  if (!matches) return [];
  return matches
    .map(normalizeEmail)
    .filter(Boolean)
    .filter((e) => !e.endsWith(".png") && !e.endsWith(".jpg") && !e.endsWith(".gif"));
}

function findPhones(text) {
  const matches = text.match(
    /(?:\+?82[\-\s]?\d{1,2}[\-\s]?\d{3,4}[\-\s]?\d{4}|\d{2,3}[\-\s]\d{3,4}[\-\s]\d{4}|\+1[\-\s]?\d{3}[\-\s]?\d{3}[\-\s]?\d{4})/g,
  );
  return matches ? matches.map(normalizePhone).filter(Boolean) : [];
}

function findWebsites(text, excludeDomains = []) {
  const matches = text.match(/https?:\/\/[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}[^\s"'<)}\]]*?/g);
  if (!matches) return [];
  return matches
    .map(normalizeUrl)
    .filter(Boolean)
    .filter((u) => {
      const host = new URL(u).hostname.toLowerCase();
      return !excludeDomains.some((d) => host.includes(d));
    });
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
  const name = companyName || companyNameEn || "";
  if (!name || name.length < 2) return null;

  return {
    category,
    company_name: name,
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

function log(tag, msg) {
  console.log(`[${tag}] ${msg}`);
}

function logErr(tag, msg) {
  console.error(`[${tag}] ERROR: ${msg}`);
}

// ---------------------------------------------------------------------------
// Source 1: Saramin (사람인) — export/trade job postings = active companies
// ---------------------------------------------------------------------------

async function collectFromSaramin() {
  const TAG = "Saramin";
  const contacts = [];
  const keywords = [
    "수출", "무역", "제조", "화장품수출", "식품수출",
    "포워딩", "관세사", "3PL", "물류", "해외영업",
  ];

  const categoryMap = {
    "수출": "manufacturer",
    "무역": "manufacturer",
    "제조": "manufacturer",
    "화장품수출": "manufacturer",
    "식품수출": "manufacturer",
    "포워딩": "forwarder",
    "관세사": "customs_broker",
    "3PL": "3pl",
    "물류": "forwarder",
    "해외영업": "manufacturer",
  };

  log(TAG, "Searching companies hiring for export/trade roles...");

  for (const keyword of keywords) {
    try {
      const encodedKeyword = encodeURIComponent(keyword);
      const url = `https://www.saramin.co.kr/zf_user/search?searchType=company&searchword=${encodedKeyword}`;
      const html = await fetchPage(url);

      // Saramin company search results have company name in title/link elements
      // Pattern: company name appears in <a> tags with class containing "company" or "corp"
      const companyMatches = extractAll(
        html,
        /<a[^>]*href="[^"]*company_nm[^"]*"[^>]*>([\s\S]*?)<\/a>/gi,
      );

      // Fallback: look for company names in structured data
      const altMatches = extractAll(
        html,
        /<strong[^>]*class="[^"]*company[^"]*"[^>]*>([\s\S]*?)<\/strong>/gi,
      );

      // Another pattern: company info blocks
      const blockMatches = extractAll(
        html,
        /<span[^>]*class="[^"]*corp_name[^"]*"[^>]*>([\s\S]*?)<\/span>/gi,
      );

      // Also try: company list items
      const itemMatches = extractAll(
        html,
        /<div[^>]*class="[^"]*company_info[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
      );

      const allNames = new Set();

      for (const m of [...companyMatches, ...altMatches, ...blockMatches]) {
        const name = stripTags(m[1]);
        if (name && name.length >= 2 && name.length < 100) {
          allNames.add(name);
        }
      }

      for (const m of itemMatches) {
        const block = m[0];
        const nameMatch = block.match(/<a[^>]*>([\s\S]*?)<\/a>/i) ||
          block.match(/<strong[^>]*>([\s\S]*?)<\/strong>/i);
        if (nameMatch) {
          const name = stripTags(nameMatch[1]);
          if (name && name.length >= 2 && name.length < 100) {
            allNames.add(name);
          }
        }
      }

      // Parse full page for any company-like patterns from Saramin's JSON data
      const jsonMatches = extractAll(
        html,
        /"company_nm"\s*:\s*"([^"]+)"/gi,
      );
      for (const m of jsonMatches) {
        const name = m[1].trim();
        if (name.length >= 2) allNames.add(name);
      }

      // Also try csn (company search name) patterns
      const csnMatches = extractAll(
        html,
        /"comp_nm"\s*:\s*"([^"]+)"/gi,
      );
      for (const m of csnMatches) {
        const name = m[1].trim();
        if (name.length >= 2) allNames.add(name);
      }

      for (const name of allNames) {
        const c = createContact({
          category: categoryMap[keyword] || "manufacturer",
          companyName: name,
          industry: keyword,
          country: "KR",
          source: "saramin.co.kr",
          notes: `Saramin company search: ${keyword}`,
        });
        if (c) contacts.push(c);
      }

      log(TAG, `  "${keyword}": found ${allNames.size} companies`);
      await delay(REQUEST_DELAY_MS);
    } catch (err) {
      logErr(TAG, `"${keyword}": ${err.message}`);
    }
  }

  log(TAG, `Collected ${contacts.length} contacts`);
  return contacts;
}

// ---------------------------------------------------------------------------
// Source 2: JobKorea (잡코리아) — same approach
// ---------------------------------------------------------------------------

async function collectFromJobKorea() {
  const TAG = "JobKorea";
  const contacts = [];
  const keywords = ["수출", "무역", "제조업", "화장품", "식품제조", "해외영업", "물류"];

  log(TAG, "Searching companies hiring for export/trade roles...");

  for (const keyword of keywords) {
    try {
      const encodedKeyword = encodeURIComponent(keyword);
      const url = `https://www.jobkorea.co.kr/Search/?stext=${encodedKeyword}&tabType=corp`;
      const html = await fetchPage(url);

      const allNames = new Set();

      // JobKorea company name patterns
      const nameMatches = extractAll(
        html,
        /<a[^>]*class="[^"]*name[^"]*"[^>]*>([\s\S]*?)<\/a>/gi,
      );
      for (const m of nameMatches) {
        const name = stripTags(m[1]);
        if (name && name.length >= 2 && name.length < 100) allNames.add(name);
      }

      // Corp name spans
      const corpMatches = extractAll(
        html,
        /<span[^>]*class="[^"]*corp[^"]*"[^>]*>([\s\S]*?)<\/span>/gi,
      );
      for (const m of corpMatches) {
        const name = stripTags(m[1]);
        if (name && name.length >= 2 && name.length < 100) allNames.add(name);
      }

      // JSON embedded data
      const jsonMatches = extractAll(html, /"company(?:Name|_name)"\s*:\s*"([^"]+)"/gi);
      for (const m of jsonMatches) {
        const name = m[1].trim();
        if (name.length >= 2) allNames.add(name);
      }

      // Title tags with company names
      const titleMatches = extractAll(
        html,
        /<dt[^>]*>([\s\S]*?)<\/dt>/gi,
      );
      for (const m of titleMatches) {
        const name = stripTags(m[1]);
        if (name && name.length >= 2 && name.length < 60 && !name.includes("<")) {
          allNames.add(name);
        }
      }

      for (const name of allNames) {
        const c = createContact({
          companyName: name,
          industry: keyword,
          country: "KR",
          source: "jobkorea.co.kr",
          notes: `JobKorea company search: ${keyword}`,
        });
        if (c) contacts.push(c);
      }

      log(TAG, `  "${keyword}": found ${allNames.size} companies`);
      await delay(REQUEST_DELAY_MS);
    } catch (err) {
      logErr(TAG, `"${keyword}": ${err.message}`);
    }
  }

  log(TAG, `Collected ${contacts.length} contacts`);
  return contacts;
}

// ---------------------------------------------------------------------------
// Source 3: Food Safety Korea (식품안전나라) public API — no key needed
// ---------------------------------------------------------------------------

async function collectFromFoodSafetyKorea() {
  const TAG = "FoodSafety";
  const contacts = [];

  // The "sample" key is publicly available for testing
  const apis = [
    {
      code: "C003",
      label: "cosmetics manufacturers",
      industry: "cosmetics",
      nameField: "BSSH_NM",
      addrField: "SITE_ADDR",
      phoneField: "TELNO",
    },
    {
      code: "C002",
      label: "food manufacturers",
      industry: "food",
      nameField: "BSSH_NM",
      addrField: "SITE_ADDR",
      phoneField: "TELNO",
    },
    {
      code: "I2790",
      label: "food additives manufacturers",
      industry: "food additives",
      nameField: "BSSH_NM",
      addrField: "SITE_ADDR",
      phoneField: "TELNO",
    },
  ];

  log(TAG, "Fetching public manufacturer registries...");

  for (const api of apis) {
    try {
      // Fetch pages of 100
      for (let startIdx = 1; startIdx <= 500; startIdx += 100) {
        const endIdx = startIdx + 99;
        const url = `https://openapi.foodsafetykorea.go.kr/api/sample/${api.code}/json/${startIdx}/${endIdx}`;

        const text = await fetchPage(url);

        let rows = [];
        try {
          const data = JSON.parse(text);
          rows = data?.[api.code]?.row || [];
        } catch {
          // Not valid JSON, skip
          break;
        }

        if (rows.length === 0) break;

        for (const row of rows) {
          const companyName = row[api.nameField] || row.ENTRPS_NM || row.PRDLST_NM || null;
          const address = row[api.addrField] || row.ADDR || null;
          const phone = row[api.phoneField] || row.TEL_NO || null;

          const c = createContact({
            companyName,
            phone,
            industry: api.industry,
            country: "KR",
            source: "foodsafetykorea.go.kr",
            notes: `${api.label}${address ? ` | ${address}` : ""}`,
          });
          if (c) contacts.push(c);
        }

        log(TAG, `  ${api.label} [${startIdx}-${endIdx}]: ${rows.length} rows`);

        if (rows.length < 100) break;
        await delay(REQUEST_DELAY_MS);
      }
    } catch (err) {
      logErr(TAG, `${api.label}: ${err.message}`);
    }
  }

  log(TAG, `Collected ${contacts.length} contacts`);
  return contacts;
}

// ---------------------------------------------------------------------------
// Source 4: KITA (한국무역협회) — trade statistics member search
// ---------------------------------------------------------------------------

async function collectFromKita() {
  const TAG = "KITA";
  const contacts = [];

  log(TAG, "Fetching KITA member/exporter listings...");

  try {
    // KITA has a public exporter directory at kita.net
    const url = "https://www.kita.net/cmmrcInfo/mnftrInfo/mnftrList.do";
    const html = await fetchPage(url);

    const allNames = new Set();

    // Table rows with company data
    const rows = extractAll(html, /<tr[^>]*>([\s\S]*?)<\/tr>/gi);
    for (const row of rows) {
      const cells = extractAll(row[1], /<td[^>]*>([\s\S]*?)<\/td>/gi);
      if (cells.length >= 2) {
        const name = stripTags(cells[0][1]);
        if (name && name.length >= 2 && name.length < 100) {
          const emails = findEmails(row[1]);
          const phones = findPhones(row[1]);
          const websites = findWebsites(row[1], ["kita.net"]);

          const c = createContact({
            companyName: name,
            email: emails[0] || null,
            phone: phones[0] || null,
            website: websites[0] || null,
            industry: "general trade",
            country: "KR",
            source: "kita.net",
            notes: "KITA member directory",
          });
          if (c) {
            contacts.push(c);
            allNames.add(name);
          }
        }
      }
    }

    // Also try JSON data embedded in page
    const jsonMatches = extractAll(html, /"(?:coNm|companyName|corpName)"\s*:\s*"([^"]+)"/gi);
    for (const m of jsonMatches) {
      const name = m[1].trim();
      if (name.length >= 2 && !allNames.has(name)) {
        allNames.add(name);
        const c = createContact({
          companyName: name,
          industry: "general trade",
          country: "KR",
          source: "kita.net",
          notes: "KITA member (JSON data)",
        });
        if (c) contacts.push(c);
      }
    }

    log(TAG, `Found ${allNames.size} companies from main listing`);
  } catch (err) {
    logErr(TAG, err.message);
  }

  // Try KITA trade statistics pages for additional companies
  try {
    const keywords = ["화장품", "식품", "전자", "자동차부품", "섬유"];
    for (const keyword of keywords) {
      const encodedKeyword = encodeURIComponent(keyword);
      const url = `https://www.kita.net/cmmrcInfo/mnftrInfo/mnftrList.do?searchKeyword=${encodedKeyword}`;
      const html = await fetchPage(url);

      const rows = extractAll(html, /<tr[^>]*>([\s\S]*?)<\/tr>/gi);
      for (const row of rows) {
        const linkMatch = row[1].match(/<a[^>]*>([\s\S]*?)<\/a>/i);
        if (linkMatch) {
          const name = stripTags(linkMatch[1]);
          if (name && name.length >= 2 && name.length < 100) {
            const c = createContact({
              companyName: name,
              industry: keyword,
              country: "KR",
              source: "kita.net",
              notes: `KITA search: ${keyword}`,
            });
            if (c) contacts.push(c);
          }
        }
      }

      await delay(REQUEST_DELAY_MS);
    }
  } catch (err) {
    logErr(TAG, `keyword search: ${err.message}`);
  }

  log(TAG, `Collected ${contacts.length} contacts`);
  return contacts;
}

// ---------------------------------------------------------------------------
// Source 5: BizInfo (기업마당, 중소벤처기업부)
// ---------------------------------------------------------------------------

async function collectFromBizInfo() {
  const TAG = "BizInfo";
  const contacts = [];

  log(TAG, "Fetching company support program listings...");

  try {
    // bizinfo.go.kr public company support pages
    const url = "https://www.bizinfo.go.kr/web/lay1/bbs/S1T122C128/AS/74/view.do";
    const html = await fetchPage(url);

    const rows = extractAll(html, /<tr[^>]*>([\s\S]*?)<\/tr>/gi);
    for (const row of rows) {
      const cells = extractAll(row[1], /<td[^>]*>([\s\S]*?)<\/td>/gi);
      if (cells.length >= 2) {
        const name = stripTags(cells[0][1]);
        if (name && name.length >= 2 && name.length < 100) {
          const c = createContact({
            companyName: name,
            category: "manufacturer",
            industry: "SME",
            country: "KR",
            source: "bizinfo.go.kr",
            notes: "BizInfo company listing",
          });
          if (c) contacts.push(c);
        }
      }
    }
  } catch (err) {
    logErr(TAG, err.message);
  }

  // Search for export-related support programs (companies often listed)
  const keywords = ["수출", "무역", "제조"];
  for (const keyword of keywords) {
    try {
      const encodedKeyword = encodeURIComponent(keyword);
      const url = `https://www.bizinfo.go.kr/web/lay1/bbs/S1T122C128/AS/74/list.do?searchKeyword=${encodedKeyword}`;
      const html = await fetchPage(url);

      const nameMatches = extractAll(html, /<a[^>]*class="[^"]*subject[^"]*"[^>]*>([\s\S]*?)<\/a>/gi);
      for (const m of nameMatches) {
        const text = stripTags(m[1]);
        // Extract company names mentioned in support program titles
        const companyMatch = text.match(/(?:주\)|㈜|주식회사\s*)([가-힣a-zA-Z0-9]+)/);
        if (companyMatch) {
          const c = createContact({
            companyName: companyMatch[1],
            industry: keyword,
            country: "KR",
            source: "bizinfo.go.kr",
            notes: `BizInfo program: ${text.slice(0, 80)}`,
          });
          if (c) contacts.push(c);
        }
      }

      await delay(REQUEST_DELAY_MS);
    } catch (err) {
      logErr(TAG, `"${keyword}": ${err.message}`);
    }
  }

  log(TAG, `Collected ${contacts.length} contacts`);
  return contacts;
}

// ---------------------------------------------------------------------------
// Source 6: Kompass — Global B2B directory
// ---------------------------------------------------------------------------

async function collectFromKompass() {
  const TAG = "Kompass";
  const contacts = [];

  const searches = [
    { query: "korean+cosmetics+manufacturer", industry: "cosmetics" },
    { query: "korean+food+manufacturer", industry: "food" },
    { query: "korean+electronics+manufacturer", industry: "electronics" },
    { query: "korean+textile+manufacturer", industry: "textile" },
    { query: "korean+auto+parts+manufacturer", industry: "auto parts" },
    { query: "korean+machinery+manufacturer", industry: "machinery" },
  ];

  log(TAG, "Searching global B2B directory...");

  for (const search of searches) {
    try {
      const url = `https://www.kompass.com/searchCompanies?text=${search.query}`;
      const html = await fetchPage(url);

      // Kompass lists companies in structured blocks
      const companyBlocks = extractAll(
        html,
        /<div[^>]*class="[^"]*product-item[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi,
      );

      // Also try list items
      const listItems = extractAll(
        html,
        /<li[^>]*class="[^"]*company[^"]*"[^>]*>([\s\S]*?)<\/li>/gi,
      );

      // Try article blocks
      const articleBlocks = extractAll(
        html,
        /<article[^>]*>([\s\S]*?)<\/article>/gi,
      );

      // Parse company names from h2/h3/a tags
      const allBlocks = [...companyBlocks, ...listItems, ...articleBlocks];
      const allNames = new Set();

      for (const block of allBlocks) {
        const content = block[1] || block[0];
        const nameMatch = content.match(/<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/i) ||
          content.match(/<a[^>]*class="[^"]*companyName[^"]*"[^>]*>([\s\S]*?)<\/a>/i) ||
          content.match(/<a[^>]*>([\s\S]*?)<\/a>/i);

        if (nameMatch) {
          const name = stripTags(nameMatch[1]);
          if (name && name.length >= 2 && name.length < 150 && !allNames.has(name)) {
            allNames.add(name);
            const websites = findWebsites(content, ["kompass.com"]);
            const countryMatch = content.match(/<span[^>]*class="[^"]*country[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
            const country = countryMatch ? stripTags(countryMatch[1]).slice(0, 2).toUpperCase() : "KR";

            const c = createContact({
              companyNameEn: name,
              companyName: name,
              website: websites[0] || null,
              industry: search.industry,
              country: country.length === 2 ? country : "KR",
              source: "kompass.com",
              notes: `Kompass: ${search.query.replace(/\+/g, " ")}`,
            });
            if (c) contacts.push(c);
          }
        }
      }

      // Fallback: extract from JSON-LD or script data
      const jsonLdMatches = extractAll(html, /"name"\s*:\s*"([^"]{2,100})"/gi);
      for (const m of jsonLdMatches) {
        const name = m[1].trim();
        if (name.length >= 2 && !allNames.has(name) && !name.includes("Kompass")) {
          allNames.add(name);
          const c = createContact({
            companyNameEn: name,
            companyName: name,
            industry: search.industry,
            source: "kompass.com",
            notes: `Kompass: ${search.query.replace(/\+/g, " ")}`,
          });
          if (c) contacts.push(c);
        }
      }

      log(TAG, `  "${search.industry}": found ${allNames.size} companies`);
      await delay(REQUEST_DELAY_MS);
    } catch (err) {
      logErr(TAG, `"${search.industry}": ${err.message}`);
    }
  }

  log(TAG, `Collected ${contacts.length} contacts`);
  return contacts;
}

// ---------------------------------------------------------------------------
// Source 7: ThomasNet — US industrial buyers/manufacturers
// ---------------------------------------------------------------------------

async function collectFromThomasNet() {
  const TAG = "ThomasNet";
  const contacts = [];

  const categories = [
    { path: "cosmetics-manufacturers", industry: "cosmetics" },
    { path: "food-processing-equipment", industry: "food" },
    { path: "electronic-components", industry: "electronics" },
    { path: "industrial-machinery", industry: "machinery" },
    { path: "packaging-equipment", industry: "packaging" },
    { path: "textile-machinery", industry: "textile" },
  ];

  log(TAG, "Searching US manufacturer/buyer directory...");

  for (const cat of categories) {
    try {
      const url = `https://www.thomasnet.com/products/${cat.path}`;
      const html = await fetchPage(url);

      const allNames = new Set();

      // ThomasNet company listings
      const companyMatches = extractAll(
        html,
        /<h2[^>]*class="[^"]*profile-card__title[^"]*"[^>]*>([\s\S]*?)<\/h2>/gi,
      );
      for (const m of companyMatches) {
        const name = stripTags(m[1]);
        if (name && name.length >= 2 && name.length < 150) allNames.add(name);
      }

      // Alt pattern
      const altMatches = extractAll(
        html,
        /<a[^>]*class="[^"]*company-name[^"]*"[^>]*>([\s\S]*?)<\/a>/gi,
      );
      for (const m of altMatches) {
        const name = stripTags(m[1]);
        if (name && name.length >= 2) allNames.add(name);
      }

      // JSON-LD data
      const jsonMatches = extractAll(html, /"name"\s*:\s*"([^"]{2,150})"/gi);
      for (const m of jsonMatches) {
        const name = m[1].trim();
        if (name.length >= 2 && !name.includes("Thomas") && !name.includes("Product")) {
          allNames.add(name);
        }
      }

      // Supplier names in list format
      const supplierMatches = extractAll(
        html,
        /<span[^>]*class="[^"]*supplier-name[^"]*"[^>]*>([\s\S]*?)<\/span>/gi,
      );
      for (const m of supplierMatches) {
        const name = stripTags(m[1]);
        if (name && name.length >= 2) allNames.add(name);
      }

      for (const name of allNames) {
        const c = createContact({
          category: "buyer",
          companyNameEn: name,
          companyName: name,
          industry: cat.industry,
          country: "US",
          source: "thomasnet.com",
          notes: `ThomasNet: ${cat.path}`,
        });
        if (c) contacts.push(c);
      }

      log(TAG, `  "${cat.industry}": found ${allNames.size} companies`);
      await delay(REQUEST_DELAY_MS);
    } catch (err) {
      logErr(TAG, `"${cat.industry}": ${err.message}`);
    }
  }

  log(TAG, `Collected ${contacts.length} contacts`);
  return contacts;
}

// ---------------------------------------------------------------------------
// Source 8: GlobalSources — Asian manufacturers
// ---------------------------------------------------------------------------

async function collectFromGlobalSources() {
  const TAG = "GlobalSources";
  const contacts = [];

  const categories = [
    { path: "Beauty-Personal-Care/Cosmetics", industry: "cosmetics" },
    { path: "Food-Beverage/Food", industry: "food" },
    { path: "Consumer-Electronics", industry: "electronics" },
    { path: "Fashion-Accessories", industry: "fashion" },
    { path: "Auto-Parts-Accessories", industry: "auto parts" },
    { path: "Hardware/Machinery", industry: "machinery" },
  ];

  log(TAG, "Searching Asian manufacturer directory...");

  for (const cat of categories) {
    try {
      const url = `https://www.globalsources.com/${cat.path}/suppliers.html`;
      const html = await fetchPage(url);

      const allNames = new Set();

      // GlobalSources supplier name patterns
      const namePatterns = [
        /<h2[^>]*class="[^"]*supplierName[^"]*"[^>]*>([\s\S]*?)<\/h2>/gi,
        /<a[^>]*class="[^"]*supplier[^"]*name[^"]*"[^>]*>([\s\S]*?)<\/a>/gi,
        /<span[^>]*class="[^"]*companyName[^"]*"[^>]*>([\s\S]*?)<\/span>/gi,
        /<div[^>]*class="[^"]*supplierInfo[^"]*"[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/gi,
      ];

      for (const pattern of namePatterns) {
        const matches = extractAll(html, pattern);
        for (const m of matches) {
          const name = stripTags(m[1]);
          if (name && name.length >= 2 && name.length < 150) allNames.add(name);
        }
      }

      // JSON data
      const jsonMatches = extractAll(html, /"(?:supplierName|companyName)"\s*:\s*"([^"]+)"/gi);
      for (const m of jsonMatches) {
        const name = m[1].trim();
        if (name.length >= 2) allNames.add(name);
      }

      for (const name of allNames) {
        const c = createContact({
          companyNameEn: name,
          companyName: name,
          industry: cat.industry,
          country: "CN",
          source: "globalsources.com",
          notes: `GlobalSources: ${cat.path}`,
        });
        if (c) contacts.push(c);
      }

      log(TAG, `  "${cat.industry}": found ${allNames.size} companies`);
      await delay(REQUEST_DELAY_MS);
    } catch (err) {
      logErr(TAG, `"${cat.industry}": ${err.message}`);
    }
  }

  log(TAG, `Collected ${contacts.length} contacts`);
  return contacts;
}

// ---------------------------------------------------------------------------
// Source 9: IndiaMART — Indian buyers
// ---------------------------------------------------------------------------

async function collectFromIndiamart() {
  const TAG = "IndiaMART";
  const contacts = [];

  const searches = [
    { query: "korean-cosmetics-importers", industry: "cosmetics" },
    { query: "korean-food-importers", industry: "food" },
    { query: "electronics-importers", industry: "electronics" },
    { query: "korean-beauty-products", industry: "beauty" },
    { query: "food-processing-equipment", industry: "food processing" },
    { query: "packaging-machinery-importers", industry: "packaging" },
  ];

  log(TAG, "Searching Indian buyer directory...");

  for (const search of searches) {
    try {
      const url = `https://dir.indiamart.com/search.mp?ss=${search.query}`;
      const html = await fetchPage(url);

      const allNames = new Set();

      // IndiaMART company listing patterns
      const companyMatches = extractAll(
        html,
        /<span[^>]*class="[^"]*company[^"]*"[^>]*>([\s\S]*?)<\/span>/gi,
      );
      for (const m of companyMatches) {
        const name = stripTags(m[1]);
        if (name && name.length >= 2 && name.length < 150) allNames.add(name);
      }

      // Alt: seller name blocks
      const sellerMatches = extractAll(
        html,
        /<a[^>]*class="[^"]*companyname[^"]*"[^>]*>([\s\S]*?)<\/a>/gi,
      );
      for (const m of sellerMatches) {
        const name = stripTags(m[1]);
        if (name && name.length >= 2) allNames.add(name);
      }

      // Title-based extraction
      const titleMatches = extractAll(
        html,
        /<h2[^>]*>([\s\S]*?)<\/h2>/gi,
      );
      for (const m of titleMatches) {
        const name = stripTags(m[1]);
        if (name && name.length >= 3 && name.length < 100 &&
          !name.toLowerCase().includes("search") &&
          !name.toLowerCase().includes("result")) {
          allNames.add(name);
        }
      }

      // JSON embedded
      const jsonMatches = extractAll(html, /"compnm"\s*:\s*"([^"]+)"/gi);
      for (const m of jsonMatches) {
        const name = m[1].trim();
        if (name.length >= 2) allNames.add(name);
      }

      const altJsonMatches = extractAll(html, /"company_name"\s*:\s*"([^"]+)"/gi);
      for (const m of altJsonMatches) {
        const name = m[1].trim();
        if (name.length >= 2) allNames.add(name);
      }

      for (const name of allNames) {
        const emails = findEmails(html);
        const c = createContact({
          category: "buyer",
          companyNameEn: name,
          companyName: name,
          email: emails.length > 0 ? emails[0] : null,
          industry: search.industry,
          country: "IN",
          source: "indiamart.com",
          notes: `IndiaMART: ${search.query}`,
        });
        if (c) contacts.push(c);
      }

      log(TAG, `  "${search.industry}": found ${allNames.size} companies`);
      await delay(REQUEST_DELAY_MS);
    } catch (err) {
      logErr(TAG, `"${search.industry}": ${err.message}`);
    }
  }

  log(TAG, `Collected ${contacts.length} contacts`);
  return contacts;
}

// ---------------------------------------------------------------------------
// Source 10: Made-in-China — Chinese manufacturers
// ---------------------------------------------------------------------------

async function collectFromMadeInChina() {
  const TAG = "MadeInChina";
  const contacts = [];

  const searches = [
    { query: "cosmetics-manufacturer", industry: "cosmetics" },
    { query: "food-processing", industry: "food" },
    { query: "electronics-manufacturer", industry: "electronics" },
    { query: "textile-manufacturer", industry: "textile" },
    { query: "machinery-manufacturer", industry: "machinery" },
    { query: "packaging-manufacturer", industry: "packaging" },
  ];

  log(TAG, "Searching Chinese manufacturer directory...");

  for (const search of searches) {
    try {
      const url = `https://www.made-in-china.com/manufacturers/${search.query}.html`;
      const html = await fetchPage(url);

      const allNames = new Set();

      // Made-in-China supplier patterns
      const namePatterns = [
        /<h2[^>]*class="[^"]*company-name[^"]*"[^>]*>([\s\S]*?)<\/h2>/gi,
        /<a[^>]*class="[^"]*companyName[^"]*"[^>]*>([\s\S]*?)<\/a>/gi,
        /<span[^>]*class="[^"]*compy-name[^"]*"[^>]*>([\s\S]*?)<\/span>/gi,
        /<a[^>]*title="([^"]{2,150})"[^>]*class="[^"]*supplier[^"]*"/gi,
      ];

      for (const pattern of namePatterns) {
        const matches = extractAll(html, pattern);
        for (const m of matches) {
          const name = stripTags(m[1]);
          if (name && name.length >= 2 && name.length < 200) allNames.add(name);
        }
      }

      // JSON embedded data
      const jsonMatches = extractAll(html, /"companyName"\s*:\s*"([^"]+)"/gi);
      for (const m of jsonMatches) {
        const name = m[1].trim();
        if (name.length >= 2) allNames.add(name);
      }

      // href title attributes (common pattern)
      const titleMatches = extractAll(
        html,
        /<a[^>]*href="[^"]*company[^"]*"[^>]*>([^<]{3,150})<\/a>/gi,
      );
      for (const m of titleMatches) {
        const name = stripTags(m[1]);
        if (name && name.length >= 3 &&
          !name.toLowerCase().includes("more") &&
          !name.toLowerCase().includes("view")) {
          allNames.add(name);
        }
      }

      for (const name of allNames) {
        const c = createContact({
          companyNameEn: name,
          companyName: name,
          industry: search.industry,
          country: "CN",
          source: "made-in-china.com",
          notes: `Made-in-China: ${search.query}`,
        });
        if (c) contacts.push(c);
      }

      log(TAG, `  "${search.industry}": found ${allNames.size} companies`);
      await delay(REQUEST_DELAY_MS);
    } catch (err) {
      logErr(TAG, `"${search.industry}": ${err.message}`);
    }
  }

  log(TAG, `Collected ${contacts.length} contacts`);
  return contacts;
}

// ---------------------------------------------------------------------------
// Deduplication — by company_name + country
// ---------------------------------------------------------------------------

function deduplicateContacts(contacts) {
  const seen = new Map();
  const deduplicated = [];
  let duplicateCount = 0;

  for (const contact of contacts) {
    const name = (contact.company_name || "").toLowerCase().replace(/\s+/g, " ").trim();
    if (!name) continue;

    const country = (contact.country || "").toUpperCase();
    const dedupeKey = `${name}|${country}`;

    if (seen.has(dedupeKey)) {
      duplicateCount++;
      // Merge: fill in missing fields from duplicate
      const existing = seen.get(dedupeKey);
      if (!existing.phone && contact.phone) existing.phone = contact.phone;
      if (!existing.email && contact.email) existing.email = contact.email;
      if (!existing.website && contact.website) existing.website = contact.website;
      if (!existing.company_name_en && contact.company_name_en) {
        existing.company_name_en = contact.company_name_en;
      }
      if (!existing.contact_name && contact.contact_name) {
        existing.contact_name = contact.contact_name;
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
      "WARNING: SUPABASE_SERVICE_ROLE_KEY not set. Skipping Supabase upsert.",
    );
    console.error("Contacts saved to scripts/collected-contacts.json only.");
    return { insertedCount: 0, errorCount: 0 };
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
          "apikey": serviceRoleKey,
          "Authorization": `Bearer ${serviceRoleKey}`,
          "Prefer": "resolution=merge-duplicates,return=minimal",
        },
        body: JSON.stringify(batch),
      });

      if (res.ok) {
        insertedCount += batch.length;
        console.log(`  Batch ${batchNum}/${totalBatches}: ${batch.length} upserted`);
      } else {
        const errBody = await res.text();
        console.error(
          `  Batch ${batchNum}/${totalBatches}: HTTP ${res.status} - ${errBody.slice(0, 200)}`,
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
  console.log("=== Whistle Contact Collector v2 ===");
  console.log(`Started at ${new Date().toISOString()}`);
  console.log(`Sources: Saramin, JobKorea, FoodSafetyKorea, KITA, BizInfo,`);
  console.log(`         Kompass, ThomasNet, GlobalSources, IndiaMART, Made-in-China\n`);

  loadEnv();

  // Run all collectors sequentially per group, parallel between groups
  // Korean sources first, then global
  const koreanSources = [
    { name: "Saramin", fn: collectFromSaramin },
    { name: "JobKorea", fn: collectFromJobKorea },
    { name: "FoodSafetyKorea", fn: collectFromFoodSafetyKorea },
    { name: "KITA", fn: collectFromKita },
    { name: "BizInfo", fn: collectFromBizInfo },
  ];

  const globalSources = [
    { name: "Kompass", fn: collectFromKompass },
    { name: "ThomasNet", fn: collectFromThomasNet },
    { name: "GlobalSources", fn: collectFromGlobalSources },
    { name: "IndiaMART", fn: collectFromIndiamart },
    { name: "Made-in-China", fn: collectFromMadeInChina },
  ];

  const allSources = [...koreanSources, ...globalSources];
  const allContacts = [];
  const sourceStats = {};

  // Run each source sequentially (respects rate limits)
  for (const source of allSources) {
    console.log(`\n--- ${source.name} ---`);
    try {
      const contacts = await source.fn();
      sourceStats[source.name] = contacts.length;
      allContacts.push(...contacts);
    } catch (err) {
      console.error(`[${source.name}] Fatal error: ${err.message}`);
      sourceStats[source.name] = 0;
    }
  }

  console.log("\n========================================");
  console.log("           COLLECTION SUMMARY           ");
  console.log("========================================");

  for (const [name, count] of Object.entries(sourceStats)) {
    const status = count > 0 ? "OK" : "EMPTY";
    console.log(`  ${name.padEnd(20)} ${String(count).padStart(5)} contacts  [${status}]`);
  }

  console.log(`  ${"─".repeat(38)}`);
  console.log(`  ${"TOTAL (raw)".padEnd(20)} ${String(allContacts.length).padStart(5)} contacts`);

  // Filter out contacts with no useful identifying info
  const validContacts = allContacts.filter((c) => c.company_name);
  console.log(`  ${"Valid (has name)".padEnd(20)} ${String(validContacts.length).padStart(5)} contacts`);

  // Deduplicate
  const { deduplicated, duplicateCount } = deduplicateContacts(validContacts);
  console.log(`  ${"Duplicates merged".padEnd(20)} ${String(duplicateCount).padStart(5)}`);
  console.log(`  ${"UNIQUE CONTACTS".padEnd(20)} ${String(deduplicated.length).padStart(5)}`);
  console.log("========================================\n");

  // Category breakdown
  const categoryBreakdown = {};
  const countryBreakdown = {};
  for (const c of deduplicated) {
    categoryBreakdown[c.category] = (categoryBreakdown[c.category] || 0) + 1;
    countryBreakdown[c.country || "unknown"] = (countryBreakdown[c.country || "unknown"] || 0) + 1;
  }

  console.log("By category:");
  for (const [cat, count] of Object.entries(categoryBreakdown).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cat.padEnd(20)} ${count}`);
  }

  console.log("\nBy country:");
  for (const [country, count] of Object.entries(countryBreakdown).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${country.padEnd(20)} ${count}`);
  }

  // Save backup JSON
  const backupPath = resolve(__dirname, "collected-contacts.json");
  try {
    writeFileSync(backupPath, JSON.stringify(deduplicated, null, 2), "utf-8");
    console.log(`\nBackup saved: ${backupPath}`);
  } catch (err) {
    console.error(`Failed to save backup: ${err.message}`);
  }

  if (deduplicated.length === 0) {
    console.log("\nNo contacts collected. All sources may be blocked or changed structure.");
    console.log("Check network connectivity and retry.");
    process.exit(0);
  }

  // Upsert to Supabase
  const { insertedCount, errorCount } = await upsertToSupabase(deduplicated);

  console.log("\n========================================");
  console.log("           UPSERT RESULTS              ");
  console.log("========================================");
  console.log(`  Upserted:  ${insertedCount}`);
  console.log(`  Errors:    ${errorCount}`);
  console.log(`  Completed: ${new Date().toISOString()}`);
  console.log("========================================");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
