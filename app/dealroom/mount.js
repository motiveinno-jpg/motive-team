// /app/dealroom/mount.js
import { createStore } from './state/store.js';
import { renderLayout } from './ui/layout.js';
import { renderMessageItem } from './ui/chat/messageItem.js';
import { subscribeDealMessages, loadInitialDealMessages } from './realtime/messages.js';
import { attachDealroomActionRouter } from './actions/actionRouter.js';
import { wireActionBar } from './ui/actionBar.js';
import { fetchDealDocuments, subscribeDealDocuments } from './data/documents.js';
import { renderDocumentsPanel } from './ui/sidebar/documentsPanel.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function byId(root, id) {
  const el = root.querySelector(id);
  if (!el) throw new Error(`Missing element: ${id}`);
  return el;
}

function safeJson(v, fallback = {}) {
  try { return typeof v === 'string' ? JSON.parse(v) : (v ?? fallback); }
  catch { return fallback; }
}

function normalizeMsg(row) {
  return {
    id: row.id,
    deal_id: row.deal_id,
    created_at: row.created_at,
    sender_id: row.sender_id ?? null,
    sender_role: row.sender_role ?? (row.is_system ? 'system' : 'unknown'),
    message_type: row.message_type ?? 'text',
    content: row.content ?? '',
    payload: typeof row.payload === 'object' && row.payload ? row.payload : safeJson(row.payload, {}),
    ref_type: row.ref_type ?? null,
    ref_id: row.ref_id ?? null,
    is_system: !!row.is_system,
  };
}

function escapeHtml(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function renderMessages($list, messages) {
  $list.replaceChildren(...(messages || []).map(renderMessageItem));
  $list.scrollTop = $list.scrollHeight;
}

/**
 * Mount the DealRoom into a root element.
 * @param {HTMLElement} rootEl - Container element
 * @param {Object} opts - { supabase, dealId, currentUser, role }
 * @returns {Function} cleanup - Call to unmount
 */
export async function mountDealRoom(rootEl, { supabase, dealId, currentUser, role }) {
  assert(rootEl, 'rootEl is required');
  assert(supabase, 'supabase client is required');
  assert(dealId, 'dealId is required');

  const store = createStore({
    messages: [],
    documents: [],
    deal: { id: dealId },
    participants: [],
    currentStage: '',
    loading: true,
    error: null,
    me: { id: currentUser?.id ?? null, role: role ?? null },
    ui: { mobileSidebarOpen: false },
    lastSeenAt: null,
  });

  // Render layout (self-contained CSS)
  renderLayout(rootEl, store);

  const $chatList = byId(rootEl, '#dr-chat-list');
  const $sidebar = byId(rootEl, '#dr-sidebar');
  const $actionBar = byId(rootEl, '#dr-action-bar');
  const $title = byId(rootEl, '#dr-title');
  const $status = byId(rootEl, '#dr-status');

  // Header
  $title.innerHTML = `Deal Room <span style="opacity:.55;font-weight:400;font-size:12px;">${escapeHtml(dealId.substring(0, 8))}…</span>`;

  // Store -> UI bindings
  const offAny = store.onAny((event, payload, state) => {
    if (event === 'MESSAGES_SET' || event === 'MESSAGE_RECEIVED' || event === 'GAP_MESSAGES_APPENDED') {
      renderMessages($chatList, state.messages);
    }
    if (event === 'LOADING_SET' || event === 'ERROR_SET') {
      $status.textContent = state.loading ? 'Loading…' : (state.error ? 'Error' : 'Ready');
      $status.style.color = state.error ? '#b91c1c' : '';
    }
    if (event === 'SIDEBAR_TOGGLE') {
      rootEl.querySelector('.dr-root')?.classList.toggle('dr-sidebar-open', !!state.ui.mobileSidebarOpen);
    }
  });

  // Sidebar renderer with Next Actions
  const STAGE_COLORS = {
    prospect: '#94a3b8', inquiry: '#f59e0b', negotiation: '#3b82f6',
    contract: '#8b5cf6', payment: '#22c55e', shipping: '#14b8a6',
    completed: '#22c55e', cancelled: '#ef4444',
  };

  function getNextActions(state) {
    const actions = [];
    const docs = state.documents || [];
    const msgs = state.messages || [];
    const stage = state.currentStage || 'prospect';
    const hasQuote = msgs.some(m => m.message_type === 'quote_card');
    const hasApprovedQuote = msgs.some(m => m.message_type === 'quote_card' && m.payload?.status === 'approved');
    const hasPIDraft = docs.some(d => d.doc_type === 'PI' && (d.status_v2 || d.status) === 'draft');
    const hasPISent = docs.some(d => d.doc_type === 'PI' && (d.status_v2 || d.status) === 'sent');
    const hasPIApproved = docs.some(d => d.doc_type === 'PI' && (d.status_v2 || d.status) === 'approved');
    const participants = state.participants || [];

    if (participants.length < 2) {
      actions.push({ icon: '👥', text: '바이어를 초대하세요', action: 'invite' });
    }
    if (!hasQuote) {
      actions.push({ icon: '📝', text: '견적을 작성하세요', action: 'quote' });
    } else if (!hasApprovedQuote) {
      actions.push({ icon: '⏳', text: '바이어 견적 승인 대기 중', action: null });
    }
    if (hasApprovedQuote && !hasPIDraft && !hasPISent && !hasPIApproved) {
      actions.push({ icon: '📋', text: 'PI를 생성하세요', action: 'doc' });
    }
    if (hasPIDraft) {
      actions.push({ icon: '📤', text: 'PI를 바이어에게 전송하세요', action: 'send_doc' });
    }
    if (hasPISent) {
      actions.push({ icon: '⏳', text: '바이어 PI 승인 대기 중', action: null });
    }
    if (hasPIApproved) {
      actions.push({ icon: '✅', text: 'PI 승인 완료! 다음 서류를 준비하세요', action: 'doc' });
    }
    if (actions.length === 0) {
      actions.push({ icon: '🚀', text: '거래를 시작하세요', action: null });
    }
    return actions.slice(0, 3);
  }

  function renderSidebar(state) {
    const stage = state.currentStage || 'prospect';
    const stageColor = STAGE_COLORS[stage] || '#94a3b8';
    const nextActions = getNextActions(state);

    $sidebar.innerHTML = `
      <div class="dr-panel">
        <div class="dr-panel-title">Stage</div>
        <div class="dr-panel-body" style="display:flex;align-items:center;gap:8px;">
          <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${stageColor};"></span>
          <span style="font-weight:700;text-transform:uppercase;font-size:13px;">${escapeHtml(stage)}</span>
        </div>
      </div>
      <div class="dr-panel">
        <div class="dr-panel-title">Next Actions</div>
        <div class="dr-panel-body" style="display:flex;flex-direction:column;gap:6px;">
          ${nextActions.map(a => `
            <div style="display:flex;align-items:center;gap:8px;padding:6px 8px;background:#f8fafc;border-radius:8px;font-size:13px;${a.action ? 'cursor:pointer;' : 'opacity:.8;'}"
              ${a.action ? `data-sidebar-action="${a.action}"` : ''}>
              <span style="font-size:16px;">${a.icon}</span>
              <span>${escapeHtml(a.text)}</span>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="dr-panel">
        <div class="dr-panel-title">Participants (${(state.participants || []).length})</div>
        <div class="dr-panel-body">
          ${(state.participants || []).length
            ? (state.participants || []).map(p => `<span class="dr-pill">${escapeHtml(p.participant_role || '')}</span>`).join(' ')
            : '<span style="opacity:.6">No participants yet</span>'}
        </div>
      </div>
      ${renderDocumentsPanel(state.documents)}
    `;

    // Wire sidebar action clicks
    $sidebar.querySelectorAll('[data-sidebar-action]').forEach(el => {
      el.addEventListener('click', () => {
        const act = el.getAttribute('data-sidebar-action');
        if (act === 'invite' || act === 'quote' || act === 'doc' || act === 'send_doc') {
          const barBtn = $actionBar.querySelector(`[data-dr="${act}"]`);
          if (barBtn) barBtn.click();
        }
      });
    });
  }

  const offSidebar = store.subscribe('STATE_CHANGED', (s) => renderSidebar(s));

  // Mobile sidebar toggle
  const $toggle = rootEl.querySelector('#dr-sidebar-toggle');
  if ($toggle) {
    $toggle.addEventListener('click', () => store.dispatch('SIDEBAR_TOGGLE'));
  }

  // Chat composer
  const $chatInput = rootEl.querySelector('#dr-chat-input');
  const $chatSend = rootEl.querySelector('#dr-chat-send');

  async function sendChatMessage() {
    const text = ($chatInput?.value || '').trim();
    if (!text) return;
    $chatInput.value = '';

    const tmpId = 'tmp_' + Date.now();
    const now = new Date().toISOString();
    const tmpMsg = normalizeMsg({
      id: tmpId,
      deal_id: dealId,
      created_at: now,
      sender_id: currentUser?.id ?? null,
      sender_role: role ?? 'seller',
      message_type: 'text',
      content: text,
      payload: {},
      is_system: false,
    });

    store.dispatch('MESSAGE_RECEIVED', tmpMsg);

    try {
      const { data, error } = await supabase
        .from('deal_messages')
        .insert({
          deal_id: dealId,
          sender_id: currentUser?.id ?? null,
          sender_role: role ?? 'seller',
          message_type: 'text',
          content: text,
        })
        .select()
        .single();

      if (error) throw error;

      // Replace temp message with real one
      const state = store.getState();
      const msgs = (state.messages || []).map(m => m.id === tmpId ? normalizeMsg(data) : m);
      store.setState({ messages: msgs, lastSeenAt: data.created_at });
      store.dispatch('MESSAGES_SET', msgs);
    } catch (e) {
      console.warn('[dealroom] send failed', e?.message || e);
    }
  }

  if ($chatSend) {
    $chatSend.addEventListener('click', sendChatMessage);
  }
  if ($chatInput) {
    $chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendChatMessage();
      }
    });
  }

  // Initial load
  store.dispatch('LOADING_SET', true);
  try {
    // Load messages
    const initial = await loadInitialDealMessages(supabase, dealId, 50);
    const messages = (initial || []).map(normalizeMsg);
    const lastSeenAt = messages.length ? messages[messages.length - 1].created_at : null;
    store.setState({ messages, lastSeenAt });
    store.dispatch('MESSAGES_SET', messages);

    // Load deal info
    const { data: deal } = await supabase
      .from('deals')
      .select('id, title, stage, status, currency, incoterms, payment_terms')
      .eq('id', dealId)
      .maybeSingle();

    if (deal) {
      store.setState({ deal, currentStage: deal.stage || 'prospect' });
    }

    // Load participants
    const { data: participants } = await supabase
      .from('deal_participants')
      .select('user_id, participant_role, company_id')
      .eq('deal_id', dealId);

    if (participants) {
      store.setState({ participants });
    }

    // Load documents
    const documents = await fetchDealDocuments(supabase, dealId);
    store.setState({ documents });

    store.dispatch('LOADING_SET', false);
  } catch (e) {
    store.setState({ error: e?.message || String(e), loading: false });
    store.dispatch('ERROR_SET', store.getState().error);
  }

  // Realtime subscribe
  const unsubscribe = subscribeDealMessages(supabase, dealId, store);

  // Realtime document changes
  const unsubDocs = subscribeDealDocuments(supabase, dealId, (eventType, newDoc) => {
    const state = store.getState();
    let docs = [...(state.documents || [])];
    if (eventType === 'INSERT') {
      docs = [newDoc, ...docs];
    } else if (eventType === 'UPDATE') {
      docs = docs.map(d => d.id === newDoc.id ? newDoc : d);
    } else if (eventType === 'DELETE') {
      docs = docs.filter(d => d.id !== newDoc.id);
    }
    store.setState({ documents: docs });
    store.dispatch('STATE_CHANGED', store.getState());
  });

  // Action router (dealroom:action events from card buttons)
  const offActions = attachDealroomActionRouter({ supabase, store, dealId });

  // Action bar (invite, quote, etc.)
  const offActionBar = wireActionBar({ rootEl, supabase, store, dealId });

  // Cleanup (unmount)
  return function cleanup() {
    try { unsubscribe?.(); } catch (_) {}
    try { unsubDocs?.(); } catch (_) {}
    try { offActions?.(); } catch (_) {}
    try { offActionBar?.(); } catch (_) {}
    try { offAny?.(); } catch (_) {}
    try { offSidebar?.(); } catch (_) {}
    rootEl.replaceChildren();
  };
}
