import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { normalizeOAuthCallbackPath } from '@/features/auth/model/oauth-callback';
import type { ReleaseNote } from './release-notes';
import {
  buildFeedbackHref,
  isWhatsNewSuppressedPath,
  readLastSeenVersion,
  recordWhatsNewShown,
  shouldShowWhatsNewCard,
  WHATS_NEW_LAST_SEEN_KEY,
  writeLastSeenVersion,
} from './whats-new-policy';

const latest = (overrides: Partial<ReleaseNote> = {}): ReleaseNote => ({
  version: '0.10.12',
  date: '2026-11-12',
  title: '업데이트 소식을 한곳에서 볼 수 있어요',
  body: ['본문'],
  notify: true,
  try_href: '/updates',
  ...overrides,
});

const base = {
  latest: latest(),
  lastSeenVersion: undefined,
  pathname: '/class',
  isBlockedByOtherFlow: false,
};

describe('새로운 기능 카드 노출 조건', () => {
  it('WHATS-NEW-010 저장된 버전과 다르고 notify 가 true 면 뜬다', () => {
    expect(shouldShowWhatsNewCard(base)).toBe(true);
    expect(
      shouldShowWhatsNewCard({ ...base, lastSeenVersion: '0.10.11' }),
    ).toBe(true);
  });

  it('WHATS-NEW-011 저장된 버전이 최신과 같으면 뜨지 않는다', () => {
    expect(
      shouldShowWhatsNewCard({ ...base, lastSeenVersion: '0.10.12' }),
    ).toBe(false);
  });

  it('WHATS-NEW-012 notify 가 false 면 버전이 달라도 뜨지 않는다', () => {
    expect(
      shouldShowWhatsNewCard({ ...base, latest: latest({ notify: false }) }),
    ).toBe(false);
  });

  it('WHATS-NEW-013 공개 기록이 비어 있으면 뜨지 않는다', () => {
    expect(shouldShowWhatsNewCard({ ...base, latest: undefined })).toBe(false);
  });

  it('WHATS-NEW-014 온보딩 같은 다른 흐름이 열려 있으면 미룬다', () => {
    expect(
      shouldShowWhatsNewCard({ ...base, isBlockedByOtherFlow: true }),
    ).toBe(false);
  });

  it('WHATS-NEW-015 로그인·가입 복귀·온보딩·결제 화면에서는 뜨지 않는다', () => {
    for (const pathname of [
      '/login',
      '/sign-up',
      '/redirection',
      '/redirection/kakao',
      '/onboarding/retention',
      '/payment/123',
      '/class/some-slug/payment',
      '/class/some-slug/payment/success',
      '/admin/users',
      '/updates',
    ]) {
      expect(isWhatsNewSuppressedPath(pathname)).toBe(true);
      expect(shouldShowWhatsNewCard({ ...base, pathname })).toBe(false);
    }
  });

  it('WHATS-NEW-016 일반 화면과 이름이 비슷한 경로는 막지 않는다', () => {
    for (const pathname of [
      '/',
      '/class',
      '/class/some-slug',
      '/insights',
      '/community',
      '/login-help',
      '/updates-archive',
    ]) {
      expect(isWhatsNewSuppressedPath(pathname)).toBe(false);
    }
  });

  it('WHATS-NEW-017 의견 남기기 주소에 버전이 쿼리로 붙는다', () => {
    expect(buildFeedbackHref('0.10.12')).toBe(
      '/my-inquiry/write?whats_new=0.10.12',
    );
  });
});

describe('비회원 로그인 복귀', () => {
  it('WHATS-NEW-018 로그인 복귀 경로 정규화가 문의 화면의 버전 쿼리를 지우지 않는다', () => {
    const href = buildFeedbackHref('0.10.12');
    expect(normalizeOAuthCallbackPath(href)).toBe(href);
  });
});

describe('마지막으로 본 버전 저장', () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => store.set(key, value),
      },
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('WHATS-NEW-020 닫은 버전을 zo_last_seen_version 에 저장하고 다시 읽으면 카드가 안 뜬다', () => {
    expect(readLastSeenVersion()).toBeUndefined();
    expect(
      shouldShowWhatsNewCard({ ...base, lastSeenVersion: undefined }),
    ).toBe(true);

    writeLastSeenVersion('0.10.12');

    expect(store.get(WHATS_NEW_LAST_SEEN_KEY)).toBe('0.10.12');
    expect(WHATS_NEW_LAST_SEEN_KEY).toBe('zo_last_seen_version');
    expect(
      shouldShowWhatsNewCard({
        ...base,
        lastSeenVersion: readLastSeenVersion(),
      }),
    ).toBe(false);
  });

  it('WHATS-NEW-021 저장소가 막혀 던져도 화면이 깨지지 않는다', () => {
    vi.stubGlobal('window', {
      localStorage: {
        getItem: () => {
          throw new Error('blocked');
        },
        setItem: () => {
          throw new Error('blocked');
        },
      },
    });
    expect(readLastSeenVersion()).toBeUndefined();
    expect(() => writeLastSeenVersion('0.10.12')).not.toThrow();
  });

  it('WHATS-NEW-022 노출만 되고 아무것도 안 눌러도 저장돼서 재방문에는 뜨지 않는다', () => {
    vi.stubEnv('NEXT_PUBLIC_GA_MEASUREMENT_ID', 'G-TEST');
    const w = window as unknown as { dataLayer?: unknown[] };
    // 첫 방문: 저장된 버전이 없어 카드가 뜬다.
    expect(
      shouldShowWhatsNewCard({
        ...base,
        lastSeenVersion: readLastSeenVersion(),
      }),
    ).toBe(true);

    // 카드가 보이는 순간(= whats_new_view 를 보내는 시점)
    recordWhatsNewShown('0.10.12');
    expect(store.get(WHATS_NEW_LAST_SEEN_KEY)).toBe('0.10.12');
    expect(w.dataLayer).toHaveLength(1);

    // 닫기·버튼 없이 재방문: 같은 버전이라 뜨지 않는다.
    expect(
      shouldShowWhatsNewCard({
        ...base,
        lastSeenVersion: readLastSeenVersion(),
      }),
    ).toBe(false);
  });
});
