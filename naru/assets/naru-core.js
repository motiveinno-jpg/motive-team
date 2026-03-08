/**
 * NARU Core — Auth, Router, State, Supabase, UI Helpers
 * (주)모티브이노베이션 | 2026
 *
 * 실제 운영 수준. 목업 아님.
 */

/* ═══════════════════════════════════════════
   1. SUPABASE CLIENT
   ═══════════════════════════════════════════ */
const NARU_SUPABASE_URL = 'https://lylktgxngrlxmsldxdqj.supabase.co';
const NARU_SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5bGt0Z3huZ3JseG1zbGR4ZHFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4MTQ2OTAsImV4cCI6MjA4NzM5MDY5MH0.8kgcDCMBT_STf43MVkeUUiq-K6r-Ytp3nUQ6d-nL2D0';
const NARU_EF_BASE = NARU_SUPABASE_URL + '/functions/v1';
const sb = window.supabase.createClient(NARU_SUPABASE_URL, NARU_SUPABASE_ANON);

/* ═══════════════════════════════════════════
   2. GLOBAL STATE
   ═══════════════════════════════════════════ */
const S = {
  user: null,
  profile: null,     // users row
  company: null,     // companies row
  products: [],
  pipelines: [],
  analyses: [],
  loading: true,
  route: 'pipeline',
  sub: null,          // subscription
  _listeners: [],
  _realtimeSubs: []
};

function onStateChange(fn) { S._listeners.push(fn); }
function notify() { S._listeners.forEach(fn => { try { fn(S); } catch(e) { console.error('상태 리스너 오류:', e); } }); }

/* ═══════════════════════════════════════════
   3. AUTH
   ═══════════════════════════════════════════ */
const Auth = {
  async init() {
    const { data: { session } } = await sb.auth.getSession();
    if (session) {
      S.user = session.user;
      await Auth.loadProfile();
    }
    S.loading = false;
    notify();

    // Listen for auth changes
    sb.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        S.user = session.user;
        await Auth.loadProfile();
        notify();
      } else if (event === 'SIGNED_OUT') {
        S.user = null;
        S.profile = null;
        S.company = null;
        S.products = [];
        S.pipelines = [];
        S.analyses = [];
        S.sub = null;
        notify();
      }
    });
  },

  async loadProfile() {
    if (!S.user) return;
    // Load user profile
    const { data: profile } = await sb.from('users').select('*').eq('id', S.user.id).single();
    S.profile = profile;

    // Load company if exists
    if (profile && profile.company_id) {
      const { data: company } = await sb.from('companies').select('*').eq('id', profile.company_id).single();
      if (company) {
        company.name = company.name || company.name_ko || '';
        company.rep_name = company.rep_name || company.ceo_name_ko || '';
        company.biz_num = company.biz_num || company.biz_number || '';
        company.address = company.address || company.address_ko || '';
        company.name_en = company.name_en || '';
        company.address_en = company.address_en || '';
      }
      S.company = company;
    }

    // Load products (try company_id first, fallback to user_id)
    if (S.company) {
      let { data: products } = await sb.from('products').select('*').eq('company_id', S.company.id).order('created_at', { ascending: false });
      if (!products || products.length === 0) {
        const { data: p2 } = await sb.from('products').select('*').eq('user_id', S.user.id).order('created_at', { ascending: false });
        products = p2;
      }
      // Map name_ko to name if name is empty
      S.products = (products || []).map(p => ({ ...p, name: p.name || p.name_ko || 'Unnamed' }));
    }

    // Load analyses
    if (S.products.length) {
      const pids = S.products.map(p => p.id);
      const { data: analyses } = await sb.from('analyses').select('*').in('product_id', pids).order('created_at', { ascending: false });
      // ai_result → result 매핑, score 보정
      S.analyses = (analyses || []).map(a => ({
        ...a,
        result: a.result || a.ai_result || {},
        score: a.score ?? a.ai_result?.overall_score ?? null
      }));
    }

    // Load subscription
    const { data: sub } = await sb.from('subscriptions').select('*').eq('user_id', S.user.id).eq('status', 'active').single();
    S.sub = sub;

    // Load documents, deals, alibaba contracts, billing (non-blocking)
    Promise.all([
      typeof Docs !== 'undefined' && Docs.loadDocuments ? Docs.loadDocuments() : null,
      typeof Chat !== 'undefined' && Chat.loadDeals ? Chat.loadDeals() : null,
      typeof Settings !== 'undefined' && Settings.loadBilling ? Settings.loadBilling() : null,
      typeof Settings !== 'undefined' && Settings.loadAlibabaContracts ? Settings.loadAlibabaContracts() : null
    ]).then(() => notify()).catch(() => {});
  },

  async signInEmail(email, password) {
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  async signUpEmail(email, password, meta = {}) {
    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: { data: meta }
    });
    if (error) throw error;
    return data;
  },

  async signInOAuth(provider) {
    const { data, error } = await sb.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin + window.location.pathname }
    });
    if (error) throw error;
    return data;
  },

  async signOut() {
    // Cleanup realtime subscriptions
    S._realtimeSubs.forEach(ch => sb.removeChannel(ch));
    S._realtimeSubs = [];
    await sb.auth.signOut();
  },

  async resetPassword(email) {
    const { error } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + window.location.pathname
    });
    if (error) throw error;
  }
};

/* ═══════════════════════════════════════════
   4. ROUTER
   ═══════════════════════════════════════════ */
const Router = {
  routes: {},

  register(name, renderFn) {
    Router.routes[name] = renderFn;
  },

  go(route, params = {}) {
    S.route = route;
    S._routeParams = params;
    window.location.hash = route;
    notify();
  },

  init() {
    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.slice(1) || 'pipeline';
      S.route = hash;
      notify();
    });
    const hash = window.location.hash.slice(1);
    if (hash) S.route = hash;
  },

  render(container) {
    const fn = Router.routes[S.route];
    if (fn) {
      const html = fn(S);
      if (typeof html === 'string') container.innerHTML = html;
    } else {
      container.innerHTML = '<div style="padding:40px;text-align:center;color:var(--tx2)">페이지를 찾을 수 없습니다.</div>';
    }
  }
};

/* ═══════════════════════════════════════════
   5. UI HELPERS
   ═══════════════════════════════════════════ */
const UI = {
  // Toast notification
  toast(msg, type = 'info', duration = 3000) {
    const colors = { info: '#00d4ff', success: '#22c55e', warn: '#f59e0b', error: '#ef4444' };
    const el = document.createElement('div');
    el.style.cssText = `position:fixed;top:20px;right:20px;z-index:10000;padding:14px 24px;border-radius:12px;font-size:14px;font-weight:600;color:#fff;background:${colors[type] || colors.info};box-shadow:0 8px 24px rgba(0,0,0,.4);transform:translateX(120%);transition:transform .3s ease;max-width:400px;word-break:keep-all`;
    el.textContent = msg;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.style.transform = 'translateX(0)');
    setTimeout(() => {
      el.style.transform = 'translateX(120%)';
      setTimeout(() => el.remove(), 300);
    }, duration);
  },

  // Modal
  modal(title, bodyHtml, opts = {}) {
    const id = 'naru-modal-' + Date.now();
    const w = opts.width || '520px';
    const overlay = document.createElement('div');
    overlay.id = id;
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(4px)';
    overlay.innerHTML = `
      <div style="background:var(--s1);border:1px solid var(--bd);border-radius:16px;width:100%;max-width:${w};max-height:90vh;overflow-y:auto">
        <div style="display:flex;align-items:center;padding:20px 24px;border-bottom:1px solid var(--bd)">
          <h3 style="flex:1;font-size:17px;font-weight:700;color:#fff;margin:0">${title}</h3>
          <button onclick="UI.closeModal('${id}')" style="background:none;border:none;color:var(--tx2);font-size:22px;cursor:pointer;padding:0 4px;line-height:1">&times;</button>
        </div>
        <div style="padding:24px" id="${id}-body">${bodyHtml}</div>
      </div>`;
    if (!opts.persistent) {
      overlay.addEventListener('click', e => { if (e.target === overlay) UI.closeModal(id); });
    }
    document.body.appendChild(overlay);
    return id;
  },

  closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
  },

  // Confirm dialog
  async confirm(msg) {
    return new Promise(resolve => {
      const id = UI.modal('확인', `
        <p style="font-size:14px;color:var(--tx);margin-bottom:20px;line-height:1.6">${msg}</p>
        <div style="display:flex;gap:10px;justify-content:flex-end">
          <button onclick="UI.closeModal('${Date.now()}');window._confirmResolve(false)" class="btn btn-ghost" id="confirm-no">취소</button>
          <button onclick="window._confirmResolve(true)" class="btn btn-pri" id="confirm-yes">확인</button>
        </div>
      `, { persistent: true });
      window._confirmResolve = (v) => { UI.closeModal(id); resolve(v); };
      document.getElementById('confirm-no').onclick = () => { UI.closeModal(id); resolve(false); };
      document.getElementById('confirm-yes').onclick = () => { UI.closeModal(id); resolve(true); };
    });
  },

  // Badge
  badge(text, type = 'default') {
    const styles = {
      default: 'background:var(--s3);color:var(--tx2)',
      pri: 'background:rgba(0,212,255,.1);color:#00d4ff',
      grn: 'background:rgba(34,197,94,.1);color:#22c55e',
      ylw: 'background:rgba(245,158,11,.1);color:#f59e0b',
      red: 'background:rgba(239,68,68,.1);color:#ef4444',
      acc: 'background:rgba(168,85,247,.1);color:#a855f7',
      org: 'background:rgba(249,115,22,.1);color:#f97316'
    };
    return `<span style="display:inline-block;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:700;${styles[type] || styles.default}">${text}</span>`;
  },

  // Loading spinner
  loading(text = '로딩 중...') {
    return `<div style="display:flex;align-items:center;justify-content:center;padding:60px;gap:12px">
      <div style="width:20px;height:20px;border:2px solid var(--bd);border-top-color:var(--pri);border-radius:50%;animation:spin .8s linear infinite"></div>
      <span style="color:var(--tx2);font-size:14px">${text}</span>
    </div>`;
  },

  // Empty state
  empty(icon, title, desc, ctaText, ctaAction) {
    let cta = '';
    if (ctaText) {
      cta = `<button onclick="${ctaAction}" class="btn btn-pri" style="margin-top:16px">${ctaText}</button>`;
    }
    return `<div style="text-align:center;padding:60px 20px">
      <div style="font-size:48px;margin-bottom:12px">${icon}</div>
      <h3 style="font-size:17px;font-weight:700;color:#fff;margin-bottom:8px">${title}</h3>
      <p style="font-size:13px;color:var(--tx2);max-width:360px;margin:0 auto">${desc}</p>
      ${cta}
    </div>`;
  },

  // Format number
  num(n) {
    if (n == null) return '-';
    return Number(n).toLocaleString('ko-KR');
  },

  // Format currency
  won(n) {
    if (n == null) return '-';
    return Number(n).toLocaleString('ko-KR') + '원';
  },

  usd(n) {
    if (n == null) return '-';
    return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },

  // Date format
  date(d) {
    if (!d) return '-';
    const dt = new Date(d);
    return dt.getFullYear() + '.' + String(dt.getMonth() + 1).padStart(2, '0') + '.' + String(dt.getDate()).padStart(2, '0');
  },

  dateTime(d) {
    if (!d) return '-';
    const dt = new Date(d);
    return UI.date(d) + ' ' + String(dt.getHours()).padStart(2, '0') + ':' + String(dt.getMinutes()).padStart(2, '0');
  },

  // Relative time
  ago(d) {
    if (!d) return '';
    const diff = Date.now() - new Date(d).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return '방금';
    if (m < 60) return m + '분 전';
    const h = Math.floor(m / 60);
    if (h < 24) return h + '시간 전';
    const days = Math.floor(h / 24);
    if (days < 30) return days + '일 전';
    return UI.date(d);
  },

  // Score color
  scoreColor(s) {
    if (s >= 80) return '#22c55e';
    if (s >= 60) return '#f59e0b';
    return '#ef4444';
  },

  // Error message translator (English → Korean)
  err(e) {
    const msg = (e && e.message) ? e.message : String(e || '');
    const map = {
      'Invalid login credentials': '이메일 또는 비밀번호가 올바르지 않습니다.',
      'Email not confirmed': '이메일 인증이 필요합니다. 메일함을 확인해주세요.',
      'User already registered': '이미 가입된 이메일입니다.',
      'Password should be at least 6 characters': '비밀번호는 6자 이상이어야 합니다.',
      'Email rate limit exceeded': '너무 많은 요청입니다. 잠시 후 다시 시도해주세요.',
      'JWT expired': '세션이 만료되었습니다. 다시 로그인해주세요.',
      'new row violates row-level security policy': '권한이 없습니다. 로그인 상태를 확인해주세요.',
      'duplicate key value violates unique constraint': '이미 등록된 데이터입니다.',
      'violates check constraint': '입력값이 허용 범위를 벗어났습니다.',
      'violates foreign key constraint': '연결된 데이터가 존재하지 않습니다.',
      'network': '네트워크 연결을 확인해주세요.',
      'Failed to fetch': '서버에 연결할 수 없습니다. 네트워크를 확인해주세요.',
      'API Error': 'API 요청에 실패했습니다.',
      'TypeError': '시스템 오류가 발생했습니다.',
      'null value in column': '필수 입력값이 누락되었습니다.',
      'value too long': '입력값이 너무 깁니다.',
      'Signups not allowed': '현재 회원가입이 비활성화되어 있습니다.',
      'Email link is invalid or has expired': '이메일 링크가 만료되었습니다. 다시 요청해주세요.',
      'Token has expired or is invalid': '인증 토큰이 만료되었습니다. 다시 로그인해주세요.'
    };
    for (const [eng, kor] of Object.entries(map)) {
      if (msg.toLowerCase().includes(eng.toLowerCase())) return kor;
    }
    // If already Korean, return as-is
    if (/[가-힣]/.test(msg)) return msg;
    return '오류가 발생했습니다. (' + msg + ')';
  },

  // Truncate text
  trunc(str, len = 40) {
    if (!str) return '';
    return str.length > len ? str.slice(0, len) + '...' : str;
  }
};

/* ═══════════════════════════════════════════
   6. TOSS PAYMENTS
   ═══════════════════════════════════════════ */
const Pay = {
  // Toss client key — REPLACE with real key for production
  TOSS_CK: 'test_ck_REPLACE_WITH_YOUR_TOSS_CLIENT_KEY',
  _instance: null,

  async getToss() {
    if (!Pay._instance && Pay.TOSS_CK.indexOf('REPLACE') === -1 && typeof TossPayments !== 'undefined') {
      const tp = TossPayments(Pay.TOSS_CK);
      const ck = S.user ? S.user.id.replace(/-/g, '').slice(0, 20) : 'guest';
      Pay._instance = tp.payment({ customerKey: ck });
    }
    return Pay._instance;
  },

  // One-time payment (for analysis credits, documents)
  async payOnce(amount, orderName, orderId) {
    const toss = await Pay.getToss();
    if (!toss) {
      UI.toast('결제 시스템 준비 중입니다.', 'warn');
      return;
    }
    const oid = orderId || 'NARU-' + Date.now();
    await toss.requestPayment({
      method: 'CARD',
      amount: { currency: 'KRW', value: amount },
      orderId: oid,
      orderName,
      successUrl: window.location.origin + window.location.pathname + '?pay=success&oid=' + oid,
      failUrl: window.location.origin + window.location.pathname + '?pay=fail'
    });
  },

  // Confirm payment (called after redirect)
  async confirmPayment(paymentKey, orderId, amount) {
    const token = (await sb.auth.getSession()).data.session?.access_token;
    const res = await fetch(NARU_EF_BASE + '/toss-confirm-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ paymentKey, orderId, amount })
    });
    return res.json();
  },

  // Billing key for subscription
  async issueBillingKey(planId) {
    const toss = await Pay.getToss();
    if (!toss) {
      UI.toast('결제 시스템 준비 중입니다.', 'warn');
      return;
    }
    const oid = 'NARU-SUB-' + Date.now();
    await toss.requestBillingKeyAndPay({
      method: 'CARD',
      amount: { currency: 'KRW', value: planId === 'starter' ? 9900 : 19900 },
      orderId: oid,
      orderName: '나루 ' + (planId === 'starter' ? 'Starter' : 'Pro') + ' 구독',
      successUrl: window.location.origin + window.location.pathname + '?billing=success&plan=' + planId + '&oid=' + oid,
      failUrl: window.location.origin + window.location.pathname + '?billing=fail'
    });
  },

  // Handle payment redirect
  async handleRedirect() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('pay') === 'success') {
      const pk = params.get('paymentKey');
      const oid = params.get('orderId');
      const amt = parseInt(params.get('amount'));
      if (pk && oid && amt) {
        try {
          await Pay.confirmPayment(pk, oid, amt);
          UI.toast('결제가 완료되었습니다.', 'success');
        } catch (e) {
          UI.toast('결제 확인 중 오류: ' + UI.err(e), 'error');
        }
      }
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname + window.location.hash);
    }
    if (params.get('billing') === 'success') {
      const plan = params.get('plan');
      const pk = params.get('paymentKey');
      const oid = params.get('orderId');
      const amt = parseInt(params.get('amount'));
      if (pk && oid && amt) {
        try {
          const token = (await sb.auth.getSession()).data.session?.access_token;
          await fetch(NARU_EF_BASE + '/toss-billing-issue', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ paymentKey: pk, orderId: oid, amount: amt, plan })
          });
          UI.toast('구독이 시작되었습니다!', 'success');
          await Auth.loadProfile();
          notify();
        } catch (e) {
          UI.toast('구독 처리 중 오류: ' + UI.err(e), 'error');
        }
      }
      window.history.replaceState({}, '', window.location.pathname + window.location.hash);
    }
  }
};

/* ═══════════════════════════════════════════
   7. API HELPERS (Edge Function calls)
   ═══════════════════════════════════════════ */
const API = {
  async call(fnName, body = {}) {
    const session = (await sb.auth.getSession()).data.session;
    const headers = { 'Content-Type': 'application/json' };
    if (session) headers['Authorization'] = 'Bearer ' + session.access_token;
    const res = await fetch(NARU_EF_BASE + '/' + fnName, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || err.message || 'API 요청에 실패했습니다.');
    }
    return res.json();
  },

  // Analyze product — DB에서 제품 조회 후 analyze-export EF 호출
  async analyzeProduct(productId, opts = {}) {
    // 1) 제품 정보 조회
    const { data: prod, error: pErr } = await sb.from('products')
      .select('*').eq('id', productId).single();
    if (pErr || !prod) throw new Error('제품 정보를 불러올 수 없습니다.');

    // 2) analyses 레코드 미리 생성 (EF가 status 업데이트용으로 사용)
    const { data: aRow, error: aErr } = await sb.from('analyses').insert({
      product_id: productId,
      product_name: prod.name || prod.name_ko || '제품',
      product_url: prod.url || null,
      product_image_url: (prod.images && prod.images[0]) || null,
      user_id: S.user.id,
      status: 'processing',
      analysis_type: 'export'
    }).select().single();

    // 3) analyze-export EF 호출 (실제 AI 분석)
    const payload = {
      product_name: prod.name || prod.name_ko || '',
      product_name_en: prod.name_en || prod.name || '',
      description: prod.description || '',
      category: prod.category || '',
      fob_price: prod.fob_price || null,
      moq: prod.moq || null,
      brand_name: prod.brand_name || '',
      urls: prod.url ? [prod.url] : [],
      target_markets: opts.markets || ['US', 'JP', 'VN'],
      existing_certs: prod.certs || [],
      analysis_id: aRow?.id || null,
      ...opts
    };

    const result = await API.call('analyze-export', payload);

    // 4) EF가 직접 업데이트 못 했으면 여기서 저장
    if (aRow && result?.result) {
      const score = result.result.overall_score || 0;
      await sb.from('analyses').update({
        status: 'completed',
        score: score,
        ai_result: result.result
      }).eq('id', aRow.id);

      // 제품 상태 업데이트
      await sb.from('products').update({ status: 'matching' }).eq('id', productId);
    }

    return result;
  },

  // Generate document
  async generateDoc(type, pipelineId, data = {}) {
    return API.call('generate-document', { type, pipeline_id: pipelineId, ...data });
  },

  // Translate
  async translate(text, targetLang) {
    return API.call('translate', { text, target_lang: targetLang });
  },

  // Search buyers
  async searchBuyers(productId) {
    return API.call('search-buyers', { product_id: productId });
  }
};

/* ═══════════════════════════════════════════
   8. COMPANY SETUP (for new users)
   ═══════════════════════════════════════════ */
const Setup = {
  async createCompany(data) {
    // data: { name, biz_num, type, address, rep_name, phone }
    // Check if user already has a company (UNIQUE constraint on user_id)
    const { data: existing } = await sb.from('companies').select('*').eq('user_id', S.user.id).single();

    let company;
    if (existing) {
      // Update existing company
      const { data: updated, error } = await sb.from('companies').update({
        name: data.name,
        name_ko: data.name,
        biz_num: data.biz_num || null,
        biz_number: data.biz_num || null,
        company_type: data.type || existing.company_type || 'seller',
        address: data.address || null,
        address_ko: data.address || null,
        rep_name: data.rep_name || null,
        ceo_name_ko: data.rep_name || null,
        phone: data.phone || null
      }).eq('id', existing.id).select().single();
      if (error) throw error;
      company = updated;
    } else {
      // Create new company
      const { data: created, error } = await sb.from('companies').insert({
        user_id: S.user.id,
        name: data.name,
        name_ko: data.name,
        biz_num: data.biz_num || null,
        biz_number: data.biz_num || null,
        company_type: data.type || 'seller',
        address: data.address || null,
        address_ko: data.address || null,
        rep_name: data.rep_name || null,
        ceo_name_ko: data.rep_name || null,
        phone: data.phone || null
      }).select().single();
      if (error) throw error;
      company = created;
    }

    // Link user to company
    await sb.from('users').update({ company_id: company.id }).eq('id', S.user.id);
    S.company = company;
    if (S.profile) S.profile.company_id = company.id;
    notify();
    return company;
  },

  async createProduct(data) {
    // data: { name, url, category, images, fob_price }
    if (!S.company) throw new Error('회사 정보를 먼저 등록해주세요.');
    const { data: product, error } = await sb.from('products').insert({
      user_id: S.user.id,
      company_id: S.company.id,
      name: data.name,
      name_ko: data.name,
      url: data.url || null,
      category: data.category || null,
      images: data.images || [],
      fob_price: data.fob_price || null,
      status: 'registered'
    }).select().single();
    if (error) throw error;
    S.products.unshift(product);
    notify();
    return product;
  }
};

/* ═══════════════════════════════════════════
   9. RENDER ENGINE
   ═══════════════════════════════════════════ */
function renderApp() {
  const app = document.getElementById('naru-app');
  if (!app) return;

  // Loading state
  if (S.loading) {
    app.innerHTML = UI.loading('나루 로딩 중...');
    return;
  }

  // Not logged in → show auth screen
  if (!S.user) {
    renderAuth(app);
    return;
  }

  // No company → show onboarding
  if (!S.company) {
    renderOnboarding(app);
    return;
  }

  // Main app
  renderMainApp(app);
}

function renderAuth(container) {
  container.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px">
      <div style="width:100%;max-width:400px">
        <div style="text-align:center;margin-bottom:32px">
          <h1 style="font-size:36px;font-weight:900;background:linear-gradient(135deg,#00d4ff,#a855f7);-webkit-background-clip:text;-webkit-text-fill-color:transparent">나루</h1>
          <p style="color:var(--tx2);font-size:14px;margin-top:4px">제품이 국경을 건너는 곳</p>
        </div>
        <div style="background:var(--s1);border:1px solid var(--bd);border-radius:16px;padding:28px">
          <div id="auth-mode-tabs" style="display:flex;gap:0;margin-bottom:24px;background:var(--s3);border-radius:10px;padding:3px">
            <button onclick="Naru._authTab('login')" id="tab-login" class="btn" style="flex:1;border-radius:8px;font-size:13px;padding:8px;background:var(--pri);color:#000;font-weight:700;border:none">로그인</button>
            <button onclick="Naru._authTab('signup')" id="tab-signup" class="btn" style="flex:1;border-radius:8px;font-size:13px;padding:8px;background:transparent;color:var(--tx2);font-weight:600;border:none;cursor:pointer">회원가입</button>
          </div>
          <form id="auth-form" onsubmit="Naru._authSubmit(event)">
            <div style="margin-bottom:14px">
              <label style="font-size:12px;color:var(--tx2);font-weight:600;display:block;margin-bottom:6px">이메일</label>
              <input name="email" type="email" required placeholder="email@example.com" style="width:100%;padding:12px 14px;border-radius:10px;border:1px solid var(--bd);background:var(--s2);color:#fff;font-size:14px;outline:none">
            </div>
            <div style="margin-bottom:20px">
              <label style="font-size:12px;color:var(--tx2);font-weight:600;display:block;margin-bottom:6px">비밀번호</label>
              <input name="password" type="password" required minlength="6" placeholder="6자 이상" style="width:100%;padding:12px 14px;border-radius:10px;border:1px solid var(--bd);background:var(--s2);color:#fff;font-size:14px;outline:none">
            </div>
            <button type="submit" class="btn btn-pri" style="width:100%;padding:14px;font-size:15px;font-weight:700;border-radius:10px">로그인</button>
          </form>
          <div style="margin-top:20px;display:flex;align-items:center;gap:12px">
            <div style="flex:1;height:1px;background:var(--bd)"></div>
            <span style="font-size:12px;color:var(--tx2)">또는</span>
            <div style="flex:1;height:1px;background:var(--bd)"></div>
          </div>
          <div style="margin-top:16px;display:flex;flex-direction:column;gap:10px">
            <button onclick="Auth.signInOAuth('kakao')" class="btn" style="width:100%;padding:12px;border-radius:10px;background:#FEE500;color:#191919;font-weight:700;font-size:14px;border:none;cursor:pointer">카카오로 시작</button>
            <button onclick="Auth.signInOAuth('google')" class="btn" style="width:100%;padding:12px;border-radius:10px;background:#fff;color:#333;font-weight:700;font-size:14px;border:none;cursor:pointer">Google로 시작</button>
          </div>
        </div>
      </div>
    </div>`;
}

function renderOnboarding(container) {
  container.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px">
      <div style="width:100%;max-width:500px">
        <div style="text-align:center;margin-bottom:24px">
          <h2 style="font-size:22px;font-weight:800;color:#fff">회사 정보 등록</h2>
          <p style="font-size:14px;color:var(--tx2);margin-top:6px">수출 서비스를 위해 기본 정보를 입력해주세요.</p>
        </div>
        <form id="onboard-form" onsubmit="Naru._onboardSubmit(event)" style="background:var(--s1);border:1px solid var(--bd);border-radius:16px;padding:28px">
          <div style="margin-bottom:14px">
            <label style="font-size:12px;color:var(--tx2);font-weight:600;display:block;margin-bottom:6px">회사명 *</label>
            <input name="name" required placeholder="(주)모티브이노베이션" style="width:100%;padding:12px 14px;border-radius:10px;border:1px solid var(--bd);background:var(--s2);color:#fff;font-size:14px;outline:none">
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">
            <div>
              <label style="font-size:12px;color:var(--tx2);font-weight:600;display:block;margin-bottom:6px">대표자명</label>
              <input name="rep_name" placeholder="홍길동" style="width:100%;padding:12px 14px;border-radius:10px;border:1px solid var(--bd);background:var(--s2);color:#fff;font-size:14px;outline:none">
            </div>
            <div>
              <label style="font-size:12px;color:var(--tx2);font-weight:600;display:block;margin-bottom:6px">연락처</label>
              <input name="phone" placeholder="010-1234-5678" style="width:100%;padding:12px 14px;border-radius:10px;border:1px solid var(--bd);background:var(--s2);color:#fff;font-size:14px;outline:none">
            </div>
          </div>
          <div style="margin-bottom:14px">
            <label style="font-size:12px;color:var(--tx2);font-weight:600;display:block;margin-bottom:6px">사업자등록번호</label>
            <input name="biz_num" placeholder="123-45-67890" style="width:100%;padding:12px 14px;border-radius:10px;border:1px solid var(--bd);background:var(--s2);color:#fff;font-size:14px;outline:none">
          </div>
          <div style="margin-bottom:20px">
            <label style="font-size:12px;color:var(--tx2);font-weight:600;display:block;margin-bottom:6px">주소</label>
            <input name="address" placeholder="서울시 강남구..." style="width:100%;padding:12px 14px;border-radius:10px;border:1px solid var(--bd);background:var(--s2);color:#fff;font-size:14px;outline:none">
          </div>
          <button type="submit" class="btn btn-pri" style="width:100%;padding:14px;font-size:15px;font-weight:700;border-radius:10px">등록하고 시작하기</button>
        </form>
      </div>
    </div>`;
}

function renderMainApp(container) {
  const navItems = [
    { id: 'pipeline', icon: '📊', label: '파이프라인' },
    { id: 'analyze', icon: '🤖', label: 'AI 분석' },
    { id: 'documents', icon: '📄', label: '서류함' },
    { id: 'chat', icon: '💬', label: '채팅' },
    { id: 'cost', icon: '🧮', label: '비용계산' },
    { id: 'settings', icon: '⚙️', label: '설정' }
  ];

  const nav = navItems.map(n =>
    `<a href="#${n.id}" class="nav-item ${S.route === n.id ? 'active' : ''}" onclick="Router.go('${n.id}')">
      <span class="nav-icon">${n.icon}</span>
      <span class="nav-label">${n.label}</span>
    </a>`
  ).join('');

  container.innerHTML = `
    <div class="app-layout">
      <aside class="app-sidebar">
        <div class="sidebar-logo">나루</div>
        <nav class="sidebar-nav">${nav}</nav>
        <div class="sidebar-user">
          <div style="font-size:13px;font-weight:600;color:#fff;margin-bottom:2px">${S.company ? UI.trunc(S.company.name, 16) : ''}</div>
          <div style="font-size:11px;color:var(--tx2)">${S.user ? S.user.email : ''}</div>
          <button onclick="Auth.signOut()" style="margin-top:8px;background:none;border:1px solid var(--bd);border-radius:6px;padding:4px 12px;font-size:11px;color:var(--tx2);cursor:pointer">로그아웃</button>
        </div>
      </aside>
      <main class="app-main" id="naru-main"></main>
    </div>`;

  // Render current route
  const main = document.getElementById('naru-main');
  Router.render(main);
}

/* ═══════════════════════════════════════════
   10. NARU GLOBAL NAMESPACE
   ═══════════════════════════════════════════ */
const Naru = {
  _authMode: 'login',

  _authTab(mode) {
    Naru._authMode = mode;
    const loginTab = document.getElementById('tab-login');
    const signupTab = document.getElementById('tab-signup');
    const btn = document.querySelector('#auth-form button[type="submit"]');
    if (mode === 'login') {
      loginTab.style.cssText = 'flex:1;border-radius:8px;font-size:13px;padding:8px;background:var(--pri);color:#000;font-weight:700;border:none';
      signupTab.style.cssText = 'flex:1;border-radius:8px;font-size:13px;padding:8px;background:transparent;color:var(--tx2);font-weight:600;border:none;cursor:pointer';
      btn.textContent = '로그인';
    } else {
      signupTab.style.cssText = 'flex:1;border-radius:8px;font-size:13px;padding:8px;background:var(--pri);color:#000;font-weight:700;border:none';
      loginTab.style.cssText = 'flex:1;border-radius:8px;font-size:13px;padding:8px;background:transparent;color:var(--tx2);font-weight:600;border:none;cursor:pointer';
      btn.textContent = '회원가입';
    }
  },

  async _authSubmit(e) {
    e.preventDefault();
    const f = e.target;
    const email = f.email.value.trim();
    const pw = f.password.value;
    try {
      if (Naru._authMode === 'login') {
        await Auth.signInEmail(email, pw);
      } else {
        await Auth.signUpEmail(email, pw, { role: 'client' });
        UI.toast('가입 완료! 이메일을 확인해주세요.', 'success');
      }
    } catch (err) {
      UI.toast(UI.err(err), 'error');
    }
  },

  async _onboardSubmit(e) {
    e.preventDefault();
    const f = e.target;
    try {
      await Setup.createCompany({
        name: f.name.value.trim(),
        rep_name: f.rep_name.value.trim(),
        phone: f.phone.value.trim(),
        biz_num: f.biz_num.value.trim(),
        address: f.address.value.trim()
      });
      UI.toast('회사 등록 완료!', 'success');
    } catch (err) {
      UI.toast(UI.err(err), 'error');
    }
  }
};

/* ═══════════════════════════════════════════
   11. INIT
   ═══════════════════════════════════════════ */
async function initNaru() {
  Router.init();
  onStateChange(renderApp);
  await Auth.init();
  await Pay.handleRedirect();
}

// Auto-init when DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initNaru);
} else {
  initNaru();
}

// Export globals
window.S = S;
window.sb = sb;
window.UI = UI;
window.Auth = Auth;
window.Router = Router;
window.Pay = Pay;
window.API = API;
window.Setup = Setup;
window.Naru = Naru;
