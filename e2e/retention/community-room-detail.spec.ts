import { expect, type Page, test } from '@playwright/test';
import {
  authenticatePage,
  requiredMemberId,
  missingSprint7Env,
  sprint7EnvMissingReason,
} from '../support/sprint7-v3';

const ROOM_ID = 7;

const ROOM = {
  roomId: ROOM_ID,
  cohortId: ROOM_ID,
  slug: 'webapp-revenue',
  code: 'webapp-revenue',
  name: '첫 유료 유저 만들기',
  description: '첫 유료 고객을 만드는 실험과 기록을 나눕니다.',
  bannerUrl: null,
  axisTags: [
    { code: 'developer', label: '개발자', axis: 'JOB' },
    { code: 'webapp', label: '웹앱 수익화', axis: 'GOAL' },
    { code: 'beginner', label: '입문', axis: 'LEVEL' },
  ],
  jobAxis: [{ code: 'developer', label: '개발자', axis: 'JOB' }],
  goalAxis: [{ code: 'webapp', label: '웹앱 수익화', axis: 'GOAL' }],
  levelAxis: [{ code: 'beginner', label: '입문', axis: 'LEVEL' }],
  stats: { memberCount: 18, postCount7d: 4, commentCount7d: 9 },
  memberCount: 18,
  newPostsToday: 4,
  liveSignal: true,
  membership: { state: 'ACTIVE', canJoin: false },
  ownership: {
    state: 'ACTIVE',
    ownerPublicProfileUuid: 'profile-owner',
    claimable: false,
    revision: 1,
  },
  admissionQuestions: [
    { order: 1, body: '지금 뭘 만들고 있나요?' },
    { order: 2, body: '어디서 가장 자주 막히나요?' },
  ],
  members: {
    items: [
      {
        publicProfileUuid: 'profile-owner',
        nickname: '서진',
        profileImageUrl: null,
        joinedAt: '2026-07-01T09:00:00',
        newcomer: false,
      },
      {
        publicProfileUuid: 'profile-newcomer',
        nickname: '민지',
        profileImageUrl: '/insights/worldmap/isl-web.png',
        joinedAt: '2026-08-05T09:00:00',
        newcomer: true,
      },
    ],
    nextCursor: null,
  },
  activity: {
    posts7d: 4,
    comments7d: 9,
    helpful7d: 5,
    activeMembers7d: 11,
  },
  rules: [
    { order: 1, body: '시도한 내용을 함께 씁니다.' },
    { order: 2, body: '서로의 작업을 존중합니다.' },
  ],
  revision: 1,
};

const POST = {
  postId: 42,
  revision: 1,
  board: 'free',
  title: '첫 유료 유저 인터뷰를 이렇게 시작했어요',
  excerpt: '인터뷰 요청부터 정리한 질문까지 공유합니다.',
  previewImageUrl: null,
  previewImageAlt: null,
  author: {
    memberId: 3,
    name: '민지',
    profileImageUrl: null,
    role: 'MEMBER',
  },
  stats: {
    viewCount: 12,
    likeCount: 3,
    commentCount: 2,
  },
  viewer: {
    isAuthenticated: true,
    canEdit: false,
    canDelete: false,
  },
  createdAt: '2026-07-19T09:00:00',
  updatedAt: '2026-07-19T09:00:00',
};

const roomHub = (myRooms = [ROOM], exploreRooms = [ROOM]) => ({
  myRooms,
  exploreRooms,
  axes: {
    job: ROOM.jobAxis,
    goal: ROOM.goalAxis,
    level: ROOM.levelAxis,
  },
  activeRoomCount: myRooms.length,
  activeRoomLimit: 3,
});

const feed = (items = [POST]) => ({
  popularItems: [],
  items,
  page: 1,
  size: 50,
  totalElements: items.length,
  totalPages: 1,
  hasNext: false,
  hasPrevious: false,
  totalPostCount: items.length,
});

const fulfillJson = async (
  page: Page,
  pattern: string,
  body: unknown,
  status = 200,
) => {
  await page.route(pattern, (route) =>
    route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify({ content: body }),
    }),
  );
};

const routeJoinableRoom = async (page: Page) => {
  let joined = false;

  await page.route('**/api/v1/community/rooms**', (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;

    if (
      request.method() === 'POST' &&
      pathname.endsWith(`/community/rooms/${ROOM_ID}/join`)
    ) {
      joined = true;
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          content: {
            joined: true,
            joinedRoomId: ROOM_ID,
            leftRoomId: null,
            memberCount: ROOM.memberCount + 1,
            activeRoomCount: 1,
            membershipRevision: 1,
            activeRooms: [{ roomId: ROOM_ID, name: ROOM.name }],
          },
        }),
      });
    }

    const isDetail = pathname.endsWith(`/community/rooms/${ROOM_ID}`);
    const joinedRoom = {
      ...ROOM,
      membership: {
        state: joined ? 'ACTIVE' : 'NONE',
        canJoin: !joined,
      },
    };

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        content: isDetail
          ? joinedRoom
          : joined
            ? roomHub([joinedRoom], [])
            : roomHub([], [joinedRoom]),
      }),
    });
  });
};

const routeStaticRoom = async (page: Page) => {
  await page.route('**/api/v1/community/rooms**', (route) => {
    const pathname = new URL(route.request().url()).pathname;
    const content = pathname.endsWith(`/community/rooms/${ROOM_ID}`)
      ? ROOM
      : roomHub();

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ content }),
    });
  });
};

test.skip(missingSprint7Env().length > 0, sprint7EnvMissingReason());

test.describe('커뮤니티 방 상세', () => {
  test('탐색 방 입장하기가 실제 가입 후 방 피드로 연결된다', async ({
    page,
    request,
  }) => {
    await page.setViewportSize({ width: 1024, height: 900 });
    let likeCount = POST.stats.likeCount;
    let helpfulState = false;
    const helpfulMethods: string[] = [];
    await authenticatePage(page, request, requiredMemberId());
    await routeJoinableRoom(page);
    await fulfillJson(page, '**/api/v1/community/posts/rep/me', {
      repBalance: 12,
      repEarnedTotal: 24,
      recentEarns: [],
    });
    await page.route(`**/api/v1/community/posts?roomId=${ROOM_ID}**`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          content: feed([{ ...POST, stats: { ...POST.stats, likeCount } }]),
        }),
      }),
    );
    await page.route(
      `**/api/v1/community/posts/${POST.postId}/helpful`,
      (route) => {
        const method = route.request().method();
        helpfulMethods.push(method);
        helpfulState = method === 'POST';
        likeCount = helpfulState ? 4 : 3;

        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            content: {
              helpful: helpfulState,
              likeCount,
              authorRepDelta: helpfulState ? 1 : -1,
            },
          }),
        });
      },
    );

    await page.goto('/community');
    await page.getByTestId(`community-room-join-${ROOM_ID}`).click();
    const currentBuildAnswer = page.getByLabel('지금 뭘 만들고 있나요?');
    const currentBlockerAnswer = page.getByLabel('어디서 가장 자주 막히나요?');
    await currentBuildAnswer.fill('첫 유료 고객 실험');
    await expect(currentBuildAnswer).toHaveValue('첫 유료 고객 실험');
    await currentBlockerAnswer.fill('인터뷰 요청');
    await expect(currentBlockerAnswer).toHaveValue('인터뷰 요청');
    const joinSubmit = page.getByTestId('community-room-join-submit');
    await expect(joinSubmit).toBeEnabled();
    await joinSubmit.click();

    await expect(page).toHaveURL(`/community/rooms/${ROOM_ID}`);
    await expect(page.getByTestId('community-room-detail')).toContainText(
      '첫 유료 유저 만들기',
    );
    await expect(page.getByTestId('community-room-members')).toContainText(
      '최근 정착한 1명에게 먼저 환영을 남겨 주세요.',
    );
    await expect(
      page
        .getByTestId('community-room-members')
        .getByRole('list')
        .getByRole('link', { name: '민지 프로필 보기' }),
    ).toBeVisible();
    await expect(page.getByTestId('community-room-pulse')).toContainText(
      '오늘 새 글',
    );
    await expect(
      page.getByTestId('community-room-pulse').locator('div'),
    ).toHaveCount(4);
    await expect(page.getByText(POST.title)).toBeVisible();
    await expect(page.getByTestId('community-room-write-link')).toHaveAttribute(
      'href',
      `/community/write?roomId=${ROOM_ID}`,
    );
    const mainBox = await page.getByTestId('community-room-main').boundingBox();
    const railBox = await page
      .getByTestId('community-room-member-rail')
      .boundingBox();
    expect(mainBox).not.toBeNull();
    expect(railBox).not.toBeNull();
    expect(railBox?.width).toBeGreaterThanOrEqual(319);
    expect(railBox?.width).toBeLessThanOrEqual(321);
    expect(railBox?.x ?? 0).toBeGreaterThan(
      (mainBox?.x ?? 0) + (mainBox?.width ?? 0),
    );

    const helpful = page.getByTestId(`community-post-helpful-${POST.postId}`);
    await helpful.click();
    await expect(helpful).toHaveAttribute('aria-pressed', 'true');
    await expect(helpful).toContainText('4');

    await page.reload();
    const persistedHelpful = page.getByTestId(
      `community-post-helpful-${POST.postId}`,
    );
    await expect(persistedHelpful).toHaveAttribute('aria-pressed', 'true');
    await expect(persistedHelpful).toContainText('4');

    await persistedHelpful.click();
    await expect(persistedHelpful).toHaveAttribute('aria-pressed', 'false');
    await expect(persistedHelpful).toContainText('3');
    expect(helpfulMethods).toEqual(['POST', 'DELETE']);
  });

  test('방 아카이브 검색은 roomId와 검색어를 포함해 API를 호출한다', async ({
    page,
  }) => {
    await routeStaticRoom(page);
    await fulfillJson(
      page,
      `**/api/v1/community/posts?roomId=${ROOM_ID}**`,
      feed(),
    );
    let searchRequestUrl = '';
    await page.route('**/api/v1/community/posts/search**', (route) => {
      searchRequestUrl = route.request().url();
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          content: {
            items: [POST],
            page: 1,
            size: 50,
            totalElements: 1,
            totalPages: 1,
            hasNext: false,
            hasPrevious: false,
          },
        }),
      });
    });

    await page.goto(`/community/rooms/${ROOM_ID}`);
    await page.getByLabel('방 아카이브 검색').fill('유료 유저');

    await expect(
      page.getByRole('heading', { name: '아카이브 검색 결과' }),
    ).toBeVisible();
    await expect.poll(() => searchRequestUrl).not.toBe('');
    const params = new URL(searchRequestUrl).searchParams;
    expect(params.get('roomId')).toBe(String(ROOM_ID));
    expect(params.get('q')).toBe('유료 유저');
    expect(params.get('sort')).toBe('popular');
  });

  test('빈 방은 첫 글을 기다리는 상태를 보여준다', async ({ page }) => {
    await routeStaticRoom(page);
    await fulfillJson(
      page,
      `**/api/v1/community/posts?roomId=${ROOM_ID}**`,
      feed([]),
    );

    await page.goto(`/community/rooms/${ROOM_ID}`);

    await expect(page.getByTestId('community-room-posts-empty')).toContainText(
      '아직 새 글이 없어요',
    );
  });

  test('방 상세의 비소속 CTA로 가입하면 막힘 없이 피드가 열린다', async ({
    page,
    request,
  }) => {
    let postRequests = 0;
    await authenticatePage(page, request, requiredMemberId());
    await routeJoinableRoom(page);
    await page.route('**/api/v1/community/posts**', (route) => {
      postRequests += 1;
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ content: feed() }),
      });
    });

    await page.goto(`/community/rooms/${ROOM_ID}`);

    await expect(page.getByTestId('community-room-not-member')).toHaveCount(0);
    await expect(page.getByTestId('community-room-detail-join')).toBeVisible();
    await expect(page.getByText(POST.title)).toBeVisible();
    expect(postRequests).toBe(1);

    await page.getByTestId('community-room-detail-join').click();
    await page.getByLabel('지금 뭘 만들고 있나요?').fill('실험 기록 정리');
    await page.getByLabel('어디서 가장 자주 막히나요?').fill('첫 고객 찾기');
    await page.getByTestId('community-room-join-submit').click();

    await expect(page.getByTestId('community-room-detail')).toBeVisible();
    await expect(page.getByText(POST.title)).toBeVisible();
    await expect(page.getByTestId('community-room-write-link')).toBeVisible();
    expect(postRequests).toBeGreaterThanOrEqual(1);
  });

  test('3개 방 사용자는 카드에서 바꿀 방을 고른 뒤 정착한다', async ({
    page,
    request,
  }) => {
    await authenticatePage(page, request, requiredMemberId());
    const activeRooms = [8, 9, 10].map((roomId, index) => ({
      ...ROOM,
      roomId,
      name: ['업무 자동화', '배포와 도메인', '포트폴리오 만들기'][index],
      membership: { state: 'ACTIVE', canJoin: false },
      stats: {
        ...ROOM.stats,
        postCount7d: index,
      },
    }));
    let joinBody: Record<string, unknown> | undefined;

    await page.route('**/api/v1/community/rooms**', async (route) => {
      const request = route.request();
      const pathname = new URL(request.url()).pathname;

      if (
        request.method() === 'POST' &&
        pathname.endsWith(`/community/rooms/${ROOM_ID}/join`)
      ) {
        joinBody = request.postDataJSON() as Record<string, unknown>;
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            content: {
              joined: true,
              joinedRoomId: ROOM_ID,
              leftRoomId: 8,
              memberCount: 19,
              activeRoomCount: 3,
              membershipRevision: 2,
              activeRooms: [],
            },
          }),
        });
      }

      const isDetail = pathname.endsWith(`/community/rooms/${ROOM_ID}`);
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          content: isDetail
            ? { ...ROOM, membership: { state: 'NONE', canJoin: true } }
            : roomHub(activeRooms, [
                { ...ROOM, membership: { state: 'NONE', canJoin: true } },
              ]),
        }),
      });
    });

    await page.goto('/community');
    await page.getByTestId(`community-room-join-${ROOM_ID}`).click();
    await page.getByLabel('지금 뭘 만들고 있나요?').fill('예약 페이지');
    await page.getByLabel('어디서 가장 자주 막히나요?').fill('로그인 연결');
    await page.getByTestId('community-room-swap-8').click();
    await page.getByTestId('community-room-join-submit').click();

    await expect.poll(() => joinBody).toBeTruthy();
    expect(joinBody?.leaveRoomId).toBe(8);
  });

  test('방장은 경고를 확인한 뒤 자유롭게 나간다', async ({ page }) => {
    let leaveCalled = false;
    await page.route('**/api/v1/community/rooms**', (route) => {
      const request = route.request();
      const pathname = new URL(request.url()).pathname;
      if (
        request.method() === 'DELETE' &&
        pathname.endsWith(`/community/rooms/${ROOM_ID}/join`)
      ) {
        leaveCalled = true;
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            content: {
              joined: false,
              joinedRoomId: null,
              leftRoomId: ROOM_ID,
              memberCount: 17,
              activeRoomCount: 0,
              membershipRevision: 2,
              activeRooms: [],
            },
          }),
        });
      }

      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          content: pathname.endsWith(`/community/rooms/${ROOM_ID}`)
            ? ROOM
            : roomHub(),
        }),
      });
    });
    await fulfillJson(
      page,
      `**/api/v1/community/posts?roomId=${ROOM_ID}**`,
      feed(),
    );

    await page.goto(`/community/rooms/${ROOM_ID}`);
    await page.getByTestId('community-room-leave').click();
    await expect(
      page.getByText('방장으로 나가면 이 방은 방장이 없는 상태로 남아요'),
    ).toBeVisible();
    await page.getByTestId('community-room-leave-confirm').click();

    await expect.poll(() => leaveCalled).toBe(true);
  });

  test('방장 인수 경합에서 지면 새 방장 정보를 다시 불러온다', async ({
    page,
  }) => {
    let detailReads = 0;
    const vacantRoom = {
      ...ROOM,
      ownership: {
        state: 'VACANT',
        ownerPublicProfileUuid: null,
        claimable: true,
        revision: 8,
      },
    };
    await page.route('**/api/v1/community/rooms**', (route) => {
      const request = route.request();
      const pathname = new URL(request.url()).pathname;
      if (
        request.method() === 'POST' &&
        pathname.endsWith(`/community/rooms/${ROOM_ID}/ownership-claims`)
      ) {
        return route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({
            statusCode: 409,
            errorCode: 'CMT029',
            errorName: 'Conflict',
            message: 'already claimed',
          }),
        });
      }
      if (pathname.endsWith(`/community/rooms/${ROOM_ID}`)) {
        detailReads += 1;
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          content: pathname.endsWith(`/community/rooms/${ROOM_ID}`)
            ? vacantRoom
            : roomHub(),
        }),
      });
    });
    await fulfillJson(
      page,
      `**/api/v1/community/posts?roomId=${ROOM_ID}**`,
      feed(),
    );

    await page.goto(`/community/rooms/${ROOM_ID}`);
    await page.getByTestId('community-room-claim-ownership').click();

    await expect(
      page.getByTestId('community-room-ownership-result'),
    ).toContainText('다른 멤버가 먼저 이 방을 맡았어요');
    expect(detailReads).toBeGreaterThanOrEqual(2);
  });

  test('피드 오류는 나머지 방 정보와 분리해 재시도를 제공한다', async ({
    page,
  }) => {
    await routeStaticRoom(page);
    await fulfillJson(
      page,
      `**/api/v1/community/posts?roomId=${ROOM_ID}**`,
      { message: 'failed' },
      500,
    );

    await page.goto(`/community/rooms/${ROOM_ID}`);

    await expect(page.getByText('첫 유료 유저 만들기')).toBeVisible();
    await expect(page.getByTestId('community-room-posts-error')).toBeVisible();
    await expect(page.getByRole('button', { name: '다시 시도' })).toBeVisible();
  });

  test('피드 응답 전에는 서버 공개 요약을 유지하고 준비된 피드로 전환한다', async ({
    page,
  }) => {
    await routeStaticRoom(page);
    await page.route(
      `**/api/v1/community/posts?roomId=${ROOM_ID}**`,
      async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 500));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ content: feed() }),
        });
      },
    );

    await page.goto(`/community/rooms/${ROOM_ID}`, {
      waitUntil: 'domcontentloaded',
    });

    await expect(page.getByLabel('공개 글 미리보기')).toBeVisible();
    await expect(page.getByTestId('community-room-detail')).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByLabel('공개 글 미리보기')).toBeHidden();
  });
});
