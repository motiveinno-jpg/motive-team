// /app/dealroom/ui/chat/messageItem.js
function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

function escapeHtml(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function fmtRole(r) {
  return (r || 'system').toUpperCase();
}

function fmtDate(iso) {
  try { return new Date(iso).toLocaleString(); } catch { return ''; }
}

function btn(label, action, disabled = false) {
  return `<button class="dr-btn" data-action="${action}" ${disabled ? 'disabled style="opacity:.5;cursor:not-allowed;"' : ''}>${escapeHtml(label)}</button>`;
}

function safeUrl(u) {
  if (!u) return null;
  try {
    const x = new URL(u, location.origin);
    if (x.protocol !== 'https:' && x.protocol !== 'http:') return null;
    return x.toString();
  } catch { return null; }
}

const QUOTE_FINAL_STATES = ['approved', 'rejected', 'expired', 'cancelled'];
const DOC_FINAL_STATES = ['approved', 'rejected', 'voided', 'cancelled'];

function renderText(msg) {
  return el(`
    <div class="dr-msg">
      <div class="dr-msg-meta">${fmtRole(msg.sender_role)} · ${fmtDate(msg.created_at)}</div>
      <div class="dr-msg-bubble">${escapeHtml(msg.content || '')}</div>
    </div>
  `);
}

function renderSystem(msg) {
  return el(`
    <div class="dr-msg">
      <div class="dr-msg-meta">SYSTEM · ${fmtDate(msg.created_at)}</div>
      <div class="dr-msg-bubble" style="background:#f8fafc;">${escapeHtml(msg.content || '')}</div>
    </div>
  `);
}

function renderQuoteCard(msg, myRole) {
  const p = msg.payload || {};
  const total = p.total_amount ?? p.total ?? '';
  const currency = p.currency ?? '';
  const incoterms = p.incoterms ?? '';
  const validUntil = p.valid_until ? fmtDate(p.valid_until) : '';
  const status = p.status ?? '';
  const quoteNo = p.quote_no ?? p.quoteNo ?? '';
  const isBuyer = (myRole || '').startsWith('buyer');

  // Action buttons depend on role and status
  let actionsHtml = '';
  if (QUOTE_FINAL_STATES.includes(status)) {
    actionsHtml = `<span class="dr-btn" style="opacity:.6;cursor:default;">${status === 'approved' ? '✓ 승인됨' : status}</span>`;
  } else if (status === 'revision_requested') {
    actionsHtml = isBuyer
      ? `<span class="dr-btn" style="opacity:.6;cursor:default;">수정요청됨</span>`
      : `${btn('견적 수정', 'quote_revise')}`;
  } else {
    actionsHtml = isBuyer
      ? `${btn('승인', 'quote_approve')}${btn('수정요청', 'quote_revision')}`
      : `<span class="dr-btn" style="opacity:.6;cursor:default;">바이어 응답 대기</span>`;
  }

  const node = el(`
    <div class="dr-msg">
      <div class="dr-msg-meta">${fmtRole(msg.sender_role)} · QUOTE</div>
      <div class="dr-msg-bubble">
        <div class="dr-card-title">Quote ${escapeHtml(quoteNo)}</div>
        <div class="dr-card-row">Status: ${escapeHtml(status)}</div>
        <div class="dr-card-row">Total: ${escapeHtml(currency)} ${escapeHtml(total)}</div>
        <div class="dr-card-row">Incoterms: ${escapeHtml(incoterms)}</div>
        <div class="dr-card-row">Valid until: ${escapeHtml(validUntil)}</div>
        <div class="dr-card-actions">${actionsHtml}</div>
      </div>
    </div>
  `);

  node.querySelectorAll('[data-action]').forEach((b) => {
    b.addEventListener('click', () => {
      const action = b.getAttribute('data-action');
      window.dispatchEvent(new CustomEvent('dealroom:action', {
        detail: { action, message: msg, payload: p, ref_type: msg.ref_type, ref_id: msg.ref_id },
      }));
    });
  });

  return node;
}

function renderDocumentCard(msg, myRole) {
  const p = msg.payload || {};
  const docType = p.doc_type ?? p.type ?? '';
  const docNo = p.doc_no ?? '';
  const status = p.status_v2 ?? p.status ?? '';
  const version = p.version ?? '';
  const downloadUrl = p.download_url ?? p.file_url ?? null;
  const isBuyer = (myRole || '').startsWith('buyer');

  // Approve button: buyers can approve sent docs, sellers see status
  let approveHtml = '';
  if (DOC_FINAL_STATES.includes(status)) {
    approveHtml = `<span class="dr-btn" style="opacity:.6;cursor:default;">${status === 'approved' ? '✓ 승인됨' : status}</span>`;
  } else if (status === 'revision_requested') {
    approveHtml = isBuyer
      ? `<span class="dr-btn" style="opacity:.6;cursor:default;">수정요청됨</span>`
      : `<span class="dr-btn" style="background:#f59e0b;color:#fff;border-color:#f59e0b;cursor:default;">수정 필요</span>`;
  } else if (status === 'sent') {
    approveHtml = isBuyer
      ? `${btn('승인', 'document_approve')}${btn('수정요청', 'document_revision')}`
      : `<span class="dr-btn" style="opacity:.6;cursor:default;">바이어 승인 대기</span>`;
  } else if (status === 'draft') {
    approveHtml = `<span class="dr-btn" style="opacity:.6;cursor:default;">Draft</span>`;
  }

  const downloadHtml = safeUrl(downloadUrl)
    ? `<a class="dr-btn" href="${escapeHtml(safeUrl(downloadUrl))}" target="_blank" rel="noopener">다운로드</a>`
    : btn('다운로드', 'document_download');

  const node = el(`
    <div class="dr-msg">
      <div class="dr-msg-meta">${fmtRole(msg.sender_role)} · DOCUMENT</div>
      <div class="dr-msg-bubble">
        <div class="dr-card-title">${escapeHtml(docType)} ${escapeHtml(docNo)}</div>
        <div class="dr-card-row">Status: ${escapeHtml(status)}</div>
        <div class="dr-card-row">Version: ${escapeHtml(version)}</div>
        <div class="dr-card-actions">
          ${approveHtml}
          ${downloadHtml}
        </div>
      </div>
    </div>
  `);

  node.querySelectorAll('[data-action]').forEach((b) => {
    b.addEventListener('click', () => {
      const action = b.getAttribute('data-action');
      window.dispatchEvent(new CustomEvent('dealroom:action', {
        detail: { action, message: msg, payload: p, ref_type: msg.ref_type, ref_id: msg.ref_id },
      }));
    });
  });

  return node;
}

function renderAiGuide(msg) {
  const p = msg.payload || {};
  const title = p.title ?? 'Next step';
  const step = p.step ?? p.message ?? '';
  const checklist = Array.isArray(p.checklist) ? p.checklist : [];
  const suggestions = Array.isArray(p.suggested_reply) ? p.suggested_reply : (Array.isArray(p.suggestions) ? p.suggestions : []);

  const node = el(`
    <div class="dr-msg">
      <div class="dr-msg-meta">AI GUIDE · ${fmtDate(msg.created_at)}</div>
      <div class="dr-msg-bubble" style="border-color:#dbeafe;">
        <div class="dr-card-title">${escapeHtml(title)}</div>
        <div class="dr-card-row">${escapeHtml(step)}</div>
        ${checklist.length ? `
          <div style="margin-top:10px;">
            ${checklist.map((c) => `<div class="dr-card-row">• ${escapeHtml(c.text ?? c)}</div>`).join('')}
          </div>` : ''}
        ${suggestions.length ? `
          <div class="dr-card-actions">
            ${suggestions.slice(0, 3).map((s, i) => `<button class="dr-btn" data-suggest="${i}">${escapeHtml(s)}</button>`).join('')}
          </div>` : ''}
      </div>
    </div>
  `);

  node.querySelectorAll('[data-suggest]').forEach((b) => {
    b.addEventListener('click', () => {
      const idx = Number(b.getAttribute('data-suggest'));
      const text = suggestions[idx];
      window.dispatchEvent(new CustomEvent('dealroom:action', {
        detail: { action: 'ai_suggestion', text, message: msg, payload: p },
      }));
    });
  });

  return node;
}

function renderPaymentCard(msg, myRole) {
  const p = msg.payload || {};
  const name = p.name ?? '';
  const amount = p.amount ?? '';
  const currency = p.currency ?? 'USD';
  const status = p.status ?? '';
  const action = p.action ?? '';
  const notes = p.notes ?? '';
  const milestoneId = p.milestone_id ?? '';
  const isBuyer = (myRole || '').startsWith('buyer');

  const statusColors = { pending: '#f59e0b', proof_submitted: '#3b82f6', paid: '#22c55e', rejected: '#ef4444' };
  const statusLabels = { pending: '결제 대기', proof_submitted: '증빙 제출됨', paid: '결제 완료', rejected: '반려됨' };
  const statusColor = statusColors[status] || '#94a3b8';
  const statusLabel = statusLabels[status] || status;

  let actionsHtml = '';
  if (status === 'pending' && isBuyer) {
    actionsHtml = btn('증빙 업로드', 'upload_proof');
  } else if (status === 'rejected' && isBuyer) {
    actionsHtml = `<span style="color:#ef4444;font-size:12px;">${escapeHtml(notes)}</span>${btn('재업로드', 'upload_proof')}`;
  } else if (status === 'paid') {
    actionsHtml = `<span class="dr-btn" style="background:#22c55e20;color:#22c55e;border-color:#22c55e;cursor:default;">✓ 확인됨</span>`;
  }

  const fmtAmt = Number(amount) ? `${currency} ${Number(amount).toLocaleString()}` : '';

  const node = el(`
    <div class="dr-msg">
      <div class="dr-msg-meta">PAYMENT · ${fmtDate(msg.created_at)}</div>
      <div class="dr-msg-bubble" style="border-left:3px solid ${statusColor};">
        <div class="dr-card-title">💳 ${escapeHtml(name)}</div>
        <div class="dr-card-row">금액: ${escapeHtml(fmtAmt)}</div>
        <div class="dr-card-row">상태: <span style="color:${statusColor};font-weight:600;">${escapeHtml(statusLabel)}</span></div>
        ${action === 'proof_uploaded' ? '<div class="dr-card-row" style="color:#3b82f6;">📎 결제 증빙이 업로드되었습니다</div>' : ''}
        <div class="dr-card-actions">${actionsHtml}</div>
      </div>
    </div>
  `);

  node.querySelectorAll('[data-action]').forEach((b) => {
    b.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('dealroom:action', {
        detail: {
          action: b.getAttribute('data-action'),
          message: msg,
          payload: p,
          milestone: { id: milestoneId, name, amount, currency },
        },
      }));
    });
  });

  return node;
}

export function renderMessageItem(msg, myRole) {
  const type = msg.message_type || 'text';
  if (type === 'system') return renderSystem(msg);
  if (type === 'quote_card') return renderQuoteCard(msg, myRole);
  if (type === 'document_card') return renderDocumentCard(msg, myRole);
  if (type === 'payment_card') return renderPaymentCard(msg, myRole);
  if (type === 'ai_guide') return renderAiGuide(msg);
  return renderText(msg);
}
