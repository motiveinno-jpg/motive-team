// /app/dealroom/realtime/messages.js
function safePayload(v) {
  if (v && typeof v === 'object') return v;
  try { return JSON.parse(v); } catch { return {}; }
}

function normalize(row) {
  return {
    id: row.id,
    deal_id: row.deal_id,
    created_at: row.created_at,
    sender_id: row.sender_id ?? null,
    sender_role: row.sender_role ?? (row.is_system ? 'system' : 'unknown'),
    message_type: row.message_type ?? 'text',
    content: row.content ?? '',
    payload: safePayload(row.payload),
    ref_type: row.ref_type ?? null,
    ref_id: row.ref_id ?? null,
    is_system: !!row.is_system,
  };
}

export async function loadInitialDealMessages(supabase, dealId, limit = 50) {
  const { data, error } = await supabase
    .from('deal_messages')
    .select('*')
    .eq('deal_id', dealId)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

async function gapFetchSince(supabase, dealId, lastSeenAt, limit = 200) {
  if (!lastSeenAt) return [];
  const { data, error } = await supabase
    .from('deal_messages')
    .select('*')
    .eq('deal_id', dealId)
    .gt('created_at', lastSeenAt)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export function subscribeDealMessages(supabase, dealId, store) {
  let channel = null;
  let closed = false;

  async function doGapFetch() {
    try {
      const lastSeenAt = store.getState().lastSeenAt;
      const rows = await gapFetchSince(supabase, dealId, lastSeenAt, 200);
      if (!rows.length) return;
      const msgs = rows.map(normalize);
      const existing = new Set((store.getState().messages || []).map(m => m.id));
      const append = msgs.filter(m => !existing.has(m.id));
      if (append.length) store.dispatch('GAP_MESSAGES_APPENDED', append);
    } catch (e) {
      console.warn('[dealroom] gapFetch failed', e?.message || e);
    }
  }

  function subscribe() {
    channel = supabase
      .channel(`deal:${dealId}:messages`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'deal_messages',
          filter: `deal_id=eq.${dealId}`,
        },
        (payload) => {
          const row = payload.new;
          const msg = normalize(row);

          // dedupe
          const existing = new Set((store.getState().messages || []).map(m => m.id));
          if (existing.has(msg.id)) return;

          store.dispatch('MESSAGE_RECEIVED', msg);
        },
      )
      .subscribe(async (status) => {
        if (closed) return;
        if (status === 'SUBSCRIBED') {
          await doGapFetch();
        }
        if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR') {
          await doGapFetch();
        }
      });
  }

  subscribe();

  // Window focus triggers gap fetch (helps offline resume)
  const onFocus = () => { if (!closed) doGapFetch(); };
  window.addEventListener('focus', onFocus);

  return function unsubscribe() {
    closed = true;
    window.removeEventListener('focus', onFocus);
    if (channel) {
      supabase.removeChannel(channel);
      channel = null;
    }
  };
}
