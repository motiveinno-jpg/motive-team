import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://whistle-ai.com",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BATCH_SIZE = 20;
const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 1536;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const headers = { ...corsHeaders, "Content-Type": "application/json" };

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ ok: false, error: "Unauthorized" }),
        { status: 401, headers },
      );
    }

    const sbUrl = Deno.env.get("SUPABASE_URL")!;
    const sbServiceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    const sbAdmin = createClient(sbUrl, sbServiceRole);

    // Verify admin
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userErr,
    } = await sbAdmin.auth.getUser(token);
    if (!user || userErr) {
      return new Response(
        JSON.stringify({ ok: false, error: "Unauthorized" }),
        { status: 401, headers },
      );
    }

    const { data: profile } = await sbAdmin
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    if (!profile || profile.role !== "admin") {
      return new Response(
        JSON.stringify({ ok: false, error: "Admin access required" }),
        { status: 403, headers },
      );
    }

    if (!openaiKey) {
      return new Response(
        JSON.stringify({ ok: false, error: "OpenAI API key not configured" }),
        { status: 500, headers },
      );
    }

    // Fetch entries without embeddings
    const { data: entries, error: fetchErr } = await sbAdmin
      .from("customs_knowledge")
      .select("id, title, content, category")
      .is("embedding", null)
      .limit(BATCH_SIZE);

    if (fetchErr) {
      return new Response(
        JSON.stringify({ ok: false, error: fetchErr.message }),
        { status: 500, headers },
      );
    }

    if (!entries || entries.length === 0) {
      return new Response(
        JSON.stringify({
          ok: true,
          message: "All entries already have embeddings",
          processed: 0,
        }),
        { status: 200, headers },
      );
    }

    // Generate embeddings via OpenAI
    const texts = entries.map(
      (e) => `${e.title}\n[${e.category}]\n${e.content}`,
    );

    const embResp = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: texts,
        dimensions: EMBEDDING_DIMENSIONS,
      }),
    });

    if (!embResp.ok) {
      const errText = await embResp.text();
      console.error("OpenAI embedding error:", embResp.status, errText);
      return new Response(
        JSON.stringify({
          ok: false,
          error: `Embedding API error (${embResp.status})`,
        }),
        { status: 502, headers },
      );
    }

    const embData = await embResp.json();
    const embeddings = embData.data as Array<{
      embedding: number[];
      index: number;
    }>;

    // Update each entry with its embedding
    let updated = 0;
    for (const emb of embeddings) {
      const entry = entries[emb.index];
      const { error: updErr } = await sbAdmin
        .from("customs_knowledge")
        .update({
          embedding: JSON.stringify(emb.embedding),
          updated_at: new Date().toISOString(),
        })
        .eq("id", entry.id);

      if (updErr) {
        console.error(`Failed to update ${entry.id}:`, updErr);
      } else {
        updated++;
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        message: `Generated embeddings for ${updated}/${entries.length} entries`,
        processed: updated,
        total_entries: entries.length,
        model: EMBEDDING_MODEL,
      }),
      { status: 200, headers },
    );
  } catch (err) {
    console.error("generate-embeddings error:", err);
    return new Response(
      JSON.stringify({ ok: false, error: "Server error" }),
      { status: 500, headers },
    );
  }
});
