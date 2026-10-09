import { createRequire } from 'node:module';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import MyPage, { ReputationSection } from './page-client';

const require = createRequire(import.meta.url);
const { JSDOM } = require('jsdom') as {
  JSDOM: new (html: string) => { window: Window & typeof globalThis };
};
const reputationQueryState = vi.hoisted(() => ({
  mode: 'success' as 'loading' | 'error' | 'empty' | 'success',
  refetch: vi.fn(),
}));
const myClassProfileQueryState = vi.hoisted(() => ({
  isPending: true,
}));

const ROLE_SELECTORS = {
  alert: '[role="alert"]',
  button: 'button,[role="button"]',
  heading: 'h1,h2,h3,h4,h5,h6,[role="heading"]',
  link: 'a[href],[role="link"]',
  list: 'ul,ol,[role="list"]',
  status: '[role="status"]',
} as const;

function renderReputationDocument() {
  const markup = renderToStaticMarkup(createElement(ReputationSection));
  return new JSDOM(markup).window.document;
}

function getByRole(
  document: Document,
  role: keyof typeof ROLE_SELECTORS,
  name?: string,
) {
  const matches = Array.from(document.querySelectorAll(ROLE_SELECTORS[role]));
  const match = name
    ? matches.find((element) => element.textContent?.includes(name))
    : matches[0];

  expect(match, `${role} ${name ?? ''} 요소가 있어야 합니다.`).toBeTruthy();
  return match as Element;
}

vi.mock('next/link', () => ({
  default: ({ children, ...props }: Record<string, unknown>) =>
    createElement('a', props, children as never),
}));
vi.mock('next/dynamic', () => ({
  default: () => () => null,
}));
vi.mock('@/hooks/queries/community/use-community-room-posts-query', () => ({
  useMyRepQuery: () => {
    const mode = reputationQueryState.mode;
    const data =
      mode === 'success'
        ? {
            repBalance: 128,
            repEarnedTotal: 138,
            recentEarns: [
              {
                postId: 42,
                amount: 10,
                at: '2026-08-13T10:12:00+09:00',
              },
            ],
          }
        : mode === 'empty'
          ? { repBalance: 0, repEarnedTotal: 0, recentEarns: [] }
          : undefined;

    return {
      data,
      isError: mode === 'error',
      isLoading: mode === 'loading',
      refetch: reputationQueryState.refetch,
    };
  },
}));
vi.mock('@/hooks/queries/user/use-my-class-profile-query', () => ({
  useMyClassProfileQuery: () => ({
    data: undefined,
    isPending: myClassProfileQueryState.isPending,
  }),
}));

describe('마이페이지 초기 렌더', () => {
  it('인증 쿼리가 아직 pending이면 SSR에서도 로딩 UI를 렌더한다', () => {
    myClassProfileQueryState.isPending = true;
    const markup = renderToStaticMarkup(createElement(MyPage));

    expect(markup).toContain('불러오는 중...');
    expect(markup).not.toContain('계정 관리');
  });
});

describe('SPRINT7 V3 내 평판', () => {
  it('로딩 상태를 상태 역할로 알린다', () => {
    reputationQueryState.mode = 'loading';
    const document = renderReputationDocument();

    expect(getByRole(document, 'heading', '내 평판')).toBeTruthy();
    expect(getByRole(document, 'status', '평판을 불러오는 중')).toBeTruthy();
  });

  it('오류 상태를 경고 역할과 재시도 단추로 알린다', () => {
    reputationQueryState.mode = 'error';
    const document = renderReputationDocument();

    expect(
      getByRole(document, 'alert', '평판을 불러오지 못했어요'),
    ).toBeTruthy();
    expect(getByRole(document, 'button', '다시 불러오기')).toBeTruthy();
  });

  it('기록 없음 상태를 상태 역할로 알린다', () => {
    reputationQueryState.mode = 'empty';
    const document = renderReputationDocument();

    expect(
      getByRole(document, 'status', '아직 쌓인 평판 기록이 없어요'),
    ).toBeTruthy();
  });

  it('성공 상태를 목록과 글 이동 링크로 렌더한다', () => {
    reputationQueryState.mode = 'success';
    const document = renderReputationDocument();
    const reputationList = getByRole(document, 'list');
    const postLink = getByRole(document, 'link', '답이 도움됐다고 표시됐어요');

    expect(reputationList.textContent).toContain('답이 도움됐다고 표시됐어요');
    expect(reputationList.textContent).toContain('+10');
    expect(postLink.getAttribute('href')).toBe('/community/42');
  });
});
