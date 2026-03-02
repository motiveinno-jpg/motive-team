// /app/shared/errorTracker.js
// Client-side error tracking - sends errors to Supabase client_errors table

let _supabase = null;
let _userId = null;
let _queue = [];
let _flushing = false;

/**
 * Initialize error tracker with Supabase client.
 * Call once after Supabase is initialized.
 */
export function initErrorTracker(supabase, userId) {
  _supabase = supabase;
  _userId = userId || null;

  // Global error handler
  window.addEventListener('error', (e) => {
    trackError({
      error_message: e.message || 'Unknown error',
      error_stack: e.error?.stack || `${e.filename}:${e.lineno}:${e.colno}`,
      page: location.pathname + location.hash,
      url: e.filename || location.href,
    });
  });

  // Unhandled promise rejection handler
  window.addEventListener('unhandledrejection', (e) => {
    const msg = e.reason?.message || String(e.reason || 'Unhandled rejection');
    trackError({
      error_message: msg,
      error_stack: e.reason?.stack || '',
      page: location.pathname + location.hash,
    });
  });
}

/**
 * Track a specific error.
 * @param {Object} opts - { error_message, error_stack, page, deal_id, extra, url }
 */
export function trackError(opts) {
  if (!opts?.error_message) return;

  _queue.push({
    user_id: _userId || null,
    error_message: String(opts.error_message).slice(0, 2000),
    error_stack: String(opts.error_stack || '').slice(0, 5000),
    page: opts.page || location.pathname + location.hash,
    deal_id: opts.deal_id || null,
    extra: opts.extra || {},
    user_agent: navigator.userAgent,
    url: opts.url || location.href,
  });

  flushQueue();
}

async function flushQueue() {
  if (_flushing || !_supabase || _queue.length === 0) return;
  _flushing = true;

  const batch = _queue.splice(0, 10);
  try {
    await _supabase.from('client_errors').insert(batch);
  } catch (e) {
    // Don't recursively track errors from the error tracker
    console.warn('[errorTracker] flush failed:', e?.message);
  } finally {
    _flushing = false;
    if (_queue.length > 0) setTimeout(flushQueue, 1000);
  }
}
