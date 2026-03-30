import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const WHISTLE_BUYER_URL = "https://whistle-ai.com/buyer";
const WHISTLE_BUYER_APP_URL = "https://whistle-ai.com/app/buyer";

function redirectTo(url: string): Response {
  return new Response(null, {
    status: 302,
    headers: { Location: url },
  });
}

function errorRedirect(reason: string): Response {
  return redirectTo(`${WHISTLE_BUYER_URL}?error=${encodeURIComponent(reason)}`);
}

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return errorRedirect("missing_token");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sbAdmin = createClient(supabaseUrl, serviceKey);

    // --- Step 1: Look up outreach event by magic_token ---
    const { data: event, error: eventErr } = await sbAdmin
      .from("bl_outreach_events")
      .select("id, campaign_id, lead_id, email_to, status, deal_id")
      .eq("magic_token", token)
      .single();

    if (eventErr || !event) {
      console.error("Magic token not found:", token, eventErr?.message);
      return errorRedirect("invalid_token");
    }

    // --- Step 2: If already has a deal, redirect to it (idempotent) ---
    if (event.deal_id) {
      const { data: linkData } = await sbAdmin.auth.admin.generateLink({
        type: "magiclink",
        email: event.email_to,
        options: {
          redirectTo: `${WHISTLE_BUYER_APP_URL}#deal/${event.deal_id}`,
        },
      });

      if (linkData?.properties?.action_link) {
        return redirectTo(linkData.properties.action_link);
      }

      return redirectTo(`${WHISTLE_BUYER_APP_URL}#deal/${event.deal_id}`);
    }

    // --- Step 3: Update event to clicked ---
    await sbAdmin
      .from("bl_outreach_events")
      .update({
        status: "clicked",
        clicked_at: new Date().toISOString(),
      })
      .eq("id", event.id);

    // --- Step 4: Get campaign info ---
    const { data: campaign, error: campaignErr } = await sbAdmin
      .from("bl_outreach_campaigns")
      .select("manufacturer_id, product_name, hs_code, product_image_url, fob_price, moq, custom_message")
      .eq("id", event.campaign_id)
      .single();

    if (campaignErr || !campaign) {
      console.error("Campaign not found:", event.campaign_id, campaignErr?.message);
      return errorRedirect("outreach_failed");
    }

    // --- Step 5: Get buyer lead info ---
    const { data: lead, error: leadErr } = await sbAdmin
      .from("bl_buyer_leads")
      .select("id, company_name, country_code, contact_email, contact_name")
      .eq("id", event.lead_id)
      .single();

    if (leadErr || !lead) {
      console.error("Lead not found:", event.lead_id, leadErr?.message);
      return errorRedirect("outreach_failed");
    }

    // --- Step 6: Find or create buyer auth user ---
    let buyerUserId: string | null = null;
    let isNewUser = false;

    // Check if auth user exists with this email
    const { data: existingUsers } = await sbAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === lead.contact_email.toLowerCase(),
    );

    if (existingUser) {
      buyerUserId = existingUser.id;
    } else {
      // Create new auth user
      const { data: newUser, error: createErr } = await sbAdmin.auth.admin.createUser({
        email: lead.contact_email,
        email_confirm: true,
        user_metadata: {
          role: "buyer",
          source: "bl_outreach",
          company_name: lead.company_name,
          country: lead.country_code,
        },
      });

      if (createErr || !newUser?.user) {
        console.error("Failed to create user:", createErr?.message);
        return errorRedirect("outreach_failed");
      }

      buyerUserId = newUser.user.id;
      isNewUser = true;

      // Insert into users table
      const { error: insertErr } = await sbAdmin.from("users").insert({
        id: buyerUserId,
        email: lead.contact_email,
        role: "buyer",
        company_name: lead.company_name || null,
        country: lead.country_code || null,
        display_name: lead.contact_name || lead.company_name || null,
        onboarding_completed: false,
        source: "bl_outreach",
      });

      if (insertErr) {
        // User row may already exist from a trigger; log but don't fail
        console.error("Insert users row warning:", insertErr.message);
      }

      // Update event with registration
      await sbAdmin
        .from("bl_outreach_events")
        .update({
          status: "registered",
          registered_at: new Date().toISOString(),
        })
        .eq("id", event.id);
    }

    // --- Step 7: Get manufacturer info ---
    const { data: manufacturer } = await sbAdmin
      .from("users")
      .select("company_name")
      .eq("id", campaign.manufacturer_id)
      .single();

    const manufacturerName = manufacturer?.company_name || "Manufacturer";

    // --- Step 8: Create deal ---
    const { data: deal, error: dealErr } = await sbAdmin
      .from("deals")
      .insert({
        seller_id: campaign.manufacturer_id,
        buyer_id: buyerUserId,
        title: campaign.product_name,
        status: "active",
        stage: "inquiry",
        source: "bl_outreach",
        hs_code: campaign.hs_code,
        product_image_url: campaign.product_image_url || null,
        fob_price: campaign.fob_price || null,
        moq: campaign.moq || null,
      })
      .select("id")
      .single();

    if (dealErr || !deal) {
      console.error("Failed to create deal:", dealErr?.message);
      return errorRedirect("outreach_failed");
    }

    // --- Step 9: Create initial chat message ---
    try {
      await sbAdmin.from("deal_messages").insert({
        deal_id: deal.id,
        sender_id: campaign.manufacturer_id,
        message: `${manufacturerName} has invited you to discuss ${campaign.product_name}.`,
        type: "system",
      });
    } catch (chatErr: unknown) {
      // Non-critical; log but continue
      const msg = chatErr instanceof Error ? chatErr.message : String(chatErr);
      console.error("Chat message insert warning:", msg);
    }

    // --- Step 10: Update event with deal info ---
    await sbAdmin
      .from("bl_outreach_events")
      .update({
        deal_id: deal.id,
        status: "deal_started",
        deal_started_at: new Date().toISOString(),
      })
      .eq("id", event.id);

    // --- Step 11: Update campaign counters ---
    if (isNewUser) {
      await sbAdmin.rpc("increment_campaign_counter", {
        p_campaign_id: event.campaign_id,
        p_field: "registered_count",
      }).catch(() => {
        // Fallback: direct update if RPC doesn't exist
        sbAdmin
          .from("bl_outreach_campaigns")
          .update({ registered_count: (campaign as Record<string, number>).registered_count + 1 })
          .eq("id", event.campaign_id);
      });
    }

    await sbAdmin.rpc("increment_campaign_counter", {
      p_campaign_id: event.campaign_id,
      p_field: "deal_started_count",
    }).catch(() => {
      // Fallback: direct SQL increment not possible via client; skip
      console.error("increment_campaign_counter RPC not available, skipping counter update");
    });

    // --- Step 12: Generate magic link and redirect ---
    const { data: linkData, error: linkErr } = await sbAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: lead.contact_email,
      options: {
        redirectTo: `${WHISTLE_BUYER_APP_URL}#deal/${deal.id}`,
      },
    });

    if (linkErr || !linkData?.properties?.action_link) {
      console.error("Failed to generate magic link:", linkErr?.message);
      // Fallback: redirect to buyer app with deal context (user will need to log in)
      return redirectTo(`${WHISTLE_BUYER_APP_URL}?deal=${deal.id}&email=${encodeURIComponent(lead.contact_email)}`);
    }

    return redirectTo(linkData.properties.action_link);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("bl-handle-magic-link error:", msg);
    return errorRedirect("outreach_failed");
  }
});
