/**
 * NARU Pipeline — Kanban board view (main screen)
 */

const STAGES = [
  { id: 'registered', label: '등록', icon: '📦', color: 'var(--pri)' },
  { id: 'analyzing', label: '분석', icon: '🤖', color: 'var(--acc)' },
  { id: 'matching', label: '매칭', icon: '🤝', color: 'var(--ylw)' },
  { id: 'dealing', label: '거래', icon: '💬', color: 'var(--org)' },
  { id: 'documenting', label: '서류', icon: '📄', color: 'var(--grn)' },
  { id: 'shipped', label: '출하', icon: '🚢', color: '#ef4444' }
];

Router.register('pipeline', function(state) {
  if (!state.products.length) {
    return UI.empty('📦', '아직 등록된 제품이 없습니다',
      'URL을 입력하면 AI가 수출 가능성을 분석합니다. 첫 번째 분석은 무료!',
      '제품 등록하기', "Router.go('analyze')");
  }

  // Group products by pipeline stage
  const grouped = {};
  STAGES.forEach(s => grouped[s.id] = []);

  state.products.forEach(p => {
    const stage = p.status || 'registered';
    if (grouped[stage]) {
      grouped[stage].push(p);
    } else {
      grouped['registered'].push(p);
    }
  });

  // Stats
  const total = state.products.length;
  const analyzed = state.analyses.length;
  const hasScore = state.analyses.filter(a => a.score != null);
  const avgScore = hasScore.length ? Math.round(hasScore.reduce((s, a) => s + a.score, 0) / hasScore.length) : 0;

  let h = '';

  // Top stats
  h += '<div class="stats-grid">';
  h += `<div class="stat-card"><div class="stat-label">전체 제품</div><div class="stat-value">${total}</div></div>`;
  h += `<div class="stat-card"><div class="stat-label">분석 완료</div><div class="stat-value">${analyzed}</div></div>`;
  h += `<div class="stat-card"><div class="stat-label">평균 적합도</div><div class="stat-value" style="color:${UI.scoreColor(avgScore)}">${avgScore}점</div></div>`;
  h += `<div class="stat-card"><div class="stat-label">구독</div><div class="stat-value">${state.sub ? state.sub.plan : '없음'}</div></div>`;
  h += '</div>';

  // Action bar
  h += '<div style="display:flex;align-items:center;gap:12px;margin:16px 0">';
  h += '<h2 style="font-size:18px;font-weight:800;color:#fff;flex:1">파이프라인</h2>';
  h += `<button onclick="Router.go('analyze')" class="btn btn-pri btn-sm">+ 제품 등록</button>`;
  h += '</div>';

  // Kanban columns
  h += '<div class="pipeline">';
  STAGES.forEach(stage => {
    const items = grouped[stage.id];
    h += '<div class="pipe-col">';
    h += `<div class="pipe-col-head" style="border-bottom-color:${stage.color}">`;
    h += `${stage.icon} ${stage.label} <span class="count">${items.length}</span>`;
    h += '</div>';
    h += '<div class="pipe-cards">';

    if (items.length === 0) {
      h += `<div style="padding:20px;text-align:center;border:1px dashed var(--bd);border-radius:var(--radius);color:var(--tx3);font-size:12px">없음</div>`;
    }

    items.forEach(p => {
      // Find analysis for this product
      const analysis = state.analyses.find(a => a.product_id === p.id);
      const score = analysis ? analysis.score : null;

      // Alibaba status
      let aliClass = '';
      if (p.alibaba_type === 'reseller') aliClass = ' ali-reseller';
      else if (p.alibaba_type === 'agency') aliClass = ' ali-agency';
      if (stage.id === 'shipped') aliClass = ' completed';

      h += `<div class="pipe-card${aliClass}" onclick="Pipeline.openProduct('${p.id}')">`;
      h += `<div class="pc-name">${UI.trunc(p.name, 20)}</div>`;

      if (stage.id === 'registered') {
        h += `<div class="pc-meta">${UI.ago(p.created_at)}</div>`;
        if (!analysis) {
          h += `<button onclick="event.stopPropagation();Pipeline.startAnalysis('${p.id}')" class="btn btn-pri btn-sm" style="margin-top:8px;width:100%">AI 분석 시작</button>`;
        }
      } else if (stage.id === 'analyzing') {
        h += `<div class="pc-meta">분석 진행 중...</div>`;
        h += '<div style="margin-top:6px"><div class="score-bar"><div class="score-bar-fill" style="width:60%;background:var(--acc)"></div></div></div>';
      } else if (analysis && score != null) {
        h += `<div class="pc-score" style="background:${UI.scoreColor(score)}22;color:${UI.scoreColor(score)}">${score}점</div>`;
      }

      // Alibaba badge
      if (p.alibaba_type === 'reseller') {
        h += `<div style="margin-top:6px">${UI.badge('총판운영', 'org')}</div>`;
      } else if (p.alibaba_type === 'agency') {
        h += `<div style="margin-top:6px">${UI.badge('운영대행', 'acc')}</div>`;
      }

      h += '</div>'; // pipe-card
    });

    h += '</div>'; // pipe-cards
    h += '</div>'; // pipe-col
  });
  h += '</div>'; // pipeline

  return h;
});

/* Pipeline actions */
const Pipeline = {
  openProduct(pid) {
    const p = S.products.find(x => x.id === pid);
    if (!p) return;

    const analysis = S.analyses.find(a => a.product_id === pid);

    let body = '';
    body += `<div style="margin-bottom:16px">`;
    if (p.images && p.images[0]) {
      body += `<img src="${p.images[0]}" style="width:100%;max-height:200px;object-fit:cover;border-radius:var(--radius);margin-bottom:12px">`;
    }
    body += `<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">`;
    body += `<span style="font-size:13px;color:var(--tx2)">상태:</span>`;
    body += UI.badge(p.status || 'registered', 'pri');
    if (p.alibaba_type) body += UI.badge(p.alibaba_type === 'reseller' ? '총판운영' : '운영대행', p.alibaba_type === 'reseller' ? 'org' : 'acc');
    body += '</div>';

    if (p.url) body += `<div style="font-size:12px;margin-bottom:8px"><a href="${p.url}" target="_blank">${UI.trunc(p.url, 50)}</a></div>`;
    if (p.category) body += `<div style="font-size:12px;color:var(--tx2);margin-bottom:8px">카테고리: ${p.category}</div>`;
    if (p.fob_price) body += `<div style="font-size:12px;color:var(--tx2)">FOB: ${UI.usd(p.fob_price)}</div>`;
    body += '</div>';

    // Analysis summary
    if (analysis) {
      body += '<div style="padding:16px;background:var(--s2);border-radius:var(--radius);margin-bottom:16px">';
      body += `<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">`;
      body += `<div class="score-circle" style="width:50px;height:50px;font-size:18px;border-color:${UI.scoreColor(analysis.score)}">${analysis.score}</div>`;
      body += '<div>';
      body += `<div style="font-size:14px;font-weight:700;color:#fff">수출 적합도</div>`;
      body += `<div style="font-size:12px;color:var(--tx2)">${UI.date(analysis.created_at)} 분석</div>`;
      body += '</div></div>';
      if (analysis.result && analysis.result.executive_summary) {
        body += `<p style="font-size:13px;color:var(--tx);line-height:1.6;margin-top:8px">${UI.trunc(analysis.result.executive_summary, 200)}</p>`;
      }
      body += `<button onclick="Router.go('analyze',{pid:'${pid}'});UI.closeModal(this.closest('[id^=naru-modal]').id)" class="btn btn-ghost btn-sm" style="margin-top:10px">전체 리포트 보기</button>`;
      body += '</div>';
    } else {
      body += `<button onclick="Pipeline.startAnalysis('${pid}');UI.closeModal(this.closest('[id^=naru-modal]').id)" class="btn btn-pri" style="width:100%;margin-bottom:12px">AI 분석 시작 (${S.analyses.length === 0 ? '무료' : '9,900원'})</button>`;
    }

    // Action buttons
    body += '<div style="display:flex;gap:8px;flex-wrap:wrap">';
    if (analysis) {
      body += `<button onclick="Router.go('analyze',{pid:'${pid}'});UI.closeModal(this.closest('[id^=naru-modal]').id)" class="btn btn-ghost btn-sm">리포트</button>`;
    }
    body += `<button onclick="Pipeline.deleteProduct('${pid}')" class="btn btn-ghost btn-sm" style="color:var(--red);border-color:rgba(239,68,68,.3)">삭제</button>`;
    body += '</div>';

    UI.modal(p.name, body, { width: '560px' });
  },

  async startAnalysis(pid) {
    const isFirst = S.analyses.length === 0;

    if (!isFirst) {
      // Check subscription or charge
      if (!S.sub) {
        const ok = await UI.confirm('AI 분석 비용: 9,900원\n\n구독하면 월 무제한 분석이 가능합니다.\n\n건당 결제하시겠습니까?');
        if (!ok) return;
        try {
          await Pay.payOnce(9900, 'AI 수출 분석', 'NARU-A-' + pid.slice(0, 8) + '-' + Date.now());
          return; // Payment redirect will handle the rest
        } catch (e) {
          UI.toast('결제 오류: ' + e.message, 'error');
          return;
        }
      }
    }

    // Start analysis
    UI.toast('AI 분석을 시작합니다...', 'info');

    // Update product status
    await sb.from('products').update({ status: 'analyzing' }).eq('id', pid);
    const p = S.products.find(x => x.id === pid);
    if (p) p.status = 'analyzing';
    notify();

    try {
      const result = await API.analyzeProduct(pid);
      UI.toast('분석 완료!', 'success');
      // Reload data
      await Auth.loadProfile();
      notify();
    } catch (e) {
      UI.toast('분석 오류: ' + e.message, 'error');
      await sb.from('products').update({ status: 'registered' }).eq('id', pid);
      if (p) p.status = 'registered';
      notify();
    }
  },

  async deleteProduct(pid) {
    const ok = await UI.confirm('이 제품을 삭제하시겠습니까?\n관련 분석 데이터도 함께 삭제됩니다.');
    if (!ok) return;

    await sb.from('analyses').delete().eq('product_id', pid);
    await sb.from('products').delete().eq('id', pid);
    S.products = S.products.filter(p => p.id !== pid);
    S.analyses = S.analyses.filter(a => a.product_id !== pid);
    UI.toast('삭제되었습니다.', 'success');
    // Close any open modal
    document.querySelectorAll('[id^="naru-modal"]').forEach(el => el.remove());
    notify();
  }
};

window.Pipeline = Pipeline;
