// /app/dealroom/ui/layout.js
export function renderLayout(rootEl, store) {
  const styleId = 'dr-style';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .dr-root{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial; border:1px solid #e5e7eb; border-radius:14px; overflow:hidden; background:#fff; display:flex; flex-direction:column; height:100%;}
      .dr-topbar{display:flex; align-items:center; gap:10px; padding:10px 12px; border-bottom:1px solid #eee;}
      .dr-title{font-weight:700;}
      .dr-status{margin-left:auto; font-size:12px; opacity:.7;}
      .dr-btn{padding:8px 10px; border:1px solid #ddd; border-radius:10px; background:#fff; cursor:pointer; font-size:13px;}
      .dr-btn:disabled{opacity:.45; cursor:not-allowed;}
      .dr-body{display:flex; min-height:540px; flex:1;}
      .dr-chat{flex:7; display:flex; flex-direction:column; border-right:1px solid #eee; background:#fafafa;}
      .dr-chat-list{flex:1; overflow:auto; padding:12px;}
      .dr-composer{display:flex; gap:8px; padding:10px 12px; border-top:1px solid #eee; background:#fff;}
      .dr-input{flex:1; padding:10px; border:1px solid #ddd; border-radius:10px; font-size:14px;}
      .dr-actionbar{display:flex; gap:8px; padding:10px 12px; border-top:1px solid #eee; background:#fff; overflow:auto;}
      .dr-sidebar{flex:3; padding:12px; background:#fff;}
      .dr-panel{border:1px solid #eee; border-radius:12px; padding:10px; margin-bottom:10px;}
      .dr-panel-title{font-size:12px; opacity:.65; margin-bottom:6px;}
      .dr-pill{display:inline-block; font-size:12px; padding:4px 8px; border:1px solid #eee; border-radius:999px; margin:2px;}
      .dr-msg{margin-bottom:10px;}
      .dr-msg-meta{font-size:11px; opacity:.6; margin-bottom:4px;}
      .dr-msg-bubble{background:#fff; border:1px solid #eee; border-radius:12px; padding:10px;}
      .dr-card-title{font-weight:700; margin-bottom:6px;}
      .dr-card-row{font-size:13px; margin:2px 0;}
      .dr-card-actions{display:flex; gap:8px; margin-top:10px; flex-wrap:wrap;}
      .dr-link{color:#2563eb; text-decoration:underline; cursor:pointer; background:none; border:none; padding:0;}
      @media (max-width: 860px){
        .dr-body{flex-direction:column;}
        .dr-chat{border-right:none;}
        .dr-sidebar{
          position:fixed; top:0; right:-84%; width:84%; height:100%;
          z-index:999; box-shadow:-10px 0 30px rgba(0,0,0,.1);
          transition:right .2s; overflow:auto; background:#fff;
        }
        .dr-root.dr-sidebar-open .dr-sidebar{right:0;}
      }
    `;
    document.head.appendChild(style);
  }

  rootEl.innerHTML = `
    <div class="dr-root">
      <div class="dr-topbar">
        <button id="dr-sidebar-toggle" class="dr-btn" type="button">☰</button>
        <div id="dr-title" class="dr-title">Deal Room</div>
        <div id="dr-status" class="dr-status">Loading…</div>
      </div>
      <div class="dr-body">
        <div id="dr-chat-panel" class="dr-chat">
          <div id="dr-chat-list" class="dr-chat-list"></div>
          <div class="dr-composer">
            <input id="dr-chat-input" class="dr-input" placeholder="메시지를 입력하세요..." />
            <button id="dr-chat-send" class="dr-btn" type="button">Send</button>
          </div>
          <div id="dr-action-bar" class="dr-actionbar"></div>
        </div>
        <div id="dr-sidebar" class="dr-sidebar"></div>
      </div>
    </div>
  `;

  // Swipe to open/close sidebar on mobile
  let startX = null;
  rootEl.addEventListener('touchstart', (e) => {
    const t = e.touches?.[0];
    if (t) startX = t.clientX;
  }, { passive: true });

  rootEl.addEventListener('touchend', (e) => {
    if (startX == null) return;
    const t = e.changedTouches?.[0];
    if (!t) return;
    const dx = t.clientX - startX;
    startX = null;
    const s = store.getState();
    if (!s.ui?.mobileSidebarOpen && dx < -60) store.dispatch('SIDEBAR_TOGGLE');
    else if (s.ui?.mobileSidebarOpen && dx > 60) store.dispatch('SIDEBAR_TOGGLE');
  }, { passive: true });
}
