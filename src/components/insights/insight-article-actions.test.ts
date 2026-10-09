import { describe, expect, it } from 'vitest';
import {
  resolveInsightCompletionDescription,
  resolveInsightCompletionJourney,
  resolveInsightCompletionVisibility,
  resolvePersonalArticleInteraction,
  resolvePublicSocialProofSnapshot,
} from '@/components/insights/insight-article-actions';
import type { InsightMap } from '@/types/insight-worldmap';

const insightMap: InsightMap = {
  islands: [
    {
      articles: [
        {
          accessLevel: 'FREE',
          coverUrl: null,
          description: '첫 글',
          documentId: 'dep-doc-1',
          level: 'BEGINNER',
          required: true,
          slug: 'dep-article-1',
          socialProof: {
            explorerCount: 12,
            helpfulByMe: false,
            helpfulCount: 4,
            viewCount: 20,
          },
          state: 'READ',
          title: '배포의 경계',
          unlockCost: 0,
        },
        {
          accessLevel: 'UNLOCKED',
          coverUrl: null,
          description: '둘째 글',
          documentId: 'dep-doc-2',
          level: 'INTERMEDIATE',
          required: true,
          slug: 'dep-article-2',
          socialProof: {
            explorerCount: 8,
            helpfulByMe: false,
            helpfulCount: 2,
            viewCount: 15,
          },
          state: 'NEXT',
          title: '빌드 산출물의 자리',
          unlockCost: 1,
        },
      ],
      bridgeRoomId: 8,
      bridgeRoomName: '배포·운영 공부방',
      explorerCount: 12,
      islandId: 1,
      name: '배포·운영',
      progress: {
        conquered: false,
        conqueredAt: null,
        read: 1,
        total: 2,
      },
      slug: 'dep',
    },
  ],
  readingBudget: { balance: 5, dailyCap: 5 },
};

const fallback = {
  islandId: 1,
  islandName: '배포·운영',
  islandSlug: 'dep',
};

describe('resolveInsightCompletionJourney', () => {
  it('같은 map 데이터에서 다음 글·화두·공부방 판정용 room 데이터를 만든다', () => {
    // room은 카드로 렌더하지 않지만(2026-08-25 시안 정합: 완독 후속 카드는
    // 다음 글·관련 화두 2개로 줄였다), hasApprovedJourney 판정에 여전히 쓰인다.
    expect(
      resolveInsightCompletionJourney({
        documentId: 'dep-doc-1',
        fallback,
        insightMap,
      }),
    ).toEqual({
      islandName: '배포·운영',
      koanHref: '/insights/koans?category=dep',
      nextArticle: {
        href: '/insights/dep-article-2',
        title: '빌드 산출물의 자리',
      },
      room: {
        href: '/community/rooms/8?from=dep',
        name: '배포·운영 공부방',
      },
    });
  });

  it('map 데이터가 없으면 새 계약을 만들지 않고 명시적 fallback을 반환한다', () => {
    const result = resolveInsightCompletionJourney({
      documentId: 'dep-doc-1',
      fallback,
    });

    expect(result.nextArticle).toBeNull();
    expect(result.room).toBeNull();
    expect(result.koanHref).toBe('/insights/koans?category=dep');
  });
});

describe('resolveInsightCompletionVisibility', () => {
  it.each([
    'idle',
    'pending',
    'error',
  ] as const)('%s 상태에서는 도착 전 예고만 허용한다', (progressStatus) => {
    expect(
      resolveInsightCompletionVisibility({
        articleState: 'NEXT',
        guestReachedCompletion: false,
        hasApprovedJourney: false,
        isMember: true,
        progressStatus,
      }),
    ).toBe('PREVIEW');
  });

  it('완독 mutation 성공 직후 네 경로를 허용한다', () => {
    expect(
      resolveInsightCompletionVisibility({
        articleState: 'NEXT',
        guestReachedCompletion: false,
        hasApprovedJourney: false,
        isMember: true,
        progressStatus: 'success',
      }),
    ).toBe('FULL_CROSS');
  });

  it('기존 READ 상태에서는 mutation 없이 네 경로를 허용한다', () => {
    expect(
      resolveInsightCompletionVisibility({
        articleState: 'READ',
        guestReachedCompletion: false,
        hasApprovedJourney: false,
        isMember: true,
        progressStatus: 'idle',
      }),
    ).toBe('FULL_CROSS');
  });

  it('guest는 서버 상태가 없어도 마지막 요소 도달 뒤 light cross만 허용한다', () => {
    expect(
      resolveInsightCompletionVisibility({
        articleState: null,
        guestReachedCompletion: true,
        hasApprovedJourney: false,
        isMember: false,
        progressStatus: 'idle',
      }),
    ).toBe('LIGHT_CROSS');
  });

  it('guest는 서버가 READ를 반환해도 로컬 도달 전에는 경로를 열지 않는다', () => {
    expect(
      resolveInsightCompletionVisibility({
        articleState: 'READ',
        guestReachedCompletion: false,
        hasApprovedJourney: false,
        isMember: false,
        progressStatus: 'success',
      }),
    ).toBe('PREVIEW');
  });

  it('승인된 네 방향 여정은 인증 bootstrap과 완독 상태에 의존하지 않는다', () => {
    expect(
      resolveInsightCompletionVisibility({
        articleState: undefined,
        guestReachedCompletion: false,
        hasApprovedJourney: true,
        isMember: false,
        progressStatus: 'idle',
      }),
    ).toBe('FULL_CROSS');
  });
});

describe('resolveInsightCompletionDescription', () => {
  it('GUEST-COMPLETION-001 guest light cross는 완독과 로그인 기록 이점을 안내한다', () => {
    const description = resolveInsightCompletionDescription('LIGHT_CROSS');

    expect(description).toBe(
      '여기까지 다 읽으셨어요. 로그인하면 완독 기록이 남아요.',
    );
    expect(description).not.toContain('바다');
    expect(description).not.toMatch(/잠금|포인트/);
  });

  it('회원 full cross는 존재하지 않는 바다·공부방 경로를 안내하지 않는다', () => {
    const description = resolveInsightCompletionDescription('FULL_CROSS');

    expect(description).toBe(
      '읽은 맥락을 이어가거나, 관련 화두를 다시 살펴볼 수 있어요.',
    );
    expect(description).not.toContain('바다');
    expect(description).not.toContain('공부방');
  });
});

describe('public counter snapshot and auth-bound interaction boundary', () => {
  const article = insightMap.islands[0].articles[0];

  it('캐시 초기화 후에도 documentId가 같은 공개 counter만 유지한다', () => {
    const snapshot = resolvePublicSocialProofSnapshot({
      article,
      documentId: article.documentId,
    });
    const afterCacheClear = resolvePublicSocialProofSnapshot({
      article: undefined,
      documentId: article.documentId,
      previous: snapshot,
    });

    expect(afterCacheClear).toEqual({
      documentId: 'dep-doc-1',
      explorerCount: 12,
      helpfulCount: 4,
      viewCount: 20,
    });
    expect(afterCacheClear).not.toHaveProperty('helpfulByMe');
    expect(afterCacheClear).not.toHaveProperty('state');
    expect(afterCacheClear).not.toHaveProperty('accessLevel');
  });

  it('인증 identity나 cache가 사라지면 이전 READ·helpfulByMe를 변이나 mutation에 사용하지 않는다', () => {
    expect(resolvePersonalArticleInteraction(article)).toEqual({
      helpfulByMe: false,
      state: 'READ',
    });
    expect(resolvePersonalArticleInteraction(undefined)).toBeNull();
    expect(
      resolveInsightCompletionVisibility({
        articleState: undefined,
        guestReachedCompletion: false,
        hasApprovedJourney: false,
        isMember: true,
        progressStatus: 'idle',
      }),
    ).toBe('PREVIEW');
  });

  it('다른 documentId의 공개 counter도 재사용하지 않는다', () => {
    const previous = resolvePublicSocialProofSnapshot({
      article,
      documentId: article.documentId,
    });

    expect(
      resolvePublicSocialProofSnapshot({
        article: undefined,
        documentId: 'dep-doc-2',
        previous,
      }),
    ).toBeUndefined();
  });
});
