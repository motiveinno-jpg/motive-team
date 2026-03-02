// /app/dealroom/data/documents.js

/**
 * Fetch documents linked to a deal.
 * @param {Object} supabase
 * @param {string} dealId
 * @param {number} [limit=20]
 * @returns {Promise<Array>}
 */
export async function fetchDealDocuments(supabase, dealId, limit = 20) {
  const { data, error } = await supabase
    .from('documents')
    .select('id, deal_id, doc_type, doc_number, status, status_v2, version, language, pdf_url, created_at, updated_at')
    .eq('deal_id', dealId)
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.warn('[dealroom] fetchDealDocuments error:', error.message);
    return [];
  }
  return data || [];
}

/**
 * Subscribe to realtime changes on documents for a deal.
 * @param {Object} supabase
 * @param {string} dealId
 * @param {Function} onChange - called with (eventType, newDoc, oldDoc)
 * @returns {Function} unsubscribe
 */
export function subscribeDealDocuments(supabase, dealId, onChange) {
  const channel = supabase
    .channel('deal-docs-' + dealId)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'documents', filter: 'deal_id=eq.' + dealId },
      (payload) => {
        onChange(payload.eventType, payload.new, payload.old);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
