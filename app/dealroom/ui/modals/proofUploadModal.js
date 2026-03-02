// /app/dealroom/ui/modals/proofUploadModal.js

function escapeHtml(s) {
  return String(s ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
}

function fmtCurrency(amount, currency) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '';
  return `${currency || ''} ${n.toLocaleString()}`.trim();
}

function fmtSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Open proof upload modal for a payment milestone.
 * @param {Object} opts - { supabase, store, dealId, milestone: { id, name, amount, currency } }
 */
export function openProofUploadModal({ supabase, store, dealId, milestone }) {
  document.getElementById('dr-proof-modal')?.remove();

  const overlay = document.createElement('div');
  overlay.id = 'dr-proof-modal';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;padding:16px;';

  overlay.innerHTML = `
    <div style="background:#fff;border-radius:14px;padding:24px;width:420px;max-width:92vw;max-height:85vh;overflow-y:auto;box-shadow:0 8px 30px rgba(0,0,0,.15);">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <h3 style="margin:0;font-size:16px;">결제 증빙 업로드</h3>
        <button id="dr-proof-close" style="background:none;border:none;font-size:20px;cursor:pointer;color:#64748b;">✕</button>
      </div>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin-bottom:16px;">
        <div style="font-size:13px;color:#64748b;margin-bottom:4px;">마일스톤</div>
        <div style="font-size:15px;font-weight:600;">${escapeHtml(milestone.name)}</div>
        <div style="font-size:14px;color:#334155;margin-top:2px;">${escapeHtml(fmtCurrency(milestone.amount, milestone.currency))}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:12px;">
        <div id="dr-proof-dropzone" style="border:2px dashed #cbd5e1;border-radius:10px;padding:32px 16px;text-align:center;cursor:pointer;transition:border-color .2s,background .2s;">
          <div style="font-size:28px;margin-bottom:8px;">📎</div>
          <div style="font-size:14px;font-weight:500;color:#334155;">파일을 드래그하거나 클릭하여 선택</div>
          <div style="font-size:12px;color:#94a3b8;margin-top:4px;">이미지 (PNG, JPG) 또는 PDF · 최대 10MB</div>
          <input id="dr-proof-file" type="file" accept="image/*,.pdf" style="display:none;" />
        </div>
        <div id="dr-proof-preview" style="display:none;padding:10px;background:#f1f5f9;border-radius:8px;">
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-size:18px;">📄</span>
            <div style="flex:1;min-width:0;">
              <div id="dr-proof-filename" style="font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"></div>
              <div id="dr-proof-filesize" style="font-size:11px;color:#94a3b8;"></div>
            </div>
            <button id="dr-proof-remove" style="background:none;border:none;font-size:16px;cursor:pointer;color:#ef4444;">✕</button>
          </div>
        </div>
        <div id="dr-proof-progress" style="display:none;">
          <div style="font-size:12px;color:#64748b;margin-bottom:4px;">업로드 중...</div>
          <div style="background:#e2e8f0;border-radius:4px;height:6px;overflow:hidden;">
            <div id="dr-proof-bar" style="background:#2563eb;height:100%;width:0%;transition:width .3s;"></div>
          </div>
        </div>
        <button id="dr-proof-submit" style="padding:12px;background:#2563eb;color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;" disabled>
          증빙 업로드
        </button>
        <div id="dr-proof-error" style="color:#ef4444;font-size:13px;display:none;"></div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  let selectedFile = null;
  const dropzone = overlay.querySelector('#dr-proof-dropzone');
  const fileInput = overlay.querySelector('#dr-proof-file');
  const preview = overlay.querySelector('#dr-proof-preview');
  const filenameEl = overlay.querySelector('#dr-proof-filename');
  const filesizeEl = overlay.querySelector('#dr-proof-filesize');
  const removeBtn = overlay.querySelector('#dr-proof-remove');
  const progressEl = overlay.querySelector('#dr-proof-progress');
  const barEl = overlay.querySelector('#dr-proof-bar');
  const submitBtn = overlay.querySelector('#dr-proof-submit');
  const errEl = overlay.querySelector('#dr-proof-error');

  function selectFile(file) {
    if (!file) return;
    const allowed = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      errEl.textContent = '이미지 또는 PDF 파일만 업로드 가능합니다';
      errEl.style.display = 'block'; return;
    }
    if (file.size > 10 * 1024 * 1024) {
      errEl.textContent = '파일 크기는 10MB 이하만 가능합니다';
      errEl.style.display = 'block'; return;
    }
    errEl.style.display = 'none';
    selectedFile = file;
    filenameEl.textContent = file.name;
    filesizeEl.textContent = fmtSize(file.size);
    preview.style.display = 'block';
    dropzone.style.display = 'none';
    submitBtn.disabled = false;
  }

  function clearFile() {
    selectedFile = null;
    fileInput.value = '';
    preview.style.display = 'none';
    dropzone.style.display = '';
    submitBtn.disabled = true;
  }

  dropzone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => { if (fileInput.files?.[0]) selectFile(fileInput.files[0]); });

  dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.style.borderColor = '#2563eb'; dropzone.style.background = '#eff6ff'; });
  dropzone.addEventListener('dragleave', (e) => { e.preventDefault(); dropzone.style.borderColor = '#cbd5e1'; dropzone.style.background = ''; });
  dropzone.addEventListener('drop', (e) => { e.preventDefault(); dropzone.style.borderColor = '#cbd5e1'; dropzone.style.background = ''; if (e.dataTransfer.files?.[0]) selectFile(e.dataTransfer.files[0]); });

  removeBtn.addEventListener('click', clearFile);

  const close = () => overlay.remove();
  overlay.querySelector('#dr-proof-close').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  submitBtn.addEventListener('click', async () => {
    if (!selectedFile) return;
    errEl.style.display = 'none';
    submitBtn.disabled = true;
    submitBtn.textContent = '업로드 중...';
    progressEl.style.display = 'block';
    barEl.style.width = '10%';

    try {
      const ext = selectedFile.name.split('.').pop() || 'bin';
      const safeName = `${Date.now()}_${crypto.randomUUID().slice(0, 8)}.${ext}`;
      const storagePath = `deals/${dealId}/proofs/${safeName}`;

      barEl.style.width = '30%';

      const { error: uploadErr } = await supabase.storage
        .from('payment-proofs')
        .upload(storagePath, selectedFile, { contentType: selectedFile.type, upsert: false });

      if (uploadErr) throw new Error(uploadErr.message || '파일 업로드 실패');
      barEl.style.width = '70%';

      const { data, error } = await supabase.functions.invoke('upload-payment-proof', {
        body: { deal_id: dealId, milestone_id: milestone.id, file_name: selectedFile.name, file_size: selectedFile.size, file_type: selectedFile.type, storage_path: storagePath },
      });

      if (error) throw new Error(error.message || '증빙 등록 실패');
      if (data && !data.ok) throw new Error(data.error?.message || data.error || '증빙 등록 실패');

      barEl.style.width = '100%';
      submitBtn.textContent = '완료!';
      setTimeout(close, 600);
    } catch (err) {
      errEl.textContent = err.message || '업로드 실패';
      errEl.style.display = 'block';
      progressEl.style.display = 'none';
      barEl.style.width = '0%';
      submitBtn.disabled = false;
      submitBtn.textContent = '증빙 업로드';
    }
  });

  return close;
}
