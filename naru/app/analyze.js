/**
 * NARU Analyze — Product registration + AI analysis + report
 * Revenue generator #1
 */

Router.register('analyze', function(state) {
  const params = state._routeParams || {};
  const pid = params.pid;

  // If product ID provided, show report
  if (pid) {
    return Analyze.renderReport(pid);
  }

  // Otherwise show registration form + product list
  let h = '';

  h += '<div style="display:flex;align-items:center;gap:12px;margin-bottom:24px">';
  h += '<h2 style="font-size:20px;font-weight:800;color:#fff;flex:1">AI 수출 분석</h2>';
  h += `<span style="font-size:13px;color:var(--tx2)">분석 ${state.analyses.length}건 완료</span>`;
  h += '</div>';

  // Registration card
  h += '<div class="card" style="margin-bottom:24px">';
  h += '<div class="card-header"><h3 class="card-title">새 제품 등록</h3></div>';
  h += '<form id="product-form" onsubmit="Analyze.submitProduct(event)">';

  // URL input (primary method)
  h += '<div class="form-group">';
  h += '<label class="form-label">제품 URL (네이버, 쿠팡, 자사몰 등)</label>';
  h += '<div style="display:flex;gap:8px">';
  h += '<input name="url" type="url" class="form-input" placeholder="https://smartstore.naver.com/..." style="flex:1">';
  h += '<button type="submit" class="btn btn-pri">분석 시작</button>';
  h += '</div>';
  h += '<p style="font-size:11px;color:var(--tx3);margin-top:4px">URL을 입력하면 AI가 자동으로 제품 정보를 수집합니다.</p>';
  h += '</div>';

  // Manual input (toggle)
  h += '<details style="margin-top:12px">';
  h += '<summary style="font-size:13px;color:var(--pri);cursor:pointer;font-weight:600">직접 입력하기</summary>';
  h += '<div style="padding-top:16px;display:grid;grid-template-columns:1fr 1fr;gap:14px">';
  h += '<div class="form-group"><label class="form-label">제품명 *</label><input name="name" class="form-input" placeholder="유기농 꿀 세트"></div>';
  h += '<div class="form-group"><label class="form-label">카테고리</label><select name="category" class="form-input"><option value="">선택</option><option>식품</option><option>화장품/뷰티</option><option>건강기능식품</option><option>생활용품</option><option>전자/IT</option><option>패션/의류</option><option>산업자재</option><option>기타</option></select></div>';
  h += '<div class="form-group"><label class="form-label">예상 FOB 단가 (USD)</label><input name="fob" type="number" step="0.01" class="form-input" placeholder="12.50"></div>';
  h += '<div class="form-group"><label class="form-label">제품 이미지 URL</label><input name="image" type="url" class="form-input" placeholder="https://..."></div>';
  h += '</div>';
  h += '</details>';

  h += '</form>';

  // Free badge
  if (state.analyses.length === 0) {
    h += '<div style="margin-top:12px;padding:10px 16px;background:var(--grn-bg);border-radius:var(--radius-sm);display:flex;align-items:center;gap:8px">';
    h += `<span style="font-size:18px">🎁</span>`;
    h += `<span style="font-size:13px;color:var(--grn);font-weight:700">첫 번째 분석은 무료입니다!</span>`;
    h += '</div>';
  }

  h += '</div>'; // card

  // Analysis list
  if (state.analyses.length > 0) {
    h += '<h3 style="font-size:16px;font-weight:700;color:#fff;margin-bottom:12px">분석 이력</h3>';
    h += '<div style="display:grid;gap:10px">';
    state.analyses.forEach(a => {
      const p = state.products.find(x => x.id === a.product_id);
      const pName = p ? p.name : '제품';
      h += `<div class="card" style="padding:16px;cursor:pointer" onclick="Router.go('analyze',{pid:'${a.product_id}'})">`;
      h += '<div style="display:flex;align-items:center;gap:12px">';
      if (p && p.images && p.images[0]) {
        h += `<img src="${p.images[0]}" style="width:48px;height:48px;border-radius:8px;object-fit:cover">`;
      } else {
        h += '<div style="width:48px;height:48px;border-radius:8px;background:var(--s3);display:flex;align-items:center;justify-content:center;font-size:20px">📦</div>';
      }
      h += '<div style="flex:1">';
      h += `<div style="font-size:14px;font-weight:700;color:#fff">${UI.trunc(pName, 30)}</div>`;
      h += `<div style="font-size:12px;color:var(--tx2)">${UI.date(a.created_at)}</div>`;
      h += '</div>';
      if (a.score != null) {
        h += `<div class="score-circle" style="width:44px;height:44px;font-size:16px;border-color:${UI.scoreColor(a.score)}">${a.score}</div>`;
      }
      h += '</div>';

      // Markets preview
      if (a.result && a.result.recommended_markets) {
        const markets = a.result.recommended_markets.slice(0, 3);
        h += '<div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">';
        markets.forEach(m => {
          const name = m.country || m.market || m;
          h += UI.badge(typeof name === 'string' ? name : JSON.stringify(name), 'pri');
        });
        h += '</div>';
      }

      h += '</div>'; // card
    });
    h += '</div>';
  }

  return h;
});

const Analyze = {
  async submitProduct(e) {
    e.preventDefault();
    const f = e.target;
    const url = f.url.value.trim();
    const name = f.name ? f.name.value.trim() : '';
    const category = f.category ? f.category.value : '';
    const fob = f.fob ? parseFloat(f.fob.value) : null;
    const image = f.image ? f.image.value.trim() : '';

    if (!url && !name) {
      UI.toast('URL 또는 제품명을 입력해주세요.', 'warn');
      return;
    }

    // Check if first analysis (free) or needs payment
    const isFirst = S.analyses.length === 0;
    if (!isFirst && !S.sub) {
      const ok = await UI.confirm('AI 분석 비용: 9,900원\n(구독 시 무제한)\n\n건당 결제하시겠습니까?');
      if (!ok) return;
    }

    // 진행 오버레이 표시
    const overlay = document.createElement('div');
    overlay.id = 'analyze-progress';
    overlay.innerHTML = `
      <div style="position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999;display:flex;align-items:center;justify-content:center">
        <div style="background:var(--s2);border-radius:20px;padding:40px 48px;text-align:center;max-width:400px;width:90%;position:relative">
          <button id="ap-close" style="position:absolute;top:12px;right:16px;background:none;border:none;color:var(--tx3);font-size:20px;cursor:pointer;display:none">&times;</button>
          <div id="ap-icon" style="font-size:48px;margin-bottom:16px">🔍</div>
          <div id="ap-title" style="font-size:18px;font-weight:800;color:#fff;margin-bottom:8px">준비 중...</div>
          <div id="ap-desc" style="font-size:13px;color:var(--tx2);margin-bottom:20px;line-height:1.6">제품 정보를 수집하고 있습니다</div>
          <div style="background:var(--s3);border-radius:8px;height:6px;overflow:hidden">
            <div id="ap-bar" style="height:100%;background:var(--pri);border-radius:8px;width:5%;transition:width .5s ease"></div>
          </div>
          <div id="ap-step" style="font-size:11px;color:var(--tx3);margin-top:10px">1/5 단계</div>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    // 닫기 버튼 (10초 후 표시)
    setTimeout(() => {
      const cb = document.getElementById('ap-close');
      if (cb) { cb.style.display = 'block'; cb.onclick = () => { overlay.remove(); }; }
    }, 10000);
    // 타임아웃 안전장치 (2분)
    const safetyTimeout = setTimeout(() => {
      if (document.getElementById('analyze-progress')) {
        overlay.remove();
        UI.toast('시간이 초과되었습니다. 다시 시도해주세요.', 'error');
      }
    }, 120000);

    let progressTimer = null;

    function removeOverlay() {
      clearTimeout(safetyTimeout);
      if (progressTimer) clearInterval(progressTimer);
      const el = document.getElementById('analyze-progress');
      if (el) el.remove();
    }

    function updateProgress(pct, icon, title, desc, step) {
      const el = document.getElementById('analyze-progress');
      if (!el) return;
      const bar = document.getElementById('ap-bar');
      if (bar) bar.style.width = pct + '%';
      const ic = document.getElementById('ap-icon');
      if (ic) ic.textContent = icon;
      const ti = document.getElementById('ap-title');
      if (ti) ti.textContent = title;
      const de = document.getElementById('ap-desc');
      if (de) de.textContent = desc;
      const st = document.getElementById('ap-step');
      if (st) st.textContent = step;
    }

    try {
      // Step 1: 제품 등록
      updateProgress(10, '📦', '제품 등록 중...', '데이터베이스에 제품을 등록하고 있습니다', '1/5 단계');

      let productName = name;
      if (!productName && url) {
        try { productName = new URL(url).hostname + ' 제품'; } catch(_) { productName = '제품'; }
      }
      if (!productName) productName = '직접 등록 제품';

      const product = await Setup.createProduct({
        name: productName,
        url: url || null,
        category: category || null,
        fob_price: fob || null,
        images: image ? [image] : []
      });

      // If not first and not subscribed, charge
      if (!isFirst && !S.sub) {
        removeOverlay();
        try {
          await Pay.payOnce(9900, 'AI 수출 분석 - ' + (product.name || 'Product'), 'NARU-A-' + product.id.slice(0, 8) + '-' + Date.now());
          return;
        } catch (payErr) {
          UI.toast('결제 오류: ' + UI.err(payErr), 'error');
          return;
        }
      }

      // Step 2: URL 크롤링
      updateProgress(25, '🌐', 'URL 크롤링 중...', url ? url.slice(0, 50) + '...' : '제품 정보를 수집합니다', '2/5 단계');
      await sb.from('products').update({ status: 'analyzing' }).eq('id', product.id);
      product.status = 'analyzing';
      notify();

      // Step 3: AI 분석 시작
      updateProgress(40, '🤖', 'AI 분석 진행 중...', '3명의 수출 전문가 패널이 분석하고 있습니다 (약 30초~1분 소요)', '3/5 단계');

      // 진행 바 애니메이션 (분석 중 서서히 증가)
      progressTimer = setInterval(() => {
        const bar = document.getElementById('ap-bar');
        if (!bar) { clearInterval(progressTimer); progressTimer = null; return; }
        const w = parseFloat(bar.style.width);
        if (w < 85) bar.style.width = (w + 0.5) + '%';
      }, 500);

      const result = await API.analyzeProduct(product.id);
      if (progressTimer) { clearInterval(progressTimer); progressTimer = null; }

      // Step 4: 결과 저장
      updateProgress(90, '💾', '결과 저장 중...', '분석 리포트를 생성하고 있습니다', '4/5 단계');
      await Auth.loadProfile();

      // Step 5: 완료
      updateProgress(100, '✅', '분석 완료!', '수출 적합도 리포트가 준비되었습니다', '5/5 단계');
      await new Promise(r => setTimeout(r, 800));

      removeOverlay();
      UI.toast('분석 완료!', 'success');
      Router.go('analyze', { pid: product.id });
      notify();
    } catch (err) {
      console.error('분석 오류:', err);
      removeOverlay();
      UI.toast(UI.err(err), 'error');
    }
  },

  renderReport(pid) {
    const product = S.products.find(p => p.id === pid);
    const analysis = S.analyses.find(a => a.product_id === pid);

    if (!product) return '<div style="padding:40px;text-align:center;color:var(--tx2)">제품을 찾을 수 없습니다.</div>';
    if (!analysis) return '<div style="padding:40px;text-align:center;color:var(--tx2)">분석 결과가 없습니다.</div>';

    const r = analysis.result || {};
    let h = '';

    // Back button
    h += `<button onclick="Router.go('analyze')" class="btn btn-ghost btn-sm" style="margin-bottom:16px">&larr; 분석 목록</button>`;

    // Header
    h += '<div class="card" style="margin-bottom:20px">';
    h += '<div style="display:flex;align-items:center;gap:16px">';
    if (product.images && product.images[0]) {
      h += `<img src="${product.images[0]}" style="width:72px;height:72px;border-radius:12px;object-fit:cover">`;
    }
    h += '<div style="flex:1">';
    h += `<h2 style="font-size:20px;font-weight:800;color:#fff">${product.name}</h2>`;
    if (product.category) h += `<div style="font-size:13px;color:var(--tx2);margin-top:2px">${product.category}</div>`;
    h += `<div style="font-size:12px;color:var(--tx3);margin-top:4px">${UI.date(analysis.created_at)} 분석</div>`;
    h += '</div>';
    h += `<div class="score-circle" style="border-color:${UI.scoreColor(analysis.score)}">${analysis.score}</div>`;
    h += '</div>';

    // Executive summary
    if (r.executive_summary) {
      h += `<div style="margin-top:16px;padding:16px;background:var(--s2);border-radius:var(--radius);font-size:14px;color:var(--tx);line-height:1.8">${r.executive_summary}</div>`;
    }
    h += '</div>'; // card

    // Judgment - recommended markets
    if (r.recommended_markets && r.recommended_markets.length) {
      h += '<div class="report-section">';
      h += '<div class="report-header"><h2>추천 수출 시장</h2></div>';
      h += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px">';
      r.recommended_markets.forEach((m, i) => {
        const name = m.country || m.market || m;
        const score = m.score || m.suitability || '';
        const reason = m.reason || m.key_factor || '';
        h += '<div class="card" style="padding:16px">';
        h += `<div style="font-size:12px;color:var(--pri);font-weight:700;margin-bottom:4px">#${i + 1}</div>`;
        h += `<div style="font-size:16px;font-weight:800;color:#fff;margin-bottom:4px">${typeof name === 'string' ? name : JSON.stringify(name)}</div>`;
        if (score) h += `<div style="font-size:13px;color:var(--grn);font-weight:700;margin-bottom:4px">${score}${typeof score === 'number' ? '점' : ''}</div>`;
        if (reason) h += `<div style="font-size:12px;color:var(--tx2)">${UI.trunc(typeof reason === 'string' ? reason : JSON.stringify(reason), 100)}</div>`;
        h += '</div>';
      });
      h += '</div></div>';
    }

    // FTA / Tariff
    if (r.fta_analysis || r.tariff_analysis) {
      const fta = r.fta_analysis || r.tariff_analysis || {};
      h += '<div class="report-section">';
      h += '<div class="report-header"><h2>관세 · FTA 분석</h2></div>';
      h += '<div class="card" style="padding:16px">';
      if (r.hs_code) h += `<div style="margin-bottom:8px">HS코드: <b style="color:#fff">${r.hs_code}</b></div>`;
      if (typeof fta === 'object' && !Array.isArray(fta)) {
        h += '<table class="tbl"><tr><th>국가</th><th>일반 관세</th><th>FTA 관세</th><th>절감액</th></tr>';
        Object.entries(fta).forEach(([country, data]) => {
          if (typeof data === 'object') {
            h += `<tr><td>${country}</td><td>${data.general || data.mfn || '-'}</td><td style="color:var(--grn)">${data.fta || data.preferential || '-'}</td><td>${data.savings || '-'}</td></tr>`;
          }
        });
        h += '</table>';
      } else if (typeof fta === 'string') {
        h += `<p style="font-size:13px;color:var(--tx)">${fta}</p>`;
      }
      h += '</div></div>';
    }

    // Competitor analysis
    if (r.competitor_analysis || r.competitors) {
      const comp = r.competitor_analysis || r.competitors || [];
      h += '<div class="report-section">';
      h += '<div class="report-header"><h2>경쟁사 분석</h2></div>';
      h += '<div class="card" style="padding:16px">';
      if (Array.isArray(comp)) {
        h += '<table class="tbl"><tr><th>경쟁사</th><th>강점</th><th>약점</th></tr>';
        comp.slice(0, 5).forEach(c => {
          h += `<tr><td style="color:#fff;font-weight:600">${c.name || c.company || '-'}</td><td>${c.strengths || c.strength || '-'}</td><td>${c.weaknesses || c.weakness || '-'}</td></tr>`;
        });
        h += '</table>';
      } else if (typeof comp === 'string') {
        h += `<p style="font-size:13px;color:var(--tx)">${comp}</p>`;
      }
      h += '</div></div>';
    }

    // Required certifications
    if (r.required_certs || r.certifications) {
      const certs = r.required_certs || r.certifications || [];
      h += '<div class="report-section">';
      h += '<div class="report-header"><h2>필요 인증</h2></div>';
      h += '<div style="display:flex;flex-wrap:wrap;gap:8px">';
      (Array.isArray(certs) ? certs : [certs]).forEach(c => {
        const name = typeof c === 'string' ? c : (c.name || c.cert || JSON.stringify(c));
        h += `<div style="padding:8px 16px;background:var(--s1);border:1px solid var(--bd);border-radius:var(--radius-sm);font-size:13px;color:var(--tx)">${name}</div>`;
      });
      h += '</div></div>';
    }

    // Action buttons
    h += '<div style="display:flex;gap:10px;margin-top:24px;flex-wrap:wrap">';
    h += `<button onclick="Analyze.downloadPdf('${pid}')" class="btn btn-pri">PDF 다운로드</button>`;
    h += `<button onclick="Analyze.requestAlibaba('${pid}')" class="btn btn-ghost" style="border-color:rgba(249,115,22,.3);color:var(--org)">알리바바 입점 의뢰</button>`;
    h += `<button onclick="Pipeline.startAnalysis('${pid}')" class="btn btn-ghost">재분석</button>`;
    h += '</div>';

    return h;
  },

  async downloadPdf(pid) {
    UI.toast('PDF 생성 중...', 'info');
    // Will implement with html2canvas + jsPDF
    setTimeout(() => UI.toast('PDF 다운로드 기능은 곧 지원됩니다.', 'warn'), 1000);
  },

  async requestAlibaba(pid) {
    const product = S.products.find(p => p.id === pid);
    if (!product) return;

    let body = '';
    body += '<p style="font-size:14px;color:var(--tx);margin-bottom:16px">알리바바닷컴에 제품을 등록하고 해외 바이어를 만나보세요.</p>';

    body += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">';

    // Reseller option
    body += '<div style="padding:16px;background:var(--s2);border:2px solid var(--bd);border-radius:var(--radius);cursor:pointer" onclick="Analyze._selectAliType(this,\'reseller\')" id="ali-opt-reseller">';
    body += `<div style="font-size:14px;font-weight:700;color:var(--org);margin-bottom:4px">총판운영</div>`;
    body += `<div style="font-size:22px;font-weight:900;color:#fff;margin-bottom:6px">커미션 기반</div>`;
    body += '<ul style="list-style:none;font-size:12px;color:var(--tx2)">';
    body += '<li>✓ 알리바바 계정 불필요</li>';
    body += '<li>✓ GGS 비용 부담 없음</li>';
    body += '<li>✓ 모티브 스토어에 등록</li>';
    body += '<li>✓ 거래 시 커미션 정산</li>';
    body += '</ul></div>';

    // Agency option
    body += '<div style="padding:16px;background:var(--s2);border:2px solid var(--bd);border-radius:var(--radius);cursor:pointer" onclick="Analyze._selectAliType(this,\'agency\')" id="ali-opt-agency">';
    body += `<div style="font-size:14px;font-weight:700;color:var(--acc);margin-bottom:4px">운영대행</div>`;
    body += `<div style="font-size:22px;font-weight:900;color:#fff;margin-bottom:6px">$2,500~</div>`;
    body += '<ul style="list-style:none;font-size:12px;color:var(--tx2)">';
    body += '<li>✓ 자체 알리바바 계정</li>';
    body += '<li>✓ BASIC($2,500) / PLUS($4,500)</li>';
    body += '<li>✓ 전용 미니사이트</li>';
    body += '<li>✓ 상품등록 + 광고 + 운영</li>';
    body += '</ul></div>';

    body += '</div>';

    body += '<input type="hidden" id="ali-type-input" value="">';
    body += `<button onclick="Analyze._submitAliRequest('${pid}')" class="btn btn-pri" style="width:100%">의뢰하기</button>`;

    UI.modal('알리바바 입점 의뢰 — ' + product.name, body, { width: '600px' });
  },

  _selectedAliType: null,

  _selectAliType(el, type) {
    Analyze._selectedAliType = type;
    document.getElementById('ali-opt-reseller').style.borderColor = type === 'reseller' ? 'var(--org)' : 'var(--bd)';
    document.getElementById('ali-opt-agency').style.borderColor = type === 'agency' ? 'var(--acc)' : 'var(--bd)';
  },

  async _submitAliRequest(pid) {
    if (!Analyze._selectedAliType) {
      UI.toast('서비스 유형을 선택해주세요.', 'warn');
      return;
    }

    // Update product with alibaba type
    await sb.from('products').update({ alibaba_type: Analyze._selectedAliType }).eq('id', pid);
    const p = S.products.find(x => x.id === pid);
    if (p) p.alibaba_type = Analyze._selectedAliType;

    // Create alibaba contract record
    await sb.from('alibaba_contracts').insert({
      company_id: S.company.id,
      service_type: Analyze._selectedAliType,
      amount: Analyze._selectedAliType === 'reseller' ? 0 : 2500,
      status: 'pending'
    });

    // Close modal
    document.querySelectorAll('[id^="naru-modal"]').forEach(el => el.remove());
    UI.toast(Analyze._selectedAliType === 'reseller' ? '총판운영 의뢰가 접수되었습니다.' : '운영대행 의뢰가 접수되었습니다. 상담 후 결제가 진행됩니다.', 'success');
    notify();
  }
};

window.Analyze = Analyze;
