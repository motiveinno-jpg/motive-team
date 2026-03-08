/**
 * NARU Settings — 프로필, 구독, 알리바바 계약 관리
 */

const PLANS = [
  {
    id: 'free', label: 'Free', price: 0,
    features: ['AI 분석 1회 무료', '파이프라인 5건', '서류 건당 결제'],
    limit: { analyses: 1, pipelines: 5 }
  },
  {
    id: 'starter', label: 'Starter', price: 9900, featured: false,
    features: ['AI 분석 월 10회', '파이프라인 무제한', '서류 생성 월 20건', '바이어 매칭 5건/월', '이메일 알림'],
    limit: { analyses: 10, pipelines: -1, documents: 20, matchings: 5 }
  },
  {
    id: 'pro', label: 'Pro', price: 19900, featured: true,
    features: ['AI 분석 무제한', '파이프라인 무제한', '서류 무제한', '바이어 매칭 무제한', '우선 지원', '비용 시뮬레이터', 'API 연동'],
    limit: { analyses: -1, pipelines: -1, documents: -1, matchings: -1 }
  }
];

Router.register('settings', function(state) {
  let h = '';

  h += '<h2 style="font-size:20px;font-weight:800;color:#fff;margin-bottom:20px">설정</h2>';

  // Tab navigation
  const settingsTab = state._settingsTab || 'profile';
  h += '<div style="display:flex;gap:0;margin-bottom:24px;background:var(--s2);border-radius:10px;padding:3px;max-width:500px">';
  ['profile', 'subscription', 'alibaba', 'usage'].forEach(tab => {
    const labels = { profile: '회사 정보', subscription: '구독', alibaba: '알리바바', usage: '사용량' };
    const active = settingsTab === tab;
    h += `<button onclick="Settings.switchTab('${tab}')" style="flex:1;padding:8px 12px;border-radius:8px;font-size:12px;font-weight:${active ? '700' : '500'};border:none;cursor:pointer;background:${active ? 'var(--pri)' : 'transparent'};color:${active ? '#000' : 'var(--tx2)'};transition:all .2s">${labels[tab]}</button>`;
  });
  h += '</div>';

  // Tab content
  if (settingsTab === 'profile') {
    h += Settings._renderProfile(state);
  } else if (settingsTab === 'subscription') {
    h += Settings._renderSubscription(state);
  } else if (settingsTab === 'alibaba') {
    h += Settings._renderAlibaba(state);
  } else if (settingsTab === 'usage') {
    h += Settings._renderUsage(state);
  }

  return h;
});

const Settings = {
  switchTab(tab) {
    S._settingsTab = tab;
    notify();
  },

  _renderProfile(state) {
    const c = state.company || {};
    let h = '';

    h += '<div class="card" style="max-width:600px">';
    h += '<div class="card-header"><div class="card-title">회사 정보</div></div>';
    h += '<form id="profile-form" onsubmit="Settings.saveProfile(event)">';

    h += '<div class="form-group">';
    h += '<label class="form-label">회사명</label>';
    h += `<input name="name" class="form-input" value="${(c.name || '').replace(/"/g,'&quot;')}" required>`;
    h += '</div>';

    h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">';
    h += '<div class="form-group">';
    h += '<label class="form-label">대표자명</label>';
    h += `<input name="rep_name" class="form-input" value="${(c.rep_name || '').replace(/"/g,'&quot;')}">`;
    h += '</div>';
    h += '<div class="form-group">';
    h += '<label class="form-label">연락처</label>';
    h += `<input name="phone" class="form-input" value="${(c.phone || '').replace(/"/g,'&quot;')}">`;
    h += '</div>';
    h += '</div>';

    h += '<div class="form-group">';
    h += '<label class="form-label">사업자등록번호</label>';
    h += `<input name="biz_num" class="form-input" value="${(c.biz_num || '').replace(/"/g,'&quot;')}">`;
    h += '</div>';

    h += '<div class="form-group">';
    h += '<label class="form-label">주소</label>';
    h += `<input name="address" class="form-input" value="${(c.address || '').replace(/"/g,'&quot;')}">`;
    h += '</div>';

    h += '<div class="form-group">';
    h += '<label class="form-label">영문 회사명</label>';
    h += `<input name="name_en" class="form-input" value="${(c.name_en || '').replace(/"/g,'&quot;')}" placeholder="Motive Innovation Co., Ltd.">`;
    h += '</div>';

    h += '<div class="form-group">';
    h += '<label class="form-label">영문 주소</label>';
    h += `<input name="address_en" class="form-input" value="${(c.address_en || '').replace(/"/g,'&quot;')}" placeholder="123 Gangnam-daero, Seoul, Korea">`;
    h += '</div>';

    h += '<button type="submit" class="btn btn-pri" style="margin-top:8px">저장</button>';
    h += '</form>';
    h += '</div>';

    // Account section
    h += '<div class="card" style="max-width:600px;margin-top:16px">';
    h += '<div class="card-header"><div class="card-title">계정</div></div>';
    h += `<div style="font-size:13px;color:var(--tx2);margin-bottom:12px">이메일: ${state.user ? state.user.email.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') : '-'}</div>`;
    h += '<div style="display:flex;gap:10px">';
    h += '<button onclick="Settings.changePassword()" class="btn btn-ghost btn-sm">비밀번호 변경</button>';
    h += '<button onclick="Settings.deleteAccount()" class="btn btn-ghost btn-sm" style="color:var(--red);border-color:rgba(239,68,68,.3)">계정 삭제</button>';
    h += '</div>';
    h += '</div>';

    return h;
  },

  _renderSubscription(state) {
    let h = '';

    // Current plan
    const currentPlan = state.sub ? state.sub.plan : 'free';
    h += '<div style="margin-bottom:24px">';
    h += '<div style="font-size:13px;color:var(--tx2);margin-bottom:4px">현재 플랜</div>';
    h += `<div style="font-size:20px;font-weight:800;color:var(--pri)">${PLANS.find(p => p.id === currentPlan)?.label || 'Free'}</div>`;
    if (state.sub) {
      h += `<div style="font-size:12px;color:var(--tx2);margin-top:4px">갱신일: ${UI.date(state.sub.current_period_end)}</div>`;
    }
    h += '</div>';

    // Plans grid
    h += '<div class="pricing-grid">';
    PLANS.forEach(plan => {
      const isCurrent = plan.id === currentPlan;
      const isUpgrade = PLANS.indexOf(plan) > PLANS.findIndex(p => p.id === currentPlan);

      h += `<div class="pricing-card ${plan.featured ? 'featured' : ''}">`;

      if (plan.featured) {
        h += '<div style="position:absolute;top:-10px;left:50%;transform:translateX(-50%);background:var(--pri);color:#000;font-size:11px;font-weight:700;padding:2px 14px;border-radius:10px">추천</div>';
      }

      h += `<div class="plan-name">${plan.label}</div>`;
      h += `<div class="plan-price">${plan.price === 0 ? '무료' : UI.num(plan.price) + '<span>/월</span>'}</div>`;

      h += '<ul class="plan-features">';
      plan.features.forEach(f => {
        h += `<li>${f}</li>`;
      });
      h += '</ul>';

      if (isCurrent) {
        h += '<button class="btn btn-ghost" style="width:100%" disabled>현재 플랜</button>';
      } else if (plan.id === 'free') {
        if (state.sub) {
          h += `<button onclick="Settings.cancelSubscription()" class="btn btn-ghost" style="width:100%">다운그레이드</button>`;
        }
      } else {
        h += `<button onclick="Settings.subscribe('${plan.id}')" class="btn ${plan.featured ? 'btn-pri' : 'btn-ghost'}" style="width:100%">${isUpgrade ? '업그레이드' : '구독하기'}</button>`;
      }

      h += '</div>';
    });
    h += '</div>';

    // Billing history
    h += '<h3 style="font-size:15px;font-weight:700;color:#fff;margin:24px 0 12px">결제 이력</h3>';
    const billing = state._billing || [];
    if (billing.length === 0) {
      h += '<div style="padding:20px;text-align:center;color:var(--tx2);font-size:13px">결제 이력이 없습니다.</div>';
    } else {
      h += '<table class="tbl"><thead><tr><th>날짜</th><th>내용</th><th>금액</th><th>상태</th></tr></thead><tbody>';
      billing.forEach(b => {
        h += `<tr>`;
        h += `<td>${UI.date(b.created_at)}</td>`;
        h += `<td>${b.description || b.order_name || '-'}</td>`;
        h += `<td>${UI.won(b.amount)}</td>`;
        h += `<td>${b.status === 'paid' ? UI.badge('완료', 'grn') : UI.badge(b.status, 'ylw')}</td>`;
        h += '</tr>';
      });
      h += '</tbody></table>';
    }

    return h;
  },

  _renderAlibaba(state) {
    let h = '';

    h += '<div style="margin-bottom:20px">';
    h += '<h3 style="font-size:16px;font-weight:800;color:#fff;margin-bottom:4px">알리바바 서비스 관리</h3>';
    h += '<p style="font-size:13px;color:var(--tx2)">총판운영 및 운영대행 계약 현황을 확인할 수 있습니다.</p>';
    h += '</div>';

    // Alibaba contracts
    const contracts = state._alibabaContracts || [];

    if (contracts.length === 0) {
      h += '<div class="card" style="text-align:center;padding:40px">';
      h += '<div style="font-size:40px;margin-bottom:12px">🏪</div>';
      h += '<div style="font-size:15px;font-weight:700;color:#fff;margin-bottom:8px">알리바바 서비스를 아직 신청하지 않았습니다</div>';
      h += '<p style="font-size:13px;color:var(--tx2);margin-bottom:16px">AI 분석 결과에서 알리바바 서비스를 신청할 수 있습니다.</p>';
      h += `<button onclick="Router.go('analyze')" class="btn btn-pri">AI 분석으로 이동</button>`;
      h += '</div>';
    } else {
      h += '<div style="display:flex;flex-direction:column;gap:12px">';
      contracts.forEach(c => {
        const isReseller = c.service_type === 'reseller';
        const product = S.products.find(p => p.id === c.product_id);

        h += `<div class="card" style="border-left:3px solid ${isReseller ? 'var(--org)' : 'var(--acc)'}">`;
        h += '<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">';
        h += `<div style="font-size:14px;font-weight:700;color:#fff;flex:1">${product ? product.name : '제품'}</div>`;
        h += isReseller ? UI.badge('총판운영', 'org') : UI.badge('운영대행', 'acc');
        h += Settings._statusBadge(c.status);
        h += '</div>';

        h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px">';
        h += `<div><span style="color:var(--tx2)">서비스:</span> <span style="color:#fff">${isReseller ? '총판운영 (모티브 계정)' : '운영대행 (' + (c.tier || 'BASIC') + ')'}</span></div>`;
        h += `<div><span style="color:var(--tx2)">신청일:</span> <span style="color:#fff">${UI.date(c.created_at)}</span></div>`;
        if (!isReseller) {
          const tierPrice = c.tier === 'PLUS' ? '$4,500' : '$2,500';
          h += `<div><span style="color:var(--tx2)">연간 비용:</span> <span style="color:#fff">${tierPrice}/년</span></div>`;
        }
        h += `<div><span style="color:var(--tx2)">상태:</span> <span style="color:#fff">${Settings._statusText(c.status)}</span></div>`;
        h += '</div>';

        // Sync status (if active)
        if (c.status === 'active') {
          h += '<div style="margin-top:12px;padding:10px;background:var(--s2);border-radius:var(--radius-sm)">';
          h += '<div style="font-size:11px;color:var(--tx2);margin-bottom:4px">데이터 동기화</div>';
          h += '<div style="display:flex;align-items:center;gap:8px">';
          h += '<div style="width:8px;height:8px;border-radius:50%;background:var(--grn)"></div>';
          h += `<span style="font-size:12px;color:var(--grn)">마지막 동기화: ${c.last_sync ? UI.ago(c.last_sync) : '대기중'}</span>`;
          h += '</div>';
          h += '</div>';
        }

        h += '</div>';
      });
      h += '</div>';
    }

    // Service comparison
    h += '<div style="margin-top:24px">';
    h += '<h3 style="font-size:15px;font-weight:700;color:#fff;margin-bottom:12px">서비스 비교</h3>';
    h += '<table class="tbl"><thead><tr><th>구분</th><th>총판운영 (A)</th><th>운영대행 (B)</th></tr></thead><tbody>';
    h += '<tr><td>계정</td><td>모티브 계정</td><td>파트너사 자체 계정</td></tr>';
    h += '<tr><td>운영수권서</td><td>✅ 필요</td><td>❌ 불필요</td></tr>';
    h += '<tr><td>BASIC</td><td>포함</td><td>$2,500/년 (파트너 결제)</td></tr>';
    h += '<tr><td>PLUS</td><td>포함</td><td>$4,500/년 (파트너 결제)</td></tr>';
    h += '<tr><td>RFQ 대응</td><td>모티브</td><td>파트너사 (모티브 지원)</td></tr>';
    h += '<tr><td>데이터</td><td>전체 접근</td><td>읽기 동기화</td></tr>';
    h += '</tbody></table>';
    h += '</div>';

    return h;
  },

  _renderUsage(state) {
    let h = '';

    const analysisCount = state.analyses.length;
    const productCount = state.products.length;
    const docCount = (state._documents || []).length;
    const plan = PLANS.find(p => p.id === (state.sub ? state.sub.plan : 'free'));
    const limits = plan?.limit || { analyses: 1, pipelines: 5, documents: 0 };

    h += '<h3 style="font-size:16px;font-weight:800;color:#fff;margin-bottom:16px">이번 달 사용량</h3>';

    h += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px;margin-bottom:24px">';

    // Analysis usage
    h += Settings._usageCard('AI 분석', analysisCount, limits.analyses, 'pri');
    // Pipeline usage
    h += Settings._usageCard('파이프라인', productCount, limits.pipelines, 'acc');
    // Document usage
    h += Settings._usageCard('서류 생성', docCount, limits.documents || 0, 'grn');

    h += '</div>';

    // Usage tips
    h += '<div class="card" style="max-width:600px">';
    h += '<div class="card-header"><div class="card-title">사용 팁</div></div>';
    h += '<ul style="list-style:none;font-size:13px;color:var(--tx2)">';
    h += '<li style="padding:6px 0;border-bottom:1px solid var(--bd)">💡 첫 AI 분석은 무료입니다.</li>';
    h += '<li style="padding:6px 0;border-bottom:1px solid var(--bd)">💡 Starter 구독 시 월 10회 AI 분석 + 20건 서류 생성</li>';
    h += '<li style="padding:6px 0;border-bottom:1px solid var(--bd)">💡 Pro 구독 시 모든 기능 무제한</li>';
    h += '<li style="padding:6px 0">💡 구독 없이도 건당 결제로 모든 기능을 사용할 수 있습니다.</li>';
    h += '</ul>';
    h += '</div>';

    return h;
  },

  _usageCard(label, used, limit, color) {
    const isUnlimited = limit === -1;
    const pct = isUnlimited ? 30 : (limit > 0 ? Math.min(100, Math.round(used / limit * 100)) : 0);
    const limitText = isUnlimited ? '무제한' : limit;

    let h = '<div class="card">';
    h += `<div style="font-size:12px;color:var(--tx2);margin-bottom:8px">${label}</div>`;
    h += '<div style="display:flex;align-items:baseline;gap:4px;margin-bottom:8px">';
    h += `<span style="font-size:24px;font-weight:800;color:#fff">${used}</span>`;
    h += `<span style="font-size:13px;color:var(--tx2)">/ ${limitText}</span>`;
    h += '</div>';
    h += '<div class="score-bar">';
    h += `<div class="score-bar-fill" style="width:${pct}%;background:var(--${color})"></div>`;
    h += '</div>';
    h += '</div>';
    return h;
  },

  _statusBadge(status) {
    const map = {
      pending: ['대기', 'ylw'],
      reviewing: ['검토', 'pri'],
      active: ['활성', 'grn'],
      paused: ['일시중지', 'red'],
      cancelled: ['해지', 'red']
    };
    const [label, type] = map[status] || ['미정', 'default'];
    return UI.badge(label, type);
  },

  _statusText(status) {
    const map = {
      pending: '신청 접수 (검토 대기)',
      reviewing: '모티브 검토 중',
      active: '서비스 운영 중',
      paused: '일시 중지',
      cancelled: '해지 완료'
    };
    return map[status] || status;
  },

  async saveProfile(e) {
    e.preventDefault();
    const f = e.target;
    const data = {
      name: f.name.value.trim(),
      rep_name: f.rep_name.value.trim(),
      phone: f.phone.value.trim(),
      biz_num: f.biz_num.value.trim(),
      address: f.address.value.trim(),
      name_en: f.name_en.value.trim(),
      address_en: f.address_en.value.trim()
    };

    const { error } = await sb.from('companies').update(data).eq('id', S.company.id);
    if (error) {
      UI.toast('저장 실패: ' + UI.err(error), 'error');
      return;
    }
    Object.assign(S.company, data);
    UI.toast('저장되었습니다.', 'success');
  },

  async subscribe(planId) {
    const plan = PLANS.find(p => p.id === planId);
    if (!plan) return;

    const ok = await UI.confirm(`${plan.label} 플랜으로 구독하시겠습니까?\n\n월 ${UI.won(plan.price)}`);
    if (!ok) return;

    try {
      await Pay.issueBillingKey(planId);
    } catch (e) {
      UI.toast('구독 오류: ' + UI.err(e), 'error');
    }
  },

  async cancelSubscription() {
    const ok = await UI.confirm('구독을 해지하시겠습니까?\n\n현재 결제 주기가 끝나면 Free 플랜으로 전환됩니다.');
    if (!ok) return;

    try {
      const token = (await sb.auth.getSession()).data.session?.access_token;
      const res = await fetch(NARU_EF_BASE + '/manage-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ action: 'cancel' })
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      UI.toast('구독 해지 요청이 접수되었습니다.', 'success');
      await Auth.loadProfile();
      notify();
    } catch (e) {
      UI.toast('구독 해지 오류: ' + UI.err(e), 'error');
    }
  },

  async changePassword() {
    let body = '';
    body += '<form id="pw-form" onsubmit="Settings._submitPassword(event)">';
    body += '<div class="form-group">';
    body += '<label class="form-label">새 비밀번호</label>';
    body += '<input name="password" type="password" class="form-input" required minlength="6" placeholder="6자 이상">';
    body += '</div>';
    body += '<div class="form-group">';
    body += '<label class="form-label">비밀번호 확인</label>';
    body += '<input name="password2" type="password" class="form-input" required minlength="6" placeholder="한번 더 입력">';
    body += '</div>';
    body += '<button type="submit" class="btn btn-pri" style="width:100%">변경</button>';
    body += '</form>';
    UI.modal('비밀번호 변경', body, { width: '400px' });
  },

  async _submitPassword(e) {
    e.preventDefault();
    const f = e.target;
    if (f.password.value !== f.password2.value) {
      UI.toast('비밀번호가 일치하지 않습니다.', 'warn');
      return;
    }
    const { error } = await sb.auth.updateUser({ password: f.password.value });
    if (error) {
      UI.toast('비밀번호 변경 실패: ' + UI.err(error), 'error');
      return;
    }
    UI.toast('비밀번호가 변경되었습니다.', 'success');
    document.querySelectorAll('[id^="naru-modal"]').forEach(el => el.remove());
  },

  async deleteAccount() {
    const ok = await UI.confirm('정말 계정을 삭제하시겠습니까?\n\n모든 데이터가 삭제되며 복구할 수 없습니다.');
    if (!ok) return;
    const ok2 = await UI.confirm('마지막 확인입니다.\n\n정말로 되돌릴 수 없이 삭제하시겠습니까?');
    if (!ok2) return;

    // Mark account for deletion (admin handles actual deletion)
    await sb.from('users').update({ deleted_at: new Date().toISOString() }).eq('id', S.user.id);
    UI.toast('계정 삭제 요청이 접수되었습니다.', 'info');
    await Auth.signOut();
  },

  async loadBilling() {
    if (!S.user) return;
    const { data } = await sb.from('billing_events')
      .select('*')
      .eq('user_id', S.user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    S._billing = data || [];
  },

  async loadAlibabaContracts() {
    if (!S.company) return;
    const { data } = await sb.from('alibaba_contracts')
      .select('*')
      .eq('company_id', S.company.id)
      .order('created_at', { ascending: false });
    S._alibabaContracts = data || [];
  }
};

window.Settings = Settings;
window.PLANS = PLANS;
