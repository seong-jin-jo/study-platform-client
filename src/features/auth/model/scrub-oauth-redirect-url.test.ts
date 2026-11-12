// @vitest-environment jsdom

import { Script } from 'node:vm';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const calls = vi.hoisted(() => ({
  order: [] as string[],
  urlAtWrite: [] as string[],
  writtenToken: [] as string[],
  routerReplace: vi.fn(),
  sendGTMEvent: vi.fn(),
  clearAndRedirect: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: calls.routerReplace, refresh: vi.fn() }),
}));

vi.mock('@next/third-parties/google', () => ({
  sendGTMEvent: (payload: unknown) => {
    calls.order.push('gtm');
    calls.urlAtWrite.push(window.location.href);
    calls.sendGTMEvent(payload);
  },
}));

vi.mock('@/api/endpoints/marketing/attribution', () => ({
  recordAttribution: () => Promise.resolve(false),
}));

vi.mock('@/utils/analytics-identity', () => ({
  setAnalyticsUserId: vi.fn(),
}));

vi.mock('@/utils/attribution-tracker', () => ({
  getAttributionParams: () => ({}),
}));

vi.mock('@/utils/hash', () => ({
  hashValue: (value: string) => `hash-${value}`,
}));

vi.mock('./auth-debug-log', () => ({
  AUTH_EVENT_LEVELS: { ERROR: 'error' },
  logAuthEvent: vi.fn(),
}));

vi.mock('./client-auth-cleanup', () => ({
  clearClientAuthStateAndRedirect: (path: string) => {
    calls.order.push('clear-session');
    calls.urlAtWrite.push(window.location.href);
    calls.clearAndRedirect(path);
  },
  resetClientDerivedAuthStateWithQueryCache: vi.fn(),
}));

vi.mock('./client-auth-session', () => ({
  writeExistingMemberSession: ({ accessToken }: { accessToken: string }) => {
    calls.order.push('write-session');
    calls.urlAtWrite.push(window.location.href);
    calls.writtenToken.push(accessToken);

    return true;
  },
  writeNewMemberSession: vi.fn(),
}));

vi.mock('./oauth-callback', () => ({
  consumeOAuthCallbackPath: () => '/class',
}));

import {
  OAUTH_REDIRECT_BOOTSTRAP_SCRIPT,
  OAUTH_REDIRECT_STASH_KEY,
  isOAuthRedirectPath,
  scrubOAuthRedirectUrl,
  takeStashedOAuthRedirectSearch,
} from './scrub-oauth-redirect-url';
import { useOAuthRedirectController } from './use-oauth-redirect-controller';

const FAKE_TOKEN = 'FAKE.TOKEN.VALUE';

// 공용 setup(vitest.unit.setup.ts)이 테스트마다 globalThis.window/document 를 지운다.
// jsdom 이 처음 만든 객체를 모듈 로드 시점에 쥐어 두고 테스트마다 다시 꽂는다.
const jsdomWindow = window;
const jsdomDocument = document;

beforeEach(() => {
  vi.stubGlobal('window', jsdomWindow);
  vi.stubGlobal('document', jsdomDocument);
});

const setLocation = (pathAndQuery: string): void => {
  window.history.replaceState(null, '', pathAndQuery);
};

describe('isOAuthRedirectPath', () => {
  it('[분석차단] /redirection 과 그 하위 경로만 인증 복귀 경로로 본다', () => {
    expect(isOAuthRedirectPath('/redirection')).toBe(true);
    expect(isOAuthRedirectPath('/redirection/')).toBe(true);
    expect(isOAuthRedirectPath('/redirection/x')).toBe(true);
    // 거절해야 하는 입력: 이름만 비슷한 경로·빈 값.
    expect(isOAuthRedirectPath('/redirection-guide')).toBe(false);
    expect(isOAuthRedirectPath('/class')).toBe(false);
    expect(isOAuthRedirectPath(null)).toBe(false);
    expect(isOAuthRedirectPath(undefined)).toBe(false);
  });
});

describe('scrubOAuthRedirectUrl', () => {
  it('[분석차단] 경로는 남기고 쿼리와 해시를 지운다', () => {
    setLocation(`/redirection?access-token=${FAKE_TOKEN}&member-id=999#x`);

    expect(scrubOAuthRedirectUrl()).toBe(true);
    expect(window.location.pathname).toBe('/redirection');
    expect(window.location.search).toBe('');
    expect(window.location.hash).toBe('');
  });

  it('[분석차단] 지울 것이 없으면 history 를 건드리지 않는다', () => {
    setLocation('/redirection');
    const spy = vi.spyOn(window.history, 'replaceState');

    expect(scrubOAuthRedirectUrl()).toBe(false);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

const runBootstrap = (): void => {
  // 서버가 HTML 에 심는 인라인 스크립트와 같은 문자열을 브라우저처럼 실행한다.
  new Script(OAUTH_REDIRECT_BOOTSTRAP_SCRIPT).runInThisContext();
};

describe('OAUTH_REDIRECT_BOOTSTRAP_SCRIPT (하이드레이션 전 인라인 실행)', () => {
  afterEach(() => {
    Reflect.deleteProperty(window, OAUTH_REDIRECT_STASH_KEY);
  });

  it('[분석차단] /redirection 이면 쿼리를 보관하고 주소에서 지운다', () => {
    setLocation(`/redirection?access-token=${FAKE_TOKEN}&member-id=999`);

    runBootstrap();

    expect(window.location.pathname).toBe('/redirection');
    expect(window.location.search).toBe('');
    const stashed = takeStashedOAuthRedirectSearch();
    expect(stashed?.get('access-token')).toBe(FAKE_TOKEN);
    expect(stashed?.get('member-id')).toBe('999');
    // 한 번만 꺼내진다.
    expect(takeStashedOAuthRedirectSearch()).toBeUndefined();
  });

  it('[분석차단] 다른 경로의 쿼리는 건드리지 않는다(거절해야 하는 입력)', () => {
    setLocation('/class?onboarding=true');

    runBootstrap();

    expect(window.location.search).toBe('?onboarding=true');
    expect(takeStashedOAuthRedirectSearch()).toBeUndefined();
  });

  it('[분석차단] 이름만 비슷한 경로(/redirection-guide)는 건드리지 않는다', () => {
    setLocation('/redirection-guide?x=1');

    runBootstrap();

    expect(window.location.search).toBe('?x=1');
    expect(takeStashedOAuthRedirectSearch()).toBeUndefined();
  });
});

describe('useOAuthRedirectController 의 주소 정리 순서', () => {
  let container: HTMLDivElement;
  let root: Root;

  const mountWith = (query: string) => {
    const params = new URLSearchParams(query);
    function Probe() {
      useOAuthRedirectController(params);

      return null;
    }
    act(() => {
      root.render(createElement(Probe));
    });
  };

  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    calls.order.length = 0;
    calls.urlAtWrite.length = 0;
    calls.writtenToken.length = 0;
    calls.routerReplace.mockClear();
    calls.sendGTMEvent.mockClear();
    calls.clearAndRedirect.mockClear();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('[분석차단] 기존 회원 로그인: 세션 저장·GTM 이벤트 시점에 주소에 토큰이 없고, 토큰은 그대로 저장되며 callbackPath 로 이동한다', () => {
    const query = `type=oauth2&is-success=true&is-guest=false&auth-vendor=google&access-token=${FAKE_TOKEN}&member-id=999`;
    setLocation(`/redirection?${query}`);

    mountWith(query);

    expect(calls.order).toEqual(['write-session', 'gtm']);
    for (const url of calls.urlAtWrite) {
      expect(url).not.toContain('FAKE.TOKEN');
      expect(url).not.toContain('member-id');
    }
    expect(window.location.search).toBe('');
    expect(calls.writtenToken).toEqual([FAKE_TOKEN]);
    expect(calls.routerReplace).toHaveBeenCalledWith('/class');
    // 분석 이벤트에는 회원 번호 원문이 아니라 해시만 실린다(기존 동작 유지).
    expect(JSON.stringify(calls.sendGTMEvent.mock.calls)).not.toContain(
      FAKE_TOKEN,
    );
  });

  it('[분석차단] 인라인 스크립트가 주소를 먼저 비워도(라우터 쿼리 빈 값) 보관한 토큰으로 로그인이 완료된다', () => {
    const query = `type=oauth2&is-success=true&is-guest=false&auth-vendor=google&access-token=${FAKE_TOKEN}&member-id=999`;
    setLocation(`/redirection?${query}`);
    runBootstrap();
    expect(window.location.search).toBe('');

    mountWith('');

    expect(calls.writtenToken).toEqual([FAKE_TOKEN]);
    expect(calls.routerReplace).toHaveBeenCalledWith('/class');
    expect(window.location.search).toBe('');
  });

  it('[분석차단] 계약 위반(member-id 없음)이어도 주소의 토큰을 지우고 로그인으로 보낸다', () => {
    const query = `type=oauth2&is-success=true&is-guest=false&access-token=${FAKE_TOKEN}`;
    setLocation(`/redirection?${query}`);

    mountWith(query);

    expect(window.location.search).toBe('');
    expect(calls.clearAndRedirect).toHaveBeenCalledWith('/login');
    expect(calls.urlAtWrite.every((url) => !url.includes('FAKE.TOKEN'))).toBe(
      true,
    );
  });

  it('[분석차단] 로그인 실패 복귀(is-success=false)도 주소 쿼리를 지운다', () => {
    const query = 'type=oauth2&is-success=false';
    setLocation(`/redirection?${query}`);

    mountWith(query);

    expect(window.location.search).toBe('');
    expect(calls.clearAndRedirect).toHaveBeenCalledWith('/login');
  });
});
