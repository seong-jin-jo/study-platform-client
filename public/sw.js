const CACHE_PREFIX = 'zeroone-pwa-';
const buildVersion =
  new URL(self.location.href).searchParams.get('v') ?? 'unversioned';
const CACHE_VERSION = `${CACHE_PREFIX}${buildVersion}`;
const OFFLINE_URL = '/offline.html';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const OFFLINE_CACHE = `${CACHE_VERSION}-offline`;
const HTML_CONTENT_TYPE = 'text/html; charset=utf-8';
const PRESERVED_NAVIGATION_STATUSES = new Set([204, 205, 206, 304]);

const withNavigationContentType = (response) => {
  if (
    response.type === 'opaqueredirect' ||
    response.type === 'opaque' ||
    response.type === 'error' ||
    response.status < 200 ||
    response.status > 599 ||
    PRESERVED_NAVIGATION_STATUSES.has(response.status)
  ) {
    return response;
  }
  if (response.headers.get('Content-Type')?.trim()) return response;

  try {
    const headers = new Headers(response.headers);
    headers.set('Content-Type', HTML_CONTENT_TYPE);
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } catch {
    return response;
  }
};

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    event.waitUntil(self.skipWaiting());
  }
});

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const offlineResponse = await fetch(
        new Request(OFFLINE_URL, { cache: 'reload' }),
      );
      if (!offlineResponse.ok) {
        throw new Error(
          `Offline document preload failed: ${offlineResponse.status}`,
        );
      }

      const [offlineCache] = await Promise.all([
        caches.open(OFFLINE_CACHE),
        caches.open(STATIC_CACHE),
      ]);
      await offlineCache.put(OFFLINE_URL, offlineResponse);
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys
              .filter(
                (key) =>
                  key.startsWith(CACHE_PREFIX) &&
                  key !== STATIC_CACHE &&
                  key !== OFFLINE_CACHE,
              )
              .map((key) => caches.delete(key)),
          ),
        ),
      self.registration.navigationPreload?.enable().catch((error) => {
        console.warn('[PWA] Navigation Preload 활성화에 실패했습니다.', error);
      }),
    ]).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const preloadResponse = await event.preloadResponse;
          if (preloadResponse) {
            return withNavigationContentType(preloadResponse);
          }
          return withNavigationContentType(await fetch(request));
        } catch {
          const cachedOffline = await caches.match(OFFLINE_URL);
          return cachedOffline
            ? withNavigationContentType(cachedOffline)
            : Response.error();
        }
      })(),
    );
    return;
  }

  if (
    request.method === 'GET' &&
    url.origin === self.location.origin &&
    url.pathname.startsWith('/_next/static/')
  ) {
    event.respondWith(
      (async () => {
        let cache;
        try {
          cache = await caches.open(STATIC_CACHE);
          const cached = await cache.match(request);
          if (cached) return cached;
        } catch (error) {
          console.warn('[PWA] 정적 캐시 조회에 실패했습니다.', error);
        }

        const response = await fetch(request);
        if (response.ok && cache) {
          try {
            await cache.put(request, response.clone());
          } catch (error) {
            console.warn('[PWA] 정적 캐시 저장에 실패했습니다.', error);
          }
        }
        return response;
      })(),
    );
  }
});
