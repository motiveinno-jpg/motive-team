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
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };
}

const EXCHANGE_API_URL = "https://open.er-api.com/v6/latest/USD";
const CACHE_TTL_HOURS = 6;

const TARGET_CURRENCIES = [
  "KRW", "EUR", "JPY", "CNY", "GBP", "THB", "VND", "INR",
  "BRL", "MXN", "AED", "SGD", "AUD", "CAD", "TWD",
  "CHF", "CZK", "DKK", "HKD", "HUF", "IDR", "ILS",
  "MYR", "NOK", "NZD", "PHP", "PLN", "SEK", "TRY", "ZAR",
  "SAR", "PKR", "BDT", "NGN", "EGP", "COP", "CLP", "ARS",
];

let _corsHeaders: Record<string, string> = getCorsHeaders();

serve(async (req: Request) => {
  _corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: _corsHeaders });
  }

  try {
    const sbUrl = Deno.env.get("SUPABASE_URL")!;
    const sbServiceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sbAdmin = createClient(sbUrl, sbServiceRole);

    if (req.method === "POST") {
      // Check if body is empty — treat as GET (rate fetch)
      const contentLength = req.headers.get("content-length");
      if (!contentLength || contentLength === "0") {
        return await handleGetRates(sbAdmin);
      }
      return await handleConvert(req, sbAdmin);
    }

    return await handleGetRates(sbAdmin);
  } catch (err) {
    console.error("[exchange-rates] Unhandled error:", err);
    return jsonResponse(
      { error: { code: "INTERNAL_ERROR", message: "Internal server error" } },
      500,
    );
  }
});

/* ─── GET: Return current exchange rates ─── */

async function handleGetRates(
  sbAdmin: ReturnType<typeof createClient>,
): Promise<Response> {
  const cached = await getCachedRates(sbAdmin);

  if (cached) {
    // Sync cached rates to exchange_rates table (async, non-blocking)
    syncToExchangeRates(sbAdmin, cached.rates);
    return jsonResponse({
      base: "USD",
      rates: cached.rates,
      updated_at: cached.fetched_at,
      cached: true,
    });
  }

  const freshRates = await fetchFreshRates();

  if (!freshRates) {
    return jsonResponse(
      { error: { code: "EXCHANGE_API_UNAVAILABLE", message: "Unable to fetch exchange rates" } },
      503,
    );
  }

  await cacheRates(sbAdmin, freshRates);

  return jsonResponse({
    base: "USD",
    rates: freshRates,
    updated_at: new Date().toISOString(),
    cached: false,
  });
}

/* ─── POST: Convert amount between currencies ─── */

async function handleConvert(
  req: Request,
  sbAdmin: ReturnType<typeof createClient>,
): Promise<Response> {
  let body: { from?: string; to?: string; amount?: number };

  try {
    body = await req.json();
  } catch {
    return jsonResponse(
      { error: { code: "INVALID_JSON", message: "Request body is not valid JSON" } },
      400,
    );
  }

  const from = (body.from || "USD").toUpperCase();
  const to = (body.to || "KRW").toUpperCase();
  const amount = Number(body.amount);

  if (!amount || amount <= 0) {
    return jsonResponse(
      { error: { code: "INVALID_AMOUNT", message: "A valid amount is required" } },
      400,
    );
  }

  const rates = await getOrFetchRates(sbAdmin);

  if (!rates) {
    return jsonResponse(
      { error: { code: "EXCHANGE_API_UNAVAILABLE", message: "Unable to fetch exchange rates" } },
      503,
    );
  }

  const fromRate = from === "USD" ? 1 : rates[from];
  const toRate = to === "USD" ? 1 : rates[to];

  if (!fromRate) {
    return jsonResponse(
      { error: { code: "UNSUPPORTED_CURRENCY", message: `Unsupported currency: ${from}` } },
      400,
    );
  }

  if (!toRate) {
    return jsonResponse(
      { error: { code: "UNSUPPORTED_CURRENCY", message: `Unsupported currency: ${to}` } },
      400,
    );
  }

  const amountInUsd = amount / fromRate;
  const convertedAmount = Math.round(amountInUsd * toRate * 100) / 100;

  return jsonResponse({
    from,
    to,
    amount,
    converted: convertedAmount,
    rate: Math.round((toRate / fromRate) * 1000000) / 1000000,
    updated_at: new Date().toISOString(),
  });
}

/* ─── Cache helpers ─── */

async function getCachedRates(
  sbAdmin: ReturnType<typeof createClient>,
): Promise<{ rates: Record<string, number>; fetched_at: string } | null> {
  const { data } = await sbAdmin
    .from("exchange_rates_cache")
    .select("rates, fetched_at")
    .eq("base_currency", "USD")
    .gt("expires_at", new Date().toISOString())
    .order("fetched_at", { ascending: false })
    .limit(1)
    .single();

  if (!data) return null;

  return { rates: data.rates, fetched_at: data.fetched_at };
}

async function cacheRates(
  sbAdmin: ReturnType<typeof createClient>,
  rates: Record<string, number>,
): Promise<void> {
  const expiresAt = new Date(Date.now() + CACHE_TTL_HOURS * 60 * 60 * 1000).toISOString();
  const now = new Date().toISOString();

  await sbAdmin
    .from("exchange_rates_cache")
    .insert({
      base_currency: "USD",
      rates,
      fetched_at: now,
      expires_at: expiresAt,
    });

  // Also sync to exchange_rates table
  await syncToExchangeRates(sbAdmin, rates);
}

async function getOrFetchRates(
  sbAdmin: ReturnType<typeof createClient>,
): Promise<Record<string, number> | null> {
  const cached = await getCachedRates(sbAdmin);
  if (cached) return cached.rates;

  const freshRates = await fetchFreshRates();
  if (!freshRates) return null;

  await cacheRates(sbAdmin, freshRates);
  return freshRates;
}

/* ─── External API fetch ─── */

async function fetchFreshRates(): Promise<Record<string, number> | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const resp = await fetch(EXCHANGE_API_URL, {
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (!resp.ok) {
      console.error("[exchange-rates] API error:", resp.status);
      return null;
    }

    const json = await resp.json();

    if (json.result !== "success" || !json.rates) {
      console.error("[exchange-rates] Unexpected API response shape");
      return null;
    }

    const filteredRates: Record<string, number> = {};

    for (const currency of TARGET_CURRENCIES) {
      const rate = json.rates[currency];
      if (typeof rate === "number") {
        filteredRates[currency] = rate;
      }
    }

    return filteredRates;
  } catch (err) {
    console.error("[exchange-rates] Fetch failed:", err);
    return null;
  }
}

/* ─── Sync to exchange_rates table ─── */

async function syncToExchangeRates(
  sbAdmin: ReturnType<typeof createClient>,
  rates: Record<string, number>,
): Promise<void> {
  const now = new Date().toISOString();
  const upserts = Object.entries(rates).map(([code, rate]) => ({
    currency_code: code,
    rate_to_usd: rate,
    source: "er-api",
    updated_at: now,
  }));

  if (upserts.length) {
    const { error } = await sbAdmin
      .from("exchange_rates")
      .upsert(upserts, { onConflict: "currency_code" });
    if (error) console.error("[exchange-rates] sync failed:", error.message);
  }
}

/* ─── Response helper ─── */

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ..._corsHeaders, "Content-Type": "application/json" },
  });
}
