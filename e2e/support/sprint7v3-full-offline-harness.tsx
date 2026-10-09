import { axiosInstance, axiosInstanceV6 } from '@/api/client/axios';
import { axiosInstanceV2 } from '@/api/client/axiosV2';
import MyPage from '@/app/(service)/(my)/my-page/page-client';
import NotificationPage from '@/app/(service)/(my)/notification/page-client';
import MyPageMobileNav from '@/components/common/layout/sidebar/my-page-mobile-nav';
import MyPageSidebar from '@/components/common/layout/sidebar/my-page-sidebar';
import CommunityRoomDetailPage from '@/components/community/pages/community-room-detail-page';
import CommunityRoomHubPage from '@/components/community/pages/community-room-hub-page';
import PublicProfileContent from '@/components/community/public-profile-content';
import HomeFeed from '@/components/retention/home-feed';
import SavedResourcesPage from '@/components/saved-resource/pages/saved-resources-page';
import { AuthHydrationProvider } from '@/features/auth/model/auth-hydration-context';
import CommunityDetailPageClient from '@/features/community/ui/pages/community-detail-page-client';
import CommunityWritePageClient from '@/features/community/ui/pages/community-write-page-client';
import { useUserStore } from '@/stores/use-user-store';
import type { InsightMap } from '@/types/insight-worldmap';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { createElement, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';

const ROOM_ID = 7;
const PROFILE_UUID = '11111111-1111-4111-8111-111111111111';
const token = [
  'e30',
  btoa(
    JSON.stringify({
      roleIds: ['ROLE_MEMBER'],
      authVendor: 'KAKAO',
      memberId: 1,
      sub: 'sprint7-full-offline-harness',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
  )
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', ''),
  'signature',
].join('.');

const room = {
  roomId: ROOM_ID,
  cohortId: ROOM_ID,
  slug: 'webapp-revenue',
  code: 'webapp-revenue',
  name: '웹앱으로 돈 벌기',
  description: '만든 걸로 첫 매출을 내보는 방이에요.',
  bannerUrl: null,
  axisTags: [],
  jobAxis: [],
  goalAxis: [],
  levelAxis: [],
  stats: { memberCount: 12, postCount7d: 14, commentCount7d: 30 },
  memberCount: 12,
  newPostsToday: 3,
  liveSignal: true,
  membership: { state: 'ACTIVE', canJoin: false },
  ownership: {
    state: 'ACTIVE',
    ownerPublicProfileUuid: PROFILE_UUID,
    claimable: false,
    revision: 8,
  },
  admissionQuestions: [],
  members: { items: [], nextCursor: null },
  activity: {
    posts7d: 14,
    comments7d: 30,
    helpful7d: 8,
    activeMembers7d: 31,
  },
  rules: [
    { order: 1, body: '뭘 하려다 어디서 막혔는지 세 줄이면 충분해요.' },
    { order: 2, body: '화면을 찍어 붙이면 답이 더 빨라져요.' },
    { order: 3, body: '느린 건 잘못이 아니에요.' },
  ],
  revision: 8,
};

const insightMap = {
  islands: [
    {
      islandId: 1,
      slug: 'webapp-revenue',
      name: '웹앱 수익화',
      bridgeRoomId: ROOM_ID,
      bridgeRoomName: room.name,
      progress: {
        read: 2,
        total: 5,
        conquered: false,
        conqueredAt: null,
      },
      explorerCount: 12,
      articles: [],
    },
  ],
  readingBudget: { balance: 3, dailyCap: 5 },
} satisfies InsightMap;

const postSummary = {
  postId: 42,
  revision: 1,
  board: '자유',
  title: 'Supabase 로그인 후 프로필이 안 만들어져요',
  excerpt: '프로필을 만드는 규칙부터 확인한 과정을 정리했습니다.',
  previewImageUrl: null,
  previewImageAlt: null,
  author: {
    memberId: 3,
    name: '민아',
    profileImageUrl: null,
    role: 'MEMBER',
  },
  stats: { viewCount: 31, likeCount: 8, commentCount: 3 },
  viewer: { isAuthenticated: true, canEdit: false, canDelete: false },
  createdAt: '2026-08-06T09:00:00+09:00',
  updatedAt: '2026-08-06T09:00:00+09:00',
};

const homeFeed = {
  userName: '테스트 멤버',
  streak: { count: 4, todayCompleted: false, atRisk: false, nextMilestone: 7 },
  continueReading: {
    articleTitle: '질문을 잘 만드는 법',
    progressPct: 60,
    minutesLeft: 4,
    readingPointsBalance: 3,
  },
  myRooms: [
    {
      id: 17,
      kind: 'interest',
      goalLabel: '바이브코딩 질문 방',
      badge: 'WEBAPP',
      newPostsCount: 7,
      stuckQuestionsCount: 2,
      memberCount: 128,
    },
  ],
  communityToday: {
    activeRooms: [
      {
        id: 17,
        goalLabel: '바이브코딩 질문 방',
        memberCount: 128,
        liveReaders: 9,
        todayQuestions: 6,
      },
    ],
    topReads: [
      {
        id: 1,
        kicker: '오늘 많이 읽음',
        title: '배포 오류를 해결한 기록',
        segmentReaderCount: 42,
        faces: [],
      },
    ],
  },
  newMembersWeek: { total: 14, byInterest: [{ interest: '웹앱', count: 9 }] },
  discoveryFeed: {
    sort: 'NEW',
    nextCursor: null,
    items: [
      {
        type: 'COMMUNITY_POST',
        id: 'post:42',
        roomId: 17,
        roomName: '바이브코딩 질문 방',
        title: '배포 오류를 해결한 기록',
        excerpt: '같은 오류를 겪은 사람에게 원인과 해결 순서를 남겼습니다.',
        authorName: '민아',
        createdAt: '2026-08-06T04:00:00Z',
        stats: { viewCount: 121, commentCount: 3, helpfulCount: 10 },
      },
      {
        type: 'INSIGHT_ARTICLE',
        id: 'insight:3',
        documentId: '3',
        slug: 'vibe-coding-insight-3',
        title: '막힘을 줄이는 바이브코딩 습관',
        excerpt:
          '질문을 작게 나누고 실행 결과를 남기면 다음 시도가 빨라집니다.',
        categoryLabel: '실전 가이드',
        stats: { viewCount: 243, helpfulCount: 21 },
      },
    ],
  },
};

const profile = {
  publicProfileUuid: PROFILE_UUID,
  nickname: '서진',
  profileImageUrl: null,
  simpleIntroduction: '매일 하나씩 만들고 기록합니다.',
  buildGoal: '작은 웹앱으로 첫 매출 만들기',
  weeksTogether: 12,
  weeksTogetherLabel: '12주째 함께하고 있어요',
  rooms: {
    items: [{ roomId: 7, name: room.name, visibility: 'PUBLIC' as const }],
    nextCursor: null,
  },
  posts: {
    items: [
      {
        postId: 42,
        title: postSummary.title,
        previewText: postSummary.excerpt,
        destination: '/community/42',
      },
    ],
    nextCursor: null,
  },
  canonicalPath: `/members/${PROFILE_UUID}`,
  indexEligibility: { indexable: true, reason: 'ACTIVE_WITH_ACTIVITY' },
  updatedAt: '2026-08-06T09:00:00+09:00',
};

const response = <T,>(
  config: InternalAxiosRequestConfig,
  content: T,
): AxiosResponse<{ content: T }> => ({
  data: { content },
  status: 200,
  statusText: 'OK',
  headers: {},
  config,
});

const adapter = async (config: InternalAxiosRequestConfig) => {
  const pathname = new URL(config.url ?? '/', 'https://zeroone.local').pathname;
  if (pathname.endsWith('/home/feed')) return response(config, homeFeed);
  if (pathname.endsWith('/insight/map')) return response(config, insightMap);
  if (pathname.endsWith('/search')) {
    return response(config, {
      items: [
        {
          type: 'COMMUNITY_POST',
          resourceKey: 'post:42',
          title: '배포 오류를 해결한 기록',
          previewText: '같은 방 멤버가 남긴 해결 순서입니다.',
          access: 'FULL',
          destination: '/community/42',
          publishedAt: '2026-08-06T04:00:00Z',
        },
        {
          type: 'INSIGHT_ARTICLE',
          resourceKey: 'insight:3',
          title: '배포 전 확인할 것',
          previewText: '실패를 줄이는 배포 체크리스트입니다.',
          access: 'FULL',
          destination: '/insight-articles/3',
          publishedAt: '2026-08-05T04:00:00Z',
        },
      ],
      nextCursor: null,
      partial: false,
      unavailableSources: [],
    });
  }
  if (
    pathname === '/community/rooms' ||
    pathname.endsWith('/api/v1/community/rooms')
  ) {
    return response(config, {
      myRooms: [room],
      exploreRooms: [{ ...room, roomId: 8, name: '업무 자동화' }],
      axes: { job: [], goal: [], level: [] },
      activeRoomCount: 1,
      activeRoomLimit: 3,
    });
  }
  if (pathname.endsWith(`/community/rooms/${ROOM_ID}`))
    return response(config, room);
  if (pathname.endsWith('/community/posts/rep/me')) {
    return response(config, {
      repBalance: 128,
      repEarnedTotal: 180,
      recentEarns: [],
    });
  }
  if (pathname.endsWith('/api/v1/community/rep/context')) {
    return response(config, {
      weeksTogether: 12,
      weeksTogetherLabel: '12주째 함께하고 있어요',
      publicProfileUrl: `/members/${PROFILE_UUID}`,
      rooms: {
        count: 1,
        items: [{ roomId: ROOM_ID, name: room.name }],
        nextCursor: null,
      },
      posts: {
        count: 1,
        items: [
          {
            postId: postSummary.postId,
            title: postSummary.title,
            publishedAt: postSummary.createdAt,
          },
        ],
        nextCursor: null,
      },
    });
  }
  if (pathname.endsWith('/community/posts/42/related-posts'))
    return response(config, []);
  if (pathname.endsWith('/community/posts/42/comments')) {
    return response(config, {
      items: [],
      page: 1,
      size: 20,
      totalElements: 0,
      totalPages: 1,
      hasNext: false,
      hasPrevious: false,
      totalCommentCount: 0,
    });
  }
  if (pathname.endsWith('/community/posts/42/views')) {
    return response(config, { counted: true, viewCount: 31 });
  }
  if (pathname.endsWith('/community/posts/42')) {
    return response(config, {
      postId: 42,
      title: postSummary.title,
      access: 'PREVIEW',
      previewText: postSummary.excerpt,
      locked: {
        reason: 'ROOM_MEMBERSHIP_REQUIRED',
        joinRoomId: 7,
      },
      metadata: {
        author: { publicProfileUuid: PROFILE_UUID, nickname: '민아' },
        sourceRoom: { roomId: 7, name: room.name },
        publishedAt: postSummary.createdAt,
      },
      board: '자유',
      stats: { viewCount: 31, commentCount: 3, helpfulCount: 8 },
    });
  }
  if (pathname.endsWith('/community/posts')) {
    return response(config, {
      popularItems: [],
      items: [postSummary],
      page: 1,
      size: 50,
      totalElements: 1,
      totalPages: 1,
      hasNext: false,
      hasPrevious: false,
      totalPostCount: 1,
    });
  }
  if (pathname.endsWith('/saved-resources')) {
    return response(config, {
      items: [
        {
          resourceType: 'COMMUNITY_POST',
          resourceKey: '42',
          title: postSummary.title,
          preview: postSummary.excerpt,
          destination: '/community/42',
          savedAt: '2026-08-06T10:00:00+09:00',
          resourceState: 'AVAILABLE',
        },
      ],
      nextCursor: null,
    });
  }
  if (pathname.endsWith('/api/v1/notifications')) {
    return response(config, {
      content: [
        {
          id: 1,
          topicType: 'COMMENT',
          topicDescription: '커뮤니티 답변',
          title: '서진님이 내 글에 답을 남겼어요',
          content: postSummary.title,
          isRead: false,
          createdAt: '2026-08-06T10:00:00+09:00',
          destination: { state: 'AVAILABLE', path: '/community/42' },
        },
      ],
      page: 1,
      size: 10,
      totalElements: 1,
      totalPages: 1,
      hasNext: false,
      hasPrevious: false,
    });
  }
  if (pathname.endsWith('/api/v1/notifications/categories')) {
    return response(config, { notificationCategories: [] });
  }
  if (pathname.endsWith('/api/v1/notifications/has-new')) {
    return response(config, { hasNewNotification: true });
  }
  if (pathname.endsWith('/api/v6/mypage/class/profile')) {
    return response(config, {
      nickname: '테스트 멤버',
      selfIntroduction: '매일 하나씩 만들고 기록합니다.',
      jobs: ['CLASS_ONBOARDING_DEVELOPER'],
      career: 'JUNIOR',
      vibeCodingExperienceLevel: 'BUILT_WORKING_RESULT',
      learningGoal: '작은 웹앱으로 첫 매출 만들기',
      phoneVerified: true,
      email: 'member@example.com',
      phoneNumber: '01012345678',
      countryCode: '+82',
      marketingConsent: true,
    });
  }
  if (pathname.endsWith('/api/v1/jobs')) return response(config, []);
  if (pathname.endsWith('/api/v1/careers')) return response(config, []);
  return response(config, {});
};

axiosInstance.defaults.adapter = adapter;
axiosInstanceV2.defaults.adapter = adapter;
axiosInstanceV6.defaults.adapter = adapter;

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, staleTime: Infinity } },
});
const screen =
  new URLSearchParams(window.location.search).get('screen') ?? 'home';

useUserStore.getState().setUserInfo({
  memberId: 1,
  nickname: '테스트 멤버',
  memberName: '테스트 멤버',
  tel: '01012345678',
  profileImageUrl: null,
});
document.cookie = `accessToken=${token}; path=/`;

const renderMyPageShell = (children: ReactNode) =>
  createElement(
    'div',
    { className: 'flex min-h-screen flex-col lg:flex-row' },
    createElement(MyPageMobileNav),
    createElement(MyPageSidebar),
    createElement(
      'main',
      { className: 'mx-auto w-full max-w-[780px] flex-1 px-400 py-500' },
      children,
    ),
  );

const appByScreen: Record<string, ReactNode> = {
  home: <HomeFeed />,
  search: <HomeFeed initialSearchQuery="배포" />,
  comm: createElement(CommunityRoomHubPage),
  room: createElement(CommunityRoomDetailPage, { roomId: ROOM_ID }),
  post: createElement(CommunityDetailPageClient, {
    postId: 42,
    initialSeoPreview: {
      postId: 42,
      title: postSummary.title,
      previewText: postSummary.excerpt,
      author: { publicProfileUuid: PROFILE_UUID, nickname: '민아' },
      sourceRoom: { roomId: ROOM_ID, name: room.name },
      publishedAt: postSummary.createdAt,
      accessMode: 'TEASER',
    },
  }),
  write: createElement(CommunityWritePageClient, { mode: 'create' }),
  saved: renderMyPageShell(createElement(SavedResourcesPage)),
  profile: createElement(
    'main',
    { className: 'mx-auto w-full max-w-3xl px-300 py-600 sm:px-400' },
    createElement(
      'div',
      {
        className:
          'rounded-200 border border-border-subtle bg-background-default p-400 shadow-1',
      },
      createElement(PublicProfileContent, { profile }),
    ),
  ),
  my: renderMyPageShell(createElement(MyPage)),
  noti: renderMyPageShell(createElement(NotificationPage)),
};

createRoot(document.getElementById('root')!).render(
  <AuthHydrationProvider initialSession={{ accessToken: token }}>
    <QueryClientProvider client={queryClient}>
      {appByScreen[screen] ?? appByScreen.home}
    </QueryClientProvider>
  </AuthHydrationProvider>,
);
