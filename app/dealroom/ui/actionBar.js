// /app/dealroom/ui/actionBar.js
import { openInviteModal } from './modals/inviteModal.js';
import { openQuoteModal } from './modals/quoteModal.js';
import { openDocGenModal } from './modals/docGenModal.js';
import { openSendDocModal } from './modals/sendDocModal.js';

export function wireActionBar({ rootEl, supabase, store, dealId }) {
  const bar = rootEl.querySelector('#dr-action-bar');
  if (!bar) return () => {};

  const myRole = store.getState().me?.role || 'seller';
  const isBuyer = myRole.startsWith('buyer');

  if (isBuyer) {
    // Buyer action bar: minimal, mostly read-only
    bar.innerHTML = `
      <button class="dr-btn" data-dr="download_all" type="button" disabled>서류 다운로드</button>
    `;
  } else {
    // Seller action bar: full control
    bar.innerHTML = `
      <button class="dr-btn" data-dr="invite" type="button">바이어 초대</button>
      <button class="dr-btn" data-dr="quote" type="button">견적작성</button>
      <button class="dr-btn" data-dr="doc" type="button">서류생성</button>
      <button class="dr-btn" data-dr="send_doc" type="button">문서전송</button>
      <button class="dr-btn" data-dr="ship" type="button" disabled>출하등록</button>
    `;
  }

  const onClick = (e) => {
    const btn = e.target.closest('[data-dr]');
    if (!btn || btn.disabled) return;
    const a = btn.getAttribute('data-dr');

    if (a === 'invite') openInviteModal({ supabase, dealId });
    if (a === 'quote') openQuoteModal({ supabase, dealId, userId: store.getState().me?.id });
    if (a === 'doc') openDocGenModal({ supabase, store, dealId });
    if (a === 'send_doc') openSendDocModal({ supabase, store, dealId });
  };

  bar.addEventListener('click', onClick);
  return () => bar.removeEventListener('click', onClick);
}
