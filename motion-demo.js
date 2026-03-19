/**
 * Whistle AI Motion Demo Component
 * Self-contained animated demos with fake cursor, CSS animations, auto-cycling.
 * Usage: Insert returned HTML string into any container element.
 *
 * createManufacturerDemo(isKorean) - 3 demos for manufacturer landing
 * createBuyerDemo(isKorean) - 3 demos for buyer landing
 */

(function (global) {
  'use strict';

  var CYCLE_MS = 5000;
  var ANIM_ID = 'wd-' + Math.random().toString(36).slice(2, 8);

  function baseStyles(id) {
    return '\
<style>\
.' + id + '-wrap{position:relative;width:100%;max-width:680px;margin:0 auto;aspect-ratio:16/10;background:#0a0a1a;border-radius:16px;border:1px solid rgba(255,255,255,.06);overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#e2e8f0;font-size:14px;}\
.' + id + '-scene{position:absolute;inset:0;opacity:0;pointer-events:none;transition:opacity .4s ease;padding:28px 32px;}\
.' + id + '-scene.wd-active{opacity:1;pointer-events:auto;}\
.' + id + '-cursor{position:absolute;width:20px;height:20px;border-radius:50%;background:rgba(255,255,255,.9);border:2px solid #4f8cff;z-index:50;pointer-events:none;transform:translate(-50%,-50%);box-shadow:0 0 12px rgba(79,140,255,.4);transition:none;}\
.' + id + '-cursor.wd-click{transform:translate(-50%,-50%) scale(.7);transition:transform .1s;}\
.' + id + '-dots{display:flex;gap:8px;justify-content:center;position:absolute;bottom:12px;left:0;right:0;z-index:40;}\
.' + id + '-dot{width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,.2);transition:background .3s;}\
.' + id + '-dot.wd-on{background:#4f8cff;}\
.' + id + '-label{position:absolute;top:12px;left:0;right:0;text-align:center;font-size:11px;letter-spacing:.5px;color:rgba(255,255,255,.45);text-transform:uppercase;z-index:40;}\
.' + id + '-card{background:#141428;border-radius:12px;border:1px solid rgba(255,255,255,.06);padding:16px;}\
.' + id + '-btn{display:inline-block;padding:8px 20px;border-radius:8px;background:#4f8cff;color:#fff;font-size:13px;font-weight:600;}\
.' + id + '-teal{color:#00d4aa;}\
.' + id + '-blue{color:#4f8cff;}\
.' + id + '-dim{color:rgba(255,255,255,.4);}\
.' + id + '-row{display:flex;gap:12px;align-items:center;}\
.' + id + '-bar{height:6px;border-radius:3px;background:rgba(255,255,255,.08);flex:1;overflow:hidden;}\
.' + id + '-bar-fill{height:100%;border-radius:3px;background:#4f8cff;width:0;}\
.' + id + '-tag{display:inline-block;padding:3px 10px;border-radius:6px;background:rgba(79,140,255,.15);color:#4f8cff;font-size:11px;font-weight:600;margin:2px;}\
.' + id + '-score{font-size:28px;font-weight:700;}\
.' + id + '-spinner{width:20px;height:20px;border:2px solid rgba(79,140,255,.3);border-top-color:#4f8cff;border-radius:50%;display:inline-block;}\
.' + id + '-typing{display:inline;border-right:2px solid #4f8cff;}\
.' + id + '-chat-ai{background:rgba(79,140,255,.1);border-radius:12px;padding:12px 16px;margin-top:8px;border:1px solid rgba(79,140,255,.15);}\
.' + id + '-step{display:flex;align-items:center;gap:8px;padding:6px 0;font-size:12px;}\
.' + id + '-step-circle{width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;background:rgba(255,255,255,.06);color:rgba(255,255,255,.3);flex-shrink:0;}\
.' + id + '-step-circle.wd-done{background:rgba(0,212,170,.15);color:#00d4aa;}\
.' + id + '-step-circle.wd-now{background:rgba(79,140,255,.2);color:#4f8cff;box-shadow:0 0 8px rgba(79,140,255,.3);}\
.' + id + '-step-line{width:2px;height:12px;background:rgba(255,255,255,.06);margin-left:11px;}\
.' + id + '-step-line.wd-done{background:rgba(0,212,170,.3);}\
.' + id + '-img-placeholder{width:80px;height:80px;border-radius:12px;background:linear-gradient(135deg,#1a1a3a,#252550);display:flex;align-items:center;justify-content:center;font-size:32px;flex-shrink:0;}\
.' + id + '-report-row{display:flex;justify-content:space-between;padding:4px 0;font-size:12px;border-bottom:1px solid rgba(255,255,255,.04);}\
.' + id + '-search-bar{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:10px 16px;font-size:14px;color:#e2e8f0;width:100%;}\
.' + id + '-mfr-card{background:#141428;border-radius:10px;padding:12px;border:1px solid rgba(255,255,255,.06);display:flex;gap:10px;align-items:center;margin-top:8px;}\
.' + id + '-mfr-avatar{width:36px;height:36px;border-radius:8px;background:linear-gradient(135deg,#252550,#1a1a3a);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;}\
.' + id + '-savings{background:rgba(0,212,170,.1);border:1px solid rgba(0,212,170,.2);border-radius:10px;padding:12px 16px;text-align:center;margin-top:10px;}\
@keyframes ' + id + '-spin{to{transform:rotate(360deg)}}\
.' + id + '-spinner{animation:' + id + '-spin .7s linear infinite;}\
@keyframes ' + id + '-fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}\
.' + id + '-fadeUp{animation:' + id + '-fadeUp .5s ease forwards;}\
@keyframes ' + id + '-typeWidth{from{width:0}to{width:100%}}\
@keyframes ' + id + '-blink{0%,100%{border-color:#4f8cff}50%{border-color:transparent}}\
.' + id + '-typing{animation:' + id + '-blink .8s step-end infinite;}\
@keyframes ' + id + '-barGrow{to{width:100%}}\
@keyframes ' + id + '-progress{from{width:0%}to{width:var(--target)}}\
@media(max-width:640px){\
.' + id + '-wrap{aspect-ratio:4/5;border-radius:12px;}\
.' + id + '-scene{padding:20px 16px;}\
.' + id + '-img-placeholder{width:56px;height:56px;font-size:24px;}\
.' + id + '-score{font-size:22px;}\
}\
</style>';
  }

  /* ── Scene builders ── */

  function manufacturerScene1(id, kr) {
    var t = kr
      ? { title: 'AI 수출 분석', analyze: '분석하기', loading: '분석 중...', hs: 'HS 코드', market: '시장 적합도', fta: 'FTA 혜택', sections: '13개 섹션 분석 완료' }
      : { title: 'AI Export Analysis', analyze: 'Analyze', loading: 'Analyzing...', hs: 'HS Code', market: 'Market Fit', fta: 'FTA Benefit', sections: '13 sections analyzed' };
    return '<div class="' + id + '-scene" data-scene="0">\
<div style="display:flex;gap:16px;align-items:flex-start;">\
<div class="' + id + '-img-placeholder" data-el="product">&#x1F9F4;</div>\
<div style="flex:1;">\
<div style="font-weight:600;margin-bottom:4px;">' + (kr ? '프리미엄 스킨케어 세트' : 'Premium Skincare Set') + '</div>\
<div class="' + id + '-dim" style="font-size:12px;">SKU-2847 &middot; ' + (kr ? '화장품' : 'Cosmetics') + '</div>\
<div data-el="btn" class="' + id + '-btn" style="margin-top:10px;">' + t.analyze + '</div>\
<div data-el="spinner" style="display:none;margin-top:10px;"><span class="' + id + '-spinner"></span> <span class="' + id + '-dim">' + t.loading + '</span></div>\
</div></div>\
<div data-el="report" style="display:none;margin-top:16px;" class="' + id + '-card ' + id + '-fadeUp">\
<div class="' + id + '-report-row"><span class="' + id + '-dim">' + t.hs + '</span><span class="' + id + '-teal" style="font-weight:600;">3304.99</span></div>\
<div class="' + id + '-report-row"><span class="' + id + '-dim">' + t.market + '</span><span class="' + id + '-score ' + id + '-teal">92<span style="font-size:14px;">/100</span></span></div>\
<div class="' + id + '-report-row"><span class="' + id + '-dim">' + t.fta + '</span><span class="' + id + '-blue" style="font-weight:600;">0% ' + (kr ? '관세' : 'tariff') + '</span></div>\
<div style="text-align:center;margin-top:8px;font-size:11px;" class="' + id + '-teal">&#x2713; ' + t.sections + '</div>\
</div></div>';
  }

  function manufacturerScene2(id, kr) {
    var t = kr
      ? { title: '채팅으로 모든 기능', userMsg: '견적서 만들어줘', aiTitle: '&#x1F4C4; 견적서 생성 완료', item: '프리미엄 스킨케어 세트', qty: '수량: 500개', price: 'FOB $12,400', note: '30일 이내 결제 조건 포함' }
      : { title: 'Chat-Powered Workflow', userMsg: 'Create a quotation', aiTitle: '&#x1F4C4; Quotation Generated', item: 'Premium Skincare Set', qty: 'Qty: 500 units', price: 'FOB $12,400', note: 'Net 30 payment terms included' };
    return '<div class="' + id + '-scene" data-scene="1">\
<div class="' + id + '-card" style="padding:12px 16px;">\
<div data-el="chat-user" style="display:none;text-align:right;margin-bottom:8px;" class="' + id + '-fadeUp">\
<span style="background:rgba(79,140,255,.15);padding:8px 14px;border-radius:12px 12px 0 12px;display:inline-block;font-size:13px;">\
<span data-el="typed-text"></span><span class="' + id + '-typing">&nbsp;</span>\
</span></div>\
<div data-el="chat-ai" style="display:none;" class="' + id + '-chat-ai ' + id + '-fadeUp">\
<div style="font-weight:600;margin-bottom:6px;">' + t.aiTitle + '</div>\
<div class="' + id + '-report-row"><span class="' + id + '-dim">' + (kr ? '품목' : 'Item') + '</span><span>' + t.item + '</span></div>\
<div class="' + id + '-report-row"><span class="' + id + '-dim">' + t.qty + '</span><span class="' + id + '-teal" style="font-weight:600;">' + t.price + '</span></div>\
<div style="margin-top:6px;font-size:11px;" class="' + id + '-dim">' + t.note + '</div>\
</div></div></div>';
  }

  function escrowScene(id, kr, isBuyer) {
    var steps = kr
      ? ['주문 요청', '결제 보관', '출하 확인', '수취 확인', '대금 방출']
      : ['Order Placed', 'Payment Held', 'Shipment Confirmed', 'Delivery Verified', 'Funds Released'];
    var title = kr ? '에스크로 결제' : 'Secure Payment';
    var html = '<div class="' + id + '-scene" data-scene="2">';
    html += '<div style="text-align:center;margin-bottom:16px;font-size:12px;" class="' + id + '-dim">' + (isBuyer ? (kr ? '바이어 보호' : 'Buyer Protection') : (kr ? '안전한 거래' : 'Safe Transaction')) + '</div>';
    html += '<div class="' + id + '-card">';
    for (var i = 0; i < steps.length; i++) {
      if (i > 0) html += '<div class="' + id + '-step-line" data-el="line-' + i + '"></div>';
      html += '<div class="' + id + '-step"><div class="' + id + '-step-circle" data-el="circle-' + i + '">' + (i + 1) + '</div><span data-el="stxt-' + i + '">' + steps[i] + '</span></div>';
    }
    html += '<div data-el="escrow-done" style="display:none;text-align:center;margin-top:10px;" class="' + id + '-teal ' + id + '-fadeUp">&#x2713; ' + (kr ? '거래 완료' : 'Transaction Complete') + '</div>';
    html += '</div></div>';
    return html;
  }

  function buyerScene1(id, kr) {
    return '<div class="' + id + '-scene" data-scene="0">\
<div data-el="search-wrap">\
<div class="' + id + '-search-bar" data-el="search-input">&#x1F50D; <span data-el="search-typed"></span><span class="' + id + '-typing">&nbsp;</span></div>\
</div>\
<div data-el="results" style="display:none;">\
<div class="' + id + '-mfr-card ' + id + '-fadeUp">\
<div class="' + id + '-mfr-avatar">&#x1F3ED;</div>\
<div style="flex:1;"><div style="font-weight:600;font-size:13px;">' + (kr ? '네이처코스 (주)' : 'NatureCos Co.') + '</div><div class="' + id + '-dim" style="font-size:11px;">' + (kr ? '서울 &middot; 유기농 화장품' : 'Seoul &middot; Organic Cosmetics') + '</div></div>\
<div><span class="' + id + '-score ' + id + '-teal">96</span></div></div>\
<div class="' + id + '-mfr-card ' + id + '-fadeUp" style="animation-delay:.15s;">\
<div class="' + id + '-mfr-avatar">&#x1F3ED;</div>\
<div style="flex:1;"><div style="font-weight:600;font-size:13px;">' + (kr ? '글로벌뷰티랩' : 'Global Beauty Lab') + '</div><div class="' + id + '-dim" style="font-size:11px;">' + (kr ? '인천 &middot; 스킨케어 OEM' : 'Incheon &middot; Skincare OEM') + '</div></div>\
<div><span class="' + id + '-score ' + id + '-blue">89</span></div></div>\
<div class="' + id + '-mfr-card ' + id + '-fadeUp" style="animation-delay:.3s;">\
<div class="' + id + '-mfr-avatar">&#x1F3ED;</div>\
<div style="flex:1;"><div style="font-weight:600;font-size:13px;">' + (kr ? '코리아더마' : 'KoreaDerma') + '</div><div class="' + id + '-dim" style="font-size:11px;">' + (kr ? '대구 &middot; 더마 화장품' : 'Daegu &middot; Derma Cosmetics') + '</div></div>\
<div><span class="' + id + '-score ' + id + '-blue">84</span></div></div>\
</div></div>';
  }

  function buyerScene2(id, kr) {
    return '<div class="' + id + '-scene" data-scene="1">\
<div style="display:flex;gap:12px;margin-bottom:12px;">\
<div class="' + id + '-tag" data-el="from-tag">' + (kr ? '&#x1F1F0;&#x1F1F7; ??????' : '&#x1F1F0;&#x1F1F7; Korea') + '</div>\
<span class="' + id + '-dim" style="align-self:center;">&#x2192;</span>\
<div class="' + id + '-tag" data-el="to-tag" style="background:rgba(0,212,170,.12);color:#00d4aa;">&#x1F1FA;&#x1F1F8; ' + (kr ? '??????' : 'United States') + '</div>\
</div>\
<div class="' + id + '-card">\
<div class="' + id + '-report-row"><span class="' + id + '-dim">' + (kr ? '품목' : 'Product') + '</span><span>HS 3304.99</span></div>\
<div data-el="tariff-mfn" style="display:none;" class="' + id + '-fadeUp">\
<div class="' + id + '-report-row"><span class="' + id + '-dim">MFN ' + (kr ? '관세' : 'Tariff') + '</span><span style="color:#ff6b6b;font-weight:600;text-decoration:line-through;">6.5%</span></div></div>\
<div data-el="tariff-fta" style="display:none;" class="' + id + '-fadeUp">\
<div class="' + id + '-report-row"><span class="' + id + '-dim">KORUS FTA</span><span class="' + id + '-teal" style="font-weight:700;font-size:18px;">0%</span></div></div>\
</div>\
<div data-el="savings-box" style="display:none;" class="' + id + '-savings ' + id + '-fadeUp">\
<div class="' + id + '-dim" style="font-size:11px;margin-bottom:2px;">' + (kr ? '예상 절감액 (FOB $50,000 기준)' : 'Estimated Savings (FOB $50,000)') + '</div>\
<div class="' + id + '-score ' + id + '-teal">$3,250</div>\
</div></div>';
  }

  /* ── Animation timelines ── */

  function animateManufacturer1(root, id) {
    var scene = root.querySelector('[data-scene="0"]');
    var btn = scene.querySelector('[data-el="btn"]');
    var spinner = scene.querySelector('[data-el="spinner"]');
    var report = scene.querySelector('[data-el="report"]');
    var cursor = root.querySelector('.' + id + '-cursor');
    btn.style.display = ''; spinner.style.display = 'none'; report.style.display = 'none';
    // cursor moves to button
    var btnRect = btn.getBoundingClientRect();
    var wrapRect = root.getBoundingClientRect();
    var cx = btnRect.left - wrapRect.left + btnRect.width / 2;
    var cy = btnRect.top - wrapRect.top + btnRect.height / 2;
    cursor.style.transition = 'left .8s cubic-bezier(.4,0,.2,1),top .8s cubic-bezier(.4,0,.2,1)';
    cursor.style.left = cx + 'px'; cursor.style.top = cy + 'px';
    setTimeout(function () { cursor.classList.add('wd-click'); }, 900);
    setTimeout(function () { cursor.classList.remove('wd-click'); btn.style.display = 'none'; spinner.style.display = ''; }, 1050);
    setTimeout(function () { spinner.style.display = 'none'; report.style.display = ''; }, 2200);
  }

  function animateManufacturer2(root, id) {
    var scene = root.querySelector('[data-scene="1"]');
    var chatUser = scene.querySelector('[data-el="chat-user"]');
    var typedText = scene.querySelector('[data-el="typed-text"]');
    var chatAi = scene.querySelector('[data-el="chat-ai"]');
    var kr = root.dataset.kr === '1';
    var msg = kr ? '견적서 만들어줘' : 'Create a quotation';
    chatUser.style.display = ''; chatAi.style.display = 'none'; typedText.textContent = '';
    var i = 0;
    var typeInterval = setInterval(function () {
      if (i < msg.length) { typedText.textContent += msg[i]; i++; }
      else { clearInterval(typeInterval); }
    }, 80);
    setTimeout(function () { chatAi.style.display = ''; }, 1800);
  }

  function animateEscrow(root, id) {
    var scene = root.querySelector('[data-scene="2"]');
    var done = scene.querySelector('[data-el="escrow-done"]');
    done.style.display = 'none';
    for (var j = 0; j < 5; j++) {
      var c = scene.querySelector('[data-el="circle-' + j + '"]');
      c.className = id + '-step-circle';
      if (j > 0) { var l = scene.querySelector('[data-el="line-' + j + '"]'); l.className = id + '-step-line'; }
    }
    var step = 0;
    var interval = setInterval(function () {
      if (step < 5) {
        var c = scene.querySelector('[data-el="circle-' + step + '"]');
        if (step > 0) {
          scene.querySelector('[data-el="circle-' + (step - 1) + '"]').className = id + '-step-circle wd-done';
          scene.querySelector('[data-el="line-' + step + '"]').className = id + '-step-line wd-done';
        }
        c.className = id + '-step-circle wd-now';
        step++;
      } else {
        scene.querySelector('[data-el="circle-4"]').className = id + '-step-circle wd-done';
        done.style.display = '';
        clearInterval(interval);
      }
    }, 600);
  }

  function animateBuyerSearch(root, id) {
    var scene = root.querySelector('[data-scene="0"]');
    var searchTyped = scene.querySelector('[data-el="search-typed"]');
    var results = scene.querySelector('[data-el="results"]');
    var kr = root.dataset.kr === '1';
    var query = kr ? '유기농 스킨케어' : 'organic skincare';
    searchTyped.textContent = ''; results.style.display = 'none';
    var i = 0;
    var typeInt = setInterval(function () {
      if (i < query.length) { searchTyped.textContent += query[i]; i++; }
      else { clearInterval(typeInt); }
    }, 90);
    setTimeout(function () { results.style.display = ''; }, 2000);
  }

  function animateBuyerTariff(root, id) {
    var scene = root.querySelector('[data-scene="1"]');
    var mfn = scene.querySelector('[data-el="tariff-mfn"]');
    var fta = scene.querySelector('[data-el="tariff-fta"]');
    var savings = scene.querySelector('[data-el="savings-box"]');
    mfn.style.display = 'none'; fta.style.display = 'none'; savings.style.display = 'none';
    setTimeout(function () { mfn.style.display = ''; }, 800);
    setTimeout(function () { fta.style.display = ''; }, 1600);
    setTimeout(function () { savings.style.display = ''; }, 2400);
  }

  /* ── Orchestrator ── */

  function createDemo(scenes, animators, id, kr, labels) {
    var html = baseStyles(id);
    html += '<div class="' + id + '-wrap" data-kr="' + (kr ? '1' : '0') + '">';
    html += '<div class="' + id + '-cursor" style="left:50%;top:80%;"></div>';
    html += '<div class="' + id + '-label">' + labels[0] + '</div>';
    html += '<div class="' + id + '-dots">';
    for (var i = 0; i < scenes.length; i++) {
      html += '<div class="' + id + '-dot' + (i === 0 ? ' wd-on' : '') + '" data-dot="' + i + '"></div>';
    }
    html += '</div>';
    for (var j = 0; j < scenes.length; j++) { html += scenes[j]; }
    html += '</div>';

    // Boot script
    html += '<script>\
(function(){\
var root=document.querySelector(".' + id + '-wrap");\
if(!root)return;\
var scenes=root.querySelectorAll(".' + id + '-scene");\
var dots=root.querySelectorAll(".' + id + '-dot");\
var label=root.querySelector(".' + id + '-label");\
var labels=' + JSON.stringify(labels) + ';\
var animators=' + JSON.stringify(animators.map(function(f){return f.toString();})) + ';\
var current=0;\
function show(idx){\
for(var i=0;i<scenes.length;i++){scenes[i].classList.remove("wd-active");dots[i].classList.remove("wd-on");}\
scenes[idx].classList.add("wd-active");dots[idx].classList.add("wd-on");\
label.textContent=labels[idx];\
var fn=new Function("root","id","return ("+animators[idx]+")(root,\\""+id+"\\")"); fn(root,"' + id + '");\
}\
show(0);\
setInterval(function(){current=(current+1)%scenes.length;show(current);},' + CYCLE_MS + ');\
})();\
<\/script>';

    return html;
  }

  /* ── Public API ── */

  global.createManufacturerDemo = function (isKorean) {
    var id = ANIM_ID + 'm';
    var kr = !!isKorean;
    var labels = kr
      ? ['AI 수출 분석', '채팅으로 모든 기능', '에스크로 결제']
      : ['AI Export Analysis', 'Chat-Powered Workflow', 'Secure Payment'];
    var scenes = [
      manufacturerScene1(id, kr),
      manufacturerScene2(id, kr),
      escrowScene(id, kr, false),
    ];
    return createDemo(scenes, [animateManufacturer1, animateManufacturer2, animateEscrow], id, kr, labels);
  };

  global.createBuyerDemo = function (isKorean) {
    var id = ANIM_ID + 'b';
    var kr = !!isKorean;
    var labels = kr
      ? ['AI 제조사 검색', 'FTA 관세 시뮬레이터', '안전한 거래']
      : ['AI Manufacturer Search', 'FTA Tariff Simulator', 'Safe Trading'];
    var scenes = [
      buyerScene1(id, kr),
      buyerScene2(id, kr),
      escrowScene(id, kr, true),
    ];
    return createDemo(scenes, [animateBuyerSearch, animateBuyerTariff, animateEscrow], id, kr, labels);
  };

})(typeof window !== 'undefined' ? window : this);
