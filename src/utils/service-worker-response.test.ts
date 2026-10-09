import { readFileSync } from 'node:fs';
import vm from 'node:vm';

import { describe, expect, it } from 'vitest';

interface ResponseLike {
  readonly body: ConstructorParameters<typeof Response>[0];
  readonly headers: Headers;
  readonly status: number;
  readonly statusText: string;
  readonly type: ResponseType;
}

interface FetchEventLike {
  preloadResponse: Promise<ResponseLike | undefined>;
  request: { method: string; mode: string; url: string };
  respondWith(response: Promise<ResponseLike>): void;
}

interface ExtendableEventLike {
  waitUntil(promise: Promise<unknown>): void;
}

type StaticCacheFailureStage = 'open' | 'match' | 'put';

function createNavigationHarness(networkResponse: ResponseLike) {
  const listeners = new Map<string, (event: FetchEventLike) => void>();
  const serviceWorkerGlobal = {
    addEventListener: (
      type: string,
      listener: (event: FetchEventLike) => void,
    ) => listeners.set(type, listener),
    clients: { claim: () => Promise.resolve() },
    location: {
      href: 'https://zeroone.test/sw.js?v=unit',
      origin: 'https://zeroone.test',
    },
    registration: { navigationPreload: { enable: () => Promise.resolve() } },
    skipWaiting: () => Promise.resolve(),
  };
  const caches = {
    delete: () => Promise.resolve(true),
    keys: () => Promise.resolve([]),
    match: () => Promise.resolve(undefined),
    open: () => Promise.reject(new Error('install cache is not used here')),
  };

  vm.runInNewContext(
    readFileSync('public/sw.js', 'utf8'),
    {
      Headers,
      Request,
      Response,
      URL,
      caches,
      fetch: () => Promise.resolve(networkResponse),
      self: serviceWorkerGlobal,
    },
    { filename: 'public/sw.js' },
  );

  const fetchListener = listeners.get('fetch');
  if (!fetchListener) throw new Error('Service worker fetch listener missing');

  return async ({ preload = false } = {}) => {
    let responsePromise: Promise<ResponseLike> | undefined;
    fetchListener({
      preloadResponse: Promise.resolve(preload ? networkResponse : undefined),
      request: {
        method: 'GET',
        mode: 'navigate',
        url: 'https://zeroone.test/protected',
      },
      respondWith: (response) => {
        responsePromise = response;
      },
    });
    if (!responsePromise) throw new Error('respondWith was not called');
    return responsePromise;
  };
}

async function installOfflineFallback() {
  const listeners = new Map<string, (event: ExtendableEventLike) => void>();
  const fetchedPaths: string[] = [];
  const putPaths: string[] = [];
  const openedCaches: string[] = [];
  class ServiceWorkerRequest extends Request {
    public constructor(input: string | URL | Request, init?: RequestInit) {
      super(
        typeof input === 'string' && input.startsWith('/')
          ? `https://zeroone.test${input}`
          : input,
        init,
      );
    }
  }

  vm.runInNewContext(
    readFileSync('public/sw.js', 'utf8'),
    {
      Headers,
      Request: ServiceWorkerRequest,
      Response,
      URL,
      caches: {
        delete: () => Promise.resolve(true),
        keys: () => Promise.resolve([]),
        match: () => Promise.resolve(undefined),
        open: (name: string) => {
          openedCaches.push(name);
          return Promise.resolve({
            addAll: () => Promise.resolve(),
            put: (request: string | Request) => {
              putPaths.push(
                typeof request === 'string'
                  ? request
                  : new URL(request.url).pathname,
              );
              return Promise.resolve();
            },
          });
        },
      },
      fetch: (request: Request) => {
        fetchedPaths.push(new URL(request.url).pathname);
        return Promise.resolve(
          new Response('<!doctype html><h1>지금은 오프라인이에요</h1>', {
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
            status: 200,
          }),
        );
      },
      self: {
        addEventListener: (
          type: string,
          listener: (event: ExtendableEventLike) => void,
        ) => listeners.set(type, listener),
        clients: { claim: () => Promise.resolve() },
        location: {
          href: 'https://zeroone.test/sw.js?v=unit',
          origin: 'https://zeroone.test',
        },
        registration: {
          navigationPreload: { enable: () => Promise.resolve() },
        },
        skipWaiting: () => Promise.resolve(),
      },
    },
    { filename: 'public/sw.js' },
  );

  const installListener = listeners.get('install');
  if (!installListener)
    throw new Error('Service worker install listener missing');
  let installPromise: Promise<unknown> | undefined;
  installListener({
    waitUntil: (promise) => {
      installPromise = promise;
    },
  });
  if (!installPromise) throw new Error('waitUntil was not called');
  await installPromise;

  return { fetchedPaths, openedCaches, putPaths };
}

async function sendSkipWaitingMessage(type: string) {
  let messageListener:
    | ((event: {
        data: { type: string };
        waitUntil(promise: Promise<unknown>): void;
      }) => void)
    | undefined;
  let skipWaitingCount = 0;

  vm.runInNewContext(
    readFileSync('public/sw.js', 'utf8'),
    {
      Headers,
      Request,
      Response,
      URL,
      caches: {
        delete: () => Promise.resolve(true),
        keys: () => Promise.resolve([]),
        match: () => Promise.resolve(undefined),
        open: () => Promise.resolve({}),
      },
      fetch: () => Promise.reject(new Error('fetch is not used here')),
      self: {
        addEventListener: (
          eventType: string,
          listener: typeof messageListener,
        ) => {
          if (eventType === 'message') messageListener = listener;
        },
        clients: { claim: () => Promise.resolve() },
        location: {
          href: 'https://zeroone.test/sw.js?v=unit',
          origin: 'https://zeroone.test',
        },
        registration: {
          navigationPreload: { enable: () => Promise.resolve() },
        },
        skipWaiting: () => {
          skipWaitingCount += 1;
          return Promise.resolve();
        },
      },
    },
    { filename: 'public/sw.js' },
  );

  if (!messageListener)
    throw new Error('Service worker message listener missing');
  let activationPromise: Promise<unknown> | undefined;
  messageListener({
    data: { type },
    waitUntil: (promise) => {
      activationPromise = promise;
    },
  });
  await activationPromise;
  return skipWaitingCount;
}

function responseLike({
  body = null,
  status,
  type = 'default',
}: {
  body?: ConstructorParameters<typeof Response>[0];
  status: number;
  type?: ResponseType;
}): ResponseLike {
  return {
    body,
    headers: new Headers(),
    status,
    statusText: '',
    type,
  };
}

async function fetchStaticAssetWithCacheFailure(
  failureStage: StaticCacheFailureStage,
) {
  const listeners = new Map<string, (event: FetchEventLike) => void>();
  const networkResponse = new Response('chunk', { status: 200 });
  const cache = {
    match: () =>
      failureStage === 'match'
        ? Promise.reject(new Error('synthetic cache match failure'))
        : Promise.resolve(undefined),
    put: () =>
      failureStage === 'put'
        ? Promise.reject(new Error('synthetic cache put failure'))
        : Promise.resolve(),
  };
  const caches = {
    delete: () => Promise.resolve(true),
    keys: () => Promise.resolve([]),
    match: () => Promise.resolve(undefined),
    open: () =>
      failureStage === 'open'
        ? Promise.reject(new Error('synthetic cache open failure'))
        : Promise.resolve(cache),
  };

  vm.runInNewContext(
    readFileSync('public/sw.js', 'utf8'),
    {
      Headers,
      Request,
      Response,
      URL,
      caches,
      console,
      fetch: () => Promise.resolve(networkResponse),
      self: {
        addEventListener: (
          type: string,
          listener: (event: FetchEventLike) => void,
        ) => listeners.set(type, listener),
        clients: { claim: () => Promise.resolve() },
        location: {
          href: 'https://zeroone.test/sw.js?v=unit',
          origin: 'https://zeroone.test',
        },
        registration: {
          navigationPreload: { enable: () => Promise.resolve() },
        },
        skipWaiting: () => Promise.resolve(),
      },
    },
    { filename: 'public/sw.js' },
  );

  const fetchListener = listeners.get('fetch');
  if (!fetchListener) throw new Error('Service worker fetch listener missing');
  let responsePromise: Promise<ResponseLike> | undefined;
  fetchListener({
    preloadResponse: Promise.resolve(undefined),
    request: {
      method: 'GET',
      mode: 'cors',
      url: 'https://zeroone.test/_next/static/chunks/app.js',
    },
    respondWith: (response) => {
      responsePromise = response;
    },
  });
  if (!responsePromise) throw new Error('respondWith was not called');
  return responsePromise;
}

async function activateWithNavigationPreloadFailure() {
  let activateListener:
    | ((event: { waitUntil(promise: Promise<unknown>): void }) => void)
    | undefined;
  let claimCount = 0;

  vm.runInNewContext(
    readFileSync('public/sw.js', 'utf8'),
    {
      Headers,
      Request,
      Response,
      URL,
      caches: {
        delete: () => Promise.resolve(true),
        keys: () => Promise.resolve([]),
        match: () => Promise.resolve(undefined),
        open: () => Promise.resolve({}),
      },
      console,
      fetch: () => Promise.reject(new Error('fetch is not used here')),
      self: {
        addEventListener: (
          type: string,
          listener: (event: {
            waitUntil(promise: Promise<unknown>): void;
          }) => void,
        ) => {
          if (type === 'activate') activateListener = listener;
        },
        clients: {
          claim: () => {
            claimCount += 1;
            return Promise.resolve();
          },
        },
        location: {
          href: 'https://zeroone.test/sw.js?v=unit',
          origin: 'https://zeroone.test',
        },
        registration: {
          navigationPreload: {
            enable: () =>
              Promise.reject(new Error('synthetic preload enable failure')),
          },
        },
        skipWaiting: () => Promise.resolve(),
      },
    },
    { filename: 'public/sw.js' },
  );

  if (!activateListener)
    throw new Error('Service worker activate listener missing');
  let activationPromise: Promise<unknown> | undefined;
  activateListener({
    waitUntil: (promise) => {
      activationPromise = promise;
    },
  });
  if (!activationPromise) throw new Error('waitUntil was not called');
  await activationPromise;
  return claimCount;
}

describe('서비스워커 내비게이션 응답 보존', () => {
  it.each([
    ['opaqueredirect', 0],
    ['opaque', 0],
    ['error', 0],
    ['default', 206],
    ['default', 304],
  ] as const)('PWA-SW-001 %s 응답(status %i)은 재구성하지 않는다', async (type, status) => {
    const original = responseLike({ status, type });
    const navigate = createNavigationHarness(original);

    await expect(navigate({ preload: true })).resolves.toBe(original);
  });

  it('PWA-SW-002 유효한 HTML 상태의 Content-Type 누락만 보정한다', async () => {
    const original = responseLike({
      body: new Uint8Array([60, 104, 49, 62, 52, 48, 52]),
      status: 404,
    });
    const navigate = createNavigationHarness(original);

    const normalized = await navigate();

    expect(normalized).not.toBe(original);
    expect(normalized.status).toBe(404);
    expect(normalized.headers.get('Content-Type')).toBe(
      'text/html; charset=utf-8',
    );
  });

  it('PWA-SW-003 응답 재구성이 실패하면 네트워크 오류로 오인하지 않고 원본을 반환한다', async () => {
    const original = {
      get body(): ConstructorParameters<typeof Response>[0] {
        throw new RangeError('unusable body');
      },
      headers: new Headers(),
      status: 200,
      statusText: 'OK',
      type: 'default' as ResponseType,
    };
    const navigate = createNavigationHarness(original);

    await expect(navigate()).resolves.toBe(original);
  });
});

describe('서비스워커 오프라인 문서 설치', () => {
  it('PWA-SW-006 외부 리소스 없는 정적 HTML을 폴백 캐시에 설치한다', async () => {
    const result = await installOfflineFallback();

    expect(result.fetchedPaths).toEqual(['/offline.html']);
    expect(result.putPaths).toEqual(['/offline.html']);
    expect(result.openedCaches).toEqual(
      expect.arrayContaining([
        'zeroone-pwa-unit-offline',
        'zeroone-pwa-unit-static',
      ]),
    );
  });

  it('PWA-SW-007 정적 폴백 문서는 실행 스크립트와 외부 리소스를 포함하지 않는다', () => {
    const offlineHtml = readFileSync('public/offline.html', 'utf8');

    expect(offlineHtml).toContain('<h1>지금은 오프라인이에요</h1>');
    expect(offlineHtml).toContain('<a href="/">홈으로 다시 시도</a>');
    expect(offlineHtml).not.toMatch(/<script\b/i);
    expect(offlineHtml).not.toMatch(/<link\b/i);
    expect(offlineHtml).not.toMatch(/<img\b/i);
    expect(offlineHtml).not.toMatch(/(?:src|href)=["']https?:\/\//i);
  });
});

describe('서비스워커 새 버전 활성화', () => {
  it('PWA-SW-008 SKIP_WAITING 메시지에만 대기 중인 워커를 활성화한다', async () => {
    await expect(sendSkipWaitingMessage('SKIP_WAITING')).resolves.toBe(1);
    await expect(sendSkipWaitingMessage('UNKNOWN')).resolves.toBe(0);
  });
});

describe('서비스워커 부가기능 오류 격리', () => {
  it.each([
    'open',
    'match',
    'put',
  ] as const)('PWA-SW-004 정적 캐시 %s 실패에도 네트워크 응답을 반환한다', async (failureStage) => {
    await expect(
      fetchStaticAssetWithCacheFailure(failureStage),
    ).resolves.toMatchObject({ status: 200 });
  });

  it('PWA-SW-005 Navigation Preload 활성화 실패에도 클라이언트를 인계한다', async () => {
    await expect(activateWithNavigationPreloadFailure()).resolves.toBe(1);
  });
});
