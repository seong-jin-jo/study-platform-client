import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { axiosInstance } from '@/api/client/axios';
import CommunityRoomDetailPage from '@/components/community/pages/community-room-detail-page';
import CommunityRoomHubPage from '@/components/community/pages/community-room-hub-page';
import { AuthHydrationProvider } from '@/features/auth/model/auth-hydration-context';

const ROOM_ID = 7;
interface HarnessEvent {
  name: 'claim' | 'join' | 'leave';
  payload?: unknown;
}
const harnessWindow = window as typeof window & {
  __COMMUNITY_ROOM_HARNESS_EVENTS__: HarnessEvent[];
};
const searchParams = new URLSearchParams(window.location.search);
const mode = searchParams.get('mode');
harnessWindow.__COMMUNITY_ROOM_HARNESS_EVENTS__ = [];
const token = [
  'e30',
  btoa(
    JSON.stringify({
      roleIds: ['ROLE_MEMBER'],
      authVendor: 'TEST',
      memberId: 1,
      sub: 'sprint7-offline-harness',
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
  axisTags: [
    { code: 'developer', label: '직장인', axis: 'JOB' },
    { code: 'webapp', label: '수입 만들기', axis: 'GOAL' },
    { code: 'beginner', label: '처음이에요', axis: 'LEVEL' },
  ],
  jobAxis: [{ code: 'developer', label: '직장인', axis: 'JOB' }],
  goalAxis: [{ code: 'webapp', label: '수입 만들기', axis: 'GOAL' }],
  levelAxis: [{ code: 'beginner', label: '처음이에요', axis: 'LEVEL' }],
  stats: { memberCount: 12, postCount7d: 14, commentCount7d: 30 },
  memberCount: 12,
  newPostsToday: 3,
  liveSignal: true,
  membership: { state: 'ACTIVE', canJoin: false },
  ownership: {
    state: 'ACTIVE',
    ownerPublicProfileUuid: 'profile-seojin',
    claimable: false,
    revision: 8,
  },
  admissionQuestions: [
    { order: 1, body: '지금 뭘 만들고 있나요?' },
    { order: 2, body: '어디서 가장 자주 막히나요?' },
  ],
  members: {
    items: [
      {
        publicProfileUuid: 'profile-seojin',
        nickname: '서진',
        profileImageUrl: null,
        joinedAt: '2026-06-01T09:00:00',
        newcomer: false,
      },
      {
        publicProfileUuid: 'profile-mina',
        nickname: '민아',
        profileImageUrl: null,
        joinedAt: '2026-07-01T09:00:00',
        newcomer: false,
      },
      {
        publicProfileUuid: 'profile-taeo',
        nickname: '태오',
        profileImageUrl: null,
        joinedAt: '2026-08-05T09:00:00',
        newcomer: true,
      },
    ],
    nextCursor: null,
  },
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

const myRooms = [
  {
    ...room,
    roomId: 8,
    name: '업무 자동화',
    stats: { ...room.stats, postCount7d: 0 },
    newPostsToday: 0,
  },
  { ...room, roomId: 9, name: '배포와 도메인', newPostsToday: 1 },
  { ...room, roomId: 10, name: '포트폴리오 만들기', newPostsToday: 2 },
];

const post = {
  postId: 42,
  revision: 1,
  board: '자유',
  title: 'Supabase 로그인 후 프로필이 안 만들어져요',
  excerpt:
    '프로필을 만드는 규칙부터 확인한 과정을 정리했습니다. 같은 오류를 만난 분께 도움이 되길 바랍니다.',
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
  createdAt: '2026-08-06T09:00:00',
  updatedAt: '2026-08-06T09:00:00',
};

const feed = {
  popularItems: [],
  items: [
    post,
    { ...post, postId: 43, title: '결제창 다음 단계에서 막혔어요' },
  ],
  page: 1,
  size: 50,
  totalElements: 2,
  totalPages: 1,
  hasNext: false,
  hasPrevious: false,
  totalPostCount: 2,
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

axiosInstance.defaults.adapter = async (config) => {
  const url = config.url ?? '';
  const method = config.method?.toLowerCase() ?? 'get';
  if (url === `/community/rooms/${ROOM_ID}` && method === 'get') {
    if (mode === 'vacant') {
      return response(config, {
        ...room,
        ownership: {
          state: 'VACANT',
          ownerPublicProfileUuid: null,
          claimable: true,
          revision: 9,
        },
      });
    }
    return response(config, room);
  }
  if (url === '/community/rooms') {
    const createMode = mode === 'create';
    return response(config, {
      myRooms: createMode ? myRooms.slice(0, 2) : myRooms,
      exploreRooms: [{ ...room, membership: { state: 'NONE', canJoin: true } }],
      axes: {
        job: room.jobAxis,
        goal: room.goalAxis,
        level: room.levelAxis,
      },
      activeRoomCount: createMode ? 2 : 3,
      activeRoomLimit: 3,
    });
  }
  if (url === '/community/posts') return response(config, feed);
  if (url === '/community/posts/rep/me') {
    return response(config, {
      repBalance: 128,
      repEarnedTotal: 180,
      recentEarns: [],
    });
  }
  if (url === `/community/rooms/${ROOM_ID}/join` && method === 'post') {
    harnessWindow.__COMMUNITY_ROOM_HARNESS_EVENTS__.push({
      name: 'join',
      payload:
        typeof config.data === 'string' ? JSON.parse(config.data) : config.data,
    });
    return response(config, {
      roomId: ROOM_ID,
      membership: { state: 'ACTIVE', canJoin: false },
    });
  }
  if (url === `/community/rooms/${ROOM_ID}/join` && method === 'delete') {
    harnessWindow.__COMMUNITY_ROOM_HARNESS_EVENTS__.push({ name: 'leave' });
    await new Promise((resolve) => window.setTimeout(resolve, 500));
    return response(config, {
      roomId: ROOM_ID,
      membership: { state: 'NONE', canJoin: true },
    });
  }
  if (
    url === `/community/rooms/${ROOM_ID}/ownership-claims` &&
    method === 'post'
  ) {
    harnessWindow.__COMMUNITY_ROOM_HARNESS_EVENTS__.push({
      name: 'claim',
      payload:
        typeof config.data === 'string' ? JSON.parse(config.data) : config.data,
    });
    return response(config, {
      roomId: ROOM_ID,
      ownerPublicProfileUuid: 'profile-sprint7-owner',
      revision: 10,
    });
  }

  throw new Error(`offline harness request not mocked: ${url}`);
};

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});
const screen = searchParams.get('screen');
const app =
  screen === 'room'
    ? createElement(CommunityRoomDetailPage, { roomId: ROOM_ID })
    : createElement(CommunityRoomHubPage);

document.cookie = `accessToken=${token}; path=/`;
createRoot(document.getElementById('root')!).render(
  <AuthHydrationProvider initialSession={{ accessToken: token }}>
    <QueryClientProvider client={queryClient}>{app}</QueryClientProvider>
  </AuthHydrationProvider>,
);
