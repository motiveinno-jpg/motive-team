/**
 * NARU Analyze — Product registration + AI analysis + premium report
 * Revenue generator #1. 프리미엄 분석 리포트.
 */

/* ═══════════════════════════════════════════
   HELPER FUNCTIONS
   ═══════════════════════════════════════════ */
const _A = {
  flag(code) {
    const F = {US:'🇺🇸',JP:'🇯🇵',CN:'🇨🇳',DE:'🇩🇪',GB:'🇬🇧',FR:'🇫🇷',VN:'🇻🇳',TH:'🇹🇭',SG:'🇸🇬',MY:'🇲🇾',ID:'🇮🇩',PH:'🇵🇭',IN:'🇮🇳',AU:'🇦🇺',CA:'🇨🇦',KR:'🇰🇷',NL:'🇳🇱',IT:'🇮🇹',ES:'🇪🇸',BR:'🇧🇷',MX:'🇲🇽',SA:'🇸🇦',AE:'🇦🇪',TW:'🇹🇼'};
    return F[code] || '🌐';
  },
  countryName(code) {
    const N = {US:'미국',JP:'일본',CN:'중국',DE:'독일',GB:'영국',FR:'프랑스',VN:'베트남',TH:'태국',SG:'싱가포르',MY:'말레이시아',ID:'인도네시아',PH:'필리핀',IN:'인도',AU:'호주',CA:'캐나다',KR:'한국',NL:'네덜란드',IT:'이탈리아',ES:'스페인',BR:'브라질',MX:'멕시코',SA:'사우디',AE:'UAE',TW:'대만'};
    return N[code] || code;
  },
  scoreBar(label, score, color) {
    const s = typeof score === 'number' ? score : 50;
    const c = color || UI.scoreColor(s);
    return `<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
      <div style="width:100px;font-size:12px;color:var(--tx2);flex-shrink:0">${label}</div>
      <div style="flex:1;height:8px;background:var(--s3);border-radius:4px;overflow:hidden">
        <div style="width:${s}%;height:100%;background:${c};border-radius:4px;transition:width .6s ease"></div>
      </div>
      <div style="width:36px;text-align:right;font-size:13px;font-weight:700;color:${c}">${s}</div>
    </div>`;
  },
  scoreGauge(score) {
    const s = score || 0;
    const c = UI.scoreColor(s);
    const deg = (s / 100) * 270;
    const grade = s >= 85 ? 'A+' : s >= 75 ? 'A' : s >= 65 ? 'B+' : s >= 55 ? 'B' : s >= 45 ? 'C' : 'D';
    const gradeLabel = s >= 80 ? '우수' : s >= 65 ? '양호' : s >= 50 ? '보통' : '미흡';
    return `<div style="position:relative;width:160px;height:160px;margin:0 auto">
      <svg viewBox="0 0 120 120" style="width:160px;height:160px;transform:rotate(-225deg)">
        <circle cx="60" cy="60" r="50" fill="none" stroke="var(--s3)" stroke-width="10" stroke-dasharray="235.6" stroke-dashoffset="47.1" stroke-linecap="round"/>
        <circle cx="60" cy="60" r="50" fill="none" stroke="${c}" stroke-width="10" stroke-dasharray="235.6" stroke-dashoffset="${235.6 - (deg / 270) * 188.5}" stroke-linecap="round" style="transition:stroke-dashoffset 1s ease"/>
      </svg>
      <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">
        <div style="font-size:36px;font-weight:900;color:#fff;line-height:1">${s}</div>
        <div style="font-size:14px;font-weight:700;color:${c};margin-top:2px">${grade}</div>
        <div style="font-size:11px;color:var(--tx3)">${gradeLabel}</div>
      </div>
    </div>`;
  },
  section(title, icon, content) {
    return `<div class="card" style="margin-bottom:16px">
      <div style="padding:20px 24px 16px;display:flex;align-items:center;gap:10px;border-bottom:1px solid var(--bd)">
        <span style="font-size:20px">${icon}</span>
        <h3 style="font-size:16px;font-weight:800;color:#fff">${title}</h3>
      </div>
      <div style="padding:20px 24px">${content}</div>
    </div>`;
  },
  kvRow(label, value, highlight) {
    if (!value || value === 'N/A') return '';
    const vc = highlight ? 'color:#fff;font-weight:700' : 'color:var(--tx)';
    return `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--s3)">
      <span style="font-size:13px;color:var(--tx2)">${label}</span>
      <span style="font-size:13px;${vc}">${value}</span>
    </div>`;
  },
  pestelBar(label, score) {
    const raw = typeof score === 'number' ? score : 50;
    const s = Math.max(1, Math.min(5, raw > 5 ? Math.round(raw / 20) : raw));
    const colors = ['','#ef4444','#f97316','#eab308','#22c55e','#3b82f6'];
    const labels = ['','매우 불리','불리','보통','유리','매우 유리'];
    return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
      <div style="width:60px;font-size:12px;color:var(--tx2);font-weight:600">${label}</div>
      <div style="display:flex;gap:3px;flex:1">${[1,2,3,4,5].map(i =>
        `<div style="flex:1;height:6px;border-radius:3px;background:${i <= s ? colors[s] : 'var(--s3)'}"></div>`
      ).join('')}</div>
      <div style="width:60px;font-size:11px;color:${colors[s]};text-align:right">${labels[s]} (${raw})</div>
    </div>`;
  },
  safe(v) { return typeof v === 'string' ? v : (v ? JSON.stringify(v) : ''); }
};

/* ═══════════════════════════════════════════
   ROUTE: /analyze
   ═══════════════════════════════════════════ */
Router.register('analyze', function(state) {
  const params = state._routeParams || {};
  const pid = params.pid;
  if (pid) return Analyze.renderReport(pid);

  let h = '';
  h += '<div style="display:flex;align-items:center;gap:12px;margin-bottom:24px">';
  h += '<h2 style="font-size:20px;font-weight:800;color:#fff;flex:1">AI 수출 분석</h2>';
  h += `<span style="font-size:13px;color:var(--tx2)">분석 ${state.analyses.length}건</span>`;
  h += '</div>';

  // Registration card
  h += '<div class="card" style="margin-bottom:24px">';
  h += '<div class="card-header"><h3 class="card-title">새 제품 등록</h3></div>';
  h += '<form id="product-form" onsubmit="Analyze.submitProduct(event)">';
  h += '<div class="form-group">';
  h += '<label class="form-label">제품 URL (네이버, 쿠팡, 자사몰 등)</label>';
  h += '<div style="display:flex;gap:8px">';
  h += '<input name="url" type="url" class="form-input" placeholder="https://smartstore.naver.com/..." style="flex:1">';
  h += '<button type="submit" class="btn btn-pri">분석 시작</button>';
  h += '</div>';
  h += '<p style="font-size:11px;color:var(--tx3);margin-top:4px">URL을 입력하면 AI가 자동으로 제품 정보를 수집합니다.</p>';
  h += '</div>';
  h += '<details style="margin-top:12px">';
  h += '<summary style="font-size:13px;color:var(--pri);cursor:pointer;font-weight:600">직접 입력하기</summary>';
  h += '<div style="padding-top:16px;display:grid;grid-template-columns:1fr 1fr;gap:14px">';
  h += '<div class="form-group"><label class="form-label">제품명 *</label><input name="name" class="form-input" placeholder="유기농 꿀 세트"></div>';
  h += '<div class="form-group"><label class="form-label">카테고리</label><select name="category" class="form-input"><option value="">선택</option><option>식품</option><option>화장품/뷰티</option><option>건강기능식품</option><option>생활용품</option><option>전자/IT</option><option>패션/의류</option><option>산업자재</option><option>기타</option></select></div>';
  h += '<div class="form-group"><label class="form-label">예상 FOB 단가 (USD)</label><input name="fob" type="number" step="0.01" class="form-input" placeholder="12.50"></div>';
  h += '<div class="form-group"><label class="form-label">제품 이미지 URL</label><input name="image" type="url" class="form-input" placeholder="https://..."></div>';
  h += '</div></details>';
  h += '</form>';

  if (state.analyses.length === 0) {
    h += '<div style="margin-top:12px;padding:10px 16px;background:var(--grn-bg);border-radius:var(--radius-sm);display:flex;align-items:center;gap:8px">';
    h += '<span style="font-size:18px">🎁</span>';
    h += '<span style="font-size:13px;color:var(--grn);font-weight:700">첫 번째 분석은 무료입니다!</span>';
    h += '</div>';
  }
  h += '</div>';

  // Analysis list
  if (state.analyses.length > 0) {
    h += '<h3 style="font-size:16px;font-weight:700;color:#fff;margin-bottom:12px">분석 이력</h3>';
    h += '<div style="display:grid;gap:10px">';
    state.analyses.forEach(a => {
      const p = state.products.find(x => x.id === a.product_id);
      const pName = a.product_name || (p ? p.name : '제품');
      const r = a.ai_result || a.result || {};
      h += `<div class="card" style="padding:16px;cursor:pointer" onclick="Router.go('analyze',{pid:'${a.product_id}'})">`;
      h += '<div style="display:flex;align-items:center;gap:12px">';
      if (r.thumbnail) {
        h += `<img src="${r.thumbnail}" style="width:48px;height:48px;border-radius:8px;object-fit:cover">`;
      } else if (p && p.images && p.images[0]) {
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
      if (r.recommended_markets && r.recommended_markets.length) {
        h += '<div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">';
        r.recommended_markets.slice(0, 3).forEach(m => {
          const code = typeof m === 'string' ? m : (m.country || m);
          h += `<span style="font-size:11px;padding:3px 8px;background:var(--s3);border-radius:12px;color:var(--tx)">${_A.flag(code)} ${_A.countryName(code)}</span>`;
        });
        h += '</div>';
      }
      h += '</div>';
    });
    h += '</div>';
  }
  return h;
});

/* ═══════════════════════════════════════════
   PREMIUM REPORT
   ═══════════════════════════════════════════ */
const Analyze = {
  renderReport(pid) {
    const product = S.products.find(p => p.id === pid);
    const analysis = S.analyses.find(a => a.product_id === pid);
    if (!product && !analysis) return '<div style="padding:40px;text-align:center;color:var(--tx2)">제품을 찾을 수 없습니다.</div>';
    if (!analysis) return '<div style="padding:40px;text-align:center;color:var(--tx2)">분석 결과가 없습니다.</div>';

    const r = analysis.ai_result || analysis.result || {};
    const score = analysis.score || r.overall_score || 0;
    const pName = (product && product.name) || analysis.product_name || r.crawled_product_name || '제품';
    let h = '';

    // Back
    h += `<button onclick="Router.go('analyze')" class="btn btn-ghost btn-sm" style="margin-bottom:16px">&larr; 분석 목록</button>`;

    /* ── 1. HEADER + SCORE OVERVIEW ── */
    h += '<div class="card" style="margin-bottom:16px">';
    h += '<div style="padding:24px;display:flex;gap:24px;flex-wrap:wrap">';

    // Left: product info
    h += '<div style="flex:1;min-width:240px">';
    if (r.thumbnail || (product && product.images && product.images[0])) {
      h += `<img src="${r.thumbnail || product.images[0]}" style="width:100%;max-height:180px;object-fit:cover;border-radius:12px;margin-bottom:14px">`;
    }
    h += `<h2 style="font-size:22px;font-weight:900;color:#fff;margin-bottom:6px;line-height:1.3">${pName}</h2>`;
    if (r.input_data?.category) h += `<div style="font-size:13px;color:var(--pri);font-weight:600;margin-bottom:4px">${r.input_data.category}</div>`;
    h += `<div style="font-size:12px;color:var(--tx3)">${UI.date(analysis.created_at)} 분석 · ${r.model_used || ''} · v${r.analysis_version || ''}</div>`;
    if (r.hs_code && r.hs_code !== '0000.00') h += `<div style="font-size:12px;color:var(--tx2);margin-top:6px">HS코드: <b style="color:#fff">${r.hs_code}</b></div>`;
    if (r.estimated_fob && r.estimated_fob !== 'N/A') h += `<div style="font-size:12px;color:var(--tx2)">예상 FOB: <b style="color:var(--grn)">${r.estimated_fob}</b></div>`;

    // Product detail
    const pd = r.product_detail;
    if (pd) {
      if (pd.actual_name) h += `<div style="font-size:12px;color:var(--tx2);margin-top:4px">실제 제품명: ${pd.actual_name}</div>`;
      if (pd.retail_price) h += `<div style="font-size:12px;color:var(--tx2)">소비자가: ${pd.retail_price}</div>`;
      if (pd.unique_features) h += `<div style="font-size:12px;color:var(--tx2)">특장점: ${pd.unique_features}</div>`;
    }
    h += '</div>';

    // Right: score gauge + bars
    h += '<div style="width:280px;flex-shrink:0">';
    h += _A.scoreGauge(score);
    h += '<div style="margin-top:20px">';
    h += _A.scoreBar('시장 적합도', r.market_fit);
    h += _A.scoreBar('경쟁 우위', r.competition);
    h += _A.scoreBar('규제 환경', r.regulatory);
    h += _A.scoreBar('가격 경쟁력', r.price_competitiveness);
    h += _A.scoreBar('브랜드 파워', r.brand_power);
    h += _A.scoreBar('물류 효율', r.logistics_score);
    h += '</div></div>';
    h += '</div>'; // flex

    // Executive Summary
    const es = r.executive_summary;
    if (es) {
      h += '<div style="padding:0 24px 24px">';
      h += '<div style="background:linear-gradient(135deg,rgba(99,102,241,.1),rgba(168,85,247,.1));border:1px solid rgba(99,102,241,.2);border-radius:12px;padding:20px">';
      if (typeof es === 'object') {
        if (es.situation) h += `<div style="margin-bottom:10px"><span style="font-size:11px;font-weight:800;color:var(--pri);letter-spacing:.5px">상황</span><p style="font-size:14px;color:var(--tx);line-height:1.7;margin-top:4px">${es.situation}</p></div>`;
        if (es.complication) h += `<div style="margin-bottom:10px"><span style="font-size:11px;font-weight:800;color:var(--org);letter-spacing:.5px">과제</span><p style="font-size:14px;color:var(--tx);line-height:1.7;margin-top:4px">${es.complication}</p></div>`;
        if (es.resolution) h += `<div><span style="font-size:11px;font-weight:800;color:var(--grn);letter-spacing:.5px">해결</span><p style="font-size:14px;color:var(--tx);line-height:1.7;margin-top:4px">${es.resolution}</p></div>`;
      } else {
        h += `<p style="font-size:14px;color:var(--tx);line-height:1.8">${es}</p>`;
      }
      h += '</div></div>';
    } else if (r.summary) {
      h += `<div style="padding:0 24px 24px"><p style="font-size:14px;color:var(--tx);line-height:1.8;background:var(--s2);padding:16px;border-radius:var(--radius)">${r.summary}</p></div>`;
    }
    h += '</div>'; // card

    /* ── 2. SCORE DETAILS ── */
    const sd = r.score_details;
    if (sd && typeof sd === 'object' && Object.keys(sd).length > 0) {
      let sdContent = '<div style="display:grid;gap:10px">';
      const sdMap = {overall_reason:'종합 평가',market_fit_reason:'시장 적합도',competition_reason:'경쟁 우위',regulatory_reason:'규제 환경',price_reason:'가격 경쟁력',brand_reason:'브랜드 파워',logistics_reason:'물류 효율'};
      for (const [k, label] of Object.entries(sdMap)) {
        if (sd[k]) {
          sdContent += `<div style="padding:12px 16px;background:var(--s2);border-radius:var(--radius-sm);border-left:3px solid var(--pri)">
            <div style="font-size:11px;font-weight:700;color:var(--pri);margin-bottom:4px">${label}</div>
            <div style="font-size:13px;color:var(--tx);line-height:1.6">${sd[k]}</div>
          </div>`;
        }
      }
      sdContent += '</div>';
      h += _A.section('점수 상세 분석', '🔬', sdContent);
    }

    /* ── 3. RECOMMENDED MARKETS ── */
    const mkts = r.recommended_markets;
    const mktAnalysis = r.market_analysis;
    if (mkts && mkts.length) {
      let mktContent = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px">';
      mkts.forEach((code, i) => {
        const mc = typeof code === 'string' ? code : code;
        const ma = mktAnalysis && (mktAnalysis[i] || (mktAnalysis.find && mktAnalysis.find(x => x.name === mc || x.name === _A.countryName(mc) || (x.country_profile && x.country_profile.flag === _A.flag(mc)))));
        mktContent += `<div style="background:var(--s2);border-radius:12px;padding:20px;border:1px solid var(--s3)">`;
        mktContent += `<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">`;
        mktContent += `<span style="font-size:32px">${_A.flag(mc)}</span>`;
        mktContent += `<div>
          <div style="font-size:10px;color:var(--pri);font-weight:800;letter-spacing:.5px">#${i+1} 추천 시장</div>
          <div style="font-size:18px;font-weight:900;color:#fff">${_A.countryName(mc)}</div>
        </div>`;
        mktContent += '</div>';

        if (ma) {
          if (ma.size) mktContent += `<div style="display:flex;justify-content:space-between;font-size:12px;padding:4px 0"><span style="color:var(--tx3)">시장 규모</span><span style="color:#fff;font-weight:600">${ma.size}</span></div>`;
          if (ma.grow) mktContent += `<div style="display:flex;justify-content:space-between;font-size:12px;padding:4px 0"><span style="color:var(--tx3)">성장률</span><span style="color:var(--grn);font-weight:600">${ma.grow}</span></div>`;
          if (ma.tariff) mktContent += `<div style="display:flex;justify-content:space-between;font-size:12px;padding:4px 0"><span style="color:var(--tx3)">관세</span><span style="color:var(--tx)">${ma.tariff}</span></div>`;
          if (ma.fta) mktContent += `<div style="display:flex;justify-content:space-between;font-size:12px;padding:4px 0"><span style="color:var(--tx3)">FTA</span><span style="color:var(--tx)">${ma.fta}</span></div>`;
          if (ma.entry_strategy) mktContent += `<div style="margin-top:8px;font-size:12px;color:var(--tx);line-height:1.5;padding:8px;background:var(--s3);border-radius:8px">${ma.entry_strategy}</div>`;
          if (ma.channels && ma.channels.length) mktContent += `<div style="margin-top:6px;display:flex;gap:4px;flex-wrap:wrap">${ma.channels.map(c => `<span style="font-size:10px;padding:2px 6px;background:var(--s1);border-radius:4px;color:var(--tx2)">${c}</span>`).join('')}</div>`;
          if (ma.consumer_profile) mktContent += `<div style="margin-top:6px;font-size:11px;color:var(--tx3);line-height:1.4">${ma.consumer_profile}</div>`;
        }
        mktContent += '</div>';
      });
      mktContent += '</div>';
      h += _A.section('추천 수출 시장', '🌍', mktContent);
    }

    /* ── 4. FTA / TARIFF TABLE ── */
    const fta = r.fta_tariff_table;
    if (fta && Array.isArray(fta) && fta.length) {
      let ftaContent = '';
      if (r.hs_code && r.hs_code !== '0000.00') {
        ftaContent += `<div style="margin-bottom:14px;padding:10px 14px;background:var(--s2);border-radius:8px;font-size:13px;color:var(--tx)">HS코드: <b style="color:#fff">${r.hs_code}</b>`;
        if (r.hs_code_detail?.hs6_desc) ftaContent += ` — ${r.hs_code_detail.hs6_desc}`;
        if (r.hs_code_detail?.basis) ftaContent += `<div style="font-size:11px;color:var(--tx3);margin-top:4px">분류 근거: ${r.hs_code_detail.basis}</div>`;
        ftaContent += '</div>';
      }
      ftaContent += '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px">';
      ftaContent += '<thead><tr style="border-bottom:2px solid var(--s3)">';
      ftaContent += '<th style="text-align:left;padding:10px 8px;color:var(--tx2);font-size:11px">시장</th>';
      ftaContent += '<th style="text-align:left;padding:10px 8px;color:var(--tx2);font-size:11px">FTA</th>';
      ftaContent += '<th style="text-align:center;padding:10px 8px;color:var(--tx2);font-size:11px">MFN 관세</th>';
      ftaContent += '<th style="text-align:center;padding:10px 8px;color:var(--tx2);font-size:11px">특혜 관세</th>';
      ftaContent += '<th style="text-align:center;padding:10px 8px;color:var(--tx2);font-size:11px">절감</th>';
      ftaContent += '<th style="text-align:right;padding:10px 8px;color:var(--tx2);font-size:11px">예상 물류비</th>';
      ftaContent += '</tr></thead><tbody>';
      fta.forEach(row => {
        ftaContent += `<tr style="border-bottom:1px solid var(--s3)">`;
        ftaContent += `<td style="padding:10px 8px;color:#fff;font-weight:600">${_A.flag(row.mkt)} ${_A.countryName(row.mkt)}</td>`;
        ftaContent += `<td style="padding:10px 8px;color:var(--tx)">${row.fta || '-'}</td>`;
        ftaContent += `<td style="padding:10px 8px;text-align:center;color:var(--red)">${row.mfn || '-'}</td>`;
        ftaContent += `<td style="padding:10px 8px;text-align:center;color:var(--grn);font-weight:700">${row.pref || '-'}</td>`;
        ftaContent += `<td style="padding:10px 8px;text-align:center;color:var(--acc)">${row.save || '-'}</td>`;
        ftaContent += `<td style="padding:10px 8px;text-align:right;color:var(--tx)">${row.est_logistics || '-'}</td>`;
        ftaContent += '</tr>';
      });
      ftaContent += '</tbody></table></div>';
      if (fta[0]?.rule) {
        ftaContent += `<div style="margin-top:10px;font-size:11px;color:var(--tx3)">원산지 규정: ${fta[0].rule}</div>`;
      }
      h += _A.section('관세 · FTA 분석', '📊', ftaContent);
    }

    /* ── 5. MARGIN ANALYSIS ── */
    const margin = r.margin_analysis;
    if (margin && typeof margin === 'object') {
      let mgContent = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px">';
      const mgItems = [
        {label:'FOB 원가',value:margin.fob_cost,icon:'📦'},
        {label:'Landed Cost',value:margin.landed_cost,icon:'🚢'},
        {label:'소비자가',value:margin.retail_price,icon:'🏷️'},
        {label:'총이익률',value:margin.gross_margin,icon:'💰'}
      ];
      mgItems.forEach(item => {
        if (item.value) {
          mgContent += `<div style="text-align:center;padding:16px;background:var(--s2);border-radius:12px">
            <div style="font-size:24px;margin-bottom:6px">${item.icon}</div>
            <div style="font-size:18px;font-weight:900;color:#fff">${item.value}</div>
            <div style="font-size:11px;color:var(--tx3);margin-top:4px">${item.label}</div>
          </div>`;
        }
      });
      mgContent += '</div>';
      h += _A.section('마진 분석', '💹', mgContent);
    }

    /* ── 6. COMPETITOR ANALYSIS + SWOT ── */
    const comp = r.competitor_analysis;
    if (comp && typeof comp === 'object') {
      let compContent = '';
      if (comp.overview) compContent += `<p style="font-size:14px;color:var(--tx);line-height:1.7;margin-bottom:16px">${comp.overview}</p>`;

      // Global competitors table
      const gc = comp.global_competitors;
      if (gc && Array.isArray(gc) && gc.length) {
        compContent += '<div style="overflow-x:auto;margin-bottom:16px"><table style="width:100%;border-collapse:collapse;font-size:13px">';
        compContent += '<thead><tr style="border-bottom:2px solid var(--s3)"><th style="text-align:left;padding:8px;color:var(--tx2);font-size:11px">경쟁사</th><th style="text-align:left;padding:8px;color:var(--tx2);font-size:11px">강점</th><th style="text-align:left;padding:8px;color:var(--tx2);font-size:11px">약점</th><th style="text-align:right;padding:8px;color:var(--tx2);font-size:11px">가격</th></tr></thead><tbody>';
        gc.forEach(c => {
          compContent += `<tr style="border-bottom:1px solid var(--s3)">
            <td style="padding:8px;color:#fff;font-weight:700">${c.name||'-'}</td>
            <td style="padding:8px;color:var(--grn);font-size:12px">${c.strength||'-'}</td>
            <td style="padding:8px;color:var(--red);font-size:12px">${c.weakness||'-'}</td>
            <td style="padding:8px;text-align:right;color:var(--tx)">${c.price||'-'}</td>
          </tr>`;
        });
        compContent += '</tbody></table></div>';
      }

      // SWOT
      const swot = comp.swot;
      if (swot) {
        compContent += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">';
        const swotItems = [
          {key:'strength',label:'강점 (S)',color:'#22c55e',bg:'rgba(34,197,94,.08)'},
          {key:'weakness',label:'약점 (W)',color:'#ef4444',bg:'rgba(239,68,68,.08)'},
          {key:'opportunity',label:'기회 (O)',color:'#3b82f6',bg:'rgba(59,130,246,.08)'},
          {key:'threat',label:'위협 (T)',color:'#f97316',bg:'rgba(249,115,22,.08)'}
        ];
        swotItems.forEach(s => {
          if (swot[s.key]) {
            compContent += `<div style="padding:14px;background:${s.bg};border:1px solid ${s.color}22;border-radius:10px">
              <div style="font-size:11px;font-weight:800;color:${s.color};margin-bottom:6px">${s.label}</div>
              <div style="font-size:13px;color:var(--tx);line-height:1.6">${swot[s.key]}</div>
            </div>`;
          }
        });
        compContent += '</div>';
      }
      h += _A.section('경쟁사 분석 · SWOT', '⚔️', compContent);
    }

    /* ── 7. PESTEL ── */
    const pestel = r.pestel;
    if (pestel && typeof pestel === 'object') {
      let pesContent = '';
      const pesItems = [
        {key:'political',label:'정치',icon:'🏛️'},
        {key:'economic',label:'경제',icon:'💰'},
        {key:'social',label:'사회',icon:'👥'},
        {key:'technological',label:'기술',icon:'⚡'},
        {key:'environmental',label:'환경',icon:'🌱'},
        {key:'legal',label:'법률',icon:'⚖️'}
      ];
      pesContent += '<div style="margin-bottom:16px">';
      pesItems.forEach(p => {
        const item = pestel[p.key];
        if (item) pesContent += _A.pestelBar(p.icon + ' ' + p.label, item.score);
      });
      pesContent += '</div>';
      pesContent += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">';
      pesItems.forEach(p => {
        const item = pestel[p.key];
        if (item && item.analysis) {
          pesContent += `<div style="padding:10px 12px;background:var(--s2);border-radius:8px">
            <div style="font-size:11px;font-weight:700;color:var(--tx2);margin-bottom:4px">${p.icon} ${p.label}</div>
            <div style="font-size:12px;color:var(--tx);line-height:1.5">${item.analysis}</div>
          </div>`;
        }
      });
      pesContent += '</div>';
      h += _A.section('PESTEL 분석', '🔎', pesContent);
    }

    /* ── 8. PORTER'S FIVE FORCES ── */
    const porter = r.porters_five_forces;
    if (porter && typeof porter === 'object') {
      let porContent = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px">';
      const porItems = [
        {key:'buyer_power',label:'구매자 교섭력',icon:'🛒'},
        {key:'supplier_power',label:'공급자 교섭력',icon:'🏭'},
        {key:'new_entrants',label:'신규 진입 위협',icon:'🚪'},
        {key:'substitutes',label:'대체재 위협',icon:'🔄'},
        {key:'rivalry',label:'기존 경쟁 강도',icon:'⚡'}
      ];
      porItems.forEach(p => {
        const item = porter[p.key];
        if (item) {
          const s = item.score || 50;
          const c = s >= 70 ? '#ef4444' : s >= 40 ? '#eab308' : '#22c55e';
          const lbl = s >= 70 ? '높음' : s >= 40 ? '중간' : '낮음';
          porContent += `<div style="padding:14px;background:var(--s2);border-radius:10px;border-left:3px solid ${c}">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
              <span>${p.icon}</span>
              <span style="font-size:12px;font-weight:700;color:#fff">${p.label}</span>
              <span style="margin-left:auto;font-size:11px;font-weight:700;color:${c};background:${c}15;padding:2px 8px;border-radius:4px">${lbl}</span>
            </div>
            ${item.description ? `<div style="font-size:12px;color:var(--tx);line-height:1.5">${item.description}</div>` : ''}
          </div>`;
        }
      });
      porContent += '</div>';
      h += _A.section('Porter\'s Five Forces', '🏗️', porContent);
    }

    /* ── 9. TAM / SAM / SOM ── */
    const tam = r.tam_sam_som;
    if (tam && typeof tam === 'object' && (tam.tam || tam.sam || tam.som)) {
      let tamContent = '<div style="display:flex;gap:16px;justify-content:center;align-items:flex-end;flex-wrap:wrap">';
      [{key:'tam',label:'TAM',desc:'총 시장 규모',size:'120px',color:'rgba(99,102,241,.2)',border:'var(--pri)'},
       {key:'sam',label:'SAM',desc:'접근 가능 시장',size:'100px',color:'rgba(168,85,247,.2)',border:'#a855f7'},
       {key:'som',label:'SOM',desc:'목표 시장 점유',size:'80px',color:'rgba(34,197,94,.2)',border:'var(--grn)'}
      ].forEach(t => {
        const item = tam[t.key];
        if (item) {
          tamContent += `<div style="text-align:center">
            <div style="width:${t.size};height:${t.size};border-radius:50%;background:${t.color};border:2px solid ${t.border};display:flex;flex-direction:column;align-items:center;justify-content:center;margin:0 auto 8px">
              <div style="font-size:11px;font-weight:800;color:${t.border}">${t.label}</div>
              <div style="font-size:14px;font-weight:900;color:#fff">${item.value || '-'}</div>
            </div>
            <div style="font-size:11px;color:var(--tx3)">${t.desc}</div>
            ${item.basis ? `<div style="font-size:10px;color:var(--tx3);margin-top:2px;max-width:120px">${item.basis}</div>` : ''}
          </div>`;
        }
      });
      tamContent += '</div>';
      h += _A.section('시장 규모 (TAM/SAM/SOM)', '📐', tamContent);
    }

    /* ── 10. CERTIFICATIONS ── */
    const certs = r.required_certs;
    if (certs && Array.isArray(certs) && certs.length) {
      let certContent = '<div style="display:grid;gap:8px">';
      certs.forEach(c => {
        const name = typeof c === 'string' ? c : (c.name || c.cert || JSON.stringify(c));
        certContent += `<div style="padding:12px 16px;background:var(--s2);border-radius:8px;display:flex;align-items:center;gap:10px;border-left:3px solid var(--org)">
          <span style="font-size:16px">📋</span>
          <span style="font-size:13px;color:var(--tx);flex:1">${name}</span>
        </div>`;
      });
      certContent += '</div>';
      h += _A.section('필요 인증 · 규제', '🛡️', certContent);
    }

    /* ── 11. ALIBABA SUITABILITY ── */
    const ali = r.alibaba_suitability || r.alibaba_strategy;
    if (ali && typeof ali === 'object') {
      let aliContent = '';
      if (ali.score !== undefined || ali.grade) {
        aliContent += `<div style="display:flex;align-items:center;gap:16px;margin-bottom:16px">`;
        if (ali.score !== undefined) {
          const ac = ali.score >= 80 ? 'var(--grn)' : ali.score >= 60 ? 'var(--org)' : 'var(--red)';
          aliContent += `<div style="width:60px;height:60px;border-radius:50%;border:3px solid ${ac};display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:900;color:${ac}">${ali.score}</div>`;
        }
        aliContent += `<div>`;
        if (ali.grade) aliContent += `<div style="font-size:18px;font-weight:900;color:#fff">${ali.grade}</div>`;
        if (ali.verdict) aliContent += `<div style="font-size:13px;color:var(--tx);line-height:1.5">${ali.verdict}</div>`;
        aliContent += '</div></div>';
      }
      if (ali.factors && ali.factors.length) {
        aliContent += '<div style="margin-bottom:12px">';
        ali.factors.forEach(f => {
          aliContent += `<div style="font-size:12px;color:var(--tx);padding:4px 0">• ${typeof f === 'string' ? f : JSON.stringify(f)}</div>`;
        });
        aliContent += '</div>';
      }
      if (ali.tips && ali.tips.length) {
        aliContent += '<div style="padding:12px;background:rgba(249,115,22,.08);border:1px solid rgba(249,115,22,.2);border-radius:8px">';
        aliContent += '<div style="font-size:11px;font-weight:700;color:var(--org);margin-bottom:6px">입점 팁</div>';
        ali.tips.forEach(t => {
          aliContent += `<div style="font-size:12px;color:var(--tx);padding:2px 0">• ${typeof t === 'string' ? t : JSON.stringify(t)}</div>`;
        });
        aliContent += '</div>';
      }
      if (ali.recommended_keywords && ali.recommended_keywords.length) {
        aliContent += `<div style="margin-top:12px"><div style="font-size:11px;color:var(--tx3);margin-bottom:6px">추천 키워드</div><div style="display:flex;gap:6px;flex-wrap:wrap">${ali.recommended_keywords.map(k => `<span style="font-size:11px;padding:4px 10px;background:var(--s3);border-radius:20px;color:var(--org)">${k}</span>`).join('')}</div></div>`;
      }
      h += _A.section('알리바바 적합도', '🏪', aliContent);
    }

    /* ── 12. EXPORT READINESS ── */
    const er = r.export_readiness;
    if (er && typeof er === 'object') {
      let erContent = '<div style="margin-bottom:16px">';
      const erItems = [
        {key:'documentation',label:'서류 준비'},
        {key:'certification',label:'인증 준비'},
        {key:'logistics',label:'물류 준비'},
        {key:'marketing',label:'마케팅 준비'},
        {key:'production',label:'생산 준비'}
      ];
      erItems.forEach(item => {
        const v = er[item.key];
        if (v !== undefined) erContent += _A.scoreBar(item.label, v);
      });
      erContent += '</div>';
      if (er.overall_readiness) erContent += `<div style="font-size:14px;color:#fff;font-weight:700;margin-bottom:8px">${er.overall_readiness}</div>`;
      if (er.gap_list && er.gap_list.length) {
        erContent += '<div style="padding:12px;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.15);border-radius:8px"><div style="font-size:11px;font-weight:700;color:var(--red);margin-bottom:6px">보완 필요</div>';
        er.gap_list.forEach(g => { erContent += `<div style="font-size:12px;color:var(--tx);padding:2px 0">• ${typeof g === 'string' ? g : JSON.stringify(g)}</div>`; });
        erContent += '</div>';
      }
      h += _A.section('수출 준비도', '🎯', erContent);
    }

    /* ── 13. OPPORTUNITIES + RISKS ── */
    if ((r.opportunities && r.opportunities.length) || (r.risks && r.risks.length)) {
      let orContent = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">';
      if (r.opportunities && r.opportunities.length) {
        orContent += '<div>';
        orContent += '<div style="font-size:12px;font-weight:800;color:var(--grn);margin-bottom:8px">기회 요인</div>';
        r.opportunities.forEach(o => { orContent += `<div style="padding:8px 12px;background:rgba(34,197,94,.06);border-radius:6px;font-size:13px;color:var(--tx);margin-bottom:6px;border-left:3px solid var(--grn)">✅ ${typeof o === 'string' ? o : JSON.stringify(o)}</div>`; });
        orContent += '</div>';
      }
      if (r.risks && r.risks.length) {
        orContent += '<div>';
        orContent += '<div style="font-size:12px;font-weight:800;color:var(--red);margin-bottom:8px">위험 요인</div>';
        r.risks.forEach(ri => { orContent += `<div style="padding:8px 12px;background:rgba(239,68,68,.06);border-radius:6px;font-size:13px;color:var(--tx);margin-bottom:6px;border-left:3px solid var(--red)">⚠️ ${typeof ri === 'string' ? ri : JSON.stringify(ri)}</div>`; });
        orContent += '</div>';
      }
      orContent += '</div>';
      h += _A.section('기회 · 위험', '⚡', orContent);
    }

    /* ── 14. ACTION PLAN ── */
    const ap = r.action_plan;
    if (ap && Array.isArray(ap) && ap.length) {
      let apContent = '<div style="position:relative;padding-left:24px">';
      apContent += '<div style="position:absolute;left:8px;top:0;bottom:0;width:2px;background:var(--pri)"></div>';
      ap.forEach((step, i) => {
        apContent += `<div style="position:relative;margin-bottom:16px">
          <div style="position:absolute;left:-20px;top:2px;width:12px;height:12px;border-radius:50%;background:var(--pri);border:2px solid var(--s1)"></div>
          <div style="padding:14px;background:var(--s2);border-radius:10px">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
              <span style="font-size:11px;font-weight:800;color:var(--pri)">${step.phase || 'Phase ' + (i+1)}</span>
              <span style="font-size:14px;font-weight:700;color:#fff">${step.title || ''}</span>
              ${step.estimated_cost ? `<span style="margin-left:auto;font-size:11px;color:var(--org)">${step.estimated_cost}</span>` : ''}
            </div>
            ${step.items && step.items.length ? step.items.map(it => `<div style="font-size:12px;color:var(--tx);padding:2px 0">• ${it}</div>`).join('') : ''}
            ${step.kpi ? `<div style="font-size:11px;color:var(--acc);margin-top:6px">KPI: ${step.kpi}</div>` : ''}
          </div>
        </div>`;
      });
      apContent += '</div>';
      h += _A.section('실행 계획', '🗺️', apContent);
    }

    /* ── 15. 12-WEEK ROADMAP ── */
    const roadmap = r.twelve_week_roadmap;
    if (roadmap && Array.isArray(roadmap) && roadmap.length) {
      let rmContent = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px">';
      roadmap.forEach((w, i) => {
        const period = typeof w === 'object' ? (w.week || w.period || `${i+1}주차`) : `${i+1}주차`;
        const focus = typeof w === 'object' ? (w.focus || w.title || '') : '';
        const tasks = typeof w === 'object' && Array.isArray(w.tasks) ? w.tasks : (typeof w === 'string' ? [w] : []);
        rmContent += `<div style="padding:14px;background:var(--s2);border-radius:10px;border-top:3px solid ${UI.scoreColor(30 + i * 20)}">
          <div style="font-size:11px;font-weight:800;color:var(--pri)">${period}</div>
          ${focus ? `<div style="font-size:13px;font-weight:700;color:#fff;margin-top:4px">${focus}</div>` : ''}
          ${tasks.length ? '<div style="margin-top:6px">' + tasks.map(t => `<div style="font-size:11px;color:var(--tx);padding:2px 0">• ${t}</div>`).join('') + '</div>' : ''}
        </div>`;
      });
      rmContent += '</div>';
      h += _A.section('12주 로드맵', '📅', rmContent);
    }

    /* ── 16. GOVERNMENT SUPPORT ── */
    const gov = r.government_support;
    if (gov && typeof gov === 'object') {
      let govContent = '<div style="display:grid;gap:10px">';
      if (gov.export_voucher) {
        govContent += `<div style="padding:14px;background:rgba(59,130,246,.08);border:1px solid rgba(59,130,246,.15);border-radius:10px">
          <div style="font-size:11px;font-weight:800;color:#3b82f6;margin-bottom:4px">수출바우처</div>
          <div style="font-size:13px;color:var(--tx);line-height:1.6">${gov.export_voucher}</div>
        </div>`;
      }
      if (gov.kotra_support) {
        govContent += `<div style="padding:14px;background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.15);border-radius:10px">
          <div style="font-size:11px;font-weight:800;color:var(--grn);margin-bottom:4px">KOTRA 지원</div>
          <div style="font-size:13px;color:var(--tx);line-height:1.6">${gov.kotra_support}</div>
        </div>`;
      }
      if (gov.estimated_subsidy) {
        govContent += `<div style="padding:14px;background:rgba(168,85,247,.08);border:1px solid rgba(168,85,247,.15);border-radius:10px">
          <div style="font-size:11px;font-weight:800;color:#a855f7;margin-bottom:4px">예상 보조금</div>
          <div style="font-size:18px;font-weight:900;color:#fff">${gov.estimated_subsidy}</div>
        </div>`;
      }
      govContent += '</div>';
      h += _A.section('정부 지원', '🏛️', govContent);
    }

    /* ── 17. LOGISTICS ── */
    const logistics = r.logistics;
    if (logistics && typeof logistics === 'object') {
      let logContent = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px">';
      if (logistics.method) logContent += `<div style="text-align:center;padding:14px;background:var(--s2);border-radius:10px"><div style="font-size:20px;margin-bottom:6px">🚢</div><div style="font-size:11px;color:var(--tx3)">운송 방법</div><div style="font-size:14px;font-weight:700;color:#fff;margin-top:2px">${logistics.method}</div></div>`;
      if (logistics.cost_per_unit) logContent += `<div style="text-align:center;padding:14px;background:var(--s2);border-radius:10px"><div style="font-size:20px;margin-bottom:6px">💵</div><div style="font-size:11px;color:var(--tx3)">단위 물류비</div><div style="font-size:14px;font-weight:700;color:#fff;margin-top:2px">${logistics.cost_per_unit}</div></div>`;
      if (logistics.lead_time) logContent += `<div style="text-align:center;padding:14px;background:var(--s2);border-radius:10px"><div style="font-size:20px;margin-bottom:6px">⏱️</div><div style="font-size:11px;color:var(--tx3)">리드타임</div><div style="font-size:14px;font-weight:700;color:#fff;margin-top:2px">${logistics.lead_time}</div></div>`;
      if (logistics.incoterms) logContent += `<div style="text-align:center;padding:14px;background:var(--s2);border-radius:10px"><div style="font-size:20px;margin-bottom:6px">📜</div><div style="font-size:11px;color:var(--tx3)">인코텀즈</div><div style="font-size:14px;font-weight:700;color:#fff;margin-top:2px">${logistics.incoterms}</div></div>`;
      logContent += '</div>';
      h += _A.section('물류 분석', '🚛', logContent);
    }

    /* ── 18. INDUSTRY TREND ── */
    const trend = r.industry_trend;
    if (trend && typeof trend === 'object') {
      let trendContent = '';
      if (trend.summary) trendContent += `<p style="font-size:14px;color:var(--tx);line-height:1.7;margin-bottom:12px">${trend.summary}</p>`;
      if (trend.key_trends && trend.key_trends.length) {
        trendContent += '<div style="display:grid;gap:6px">';
        trend.key_trends.forEach(t => {
          trendContent += `<div style="padding:8px 12px;background:var(--s2);border-radius:6px;font-size:13px;color:var(--tx);border-left:3px solid var(--acc)">📈 ${typeof t === 'string' ? t : JSON.stringify(t)}</div>`;
        });
        trendContent += '</div>';
      }
      h += _A.section('산업 트렌드', '🔮', trendContent);
    }

    /* ── 19. RISK MATRIX ── */
    const rm = r.risk_matrix;
    if (rm && Array.isArray(rm) && rm.length) {
      let rmxContent = '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px">';
      rmxContent += '<thead><tr style="border-bottom:2px solid var(--s3)"><th style="text-align:left;padding:8px;color:var(--tx2);font-size:11px">리스크</th><th style="text-align:center;padding:8px;color:var(--tx2);font-size:11px">발생 가능성</th><th style="text-align:center;padding:8px;color:var(--tx2);font-size:11px">영향도</th><th style="text-align:left;padding:8px;color:var(--tx2);font-size:11px">대응 방안</th></tr></thead><tbody>';
      rm.forEach(row => {
        const lc = row.likelihood === '높음' ? 'var(--red)' : row.likelihood === '중간' ? 'var(--org)' : 'var(--grn)';
        const ic = row.impact === '높음' ? 'var(--red)' : row.impact === '중간' ? 'var(--org)' : 'var(--grn)';
        rmxContent += `<tr style="border-bottom:1px solid var(--s3)"><td style="padding:8px;color:#fff;font-weight:600">${row.risk||'-'}</td><td style="padding:8px;text-align:center"><span style="color:${lc};font-weight:700">${row.likelihood||'-'}</span></td><td style="padding:8px;text-align:center"><span style="color:${ic};font-weight:700">${row.impact||'-'}</span></td><td style="padding:8px;color:var(--tx);font-size:12px">${row.mitigation||'-'}</td></tr>`;
      });
      rmxContent += '</tbody></table></div>';
      h += _A.section('리스크 매트릭스', '🎲', rmxContent);
    }

    /* ── 20. INCOTERMS COMPARISON ── */
    const inco = r.incoterms_comparison;
    if (inco && Array.isArray(inco) && inco.length) {
      let incoContent = '<div style="display:grid;gap:10px">';
      inco.forEach(t => {
        incoContent += `<div style="padding:14px;background:var(--s2);border-radius:10px;border-left:3px solid var(--acc)">
          <div style="font-size:14px;font-weight:800;color:#fff;margin-bottom:6px">${t.incoterm||'-'}</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px">
            <div><span style="color:var(--grn);font-weight:600">장점:</span> <span style="color:var(--tx)">${t.advantage||'-'}</span></div>
            <div><span style="color:var(--red);font-weight:600">단점:</span> <span style="color:var(--tx)">${t.disadvantage||'-'}</span></div>
            <div><span style="color:var(--tx3)">판매자:</span> <span style="color:var(--tx)">${t.seller_responsibility||'-'}</span></div>
            <div><span style="color:var(--tx3)">구매자:</span> <span style="color:var(--tx)">${t.buyer_responsibility||'-'}</span></div>
          </div>
        </div>`;
      });
      incoContent += '</div>';
      h += _A.section('인코텀즈 비교', '📜', incoContent);
    }

    /* ── 21. RECOMMENDED CHANNELS ── */
    const ch = r.recommended_channels;
    if (ch && Array.isArray(ch) && ch.length) {
      let chContent = '<div style="display:grid;gap:6px">';
      ch.forEach(c => {
        chContent += `<div style="padding:10px 14px;background:var(--s2);border-radius:8px;font-size:13px;color:var(--tx);border-left:3px solid var(--pri)">🏪 ${typeof c === 'string' ? c : JSON.stringify(c)}</div>`;
      });
      chContent += '</div>';
      h += _A.section('추천 판매 채널', '🛒', chContent);
    }

    /* ── 22. COMPETITIVE POSITIONING ── */
    const cp = r.competitive_positioning;
    if (cp && typeof cp === 'object') {
      let cpContent = '';
      if (cp.our_product) {
        const ql = cp.our_product.quality_level || 5;
        const pl = cp.our_product.price_level || 5;
        cpContent += `<div style="display:flex;gap:20px;margin-bottom:14px;flex-wrap:wrap">
          <div style="text-align:center;padding:14px 20px;background:var(--s2);border-radius:10px">
            <div style="font-size:11px;color:var(--tx3)">품질 수준</div>
            <div style="font-size:28px;font-weight:900;color:var(--grn)">${ql}<span style="font-size:14px;color:var(--tx3)">/10</span></div>
          </div>
          <div style="text-align:center;padding:14px 20px;background:var(--s2);border-radius:10px">
            <div style="font-size:11px;color:var(--tx3)">가격 수준</div>
            <div style="font-size:28px;font-weight:900;color:var(--org)">${pl}<span style="font-size:14px;color:var(--tx3)">/10</span></div>
          </div>
        </div>`;
      }
      if (cp.positioning_strategy) cpContent += `<div style="font-size:14px;color:var(--tx);line-height:1.7;padding:14px;background:var(--s2);border-radius:10px">${cp.positioning_strategy}</div>`;
      h += _A.section('경쟁 포지셔닝', '🎯', cpContent);
    }

    /* ── DATA SOURCES ── */
    if (r.data_sources && r.data_sources.length) {
      h += `<div style="margin-top:12px;font-size:11px;color:var(--tx3)">데이터 출처: ${Array.isArray(r.data_sources) ? r.data_sources.join(', ') : r.data_sources}</div>`;
    }

    /* ── ACTIONS ── */
    h += '<div style="display:flex;gap:10px;margin-top:24px;flex-wrap:wrap">';
    h += `<button onclick="Analyze.downloadPdf('${pid}')" class="btn btn-pri" style="padding:12px 24px">📄 PDF 다운로드</button>`;
    h += `<button onclick="Analyze.requestAlibaba('${pid}')" class="btn btn-ghost" style="border-color:rgba(249,115,22,.3);color:var(--org);padding:12px 24px">🏪 알리바바 입점 의뢰</button>`;
    h += `<button onclick="Pipeline.startAnalysis('${pid}')" class="btn btn-ghost" style="padding:12px 24px">🔄 재분석</button>`;
    h += '</div>';

    /* ── NEXT STEPS — 분석 후 자동 안내 ── */
    h += '<div class="card" data-next-steps style="margin-top:20px;border-color:var(--pri);background:linear-gradient(135deg,rgba(0,212,255,.05),rgba(168,85,247,.05));padding-bottom:24px">';
    h += '<div style="padding:20px 24px 12px;display:flex;align-items:center;gap:10px">';
    h += '<span style="font-size:22px">🚀</span>';
    h += '<div><div style="font-size:16px;font-weight:800;color:#fff">다음 단계로 진행하세요</div>';
    h += '<div style="font-size:12px;color:var(--tx2)">분석이 완료되었습니다. 수출을 시작하려면 아래 액션을 선택하세요.</div></div>';
    h += '</div>';
    h += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;padding:0 24px">';

    // 1. 바이어 매칭
    h += `<div onclick="Router.go('chat')" style="cursor:pointer;padding:18px;background:var(--s2);border:1px solid var(--bd);border-radius:var(--radius);transition:all .2s" onmouseover="this.style.borderColor='var(--ylw)';this.style.transform='translateY(-2px)'" onmouseout="this.style.borderColor='var(--bd)';this.style.transform='none'">`;
    h += '<div style="font-size:24px;margin-bottom:8px">🤝</div>';
    h += '<div style="font-size:14px;font-weight:700;color:#fff;margin-bottom:4px">바이어 매칭</div>';
    h += '<div style="font-size:12px;color:var(--tx2);line-height:1.5">AI가 추천한 시장의 바이어를<br>찾아 연결해 드립니다</div>';
    h += '</div>';

    // 2. 서류 생성
    h += `<div onclick="Router.go('documents')" style="cursor:pointer;padding:18px;background:var(--s2);border:1px solid var(--bd);border-radius:var(--radius);transition:all .2s" onmouseover="this.style.borderColor='var(--grn)';this.style.transform='translateY(-2px)'" onmouseout="this.style.borderColor='var(--bd)';this.style.transform='none'">`;
    h += '<div style="font-size:24px;margin-bottom:8px">📄</div>';
    h += '<div style="font-size:14px;font-weight:700;color:#fff;margin-bottom:4px">수출 서류 작성</div>';
    h += '<div style="font-size:12px;color:var(--tx2);line-height:1.5">PI / CI / PL 등 수출 서류를<br>AI가 자동 생성합니다</div>';
    h += '</div>';

    // 3. 비용 시뮬레이터
    h += `<div onclick="Router.go('cost')" style="cursor:pointer;padding:18px;background:var(--s2);border:1px solid var(--bd);border-radius:var(--radius);transition:all .2s" onmouseover="this.style.borderColor='var(--acc)';this.style.transform='translateY(-2px)'" onmouseout="this.style.borderColor='var(--bd)';this.style.transform='none'">`;
    h += '<div style="font-size:24px;margin-bottom:8px">💰</div>';
    h += '<div style="font-size:14px;font-weight:700;color:#fff;margin-bottom:4px">비용 · 마진 계산</div>';
    h += '<div style="font-size:12px;color:var(--tx2);line-height:1.5">FOB → 관세 → 물류 → 판매가<br>마진을 정밀 시뮬레이션</div>';
    h += '</div>';

    // 4. 알리바바 입점
    h += `<div onclick="Analyze.requestAlibaba('${pid}')" style="cursor:pointer;padding:18px;background:var(--s2);border:1px solid var(--bd);border-radius:var(--radius);transition:all .2s" onmouseover="this.style.borderColor='var(--org)';this.style.transform='translateY(-2px)'" onmouseout="this.style.borderColor='var(--bd)';this.style.transform='none'">`;
    h += '<div style="font-size:24px;margin-bottom:8px">🏪</div>';
    h += '<div style="font-size:14px;font-weight:700;color:#fff;margin-bottom:4px">알리바바 입점</div>';
    h += '<div style="font-size:12px;color:var(--tx2);line-height:1.5">세계 최대 B2B에 바로 입점<br>총판운영 또는 운영대행</div>';
    h += '</div>';

    h += '</div></div>'; // grid + card

    return h;
  },

  /* ═══════════════════════════════════════════
     SUBMIT PRODUCT + ANALYSIS
     ═══════════════════════════════════════════ */
  async submitProduct(e) {
    e.preventDefault();
    const f = e.target;
    const url = f.url.value.trim();
    const name = f.name ? f.name.value.trim() : '';
    const category = f.category ? f.category.value : '';
    const fob = f.fob ? parseFloat(f.fob.value) : null;
    const image = f.image ? f.image.value.trim() : '';

    if (!url && !name) { UI.toast('URL 또는 제품명을 입력해주세요.', 'warn'); return; }

    const isFirst = S.analyses.length === 0;
    if (!isFirst && !S.sub) {
      const ok = await UI.confirm('AI 분석 비용: 9,900원\n(구독 시 무제한)\n\n건당 결제하시겠습니까?');
      if (!ok) return;
    }

    // Progress overlay
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

    setTimeout(() => { const cb = document.getElementById('ap-close'); if (cb) { cb.style.display = 'block'; cb.onclick = () => overlay.remove(); } }, 10000);
    const safetyTimeout = setTimeout(() => { if (document.getElementById('analyze-progress')) { overlay.remove(); UI.toast('시간이 초과되었습니다. 다시 시도해주세요.', 'error'); } }, 120000);

    let progressTimer = null;
    function removeOverlay() { clearTimeout(safetyTimeout); if (progressTimer) clearInterval(progressTimer); const el = document.getElementById('analyze-progress'); if (el) el.remove(); }
    function updateProgress(pct, icon, title, desc, step) {
      const el = document.getElementById('analyze-progress'); if (!el) return;
      const bar = document.getElementById('ap-bar'); if (bar) bar.style.width = pct + '%';
      const ic = document.getElementById('ap-icon'); if (ic) ic.textContent = icon;
      const ti = document.getElementById('ap-title'); if (ti) ti.textContent = title;
      const de = document.getElementById('ap-desc'); if (de) de.textContent = desc;
      const st = document.getElementById('ap-step'); if (st) st.textContent = step;
    }

    try {
      updateProgress(10, '📦', '제품 등록 중...', '데이터베이스에 제품을 등록하고 있습니다', '1/5 단계');
      let productName = name;
      if (!productName && url) { try { productName = new URL(url).hostname + ' 제품'; } catch(_) { productName = '제품'; } }
      if (!productName) productName = '직접 등록 제품';

      const product = await Setup.createProduct({ name: productName, url: url || null, category: category || null, fob_price: fob || null, images: image ? [image] : [] });

      if (!isFirst && !S.sub) {
        // Try payment — if Toss key not configured, proceed with analysis (dev mode)
        const toss = await Pay.getToss();
        if (toss) {
          removeOverlay();
          try { await Pay.payOnce(9900, 'AI 수출 분석 - ' + (product.name || 'Product'), 'NARU-A-' + product.id.slice(0, 8) + '-' + Date.now()); return; } catch (payErr) { UI.toast('결제 오류: ' + UI.err(payErr), 'error'); return; }
        }
        // Toss not configured — skip payment, proceed with analysis
      }

      updateProgress(25, '🌐', 'URL 크롤링 중...', url ? url.slice(0, 50) + '...' : '제품 정보를 수집합니다', '2/5 단계');
      await sb.from('products').update({ status: 'analyzing' }).eq('id', product.id);
      product.status = 'analyzing'; notify();

      updateProgress(40, '🤖', 'AI 분석 진행 중...', '3명의 수출 전문가 패널이 분석 중 (약 30초~1분)', '3/5 단계');
      progressTimer = setInterval(() => { const bar = document.getElementById('ap-bar'); if (!bar) { clearInterval(progressTimer); progressTimer = null; return; } const w = parseFloat(bar.style.width); if (w < 85) bar.style.width = (w + 0.5) + '%'; }, 500);

      const result = await API.analyzeProduct(product.id);
      if (progressTimer) { clearInterval(progressTimer); progressTimer = null; }

      updateProgress(90, '💾', '결과 저장 중...', '분석 리포트를 생성하고 있습니다', '4/5 단계');
      await Auth.loadProfile();
      updateProgress(100, '✅', '분석 완료!', '수출 적합도 리포트가 준비되었습니다', '5/5 단계');
      await new Promise(r => setTimeout(r, 800));

      removeOverlay();
      UI.toast('분석 완료! 리포트를 확인하세요.', 'success');
      Router.go('analyze', { pid: product.id });
      notify();
      // Scroll to next-steps section after render
      setTimeout(() => {
        const el = document.querySelector('[data-next-steps]');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 500);
    } catch (err) {
      console.error('분석 오류:', err);
      removeOverlay();
      UI.toast(UI.err(err), 'error');
    }
  },

  async downloadPdf(pid) {
    const product = S.products.find(p => p.id === pid);
    const analysis = S.analyses.find(a => a.product_id === pid);
    if (!analysis || !analysis.ai_result) { UI.toast('분석 결과가 없습니다.', 'warn'); return; }

    UI.toast('PDF 생성 중...', 'info');

    // Load html2pdf.js dynamically
    if (!window.html2pdf) {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      document.head.appendChild(s);
      await new Promise((res, rej) => { s.onload = res; s.onerror = rej; });
    }

    const r = analysis.ai_result;
    const score = analysis.score || r.overall_score || 0;
    const pName = (product && product.name) || analysis.product_name || r.crawled_product_name || '제품';
    const date = new Date(analysis.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
    const company = S.company ? S.company.name : '';
    const scoreColor = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444';
    const grade = score >= 85 ? 'A+' : score >= 75 ? 'A' : score >= 65 ? 'B+' : score >= 55 ? 'B' : score >= 45 ? 'C' : 'D';

    const safe = v => typeof v === 'string' ? v : (v ? JSON.stringify(v) : '');

    let h = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
      @page { margin: 20mm 18mm 25mm 18mm; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: -apple-system, 'Noto Sans KR', sans-serif; color: #1a1a2e; font-size: 11px; line-height: 1.6; }
      .page-break { page-break-before: always; }
      .header { text-align: center; padding: 30px 0 20px; border-bottom: 3px solid #0d1b3e; margin-bottom: 24px; }
      .header .brand { font-size: 28px; font-weight: 900; color: #0d1b3e; letter-spacing: 2px; }
      .header .brand span { color: #0099cc; }
      .header .sub { font-size: 11px; color: #666; margin-top: 4px; letter-spacing: 1px; }
      .report-title { font-size: 22px; font-weight: 800; color: #0d1b3e; text-align: center; margin: 20px 0 8px; }
      .report-meta { text-align: center; font-size: 11px; color: #888; margin-bottom: 30px; }
      .section { margin-bottom: 22px; }
      .section-title { font-size: 14px; font-weight: 800; color: #0d1b3e; padding: 8px 12px; background: #f0f4f8; border-left: 4px solid #0099cc; margin-bottom: 12px; }
      .score-box { display: flex; align-items: center; justify-content: center; gap: 30px; padding: 20px; background: linear-gradient(135deg, #0d1b3e, #1a2d5a); border-radius: 12px; color: #fff; margin-bottom: 24px; }
      .score-num { font-size: 52px; font-weight: 900; }
      .score-grade { font-size: 18px; font-weight: 700; margin-top: 2px; }
      .score-bars { flex: 1; }
      .bar-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
      .bar-label { width: 70px; font-size: 10px; color: #ccc; }
      .bar-track { flex: 1; height: 6px; background: rgba(255,255,255,.15); border-radius: 3px; }
      .bar-fill { height: 100%; border-radius: 3px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 10.5px; }
      th { background: #f0f4f8; color: #0d1b3e; font-weight: 700; text-align: left; padding: 8px 10px; border-bottom: 2px solid #ddd; font-size: 10px; text-transform: uppercase; }
      td { padding: 7px 10px; border-bottom: 1px solid #eee; color: #444; }
      .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px; }
      .grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 12px; }
      .card { padding: 12px; border: 1px solid #e5e7eb; border-radius: 8px; }
      .card-title { font-size: 10px; font-weight: 700; color: #0099cc; margin-bottom: 4px; text-transform: uppercase; letter-spacing: .5px; }
      .card-value { font-size: 16px; font-weight: 800; color: #0d1b3e; }
      .card-desc { font-size: 10px; color: #888; margin-top: 4px; line-height: 1.5; }
      .tag { display: inline-block; padding: 2px 8px; background: #f0f4f8; border-radius: 4px; font-size: 9px; color: #555; margin: 2px; }
      .swot-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
      .swot-cell { padding: 10px; border-radius: 8px; }
      .swot-cell h4 { font-size: 10px; font-weight: 800; margin-bottom: 4px; }
      .swot-cell p { font-size: 10px; line-height: 1.5; color: #444; }
      .footer { text-align: center; padding: 16px 0; border-top: 2px solid #0d1b3e; margin-top: 30px; font-size: 9px; color: #888; }
      .footer .brand-f { font-weight: 800; color: #0d1b3e; font-size: 11px; }
      .disclaimer { font-size: 8.5px; color: #aaa; margin-top: 6px; line-height: 1.4; }
      .highlight { color: #0099cc; font-weight: 700; }
      .text-block { font-size: 11px; color: #444; line-height: 1.7; margin-bottom: 10px; }
      .timeline-step { display: flex; gap: 10px; margin-bottom: 10px; }
      .timeline-dot { width: 20px; height: 20px; border-radius: 50%; background: #0099cc; color: #fff; font-size: 9px; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2px; }
      .timeline-content { flex: 1; }
      .risk-high { color: #ef4444; font-weight: 700; }
      .risk-mid { color: #f59e0b; font-weight: 700; }
      .risk-low { color: #22c55e; font-weight: 700; }
    </style></head><body>`;

    // ── COVER HEADER ──
    h += `<div class="header">
      <div class="brand">NARU<span> | 나루</span></div>
      <div class="sub">AI 기반 수출 적합도 분석 리포트</div>
    </div>`;
    h += `<div class="report-title">${safe(pName)}</div>`;
    h += `<div class="report-meta">${date} 발행 · ${company ? safe(company) + ' · ' : ''}분석 버전 ${r.analysis_version || '1.0'} · ${r.model_used || 'Gemini AI'}</div>`;

    // ── SCORE OVERVIEW ──
    h += `<div class="score-box">
      <div style="text-align:center">
        <div class="score-num" style="color:${scoreColor}">${score}</div>
        <div class="score-grade" style="color:${scoreColor}">${grade}</div>
        <div style="font-size:10px;color:#aaa;margin-top:4px">수출 적합도</div>
      </div>
      <div class="score-bars">`;
    const bars = [['시장 적합도', r.market_fit],['경쟁 우위', r.competition],['규제 환경', r.regulatory],['가격 경쟁력', r.price_competitiveness],['브랜드 파워', r.brand_power],['물류 효율', r.logistics_score]];
    bars.forEach(([label, val]) => {
      const v = typeof val === 'number' ? val : 50;
      const c = v >= 70 ? '#22c55e' : v >= 50 ? '#f59e0b' : '#ef4444';
      h += `<div class="bar-row"><div class="bar-label">${label}</div><div class="bar-track"><div class="bar-fill" style="width:${v}%;background:${c}"></div></div><div style="width:24px;text-align:right;font-size:10px;color:${c};font-weight:700">${v}</div></div>`;
    });
    h += '</div></div>';

    // ── EXECUTIVE SUMMARY ──
    const es = r.executive_summary;
    if (es) {
      h += '<div class="section"><div class="section-title">Executive Summary</div>';
      if (typeof es === 'object') {
        if (es.situation) h += `<div class="text-block"><strong style="color:#0099cc">상황:</strong> ${safe(es.situation)}</div>`;
        if (es.complication) h += `<div class="text-block"><strong style="color:#f97316">과제:</strong> ${safe(es.complication)}</div>`;
        if (es.resolution) h += `<div class="text-block"><strong style="color:#22c55e">해결:</strong> ${safe(es.resolution)}</div>`;
      } else { h += `<div class="text-block">${safe(es)}</div>`; }
      h += '</div>';
    } else if (r.summary) {
      h += `<div class="section"><div class="section-title">Executive Summary</div><div class="text-block">${safe(r.summary)}</div></div>`;
    }

    // ── PRODUCT DETAIL ──
    if (r.product_detail || r.hs_code || r.estimated_fob) {
      h += '<div class="section"><div class="section-title">제품 정보</div><div class="grid3">';
      if (r.hs_code && r.hs_code !== '0000.00') h += `<div class="card"><div class="card-title">HS 코드</div><div class="card-value">${r.hs_code}</div>${r.hs_code_detail?.hs6_desc ? `<div class="card-desc">${safe(r.hs_code_detail.hs6_desc)}</div>` : ''}</div>`;
      if (r.estimated_fob && r.estimated_fob !== 'N/A') h += `<div class="card"><div class="card-title">예상 FOB</div><div class="card-value">${safe(r.estimated_fob)}</div></div>`;
      const pd = r.product_detail;
      if (pd && pd.actual_name) h += `<div class="card"><div class="card-title">제품명</div><div class="card-value" style="font-size:13px">${safe(pd.actual_name)}</div></div>`;
      h += '</div></div>';
    }

    // ── RECOMMENDED MARKETS ──
    const mkts = r.recommended_markets;
    const mktAnalysis = r.market_analysis;
    if (mkts && mkts.length) {
      h += '<div class="section"><div class="section-title">추천 수출 시장</div><div class="grid3">';
      mkts.forEach((code, i) => {
        const mc = typeof code === 'string' ? code : code;
        const ma = mktAnalysis && (mktAnalysis[i] || (mktAnalysis.find && mktAnalysis.find(x => x.name === mc || x.name === _A.countryName(mc))));
        h += `<div class="card"><div style="font-size:10px;color:#0099cc;font-weight:800">#${i+1} 추천 시장</div>`;
        h += `<div class="card-value">${_A.flag(mc)} ${_A.countryName(mc)}</div>`;
        if (ma) {
          if (ma.size) h += `<div style="display:flex;justify-content:space-between;font-size:10px;margin-top:6px"><span style="color:#888">시장 규모</span><span style="font-weight:600">${safe(ma.size)}</span></div>`;
          if (ma.grow) h += `<div style="display:flex;justify-content:space-between;font-size:10px"><span style="color:#888">성장률</span><span style="color:#22c55e;font-weight:600">${safe(ma.grow)}</span></div>`;
          if (ma.tariff) h += `<div style="display:flex;justify-content:space-between;font-size:10px"><span style="color:#888">관세</span><span>${safe(ma.tariff)}</span></div>`;
          if (ma.entry_strategy) h += `<div class="card-desc" style="margin-top:6px">${safe(ma.entry_strategy)}</div>`;
        }
        h += '</div>';
      });
      h += '</div></div>';
    }

    // ── FTA / TARIFF TABLE ──
    const fta = r.fta_tariff_table;
    if (fta && fta.length) {
      h += '<div class="section"><div class="section-title">관세 · FTA 분석</div>';
      h += '<table><thead><tr><th>시장</th><th>FTA</th><th>MFN 관세</th><th>특혜 관세</th><th>절감</th><th>예상 물류비</th></tr></thead><tbody>';
      fta.forEach(row => {
        h += `<tr><td style="font-weight:700">${_A.flag(row.mkt)} ${_A.countryName(row.mkt)}</td><td>${safe(row.fta)||'-'}</td><td style="color:#ef4444">${safe(row.mfn)||'-'}</td><td style="color:#22c55e;font-weight:700">${safe(row.pref)||'-'}</td><td style="color:#a855f7">${safe(row.save)||'-'}</td><td>${safe(row.est_logistics)||'-'}</td></tr>`;
      });
      h += '</tbody></table></div>';
    }

    // ── MARGIN ANALYSIS ──
    const margin = r.margin_analysis;
    if (margin && typeof margin === 'object') {
      h += '<div class="section"><div class="section-title">마진 분석</div><div class="grid3">';
      [{l:'FOB 원가',v:margin.fob_cost},{l:'Landed Cost',v:margin.landed_cost},{l:'소비자가',v:margin.retail_price},{l:'총이익률',v:margin.gross_margin}].forEach(item => {
        if (item.v) h += `<div class="card"><div class="card-title">${item.l}</div><div class="card-value">${safe(item.v)}</div></div>`;
      });
      h += '</div></div>';
    }

    // ── COMPETITOR + SWOT ──
    const comp = r.competitor_analysis;
    if (comp && typeof comp === 'object') {
      h += '<div class="section"><div class="section-title">경쟁사 분석 · SWOT</div>';
      if (comp.overview) h += `<div class="text-block">${safe(comp.overview)}</div>`;
      const gc = comp.global_competitors;
      if (gc && gc.length) {
        h += '<table><thead><tr><th>경쟁사</th><th>강점</th><th>약점</th><th>가격</th></tr></thead><tbody>';
        gc.forEach(c => { h += `<tr><td style="font-weight:700">${safe(c.name)||'-'}</td><td style="color:#22c55e">${safe(c.strength)||'-'}</td><td style="color:#ef4444">${safe(c.weakness)||'-'}</td><td>${safe(c.price)||'-'}</td></tr>`; });
        h += '</tbody></table>';
      }
      const swot = comp.swot;
      if (swot) {
        h += '<div class="swot-grid">';
        [{k:'strength',l:'강점 (S)',bg:'#f0fdf4',c:'#16a34a'},{k:'weakness',l:'약점 (W)',bg:'#fef2f2',c:'#dc2626'},{k:'opportunity',l:'기회 (O)',bg:'#eff6ff',c:'#2563eb'},{k:'threat',l:'위협 (T)',bg:'#fff7ed',c:'#ea580c'}].forEach(s => {
          if (swot[s.k]) h += `<div class="swot-cell" style="background:${s.bg}"><h4 style="color:${s.c}">${s.l}</h4><p>${safe(swot[s.k])}</p></div>`;
        });
        h += '</div>';
      }
      h += '</div>';
    }

    // ── PESTEL ──
    const pestel = r.pestel;
    if (pestel && typeof pestel === 'object') {
      h += '<div class="page-break"></div>';
      h += '<div class="section"><div class="section-title">PESTEL 분석</div><div class="grid2">';
      [{k:'political',l:'정치'},{k:'economic',l:'경제'},{k:'social',l:'사회'},{k:'technological',l:'기술'},{k:'environmental',l:'환경'},{k:'legal',l:'법률'}].forEach(p => {
        const item = pestel[p.k];
        if (item) {
          const raw = typeof item.score === 'number' ? item.score : 50;
          const s = raw > 5 ? Math.round(raw / 20) : raw;
          const colors = ['','#ef4444','#f97316','#eab308','#22c55e','#3b82f6'];
          const labels = ['','매우 불리','불리','보통','유리','매우 유리'];
          h += `<div class="card"><div class="card-title">${p.l}</div><div style="display:flex;gap:3px;margin:6px 0">${[1,2,3,4,5].map(i => `<div style="flex:1;height:5px;border-radius:3px;background:${i <= s ? colors[s] : '#e5e7eb'}"></div>`).join('')}</div><div style="font-size:10px;color:${colors[s]};font-weight:700;margin-bottom:4px">${labels[s]} (${raw})</div>${item.analysis ? `<div class="card-desc">${safe(item.analysis)}</div>` : ''}</div>`;
        }
      });
      h += '</div></div>';
    }

    // ── PORTER'S FIVE FORCES ──
    const porter = r.porters_five_forces;
    if (porter && typeof porter === 'object') {
      h += '<div class="section"><div class="section-title">Porter\'s Five Forces</div><div class="grid2">';
      [{k:'buyer_power',l:'구매자 교섭력'},{k:'supplier_power',l:'공급자 교섭력'},{k:'new_entrants',l:'신규 진입 위협'},{k:'substitutes',l:'대체재 위협'},{k:'rivalry',l:'기존 경쟁 강도'}].forEach(p => {
        const item = porter[p.k];
        if (item) {
          const s = item.score || 50;
          const c = s >= 70 ? '#ef4444' : s >= 40 ? '#eab308' : '#22c55e';
          h += `<div class="card" style="border-left:3px solid ${c}"><div style="display:flex;justify-content:space-between"><div class="card-title">${p.l}</div><span style="font-size:10px;font-weight:700;color:${c}">${s >= 70 ? '높음' : s >= 40 ? '중간' : '낮음'}</span></div>${item.description ? `<div class="card-desc">${safe(item.description)}</div>` : ''}</div>`;
        }
      });
      h += '</div></div>';
    }

    // ── TAM/SAM/SOM ──
    const tam = r.tam_sam_som;
    if (tam && (tam.tam || tam.sam || tam.som)) {
      h += '<div class="section"><div class="section-title">시장 규모 (TAM / SAM / SOM)</div><div class="grid3">';
      [{k:'tam',l:'TAM',d:'총 시장 규모',c:'#6366f1'},{k:'sam',l:'SAM',d:'접근 가능 시장',c:'#a855f7'},{k:'som',l:'SOM',d:'목표 시장 점유',c:'#22c55e'}].forEach(t => {
        const item = tam[t.k];
        if (item) h += `<div class="card" style="text-align:center;border-top:3px solid ${t.c}"><div style="font-size:10px;font-weight:800;color:${t.c}">${t.l}</div><div class="card-value" style="margin:6px 0">${safe(item.value)||'-'}</div><div style="font-size:9px;color:#888">${t.d}</div>${item.basis ? `<div class="card-desc">${safe(item.basis)}</div>` : ''}</div>`;
      });
      h += '</div></div>';
    }

    // ── CERTIFICATIONS ──
    const certs = r.required_certs;
    if (certs && certs.length) {
      h += '<div class="section"><div class="section-title">필요 인증 · 규제</div>';
      certs.forEach(c => { h += `<div class="tag" style="font-size:10px;padding:4px 10px;margin:3px">${typeof c === 'string' ? c : safe(c.name || c.cert || JSON.stringify(c))}</div>`; });
      h += '</div>';
    }

    // ── RISK MATRIX ──
    const rm = r.risk_matrix;
    if (rm && rm.length) {
      h += '<div class="section"><div class="section-title">리스크 매트릭스</div>';
      h += '<table><thead><tr><th>리스크</th><th>가능성</th><th>영향도</th><th>대응 방안</th></tr></thead><tbody>';
      rm.forEach(row => {
        const lc = row.likelihood === '높음' ? 'risk-high' : row.likelihood === '중간' ? 'risk-mid' : 'risk-low';
        const ic = row.impact === '높음' ? 'risk-high' : row.impact === '중간' ? 'risk-mid' : 'risk-low';
        h += `<tr><td style="font-weight:700">${safe(row.risk)||'-'}</td><td class="${lc}">${safe(row.likelihood)||'-'}</td><td class="${ic}">${safe(row.impact)||'-'}</td><td>${safe(row.mitigation)||'-'}</td></tr>`;
      });
      h += '</tbody></table></div>';
    }

    // ── ACTION PLAN ──
    const ap = r.action_plan;
    if (ap && ap.length) {
      h += '<div class="section"><div class="section-title">실행 계획</div>';
      ap.forEach((step, i) => {
        h += `<div class="timeline-step"><div class="timeline-dot">${i+1}</div><div class="timeline-content"><div style="font-size:11px;font-weight:700;color:#0d1b3e">${safe(step.phase || '')} ${safe(step.title || '')}</div>`;
        if (step.items && step.items.length) step.items.forEach(it => { h += `<div style="font-size:10px;color:#666;padding:1px 0">• ${safe(it)}</div>`; });
        if (step.estimated_cost) h += `<div style="font-size:10px;color:#f97316;margin-top:2px">${safe(step.estimated_cost)}</div>`;
        h += '</div></div>';
      });
      h += '</div>';
    }

    // ── OPPORTUNITIES & RISKS ──
    if ((r.opportunities && r.opportunities.length) || (r.risks && r.risks.length)) {
      h += '<div class="section"><div class="section-title">기회 · 위험 요인</div><div class="grid2">';
      if (r.opportunities && r.opportunities.length) {
        h += '<div>';
        r.opportunities.forEach(o => { h += `<div style="font-size:10px;color:#16a34a;padding:3px 0">✅ ${safe(typeof o === 'string' ? o : JSON.stringify(o))}</div>`; });
        h += '</div>';
      }
      if (r.risks && r.risks.length) {
        h += '<div>';
        r.risks.forEach(ri => { h += `<div style="font-size:10px;color:#dc2626;padding:3px 0">⚠️ ${safe(typeof ri === 'string' ? ri : JSON.stringify(ri))}</div>`; });
        h += '</div>';
      }
      h += '</div></div>';
    }

    // ── GOVERNMENT SUPPORT ──
    const gov = r.government_support;
    if (gov && typeof gov === 'object') {
      h += '<div class="section"><div class="section-title">정부 지원</div><div class="grid3">';
      if (gov.export_voucher) h += `<div class="card" style="border-top:3px solid #3b82f6"><div class="card-title">수출바우처</div><div class="card-desc">${safe(gov.export_voucher)}</div></div>`;
      if (gov.kotra_support) h += `<div class="card" style="border-top:3px solid #22c55e"><div class="card-title">KOTRA 지원</div><div class="card-desc">${safe(gov.kotra_support)}</div></div>`;
      if (gov.estimated_subsidy) h += `<div class="card" style="border-top:3px solid #a855f7"><div class="card-title">예상 보조금</div><div class="card-value">${safe(gov.estimated_subsidy)}</div></div>`;
      h += '</div></div>';
    }

    // ── DATA SOURCES ──
    if (r.data_sources && r.data_sources.length) {
      h += `<div style="font-size:9px;color:#aaa;margin-top:12px">데이터 출처: ${Array.isArray(r.data_sources) ? r.data_sources.join(', ') : safe(r.data_sources)}</div>`;
    }

    // ── FOOTER ──
    h += `<div class="footer">
      <div class="brand-f">NARU | 나루</div>
      <div style="font-size:9px;color:#888;margin-top:2px">(주)모티브이노베이션 · AI 기반 수출 통합 플랫폼 · naru.motiveinnovation.co.kr</div>
      <div class="disclaimer">본 보고서는 AI 분석 엔진(${r.model_used || 'Gemini'})에 의해 자동 생성되었으며, 투자 또는 사업 결정의 유일한 근거로 사용되어서는 안 됩니다. 실제 시장 상황은 변동될 수 있으며, 전문가 상담을 권장합니다. © ${new Date().getFullYear()} Motive Innovation. All rights reserved.</div>
    </div>`;

    h += '</body></html>';

    // Generate PDF
    const container = document.createElement('div');
    container.innerHTML = h;
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.width = '210mm';
    document.body.appendChild(container);

    try {
      const filename = `NARU_수출분석_${pName.replace(/[^가-힣a-zA-Z0-9]/g, '_').slice(0, 30)}_${date.replace(/\s/g, '')}.pdf`;
      await html2pdf().set({
        margin: [8, 8, 12, 8],
        filename,
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'], before: '.page-break' }
      }).from(container).save();
      UI.toast('PDF 다운로드 완료!', 'success');
    } catch (err) {
      console.error('PDF 생성 오류:', err);
      UI.toast('PDF 생성 실패: ' + UI.err(err), 'error');
    } finally {
      container.remove();
    }
  },

  async requestAlibaba(pid) {
    const product = S.products.find(p => p.id === pid);
    if (!product) return;

    let body = '<p style="font-size:14px;color:var(--tx);margin-bottom:16px">알리바바닷컴에 제품을 등록하고 해외 바이어를 만나보세요.</p>';
    body += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">';
    body += '<div style="padding:16px;background:var(--s2);border:2px solid var(--bd);border-radius:var(--radius);cursor:pointer" onclick="Analyze._selectAliType(this,\'reseller\')" id="ali-opt-reseller"><div style="font-size:14px;font-weight:700;color:var(--org);margin-bottom:4px">총판운영</div><div style="font-size:22px;font-weight:900;color:#fff;margin-bottom:6px">커미션 기반</div><ul style="list-style:none;font-size:12px;color:var(--tx2)"><li>✓ 알리바바 계정 불필요</li><li>✓ GGS 비용 부담 없음</li><li>✓ 모티브 스토어에 등록</li><li>✓ 거래 시 커미션 정산</li></ul></div>';
    body += '<div style="padding:16px;background:var(--s2);border:2px solid var(--bd);border-radius:var(--radius);cursor:pointer" onclick="Analyze._selectAliType(this,\'agency\')" id="ali-opt-agency"><div style="font-size:14px;font-weight:700;color:var(--acc);margin-bottom:4px">운영대행</div><div style="font-size:22px;font-weight:900;color:#fff;margin-bottom:6px">$2,500~</div><ul style="list-style:none;font-size:12px;color:var(--tx2)"><li>✓ 자체 알리바바 계정</li><li>✓ BASIC($2,500) / PLUS($4,500)</li><li>✓ 전용 미니사이트</li><li>✓ 상품등록 + 광고 + 운영</li></ul></div>';
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
    if (!Analyze._selectedAliType) { UI.toast('서비스 유형을 선택해주세요.', 'warn'); return; }
    await sb.from('products').update({ alibaba_type: Analyze._selectedAliType }).eq('id', pid);
    const p = S.products.find(x => x.id === pid);
    if (p) p.alibaba_type = Analyze._selectedAliType;
    try { await sb.from('alibaba_contracts').insert({ company_id: S.company?.id, service_type: Analyze._selectedAliType, amount: Analyze._selectedAliType === 'reseller' ? 0 : 2500, status: 'pending' }); } catch(e) { console.error(e); }
    document.querySelectorAll('[id^="naru-modal"]').forEach(el => el.remove());
    UI.toast(Analyze._selectedAliType === 'reseller' ? '총판운영 의뢰가 접수되었습니다.' : '운영대행 의뢰가 접수되었습니다.', 'success');
    notify();
  }
};

window.Analyze = Analyze;
