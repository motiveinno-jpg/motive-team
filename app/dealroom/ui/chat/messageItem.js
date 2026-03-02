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

function renderQuoteCard(msg) {
  const p = msg.payload || {};
  const total = p.total_amount ?? p.total ?? '';
  const currency = p.currency ?? '';
  const incoterms = p.incoterms ?? '';
  const validUntil = p.valid_until ? fmtDate(p.valid_until) : '';
  const status = p.status ?? '';
  const quoteNo = p.quote_no ?? p.quoteNo ?? '';

  const node = el(`
    <div class="dr-msg">
      <div class="dr-msg-meta">${fmtRole(msg.sender_role)} · QUOTE</div>
      <div class="dr-msg-bubble">
        <div class="dr-card-title">Quote ${escapeHtml(quoteNo)}</div>
        <div class="dr-card-row">Status: ${escapeHtml(status)}</div>
        <div class="dr-card-row">Total: ${escapeHtml(currency)} ${escapeHtml(total)}</div>
        <div class="dr-card-row">Incoterms: ${escapeHtml(incoterms)}</div>
        <div class="dr-card-row">Valid until: ${escapeHtml(validUntil)}</div>
        <div class="dr-card-actions">
          ${QUOTE_FINAL_STATES.includes(status)
            ? `<span class="dr-btn" style="opacity:.6;cursor:default;">${status === 'approved' ? '✓ 승인됨' : status}</span>`
            : `${btn('승인', 'quote_approve')}${btn('수정요청', 'quote_revision')}`}
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

function renderDocumentCard(msg) {
  const p = msg.payload || {};
  const docType = p.doc_type ?? p.type ?? '';
  const docNo = p.doc_no ?? '';
  const status = p.status_v2 ?? p.status ?? '';
  const version = p.version ?? '';
  const downloadUrl = p.download_url ?? p.file_url ?? null;

  const node = el(`
    <div class="dr-msg">
      <div class="dr-msg-meta">${fmtRole(msg.sender_role)} · DOCUMENT</div>
      <div class="dr-msg-bubble">
        <div class="dr-card-title">${escapeHtml(docType)} ${escapeHtml(docNo)}</div>
        <div class="dr-card-row">Status: ${escapeHtml(status)}</div>
        <div class="dr-card-row">Version: ${escapeHtml(version)}</div>
        <div class="dr-card-actions">
          ${DOC_FINAL_STATES.includes(status)
            ? `<span class="dr-btn" style="opacity:.6;cursor:default;">${status === 'approved' ? '✓ 승인됨' : status}</span>`
            : btn('승인', 'document_approve')}
          ${safeUrl(downloadUrl) ? `<a class="dr-btn" href="${escapeHtml(safeUrl(downloadUrl))}" target="_blank" rel="noopener">다운로드</a>` : btn('다운로드', 'document_download', true)}
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

export function renderMessageItem(msg) {
  const type = msg.message_type || 'text';
  if (type === 'system') return renderSystem(msg);
  if (type === 'quote_card') return renderQuoteCard(msg);
  if (type === 'document_card') return renderDocumentCard(msg);
  if (type === 'ai_guide') return renderAiGuide(msg);
  return renderText(msg);
}
