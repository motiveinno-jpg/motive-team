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
  };
}

const VALID_DOC_TYPES = [
  "PI", "CI", "PL", "CO", "SC", "BL",
  "ED", "IC", "HC", "SLI", "ISF", "AMS",
  "INS", "LC",
] as const;

type DocType = typeof VALID_DOC_TYPES[number];

const VALID_LANGUAGES = ["en", "ko"] as const;

const PLACEHOLDER = "N/A";

function generateDocNumber(docType: string): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const rand = String(Math.floor(1000 + Math.random() * 9000));
  return `${docType}-${yyyy}${mm}${dd}-${rand}`;
}

interface DealData {
  deal: Record<string, unknown>;
  product: Record<string, unknown>;
  buyer: Record<string, unknown>;
  seller: Record<string, unknown>;
  sellerCompany: Record<string, unknown>;
}

function buildSeller(data: DealData): Record<string, unknown> {
  return {
    name: data.seller?.full_name ?? data.seller?.email ?? PLACEHOLDER,
    email: data.seller?.email ?? PLACEHOLDER,
    company: data.sellerCompany?.company_name ?? PLACEHOLDER,
    address: data.sellerCompany?.address ?? PLACEHOLDER,
    country: data.sellerCompany?.country ?? "KR",
    phone: data.sellerCompany?.phone ?? PLACEHOLDER,
    business_number: data.sellerCompany?.business_number ?? PLACEHOLDER,
  };
}

function buildBuyer(data: DealData): Record<string, unknown> {
  return {
    name: data.buyer?.company_name ?? data.buyer?.contact_name ?? PLACEHOLDER,
    contact: data.buyer?.contact_name ?? PLACEHOLDER,
    email: data.buyer?.email ?? PLACEHOLDER,
    address: data.buyer?.address ?? PLACEHOLDER,
    country: data.buyer?.country ?? PLACEHOLDER,
    phone: data.buyer?.phone ?? PLACEHOLDER,
  };
}

function buildItems(data: DealData): Record<string, unknown>[] {
  const p = data.product ?? {};
  const d = data.deal ?? {};
  return [
    {
      product_name: p.name ?? p.product_name ?? PLACEHOLDER,
      hs_code: p.hs_code ?? PLACEHOLDER,
      description: p.description ?? PLACEHOLDER,
      quantity: d.quantity ?? 1,
      unit: d.unit ?? "PCS",
      unit_price: d.unit_price ?? 0,
      amount: (Number(d.quantity) || 1) * (Number(d.unit_price) || 0),
      net_weight: p.net_weight ?? PLACEHOLDER,
      gross_weight: p.gross_weight ?? PLACEHOLDER,
      cbm: p.cbm ?? PLACEHOLDER,
      origin_country: p.origin_country ?? "KR",
    },
  ];
}

function generateContent(
  docType: DocType,
  data: DealData,
  docNumber: string,
  language: string,
): Record<string, unknown> {
  const seller = buildSeller(data);
  const buyer = buildBuyer(data);
  const items = buildItems(data);
  const deal = data.deal ?? {};
  const product = data.product ?? {};
  const generatedAt = new Date().toISOString();

  const base = { seller, buyer, items, generated_at: generatedAt };

  const tradeTerms = {
    incoterms: deal.incoterms ?? "FOB",
    payment_terms: deal.payment_terms ?? PLACEHOLDER,
    currency: deal.currency ?? "USD",
    total_amount: deal.total_amount ?? items[0]?.amount ?? 0,
  };

  switch (docType) {
    case "PI":
      return {
        ...base,
        doc_type: "Proforma Invoice",
        doc_number: docNumber,
        trade_terms: tradeTerms,
        valid_until: deal.valid_until ?? PLACEHOLDER,
        remarks: deal.remarks ?? "",
      };

    case "CI":
      return {
        ...base,
        doc_type: "Commercial Invoice",
        doc_number: docNumber,
        invoice_number: docNumber,
        trade_terms: tradeTerms,
        shipment_ref: deal.shipment_ref ?? PLACEHOLDER,
        shipping_date: deal.shipping_date ?? PLACEHOLDER,
        vessel_flight: deal.vessel ?? PLACEHOLDER,
        port_of_loading: deal.port_of_loading ?? PLACEHOLDER,
        port_of_discharge: deal.port_of_discharge ?? PLACEHOLDER,
      };

    case "PL":
      return {
        ...base,
        doc_type: "Packing List",
        doc_number: docNumber,
        shipment_ref: deal.shipment_ref ?? PLACEHOLDER,
        total_packages: deal.total_packages ?? 1,
        total_net_weight: product.net_weight ?? PLACEHOLDER,
        total_gross_weight: product.gross_weight ?? PLACEHOLDER,
        total_cbm: product.cbm ?? PLACEHOLDER,
        packing_method: deal.packing_method ?? "Carton Box",
      };

    case "CO":
      return {
        ...base,
        doc_type: "Certificate of Origin",
        doc_number: docNumber,
        origin_country: product.origin_country ?? "KR",
        hs_code: product.hs_code ?? PLACEHOLDER,
        goods_description: product.description ?? product.name ?? PLACEHOLDER,
        certifier: {
          name: "Korea Chamber of Commerce and Industry",
          authority: "KCCI",
        },
        fta_applicable: deal.fta_applicable ?? false,
        fta_agreement: deal.fta_agreement ?? PLACEHOLDER,
      };

    case "SC":
      return {
        ...base,
        doc_type: "Sales Contract",
        doc_number: docNumber,
        contract_date: new Date().toISOString().split("T")[0],
        trade_terms: tradeTerms,
        delivery: {
          date: deal.delivery_date ?? PLACEHOLDER,
          port_of_loading: deal.port_of_loading ?? PLACEHOLDER,
          port_of_discharge: deal.port_of_discharge ?? PLACEHOLDER,
          shipping_method: deal.shipping_method ?? PLACEHOLDER,
        },
        warranty: {
          period: deal.warranty_period ?? "12 months",
          terms: deal.warranty_terms ?? "Standard manufacturer warranty",
        },
        force_majeure: language === "ko"
          ? "천재지변, 전쟁, 파업, 정부규제 등 불가항력 사유 발생 시 양 당사자는 책임을 면합니다."
          : "Neither party shall be liable for failure to perform due to force majeure events including natural disasters, war, strikes, or government regulations.",
        dispute_resolution: language === "ko"
          ? "본 계약에 관한 분쟁은 대한상사중재원의 중재규칙에 따라 해결합니다."
          : "Any disputes arising from this contract shall be resolved by arbitration under the rules of the Korean Commercial Arbitration Board (KCAB).",
      };

    case "BL":
      return {
        ...base,
        doc_type: "Bill of Lading",
        doc_number: docNumber,
        shipper: seller,
        consignee: buyer,
        notify_party: {
          name: buyer.name,
          address: buyer.address,
          country: buyer.country,
        },
        vessel: deal.vessel ?? PLACEHOLDER,
        voyage_no: deal.voyage_no ?? PLACEHOLDER,
        port_of_loading: deal.port_of_loading ?? PLACEHOLDER,
        port_of_discharge: deal.port_of_discharge ?? PLACEHOLDER,
        place_of_delivery: deal.place_of_delivery ?? PLACEHOLDER,
        container_no: deal.container_no ?? PLACEHOLDER,
        seal_no: deal.seal_no ?? PLACEHOLDER,
        goods_description: product.description ?? product.name ?? PLACEHOLDER,
        freight_terms: deal.freight_terms ?? "Prepaid",
      };

    case "ED":
      return {
        ...base,
        doc_type: "Export Declaration",
        doc_number: docNumber,
        exporter: seller,
        hs_code: product.hs_code ?? PLACEHOLDER,
        quantity: deal.quantity ?? 1,
        unit: deal.unit ?? "PCS",
        declared_value: tradeTerms.total_amount,
        currency: tradeTerms.currency,
        destination_country: buyer.country,
        export_port: deal.port_of_loading ?? PLACEHOLDER,
        transport_mode: deal.shipping_method ?? "Sea",
      };

    case "IC":
      return {
        ...base,
        doc_type: "Inspection Certificate",
        doc_number: docNumber,
        inspector: {
          name: deal.inspector_name ?? PLACEHOLDER,
          organization: deal.inspection_org ?? PLACEHOLDER,
          license_no: deal.inspector_license ?? PLACEHOLDER,
        },
        inspection_date: deal.inspection_date ?? PLACEHOLDER,
        inspection_location: deal.inspection_location ?? PLACEHOLDER,
        items_inspected: items,
        result: deal.inspection_result ?? "Passed",
        remarks: deal.inspection_remarks ?? "",
      };

    case "HC":
      return {
        ...base,
        doc_type: "Health/Phytosanitary Certificate",
        doc_number: docNumber,
        certifying_authority: {
          name: language === "ko"
            ? "농림축산검역본부"
            : "Animal and Plant Quarantine Agency",
          country: "KR",
        },
        product_name: product.name ?? product.product_name ?? PLACEHOLDER,
        scientific_name: product.scientific_name ?? PLACEHOLDER,
        health_status: "The products have been inspected and found free from pests and diseases.",
        treatment: deal.treatment ?? PLACEHOLDER,
        additional_declarations: deal.health_declarations ?? "",
      };

    case "SLI":
      return {
        ...base,
        doc_type: "Shipper's Letter of Instruction",
        doc_number: docNumber,
        shipper: seller,
        forwarder: {
          name: deal.forwarder_name ?? PLACEHOLDER,
          contact: deal.forwarder_contact ?? PLACEHOLDER,
        },
        shipping_instructions: {
          service_type: deal.service_type ?? "Port to Port",
          transport_mode: deal.shipping_method ?? "Sea",
          incoterms: tradeTerms.incoterms,
          port_of_loading: deal.port_of_loading ?? PLACEHOLDER,
          port_of_discharge: deal.port_of_discharge ?? PLACEHOLDER,
          cargo_ready_date: deal.cargo_ready_date ?? PLACEHOLDER,
          special_instructions: deal.special_instructions ?? "",
        },
        documents_attached: [
          "Commercial Invoice",
          "Packing List",
          "Certificate of Origin",
        ],
      };

    case "ISF":
      return {
        ...base,
        doc_type: "Importer Security Filing (10+2)",
        doc_number: docNumber,
        importer_of_record: buyer,
        consignee: buyer,
        seller_info: seller,
        manufacturer: {
          name: seller.company,
          address: seller.address,
          country: seller.country,
        },
        ship_to_party: buyer,
        country_of_origin: product.origin_country ?? "KR",
        hs_code: product.hs_code ?? PLACEHOLDER,
        container_stuffing_location: deal.stuffing_location ?? seller.address,
        consolidator: {
          name: deal.consolidator_name ?? PLACEHOLDER,
          address: deal.consolidator_address ?? PLACEHOLDER,
        },
        carrier_info: {
          scac: deal.carrier_scac ?? PLACEHOLDER,
          booking_number: deal.booking_number ?? PLACEHOLDER,
          vessel: deal.vessel ?? PLACEHOLDER,
          voyage: deal.voyage_no ?? PLACEHOLDER,
        },
      };

    case "AMS":
      return {
        ...base,
        doc_type: "Automated Manifest System",
        doc_number: docNumber,
        carrier: {
          name: deal.carrier_name ?? PLACEHOLDER,
          scac: deal.carrier_scac ?? PLACEHOLDER,
        },
        vessel: deal.vessel ?? PLACEHOLDER,
        voyage_no: deal.voyage_no ?? PLACEHOLDER,
        port_of_loading: deal.port_of_loading ?? PLACEHOLDER,
        port_of_discharge: deal.port_of_discharge ?? PLACEHOLDER,
        container_info: {
          container_no: deal.container_no ?? PLACEHOLDER,
          seal_no: deal.seal_no ?? PLACEHOLDER,
          container_type: deal.container_type ?? "20GP",
          weight: product.gross_weight ?? PLACEHOLDER,
        },
        shipper: seller,
        consignee: buyer,
        notify_party: buyer,
        goods_description: product.description ?? product.name ?? PLACEHOLDER,
        piece_count: deal.total_packages ?? 1,
      };

    case "INS":
      return {
        ...base,
        doc_type: "Insurance Certificate",
        doc_number: docNumber,
        policy_number: deal.insurance_policy ?? PLACEHOLDER,
        insurer: deal.insurer_name ?? PLACEHOLDER,
        insured: seller,
        coverage_type: deal.coverage_type ?? "All Risks (ICC-A)",
        insured_value: deal.insured_value ?? tradeTerms.total_amount,
        currency: tradeTerms.currency,
        voyage: {
          from: deal.port_of_loading ?? PLACEHOLDER,
          to: deal.port_of_discharge ?? PLACEHOLDER,
          vessel: deal.vessel ?? PLACEHOLDER,
        },
        claims_agent: {
          name: deal.claims_agent_name ?? PLACEHOLDER,
          address: deal.claims_agent_address ?? PLACEHOLDER,
        },
      };

    case "LC":
      return {
        ...base,
        doc_type: "Letter of Credit Application",
        doc_number: docNumber,
        applicant: buyer,
        beneficiary: seller,
        issuing_bank: {
          name: deal.issuing_bank ?? PLACEHOLDER,
          swift: deal.issuing_bank_swift ?? PLACEHOLDER,
        },
        advising_bank: {
          name: deal.advising_bank ?? PLACEHOLDER,
          swift: deal.advising_bank_swift ?? PLACEHOLDER,
        },
        amount: tradeTerms.total_amount,
        currency: tradeTerms.currency,
        expiry_date: deal.lc_expiry ?? PLACEHOLDER,
        latest_shipment_date: deal.shipping_date ?? PLACEHOLDER,
        trade_terms: tradeTerms,
        partial_shipment: deal.partial_shipment ?? "Not Allowed",
        transhipment: deal.transhipment ?? "Allowed",
        documents_required: [
          "Commercial Invoice",
          "Packing List",
          "Bill of Lading",
          "Certificate of Origin",
          "Insurance Certificate",
        ],
      };

    default:
      return { ...base, doc_type: docType, doc_number: docNumber };
  }
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sbAdmin = createClient(supabaseUrl, serviceKey);

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await sbAdmin.auth.getUser(
      token,
    );
    if (authErr || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const body = await req.json();
    const { deal_id, doc_type, language, notes } = body;

    // Validate required fields
    if (!deal_id || !doc_type) {
      return new Response(
        JSON.stringify({
          error: {
            code: "VALIDATION_ERROR",
            message: "deal_id and doc_type are required",
          },
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!VALID_DOC_TYPES.includes(doc_type)) {
      return new Response(
        JSON.stringify({
          error: {
            code: "VALIDATION_ERROR",
            message: `Invalid doc_type. Must be one of: ${VALID_DOC_TYPES.join(", ")}`,
          },
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const lang = VALID_LANGUAGES.includes(language) ? language : "en";

    // Fetch deal data (try deals table first, fallback to matchings)
    const { data: deal, error: dealErr } = await sbAdmin
      .from("deals")
      .select("*")
      .eq("id", deal_id)
      .single();

    let dealRecord = deal;
    if (dealErr || !deal) {
      const { data: matching } = await sbAdmin
        .from("matchings")
        .select("*")
        .eq("id", deal_id)
        .single();
      dealRecord = matching;
    }

    if (!dealRecord) {
      return new Response(
        JSON.stringify({
          error: {
            code: "NOT_FOUND",
            message: "Deal not found",
          },
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Authorization: verify caller is deal owner (seller/buyer) or admin
    const { data: callerProfile } = await sbAdmin
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    const isAdmin = callerProfile?.is_admin === true;
    const isSeller = dealRecord.user_id === user.id;
    const isBuyer = dealRecord.buyer_id === user.id;

    if (!isAdmin && !isSeller && !isBuyer) {
      return new Response(
        JSON.stringify({
          error: {
            code: "FORBIDDEN",
            message: "Not authorized to access this deal",
          },
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Fetch related data in parallel
    const [productRes, buyerRes, sellerRes, companyRes] = await Promise.all([
      dealRecord.product_id
        ? sbAdmin.from("products").select("*").eq("id", dealRecord.product_id)
          .single()
        : Promise.resolve({ data: null, error: null }),
      dealRecord.buyer_id
        ? sbAdmin.from("buyers").select("*").eq("id", dealRecord.buyer_id).single()
        : Promise.resolve({ data: null, error: null }),
      dealRecord.user_id
        ? sbAdmin.from("profiles").select("*").eq("id", dealRecord.user_id).single()
        : Promise.resolve({ data: null, error: null }),
      dealRecord.user_id
        ? sbAdmin.from("companies").select("*").eq("user_id", dealRecord.user_id)
          .single()
        : Promise.resolve({ data: null, error: null }),
    ]);

    const dealData: DealData = {
      deal: dealRecord ?? {},
      product: productRes.data ?? {},
      buyer: buyerRes.data ?? {},
      seller: sellerRes.data ?? {},
      sellerCompany: companyRes.data ?? {},
    };

    const docNumber = generateDocNumber(doc_type);
    const content = generateContent(doc_type as DocType, dealData, docNumber, lang);

    // Insert document
    const { data: doc, error: insertErr } = await sbAdmin
      .from("documents")
      .insert({
        user_id: user.id,
        doc_type,
        doc_number: docNumber,
        status: "draft",
        language: lang,
        content,
        notes: notes ?? null,
        created_at: new Date().toISOString(),
      })
      .select("id, doc_number")
      .single();

    if (insertErr) {
      console.error("Document insert error:", insertErr);
      return new Response(
        JSON.stringify({
          error: {
            code: "INSERT_FAILED",
            message: "Failed to create document",
          },
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        document_id: doc.id,
        doc_number: doc.doc_number,
      }),
      {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("create-document error:", err);
    return new Response(
      JSON.stringify({
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
        },
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
