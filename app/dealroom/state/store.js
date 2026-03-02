// /app/dealroom/state/store.js
export function createStore(initialState) {
  let state = structuredClone(initialState || {});
  const listeners = new Map(); // event -> Set<fn>
  const anyListeners = new Set(); // fn(event, payload, state)

  function getState() { return state; }

  function setState(partial) {
    state = { ...state, ...(partial || {}) };
    emit('STATE_CHANGED', state);
  }

  function on(event, handler) {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event).add(handler);
    return () => listeners.get(event)?.delete(handler);
  }

  function onAny(handler) {
    anyListeners.add(handler);
    return () => anyListeners.delete(handler);
  }

  function emit(event, payload) {
    const set = listeners.get(event);
    if (set) for (const fn of set) safeCall(fn, payload, state);
    for (const fn of anyListeners) safeCall(fn, event, payload, state);
  }

  function safeCall(fn, ...args) {
    try { fn(...args); } catch (e) { console.error('[store listener error]', e); }
  }

  function dispatch(event, payload) {
    switch (event) {
      case 'LOADING_SET':
        state = { ...state, loading: !!payload };
        break;
      case 'ERROR_SET':
        state = { ...state, error: payload || null, loading: false };
        break;
      case 'SIDEBAR_TOGGLE':
        state = { ...state, ui: { ...state.ui, mobileSidebarOpen: !state.ui?.mobileSidebarOpen } };
        break;
      case 'MESSAGES_SET':
        state = { ...state, messages: Array.isArray(payload) ? payload : [] };
        break;
      case 'MESSAGE_RECEIVED':
        state = { ...state, messages: [...(state.messages || []), payload] };
        state = { ...state, lastSeenAt: payload?.created_at ?? state.lastSeenAt };
        break;
      case 'GAP_MESSAGES_APPENDED':
        state = { ...state, messages: [...(state.messages || []), ...(payload || [])] };
        if (payload?.length) state = { ...state, lastSeenAt: payload[payload.length - 1].created_at };
        break;
      default:
        break;
    }
    emit(event, payload);
    emit('STATE_CHANGED', state);
  }

  function subscribe(event, handler) {
    const off = on(event, handler);
    if (event === 'STATE_CHANGED') handler(state);
    return off;
  }

  return { getState, setState, dispatch, subscribe, onAny };
}
