// /app/dealroom/ui/modals/inviteModal.js
function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

function token() {
  return `INV_${crypto.randomUUID().replaceAll('-', '')}`;
}

export function openInviteModal({ supabase, dealId }) {
  const overlay = el(`
    <div style="
      position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.35);
      display:flex;align-items:center;justify-content:center;padding:18px;">
      <div style="width:min(560px,100%);background:#fff;border-radius:14px;overflow:hidden;border:1px solid #eee;">
        <div style="padding:12px 14px;border-bottom:1px solid #eee;display:flex;align-items:center;gap:10px;">
          <div style="font-weight:800;">Invite Buyer</div>
          <div style="margin-left:auto;">
            <button data-close class="dr-btn" type="button">닫기</button>
          </div>
        </div>

        <div style="padding:14px;">
          <div style="font-size:13px;opacity:.7;margin-bottom:8px;">
            바이어에게 딜룸 링크를 보내세요. 링크로 들어오면 익명 로그인 후 딜룸에 입장합니다.
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
            <label style="display:flex;flex-direction:column;gap:6px;">
              <span style="font-size:12px;opacity:.7;">Expires in</span>
              <select data-exp class="dr-input">
                <option value="24">24 hours</option>
                <option value="168" selected>7 days</option>
                <option value="720">30 days</option>
              </select>
            </label>
            <label style="display:flex;flex-direction:column;gap:6px;">
              <span style="font-size:12px;opacity:.7;">Max uses</span>
              <select data-max class="dr-input">
                <option value="1">1</option>
                <option value="3">3</option>
                <option value="5" selected>5</option>
              </select>
            </label>
          </div>

          <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;">
            <button data-create class="dr-btn" type="button">초대 링크 생성</button>
            <button data-copy class="dr-btn" type="button" disabled>복사</button>
            <span data-status style="font-size:12px;opacity:.7;"></span>
          </div>

          <div style="margin-top:10px;">
            <div style="font-size:12px;opacity:.7;margin-bottom:6px;">Invite URL</div>
            <input data-url class="dr-input" readonly placeholder="(생성 후 표시됩니다)" style="width:100%" />
          </div>
        </div>
      </div>
    </div>
  `);

  const $exp = overlay.querySelector('[data-exp]');
  const $max = overlay.querySelector('[data-max]');
  const $create = overlay.querySelector('[data-create]');
  const $copy = overlay.querySelector('[data-copy]');
  const $url = overlay.querySelector('[data-url]');
  const $status = overlay.querySelector('[data-status]');

  const close = () => overlay.remove();
  overlay.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', close));
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  async function createInvite() {
    $status.textContent = '생성 중…';
    $create.disabled = true;

    const inviteToken = token();
    const expHours = Number($exp.value || 168);
    const maxUses = Number($max.value || 5);
    const expiresAt = new Date(Date.now() + expHours * 3600 * 1000).toISOString();

    const { error } = await supabase.from('deal_invites').insert({
      invite_token: inviteToken,
      deal_id: dealId,
      expires_at: expiresAt,
      max_uses: maxUses,
    });

    $create.disabled = false;

    if (error) {
      $status.textContent = `실패: ${error.message}`;
      return;
    }

    const inviteUrl = `${location.origin}${location.pathname}#dealroom?token=${encodeURIComponent(inviteToken)}`;
    $url.value = inviteUrl;
    $copy.disabled = false;
    $status.textContent = `생성 완료 (expires: ${new Date(expiresAt).toLocaleString()})`;
  }

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText($url.value);
      $status.textContent = '복사 완료!';
    } catch {
      $url.focus();
      $url.select();
      $status.textContent = '클립보드 실패: 수동으로 복사하세요';
    }
  }

  $create.addEventListener('click', createInvite);
  $copy.addEventListener('click', copyUrl);

  document.body.appendChild(overlay);
  return close;
}
