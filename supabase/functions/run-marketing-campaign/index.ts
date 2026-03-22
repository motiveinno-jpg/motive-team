import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "https://whistle-ai.com",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 5000;
const MAX_EMAILS_PER_HOUR = 50;

// ─── Types ────────────────────────────────────────────────

interface Campaign {
  id: string;
  name: string;
  campaign_type: string;
  template_type: string;
  subject_override: string | null;
  status: string;
  target_countries: string[];
  target_tags: string[];
  total_recipients: number;
  sent_count: number;
  failed_count: number;
}

interface MarketingContact {
  id: string;
  email: string;
  name: string | null;
  company_name: string | null;
  country: string | null;
  language: string;
  contact_type: string;
  tags: string[];
  is_subscribed: boolean;
}

// ─── Template Type Mapping ────────────────────────────────

const CAMPAIGN_TEMPLATE_MAP: Record<string, string> = {
  korean_mfg: "korean_manufacturer_intro",
  global_buyer: "global_buyer_intro",
  global_mfg: "global_manufacturer_intro",
  newsletter: "newsletter",
};

// ─── Helpers ──────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildContactFilter(
  campaign: Campaign,
): { contactType: string; countries: string[] | null; tags: string[] | null } {
  switch (campaign.campaign_type) {
    case "korean_mfg":
      return {
        contactType: "manufacturer",
        countries: ["KR"],
        tags: null,
      };
    case "global_buyer":
      return {
        contactType: "buyer",
        countries: campaign.target_countries.length > 0 ? campaign.target_countries : null,
        tags: campaign.target_tags.length > 0 ? campaign.target_tags : null,
      };
    case "global_mfg":
      return {
        contactType: "manufacturer",
        countries: campaign.target_countries.length > 0
          ? campaign.target_countries
          : ["US", "JP", "VN", "TH", "CN", "DE", "GB", "FR", "IN", "BR", "MX"],
        tags: null,
      };
    case "newsletter":
      return {
        contactType: campaign.target_tags?.includes("buyer") ? "buyer" : "manufacturer",
        countries: campaign.target_countries.length > 0 ? campaign.target_countries : null,
        tags: campaign.target_tags.length > 0 ? campaign.target_tags : null,
      };
    default:
      return {
        contactType: "manufacturer",
        countries: null,
        tags: campaign.target_tags.length > 0 ? campaign.target_tags : null,
      };
  }
}

async function fetchRecipients(
  sbAdmin: ReturnType<typeof createClient>,
  campaign: Campaign,
): Promise<MarketingContact[]> {
  const filter = buildContactFilter(campaign);

  let query = sbAdmin
    .from("marketing_contacts")
    .select("id, email, name, company_name, country, language, contact_type, tags, is_subscribed")
    .eq("contact_type", filter.contactType)
    .eq("is_subscribed", true);

  if (filter.countries) {
    query = query.in("country", filter.countries);
  }

  // Exclude contacts who already received this campaign
  const { data: alreadySent } = await sbAdmin
    .from("marketing_events")
    .select("to_email")
    .eq("campaign_id", campaign.id)
    .in("status", ["sent", "delivered", "opened", "clicked"]);

  const excludeEmails = new Set((alreadySent || []).map((e: { to_email: string }) => e.to_email));

  const { data: contacts, error } = await query.limit(MAX_EMAILS_PER_HOUR);

  if (error) {
    console.error("Failed to fetch recipients:", error.message);
    return [];
  }

  // Filter out already-sent and apply tag filter in code (Supabase array overlap is limited)
  return (contacts || []).filter((c: MarketingContact) => {
    if (excludeEmails.has(c.email)) return false;
    if (filter.tags && filter.tags.length > 0) {
      const hasTags = filter.tags.some((t) => c.tags?.includes(t));
      if (!hasTags) return false;
    }
    return true;
  });
}

// ─── Main Handler ─────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sbAdmin = createClient(supabaseUrl, serviceKey);

    // Auth: require service role key or internal secret
    const authHeader = req.headers.get("Authorization");
    const internalSecret = req.headers.get("X-Internal-Secret");
    const expectedSecret = Deno.env.get("INTERNAL_SERVICE_SECRET");

    const hasValidInternal = expectedSecret && internalSecret === expectedSecret;
    const hasServiceRole = authHeader && authHeader.replace("Bearer ", "") === serviceKey;

    if (!hasValidInternal && !hasServiceRole) {
      // Check if it's an admin user
      if (authHeader) {
        const token = authHeader.replace("Bearer ", "");
        const { data: { user }, error: authErr } = await sbAdmin.auth.getUser(token);
        if (authErr || !user) {
          return new Response(
            JSON.stringify({ error: { code: "UNAUTHORIZED", message: "Invalid token" } }),
            { status: 401, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
          );
        }
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
      } else {
        return new Response(
          JSON.stringify({ error: { code: "UNAUTHORIZED", message: "Authentication required" } }),
          { status: 401, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
        );
      }
    }

    const body = await req.json();
    const { campaign_id, campaign_type, dry_run = false } = body;

    // Resolve campaign — by ID or by type (find latest draft/scheduled)
    let campaign: Campaign | null = null;

    if (campaign_id) {
      const { data, error } = await sbAdmin
        .from("marketing_campaigns")
        .select("*")
        .eq("id", campaign_id)
        .single();
      if (error || !data) {
        return new Response(
          JSON.stringify({ error: { code: "NOT_FOUND", message: "Campaign not found" } }),
          { status: 404, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
        );
      }
      campaign = data as Campaign;
    } else if (campaign_type) {
      const { data, error } = await sbAdmin
        .from("marketing_campaigns")
        .select("*")
        .eq("campaign_type", campaign_type)
        .in("status", ["draft", "scheduled"])
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      if (error || !data) {
        return new Response(
          JSON.stringify({ error: { code: "NOT_FOUND", message: `No active campaign found for type: ${campaign_type}` } }),
          { status: 404, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
        );
      }
      campaign = data as Campaign;
    } else {
      return new Response(
        JSON.stringify({ error: { code: "VALIDATION_ERROR", message: "Either campaign_id or campaign_type is required" } }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    if (campaign.status === "completed") {
      return new Response(
        JSON.stringify({ error: { code: "CAMPAIGN_COMPLETED", message: "This campaign has already been completed" } }),
        { status: 409, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    // Fetch recipients
    const recipients = await fetchRecipients(sbAdmin, campaign);

    if (recipients.length === 0) {
      return new Response(
        JSON.stringify({
          data: {
            campaign_id: campaign.id,
            campaign_name: campaign.name,
            message: "No eligible recipients found",
            recipients_found: 0,
          },
        }),
        { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    // Dry run — return recipient list without sending
    if (dry_run) {
      return new Response(
        JSON.stringify({
          data: {
            campaign_id: campaign.id,
            campaign_name: campaign.name,
            dry_run: true,
            recipients_found: recipients.length,
            recipients: recipients.map((r) => ({
              email: r.email,
              name: r.name,
              company: r.company_name,
              country: r.country,
            })),
            template_type: campaign.template_type,
          },
        }),
        { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    // Update campaign to running
    await sbAdmin
      .from("marketing_campaigns")
      .update({
        status: "running",
        started_at: new Date().toISOString(),
        total_recipients: recipients.length,
        updated_at: new Date().toISOString(),
      })
      .eq("id", campaign.id);

    // Send in batches
    let sentCount = 0;
    let failedCount = 0;
    const sendEmailUrl = `${supabaseUrl}/functions/v1/send-marketing-email`;

    const batches: MarketingContact[][] = [];
    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      batches.push(recipients.slice(i, i + BATCH_SIZE));
    }

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];

      const batchPromises = batch.map(async (recipient) => {
        try {
          const response = await fetch(sendEmailUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${serviceKey}`,
            },
            body: JSON.stringify({
              to: recipient.email,
              template_type: campaign.template_type,
              campaign_id: campaign.id,
              contact_id: recipient.id,
              subject: campaign.subject_override || undefined,
            }),
          });

          if (response.ok) {
            sentCount++;
            return { email: recipient.email, status: "sent" };
          }

          const errBody = await response.text();
          console.error(`Failed to send to ${recipient.email}:`, response.status, errBody);
          failedCount++;
          return { email: recipient.email, status: "failed", error: errBody.substring(0, 200) };
        } catch (err) {
          console.error(`Error sending to ${recipient.email}:`, err instanceof Error ? err.message : String(err));
          failedCount++;
          return { email: recipient.email, status: "failed", error: err instanceof Error ? err.message : "Unknown error" };
        }
      });

      await Promise.all(batchPromises);

      // Update campaign progress after each batch
      await sbAdmin
        .from("marketing_campaigns")
        .update({
          sent_count: sentCount,
          failed_count: failedCount,
          updated_at: new Date().toISOString(),
        })
        .eq("id", campaign.id);

      // Delay between batches (skip after the last batch)
      const isLastBatch = batchIndex === batches.length - 1;
      if (!isLastBatch) {
        await sleep(BATCH_DELAY_MS);
      }
    }

    // Mark campaign as completed
    const finalStatus = failedCount === recipients.length ? "failed" : "completed";
    await sbAdmin
      .from("marketing_campaigns")
      .update({
        status: finalStatus,
        sent_count: sentCount,
        failed_count: failedCount,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", campaign.id);

    return new Response(
      JSON.stringify({
        data: {
          campaign_id: campaign.id,
          campaign_name: campaign.name,
          status: finalStatus,
          total_recipients: recipients.length,
          sent_count: sentCount,
          failed_count: failedCount,
          batches_processed: batches.length,
        },
      }),
      { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("run-marketing-campaign error:", e instanceof Error ? e.message : String(e));
    return new Response(
      JSON.stringify({ error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }
});
