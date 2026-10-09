import { expect, type Page, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { resolveBuildCompareOutputRoot } from '../support/build-compare-output';
import {
  PROTOTYPE_PATH,
  prototypeAvailable,
  prototypeMissingReason,
} from '../support/prototype-path';
import {
  authenticatePage,
  requiredMemberId,
  missingSprint7Env,
  sprint7EnvMissingReason,
} from '../support/sprint7-v3';

const ROOM_ID = 7;

const OUTPUT_ROOT = resolveBuildCompareOutputRoot('sprint7-v3/build-compare');

const ROOM = {
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

const ACTIVE_ROOMS = [
  {
    ...ROOM,
    roomId: 8,
    name: '업무 자동화',
    stats: { ...ROOM.stats, postCount7d: 0 },
    newPostsToday: 0,
  },
  { ...ROOM, roomId: 9, name: '배포와 도메인', newPostsToday: 1 },
  { ...ROOM, roomId: 10, name: '포트폴리오 만들기', newPostsToday: 2 },
];

const EXPLORE_ROOM = {
  ...ROOM,
  membership: { state: 'NONE', canJoin: true },
};

const POST = {
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

const FEED = {
  popularItems: [],
  items: [
    POST,
    { ...POST, postId: 43, title: '결제창 다음 단계에서 막혔어요' },
  ],
  page: 1,
  size: 50,
  totalElements: 2,
  totalPages: 1,
  hasNext: false,
  hasPrevious: false,
  totalPostCount: 2,
};

const mockCommunity = async (page: Page, activeRoomCount: () => number) => {
  await page.route('**/api/v1/community/rooms**', (route) => {
    const pathname = new URL(route.request().url()).pathname;
    const detail = pathname.endsWith(`/community/rooms/${ROOM_ID}`);
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        content: detail
          ? ROOM
          : {
              myRooms: ACTIVE_ROOMS,
              exploreRooms: [EXPLORE_ROOM],
              axes: {
                job: ROOM.jobAxis,
                goal: ROOM.goalAxis,
                level: ROOM.levelAxis,
              },
              activeRoomCount: activeRoomCount(),
              activeRoomLimit: 3,
            },
      }),
    });
  });
  await page.route('**/api/v1/community/posts?roomId=**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ content: FEED }),
    }),
  );
  await page.route('**/api/v1/community/posts/rep/me', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        content: { repBalance: 128, repEarnedTotal: 180, recentEarns: [] },
      }),
    }),
  );
};

const capturePrototype = async (
  page: Page,
  screen: string,
  viewportName: 'mobile' | 'desktop',
) => {
  const prototypeViewport = viewportName === 'mobile' ? '390' : '1280';
  await page.goto(
    `${pathToFileURL(PROTOTYPE_PATH).href}#scr=${screen}&vp=${prototypeViewport}&auth=member&data=ok`,
  );
  await expect(page.locator(`#scr-${screen}`)).toBeVisible();
  await page.screenshot({
    path: path.join(OUTPUT_ROOT, screen, `proto-${viewportName}.png`),
    fullPage: false,
  });
};

const captureImplementation = async (
  page: Page,
  screen: string,
  viewportName: 'mobile' | 'desktop',
) => {
  if (screen === 'room') {
    await page.goto(`/community/rooms/${ROOM_ID}`);
    await expect(page.getByTestId('community-room-detail')).toBeVisible();
  } else {
    await page.goto('/community');
    await expect(page.getByTestId('community-room-hub')).toBeVisible();
    if (screen === 'join') {
      await page.getByTestId(`community-room-join-${ROOM_ID}`).click();
      await expect(page.getByTestId('community-room-swap-list')).toBeVisible();
    }
    if (screen === 'create') {
      await page.getByTestId('community-room-create-trigger').first().click();
      await expect(page.getByRole('dialog')).toContainText('방 만들기');
    }
  }

  await page.screenshot({
    path: path.join(OUTPUT_ROOT, screen, `impl-${viewportName}.png`),
    fullPage: false,
  });
};

test.skip(!prototypeAvailable, prototypeMissingReason);

test.skip(missingSprint7Env().length > 0, sprint7EnvMissingReason());

test('승인 프로토타입 4개 화면과 구현을 두 뷰포트로 캡처한다', async ({
  page,
  request,
}) => {
  await authenticatePage(
    page,
    request,
    requiredMemberId('E2E_RETENTION_THREE_ROOM_MEMBER_ID'),
  );
  let activeRoomCount = 3;
  await mockCommunity(page, () => activeRoomCount);

  for (const screen of ['comm', 'room', 'join', 'create'] as const) {
    activeRoomCount = screen === 'create' ? 0 : 3;
    await mkdir(path.join(OUTPUT_ROOT, screen), { recursive: true });
    for (const viewport of [
      { name: 'mobile' as const, width: 390, height: 844 },
      { name: 'desktop' as const, width: 1440, height: 900 },
    ]) {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
      await capturePrototype(page, screen, viewport.name);
      await captureImplementation(page, screen, viewport.name);
    }
  }
});
