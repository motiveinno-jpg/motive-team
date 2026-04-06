import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// ─── CORS ───
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

// ─── Constants ───
const AI_CALL_TIMEOUT_MS = 90000;
const WALL_CLOCK_LIMIT_MS = 140000;

// ─── Types ───
type AnalysisType = "product" | "local_business";
type CategoryType =
  | "food"
  | "beauty"
  | "household"
  | "fashion"
  | "electronics"
  | "other";
type LocalBusinessType =
  | "restaurant"
  | "cafe"
  | "gym"
  | "salon"
  | "academy"
  | "clinic"
  | "other";

interface DomesticAnalysisRequest {
  analysis_id: string;
  analysis_type: AnalysisType;

  // Common fields
  business_name: string;
  category: CategoryType | LocalBusinessType;
  current_monthly_revenue?: number;
  cost_price?: number;
  selling_price?: number;
  margin_rate?: number;
  description?: string;
  urls?: string[];
  image_base64?: string;
  image_type?: string;

  // Product-specific
  product_name?: string;
  smartstore_url?: string;
  coupang_url?: string;
  keywords?: string[];
  review_count?: number;
  average_rating?: number;
  employee_count?: number;

  // Local business-specific
  address?: string;
  business_district?: string;
  operating_hours?: string;
  menu_or_services?: string[];
  naver_place_url?: string;
  naver_place_rating?: number;
  naver_place_reviews?: number;
  target_audience?: string;

  // Additional context
  biggest_challenge?: string;
  monthly_ad_budget?: number;
  competitors?: string[];
}

// ─── JSON Repair ───
function repairJSON(str: string): string {
  let s = str;
  s = s.replace(/,\s*([\]}])/g, "$1");
  s = s.replace(/(?<=:\s*"[^"]*)\n([^"]*")/g, "\\n$1");
  let opens = 0, closesObj = 0, openArr = 0, closeArr = 0;
  for (const ch of s) {
    if (ch === "{") opens++;
    else if (ch === "}") closesObj++;
    else if (ch === "[") openArr++;
    else if (ch === "]") closeArr++;
  }
  while (closeArr < openArr) { s += "]"; closeArr++; }
  while (closesObj < opens) { s += "}"; closesObj++; }
  let depth = 0, lastClose = -1;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "{") depth++;
    else if (s[i] === "}") { depth--; if (depth === 0) lastClose = i; }
  }
  if (lastClose > 0 && lastClose < s.length - 1) s = s.substring(0, lastClose + 1);
  return s;
}

// ─── Naver Search API ───
async function naverShoppingSearch(
  query: string,
  clientId: string,
  clientSecret: string,
  display = 20,
): Promise<any[]> {
  try {
    const url = `https://openapi.naver.com/v1/search/shop.json?query=${encodeURIComponent(query)}&display=${display}&sort=sim`;
    const resp = await fetch(url, {
      headers: {
        "X-Naver-Client-Id": clientId,
        "X-Naver-Client-Secret": clientSecret,
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) {
      console.warn(`[naver-shop] HTTP ${resp.status}: ${await resp.text()}`);
      return [];
    }
    const data = await resp.json();
    return data.items || [];
  } catch (e) {
    console.error("[naver-shop] Error:", e);
    return [];
  }
}

// ─── Naver DataLab Shopping Insight ───
async function naverShoppingInsight(
  category: string,
  clientId: string,
  clientSecret: string,
): Promise<any> {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 12);

    const formatDate = (d: Date) => d.toISOString().split("T")[0];

    const body = {
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
      timeUnit: "month",
      category: [{ name: category, param: [category] }],
    };

    const resp = await fetch(
      "https://openapi.naver.com/v1/datalab/shopping/categories",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Naver-Client-Id": clientId,
          "X-Naver-Client-Secret": clientSecret,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!resp.ok) return null;
    return await resp.json();
  } catch (e) {
    console.error("[naver-datalab] Error:", e);
    return null;
  }
}

// ─── Naver Search Trend ───
async function naverSearchTrend(
  keywords: string[],
  clientId: string,
  clientSecret: string,
): Promise<any> {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 12);

    const formatDate = (d: Date) => d.toISOString().split("T")[0];

    const keywordGroups = keywords.slice(0, 5).map((kw) => ({
      groupName: kw,
      keywords: [kw],
    }));

    const body = {
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
      timeUnit: "month",
      keywordGroups,
    };

    const resp = await fetch(
      "https://openapi.naver.com/v1/datalab/search",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Naver-Client-Id": clientId,
          "X-Naver-Client-Secret": clientSecret,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!resp.ok) return null;
    return await resp.json();
  } catch (e) {
    console.error("[naver-trend] Error:", e);
    return null;
  }
}

// ─── Naver SearchAd Keyword Tool ───
async function naverKeywordStats(
  keywords: string[],
  accessLicense: string,
  secretKey: string,
  customerId: string,
): Promise<any[]> {
  try {
    const timestamp = String(Date.now());
    const method = "GET";
    const path = "/keywordstool";

    // Generate HMAC-SHA256 signature
    const encoder = new TextEncoder();
    const message = `${timestamp}.${method}.${path}`;
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secretKey),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const signature = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(message),
    );
    const signatureBase64 = btoa(
      String.fromCharCode(...new Uint8Array(signature)),
    );

    const kwParam = keywords.slice(0, 5).join(",");
    const url = `https://api.searchad.naver.com${path}?hintKeywords=${encodeURIComponent(kwParam)}&showDetail=1`;

    const resp = await fetch(url, {
      headers: {
        "X-Timestamp": timestamp,
        "X-API-KEY": accessLicense,
        "X-Customer": customerId,
        "X-Signature": signatureBase64,
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!resp.ok) {
      console.warn(`[naver-searchad] HTTP ${resp.status}: ${await resp.text()}`);
      return [];
    }
    const data = await resp.json();
    return data.keywordList || [];
  } catch (e) {
    console.error("[naver-searchad] Error:", e);
    return [];
  }
}

// ─── Government Support Matching (data.go.kr) ───
async function fetchGovSupport(
  apiKey: string,
  category: string,
): Promise<any[]> {
  try {
    const encodedKey = encodeURIComponent(apiKey);
    const url = `https://apis.data.go.kr/B552735/smes_support_biz/getSmeSupportBizList?serviceKey=${encodedKey}&numOfRows=20&pageNo=1&dataType=json`;

    const resp = await fetch(url, {
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) {
      console.warn(`[gov-support] HTTP ${resp.status}`);
      return [];
    }
    const data = await resp.json();
    const items = data?.response?.body?.items?.item || data?.items || [];
    return Array.isArray(items) ? items.slice(0, 10) : [];
  } catch (e) {
    console.error("[gov-support] Error:", e);
    return [];
  }
}

// ─── Category-specific prompt context ───
function getCategoryContext(
  category: string,
  analysisType: AnalysisType,
): string {
  if (analysisType === "local_business") {
    const localCtx: Record<string, string> = {
      restaurant: `[요식업 특화 분석]
- 배달앱(배달의민족/쿠팡이츠) 입점 전략 포함
- 메뉴 가격대 분석 + 세트/콤보 전략
- 시간대별 매출 분석 (런치/디너/야식)
- 위생등급/인증 활용법
- 블로그 맛집 리뷰 확보 전략 (체험단)
- 계절 메뉴 + 한정 메뉴 전략`,
      cafe: `[카페 특화 분석]
- 인스타그래머블 인테리어/메뉴 전략
- 시그니처 메뉴 개발 방향
- 디저트+음료 세트 객단가 전략
- 주변 오피스/학교 타겟 마케팅
- 카페 전용 키워드 (분위기좋은카페, 작업하기좋은카페 등)`,
      gym: `[헬스장/피트니스 특화 분석]
- PT 가격 포지셔닝 + 패키지 전략
- 회원권 구조 (월/3개월/6개월/12개월)
- 바디프로필 이벤트 활용
- 인스타 비포/애프터 콘텐츠 전략
- 주변 경쟁 헬스장 가격 비교
- 새벽/심야 운영 차별화`,
      salon: `[미용실/네일/속눈썹 특화 분석]
- 시술 포트폴리오 사진 전략
- 인스타 릴스(시술 과정) 콘텐츠
- 단골 관리 시스템 (재방문 쿠폰)
- 신규 시술 트렌드 반영 (발레야쥬, 다운펌 등)
- 네이버 예약 최적화
- 가격대별 메뉴 구성 (기본/프리미엄/럭셔리)`,
      academy: `[학원/교육 특화 분석]
- 수강료 포지셔닝 + 패키지
- 학부모 대상 신뢰 구축 콘텐츠
- 합격/성적향상 실적 활용
- 시즌별 모집 전략 (방학/학기 초)
- 무료 상담/체험 수업 전략`,
      clinic: `[병원/클리닉 특화 분석]
- 의료광고 규제 준수 필수
- 시술 전후 사진 활용법 (동의 필수)
- 네이버 플레이스 리뷰 관리
- 전문성 어필 콘텐츠 (의사 프로필, 논문 등)
- 상담 예약 전환 최적화`,
    };
    return localCtx[category] || `[기타 자영업 분석]\n- 업종 특성에 맞는 맞춤 분석`;
  }

  const productCtx: Record<string, string> = {
    food: `[식품 특화 분석]
- HACCP/GMP 인증 보유 여부 확인 + 활용법
- 영양성분 표시 최적화
- 묶음/대용량 가격 전략 (무료배송 3만원 기준점)
- 시즌 키워드 (설/추석/여름/겨울)
- 조리 사진/영상이 전환율 핵심
- 리뷰 배수: 30~50배 (리뷰 수 × 30~50 = 추정 판매량)
- 정기배송/구독 모델 제안
- 식품 유통기한 관리 전략`,
    beauty: `[뷰티/화장품 특화 분석]
- 식약처 기능성 화장품 인증 활용
- 전성분 표기 기반 마케팅
- 인플루언서/체험단 필수 (구매결정 60%+ 영향)
- 사용전후 포토리뷰가 전환 핵심
- 피부타입별 리뷰 분류 전략
- 번들(세트) 구성: 본품+미니어처, 1+1
- 리뷰 배수: 50~80배
- 정기배송/구독 증가 추세
- CPC 높음 (300~1,000원)`,
    household: `[생활용품 특화 분석]
- 문제해결형 키워드 (곰팡이제거, 수납정리) 효과적
- 사용전후 비교 사진이 핵심 콘텐츠
- 묶음판매(3+1, 대용량)로 객단가 상승
- CPC 저렴 (100~300원)
- 블로그 후기/인테리어 사진 연계
- 리뷰 배수: 40~70배
- 가성비 포지셔닝이 일반적`,
    fashion: `[패션/의류 특화 분석]
- 착용샷 포토리뷰 절대적 중요
- 키/몸무게/사이즈 정보 리뷰 → 반품률 감소
- 인스타/유튜브 숏폼 광고 주력
- 시즌 선행 광고 (2~3개월 전)
- 무료반품/교환 정책이 전환율 핵심
- 브랜딩/감성 차별화 > 가격 경쟁
- 리뷰 배수: 50~80배
- 반품률 높음 (20~30%) 주의`,
    electronics: `[전자제품 특화 분석]
- 스펙 비교 상세 리뷰 중요
- KC인증/전파인증 필수 확인
- 가격비교 사이트(다나와, 에누리) 노출
- 브랜드검색 + "A vs B" 비교 키워드 효과적
- CPC 높음 (500~2,000원)
- A/S 체계 구축 필요
- 리뷰 배수: 80~120배
- 반품률 높음 (10~15%)`,
  };
  return productCtx[category] || `[기타 카테고리 분석]\n- 업종 특성에 맞는 맞춤 분석`;
}

// ─── Build AI Prompt ───
function buildProductPrompt(
  req: DomesticAnalysisRequest,
  naverData: {
    shopItems: any[];
    keywordStats: any[];
    trendData: any;
    shoppingInsight: any;
  },
  govSupport: any[],
  categoryCtx: string,
): string {
  const shopSummary = naverData.shopItems.slice(0, 10).map((item: any, i: number) => {
    return `${i + 1}. ${item.title?.replace(/<[^>]*>/g, "")} | 가격: ${Number(item.lprice).toLocaleString()}원 | 리뷰: ${item.reviewCount || "N/A"} | 판매처: ${item.mallName || "N/A"}`;
  }).join("\n");

  const kwSummary = naverData.keywordStats.slice(0, 20).map((kw: any) => {
    return `- "${kw.relKeyword}": 월간검색 PC ${kw.monthlyPcQcCnt || 0} / 모바일 ${kw.monthlyMobileQcCnt || 0} | CPC ${kw.monthlyAvePcClkCost || 0}원 | 경쟁: ${kw.compIdx || "N/A"}`;
  }).join("\n");

  const govSummary = govSupport.slice(0, 5).map((g: any) => {
    return `- ${g.pblancNm || g.bizPbancNm || "지원사업"}: ${g.reqstBeginDe || ""} ~ ${g.reqstEndDe || ""}`;
  }).join("\n") || "현재 조회 가능한 지원사업 없음";

  return `당신은 한국 이커머스 시장의 최고 전문 컨설턴트입니다. 아래 업체의 실데이터와 네이버 시장 데이터를 기반으로 **즉시 실행 가능한** 국내 상품분석 보고서를 작성하세요.

## 분석 대상 업체 정보
- 상호: ${req.business_name}
- 상품명: ${req.product_name || "미입력"}
- 카테고리: ${req.category}
- 현재 월 매출: ${req.current_monthly_revenue ? `${req.current_monthly_revenue.toLocaleString()}원` : "미입력"}
- 제조원가: ${req.cost_price ? `${req.cost_price.toLocaleString()}원` : "미입력"}
- 판매가: ${req.selling_price ? `${req.selling_price.toLocaleString()}원` : "미입력"}
- 마진율: ${req.margin_rate ? `${req.margin_rate}%` : "미입력"}
- 스마트스토어: ${req.smartstore_url || "미입력"}
- 쿠팡: ${req.coupang_url || "미입력"}
- 현재 리뷰 수: ${req.review_count ?? "미입력"}
- 평균 평점: ${req.average_rating ?? "미입력"}
- 종업원 수: ${req.employee_count ?? "미입력"}
- 가장 큰 고민: ${req.biggest_challenge || "미입력"}
- 월 광고 예산: ${req.monthly_ad_budget ? `${req.monthly_ad_budget.toLocaleString()}원` : "미입력"}
- 설명: ${req.description || "미입력"}

## 네이버 쇼핑 경쟁 상품 데이터 (실시간)
${shopSummary || "데이터 없음"}

## 네이버 키워드 데이터 (실시간)
${kwSummary || "데이터 없음"}

${categoryCtx}

## 현재 신청 가능한 정부 지원사업
${govSummary}

---

아래 JSON 형식으로 보고서를 작성하세요. 모든 필드를 빠짐없이 채우세요.
**절대 이론적 조언이 아닌, "이렇게 하세요"라는 구체적 숫자와 실행 가이드를 제공하세요.**
**Before→After를 명확한 숫자로 제시하세요.**

{
  "report_type": "product",
  "overall_score": <현재 경쟁력 점수 0-100>,
  "executive_summary": "<3줄 핵심 요약: 현재 상태 + 가장 큰 기회 + 예상 개선 효과>",

  "before_after": {
    "current": {
      "monthly_revenue": <현재 월 매출 숫자>,
      "conversion_rate": <추정 현재 전환율 %>,
      "avg_keyword_rank": <추정 현재 키워드 순위>,
      "review_count": <현재 리뷰 수>,
      "cpc": <현재 추정 CPC>,
      "roas": <현재 추정 ROAS %>,
      "margin_rate": <현재 마진율 %>
    },
    "projected_4weeks": {
      "monthly_revenue": <4주 후 예상 월 매출>,
      "conversion_rate": <예상 전환율>,
      "avg_keyword_rank": <예상 키워드 순위>,
      "review_count": <예상 리뷰 수>,
      "cpc": <최적화 후 CPC>,
      "roas": <예상 ROAS>,
      "margin_rate": <가격조정 후 마진율>
    },
    "projected_12weeks": {
      "monthly_revenue": <12주 후>,
      "conversion_rate": <12주 후>,
      "avg_keyword_rank": <12주 후>,
      "review_count": <12주 후>,
      "cpc": <12주 후>,
      "roas": <12주 후>,
      "margin_rate": <12주 후>
    },
    "key_changes": ["<변화1: 구체적 숫자>", "<변화2>", "<변화3>"]
  },

  "section_1_channel": {
    "title": "판매 채널 추천",
    "recommended_channels": [
      {
        "channel": "<네이버/쿠팡/11번가/자사몰 등>",
        "fit_score": <적합도 0-100>,
        "reason": "<왜 이 채널인지>",
        "priority": <1-4 우선순위>,
        "setup_guide": "<입점/최적화 단계별 가이드>"
      }
    ]
  },

  "section_2_competitor": {
    "title": "경쟁사 분석",
    "competitors": [
      {
        "name": "<경쟁 상품/브랜드명>",
        "price": "<가격>",
        "review_count": <리뷰 수>,
        "rating": <평점>,
        "monthly_sales_est": "<추정 월 판매량>",
        "strengths": ["<강점1>"],
        "weaknesses": ["<약점1 = 우리의 기회>"],
        "source_url": "<네이버 쇼핑 URL>"
      }
    ],
    "market_gap": "<경쟁사들이 놓치고 있는 기회>",
    "positioning_advice": "<우리의 포지셔닝 전략>"
  },

  "section_3_pricing": {
    "title": "가격 포지셔닝",
    "market_price_range": {"min": <최저가>, "avg": <평균가>, "max": <최고가>},
    "recommended_price": <추천 가격>,
    "price_rationale": "<왜 이 가격인지 근거>",
    "margin_calculation": {
      "selling_price": <판매가>,
      "cost_price": <제조원가>,
      "platform_fee": "<수수료율과 금액>",
      "shipping_cost": "<배송비>",
      "ad_cost_per_sale": "<건당 광고비>",
      "net_margin": "<순마진 금액과 비율>"
    },
    "pricing_strategy": "<단계별 가격 전략: 진입가 → 정상가 → 프리미엄>"
  },

  "section_4_content": {
    "title": "콘텐츠/컨셉 가이드",
    "product_title": "<최적화된 상품명 예시 (바로 복사 가능)>",
    "title_keywords": ["<타이틀에 넣을 키워드들>"],
    "detail_page_structure": [
      {"section": "<섹션명>", "content_guide": "<무엇을 넣어야 하는지>", "example": "<예시>"}
    ],
    "photo_guide": {
      "main_image": "<메인 이미지 촬영 가이드>",
      "detail_images": ["<상세 이미지 1 가이드>", "<상세 이미지 2>"],
      "lifestyle_images": ["<라이프스타일 이미지 가이드>"]
    },
    "tone_and_manner": "<브랜드 톤앤매너 방향>"
  },

  "section_5_advertising": {
    "title": "네이버 광고 세팅",
    "campaign_structure": {
      "campaign_name": "<캠페인명 예시>",
      "ad_groups": [
        {
          "name": "<광고그룹명>",
          "keywords": ["<키워드1>", "<키워드2>"],
          "bid_amount": <추천 입찰가>,
          "daily_budget": <일 예산>
        }
      ]
    },
    "core_keywords": [
      {"keyword": "<키워드>", "monthly_search": <월간검색량>, "competition": "<높음/중간/낮음>", "recommended_bid": <추천입찰가>}
    ],
    "longtail_keywords": ["<롱테일 키워드 20개>"],
    "monthly_budget_plan": {
      "week1": {"budget": <주1 예산>, "focus": "<집중 전략>"},
      "week2": {"budget": <주2>, "focus": "<전략>"},
      "week3": {"budget": <주3>, "focus": "<전략>"},
      "week4": {"budget": <주4>, "focus": "<전략>"}
    },
    "expected_roas": "<예상 ROAS와 근거>"
  },

  "section_6_review": {
    "title": "리뷰 마케팅 전략",
    "current_review_analysis": "<현재 리뷰 상황 분석>",
    "review_target": "<목표 리뷰 수와 기간>",
    "day_plan": [
      {"period": "1~7일", "action": "<구체적 행동>", "expected_reviews": <예상 확보 수>},
      {"period": "8~14일", "action": "<행동>", "expected_reviews": <수>},
      {"period": "15~21일", "action": "<행동>", "expected_reviews": <수>},
      {"period": "22~30일", "action": "<행동>", "expected_reviews": <수>}
    ],
    "review_response_templates": {
      "positive": "<긍정 리뷰 답변 템플릿>",
      "negative": "<부정 리뷰 답변 템플릿>",
      "question": "<질문 리뷰 답변 템플릿>"
    }
  },

  "section_7_revenue": {
    "title": "수익 구조 분석",
    "scenarios": [
      {
        "name": "최선",
        "monthly_revenue": <월 매출>,
        "ad_cost": <광고비>,
        "platform_fee": <수수료>,
        "cogs": <원가>,
        "shipping": <배송비>,
        "net_profit": <순이익>,
        "margin_rate": <마진율 %>
      },
      {"name": "기본", "monthly_revenue": 0, "ad_cost": 0, "platform_fee": 0, "cogs": 0, "shipping": 0, "net_profit": 0, "margin_rate": 0},
      {"name": "최악", "monthly_revenue": 0, "ad_cost": 0, "platform_fee": 0, "cogs": 0, "shipping": 0, "net_profit": 0, "margin_rate": 0}
    ],
    "break_even_point": "<손익분기점 월 매출>",
    "cost_optimization_tips": ["<비용 절감 팁1>", "<팁2>"]
  },

  "section_8_category_specific": {
    "title": "카테고리 맞춤 전략",
    "category": "${req.category}",
    "specific_strategies": [
      {"area": "<전략 영역>", "action": "<구체적 실행 방법>", "expected_impact": "<예상 효과>"}
    ],
    "certification_needed": ["<필요 인증/허가>"],
    "seasonal_calendar": [
      {"month": "<월>", "event": "<시즌 이벤트>", "action": "<해야 할 것>"}
    ],
    "common_mistakes": ["<이 카테고리 흔한 실수1>"]
  },

  "section_9_government_support": {
    "title": "정부 지원사업 매칭",
    "eligible_programs": [
      {
        "name": "<사업명>",
        "organization": "<주관기관>",
        "support_amount": "<지원 금액/내용>",
        "deadline": "<신청 기한>",
        "fit_score": <적합도 0-100>,
        "application_tip": "<신청 팁>"
      }
    ],
    "export_potential": {
      "score": <수출 잠재력 0-100>,
      "recommended_markets": ["<추천 수출 국가>"],
      "rationale": "<수출 가능성 근거>"
    }
  },

  "weekly_checklist": {
    "week1": ["<할 일 1>", "<할 일 2>"],
    "week2": ["<할 일>"],
    "week3": ["<할 일>"],
    "week4": ["<할 일>"]
  },

  "action_priority": [
    {"priority": 1, "action": "<가장 먼저 할 것>", "expected_impact": "<효과>", "effort": "<난이도>"},
    {"priority": 2, "action": "<두 번째>", "expected_impact": "<효과>", "effort": "<난이도>"},
    {"priority": 3, "action": "<세 번째>", "expected_impact": "<효과>", "effort": "<난이도>"}
  ]
}`;
}

function buildLocalBusinessPrompt(
  req: DomesticAnalysisRequest,
  naverData: {
    shopItems: any[];
    keywordStats: any[];
    trendData: any;
    shoppingInsight: any;
  },
  govSupport: any[],
  categoryCtx: string,
): string {
  const kwSummary = naverData.keywordStats.slice(0, 20).map((kw: any) => {
    return `- "${kw.relKeyword}": 월간검색 PC ${kw.monthlyPcQcCnt || 0} / 모바일 ${kw.monthlyMobileQcCnt || 0} | CPC ${kw.monthlyAvePcClkCost || 0}원 | 경쟁: ${kw.compIdx || "N/A"}`;
  }).join("\n");

  const govSummary = govSupport.slice(0, 5).map((g: any) => {
    return `- ${g.pblancNm || g.bizPbancNm || "지원사업"}: ${g.reqstBeginDe || ""} ~ ${g.reqstEndDe || ""}`;
  }).join("\n") || "현재 조회 가능한 지원사업 없음";

  return `당신은 한국 소상공인/자영업 마케팅의 최고 전문 컨설턴트입니다. 아래 업체 정보와 네이버 데이터를 기반으로 **즉시 실행 가능한** 매장분석 보고서를 작성하세요.

## 분석 대상 업체 정보
- 상호: ${req.business_name}
- 업종: ${req.category}
- 주소: ${req.address || "미입력"}
- 상권: ${req.business_district || "미입력"}
- 영업시간: ${req.operating_hours || "미입력"}
- 메뉴/서비스: ${req.menu_or_services?.join(", ") || "미입력"}
- 현재 월 매출: ${req.current_monthly_revenue ? `${req.current_monthly_revenue.toLocaleString()}원` : "미입력"}
- 네이버 플레이스: ${req.naver_place_url || "미입력"}
- 네이버 평점: ${req.naver_place_rating ?? "미입력"}
- 네이버 리뷰 수: ${req.naver_place_reviews ?? "미입력"}
- 종업원 수: ${req.employee_count ?? "미입력"}
- 타겟 고객: ${req.target_audience || "미입력"}
- 가장 큰 고민: ${req.biggest_challenge || "미입력"}
- 월 광고 예산: ${req.monthly_ad_budget ? `${req.monthly_ad_budget.toLocaleString()}원` : "미입력"}
- 설명: ${req.description || "미입력"}

## 네이버 키워드 데이터 (실시간)
${kwSummary || "데이터 없음"}

${categoryCtx}

## 현재 신청 가능한 정부 지원사업
${govSummary}

---

아래 JSON 형식으로 보고서를 작성하세요. **이론이 아닌 즉시 실행 가능한 구체적 가이드를 제공하세요.**

{
  "report_type": "local_business",
  "overall_score": <현재 경쟁력 점수 0-100>,
  "executive_summary": "<3줄 핵심 요약>",

  "before_after": {
    "current": {
      "monthly_revenue": <현재>,
      "daily_visitors": <추정 일 방문객>,
      "naver_place_rank": "<추정 순위>",
      "review_count": <현재 리뷰>,
      "avg_ticket": <추정 객단가>,
      "return_rate": "<추정 재방문율>"
    },
    "projected_4weeks": {
      "monthly_revenue": <4주 후>,
      "daily_visitors": <4주 후>,
      "naver_place_rank": "<4주 후>",
      "review_count": <4주 후>,
      "avg_ticket": <4주 후>,
      "return_rate": "<4주 후>"
    },
    "projected_12weeks": {
      "monthly_revenue": <12주 후>,
      "daily_visitors": <12주 후>,
      "naver_place_rank": "<12주 후>",
      "review_count": <12주 후>,
      "avg_ticket": <12주 후>,
      "return_rate": "<12주 후>"
    },
    "key_changes": ["<변화1>", "<변화2>", "<변화3>"]
  },

  "section_1_district": {
    "title": "상권 분석",
    "district_summary": "<상권 특성 분석>",
    "foot_traffic_analysis": "<유동인구 분석>",
    "peak_hours": ["<피크 시간대>"],
    "target_demographics": "<주요 타겟 고객층>",
    "opportunities": ["<상권 기회>"]
  },

  "section_2_competitor": {
    "title": "경쟁사 분석",
    "competitors": [
      {
        "name": "<경쟁 업체명>",
        "distance": "<거리>",
        "price_range": "<가격대>",
        "reviews": <리뷰 수>,
        "rating": <평점>,
        "strengths": ["<강점>"],
        "weaknesses": ["<약점 = 기회>"]
      }
    ],
    "differentiation_strategy": "<차별화 전략>"
  },

  "section_3_naver_place": {
    "title": "네이버 플레이스 최적화",
    "current_score": <현재 점수 추정>,
    "optimization_checklist": [
      {"item": "<최적화 항목>", "current_status": "<현재>", "action": "<해야 할 것>", "impact": "<효과>"}
    ],
    "photo_guide": ["<등록해야 할 사진 가이드>"],
    "keyword_tags": ["<추천 태그>"]
  },

  "section_4_advertising": {
    "title": "지역 광고 전략",
    "naver_local_keywords": [
      {"keyword": "<지역+업종 키워드>", "monthly_search": <검색량>, "cpc": <CPC>, "recommended_bid": <입찰가>}
    ],
    "campaign_setup": "<캠페인 세팅 가이드>",
    "monthly_budget_plan": {"total": <월 총 예산>, "breakdown": "<채널별 배분>"},
    "offline_marketing": ["<오프라인 마케팅 아이디어>"]
  },

  "section_5_review": {
    "title": "리뷰 전략",
    "current_analysis": "<현재 리뷰 분석>",
    "target": "<목표>",
    "acquisition_plan": [
      {"method": "<방법>", "expected_reviews": <예상 수>, "cost": "<비용>"}
    ],
    "response_guide": {
      "positive": "<긍정 답변 템플릿>",
      "negative": "<부정 답변 템플릿>"
    }
  },

  "section_6_sns": {
    "title": "SNS 마케팅",
    "instagram": {
      "posting_frequency": "<주 몇 회>",
      "content_ideas": ["<콘텐츠 아이디어>"],
      "hashtags": ["<해시태그>"],
      "reels_ideas": ["<릴스 아이디어>"]
    },
    "blog": {
      "strategy": "<블로그 전략>",
      "post_topics": ["<포스팅 주제>"]
    },
    "youtube_shorts": {
      "ideas": ["<쇼츠 아이디어>"]
    }
  },

  "section_7_pricing": {
    "title": "가격/메뉴 전략",
    "price_comparison": "<경쟁사 대비 가격 분석>",
    "recommended_changes": [
      {"item": "<메뉴/서비스>", "current_price": <현재가>, "recommended": <추천가>, "reason": "<이유>"}
    ],
    "upselling_strategies": ["<객단가 올리기 전략>"],
    "set_menu_suggestions": ["<세트/패키지 제안>"]
  },

  "section_8_revenue": {
    "title": "수익 구조",
    "scenarios": [
      {"name": "최선", "monthly_revenue": 0, "costs": 0, "net_profit": 0},
      {"name": "기본", "monthly_revenue": 0, "costs": 0, "net_profit": 0},
      {"name": "최악", "monthly_revenue": 0, "costs": 0, "net_profit": 0}
    ],
    "cost_optimization": ["<비용 절감 팁>"]
  },

  "section_9_government_support": {
    "title": "정부 지원사업 매칭",
    "eligible_programs": [
      {
        "name": "<사업명>",
        "support_amount": "<지원 내용>",
        "fit_score": <적합도>,
        "application_tip": "<팁>"
      }
    ]
  },

  "weekly_checklist": {
    "week1": ["<할 일>"],
    "week2": ["<할 일>"],
    "week3": ["<할 일>"],
    "week4": ["<할 일>"]
  },

  "action_priority": [
    {"priority": 1, "action": "<가장 먼저>", "expected_impact": "<효과>", "effort": "<난이도>"}
  ]
}`;
}

// ─── Main Handler ───
serve(async (req: Request) => {
  const headers = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers });
  }

  const wallStart = Date.now();

  try {
    // Auth
    const sbUrl = Deno.env.get("SUPABASE_URL")!;
    const sbServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sbAdmin = createClient(sbUrl, sbServiceKey);

    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await sbAdmin.auth.getUser(token);

    if (authErr || !user) {
      return new Response(
        JSON.stringify({ ok: false, error: "Unauthorized" }),
        { status: 401, headers },
      );
    }

    const body = await req.json();
    const {
      analysis_id,
      analysis_type = "product",
      business_name,
      category = "other",
    } = body as DomesticAnalysisRequest;

    if (!analysis_id || !business_name) {
      return new Response(
        JSON.stringify({ ok: false, error: "analysis_id and business_name are required" }),
        { status: 400, headers },
      );
    }

    // Plan enforcement (same as analyze-export)
    const PLAN_LIMITS: Record<string, number> = {
      free: 1, starter: 20, pro: 50, professional: 50, enterprise: -1,
    };

    const { data: userData } = await sbAdmin
      .from("users")
      .select("plan, analysis_credits")
      .eq("id", user.id)
      .single();

    const userPlan = userData?.plan || "free";
    const singleCredits = userData?.analysis_credits || 0;
    const monthlyLimit = PLAN_LIMITS[userPlan] ?? 1;

    if (monthlyLimit !== -1) {
      let usageQuery = sbAdmin
        .from("analyses")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);

      if (userPlan !== "free") {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        usageQuery = usageQuery.gte("created_at", startOfMonth.toISOString());
      }

      const { count: usageCount } = await usageQuery;
      const used = usageCount || 0;

      if (used >= monthlyLimit && singleCredits <= 0) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: `무료 플랜 분석 한도(${monthlyLimit}회)를 초과했습니다. 플랜을 업그레이드해주세요.`,
            code: "PLAN_LIMIT_EXCEEDED",
          }),
          { status: 403, headers },
        );
      }

      if (used >= monthlyLimit && singleCredits > 0) {
        await sbAdmin.rpc("deduct_analysis_credit", { p_user_id: user.id });
      }
    }

    // API keys
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    const naverClientId = Deno.env.get("NAVER_CLIENT_ID") || "";
    const naverClientSecret = Deno.env.get("NAVER_CLIENT_SECRET") || "";
    const naverSearchAdLicense = Deno.env.get("NAVER_SEARCHAD_ACCESS_LICENSE") || "";
    const naverSearchAdSecret = Deno.env.get("NAVER_SEARCHAD_SECRET_KEY") || "";
    const naverSearchAdCustomer = Deno.env.get("NAVER_SEARCHAD_CUSTOMER_ID") || "";
    const dataGoKrKey = Deno.env.get("DATA_GO_KR_API_KEY") || "";

    if (!anthropicKey) {
      return new Response(
        JSON.stringify({ ok: false, error: "ANTHROPIC_API_KEY not set" }),
        { status: 500, headers },
      );
    }

    // Progress: started
    await sbAdmin
      .from("analyses")
      .update({
        ai_result: { _progress: "data_collection", _progress_pct: 5 },
      })
      .eq("id", analysis_id)
      .eq("user_id", user.id);

    // Build search keywords
    const reqBody = body as DomesticAnalysisRequest;
    const searchKeywords: string[] = [];

    if (analysis_type === "product") {
      if (reqBody.product_name) searchKeywords.push(reqBody.product_name);
      if (reqBody.keywords) searchKeywords.push(...reqBody.keywords);
      if (!searchKeywords.length) searchKeywords.push(business_name);
    } else {
      // Local business: combine location + business type
      const district = reqBody.business_district || reqBody.address || "";
      const bizType = category === "restaurant" ? "맛집" :
        category === "cafe" ? "카페" :
        category === "gym" ? "헬스장" :
        category === "salon" ? "미용실" :
        category === "academy" ? "학원" :
        category === "clinic" ? "병원" : business_name;

      if (district) searchKeywords.push(`${district} ${bizType}`);
      searchKeywords.push(bizType);
      searchKeywords.push(business_name);
    }

    // ─── Parallel Data Collection ───
    console.log(`[domestic] Starting ${analysis_type} analysis for "${business_name}" (${category})`);

    const [shopItems, keywordStats, trendData, shoppingInsight, govSupport] =
      await Promise.all([
        // Naver Shopping (product type only)
        analysis_type === "product" && naverClientId
          ? naverShoppingSearch(searchKeywords[0], naverClientId, naverClientSecret)
          : Promise.resolve([]),

        // Naver SearchAd keyword stats
        naverSearchAdLicense
          ? naverKeywordStats(
              searchKeywords.slice(0, 5),
              naverSearchAdLicense,
              naverSearchAdSecret,
              naverSearchAdCustomer,
            )
          : Promise.resolve([]),

        // Naver DataLab search trend
        naverClientId
          ? naverSearchTrend(searchKeywords.slice(0, 5), naverClientId, naverClientSecret)
          : Promise.resolve(null),

        // Naver DataLab shopping insight (product only)
        analysis_type === "product" && naverClientId
          ? naverShoppingInsight(searchKeywords[0], naverClientId, naverClientSecret)
          : Promise.resolve(null),

        // Government support programs
        dataGoKrKey
          ? fetchGovSupport(dataGoKrKey, category)
          : Promise.resolve([]),
      ]);

    console.log(
      `[domestic] Data collected: shop=${shopItems.length}, kw=${keywordStats.length}, trend=${!!trendData}, gov=${govSupport.length}`,
    );

    // Progress: data collected
    await sbAdmin
      .from("analyses")
      .update({
        ai_result: { _progress: "ai_analysis", _progress_pct: 40 },
      })
      .eq("id", analysis_id)
      .eq("user_id", user.id);

    // Category context
    const categoryCtx = getCategoryContext(category, analysis_type);

    // Build prompt
    const naverData = { shopItems, keywordStats, trendData, shoppingInsight };
    const prompt = analysis_type === "product"
      ? buildProductPrompt(reqBody, naverData, govSupport, categoryCtx)
      : buildLocalBusinessPrompt(reqBody, naverData, govSupport, categoryCtx);

    // Check wall clock
    if (Date.now() - wallStart > WALL_CLOCK_LIMIT_MS - 30000) {
      return new Response(
        JSON.stringify({ ok: false, error: "Analysis timed out during data collection" }),
        { status: 504, headers },
      );
    }

    // ─── Claude AI Call ───
    const aiResp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8000,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
      signal: AbortSignal.timeout(AI_CALL_TIMEOUT_MS),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error(`[domestic] AI error: ${aiResp.status} ${errText}`);
      return new Response(
        JSON.stringify({ ok: false, error: "AI analysis failed" }),
        { status: 500, headers },
      );
    }

    const aiData = await aiResp.json();
    const rawText = aiData.content?.[0]?.text || "";

    // Parse JSON from AI response
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[domestic] No JSON found in AI response");
      await sbAdmin
        .from("analyses")
        .update({
          ai_result: { error: "AI response parsing failed", raw: rawText.substring(0, 500) },
          status: "error",
        })
        .eq("id", analysis_id)
        .eq("user_id", user.id);

      return new Response(
        JSON.stringify({ ok: false, error: "Failed to parse analysis" }),
        { status: 500, headers },
      );
    }

    let report: any;
    try {
      report = JSON.parse(jsonMatch[0]);
    } catch {
      try {
        report = JSON.parse(repairJSON(jsonMatch[0]));
      } catch (e2) {
        console.error("[domestic] JSON parse failed after repair:", e2);
        return new Response(
          JSON.stringify({ ok: false, error: "Report parsing failed" }),
          { status: 500, headers },
        );
      }
    }

    // Enrich report with raw data
    report._domestic_type = analysis_type;
    report._business_name = business_name;
    report._meta = {
      analysis_type,
      category,
      business_name,
      generated_at: new Date().toISOString(),
      data_sources: {
        naver_shopping: shopItems.length,
        naver_keywords: keywordStats.length,
        naver_trend: !!trendData,
        gov_support: govSupport.length,
      },
      processing_time_ms: Date.now() - wallStart,
    };

    // Save raw keyword data for PDF detail
    report._raw_keywords = keywordStats.slice(0, 30);
    report._raw_competitors = shopItems.slice(0, 10).map((item: any) => ({
      title: item.title?.replace(/<[^>]*>/g, ""),
      price: Number(item.lprice),
      mall: item.mallName,
      image: item.image,
      link: item.link,
      reviewCount: item.reviewCount,
    }));

    // Progress: complete
    await sbAdmin
      .from("analyses")
      .update({
        ai_result: report,
        status: "completed",
        analysis_type: "domestic",
      })
      .eq("id", analysis_id)
      .eq("user_id", user.id);

    console.log(
      `[domestic] Analysis complete for "${business_name}" in ${Date.now() - wallStart}ms`,
    );

    return new Response(
      JSON.stringify({ ok: true, report }),
      { headers: { ...headers, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[domestic] Unhandled error:", err);
    return new Response(
      JSON.stringify({ ok: false, error: "Internal server error" }),
      { status: 500, headers: getCorsHeaders(req) },
    );
  }
});
