/**
 * Whistle AI Motion Demo — Full Process Journey
 * Manufacturer: 11-step journey (Analysis→Results→Project→Progress→Matching→Quote→Contract→Payment→Shipping→Delivery→Settlement)
 * Buyer: 6 scenes (Search→Tariff→Chat→Escrow→Complete)
 *
 * createManufacturerDemo(isKorean) — manufacturer landing (11 scenes, 3.5s cycle)
 * createBuyerDemo(isKorean) — buyer landing (6 scenes, 5.5s cycle)
 */

(function (global) {
  'use strict';

  var CYCLE_MS = 5500;
  var ANIM_ID = 'wd-' + Math.random().toString(36).slice(2, 8);

  function baseStyles(id) {
    return '\
<style>\
.' + id + '-wrap{position:relative;width:100%;max-width:720px;margin:0 auto;aspect-ratio:16/10;background:#080c1a;border-radius:16px;border:1px solid rgba(255,255,255,.06);overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans KR",sans-serif;color:#e2e8f0;font-size:13px;}\
.' + id + '-scene{position:absolute;inset:0;opacity:0;pointer-events:none;transition:opacity .5s ease;padding:20px 24px;display:flex;flex-direction:column;}\
.' + id + '-scene.wd-active{opacity:1;pointer-events:auto;}\
.' + id + '-cursor{position:absolute;width:18px;height:18px;border-radius:50%;background:rgba(255,255,255,.85);border:2px solid #4f8cff;z-index:50;pointer-events:none;transform:translate(-50%,-50%);box-shadow:0 0 10px rgba(79,140,255,.4);transition:none;}\
.' + id + '-cursor.wd-click{transform:translate(-50%,-50%) scale(.7);transition:transform .1s;}\
.' + id + '-dots{display:flex;gap:6px;justify-content:center;position:absolute;bottom:10px;left:0;right:0;z-index:40;}\
.' + id + '-dot{width:7px;height:7px;border-radius:50%;background:rgba(255,255,255,.15);transition:all .3s;cursor:pointer;}\
.' + id + '-dot.wd-on{background:#4f8cff;width:20px;border-radius:4px;}\
.' + id + '-label{position:absolute;top:0;left:0;right:0;text-align:center;font-size:10px;letter-spacing:.8px;color:rgba(255,255,255,.35);text-transform:uppercase;z-index:40;padding:8px;background:linear-gradient(180deg,rgba(8,12,26,.9),transparent);}\
.' + id + '-card{background:rgba(20,20,40,.8);border-radius:10px;border:1px solid rgba(255,255,255,.06);padding:14px;backdrop-filter:blur(4px);}\
.' + id + '-btn{display:inline-block;padding:7px 16px;border-radius:7px;background:linear-gradient(135deg,#4f8cff,#0066ff);color:#fff;font-size:12px;font-weight:600;cursor:pointer;}\
.' + id + '-btn-ok{background:linear-gradient(135deg,#00c853,#00a040);}\
.' + id + '-btn-warn{background:linear-gradient(135deg,#ff9800,#e67e00);}\
.' + id + '-teal{color:#00d4aa;}\
.' + id + '-blue{color:#4f8cff;}\
.' + id + '-dim{color:rgba(255,255,255,.4);}\
.' + id + '-row{display:flex;gap:10px;align-items:center;}\
.' + id + '-bar{height:5px;border-radius:3px;background:rgba(255,255,255,.06);flex:1;overflow:hidden;}\
.' + id + '-bar-fill{height:100%;border-radius:3px;width:0;}\
.' + id + '-tag{display:inline-block;padding:3px 8px;border-radius:5px;font-size:10px;font-weight:600;margin:2px;}\
.' + id + '-tag-blue{background:rgba(79,140,255,.12);color:#4f8cff;}\
.' + id + '-tag-teal{background:rgba(0,212,170,.12);color:#00d4aa;}\
.' + id + '-tag-warn{background:rgba(255,152,0,.12);color:#ff9800;}\
.' + id + '-tag-ok{background:rgba(0,200,83,.12);color:#00c853;}\
.' + id + '-score{font-size:24px;font-weight:700;}\
.' + id + '-spinner{width:16px;height:16px;border:2px solid rgba(79,140,255,.3);border-top-color:#4f8cff;border-radius:50%;display:inline-block;}\
.' + id + '-typing{display:inline;border-right:2px solid #4f8cff;}\
.' + id + '-chat-user{text-align:right;margin-bottom:6px;}\
.' + id + '-chat-user>span{background:rgba(79,140,255,.12);padding:8px 12px;border-radius:10px 10px 0 10px;display:inline-block;font-size:12px;max-width:80%;text-align:left;}\
.' + id + '-chat-ai{background:rgba(0,212,170,.06);border-radius:10px;padding:10px 14px;margin-bottom:6px;border:1px solid rgba(0,212,170,.1);}\
.' + id + '-chat-system{text-align:center;font-size:10px;color:rgba(255,255,255,.3);padding:4px;}\
.' + id + '-step{display:flex;align-items:center;gap:8px;padding:5px 0;font-size:11px;}\
.' + id + '-step-c{width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;background:rgba(255,255,255,.05);color:rgba(255,255,255,.25);flex-shrink:0;}\
.' + id + '-step-c.wd-done{background:rgba(0,212,170,.12);color:#00d4aa;}\
.' + id + '-step-c.wd-now{background:rgba(79,140,255,.15);color:#4f8cff;box-shadow:0 0 6px rgba(79,140,255,.25);}\
.' + id + '-step-line{width:2px;height:8px;background:rgba(255,255,255,.04);margin-left:10px;}\
.' + id + '-step-line.wd-done{background:rgba(0,212,170,.2);}\
.' + id + '-product{width:64px;height:64px;border-radius:10px;background:linear-gradient(135deg,#1a1a3a,#252550);display:flex;align-items:center;justify-content:center;font-size:28px;flex-shrink:0;border:1px solid rgba(255,255,255,.04);}\
.' + id + '-avatar{width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;}\
.' + id + '-notif{background:rgba(79,140,255,.08);border:1px solid rgba(79,140,255,.12);border-radius:10px;padding:10px 14px;display:flex;gap:10px;align-items:center;margin-bottom:6px;}\
.' + id + '-header{display:flex;align-items:center;gap:10px;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid rgba(255,255,255,.04);}\
.' + id + '-sidebar{width:140px;background:rgba(10,10,26,.6);border-right:1px solid rgba(255,255,255,.04);padding:10px 8px;display:flex;flex-direction:column;gap:4px;flex-shrink:0;}\
.' + id + '-sidebar-item{padding:6px 8px;border-radius:6px;font-size:10px;color:rgba(255,255,255,.4);cursor:pointer;}\
.' + id + '-sidebar-item.active{background:rgba(79,140,255,.08);color:#4f8cff;font-weight:600;}\
.' + id + '-grid2{display:grid;grid-template-columns:1fr 1fr;gap:8px;}\
.' + id + '-grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;}\
.' + id + '-metric{text-align:center;padding:8px;background:rgba(255,255,255,.02);border-radius:8px;border:1px solid rgba(255,255,255,.04);}\
.' + id + '-metric-val{font-size:18px;font-weight:700;}\
.' + id + '-metric-label{font-size:9px;color:rgba(255,255,255,.35);margin-top:2px;}\
.' + id + '-doc{display:flex;align-items:center;gap:8px;padding:8px 10px;background:rgba(255,255,255,.02);border-radius:8px;border:1px solid rgba(255,255,255,.04);font-size:11px;}\
.' + id + '-amount{font-size:20px;font-weight:700;}\
@keyframes ' + id + '-spin{to{transform:rotate(360deg)}}\
.' + id + '-spinner{animation:' + id + '-spin .7s linear infinite;}\
@keyframes ' + id + '-fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}\
.' + id + '-fadeUp{animation:' + id + '-fadeUp .4s ease forwards;}\
@keyframes ' + id + '-blink{0%,100%{border-color:#4f8cff}50%{border-color:transparent}}\
.' + id + '-typing{animation:' + id + '-blink .8s step-end infinite;}\
@keyframes ' + id + '-pulse{0%,100%{opacity:1}50%{opacity:.5}}\
.' + id + '-pulse{animation:' + id + '-pulse 1.5s ease infinite;}\
@media(max-width:640px){\
.' + id + '-wrap{aspect-ratio:9/14;border-radius:12px;max-width:380px;}\
.' + id + '-scene{padding:16px 12px;}\
.' + id + '-product{width:48px;height:48px;font-size:22px;}\
.' + id + '-sidebar{display:none;}\
.' + id + '-grid3{grid-template-columns:1fr 1fr;}\
.' + id + '-score{font-size:18px;}\
.' + id + '-amount{font-size:16px;}\
}\
</style>';
  }

  /* ══════════════════════════════════════
     MANUFACTURER SCENES — 11-step journey
     상품분석→분석결과→프로젝트생성→프로젝트진행→바이어매칭→견적문서→본계약→결제요청→배송입력→배송확인→잔금입금
     ══════════════════════════════════════ */

  function mfrProg(id, step) {
    return '<div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;"><div style="flex:1;height:3px;background:rgba(255,255,255,.06);border-radius:2px;overflow:hidden;"><div style="width:' + Math.round((step + 1) / 11 * 100) + '%;height:100%;background:linear-gradient(90deg,#00d4aa,#4f8cff);border-radius:2px;"></div></div><span class="' + id + '-dim" style="font-size:9px;white-space:nowrap;">' + (step + 1) + '/11</span></div>';
  }

  // 0: 상품 분석
  function mfrScene1(id, kr) {
    return '<div class="' + id + '-scene" data-scene="0">' + mfrProg(id, 0) +
      '<div style="font-weight:700;font-size:14px;margin-bottom:10px;">🔬 ' + (kr ? '상품 분석' : 'Product Analysis') + '</div>' +
      '<div style="display:flex;gap:12px;align-items:center;margin-bottom:10px;"><div class="' + id + '-product">🧴</div>' +
      '<div style="flex:1;"><div style="font-weight:600;font-size:13px;">' + (kr ? '프리미엄 비타민C 세럼' : 'Premium Vitamin C Serum') + '</div>' +
      '<div class="' + id + '-dim" style="font-size:11px;">' + (kr ? '화장품 · 30ml · 미국 수출' : 'Cosmetics · 30ml · USA Export') + '</div>' +
      '<div style="margin-top:4px;display:flex;gap:4px;"><span class="' + id + '-tag ' + id + '-tag-blue">HS 3304.99</span><span class="' + id + '-tag ' + id + '-tag-teal">' + (kr ? '한-미 FTA' : 'KORUS FTA') + '</span></div></div></div>' +
      '<div data-el="btn" class="' + id + '-btn" style="width:100%;text-align:center;">' + (kr ? '🔬 AI 분석 시작' : '🔬 Start AI Analysis') + '</div>' +
      '<div data-el="spin" style="display:none;text-align:center;padding:10px;" class="' + id + '-fadeUp"><span class="' + id + '-spinner"></span> <span class="' + id + '-dim" style="font-size:11px;">' + (kr ? 'AI가 13개 섹션 분석 중...' : 'AI analyzing 13 sections...') + '</span></div></div>';
  }

  // 1: 분석 결과
  function mfrScene2(id, kr) {
    return '<div class="' + id + '-scene" data-scene="1">' + mfrProg(id, 1) +
      '<div style="font-weight:700;font-size:14px;margin-bottom:10px;">📊 ' + (kr ? '분석 결과' : 'Analysis Results') + '</div>' +
      '<div class="' + id + '-grid3" style="margin-bottom:8px;">' +
      '<div class="' + id + '-metric" data-el="r0" style="display:none;"><div class="' + id + '-metric-val ' + id + '-teal">92</div><div class="' + id + '-metric-label">' + (kr ? '수출 적합도' : 'Export Score') + '</div></div>' +
      '<div class="' + id + '-metric" data-el="r1" style="display:none;"><div class="' + id + '-metric-val ' + id + '-blue">A+</div><div class="' + id + '-metric-label">' + (kr ? '가격 경쟁력' : 'Price Score') + '</div></div>' +
      '<div class="' + id + '-metric" data-el="r2" style="display:none;"><div class="' + id + '-metric-val" style="color:#ff9800;">B+</div><div class="' + id + '-metric-label">' + (kr ? '인증 준비' : 'Cert Ready') + '</div></div></div>' +
      '<div data-el="r3" style="display:none;" class="' + id + '-card ' + id + '-fadeUp">' +
      '<div class="' + id + '-dim" style="font-size:10px;margin-bottom:4px;">' + (kr ? '추천 시장' : 'Top Markets') + '</div>' +
      '<div style="display:flex;gap:6px;"><span class="' + id + '-tag ' + id + '-tag-ok">🇺🇸 92%</span><span class="' + id + '-tag ' + id + '-tag-blue">🇯🇵 88%</span><span class="' + id + '-tag ' + id + '-tag-warn">🇬🇧 79%</span></div></div></div>';
  }

  // 2: 프로젝트 생성
  function mfrScene3(id, kr) {
    return '<div class="' + id + '-scene" data-scene="2">' + mfrProg(id, 2) +
      '<div style="font-weight:700;font-size:14px;margin-bottom:10px;">📁 ' + (kr ? '프로젝트 자동 생성' : 'Project Auto-Created') + '</div>' +
      '<div class="' + id + '-card" style="padding:12px;margin-bottom:8px;"><div style="font-weight:700;font-size:13px;margin-bottom:4px;">🇺🇸 ' + (kr ? 'US 수출 프로젝트' : 'US Export Project') + '</div>' +
      '<div class="' + id + '-dim" style="font-size:10px;">' + (kr ? '비타민C 세럼 · 1,000개 · FOB ₩12,750' : 'Vitamin C Serum · 1,000 units · FOB $8.50') + '</div></div>' +
      '<div data-el="s0" style="display:none;" class="' + id + '-step ' + id + '-fadeUp"><div class="' + id + '-step-c wd-done">✓</div><span>' + (kr ? '기획' : 'Planning') + '</span></div>' +
      '<div data-el="s1" style="display:none;" class="' + id + '-step ' + id + '-fadeUp"><div class="' + id + '-step-c wd-done">✓</div><span>' + (kr ? '샘플' : 'Sample') + '</span></div>' +
      '<div data-el="s2" style="display:none;" class="' + id + '-step ' + id + '-fadeUp"><div class="' + id + '-step-c">3</div><span>' + (kr ? '계약' : 'Contract') + '</span></div>' +
      '<div data-el="s3" style="display:none;" class="' + id + '-step ' + id + '-fadeUp"><div class="' + id + '-step-c">4</div><span>' + (kr ? '결제' : 'Payment') + '</span></div>' +
      '<div data-el="s4" style="display:none;" class="' + id + '-step ' + id + '-fadeUp"><div class="' + id + '-step-c">5</div><span>' + (kr ? '배송' : 'Shipping') + '</span></div>' +
      '<div data-el="s5" style="display:none;" class="' + id + '-step ' + id + '-fadeUp"><div class="' + id + '-step-c">6</div><span>' + (kr ? '정산' : 'Settlement') + '</span></div></div>';
  }

  // 3: 프로젝트 진행
  function mfrScene4(id, kr) {
    return '<div class="' + id + '-scene" data-scene="3">' + mfrProg(id, 3) +
      '<div style="font-weight:700;font-size:14px;margin-bottom:10px;">🚀 ' + (kr ? '프로젝트 진행' : 'Project Progress') + '</div>' +
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;"><div class="' + id + '-bar" style="flex:1;height:6px;"><div class="' + id + '-bar-fill" data-el="pbar" style="width:0;background:linear-gradient(90deg,#00d4aa,#4f8cff);transition:width .8s;"></div></div>' +
      '<span data-el="ppct" style="font-size:12px;font-weight:700;color:#4f8cff;">0%</span></div>' +
      '<div data-el="p0" style="display:none;" class="' + id + '-step ' + id + '-fadeUp"><div class="' + id + '-step-c wd-done">✓</div><span>' + (kr ? '기획 단계 완료' : 'Planning Complete') + '</span></div>' +
      '<div class="' + id + '-step-line" data-el="pl0" style="display:none;"></div>' +
      '<div data-el="p1" style="display:none;" class="' + id + '-step ' + id + '-fadeUp"><div class="' + id + '-step-c wd-done">✓</div><span>' + (kr ? '샘플 발송 · 바이어 승인' : 'Sample Sent · Approved') + '</span><span class="' + id + '-dim" style="margin-left:auto;font-size:10px;">⭐ 4.8</span></div>' +
      '<div class="' + id + '-step-line" data-el="pl1" style="display:none;"></div>' +
      '<div data-el="p2" style="display:none;" class="' + id + '-step ' + id + '-fadeUp"><div class="' + id + '-step-c wd-now ' + id + '-pulse">▶</div><span style="font-weight:600;">' + (kr ? '인증 서류 확인 중' : 'Certifications Review') + '</span></div></div>';
  }

  // 4: 바이어 매칭
  function mfrScene5(id, kr) {
    return '<div class="' + id + '-scene" data-scene="4">' + mfrProg(id, 4) +
      '<div style="font-weight:700;font-size:14px;margin-bottom:10px;">🤝 ' + (kr ? '바이어 매칭' : 'Buyer Matching') + '</div>' +
      '<div data-el="b0" style="display:none;" class="' + id + '-notif ' + id + '-fadeUp"><div class="' + id + '-avatar" style="background:linear-gradient(135deg,#1a3a5c,#0d2240);">🇺🇸</div>' +
      '<div style="flex:1;"><div style="font-weight:600;font-size:12px;">Sarah Kim</div><div class="' + id + '-dim" style="font-size:10px;">' + (kr ? 'LA 뷰티 유통 · MOQ 1,000+' : 'LA Beauty · MOQ 1,000+') + '</div></div>' +
      '<div class="' + id + '-btn ' + id + '-btn-ok" style="font-size:10px;padding:5px 10px;">' + (kr ? '수락' : 'Accept') + '</div></div>' +
      '<div data-el="b1" style="display:none;" class="' + id + '-notif ' + id + '-fadeUp"><div class="' + id + '-avatar" style="background:linear-gradient(135deg,#3a1a3a,#2a0d2a);">🇬🇧</div>' +
      '<div style="flex:1;"><div style="font-weight:600;font-size:12px;">James Parker</div><div class="' + id + '-dim" style="font-size:10px;">' + (kr ? '런던 리테일 · MOQ 500+' : 'London Retail · MOQ 500+') + '</div></div>' +
      '<div class="' + id + '-btn" style="font-size:10px;padding:5px 10px;">' + (kr ? '검토' : 'Review') + '</div></div>' +
      '<div data-el="b2" style="display:none;text-align:center;margin-top:6px;" class="' + id + '-fadeUp"><span class="' + id + '-dim" style="font-size:10px;">💡 ' + (kr ? 'AI가 12개 바이어 중 상위 2명 추천' : 'AI recommended top 2 from 12 buyers') + '</span></div></div>';
  }

  // 5: 견적문서 생성
  function mfrScene6(id, kr) {
    return '<div class="' + id + '-scene" data-scene="5">' + mfrProg(id, 5) +
      '<div style="font-weight:700;font-size:14px;margin-bottom:10px;">📝 ' + (kr ? '견적문서 자동 생성' : 'Quote Auto-Generated') + '</div>' +
      '<div class="' + id + '-card" style="padding:12px;"><div style="display:flex;justify-content:space-between;font-size:11px;font-weight:700;margin-bottom:8px;"><span>PROFORMA INVOICE</span><span class="' + id + '-dim">#WH-2026-0042</span></div>' +
      '<div data-el="q0" style="display:none;" class="' + id + '-fadeUp"><div style="display:flex;justify-content:space-between;font-size:11px;padding:4px 0;border-bottom:1px solid rgba(255,255,255,.04);"><span class="' + id + '-dim">' + (kr ? '제품' : 'Product') + '</span><span>Vitamin C Serum 30ml</span></div></div>' +
      '<div data-el="q1" style="display:none;" class="' + id + '-fadeUp"><div style="display:flex;justify-content:space-between;font-size:11px;padding:4px 0;border-bottom:1px solid rgba(255,255,255,.04);"><span class="' + id + '-dim">' + (kr ? '수량' : 'Qty') + '</span><span>1,000</span></div></div>' +
      '<div data-el="q2" style="display:none;" class="' + id + '-fadeUp"><div style="display:flex;justify-content:space-between;font-size:11px;padding:4px 0;border-bottom:1px solid rgba(255,255,255,.04);"><span class="' + id + '-dim">FOB ' + (kr ? '단가' : 'Price') + '</span><span>' + (kr ? '₩12,750' : '$8.50') + '</span></div></div>' +
      '<div data-el="q3" style="display:none;" class="' + id + '-fadeUp"><div style="display:flex;justify-content:space-between;font-size:12px;font-weight:700;padding:6px 0;"><span>' + (kr ? '합계' : 'Total') + '</span><span class="' + id + '-teal">' + (kr ? '₩12,750,000' : '$8,500') + '</span></div></div></div>' +
      '<div data-el="q4" style="display:none;margin-top:8px;text-align:center;" class="' + id + '-btn ' + id + '-fadeUp">' + (kr ? '📄 PDF 발송' : '📄 Send PDF') + '</div></div>';
  }

  // 6: 본계약 진행
  function mfrScene7(id, kr) {
    return '<div class="' + id + '-scene" data-scene="6">' + mfrProg(id, 6) +
      '<div style="font-weight:700;font-size:14px;margin-bottom:10px;">📋 ' + (kr ? '본계약 진행' : 'Main Contract') + '</div>' +
      '<div class="' + id + '-card" style="padding:12px;">' +
      '<div data-el="c0" style="display:none;" class="' + id + '-fadeUp"><div style="font-size:11px;font-weight:600;margin-bottom:6px;">' + (kr ? '계약 조건' : 'Contract Terms') + '</div>' +
      '<div style="display:flex;justify-content:space-between;font-size:10px;padding:3px 0;border-bottom:1px solid rgba(255,255,255,.04);"><span class="' + id + '-dim">' + (kr ? '결제 조건' : 'Payment') + '</span><span>' + (kr ? '선금 50% + 잔금 50%' : '50% Deposit + 50% Balance') + '</span></div>' +
      '<div style="display:flex;justify-content:space-between;font-size:10px;padding:3px 0;border-bottom:1px solid rgba(255,255,255,.04);"><span class="' + id + '-dim">' + (kr ? '납기' : 'Delivery') + '</span><span>30 ' + (kr ? '일' : 'days') + '</span></div>' +
      '<div style="display:flex;justify-content:space-between;font-size:10px;padding:3px 0;"><span class="' + id + '-dim">' + (kr ? '품질 보증' : 'Warranty') + '</span><span>' + (kr ? 'FDA 인증 필수' : 'FDA Required') + '</span></div></div>' +
      '<div data-el="c1" style="display:none;text-align:center;margin-top:8px;padding:8px;background:rgba(0,200,83,.08);border:1px solid rgba(0,200,83,.15);border-radius:8px;" class="' + id + '-fadeUp"><span style="font-size:18px;">✍️</span> <span style="font-size:12px;font-weight:700;color:#00c853;">' + (kr ? '전자 서명 완료' : 'Digitally Signed') + '</span></div></div></div>';
  }

  // 7: 결제 요청
  function mfrScene8(id, kr) {
    return '<div class="' + id + '-scene" data-scene="7">' + mfrProg(id, 7) +
      '<div style="font-weight:700;font-size:14px;margin-bottom:10px;">💳 ' + (kr ? '결제 요청' : 'Payment Request') + '</div>' +
      '<div class="' + id + '-card" style="text-align:center;padding:14px;margin-bottom:8px;">' +
      '<div class="' + id + '-dim" style="font-size:10px;margin-bottom:4px;">' + (kr ? '에스크로 보관 금액' : 'Escrow Amount') + '</div>' +
      '<div class="' + id + '-amount ' + id + '-teal" data-el="e-amt">' + (kr ? '₩0' : '$0') + '</div>' +
      '<div class="' + id + '-dim" style="font-size:10px;margin-top:4px;">' + (kr ? 'Stripe 안전 보관' : 'Secured by Stripe') + '</div></div>' +
      '<div data-el="e0" style="display:none;" class="' + id + '-step ' + id + '-fadeUp"><div class="' + id + '-step-c wd-now ' + id + '-pulse">▶</div><span>' + (kr ? '선금 결제 (50%)' : 'Deposit (50%)') + '</span><span class="' + id + '-dim" style="margin-left:auto;font-size:10px;">' + (kr ? '₩6,375,000' : '$4,250') + '</span></div>' +
      '<div data-el="e1" style="display:none;" class="' + id + '-step ' + id + '-fadeUp"><div class="' + id + '-step-c wd-done">✓</div><span style="font-weight:600;color:#00c853;">' + (kr ? '선금 결제 완료!' : 'Deposit Paid!') + '</span></div></div>';
  }

  // 8: 배송 입력
  function mfrScene9(id, kr) {
    return '<div class="' + id + '-scene" data-scene="8">' + mfrProg(id, 8) +
      '<div style="font-weight:700;font-size:14px;margin-bottom:10px;">📦 ' + (kr ? '배송 입력' : 'Shipping Details') + '</div>' +
      '<div data-el="sh0" style="display:none;" class="' + id + '-doc ' + id + '-fadeUp"><span>🚢</span><span style="flex:1;">' + (kr ? '운송 방식' : 'Carrier') + '</span><span class="' + id + '-tag ' + id + '-tag-blue">' + (kr ? '해상 운송' : 'Sea Freight') + '</span></div>' +
      '<div data-el="sh1" style="display:none;" class="' + id + '-doc ' + id + '-fadeUp"><span>📋</span><span style="flex:1;">' + (kr ? 'B/L 번호' : 'B/L Number') + '</span><span style="font-weight:600;font-size:11px;">MAEU-2026-84721</span></div>' +
      '<div data-el="sh2" style="display:none;" class="' + id + '-doc ' + id + '-fadeUp"><span>📅</span><span style="flex:1;">' + (kr ? '도착 예정' : 'ETA') + '</span><span style="font-weight:600;font-size:11px;color:#4f8cff;">2026-04-18</span></div>' +
      '<div data-el="sh3" style="display:none;margin-top:8px;" class="' + id + '-fadeUp"><div class="' + id + '-btn ' + id + '-btn-ok" style="width:100%;text-align:center;">' + (kr ? '📦 출하 확인 완료' : '📦 Shipment Confirmed') + '</div></div></div>';
  }

  // 9: 배송 확인
  function mfrScene10(id, kr) {
    return '<div class="' + id + '-scene" data-scene="9">' + mfrProg(id, 9) +
      '<div style="font-weight:700;font-size:14px;margin-bottom:10px;">✅ ' + (kr ? '배송 확인' : 'Delivery Confirmed') + '</div>' +
      '<div data-el="d0" style="display:none;" class="' + id + '-step ' + id + '-fadeUp"><div class="' + id + '-step-c wd-done">✓</div><span>' + (kr ? '출하 완료' : 'Shipped') + '</span><span class="' + id + '-dim" style="margin-left:auto;font-size:10px;">03-20</span></div>' +
      '<div class="' + id + '-step-line wd-done"></div>' +
      '<div data-el="d1" style="display:none;" class="' + id + '-step ' + id + '-fadeUp"><div class="' + id + '-step-c wd-done">✓</div><span>' + (kr ? '통관 완료' : 'Customs Cleared') + '</span><span class="' + id + '-dim" style="margin-left:auto;font-size:10px;">04-15</span></div>' +
      '<div class="' + id + '-step-line wd-done"></div>' +
      '<div data-el="d2" style="display:none;" class="' + id + '-step ' + id + '-fadeUp"><div class="' + id + '-step-c wd-done">✓</div><span>' + (kr ? '바이어 수취 확인' : 'Buyer Received') + '</span><span class="' + id + '-tag ' + id + '-tag-ok" style="margin-left:auto;">⭐ 5.0</span></div>' +
      '<div data-el="d3" style="display:none;text-align:center;margin-top:8px;padding:8px;background:rgba(0,200,83,.08);border:1px solid rgba(0,200,83,.15);border-radius:8px;" class="' + id + '-fadeUp">' +
      '<span style="font-size:11px;color:#00c853;font-weight:700;">' + (kr ? '🎉 수취 확인 — 잔금 정산 진행!' : '🎉 Confirmed — releasing balance!') + '</span></div></div>';
  }

  // 10: 잔금 입금
  function mfrScene11(id, kr) {
    return '<div class="' + id + '-scene" data-scene="10">' + mfrProg(id, 10) +
      '<div style="text-align:center;padding-top:8px;">' +
      '<div data-el="f0" style="display:none;font-size:32px;margin-bottom:6px;" class="' + id + '-fadeUp">🎉</div>' +
      '<div data-el="f1" style="display:none;font-size:18px;font-weight:800;margin-bottom:4px;" class="' + id + '-fadeUp">' + (kr ? '거래 완료!' : 'Deal Complete!') + '</div>' +
      '<div data-el="f2" style="display:none;font-size:12px;margin-bottom:12px;" class="' + id + '-dim ' + id + '-fadeUp">' + (kr ? '모든 수출 프로세스가 휘슬에서 완료' : 'Entire export completed on Whistle AI') + '</div></div>' +
      '<div data-el="f3" style="display:none;" class="' + id + '-card ' + id + '-fadeUp"><div class="' + id + '-grid2">' +
      '<div class="' + id + '-metric"><div class="' + id + '-metric-val ' + id + '-teal">' + (kr ? '₩12,431,000' : '$12,090') + '</div><div class="' + id + '-metric-label">' + (kr ? '정산 금액' : 'Settlement') + '</div></div>' +
      '<div class="' + id + '-metric"><div class="' + id + '-metric-val ' + id + '-blue">1,000</div><div class="' + id + '-metric-label">' + (kr ? '수출 수량' : 'Units') + '</div></div></div>' +
      '<div style="text-align:center;margin-top:8px;font-size:10px;"><span class="' + id + '-teal">📩 ' + (kr ? '바이어 재발주 요청!' : 'Buyer re-order request!') + '</span></div></div></div>';
  }

  /* ══════════════════════════════════════
     BUYER SCENES — 6 scenes
     ══════════════════════════════════════ */

  function buyerScene1(id, kr) {
    return '<div class="' + id + '-scene" data-scene="0">\
<div style="font-weight:700;font-size:14px;margin-bottom:10px;">🔍 ' + (kr ? 'AI 제조사 매칭' : 'AI Manufacturer Matching') + '</div>\
<div class="' + id + '-card" style="padding:10px 14px;margin-bottom:8px;">\
<div style="display:flex;align-items:center;gap:8px;">\
<span>🔍</span>\
<span data-el="search-typed" class="' + id + '-dim"></span><span class="' + id + '-typing">&nbsp;</span>\
</div></div>\
<div data-el="results" style="display:none;">\
<div class="' + id + '-notif ' + id + '-fadeUp">\
<div class="' + id + '-avatar" style="background:linear-gradient(135deg,#1a3a1a,#0d240d);">🏭</div>\
<div style="flex:1;"><div style="font-weight:600;font-size:12px;">' + (kr ? '네이처코스 (주)' : 'NatureCos Co.') + '</div>\
<div class="' + id + '-dim" style="font-size:10px;">' + (kr ? '서울 · 유기농 화장품 · FDA 인증' : 'Seoul · Organic Cosmetics · FDA Certified') + '</div></div>\
<div><span class="' + id + '-score ' + id + '-teal" style="font-size:16px;">96</span></div>\
</div>\
<div class="' + id + '-notif ' + id + '-fadeUp" style="animation-delay:.1s;">\
<div class="' + id + '-avatar" style="background:linear-gradient(135deg,#3a1a1a,#240d0d);">🏭</div>\
<div style="flex:1;"><div style="font-weight:600;font-size:12px;">' + (kr ? '글로벌뷰티랩' : 'Global Beauty Lab') + '</div>\
<div class="' + id + '-dim" style="font-size:10px;">' + (kr ? '인천 · OEM/ODM · ISO 22716' : 'Incheon · OEM/ODM · ISO 22716') + '</div></div>\
<div><span class="' + id + '-score ' + id + '-blue" style="font-size:16px;">89</span></div>\
</div>\
<div class="' + id + '-notif ' + id + '-fadeUp" style="animation-delay:.2s;">\
<div class="' + id + '-avatar" style="background:linear-gradient(135deg,#1a1a3a,#0d0d24);">🏭</div>\
<div style="flex:1;"><div style="font-weight:600;font-size:12px;">' + (kr ? '코리아더마' : 'KoreaDerma') + '</div>\
<div class="' + id + '-dim" style="font-size:10px;">' + (kr ? '대구 · 더마코스메틱 · CGMP' : 'Daegu · Dermacosmetics · CGMP') + '</div></div>\
<div><span class="' + id + '-score ' + id + '-blue" style="font-size:16px;">84</span></div>\
</div>\
</div></div>';
  }

  function buyerScene2(id, kr) {
    return '<div class="' + id + '-scene" data-scene="1">\
<div style="font-weight:700;font-size:14px;margin-bottom:10px;">📊 ' + (kr ? 'FTA 관세 시뮬레이터' : 'FTA Tariff Simulator') + '</div>\
<div style="display:flex;gap:8px;margin-bottom:10px;align-items:center;">\
<span class="' + id + '-tag ' + id + '-tag-blue">🇰🇷 ' + (kr ? '한국' : 'Korea') + '</span>\
<span class="' + id + '-dim">→</span>\
<span class="' + id + '-tag ' + id + '-tag-teal">🇺🇸 ' + (kr ? '미국' : 'United States') + '</span>\
<span class="' + id + '-dim" style="margin-left:auto;font-size:10px;">HS 3304.99</span>\
</div>\
<div class="' + id + '-card" style="margin-bottom:8px;">\
<div data-el="t-mfn" style="display:none;display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.04);" class="' + id + '-fadeUp">\
<span class="' + id + '-dim">MFN ' + (kr ? '관세' : 'Tariff') + '</span>\
<span style="color:#ff6b6b;font-weight:600;text-decoration:line-through;">6.5%</span>\
</div>\
<div data-el="t-fta" style="display:none;display:flex;justify-content:space-between;padding:6px 0;" class="' + id + '-fadeUp">\
<span class="' + id + '-dim">KORUS FTA</span>\
<span class="' + id + '-teal" style="font-weight:700;font-size:16px;">0%</span>\
</div>\
</div>\
<div data-el="t-savings" style="display:none;text-align:center;padding:12px;background:rgba(0,212,170,.06);border:1px solid rgba(0,212,170,.1);border-radius:8px;" class="' + id + '-fadeUp">\
<div class="' + id + '-dim" style="font-size:10px;">' + (kr ? '예상 절감액 (FOB $50,000 기준)' : 'Estimated Savings (FOB $50,000)') + '</div>\
<div class="' + id + '-amount ' + id + '-teal">$3,250</div>\
</div></div>';
  }

  function buyerScene3(id, kr) {
    return '<div class="' + id + '-scene" data-scene="2">\
<div class="' + id + '-header">\
<div class="' + id + '-avatar" style="background:linear-gradient(135deg,#1a3a1a,#0d240d);font-size:12px;">🏭</div>\
<div><div style="font-weight:600;font-size:12px;">' + (kr ? '네이처코스 (주)' : 'NatureCos Co.') + '</div><div class="' + id + '-dim" style="font-size:10px;">' + (kr ? '서울 · 온라인' : 'Seoul · Online') + ' <span style="color:#00c853;">●</span></div></div>\
<span class="' + id + '-tag ' + id + '-tag-blue" style="margin-left:auto;">' + (kr ? '자동 번역' : 'Auto-translate') + '</span>\
</div>\
<div style="flex:1;overflow:hidden;">\
<div data-el="bmsg1" style="display:none;" class="' + id + '-chat-user ' + id + '-fadeUp"><span>' + (kr ? '500개 주문하고 싶습니다. FOB 가격 알려주세요.' : 'I want to order 500 units. What is your FOB price?') + '</span></div>\
<div data-el="bmsg2" style="display:none;" class="' + id + '-chat-ai ' + id + '-fadeUp">\
<div style="font-size:11px;margin-bottom:4px;">' + (kr ? '안녕하세요! 비타민C 세럼 500개 FOB 가격입니다:' : 'Hello! Here is the FOB price for 500 units:') + '</div>\
<div style="font-weight:600;font-size:13px;color:#00d4aa;">$24.80/unit · Total $12,400</div>\
<div class="' + id + '-dim" style="font-size:10px;margin-top:2px;">' + (kr ? 'T/T 30일 결제조건 · 샘플 무료' : 'Net 30 T/T · Free sample available') + '</div>\
</div>\
<div data-el="bmsg3" style="display:none;" class="' + id + '-chat-system ' + id + '-fadeUp">🤝 ' + (kr ? '견적 승인됨 — 계약 진행 가능' : 'Quotation approved — ready to proceed') + '</div>\
</div></div>';
  }

  function buyerScene4(id, kr) {
    return '<div class="' + id + '-scene" data-scene="3">\
<div style="font-weight:700;font-size:14px;margin-bottom:10px;">🚀 ' + (kr ? '프로젝트 진행 현황' : 'Project Progress') + '</div>\
<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">\
<div class="' + id + '-bar" style="flex:1;height:6px;"><div class="' + id + '-bar-fill" data-el="proj-bar" style="width:0;background:linear-gradient(90deg,#00d4aa,#4f8cff);transition:width 1s;"></div></div>\
<span data-el="proj-pct" style="font-size:12px;font-weight:700;color:#4f8cff;">0%</span>\
</div>\
<div data-el="stage1" style="display:none;" class="' + id + '-fadeUp">\
<div class="' + id + '-step"><div class="' + id + '-step-c wd-done">✓</div><span>' + (kr ? '샘플 발송 완료' : 'Sample Shipped') + '</span><span class="' + id + '-tag ' + id + '-tag-ok" style="margin-left:auto;">DHL</span></div>\
<div class="' + id + '-step-line wd-done"></div>\
</div>\
<div data-el="stage2" style="display:none;" class="' + id + '-fadeUp">\
<div class="' + id + '-step"><div class="' + id + '-step-c wd-done">✓</div><span>' + (kr ? '바이어 샘플 승인' : 'Buyer Approved Sample') + '</span><span class="' + id + '-dim" style="margin-left:auto;font-size:10px;">⭐ 4.8/5</span></div>\
<div class="' + id + '-step-line wd-done"></div>\
</div>\
<div data-el="stage3" style="display:none;" class="' + id + '-fadeUp">\
<div class="' + id + '-step"><div class="' + id + '-step-c wd-done">✓</div><span>' + (kr ? '본계약 협상 완료' : 'Contract Negotiated') + '</span></div>\
<div class="' + id + '-step-line wd-done"></div>\
</div>\
<div data-el="stage4" style="display:none;" class="' + id + '-fadeUp">\
<div class="' + id + '-step"><div class="' + id + '-step-c wd-now ' + id + '-pulse">▶</div><span style="font-weight:600;">' + (kr ? '선금 결제 대기 중' : 'Awaiting Deposit Payment') + '</span></div>\
</div>\
<div data-el="stage-doc" style="display:none;margin-top:8px;" class="' + id + '-fadeUp">\
<div class="' + id + '-doc"><span>📄</span><span style="flex:1;">' + (kr ? '프로포마 인보이스 (PI)' : 'Proforma Invoice (PI)') + '</span><span class="' + id + '-tag ' + id + '-tag-ok">' + (kr ? '서명 완료' : 'Signed') + '</span></div>\
</div></div>';
  }

  function buyerScene5(id, kr) {
    return '<div class="' + id + '-scene" data-scene="4">\
<div style="font-weight:700;font-size:14px;margin-bottom:10px;">🛡️ ' + (kr ? '바이어 보호 결제' : 'Buyer Protection Payment') + '</div>\
<div class="' + id + '-card" style="text-align:center;margin-bottom:10px;padding:16px;">\
<div class="' + id + '-dim" style="font-size:10px;margin-bottom:4px;">' + (kr ? '에스크로 보호 금액' : 'Protected Amount') + '</div>\
<div class="' + id + '-amount ' + id + '-teal" data-el="escrow-amt">$0</div>\
<div class="' + id + '-dim" style="font-size:10px;margin-top:4px;">' + (kr ? '물품 수령 확인 전까지 안전 보관' : 'Held safely until you confirm delivery') + '</div>\
</div>\
<div data-el="esc-steps">\
<div class="' + id + '-step"><div class="' + id + '-step-c" data-el="ec-0">1</div><span>' + (kr ? '결제 완료' : 'Payment Made') + '</span><span data-el="ec-0-amt" class="' + id + '-dim" style="margin-left:auto;font-size:10px;"></span></div>\
<div class="' + id + '-step-line" data-el="el-1"></div>\
<div class="' + id + '-step"><div class="' + id + '-step-c" data-el="ec-1">2</div><span>' + (kr ? '제조사 출하 확인' : 'Manufacturer Ships') + '</span></div>\
<div class="' + id + '-step-line" data-el="el-2"></div>\
<div class="' + id + '-step"><div class="' + id + '-step-c" data-el="ec-2">3</div><span>' + (kr ? '수취 확인' : 'Confirm Receipt') + '</span></div>\
<div class="' + id + '-step-line" data-el="el-3"></div>\
<div class="' + id + '-step"><div class="' + id + '-step-c" data-el="ec-3">4</div><span>' + (kr ? '대금 정산' : 'Funds Released') + '</span></div>\
</div></div>';
  }

  function buyerScene6(id, kr) {
    return '<div class="' + id + '-scene" data-scene="5">\
<div style="text-align:center;padding-top:10px;">\
<div data-el="confetti" style="display:none;font-size:32px;margin-bottom:8px;" class="' + id + '-fadeUp">🎉</div>\
<div data-el="complete-title" style="display:none;font-size:18px;font-weight:800;margin-bottom:6px;" class="' + id + '-fadeUp">' + (kr ? '거래 완료!' : 'Deal Complete!') + '</div>\
<div data-el="complete-sub" style="display:none;font-size:12px;margin-bottom:16px;" class="' + id + '-dim ' + id + '-fadeUp">' + (kr ? '첫 수출 성공 — 모든 프로세스가 휘슬 AI에서 완료되었습니다' : 'First export success — entire process completed on Whistle AI') + '</div>\
</div>\
<div data-el="summary-card" style="display:none;" class="' + id + '-card ' + id + '-fadeUp">\
<div class="' + id + '-grid2">\
<div class="' + id + '-metric"><div class="' + id + '-metric-val ' + id + '-teal">$12,090</div><div class="' + id + '-metric-label">' + (kr ? '정산 금액' : 'Settlement') + '</div></div>\
<div class="' + id + '-metric"><div class="' + id + '-metric-val ' + id + '-blue">500</div><div class="' + id + '-metric-label">' + (kr ? '수출 수량' : 'Units Exported') + '</div></div>\
</div>\
<div style="display:flex;justify-content:space-between;margin-top:10px;font-size:11px;padding:6px 8px;background:rgba(255,255,255,.02);border-radius:6px;">\
<span class="' + id + '-dim">' + (kr ? '소요 기간' : 'Duration') + '</span><span>45 ' + (kr ? '일' : 'days') + '</span>\
</div>\
<div style="display:flex;justify-content:space-between;font-size:11px;padding:6px 8px;">\
<span class="' + id + '-dim">' + (kr ? '다음 발주' : 'Re-order') + '</span><span class="' + id + '-teal">📩 ' + (kr ? '바이어가 재발주를 요청했습니다' : 'Buyer requested re-order') + '</span>\
</div>\
</div></div>';
  }

  /* ══════════════════════════════════════
     ANIMATION TIMELINES
     ══════════════════════════════════════ */

  /* — helper: reveal multiple data-el in sequence — */
  function mfrReveal(root, sceneIdx, els, delays) {
    var s = root.querySelector('[data-scene="' + sceneIdx + '"]');
    if (!s) return;
    els.forEach(function (e) { var el = s.querySelector('[data-el="' + e + '"]'); if (el) el.style.display = 'none'; });
    els.forEach(function (e, i) {
      setTimeout(function () { var el = s.querySelector('[data-el="' + e + '"]'); if (el) el.style.display = ''; }, delays[i] || i * 500);
    });
  }

  // S0: 상품 분석 — click button → spinner → done
  function animS0(root, id) {
    var s = root.querySelector('[data-scene="0"]');
    var btn = s.querySelector('[data-el="btn"]');
    var spin = s.querySelector('[data-el="spin"]');
    btn.style.display = ''; spin.style.display = 'none';
    var cursor = root.querySelector('.' + id + '-cursor');
    if (cursor) {
      var r = btn.getBoundingClientRect(); var w = root.getBoundingClientRect();
      cursor.style.transition = 'left .7s cubic-bezier(.4,0,.2,1),top .7s cubic-bezier(.4,0,.2,1)';
      cursor.style.left = (r.left - w.left + r.width / 2) + 'px';
      cursor.style.top = (r.top - w.top + r.height / 2) + 'px';
    }
    setTimeout(function () { if (cursor) cursor.classList.add('wd-click'); }, 700);
    setTimeout(function () { if (cursor) cursor.classList.remove('wd-click'); btn.style.display = 'none'; spin.style.display = ''; }, 850);
  }

  // S1: 분석 결과 — metrics pop in
  function animS1(root, id) { mfrReveal(root, 1, ['r0', 'r1', 'r2', 'r3'], [300, 700, 1100, 1800]); }

  // S2: 프로젝트 생성 — stages appear one by one
  function animS2(root, id) { mfrReveal(root, 2, ['s0', 's1', 's2', 's3', 's4', 's5'], [300, 600, 900, 1200, 1500, 1800]); }

  // S3: 프로젝트 진행 — progress bar + checklist
  function animS3(root, id) {
    var s = root.querySelector('[data-scene="3"]');
    var bar = s.querySelector('[data-el="pbar"]');
    var pct = s.querySelector('[data-el="ppct"]');
    ['p0', 'pl0', 'p1', 'pl1', 'p2'].forEach(function (e) { var el = s.querySelector('[data-el="' + e + '"]'); if (el) el.style.display = 'none'; });
    if (bar) bar.style.width = '0';
    if (pct) pct.textContent = '0%';
    setTimeout(function () { var e = s.querySelector('[data-el="p0"]'); if (e) e.style.display = ''; if (bar) { bar.style.transition = 'width .6s ease'; bar.style.width = '35%'; } if (pct) pct.textContent = '35%'; }, 400);
    setTimeout(function () { var e = s.querySelector('[data-el="pl0"]'); if (e) e.style.display = ''; }, 700);
    setTimeout(function () { var e = s.querySelector('[data-el="p1"]'); if (e) e.style.display = ''; if (bar) bar.style.width = '60%'; if (pct) pct.textContent = '60%'; }, 1000);
    setTimeout(function () { var e = s.querySelector('[data-el="pl1"]'); if (e) e.style.display = ''; }, 1300);
    setTimeout(function () { var e = s.querySelector('[data-el="p2"]'); if (e) e.style.display = ''; if (bar) bar.style.width = '72%'; if (pct) pct.textContent = '72%'; }, 1600);
  }

  // S4: 바이어 매칭 — notifications pop in
  function animS4(root, id) { mfrReveal(root, 4, ['b0', 'b1', 'b2'], [400, 1200, 2000]); }

  // S5: 견적문서 — invoice lines appear
  function animS5(root, id) { mfrReveal(root, 5, ['q0', 'q1', 'q2', 'q3', 'q4'], [300, 700, 1100, 1500, 2000]); }

  // S6: 본계약 — terms → signature
  function animS6(root, id) { mfrReveal(root, 6, ['c0', 'c1'], [400, 1800]); }

  // S7: 결제 요청 — amount count up + deposit step
  function animS7(root, id) {
    var s = root.querySelector('[data-scene="7"]');
    var amt = s.querySelector('[data-el="e-amt"]');
    var kr = root.dataset.kr === '1';
    ['e0', 'e1'].forEach(function (e) { var el = s.querySelector('[data-el="' + e + '"]'); if (el) el.style.display = 'none'; });
    if (amt) amt.textContent = kr ? '₩0' : '$0';
    setTimeout(function () { var e = s.querySelector('[data-el="e0"]'); if (e) e.style.display = ''; if (amt) amt.textContent = kr ? '₩6,375,000' : '$4,250'; }, 600);
    setTimeout(function () {
      var e0 = s.querySelector('[data-el="e0"]'); if (e0) { var c = e0.querySelector('.' + id + '-step-c'); if (c) { c.className = id + '-step-c wd-done'; c.textContent = '✓'; } }
      var e1 = s.querySelector('[data-el="e1"]'); if (e1) e1.style.display = '';
    }, 2000);
  }

  // S8: 배송 입력 — shipping details appear
  function animS8(root, id) { mfrReveal(root, 8, ['sh0', 'sh1', 'sh2', 'sh3'], [400, 900, 1400, 2000]); }

  // S9: 배송 확인 — tracking steps
  function animS9(root, id) { mfrReveal(root, 9, ['d0', 'd1', 'd2', 'd3'], [400, 1000, 1600, 2200]); }

  // S10: 잔금 입금 — celebration
  function animS10(root, id) { mfrReveal(root, 10, ['f0', 'f1', 'f2', 'f3'], [300, 700, 1200, 1800]); }

  function animChat(root, id, prefix) {
    var p = prefix || 'msg';
    var s = root.querySelector('[data-scene="2"]');
    for (var i = 1; i <= 4; i++) {
      var el = s.querySelector('[data-el="' + p + i + '"]');
      if (el) el.style.display = 'none';
    }
    setTimeout(function () { var e = s.querySelector('[data-el="' + p + '1"]'); if (e) e.style.display = ''; }, 400);
    setTimeout(function () { var e = s.querySelector('[data-el="' + p + '2"]'); if (e) e.style.display = ''; }, 1500);
    setTimeout(function () { var e = s.querySelector('[data-el="' + p + '3"]'); if (e) e.style.display = ''; }, 2800);
    setTimeout(function () { var e = s.querySelector('[data-el="' + p + '4"]'); if (e) e.style.display = ''; }, 3800);
  }

  function animMfrChat(root, id) { animChat(root, id, 'msg'); }
  function animBuyerChat(root, id) { animChat(root, id, 'bmsg'); }

  function animProject(root, id) {
    var s = root.querySelector('[data-scene="3"]');
    var bar = s.querySelector('[data-el="proj-bar"]');
    var pct = s.querySelector('[data-el="proj-pct"]');
    var stages = ['stage1', 'stage2', 'stage3', 'stage4', 'stage-doc'];
    stages.forEach(function (st) { var e = s.querySelector('[data-el="' + st + '"]'); if (e) e.style.display = 'none'; });
    if (bar) bar.style.width = '0';
    if (pct) pct.textContent = '0%';
    var delays = [400, 1000, 1600, 2200, 2800];
    var pcts = ['25%', '50%', '75%', '85%', '85%'];
    stages.forEach(function (st, i) {
      setTimeout(function () {
        var e = s.querySelector('[data-el="' + st + '"]'); if (e) e.style.display = '';
        if (bar) { bar.style.transition = 'width .6s ease'; bar.style.width = pcts[i]; }
        if (pct) pct.textContent = pcts[i];
      }, delays[i]);
    });
  }

  function animEscrow(root, id) {
    var s = root.querySelector('[data-scene="4"]');
    var amt = s.querySelector('[data-el="escrow-amt"]');
    if (amt) amt.textContent = '$0';
    for (var j = 0; j < 4; j++) {
      var c = s.querySelector('[data-el="ec-' + j + '"]');
      if (c) c.className = id + '-step-c';
      if (j > 0) { var l = s.querySelector('[data-el="el-' + j + '"]'); if (l) l.className = id + '-step-line'; }
    }
    var amtEl = s.querySelector('[data-el="ec-0-amt"]');
    var step = 0;
    var amounts = ['$6,200', '$6,200', '$12,400', '$12,400'];
    var interval = setInterval(function () {
      if (step < 4) {
        var c = s.querySelector('[data-el="ec-' + step + '"]');
        if (step > 0) {
          var prev = s.querySelector('[data-el="ec-' + (step - 1) + '"]');
          if (prev) prev.className = id + '-step-c wd-done';
          var line = s.querySelector('[data-el="el-' + step + '"]');
          if (line) line.className = id + '-step-line wd-done';
        }
        if (c) c.className = id + '-step-c wd-now';
        if (amt) amt.textContent = amounts[step];
        if (amtEl && step === 0) amtEl.textContent = '$6,200';
        step++;
      } else {
        var last = s.querySelector('[data-el="ec-3"]');
        if (last) last.className = id + '-step-c wd-done';
        if (amt) amt.textContent = '$12,090';
        clearInterval(interval);
      }
    }, 700);
  }

  function animComplete(root, id) {
    var s = root.querySelector('[data-scene="5"]');
    var els = ['confetti', 'complete-title', 'complete-sub', 'summary-card'];
    els.forEach(function (e) { var el = s.querySelector('[data-el="' + e + '"]'); if (el) el.style.display = 'none'; });
    setTimeout(function () { var e = s.querySelector('[data-el="confetti"]'); if (e) e.style.display = ''; }, 300);
    setTimeout(function () { var e = s.querySelector('[data-el="complete-title"]'); if (e) e.style.display = ''; }, 700);
    setTimeout(function () { var e = s.querySelector('[data-el="complete-sub"]'); if (e) e.style.display = ''; }, 1200);
    setTimeout(function () { var e = s.querySelector('[data-el="summary-card"]'); if (e) e.style.display = ''; }, 1800);
  }

  function animBuyerSearch(root, id) {
    var s = root.querySelector('[data-scene="0"]');
    var typed = s.querySelector('[data-el="search-typed"]');
    var results = s.querySelector('[data-el="results"]');
    var kr = root.dataset.kr === '1';
    var query = kr ? '유기농 스킨케어' : 'organic skincare';
    if (typed) typed.textContent = '';
    if (results) results.style.display = 'none';
    var i = 0;
    var ti = setInterval(function () {
      if (i < query.length) { if (typed) typed.textContent += query[i]; i++; }
      else clearInterval(ti);
    }, 80);
    setTimeout(function () { if (results) results.style.display = ''; }, 2000);
  }

  function animTariff(root, id) {
    var s = root.querySelector('[data-scene="1"]');
    var mfn = s.querySelector('[data-el="t-mfn"]');
    var fta = s.querySelector('[data-el="t-fta"]');
    var savings = s.querySelector('[data-el="t-savings"]');
    if (mfn) mfn.style.display = 'none';
    if (fta) fta.style.display = 'none';
    if (savings) savings.style.display = 'none';
    setTimeout(function () { if (mfn) mfn.style.display = ''; }, 600);
    setTimeout(function () { if (fta) fta.style.display = ''; }, 1400);
    setTimeout(function () { if (savings) savings.style.display = ''; }, 2200);
  }

  /* ══════════════════════════════════════
     ORCHESTRATOR
     ══════════════════════════════════════ */

  function createDemo(scenes, animators, id, kr, labels, cycleMs) {
    var html = baseStyles(id);
    html += '<div class="' + id + '-wrap" data-kr="' + (kr ? '1' : '0') + '">';
    html += '<div class="' + id + '-cursor" style="left:50%;top:80%;opacity:0;"></div>';
    html += '<div class="' + id + '-label">' + labels[0] + '</div>';
    html += '<div class="' + id + '-dots">';
    for (var i = 0; i < scenes.length; i++) {
      html += '<div class="' + id + '-dot' + (i === 0 ? ' wd-on' : '') + '" data-dot="' + i + '"></div>';
    }
    html += '</div>';
    for (var j = 0; j < scenes.length; j++) html += scenes[j];
    html += '</div>';

    global['__wdBoot_' + id] = function () {
      var root = document.querySelector('.' + id + '-wrap');
      if (!root) return;
      var sceneEls = root.querySelectorAll('.' + id + '-scene');
      var dots = root.querySelectorAll('.' + id + '-dot');
      var labelEl = root.querySelector('.' + id + '-label');
      var cursor = root.querySelector('.' + id + '-cursor');
      var current = 0;

      function show(idx) {
        for (var i = 0; i < sceneEls.length; i++) {
          sceneEls[i].classList.remove('wd-active');
          if (dots[i]) dots[i].classList.remove('wd-on');
        }
        sceneEls[idx].classList.add('wd-active');
        if (dots[idx]) dots[idx].classList.add('wd-on');
        if (labelEl) labelEl.textContent = labels[idx];
        // Show cursor only on first scene
        if (cursor) cursor.style.opacity = idx === 0 ? '1' : '0';
        try { animators[idx](root, id); } catch (e) { console.warn('[demo]', e); }
      }
      show(0);
      setInterval(function () {
        current = (current + 1) % sceneEls.length;
        show(current);
      }, cycleMs || CYCLE_MS);
    };

    return html;
  }

  /* ══════════════════════════════════════
     PUBLIC API
     ══════════════════════════════════════ */

  global.createManufacturerDemo = function (isKorean) {
    var id = ANIM_ID + 'm';
    var kr = !!isKorean;
    var labels = kr
      ? ['1/11 상품 분석', '2/11 분석 결과', '3/11 프로젝트 생성', '4/11 프로젝트 진행', '5/11 바이어 매칭', '6/11 견적문서', '7/11 본계약', '8/11 결제 요청', '9/11 배송 입력', '10/11 배송 확인', '11/11 잔금 입금']
      : ['1/11 Analysis', '2/11 Results', '3/11 Project Created', '4/11 Progress', '5/11 Buyer Match', '6/11 Quote', '7/11 Contract', '8/11 Payment', '9/11 Shipping', '10/11 Delivery', '11/11 Settlement'];
    return createDemo(
      [mfrScene1(id, kr), mfrScene2(id, kr), mfrScene3(id, kr), mfrScene4(id, kr), mfrScene5(id, kr), mfrScene6(id, kr), mfrScene7(id, kr), mfrScene8(id, kr), mfrScene9(id, kr), mfrScene10(id, kr), mfrScene11(id, kr)],
      [animS0, animS1, animS2, animS3, animS4, animS5, animS6, animS7, animS8, animS9, animS10],
      id, kr, labels, 3500
    );
  };

  global.createBuyerDemo = function (isKorean) {
    var id = ANIM_ID + 'b';
    var kr = !!isKorean;
    var labels = kr
      ? ['1/6 제조사 검색', '2/6 FTA 관세 분석', '3/6 채팅 & 협상', '4/6 샘플 & 계약', '5/6 바이어 보호 결제', '6/6 거래 완료']
      : ['1/6 Find Manufacturers', '2/6 FTA Tariff Analysis', '3/6 Chat & Negotiate', '4/6 Sample & Contract', '5/6 Buyer Protection', '6/6 Deal Complete'];
    return createDemo(
      [buyerScene1(id, kr), buyerScene2(id, kr), buyerScene3(id, kr), buyerScene4(id, kr), buyerScene5(id, kr), buyerScene6(id, kr)],
      [animBuyerSearch, animTariff, animBuyerChat, animProject, animEscrow, animComplete],
      id, kr, labels
    );
  };

})(typeof window !== 'undefined' ? window : this);
