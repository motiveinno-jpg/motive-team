// /app/dealroom/ui/sidebar/paymentPanel.js

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

function fmtCurrency(amount, currency) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '';
  return `${currency || ''} ${n.toLocaleString()}`.trim();
}

function statusBadge(status) {
  const st = status || 'pending';
  const colors = { pending: '#f59e0b', proof_submitted: '#3b82f6', paid: '#22c55e', rejected: '#ef4444' };
  const labels = { pending: 'PENDING', proof_submitted: 'PROOF', paid: 'PAID', rejected: 'REJECTED' };
  const color = colors[st] || '#94a3b8';
  const label = labels[st] || st.toUpperCase();
  return `<span style="font-size:10px;padding:2px 6px;border-radius:4px;background:${color}20;color:${color};font-weight:600;">${escapeHtml(label)}</span>`;
}

function milestoneIcon(type) {
  const icons = { deposit: '💰', pre_shipment: '🚢', balance: '💵', full_payment: '💳', custom: '📋' };
  return icons[type] || '💰';
}

/**
 * Render the payment milestones panel HTML.
 * @param {Array} milestones
 * @returns {string} HTML string
 */
export function renderPaymentPanel(milestones) {
  if (!milestones || milestones.length === 0) {
    return `
      <div class="dr-panel">
        <div class="dr-panel-title">Payments</div>
        <div class="dr-panel-body" style="opacity:.6;font-size:13px;">
          결제 마일스톤이 없습니다.<br>
          <span style="font-size:11px;">셀러가 결제 마일스톤을 생성하면 여기에 표시됩니다.</span>
        </div>
      </div>
    `;
  }

  const rows = milestones.map((ms) => {
    const icon = milestoneIcon(ms.milestone_type);
    const badge = statusBadge(ms.status);
    const isPending = !ms.status || ms.status === 'pending';
    const isRejected = ms.status === 'rejected';
    const showUploadBtn = isPending || isRejected;

    const uploadBtn = showUploadBtn
      ? `<button class="dr-btn" data-action="upload_proof" data-ms='${escapeHtml(JSON.stringify({ id: ms.id, name: ms.name, amount: ms.amount, currency: ms.currency }))}' style="font-size:11px;padding:3px 8px;">증빙 업로드</button>`
      : '';

    const dueDateHtml = ms.due_date
      ? `<span style="font-size:10px;color:#94a3b8;"> · ${fmtDate(ms.due_date)}</span>`
      : '';

    return `
      <div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid #f1f5f9;">
        <span style="font-size:18px;flex-shrink:0;">${icon}</span>
        <div style="flex:1;min-width:0;">
          <div style="font-size:13px;font-weight:600;">${escapeHtml(ms.name)}</div>
          <div style="font-size:12px;color:#334155;">${escapeHtml(fmtCurrency(ms.amount, ms.currency))}${dueDateHtml}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:3px;flex-shrink:0;">
          ${badge}
          ${uploadBtn}
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="dr-panel">
      <div class="dr-panel-title">Payments (${milestones.length})</div>
      <div class="dr-panel-body" style="max-height:260px;overflow-y:auto;">
        ${rows}
      </div>
    </div>
  `;
}
