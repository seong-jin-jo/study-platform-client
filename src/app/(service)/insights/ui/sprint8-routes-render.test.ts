import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

const article = {
  documentId: 'dep-doc-1',
  slug: 'dep-article-1',
  title: '배포가 실제로 일어나는 순서',
  description: '코드가 사용자 화면까지 가는 길',
  coverUrl: null,
  level: 'BEGINNER' as const,
  unlockCost: 0,
  accessLevel: 'FREE' as const,
  required: true,
  state: 'NEXT' as const,
  socialProof: {
    viewCount: 312,
    helpfulCount: 24,
    explorerCount: 312,
    helpfulByMe: false,
  },
};
const island = {
  islandId: 1,
  slug: 'dep',
  name: '배포·운영',
  bridgeRoomId: 8,
  bridgeRoomName: '배포·운영방',
  progress: { read: 0, total: 1, conquered: false, conqueredAt: null },
  explorerCount: 312,
  // 승인 계약 api-contract-sprint8-seo-v1.0.12 §5.2. map island 는 항상 presentationTier 를 준다.
  // 프론트는 unknown tier 를 OCEAN 으로 추정하지 않고 fail-closed 한다.
  presentationTier: 'OCEAN' as const,
  articles: [article],
};
const koan = {
  koanId: 1,
  categorySlug: 'dep',
  categoryName: '배포·운영',
  question:
    '프로젝트 SSH 키가 이미 있는데 인스턴스 키를 더하면, 둘은 공존할까 덮어쓸까?',
  answerCount: 3,
  viewCount: 312,
  publishedAt: '2026-08-04T09:00:00+09:00',
};

vi.mock('next/image', () => ({
  default: ({
    alt = '',
    unoptimized: _unoptimized,
    fill: _fill,
    priority: _priority,
    ...props
  }: Record<string, unknown>) => createElement('img', { ...props, alt }),
}));
vi.mock('next/link', () => ({
  default: ({ children, ...props }: Record<string, unknown>) =>
    createElement('a', props, children as never),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/insights',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/features/auth/model/use-auth', () => ({
  useAuth: () => ({ isAuthenticated: false }),
  useAuthReady: () => ({ memberId: undefined }),
}));
vi.mock('@/features/community/model/use-community-query', () => ({
  useCommunityPostDetailQuery: () => ({
    data: null,
    isError: false,
  }),
}));
vi.mock('@/hooks/queries/community/use-community-room-hub-query', () => ({
  useCommunityRoomHubQuery: () => ({ data: { myRooms: [] } }),
  useCommunityRoomDetailQuery: () => ({
    data: { roomId: 8, name: '배포·운영방' },
    isPending: false,
    isError: false,
  }),
}));
vi.mock('@/components/insights/insight-article-actions', () => ({
  default: () => createElement('div', { 'data-testid': 'article-actions' }),
  resolvePersonalArticleInteraction: () => ({
    helpfulByMe: false,
    state: 'NEXT',
  }),
  resolvePublicSocialProofSnapshot: () => article.socialProof,
}));
vi.mock('@/components/saved-resource/save-resource-button', () => ({
  default: () => createElement('button', { type: 'button' }, '저장'),
}));
vi.mock('@/hooks/queries/insights/use-insight-worldmap-query', () => ({
  useInsightMapQuery: () => ({
    data: { islands: [island], readingBudget: { balance: 5, dailyCap: 5 } },
    isPending: false,
    isError: false,
  }),
  useInsightIslandQuery: () => ({
    data: island,
    isPending: false,
    isError: false,
  }),
  useInsightHelpfulMutation: () => ({
    isPending: false,
    mutate: vi.fn(),
  }),
  useInsightUnlockMutation: () => ({ isPending: false, mutateAsync: vi.fn() }),
}));
vi.mock('@/hooks/queries/insights/use-koan-query', () => ({
  useKoansQuery: () => ({
    data: {
      items: [
        koan,
        { ...koan, koanId: 2, question: '배포 뒤 옛 화면이 남는 이유는?' },
      ],
      page: 1,
      size: 2,
      totalElements: 2,
      totalPages: 1,
    },
    isPending: false,
    isError: false,
  }),
  useKoanQuery: () => ({
    data: {
      ...koan,
      conceptSummary: 'SSH 키는 메타데이터 두 층에 붙습니다.',
      modelAnswerMd: '**두 키는 공존합니다.**',
      qnaQuestionId: 101,
      corrections: [],
    },
    isError: false,
  }),
}));
vi.mock(
  '@/features/community/model/use-community-qna-detail-controller',
  () => ({
    useCommunityQnaDetailController: () => ({
      state: {
        isResolved: true,
        answersPageData: {
          items: [
            {
              id: 1001,
              author: { name: '현장 개발자' },
              createdAt: '2026. 8. 4.',
              isAccepted: true,
              contentHtml: '<p>현장 보완</p>',
              viewer: { reaction: 'none' },
              stats: { likeCount: 18, commentCount: 2 },
            },
          ],
        },
      },
      viewModel: {
        answerCount: 3,
        questionLikeCount: 24,
        isQuestionLikedByViewer: false,
        isQuestionReactionPending: false,
      },
      actions: {
        handleToggleQuestionLike: vi.fn(),
        refetchQuestionDetail: vi.fn(),
      },
    }),
  }),
);
vi.mock('@/features/community/model/use-community-qna-mutation', () => ({
  useCreateCommunityQnaAnswerMutation: () => ({
    isPending: false,
    mutateAsync: vi.fn(),
  }),
  useAssignCommunityQnaAnswerReactionMutation: () => ({ mutate: vi.fn() }),
}));
vi.mock('@/features/community/ui/community-markdown-content', () => ({
  default: ({ content }: { content: string }) =>
    createElement('p', null, content),
}));

import CommunityReadOnly from '@/components/appintoss/community-read-only';
import InsightLearningMap from '@/components/insights/insight-learning-map';
import { getReadOnlyIslandArticleHref } from '@/components/insights/insight-learning-map-links';
import BlogDetailPage from './blog-detail-page';
import IslandArticleList from './island-article-list';
import KoanDetail from './koan-detail';
import KoanList from './koan-list';
import LockedArticleView from './locked-article-view';

describe('SPRINT8 주요 화면 렌더', () => {
  it.each([
    ['바다', createElement(InsightLearningMap, { key: 'map' }), '오늘의 화두'],
    [
      '섬 상세',
      createElement(IslandArticleList, { key: 'island', slug: 'dep' }),
      '오늘 물길 5개가 남아 있습니다',
    ],
    [
      '화두 목록',
      createElement(KoanList, { key: 'koan-list' }),
      '어디서 막혔나요',
    ],
    [
      '화두 상세',
      createElement(KoanDetail, { key: 'koan-detail', koanId: 1 }),
      '현장 개발자',
    ],
  ])('%s 화면의 핵심 계약을 렌더한다', (_name, element, expected) => {
    const markup = renderToStaticMarkup(element);

    expect(markup).toContain(expected);
    expect(markup).not.toMatch(/401|Unauthorized/i);
  });

  it('승인 프로토타입의 핵심 문구와 보조 행동을 보존한다', () => {
    const mapMarkup = renderToStaticMarkup(createElement(InsightLearningMap));
    const listMarkup = renderToStaticMarkup(createElement(KoanList));
    const detailMarkup = renderToStaticMarkup(
      createElement(KoanDetail, { koanId: 1 }),
    );

    expect(mapMarkup).toContain('편 중');
    expect(mapMarkup).not.toContain('개념글 1편 중');
    expect(listMarkup).toContain('메일로 받아보기');
    expect(listMarkup).toContain('분야별로 들어가기');
    expect(detailMarkup).toContain('사람이 검토함');
    expect(detailMarkup).toContain('도움됐어요 24');
    expect(detailMarkup).toContain('배포·운영의 다른 물음');
    expect(detailMarkup).toContain('나는 이랬어요');
  });

  it('AIT-M4-03 읽기 전용 앱에서는 미지원 섬 상세 링크를 렌더하지 않는다', () => {
    const markup = renderToStaticMarkup(
      createElement(InsightLearningMap, { readOnly: true }),
    );

    expect(markup).not.toMatch(/href="\/insights\/land\//);
  });

  it('AIT-N5-01 읽기 전용 섬은 공개 글만 앱 정적 상세로 연결한다', () => {
    expect(getReadOnlyIslandArticleHref(island)).toBe(
      '/insights/read?slug=dep-article-1',
    );
    expect(
      getReadOnlyIslandArticleHref({
        ...island,
        articles: [{ ...article, accessLevel: 'LOCKED' }],
      }),
    ).toBeNull();
  });

  it('AIT-M4-04 읽기 전용 화두에서는 미지원 개념섬 링크를 렌더하지 않는다', () => {
    const markup = renderToStaticMarkup(
      createElement(KoanDetail, { koanId: 1, readOnly: true }),
    );

    expect(markup).not.toMatch(/href="\/insights\/land\//);
  });

  it('AIT-M4-05 잘못된 커뮤니티 글 주소는 무한 로딩 대신 오류를 표시한다', () => {
    const markup = renderToStaticMarkup(
      createElement(CommunityReadOnly, { postId: 0 }),
    );

    expect(markup).toContain('올바르지 않은 글 주소예요');
    expect(markup).not.toContain('커뮤니티 글을 불러오는 중');
  });

  it('1-based 두 번째 글을 잠금·본문 화면 모두 2번째로 표시하고 private email을 유지한다', () => {
    const accessMeta = {
      documentId: 'dep-doc-2',
      slug: 'dep-article-2',
      title: '두 번째 글',
      islandId: 1,
      islandSlug: 'dep',
      islandName: '배포·운영',
      ordinal: 2,
      teaser: '두 번째 글 요약',
      coverUrl: null,
      unlockCost: 1,
      accessReason: 'ALREADY_UNLOCKED' as const,
      budget: { balance: 4, dailyCap: 5 },
      freeAlternative: null,
    };
    const privateArticle = {
      documentId: 'dep-doc-2',
      slug: 'dep-article-2',
      title: '두 번째 글',
      description: '본문 설명',
      category: { name: '배포·운영', slug: 'dep' },
      author: {
        name: 'ZERO-ONE 편집팀',
        email: 'editor@zeroone.test',
      },
      publishedAt: '2026-08-15T11:20:00+09:00',
      updatedAt: '2026-08-15T11:20:00+09:00',
      blocks: [],
    };

    const lockedMarkup = renderToStaticMarkup(
      createElement(LockedArticleView, {
        authDegraded: false,
        teaser: accessMeta,
      }),
    );
    const bodyMarkup = renderToStaticMarkup(
      createElement(BlogDetailPage, {
        accessMeta,
        article: privateArticle,
        authDegraded: false,
      }),
    );

    expect(lockedMarkup).toContain('2번째 물길');
    expect(bodyMarkup).toContain('2번째 물길');
    expect(lockedMarkup).not.toContain('3번째 물길');
    expect(bodyMarkup).not.toContain('3번째 물길');
    // 본문 화면은 글쓴이를 이름으로만 밝힌다. 편집팀 계정 메일은 내부 주소라
    // 독자 화면에 넣지 않는다(PR #462 에서 제거한 결함이 Sprint8 충돌 해소로
    // 되살아났던 자리다). 그래서 이름은 있어야 하고 메일은 없어야 한다.
    // 읽는 시간은 본문 길이에서 계산한다. 값을 고정으로 단언하면 모든 글이
    // 같은 시간이어야만 통과하게 되므로 자리와 형식만 확인한다.
    expect(bodyMarkup).toMatch(/ZERO-ONE 편집팀 · 읽는 데 \d+분/);
    expect(bodyMarkup).not.toContain('editor@zeroone.test');
  });
});
