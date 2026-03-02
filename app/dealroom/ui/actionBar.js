// /app/dealroom/ui/actionBar.js
import { openInviteModal } from './modals/inviteModal.js';
import { openQuoteModal } from './modals/quoteModal.js';

export function wireActionBar({ rootEl, supabase, store, dealId }) {
  const bar = rootEl.querySelector('#dr-action-bar');
  if (!bar) return () => {};

  bar.innerHTML = `
    <button class="dr-btn" data-dr="invite" type="button">바이어 초대</button>
    <button class="dr-btn" data-dr="quote" type="button">견적작성</button>
    <button class="dr-btn" data-dr="doc" type="button" disabled>서류생성</button>
    <button class="dr-btn" data-dr="ship" type="button" disabled>출하등록</button>
    <button class="dr-btn" data-dr="stage" type="button" disabled>단계전이</button>
  `;

  const onClick = (e) => {
    const btn = e.target.closest('[data-dr]');
    if (!btn || btn.disabled) return;
    const a = btn.getAttribute('data-dr');

    if (a === 'invite') openInviteModal({ supabase, dealId });
    if (a === 'quote') openQuoteModal({ supabase, dealId });
  };

  bar.addEventListener('click', onClick);
  return () => bar.removeEventListener('click', onClick);
}
