// /app/dealroom/ui/modals/docGenModal.js

function escapeHtml(s) {
  return String(s ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
}

const DOC_TYPES = [
  { value: 'PI', label: 'Proforma Invoice (PI)' },
  { value: 'CI', label: 'Commercial Invoice (CI)' },
  { value: 'PL', label: 'Packing List (PL)' },
  { value: 'CO', label: 'Certificate of Origin (CO)' },
  { value: 'SC', label: 'Sales Contract (SC)' },
];

/**
 * Open document generation modal inside the dealroom.
 * Creates a document record linked to the deal and posts a document_card message.
 */
export function openDocGenModal({ supabase, store, dealId }) {
  // Remove existing modal if any
  document.getElementById('dr-docgen-modal')?.remove();

  const overlay = document.createElement('div');
  overlay.id = 'dr-docgen-modal';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;';

  const optionsHtml = DOC_TYPES.map(t =>
    `<option value="${t.value}">${escapeHtml(t.label)}</option>`
  ).join('');

  overlay.innerHTML = `
    <div style="background:#fff;border-radius:14px;padding:24px;width:420px;max-width:92vw;max-height:85vh;overflow-y:auto;box-shadow:0 8px 30px rgba(0,0,0,.15);">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <h3 style="margin:0;font-size:16px;">서류 생성</h3>
        <button id="dr-docgen-close" style="background:none;border:none;font-size:20px;cursor:pointer;color:#64748b;">✕</button>
      </div>
      <div style="display:flex;flex-direction:column;gap:12px;">
        <div>
          <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">서류 유형</label>
          <select id="dr-docgen-type" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;">
            ${optionsHtml}
          </select>
        </div>
        <div>
          <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">서류 번호 (선택)</label>
          <input id="dr-docgen-number" type="text" placeholder="예: PI-2026-001" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;box-sizing:border-box;" />
        </div>
        <div>
          <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">언어</label>
          <select id="dr-docgen-lang" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;">
            <option value="en">English</option>
            <option value="ko">한국어</option>
          </select>
        </div>
        <div>
          <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">비고 (선택)</label>
          <textarea id="dr-docgen-notes" rows="2" placeholder="추가 메모..." style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;resize:vertical;box-sizing:border-box;"></textarea>
        </div>
        <button id="dr-docgen-submit" style="padding:12px;background:#2563eb;color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;">
          서류 생성
        </button>
        <div id="dr-docgen-error" style="color:#ef4444;font-size:13px;display:none;"></div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.querySelector('#dr-docgen-close').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  overlay.querySelector('#dr-docgen-submit').addEventListener('click', async () => {
    const docType = overlay.querySelector('#dr-docgen-type').value;
    const docNumber = overlay.querySelector('#dr-docgen-number').value.trim();
    const language = overlay.querySelector('#dr-docgen-lang').value;
    const notes = overlay.querySelector('#dr-docgen-notes').value.trim();
    const errEl = overlay.querySelector('#dr-docgen-error');
    const submitBtn = overlay.querySelector('#dr-docgen-submit');

    errEl.style.display = 'none';
    submitBtn.disabled = true;
    submitBtn.textContent = '생성 중...';

    try {
      // Get current user
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) throw new Error('로그인이 필요합니다');

      // Insert document
      const { data: doc, error: docErr } = await supabase
        .from('documents')
        .insert({
          user_id: userId,
          deal_id: dealId,
          doc_type: docType,
          doc_number: docNumber || null,
          status: 'draft',
          status_v2: 'draft',
          language,
          notes: notes || null,
          content: {},
          version: 1,
        })
        .select()
        .single();

      if (docErr) throw docErr;

      // Post document_card message in deal chat
      await supabase
        .from('deal_messages')
        .insert({
          deal_id: dealId,
          sender_id: userId,
          sender_role: 'seller',
          message_type: 'document_card',
          content: `${docType} ${docNumber || ''} 문서가 생성되었습니다.`,
          payload: {
            document_id: doc.id,
            doc_type: docType,
            doc_no: docNumber || '',
            status_v2: 'draft',
            version: 1,
          },
          ref_type: 'document',
          ref_id: doc.id,
          is_system: true,
        });

      close();
    } catch (err) {
      errEl.textContent = err.message || '생성 실패';
      errEl.style.display = 'block';
      submitBtn.disabled = false;
      submitBtn.textContent = '서류 생성';
    }
  });
}
