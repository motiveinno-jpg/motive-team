// /app/dealroom/ui/modals/sendDocModal.js
// Modal to confirm sending a draft document to buyer

function escapeHtml(s) {
  return String(s ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
}

/**
 * Open a modal listing draft documents for the user to select and send.
 * @param {Object} opts - { supabase, store, dealId }
 */
export function openSendDocModal({ supabase, store, dealId }) {
  document.getElementById('dr-senddoc-modal')?.remove();

  const state = store.getState();
  const docs = (state.documents || []).filter(d =>
    (d.status_v2 || d.status) === 'draft'
  );

  if (docs.length === 0) {
    showToast('전송할 Draft 문서가 없습니다', 'info');
    return;
  }

  const overlay = document.createElement('div');
  overlay.id = 'dr-senddoc-modal';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;padding:16px;';

  const docOptions = docs.map(d =>
    `<label style="display:flex;align-items:center;gap:10px;padding:10px;border:1px solid #e2e8f0;border-radius:8px;cursor:pointer;">
      <input type="radio" name="dr-send-doc" value="${escapeHtml(d.id)}" ${docs.length === 1 ? 'checked' : ''}>
      <div>
        <div style="font-weight:600;font-size:14px;">${escapeHtml(d.doc_type || '')} ${escapeHtml(d.doc_number || '')}</div>
        <div style="font-size:12px;color:#64748b;">v${d.version || 1} · ${d.created_at ? new Date(d.created_at).toLocaleDateString() : ''}</div>
      </div>
    </label>`
  ).join('');

  overlay.innerHTML = `
    <div style="background:#fff;border-radius:14px;padding:24px;width:420px;max-width:92vw;box-shadow:0 8px 30px rgba(0,0,0,.15);">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <h3 style="margin:0;font-size:16px;">문서 전송</h3>
        <button id="dr-senddoc-close" style="background:none;border:none;font-size:20px;cursor:pointer;color:#64748b;">✕</button>
      </div>
      <p style="font-size:13px;color:#64748b;margin:0 0 12px;">바이어에게 전송할 문서를 선택하세요. 전송 후 상태가 <strong>Sent</strong>로 변경됩니다.</p>
      <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px;">
        ${docOptions}
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end;">
        <button id="dr-senddoc-cancel" class="dr-btn" type="button">취소</button>
        <button id="dr-senddoc-submit" class="dr-btn" type="button" style="background:#2563eb;color:#fff;border-color:#2563eb;">전송</button>
      </div>
      <div id="dr-senddoc-error" style="color:#ef4444;font-size:13px;display:none;margin-top:8px;"></div>
    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.querySelector('#dr-senddoc-close').addEventListener('click', close);
  overlay.querySelector('#dr-senddoc-cancel').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  overlay.querySelector('#dr-senddoc-submit').addEventListener('click', async () => {
    const selected = overlay.querySelector('input[name="dr-send-doc"]:checked');
    if (!selected) {
      const errEl = overlay.querySelector('#dr-senddoc-error');
      errEl.textContent = '문서를 선택해주세요';
      errEl.style.display = 'block';
      return;
    }

    const documentId = selected.value;
    const submitBtn = overlay.querySelector('#dr-senddoc-submit');
    const errEl = overlay.querySelector('#dr-senddoc-error');
    errEl.style.display = 'none';
    submitBtn.disabled = true;
    submitBtn.textContent = '전송 중...';

    try {
      const { data, error } = await supabase.functions.invoke('send-document', {
        body: { deal_id: dealId, document_id: documentId },
      });

      if (error) throw new Error(error.message || '전송 실패');
      if (data && !data.ok) throw new Error(data.error || '전송 실패');

      close();
      showToast('문서가 바이어에게 전송되었습니다', 'success');
    } catch (err) {
      errEl.textContent = err.message || '전송 실패';
      errEl.style.display = 'block';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = '전송';
    }
  });
}

function showToast(msg, type = 'error') {
  const existing = document.getElementById('dr-toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.id = 'dr-toast';
  const bg = type === 'error' ? '#ef4444' : type === 'success' ? '#22c55e' : '#3b82f6';
  toast.style.cssText = `position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:99999;padding:12px 20px;background:${bg};color:#fff;border-radius:10px;font-size:14px;font-weight:500;box-shadow:0 4px 16px rgba(0,0,0,.15);transition:opacity .3s;`;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3500);
}
