// /app/dealroom/actions/actionRouter.js
export function attachDealroomActionRouter({ supabase, store, dealId }) {
  const handler = async (e) => {
    const d = e.detail || {};
    const action = d.action;
    const msg = d.message;
    const payload = d.payload || msg?.payload || {};

    try {
      if (action === 'document_approve') {
        const documentId = msg?.ref_id || payload.document_id;
        if (!documentId) throw new Error('missing document_id');
        const { error } = await supabase.functions.invoke('approve-document', {
          body: { deal_id: dealId, document_id: documentId },
        });
        if (error) throw error;
        return;
      }

      if (action === 'quote_approve') {
        const quoteId = msg?.ref_id || payload.quote_id;
        if (!quoteId) throw new Error('missing quote_id');
        const { error } = await supabase.functions.invoke('approve-quote', {
          body: { quote_id: quoteId, action: 'approve' },
        });
        if (error) throw error;
        return;
      }

      if (action === 'quote_revision') {
        const quoteId = msg?.ref_id || payload.quote_id;
        if (!quoteId) throw new Error('missing quote_id');
        const reason = prompt('수정 사유를 입력하세요:') || '';
        const { error } = await supabase.functions.invoke('approve-quote', {
          body: { quote_id: quoteId, action: 'revision', reason },
        });
        if (error) throw error;
        return;
      }

      if (action === 'ai_suggestion') {
        // Fill composer with suggested text
        const input = document.querySelector('#dr-chat-input');
        if (input && d.text) {
          input.value = d.text;
          input.focus();
        }
        return;
      }

      if (action === 'document_download') {
        console.log('[dealroom] document download:', payload);
        return;
      }
    } catch (err) {
      console.error('[dealroom action error]', err);
    }
  };

  window.addEventListener('dealroom:action', handler);
  return () => window.removeEventListener('dealroom:action', handler);
}
