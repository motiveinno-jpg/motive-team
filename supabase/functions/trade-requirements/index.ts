import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://whistle-ai.com",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/* 주요국 무역 환경 레퍼런스 — AI 프롬프트에 주입 */
const TRADE_CONTEXT: Record<string, string> = {
  US: "미국: FDA(식품/화장품/의약품), CPSC(소비재), FCC(전자기기), USDA(농산물). 수입관세 평균 3-5%. Sales Tax 주별 상이(0-10%). FSVP 대리인 필수(식품). MoCRA 2023 시행(화장품 시설등록 의무화). CBP 통관. Prior Notice(식품). 301조 추가관세(중국산 일부). Buy American Act(정부조달).",
  EU: "EU: CE 마킹 필수(전자/기계/완구). REACH(화학물질), RoHS(유해물질), WEEE(전자폐기물). CPNP(화장품). EFSA(식품안전). VAT 17-27%(국가별). EORI 번호 필수. Responsible Person(RP) EU 거주자 필수(화장품). 동물실험 금지. 알레르기 14종 의무표시(식품). 현지어 라벨 필수.",
  JP: "일본: PMDA(화장품/의약품), 후생노동성(식품위생법), PSE(전기용품), 기술적합마크(전파법). 소비세 10%. 제조판매업자 필수(화장품). 첨가물 양성목록제(Positive List). JAS 규격. 28종 알레르기 표시. 일본어 라벨/전성분 표시 의무. 소량 다빈도 주문 문화.",
  CN: "중국: NMPA(화장품-비안/허가), CCC(강제인증-전자/자동차), CIQ 검역, 해관(세관). 부가세 13%. 소비세 별도(사치품). 중국 대리인(RA) 필수. 중문 라벨 의무. 동물시험 면제 조건부(ISO 22716 GMP). CBEC(크로스보더 이커머스)로 NMPA 없이 진출 가능하나 일반수입이 장기 전략.",
  KR: "한국: 식약처(화장품/식품/의약품), KC인증(전기/전자/생활), 검역(농림축산), 관세청. 부가세 10%. FTA 19개국+. 화장품 전성분 표시. 기능성화장품 심사. 건강기능식품 인정. 전기용품 KC인증 필수. 원산지표시법.",
  IN: "인도: BIS 강제인증(전자/화학/식품), FSSAI(식품안전), CDSCO(의약품/화장품), WPC(무선기기). GST 5-28%. 수입허가(Import License) 필요 품목 다수. BIS ISI 마크 강제. 반덤핑 관세 주의. Hindi+English 라벨 권장. 복잡한 통관 절차.",
  BR: "브라질: ANVISA(위생감시-화장품/식품/의약품), INMETRO(산업표준-전자/완구), ANATEL(통신기기). ICMS(주간세) 12-25%. IPI(공산품세) 0-50%. 수입관세 높음(평균 14%). Portuguese 라벨 필수. 복잡한 세제. Nota Fiscal 전자세금계산서.",
  NG: "나이지리아: NAFDAC(식약청), SON(표준기구), NCC(통신위). 부가세 7.5%. ECOWAS 공동관세. 수입금지품목 다수. 사전검사(SONCAP) 필수. 외환 규제. 라고스항 통관 병목. 서아프리카 허브.",
  ZA: "남아공: SAHPRA(보건제품), NRCS(국가표준적합), ICASA(통신). VAT 15%. SADC FTA. LOA(Letter of Authority) 필수. 영문 라벨. 남부아프리카 관세동맹(SACU).",
  AE: "UAE: ECAS/EmiratesQM(적합성평가), ESMA(표준), DM(두바이시청-식품), TRA(통신). VAT 5%. 관세 5%(대부분). 할랄 인증 중요(식품/화장품). 아랍어 라벨 의무. 재수출 허브(중동/아프리카). 자유무역지대(FTZ) 활용 가능.",
  VN: "베트남: MOH(보건부-화장품/식품), STAMEQ(표준), MIC(정보통신). VAT 10%. 한-베트남 FTA/RCEP/한-ASEAN FTA 적용. 베트남어 라벨. 화장품 신고제. 식품 수입허가 필요.",
  SG: "싱가포르: HSA(보건과학청), SFA(식품청), IMDA(정보통신). GST 9%. 관세 거의 0%(자유무역항). ASEAN 화장품 지침 적용. 영문 라벨 OK. 동남아 진출 거점.",
  AU: "호주: TGA(치료용품청), ACCC(소비자보호), AICIS(화학물질), ACMA(통신). GST 10%. 검역 매우 엄격(BICON). 영문 라벨. 한-호주 FTA(KAFTA). 뉴질랜드와 CER(공동시장).",
  GB: "영국: MHRA(의약품/의료기기), OPSS(제품안전), UKCA마킹(CE 대체). VAT 20%. Brexit 후 독립 규제. SCPN(화장품 등록). Responsible Person UK 거주자 필수.",
  MX: "멕시코: COFEPRIS(위생허가), NOM(멕시코표준), IFT(통신). IVA 16%. 수입관세 평균 13%. Spanish 라벨 필수. USMCA(미국-멕시코-캐나다 협정). Pedimento(통관신고서).",
  TH: "태국: Thai FDA(อย.), TISI(공업규격), NBTC(통신). VAT 7%. 한-ASEAN FTA/RCEP. Thai 라벨 의무. 화장품 신고제(ASEAN 지침). 할랄 중요(남부 무슬림).",
  ID: "인도네시아: BPOM(식약청), SNI(국가표준-강제), SDPPI(통신). VAT 11%. API/NPIK(수입허가). Indonesian 라벨 의무. 할랄 인증 2024년부터 강제(식품/화장품). LPPOM MUI.",
  RU: "러시아: EAC(유라시아적합인증-EAEU 공동), Roszdravnadzor(의약품). VAT 20%. EAEU 관세동맹(러시아/벨라루스/카자흐스탄/아르메니아/키르기스스탄). Russian 라벨 필수. 현재 제재 상황 확인 필요.",
  TR: "터키: TSE(터키표준), TITCK(의약품/화장품), BTK(통신). VAT 20%. 한-터키 FTA. 터키어 라벨 필수. 적합성 인증(G마크). EU 관세동맹 회원(공산품).",
  SA: "사우디: SASO(사우디표준), SFDA(식약청), CITC(통신). VAT 15%. GCC 관세동맹 5%. 할랄 필수. SABER 플랫폼(적합성 인증). 아랍어 라벨 의무. 히즈리력 유통기한 표시.",
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
    const sbUrl = Deno.env.get("SUPABASE_URL")!;
    const sbServiceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sbAdmin = createClient(sbUrl, sbServiceRole);

    // Extract and validate user from JWT
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userErr } = await sbAdmin.auth.getUser(token);
    if (!user || userErr) {
      return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Create user-scoped client for RLS operations
    const sbAnon = Deno.env.get("CUSTOM_ANON_KEY") || Deno.env.get("SUPABASE_ANON_KEY")!;
    const sb = createClient(sbUrl, sbAnon, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      origin_country,
      dest_country,
      category,
      hs_code = "",
      product_name = "",
    } = await req.json();

    if (!origin_country || !dest_country) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "출발국(origin_country)과 도착국(dest_country)을 입력하세요",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "API 키가 설정되지 않았습니다.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const originCtx = TRADE_CONTEXT[origin_country] || "";
    const destCtx = TRADE_CONTEXT[dest_country] || "";

    const prompt = `You are an international trade expert. Analyze trade requirements for this route. Be concise but practical.

TRADE: ${origin_country} → ${dest_country} | Category: ${category || "General"} | HS: ${hs_code || "N/A"} | Product: ${product_name || "N/A"}
${originCtx ? "ORIGIN: " + originCtx : ""}
${destCtx ? "DEST: " + destCtx : ""}

Return ONLY valid JSON (no markdown, no code fences). Keep string values short and specific.
{
  "trade_route":{"origin":"${origin_country}","dest":"${dest_country}","category":"${category || "General"}","feasibility":"easy|moderate|complex","timeline":"total weeks"},
  "origin_reqs":{
    "export_license":{"required":false,"agency":"name","url":"url","cost":"$X","timeline":"days"},
    "certificates":[{"name":"cert name","agency":"agency","url":"url","cost":"$X~$Y","timeline":"weeks","mandatory":true}],
    "inspection":{"required":false,"agency":"","cost":"$0"}
  },
  "dest_reqs":{
    "import_license":{"required":false,"agency":"name","url":"url","cost":"$X","timeline":"days"},
    "certifications":[{"name":"cert","agency":"agency","url":"url","cost":"$X~$Y","timeline":"weeks","mandatory":true}],
    "customs":{"duty_rate":"X%","vat":"X%","other_tax":"","fta":"FTA name or null","fta_rate":"X%"},
    "labeling":{"language":"required lang","items":["item1","item2"]},
    "quarantine":{"required":false,"agency":"","notes":""}
  },
  "documents":[{"name":"doc name","by":"exporter|importer|forwarder","notes":""}],
  "logistics":{"mode":"sea|air","sea_days":"X","air_days":"X","ports":{"origin":["port"],"dest":["port"]},"freight_sea_20ft":"$X~$Y","freight_air_kg":"$X~$Y"},
  "risks":[{"level":"critical|warning|info","title":"short title","detail":"brief explanation"}],
  "cost_summary":{"cert_total":"$X~$Y","duty_pct":"X%","tax_pct":"X%","freight":"$X~$Y","total_extra_pct":"X%"},
  "action_checklist":[{"step":1,"action":"what to do","timeline":"duration","by":"who"}]
}
All costs in USD. Use realistic estimates with (est.) if uncertain. Never say "check with..." — give the most likely answer.`;

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 4000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("Anthropic API error:", resp.status, errText);
      return new Response(
        JSON.stringify({
          ok: false,
          error: `AI API 오류 (${resp.status}): ${errText.substring(0, 300)}`,
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const aiResp = await resp.json();
    const text = aiResp.content?.[0]?.text || "";

    let result;
    try {
      /* strip markdown code fences if present */
      let cleaned = text;
      if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```[a-z]*\n?/i, "");
      }
      if (cleaned.trimEnd().endsWith("```")) {
        cleaned = cleaned.replace(/\n?```\s*$/, "");
      }
      cleaned = cleaned.trim();

      /* Check stop reason — if max_tokens, response is truncated */
      const stopReason = aiResp.stop_reason || "";
      console.log("AI response length:", text.length, "stop_reason:", stopReason);

      if (stopReason === "max_tokens") {
        /* Try to close truncated JSON by adding missing braces */
        let openBraces = 0;
        let openBrackets = 0;
        let inString = false;
        let escape = false;
        for (const ch of cleaned) {
          if (escape) { escape = false; continue; }
          if (ch === "\\") { escape = true; continue; }
          if (ch === '"') { inString = !inString; continue; }
          if (inString) continue;
          if (ch === "{") openBraces++;
          if (ch === "}") openBraces--;
          if (ch === "[") openBrackets++;
          if (ch === "]") openBrackets--;
        }
        while (openBrackets > 0) { cleaned += "]"; openBrackets--; }
        while (openBraces > 0) { cleaned += "}"; openBraces--; }
      }

      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("JSON not found in response");
      }
    } catch (parseErr) {
      console.error("JSON parse error:", parseErr, "Raw length:", text.length, "First 300:", text.substring(0, 300));
      return new Response(
        JSON.stringify({
          ok: false,
          error: "AI 응답 파싱 실패",
          raw: text.substring(0, 500),
          rawLen: text.length,
          stopReason: aiResp.stop_reason || "unknown",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(JSON.stringify({ ok: true, result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("trade-requirements error:", err);
    return new Response(
      JSON.stringify({ ok: false, error: err.message || "서버 오류" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
