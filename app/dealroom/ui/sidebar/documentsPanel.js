// /app/dealroom/ui/sidebar/documentsPanel.js

function escapeHtml(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function fmtDate(iso) {
  if (!iso) return '';
  try { return new Date(iso).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }); }
  catch { return ''; }
}

function statusBadge(doc) {
  const st = doc.status_v2 || doc.status || 'draft';
  const colors = {
    draft: '#94a3b8',
    pending: '#f59e0b',
    approved: '#22c55e',
    rejected: '#ef4444',
    sent: '#3b82f6',
    completed: '#22c55e',
  };
  const color = colors[st] || '#94a3b8';
  return `<span style="font-size:10px;padding:2px 6px;border-radius:4px;background:${color}20;color:${color};font-weight:600;">${escapeHtml(st.toUpperCase())}</span>`;
}

function docIcon(docType) {
  const icons = { PI: '📋', CI: '🧾', PL: '📦', CO: '📜', SC: '📝' };
  return icons[docType?.toUpperCase()] || '📄';
}

function safeUrl(u) {
  if (!u) return null;
  try {
    const x = new URL(u, location.origin);
    if (x.protocol !== 'https:' && x.protocol !== 'http:') return null;
    return x.toString();
  } catch { return null; }
}

/**
 * Render the documents panel HTML.
 * @param {Array} documents
 * @returns {string} HTML string
 */
export function renderDocumentsPanel(documents) {
  if (!documents || documents.length === 0) {
    return `
      <div class="dr-panel">
        <div class="dr-panel-title">Documents</div>
        <div class="dr-panel-body" style="opacity:.6;font-size:13px;">
          아직 문서가 없습니다.<br>
          <span style="font-size:11px;">딜룸에서 서류를 생성하면 여기에 표시됩니다.</span>
        </div>
      </div>
    `;
  }

  const rows = documents.map((doc) => {
    const icon = docIcon(doc.doc_type);
    const badge = statusBadge(doc);
    const hasUrl = !!doc.pdf_url;

    return `
      <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #f1f5f9;" data-doc-id="${escapeHtml(doc.id)}">
        <span style="font-size:18px;flex-shrink:0;">${icon}</span>
        <div style="flex:1;min-width:0;">
          <div style="font-size:13px;font-weight:600;">${escapeHtml(doc.doc_type)} ${escapeHtml(doc.doc_number || '')}</div>
          <div style="font-size:11px;color:#94a3b8;">v${doc.version || 1} · ${fmtDate(doc.updated_at)}</div>
        </div>
        <div style="display:flex;align-items:center;gap:4px;flex-shrink:0;">
          ${badge}
          ${safeUrl(doc.pdf_url)
            ? `<a href="${escapeHtml(safeUrl(doc.pdf_url))}" target="_blank" rel="noopener" class="dr-btn" style="font-size:11px;padding:3px 6px;">↓</a>`
            : ''}
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="dr-panel">
      <div class="dr-panel-title">Documents (${documents.length})</div>
      <div class="dr-panel-body" style="max-height:260px;overflow-y:auto;">
        ${rows}
      </div>
    </div>
  `;
}
