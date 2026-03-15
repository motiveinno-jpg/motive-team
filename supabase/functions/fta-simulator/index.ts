import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://whistle-ai.com",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/* 한국 FTA 현황 (21개) — 국가코드 → 적용 FTA */
const COUNTRY_FTA: Record<string, string[]> = {
  US: ["한-미 FTA (KORUS)"],
  JP: ["RCEP"],
  CN: ["한-중 FTA", "RCEP"],
  DE: ["한-EU FTA"],
  FR: ["한-EU FTA"],
  IT: ["한-EU FTA"],
  NL: ["한-EU FTA"],
  ES: ["한-EU FTA"],
  GB: ["한-영 FTA"],
  VN: ["한-ASEAN FTA", "한-베트남 FTA", "RCEP"],
  SG: ["한-싱가포르 FTA", "한-ASEAN FTA", "RCEP"],
  AU: ["한-호주 FTA", "RCEP"],
  CA: ["한-캐나다 FTA"],
  IN: ["한-인도 CEPA"],
  ID: ["한-인니 CEPA", "한-ASEAN FTA", "RCEP"],
  TH: ["한-ASEAN FTA", "RCEP"],
  MY: ["한-ASEAN FTA", "RCEP"],
  PH: ["한-ASEAN FTA", "RCEP"],
  NZ: ["한-뉴질랜드 FTA", "RCEP"],
  CL: ["한-칠레 FTA"],
  PE: ["한-페루 FTA"],
  CO: ["한-콜롬비아 FTA"],
  TR: ["한-터키 FTA"],
  IL: ["한-이스라엘 FTA"],
  KH: ["한-캄보디아 FTA", "RCEP"],
  NO: ["한-EFTA FTA"],
  CH: ["한-EFTA FTA"],
  IS: ["한-EFTA FTA"],
  AE: ["한-GCC FTA (협상중)"],
  SA: ["한-GCC FTA (협상중)"],
  MX: ["없음 (CPTPP 미가입)"],
  BR: ["없음"],
};

const COUNTRY_NAMES: Record<string, string> = {
  US: "미국", JP: "일본", CN: "중국", DE: "독일(EU)", FR: "프랑스(EU)",
  GB: "영국", VN: "베트남", SG: "싱가포르", AU: "호주", CA: "캐나다",
  IN: "인도", ID: "인도네시아", TH: "태국", MY: "말레이시아", PH: "필리핀",
  NZ: "뉴질랜드", CL: "칠레", PE: "페루", CO: "콜롬비아", TR: "터키",
  IL: "이스라엘", KH: "캄보디아", AE: "UAE", SA: "사우디", MX: "멕시코", BR: "브라질",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await sb.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const { hs_code, destination, destinations } = body;

    if (!hs_code) {
      return new Response(
        JSON.stringify({ ok: false, error: "HS코드를 입력하세요" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) {
      return new Response(
        JSON.stringify({ ok: false, error: "API 키가 설정되지 않았습니다." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    /* 복수 시장 비교 */
    if (destinations && Array.isArray(destinations) && destinations.length > 0) {
      const results: Record<string, unknown> = {};

      /* 한 번의 AI 호출로 모든 시장 비교 */
      const destInfo = destinations.map((d: string) => {
        const ftas = COUNTRY_FTA[d] || ["확인 필요"];
        return `- ${d} (${COUNTRY_NAMES[d] || d}): 적용 가능 FTA = ${ftas.join(", ")}`;
      }).join("\n");

      const prompt = buildMultiPrompt(hs_code, destinations, destInfo);
      const aiResult = await callAI(anthropicKey, prompt);

      return new Response(
        JSON.stringify({ ok: true, results: aiResult }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    /* 단일 시장 */
    if (!destination) {
      return new Response(
        JSON.stringify({ ok: false, error: "수출 대상국을 선택하세요" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ftas = COUNTRY_FTA[destination] || ["확인 필요"];
    const countryName = COUNTRY_NAMES[destination] || destination;

    const prompt = buildSinglePrompt(hs_code, destination, countryName, ftas);
    const result = await callAI(anthropicKey, prompt);

    return new Response(
      JSON.stringify({ ok: true, result }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("fta-simulator error:", err);
    return new Response(
      JSON.stringify({ ok: false, error: err.message || "서버 오류" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function buildSinglePrompt(hsCode: string, dest: string, countryName: string, ftas: string[]): string {
  return `당신은 FTA 관세 전문가입니다. 아래 HS코드의 ${countryName} 수출 시 관세 정보를 분석하세요.

## 입력
- HS코드: ${hsCode}
- 수출 대상국: ${dest} (${countryName})
- 적용 가능 FTA: ${ftas.join(", ")}

## 응답 (반드시 JSON)
{
  "destination": "${countryName}",
  "destination_code": "${dest}",
  "hs_code": "${hsCode}",
  "hs_description": "해당 HS코드 품명 (한글)",
  "mfn_rate": "MFN 관세율 (예: 6.5%)",
  "applicable_ftas": [
    {
      "fta_name": "FTA명",
      "pref_rate": "특혜관세율 (예: 0%)",
      "savings_pct": "절감률 (예: 6.5%p)",
      "origin_criteria": "원산지 기준 (예: CTH, RVC 40% 등)",
      "required_docs": ["원산지증명서(C/O)", "원산지소명서"],
      "notes": "특이사항"
    }
  ],
  "best_fta": "최적 FTA명",
  "best_rate": "최적 세율",
  "non_tariff_barriers": ["인증/검역/라벨링 등 비관세 장벽"],
  "import_vat": "수입국 부가세율",
  "total_import_cost_pct": "총 수입비용률 (관세+VAT 합산)",
  "recommendation": "종합 추천사항 (2~3문장)"
}

관세율은 해당 HS코드 기준 실제 관세율에 최대한 가깝게 추정하세요.
JSON만 출력하세요.`;
}

function buildMultiPrompt(hsCode: string, destinations: string[], destInfo: string): string {
  return `당신은 FTA 관세 전문가입니다. 아래 HS코드의 복수 시장 관세를 비교 분석하세요.

## 입력
- HS코드: ${hsCode}
- 비교 대상국:
${destInfo}

## 응답 (반드시 JSON — 배열)
[
  {
    "destination": "국가명",
    "destination_code": "국가코드",
    "mfn_rate": "MFN 관세율",
    "best_fta": "최적 FTA명 또는 null",
    "best_rate": "최적 세율",
    "savings": "절감액 (USD 10,000 기준)",
    "import_vat": "수입국 부가세",
    "total_cost_pct": "총 수입비용률",
    "rank": 1,
    "recommendation": "한줄 추천"
  }
]

국가별로 배열 원소를 만들고, rank는 총 비용이 낮은 순서로 1부터 매기세요.
관세율은 해당 HS코드 기준 실제 관세율에 최대한 가깝게 추정하세요.
JSON 배열만 출력하세요.`;
}

async function callAI(apiKey: string, prompt: string) {
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 3000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    console.error("Anthropic API error:", resp.status, errText);
    throw new Error(`AI API 오류 (${resp.status})`);
  }

  const aiResp = await resp.json();
  const text = aiResp.content?.[0]?.text || "";

  /* JSON 추출 */
  const jsonMatch = text.match(/[\[{][\s\S]*[\]}]/);
  if (!jsonMatch) {
    throw new Error("AI 응답에서 JSON을 찾을 수 없습니다");
  }

  return JSON.parse(jsonMatch[0]);
}
