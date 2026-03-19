const WebSocket = require('ws');
(async () => {
  const res = await fetch('http://localhost:9222/json/list');
  const tabs = await res.json();
  const tab = tabs.find(t => t.url.includes('motiveinno-jpg.github.io/motive-team/whistle.html'));
  if (!tab) { console.log('No whistle tab'); return; }

  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  ws.on('open', () => {
    // Enable console log capture
    ws.send(JSON.stringify({id:0, method:'Console.enable'}));
    ws.send(JSON.stringify({id:1, method:'Runtime.evaluate', params:{
      expression: `JSON.stringify({
        page: S && S.page,
        user: S && S.user ? S.user.email : 'not logged in',
        products: S && S.products ? S.products.length : 0,
        hasNav: typeof nav !== 'undefined',
        efCount: typeof EF_REGISTRY !== 'undefined' ? Object.keys(EF_REGISTRY).length : 0
      })`,
      returnByValue: true
    }}));
  });

  let done = false;
  ws.on('message', d => {
    const msg = JSON.parse(d);
    if (msg.id === 1 && !done) {
      done = true;
      console.log('State:', msg.result && msg.result.result ? msg.result.result.value : JSON.stringify(msg.result));

      // Now navigate to analysis page and check
      ws.send(JSON.stringify({id:2, method:'Runtime.evaluate', params:{
        expression: `nav('analysis'); setTimeout(function(){
          var el = document.querySelector('.page-content');
          var err = document.querySelector('.error, .toast-err');
          window._checkResult = JSON.stringify({
            page: S.page,
            contentLen: el ? el.innerHTML.length : 0,
            contentPreview: el ? el.innerText.slice(0,300) : 'NO CONTENT',
            error: err ? err.innerText : 'none'
          });
        }, 2000); 'navigating...'`,
        returnByValue: true
      }}));

      setTimeout(() => {
        ws.send(JSON.stringify({id:3, method:'Runtime.evaluate', params:{
          expression: `window._checkResult || 'not ready'`,
          returnByValue: true
        }}));
      }, 3000);
    }
    if (msg.id === 3) {
      console.log('Analysis page:', msg.result && msg.result.result ? msg.result.result.value : JSON.stringify(msg.result));
      ws.close();
    }
  });
})();
