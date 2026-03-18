import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// This function was a one-time setup utility.
// Disabled in production to prevent unauthorized webhook/price creation.
serve((_req) => {
  return new Response(
    JSON.stringify({ error: "This setup endpoint is disabled in production." }),
    { status: 403, headers: { "Content-Type": "application/json" } },
  );
});
