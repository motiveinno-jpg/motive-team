/* Whistle AI Service Worker — Caching + Web Push */
var CACHE_VERSION = 'whistle-v20260403-0117';
var STATIC_ASSETS = [
  '/manifest.webmanifest',
  '/whistle-icon-192.png',
  '/whistle-icon-512.png',
  '/apple-touch-icon.png',
  '/favicon.svg',
  '/offline.htm',
];

// API / Supabase 요청 패턴 — 캐시 하지 않음
function isApiRequest(url) {
  return (
    url.includes('supabase.co') ||
    url.includes('/functions/v1/') ||
    url.includes('stripe.com') ||
    url.includes('api.whistle-ai.com') ||
    url.includes('restcountries.com') ||
    url.includes('apollo.io')
  );
}

// 정적 자산 패턴 — 캐시 우선
function isStaticAsset(url) {
  return (
    url.match(/\.(png|jpg|jpeg|gif|webp|svg|ico|woff|woff2|ttf|otf)$/) ||
    url.match(/\.(css)$/)
  );
}

// ── Install: 핵심 정적 자산 프리캐시 ──
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(function(cache) {
      return cache.addAll(STATIC_ASSETS).catch(function(err) {
        console.error('[SW] Pre-cache failed:', err);
      });
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

// ── Activate: 이전 버전 캐시 정리 + HTML 캐시 퍼지 ──
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames
          .filter(function(name) { return name !== CACHE_VERSION; })
          .map(function(name) { return caches.delete(name); })
      );
    }).then(function() {
      // 현재 캐시에서 HTML 항목 제거 (이전 버전 잔여분)
      return caches.open(CACHE_VERSION).then(function(cache) {
        return cache.keys().then(function(keys) {
          return Promise.all(
            keys.filter(function(req) {
              var url = req.url;
              return url.endsWith('.html') || url.endsWith('.htm') || url.endsWith('/');
            }).map(function(req) {
              return cache.delete(req);
            })
          );
        });
      });
    }).then(function() {
      // 모든 클라이언트에 업데이트 알림 → 자동 리로드
      return self.clients.matchAll({ type: 'window' }).then(function(clients) {
        clients.forEach(function(client) {
          client.postMessage({ type: 'SW_UPDATED', version: CACHE_VERSION });
        });
      });
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// ── Fetch: 요청 유형별 캐싱 전략 ──
self.addEventListener('fetch', function(event) {
  var req = event.request;

  // GET 이외 무시
  if (req.method !== 'GET') return;

  // chrome-extension 등 비 http 무시
  if (!req.url.startsWith('http')) return;

  var url = req.url;

  // API/Supabase: 네트워크 전용 (캐시 안 함)
  if (isApiRequest(url)) {
    event.respondWith(
      fetch(req).catch(function() {
        return new Response(
          JSON.stringify({ error: 'Network unavailable', offline: true }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

  // 정적 자산: 캐시 우선, 없으면 네트워크 후 캐시 저장
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(req).then(function(cached) {
        if (cached) return cached;
        return fetch(req).then(function(res) {
          if (res && res.status === 200 && res.type !== 'opaque') {
            var resClone = res.clone();
            caches.open(CACHE_VERSION).then(function(cache) {
              cache.put(req, resClone);
            });
          }
          return res;
        }).catch(function() {
          // 이미지 오류 시 투명 SVG 반환
          return new Response(
            '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>',
            { headers: { 'Content-Type': 'image/svg+xml' } }
          );
        });
      })
    );
    return;
  }

  // HTML 페이지: 네트워크 전용 (캐싱 안 함) — 오프라인 시 폴백만 제공
  if (req.headers.get('Accept') && req.headers.get('Accept').includes('text/html')) {
    event.respondWith(
      fetch(req).catch(function() {
        return caches.match('/offline.htm').then(function(offline) {
          if (offline) return offline;
          return new Response(
            '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Whistle AI — Offline</title>' +
            '<style>body{font-family:sans-serif;background:#060B18;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;flex-direction:column;gap:16px}' +
            'h1{font-size:24px}p{color:rgba(255,255,255,.5);font-size:14px}button{background:linear-gradient(135deg,#00D4FF,#0088FF);color:#060B18;border:none;padding:12px 24px;border-radius:8px;cursor:pointer;font-size:14px;font-weight:600}</style></head>' +
            '<body><h1>Offline</h1><p>Please check your internet connection.</p>' +
            '<button onclick="location.reload()">Retry</button></body></html>',
            { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        });
      })
    );
    return;
  }

  // 그 외: 네트워크 우선
  event.respondWith(
    fetch(req).catch(function() {
      return caches.match(req);
    })
  );
});

// ── Web Push 알림 ──
self.addEventListener('push', function(event) {
  var data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = {}; }
  var title = data.title || 'Whistle AI';
  var options = {
    body: data.body || '',
    icon: data.icon || '/whistle-icon-192.png',
    badge: '/whistle-icon-192.png',
    tag: data.tag || 'whistle-' + Date.now(),
    data: { url: data.url || '/' },
    requireInteraction: !!data.requireInteraction,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// ── 알림 클릭 ──
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  var url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (var i = 0; i < clientList.length; i++) {
        if (clientList[i].url.indexOf(url) !== -1 && 'focus' in clientList[i]) {
          return clientList[i].focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

// ── 백그라운드 동기화 (선택적) ──
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CACHE_VERSION') {
    event.ports[0].postMessage({ version: CACHE_VERSION });
  }
});
