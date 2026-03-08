/**
 * NARU Cost Simulator — 수출 비용/마진 시뮬레이터
 * FOB→CIF→DDP 비용 구조, 관세/운임/보험/마진 계산
 */

const COST_REGIONS = {
  'us': { name: '미국', tariff: 0, shipping: 3.5, insurance: 0.5 },
  'eu': { name: '유럽(EU)', tariff: 0, shipping: 4.0, insurance: 0.5 },
  'jp': { name: '일본', tariff: 0, shipping: 2.0, insurance: 0.3 },
  'cn': { name: '중국', tariff: 0, shipping: 1.5, insurance: 0.3 },
  'sea': { name: '동남아', tariff: 5, shipping: 2.5, insurance: 0.4 },
  'me': { name: '중동', tariff: 5, shipping: 4.5, insurance: 0.6 },
  'sa': { name: '남미', tariff: 10, shipping: 5.5, insurance: 0.7 },
  'af': { name: '아프리카', tariff: 10, shipping: 5.0, insurance: 0.8 }
};

const INCOTERMS_INFO = {
  'EXW': { label: 'Ex Works', desc: '공장인도 — 바이어가 모든 운송 부담', sellerCost: 'factory' },
  'FOB': { label: 'Free On Board', desc: '본선인도 — 선적항까지 셀러 부담', sellerCost: 'port' },
  'CIF': { label: 'Cost, Insurance & Freight', desc: '운임보험료포함 — 도착항까지 셀러 부담', sellerCost: 'destination_port' },
  'DDP': { label: 'Delivered Duty Paid', desc: '관세지급인도 — 바이어 문전까지 셀러 부담', sellerCost: 'door' }
};

Router.register('cost', function(state) {
  let h = '';

  h += '<div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">';
  h += '<h2 style="font-size:20px;font-weight:800;color:#fff;flex:1">비용/마진 시뮬레이터</h2>';
  h += '</div>';

  // Product selector (if products exist)
  if (state.products && state.products.length > 0) {
    h += '<div style="margin-bottom:16px">';
    h += '<label class="form-label">제품 선택 (선택사항)</label>';
    h += '<select id="cost-product" class="form-input" style="max-width:400px" onchange="CostSim.loadProduct(this.value)">';
    h += '<option value="">직접 입력</option>';
    state.products.forEach(p => {
      h += `<option value="${p.id}">${p.name}${p.fob_price ? ' — ' + UI.usd(p.fob_price) : ''}</option>`;
    });
    h += '</select></div>';
  }

  // Input form
  h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px">';

  // Left: Product costs
  h += '<div class="card">';
  h += '<div class="card-header"><div class="card-title">제품 정보</div></div>';

  h += '<div class="form-group">';
  h += '<label class="form-label">제품 원가 (KRW)</label>';
  h += '<input id="cost-cogs" type="number" class="form-input" placeholder="10,000" oninput="CostSim.calc()">';
  h += '</div>';

  h += '<div class="form-group">';
  h += '<label class="form-label">FOB 가격 (USD)</label>';
  h += '<input id="cost-fob" type="number" class="form-input" placeholder="25.00" step="0.01" oninput="CostSim.calc()">';
  h += '</div>';

  h += '<div class="form-group">';
  h += '<label class="form-label">수량</label>';
  h += '<input id="cost-qty" type="number" class="form-input" placeholder="1,000" value="1000" oninput="CostSim.calc()">';
  h += '</div>';

  h += '<div class="form-group">';
  h += '<label class="form-label">중량 (kg/개)</label>';
  h += '<input id="cost-weight" type="number" class="form-input" placeholder="0.5" step="0.01" value="0.5" oninput="CostSim.calc()">';
  h += '</div>';

  h += '<div class="form-group">';
  h += '<label class="form-label">환율 (KRW/USD)</label>';
  h += '<input id="cost-fx" type="number" class="form-input" placeholder="1,350" value="1350" oninput="CostSim.calc()">';
  h += '</div>';

  h += '</div>';

  // Right: Destination & terms
  h += '<div class="card">';
  h += '<div class="card-header"><div class="card-title">수출 조건</div></div>';

  h += '<div class="form-group">';
  h += '<label class="form-label">목적지</label>';
  h += '<select id="cost-region" class="form-input" onchange="CostSim.calc()">';
  Object.entries(COST_REGIONS).forEach(([k, v]) => {
    h += `<option value="${k}">${v.name}</option>`;
  });
  h += '</select></div>';

  h += '<div class="form-group">';
  h += '<label class="form-label">인코텀즈</label>';
  h += '<select id="cost-incoterms" class="form-input" onchange="CostSim.calc()">';
  Object.entries(INCOTERMS_INFO).forEach(([k, v]) => {
    h += `<option value="${k}">${k} — ${v.label}</option>`;
  });
  h += '</select></div>';

  h += '<div class="form-group">';
  h += '<label class="form-label">관세율 (%)</label>';
  h += '<input id="cost-tariff" type="number" class="form-input" placeholder="자동입력" step="0.1" oninput="CostSim.calc()">';
  h += '<div style="font-size:11px;color:var(--tx2);margin-top:4px">FTA 협정에 따라 0%일 수 있음</div>';
  h += '</div>';

  h += '<div class="form-group">';
  h += '<label class="form-label">해상 운임 ($/kg)</label>';
  h += '<input id="cost-freight" type="number" class="form-input" placeholder="자동입력" step="0.1" oninput="CostSim.calc()">';
  h += '</div>';

  h += '<div class="form-group">';
  h += '<label class="form-label">보험료율 (%)</label>';
  h += '<input id="cost-insurance" type="number" class="form-input" placeholder="0.5" step="0.1" value="0.5" oninput="CostSim.calc()">';
  h += '</div>';

  h += '</div>';
  h += '</div>';

  // Results
  h += '<div id="cost-result"></div>';

  // Auto-calculate on load (script in innerHTML doesn't execute, use requestAnimationFrame)
  setTimeout(() => CostSim.calc(), 100);

  return h;
});

const CostSim = {
  loadProduct(pid) {
    if (!pid) return;
    const p = S.products.find(x => x.id === pid);
    if (!p) return;

    const fobInput = document.getElementById('cost-fob');
    if (fobInput && p.fob_price) fobInput.value = p.fob_price;

    // Try to get analysis data for more info
    const analysis = S.analyses.find(a => a.product_id === pid);
    if (analysis && analysis.result) {
      // Could pre-fill weight, category-based tariffs, etc.
    }

    CostSim.calc();
  },

  calc() {
    const cogs = parseFloat(document.getElementById('cost-cogs')?.value) || 0;
    const fob = parseFloat(document.getElementById('cost-fob')?.value) || 0;
    const qty = parseInt(document.getElementById('cost-qty')?.value) || 1;
    const weight = parseFloat(document.getElementById('cost-weight')?.value) || 0.5;
    const fx = parseFloat(document.getElementById('cost-fx')?.value) || 1350;
    const regionKey = document.getElementById('cost-region')?.value || 'us';
    const incoterms = document.getElementById('cost-incoterms')?.value || 'FOB';

    const region = COST_REGIONS[regionKey];

    // Get or auto-fill tariff and freight
    let tariffInput = document.getElementById('cost-tariff');
    let freightInput = document.getElementById('cost-freight');

    let tariffRate = parseFloat(tariffInput?.value);
    if (isNaN(tariffRate)) {
      tariffRate = region.tariff;
      if (tariffInput) tariffInput.placeholder = region.tariff + '%';
    }

    let freight = parseFloat(freightInput?.value);
    if (isNaN(freight)) {
      freight = region.shipping;
      if (freightInput) freightInput.placeholder = '$' + region.shipping + '/kg';
    }

    const insuranceRate = parseFloat(document.getElementById('cost-insurance')?.value) || 0.5;

    // Calculations
    const totalWeight = weight * qty;
    const fobTotal = fob * qty;
    const freightTotal = freight * totalWeight;
    const insuranceTotal = fobTotal * (insuranceRate / 100);
    const cifTotal = fobTotal + freightTotal + insuranceTotal;
    const tariffTotal = cifTotal * (tariffRate / 100);
    const ddpTotal = cifTotal + tariffTotal;

    // Cost based on incoterms
    let sellerCost = fobTotal;
    if (incoterms === 'CIF') sellerCost = cifTotal;
    else if (incoterms === 'DDP') sellerCost = ddpTotal;
    else if (incoterms === 'EXW') sellerCost = fobTotal * 0.95; // approx

    // Korean won equivalents
    const cogsTotal = cogs * qty;
    const fobKrw = fob * fx;
    const sellerCostKrw = sellerCost * fx / qty * qty; // total

    // Margin calculations
    const marginPerUnit = fob - (cogs / fx);
    const marginPct = cogs > 0 ? ((fobKrw - cogs) / cogs * 100) : 0;
    const totalRevenue = fobTotal;
    const totalProfit = totalRevenue - (cogsTotal / fx);

    // Render results
    const el = document.getElementById('cost-result');
    if (!el) return;

    let h = '';

    // Cost breakdown
    h += '<div class="card" style="margin-bottom:16px">';
    h += '<div class="card-header"><div class="card-title">비용 구조</div></div>';

    h += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:20px">';

    // EXW
    h += '<div style="text-align:center;padding:16px;background:var(--s2);border-radius:var(--radius);border:2px solid ' + (incoterms === 'EXW' ? 'var(--pri)' : 'transparent') + '">';
    h += '<div style="font-size:11px;color:var(--tx2);margin-bottom:4px">EXW</div>';
    h += `<div style="font-size:18px;font-weight:800;color:#fff">${UI.usd(fobTotal * 0.95)}</div>`;
    h += '</div>';

    // FOB
    h += '<div style="text-align:center;padding:16px;background:var(--s2);border-radius:var(--radius);border:2px solid ' + (incoterms === 'FOB' ? 'var(--pri)' : 'transparent') + '">';
    h += '<div style="font-size:11px;color:var(--tx2);margin-bottom:4px">FOB</div>';
    h += `<div style="font-size:18px;font-weight:800;color:#fff">${UI.usd(fobTotal)}</div>`;
    h += '</div>';

    // CIF
    h += '<div style="text-align:center;padding:16px;background:var(--s2);border-radius:var(--radius);border:2px solid ' + (incoterms === 'CIF' ? 'var(--pri)' : 'transparent') + '">';
    h += '<div style="font-size:11px;color:var(--tx2);margin-bottom:4px">CIF</div>';
    h += `<div style="font-size:18px;font-weight:800;color:#fff">${UI.usd(cifTotal)}</div>`;
    h += '</div>';

    // DDP
    h += '<div style="text-align:center;padding:16px;background:var(--s2);border-radius:var(--radius);border:2px solid ' + (incoterms === 'DDP' ? 'var(--pri)' : 'transparent') + '">';
    h += '<div style="font-size:11px;color:var(--tx2);margin-bottom:4px">DDP</div>';
    h += `<div style="font-size:18px;font-weight:800;color:#fff">${UI.usd(ddpTotal)}</div>`;
    h += '</div>';

    h += '</div>';

    // Detailed breakdown table
    h += '<table class="tbl">';
    h += '<thead><tr><th>항목</th><th style="text-align:right">단가</th><th style="text-align:right">수량</th><th style="text-align:right">합계 (USD)</th><th style="text-align:right">합계 (KRW)</th></tr></thead>';
    h += '<tbody>';

    if (cogs > 0) {
      h += `<tr><td>원가 (COGS)</td><td style="text-align:right">${UI.won(cogs)}</td><td style="text-align:right">${UI.num(qty)}</td><td style="text-align:right">${UI.usd(cogsTotal / fx)}</td><td style="text-align:right">${UI.won(cogsTotal)}</td></tr>`;
    }
    h += `<tr><td style="font-weight:700;color:#fff">FOB 가격</td><td style="text-align:right">${UI.usd(fob)}</td><td style="text-align:right">${UI.num(qty)}</td><td style="text-align:right;font-weight:700;color:#fff">${UI.usd(fobTotal)}</td><td style="text-align:right">${UI.won(fobTotal * fx)}</td></tr>`;
    h += `<tr><td>해상 운임</td><td style="text-align:right">${UI.usd(freight)}/kg</td><td style="text-align:right">${UI.num(totalWeight)}kg</td><td style="text-align:right">${UI.usd(freightTotal)}</td><td style="text-align:right">${UI.won(freightTotal * fx)}</td></tr>`;
    h += `<tr><td>적하보험</td><td style="text-align:right">${insuranceRate}%</td><td style="text-align:right">-</td><td style="text-align:right">${UI.usd(insuranceTotal)}</td><td style="text-align:right">${UI.won(insuranceTotal * fx)}</td></tr>`;
    h += `<tr style="font-weight:700"><td style="color:#fff">CIF 합계</td><td></td><td></td><td style="text-align:right;color:var(--pri)">${UI.usd(cifTotal)}</td><td style="text-align:right;color:var(--pri)">${UI.won(cifTotal * fx)}</td></tr>`;
    h += `<tr><td>관세 (${tariffRate}%)</td><td style="text-align:right">${tariffRate}%</td><td style="text-align:right">-</td><td style="text-align:right">${UI.usd(tariffTotal)}</td><td style="text-align:right">${UI.won(tariffTotal * fx)}</td></tr>`;
    h += `<tr style="font-weight:700;border-top:2px solid var(--bd)"><td style="color:#fff">DDP 합계</td><td></td><td></td><td style="text-align:right;color:var(--pri)">${UI.usd(ddpTotal)}</td><td style="text-align:right;color:var(--pri)">${UI.won(ddpTotal * fx)}</td></tr>`;

    h += '</tbody></table>';
    h += '</div>';

    // Margin analysis
    if (cogs > 0 && fob > 0) {
      h += '<div class="card">';
      h += '<div class="card-header"><div class="card-title">마진 분석</div></div>';

      h += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px">';

      // Unit margin
      h += '<div class="stat-card">';
      h += '<div class="stat-label">개당 마진</div>';
      h += `<div class="stat-value" style="color:${marginPerUnit > 0 ? 'var(--grn)' : 'var(--red)'}">${UI.usd(marginPerUnit)}</div>`;
      h += '</div>';

      // Margin %
      h += '<div class="stat-card">';
      h += '<div class="stat-label">마진율</div>';
      h += `<div class="stat-value" style="color:${marginPct > 0 ? 'var(--grn)' : 'var(--red)'}">${marginPct.toFixed(1)}%</div>`;
      h += '</div>';

      // Total revenue
      h += '<div class="stat-card">';
      h += '<div class="stat-label">총 매출</div>';
      h += `<div class="stat-value">${UI.usd(totalRevenue)}</div>`;
      h += '</div>';

      // Total profit
      h += '<div class="stat-card">';
      h += '<div class="stat-label">총 이익</div>';
      h += `<div class="stat-value" style="color:${totalProfit > 0 ? 'var(--grn)' : 'var(--red)'}">${UI.usd(totalProfit)}</div>`;
      h += '</div>';

      h += '</div>';

      // Visual margin bar
      const cogsBar = fobKrw > 0 ? Math.min(100, Math.round(cogs / fobKrw * 100)) : 0;
      const profitBar = 100 - cogsBar;
      h += '<div style="margin-top:8px">';
      h += '<div style="font-size:12px;color:var(--tx2);margin-bottom:6px">원가 구성</div>';
      h += '<div style="display:flex;height:24px;border-radius:6px;overflow:hidden">';
      h += `<div style="width:${cogsBar}%;background:var(--red);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff">${cogsBar}% 원가</div>`;
      h += `<div style="width:${profitBar}%;background:var(--grn);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff">${profitBar}% 마진</div>`;
      h += '</div>';
      h += '</div>';

      h += '</div>';
    }

    // FTA notice
    h += '<div style="margin-top:16px;padding:12px;background:var(--ylw-bg);border-radius:var(--radius-sm);font-size:12px;color:var(--ylw)">';
    h += '💡 한-미 FTA, 한-EU FTA, RCEP 등 자유무역협정에 따라 관세가 0%일 수 있습니다. AI 분석 리포트에서 정확한 관세율을 확인하세요.';
    h += '</div>';

    el.innerHTML = h;
  }
};

window.CostSim = CostSim;
