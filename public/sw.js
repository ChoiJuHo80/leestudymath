// ===== 이공수학 공부방 Service Worker =====
// 버전을 올리면 캐시가 갱신됩니다
const CACHE_VERSION = 'igong-math-v3';
const STATIC_CACHE = CACHE_VERSION + '-static';

// 오프라인에서도 보여줄 핵심 파일들
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png'
];

// ── Install: 핵심 파일 미리 캐시 ──────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => {
      return cache.addAll(PRECACHE_URLS);
    })
  );
  self.skipWaiting();
});

// ── Activate: 이전 버전 캐시 삭제 ────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== STATIC_CACHE)
          .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: Network First (오프라인 시 캐시 fallback) ──────────
self.addEventListener('fetch', event => {
  // POST 요청 등 캐시하지 않을 요청은 그냥 통과
  if (event.request.method !== 'GET') return;

  // chrome-extension 등 외부 스킴은 무시
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // 성공 응답이면 캐시에도 저장
        if (response && response.status === 200 && response.type === 'basic') {
          const cloned = response.clone();
          caches.open(STATIC_CACHE).then(cache => cache.put(event.request, cloned));
        }
        return response;
      })
      .catch(() => {
        // 네트워크 실패 시 캐시에서 반환
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          // HTML 요청이면 오프라인 페이지(index.html) 반환
          if (event.request.destination === 'document') {
            return caches.match('/index.html');
          }
        });
      })
  );
});