// /app/dealroom/actions/actionRouter.js
import { renderPIToPdf } from '../docs/render/pi.js';

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

function openRevisionModal() {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;padding:16px;';
    overlay.innerHTML = `
      <div style="background:#fff;border-radius:14px;padding:20px;width:380px;max-width:92vw;box-shadow:0 8px 30px rgba(0,0,0,.15);">
        <h4 style="margin:0 0 12px;font-size:15px;">수정 사유를 입력하세요</h4>
        <textarea id="dr-revision-reason" rows="3" placeholder="수정이 필요한 이유..." style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;resize:vertical;box-sizing:border-box;"></textarea>
        <div style="display:flex;gap:8px;margin-top:12px;justify-content:flex-end;">
          <button id="dr-revision-cancel" class="dr-btn" type="button">취소</button>
          <button id="dr-revision-submit" class="dr-btn" type="button" style="background:#2563eb;color:#fff;border-color:#2563eb;">수정요청</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    const close = (val) => { overlay.remove(); resolve(val); };
    overlay.querySelector('#dr-revision-cancel').addEventListener('click', () => close(null));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(null); });
    overlay.querySelector('#dr-revision-submit').addEventListener('click', () => {
      close(overlay.querySelector('#dr-revision-reason').value.trim());
    });
    overlay.querySelector('#dr-revision-reason').focus();
  });
}

export function attachDealroomActionRouter({ supabase, store, dealId }) {
  const handler = async (e) => {
    const d = e.detail || {};
    const action = d.action;
    const msg = d.message;
    const payload = d.payload || msg?.payload || {};
    const actionBtn = e.target?.closest?.('[data-action]');

    try {
      if (action === 'document_approve') {
        const documentId = msg?.ref_id || payload.document_id;
        if (!documentId) throw new Error('문서 ID를 찾을 수 없습니다');
        if (actionBtn) { actionBtn.disabled = true; actionBtn.textContent = '처리 중...'; }
        const { error } = await supabase.functions.invoke('approve-document', {
          body: { deal_id: dealId, document_id: documentId },
        });
        if (error) throw error;
        showToast('문서가 승인되었습니다', 'success');
        return;
      }

      if (action === 'quote_approve') {
        const quoteId = msg?.ref_id || payload.quote_id;
        if (!quoteId) throw new Error('견적 ID를 찾을 수 없습니다');
        if (actionBtn) { actionBtn.disabled = true; actionBtn.textContent = '처리 중...'; }
        const { error } = await supabase.functions.invoke('approve-quote', {
          body: { quote_id: quoteId, action: 'approve' },
        });
        if (error) throw error;
        showToast('견적이 승인되었습니다. PI가 자동 생성됩니다.', 'success');
        return;
      }

      if (action === 'quote_revision') {
        const quoteId = msg?.ref_id || payload.quote_id;
        if (!quoteId) throw new Error('견적 ID를 찾을 수 없습니다');
        const reason = await openRevisionModal();
        if (reason === null) return; // cancelled
        if (actionBtn) { actionBtn.disabled = true; actionBtn.textContent = '처리 중...'; }
        const { error } = await supabase.functions.invoke('approve-quote', {
          body: { quote_id: quoteId, action: 'revision', reason },
        });
        if (error) throw error;
        showToast('수정요청이 전송되었습니다', 'success');
        return;
      }

      if (action === 'ai_suggestion') {
        const input = document.querySelector('#dr-chat-input');
        if (input && d.text) {
          input.value = d.text;
          input.focus();
        }
        return;
      }

      if (action === 'document_download') {
        const documentId = msg?.ref_id || payload.document_id;
        if (!documentId) { showToast('문서 ID를 찾을 수 없습니다'); return; }
        if (actionBtn) { actionBtn.disabled = true; actionBtn.textContent = '...'; }
        try {
          const { data: docData, error: docErr } = await supabase
            .from('documents')
            .select('*')
            .eq('id', documentId)
            .single();
          if (docErr) throw docErr;
          if (!docData) throw new Error('문서를 찾을 수 없습니다');

          const docType = (docData.doc_type || '').toUpperCase();
          if (docType === 'PI') {
            renderPIToPdf(docData);
            showToast('PDF 다운로드 시작', 'success');
          } else {
            showToast(`${docType} PDF 생성은 준비 중입니다`, 'info');
          }
        } finally {
          if (actionBtn) { actionBtn.disabled = false; actionBtn.textContent = '다운로드'; }
        }
        return;
      }
    } catch (err) {
      console.error('[dealroom action error]', err);
      showToast(err?.message || '처리 중 오류가 발생했습니다');
      if (actionBtn) { actionBtn.disabled = false; }
    }
  };

  window.addEventListener('dealroom:action', handler);
  return () => window.removeEventListener('dealroom:action', handler);
}
