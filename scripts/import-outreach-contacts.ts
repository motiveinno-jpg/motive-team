#!/usr/bin/env -S deno run --allow-net --allow-read --allow-env

/**
 * Import contacts from global-outreach-db.md into Supabase marketing_contacts table.
 *
 * Usage:
 *   deno run --allow-net --allow-read --allow-env scripts/import-outreach-contacts.ts
 *
 * Environment variables:
 *   SUPABASE_URL           — Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY — Service role key
 *
 * Options:
 *   --dry-run              — Parse and show results without inserting
 *   --enroll               — Also enroll imported contacts into drip sequences
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// ─── Parse CLI args ──────────────────────────────────────

const isDryRun = Deno.args.includes("--dry-run");
const shouldEnroll = Deno.args.includes("--enroll");

// ─── Types ───────────────────────────────────────────────

interface ParsedContact {
  company: string;
  koreanName?: string;
  website?: string;
  products?: string;
  exportMarkets?: string;
  country: string;
  contactType: "manufacturer" | "buyer";
  email?: string;
  tags: string[];
  language: string;
  section: string;
}

// ─── Parser ──────────────────────────────────────────────

function parseOutreachDb(content: string): ParsedContact[] {
  const contacts: ParsedContact[] = [];
  const lines = content.split("\n");

  let currentSection = "";
  let currentSubsection = "";
  let currentIndustryTags: string[] = [];
  let isKorean = false;
  let isBuyer = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Detect section headers (## 1. Beauty & Cosmetics)
    if (line.startsWith("## ")) {
      currentSection = line.replace(/^##\s*\d+\.\s*/, "").trim();
      // Assign industry tags
      if (/beauty|cosmetics/i.test(currentSection)) {
        currentIndustryTags = ["beauty", "cosmetics"];
      } else if (/electronics/i.test(currentSection)) {
        currentIndustryTags = ["electronics"];
      } else if (/food|beverage/i.test(currentSection)) {
        currentIndustryTags = ["food"];
      } else if (/textile|fashion/i.test(currentSection)) {
        currentIndustryTags = ["textiles", "fashion"];
      } else if (/health|wellness/i.test(currentSection)) {
        currentIndustryTags = ["health", "wellness"];
      } else if (/industrial|auto/i.test(currentSection)) {
        currentIndustryTags = ["industrial", "automotive"];
      } else {
        currentIndustryTags = [];
      }
      continue;
    }

    // Detect subsection headers (### Korean Manufacturers)
    if (line.startsWith("### ")) {
      currentSubsection = line.replace(/^###\s*/, "").trim();
      isKorean = /korean/i.test(currentSubsection);
      isBuyer = /buyer|importer|distributor/i.test(currentSubsection);
      continue;
    }

    // Parse table rows (| Company | ... |)
    if (line.startsWith("|") && !line.startsWith("|-") && !line.startsWith("| Company") && !line.startsWith("| ---")) {
      const cells = line.split("|").map((c) => c.trim()).filter(Boolean);
      if (cells.length < 3) continue;

      // Skip header rows
      if (cells[0] === "Company" || cells[0].startsWith("---")) continue;

      const company = cells[0];

      // Determine contact info and email
      const lastCell = cells[cells.length - 1];
      let email: string | undefined;

      // Extract real email addresses
      const emailMatch = lastCell.match(/[\w.+-]+@[\w.-]+\.\w+/);
      if (emailMatch && !emailMatch[0].includes("placeholder")) {
        email = emailMatch[0].toLowerCase();
      }

      // Determine country
      let country = "KR";
      if (!isKorean) {
        // Try to find country in cells
        const countryCell = cells.find((c) =>
          /^(USA|UK|France|Germany|Japan|Taiwan|China|Brazil|Netherlands|Global|Europe|India|Korea)/i.test(c)
        );
        if (countryCell) {
          const countryMap: Record<string, string> = {
            usa: "US", uk: "GB", france: "FR", germany: "DE", japan: "JP",
            taiwan: "TW", china: "CN", brazil: "BR", netherlands: "NL",
            india: "IN", global: "GLOBAL", europe: "EU", korea: "KR",
          };
          const key = countryCell.split(/[/(]/)[0].trim().toLowerCase();
          country = countryMap[key] || "GLOBAL";
        } else {
          country = "GLOBAL";
        }
      }

      const contact: ParsedContact = {
        company,
        website: cells.find((c) => /\.\w{2,}$/.test(c) && !c.includes("@"))?.replace(/[\[\]]/g, ""),
        country,
        contactType: isBuyer ? "buyer" : "manufacturer",
        email,
        tags: [...currentIndustryTags, ...(isKorean ? ["korean"] : ["global"])],
        language: isKorean ? "ko" : "en",
        section: currentSection,
      };

      // Extract Korean name if present
      if (isKorean && cells.length >= 2) {
        const koreanNameCell = cells[1];
        if (/[가-힣]/.test(koreanNameCell)) {
          contact.koreanName = koreanNameCell;
        }
      }

      contacts.push(contact);
    }
  }

  return contacts;
}

// ─── Main ────────────────────────────────────────────────

async function main() {
  console.log("📂 Reading global-outreach-db.md...");

  const filePath = new URL("../global-outreach-db.md", import.meta.url).pathname;
  const content = await Deno.readTextFile(filePath);

  const contacts = parseOutreachDb(content);

  console.log(`\n📊 Parsed ${contacts.length} total entries`);

  // Separate by email availability
  const withEmail = contacts.filter((c) => c.email);
  const withoutEmail = contacts.filter((c) => !c.email);

  console.log(`  ✅ With email: ${withEmail.length}`);
  console.log(`  ⚠️  Without email (website contact form): ${withoutEmail.length}`);

  // Stats by type
  const mfgCount = contacts.filter((c) => c.contactType === "manufacturer").length;
  const buyerCount = contacts.filter((c) => c.contactType === "buyer").length;
  console.log(`  🏭 Manufacturers: ${mfgCount}`);
  console.log(`  🛒 Buyers: ${buyerCount}`);

  // Stats by industry
  const industries: Record<string, number> = {};
  for (const c of contacts) {
    const industry = c.section || "Other";
    industries[industry] = (industries[industry] || 0) + 1;
  }
  console.log("\n📋 By Industry:");
  for (const [industry, count] of Object.entries(industries)) {
    console.log(`  ${industry}: ${count}`);
  }

  if (isDryRun) {
    console.log("\n🔍 DRY RUN — Sample entries with emails:");
    for (const c of withEmail.slice(0, 10)) {
      console.log(`  ${c.company} (${c.contactType}, ${c.country}) → ${c.email} [${c.tags.join(", ")}]`);
    }
    console.log("\n🔍 DRY RUN — No database changes made.");
    return;
  }

  // Connect to Supabase
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceKey) {
    console.error("❌ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
    Deno.exit(1);
  }

  const sbAdmin = createClient(supabaseUrl, serviceKey);

  let imported = 0;
  let skipped = 0;
  let errors = 0;

  // Import all contacts (with and without email)
  for (const contact of contacts) {
    // For contacts without email, create a discoverable placeholder
    const email = contact.email ||
      `outreach-${contact.company.replace(/[^a-zA-Z0-9]/g, "").toLowerCase().substring(0, 40)}@whistle.pending`;

    const { error } = await sbAdmin
      .from("marketing_contacts")
      .upsert(
        {
          email,
          name: contact.koreanName || contact.company,
          company_name: contact.company,
          country: contact.country,
          language: contact.language,
          contact_type: contact.contactType,
          tags: contact.tags,
          source: "global-outreach-db",
          is_subscribed: !!contact.email, // Only subscribe contacts with real emails
        },
        { onConflict: "email" },
      );

    if (error) {
      console.error(`  ❌ ${contact.company}: ${error.message}`);
      errors++;
    } else {
      imported++;
    }
  }

  console.log(`\n✅ Import complete: ${imported} imported, ${skipped} skipped, ${errors} errors`);

  // Auto-enroll contacts with real emails into drip sequences
  if (shouldEnroll && withEmail.length > 0) {
    console.log("\n📧 Enrolling contacts into drip sequences...");

    const sequenceMap: Record<string, string> = {
      manufacturer_ko: "a1000000-0000-0000-0000-000000000001",
      manufacturer_en: "a2000000-0000-0000-0000-000000000002",
      buyer_en: "a3000000-0000-0000-0000-000000000003",
      buyer_ko: "a3000000-0000-0000-0000-000000000003",
    };

    let enrolled = 0;
    for (const contact of withEmail) {
      const key = `${contact.contactType}_${contact.language}`;
      const sequenceId = sequenceMap[key];
      if (!sequenceId) continue;

      // Get contact ID from DB
      const { data: dbContact } = await sbAdmin
        .from("marketing_contacts")
        .select("id")
        .eq("email", contact.email!)
        .single();

      if (!dbContact) continue;

      const { error } = await sbAdmin
        .from("drip_enrollments")
        .upsert(
          {
            contact_id: dbContact.id,
            sequence_id: sequenceId,
            current_step: 0,
            status: "active",
            next_send_at: new Date().toISOString(),
          },
          { onConflict: "contact_id,sequence_id" },
        );

      if (!error) enrolled++;
    }

    console.log(`  ✅ ${enrolled} contacts enrolled in drip sequences`);
  }
}

main().catch((e) => {
  console.error("Fatal error:", e);
  Deno.exit(1);
});
