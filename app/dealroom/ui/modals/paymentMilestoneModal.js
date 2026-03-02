// /app/dealroom/ui/modals/paymentMilestoneModal.js

function escapeHtml(s) {
  return String(s ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
}

const MILESTONE_TYPES = [
  { value: 'deposit', label: '계약금 (Deposit)' },
  { value: 'pre_shipment', label: '선적 전 잔금 (Pre-shipment)' },
  { value: 'balance', label: '잔금 (Balance)' },
  { value: 'full_payment', label: '전액 결제 (Full Payment)' },
  { value: 'custom', label: '기타 (Custom)' },
];

const MILESTONE_NAME_MAP = {
  deposit: 'Deposit',
  pre_shipment: 'Pre-shipment Payment',
  balance: 'Balance Payment',
  full_payment: 'Full Payment',
  custom: '',
};

const CURRENCIES = [
  { value: 'USD', label: 'USD' },
  { value: 'KRW', label: 'KRW' },
  { value: 'EUR', label: 'EUR' },
  { value: 'CNY', label: 'CNY' },
];

const PAYMENT_METHODS = [
  { value: 'wire_transfer', label: '송금 (Wire Transfer / T/T)' },
  { value: 'lc', label: '신용장 (L/C)' },
  { value: 'cash', label: '현금 (Cash)' },
];

/**
 * Open payment milestone creation modal.
 * Seller creates a payment milestone for a deal.
 */
export function openPaymentMilestoneModal({ supabase, store, dealId }) {
  document.getElementById('dr-milestone-modal')?.remove();

  const overlay = document.createElement('div');
  overlay.id = 'dr-milestone-modal';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;padding:16px;';

  const typeOptions = MILESTONE_TYPES.map(t =>
    `<option value="${t.value}">${escapeHtml(t.label)}</option>`
  ).join('');

  const currencyOptions = CURRENCIES.map(c =>
    `<option value="${c.value}">${escapeHtml(c.label)}</option>`
  ).join('');

  const methodOptions = PAYMENT_METHODS.map(m =>
    `<option value="${m.value}">${escapeHtml(m.label)}</option>`
  ).join('');

  overlay.innerHTML = `
    <div style="background:#fff;border-radius:14px;padding:24px;width:420px;max-width:92vw;max-height:85vh;overflow-y:auto;box-shadow:0 8px 30px rgba(0,0,0,.15);">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <h3 style="margin:0;font-size:16px;">결제 마일스톤 생성</h3>
        <button id="dr-milestone-close" style="background:none;border:none;font-size:20px;cursor:pointer;color:#64748b;">✕</button>
      </div>
      <div style="display:flex;flex-direction:column;gap:12px;">
        <div>
          <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">결제 유형</label>
          <select id="dr-milestone-type" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;">
            ${typeOptions}
          </select>
        </div>
        <div>
          <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">마일스톤 명칭</label>
          <input id="dr-milestone-name" type="text" placeholder="예: Deposit 30%" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;box-sizing:border-box;" />
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div>
            <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">금액</label>
            <input id="dr-milestone-amount" type="number" min="0" step="0.01" placeholder="0.00" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;box-sizing:border-box;" />
          </div>
          <div>
            <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">통화</label>
            <select id="dr-milestone-currency" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;">
              ${currencyOptions}
            </select>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div>
            <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">비율 % (선택)</label>
            <input id="dr-milestone-pct" type="number" min="0" max="100" step="1" placeholder="예: 30" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;box-sizing:border-box;" />
          </div>
          <div>
            <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">결제 방법</label>
            <select id="dr-milestone-method" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;">
              ${methodOptions}
            </select>
          </div>
        </div>
        <div>
          <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">결제 기한 (선택)</label>
          <input id="dr-milestone-due" type="date" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;box-sizing:border-box;" />
        </div>
        <div>
          <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">비고 (선택)</label>
          <textarea id="dr-milestone-notes" rows="2" placeholder="추가 메모..." style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;resize:vertical;box-sizing:border-box;"></textarea>
        </div>
        <button id="dr-milestone-submit" style="padding:12px;background:#2563eb;color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;">
          마일스톤 생성
        </button>
        <div id="dr-milestone-error" style="color:#ef4444;font-size:13px;display:none;"></div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Auto-fill name when type changes
  const typeSelect = overlay.querySelector('#dr-milestone-type');
  const nameInput = overlay.querySelector('#dr-milestone-name');
  nameInput.value = MILESTONE_NAME_MAP[typeSelect.value] || '';
  typeSelect.addEventListener('change', () => {
    nameInput.value = MILESTONE_NAME_MAP[typeSelect.value] || '';
  });

  const close = () => overlay.remove();
  overlay.querySelector('#dr-milestone-close').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  overlay.querySelector('#dr-milestone-submit').addEventListener('click', async () => {
    const milestoneType = typeSelect.value;
    const name = nameInput.value.trim();
    const amount = parseFloat(overlay.querySelector('#dr-milestone-amount').value);
    const currency = overlay.querySelector('#dr-milestone-currency').value;
    const pctVal = overlay.querySelector('#dr-milestone-pct').value.trim();
    const percentage = pctVal ? parseFloat(pctVal) : null;
    const paymentMethod = overlay.querySelector('#dr-milestone-method').value;
    const dueDate = overlay.querySelector('#dr-milestone-due').value || null;
    const notes = overlay.querySelector('#dr-milestone-notes').value.trim();
    const errEl = overlay.querySelector('#dr-milestone-error');
    const submitBtn = overlay.querySelector('#dr-milestone-submit');

    errEl.style.display = 'none';
    if (!name) { errEl.textContent = '명칭을 입력하세요'; errEl.style.display = 'block'; return; }
    if (!Number.isFinite(amount) || amount <= 0) { errEl.textContent = '유효한 금액을 입력하세요'; errEl.style.display = 'block'; return; }

    submitBtn.disabled = true;
    submitBtn.textContent = '생성 중...';

    try {
      const { data, error } = await supabase.functions.invoke('create-payment-milestone', {
        body: { deal_id: dealId, milestone_type: milestoneType, name, amount, currency, percentage, payment_method: paymentMethod, due_date: dueDate, notes: notes || null },
      });
      if (error) throw new Error(error.message || '마일스톤 생성 실패');
      if (data && !data.ok) throw new Error(data.error?.message || data.error || '마일스톤 생성 실패');
      close();
    } catch (err) {
      errEl.textContent = err.message || '생성 실패';
      errEl.style.display = 'block';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = '마일스톤 생성';
    }
  });

  return close;
}
