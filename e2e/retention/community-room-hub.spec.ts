import { expect, type Page, test } from '@playwright/test';
import {
  authenticatePage,
  requiredMemberId,
  missingSprint7Env,
  sprint7EnvMissingReason,
} from '../support/sprint7-v3';

const ROOM_HUB = {
  myRooms: [],
  exploreRooms: [
    {
      roomId: 7,
      cohortId: 7,
      slug: 'webapp-revenue',
      code: 'webapp-revenue',
      name: '첫 유료 유저 만들기',
      description: '첫 유료 고객을 만드는 실험을 나눕니다.',
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
      membership: { state: 'NONE', canJoin: true },
      rules: [],
      revision: 1,
    },
  ],
  axes: {
    job: [{ code: 'developer', label: '개발자' }],
    goal: [{ code: 'webapp', label: '웹앱 수익화' }],
    level: [{ code: 'beginner', label: '입문' }],
  },
  activeRoomCount: 0,
  activeRoomLimit: 3,
};

const fulfillRoomHub = async (page: Page, body: unknown, status = 200) => {
  await page.route('**/api/v1/community/rooms**', (route) =>
    route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify({ content: body }),
    }),
  );
};

test.skip(missingSprint7Env().length > 0, sprint7EnvMissingReason());

test.describe('커뮤니티 방 허브', () => {
  test('활동 신호와 3축 필터를 보여준다', async ({ page }) => {
    await fulfillRoomHub(page, ROOM_HUB);

    await page.goto('/community');

    await expect(page.getByTestId('community-room-hub')).toBeVisible();
    await expect(page.getByTestId('community-room-card')).toContainText(
      '오늘 글 4개',
    );
    await page.getByTestId('community-room-filter-job-developer').click();
    await expect(
      page.getByTestId('community-room-filter-job-developer'),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  test('방 배너를 표시하고 아이콘이 제목을 침범하지 않는다', async ({
    page,
  }) => {
    const bannerUrl = '/community/rooms/room-banner-v2.jpg';
    await fulfillRoomHub(page, {
      ...ROOM_HUB,
      exploreRooms: [{ ...ROOM_HUB.exploreRooms[0], bannerUrl }],
    });

    await page.goto('/community');

    const card = page.getByTestId('community-room-card');
    const banner = card.getByRole('img', {
      name: `${ROOM_HUB.exploreRooms[0].name} 배너`,
    });
    const icon = card.getByRole('img', {
      name: `${ROOM_HUB.exploreRooms[0].name} 아이콘`,
    });
    const title = card.getByRole('heading', {
      name: ROOM_HUB.exploreRooms[0].name,
    });

    await expect(banner).toHaveAttribute('src', /room-banner-v2\.jpg/);
    await expect(icon).toBeVisible();
    await expect(title).toBeVisible();

    const iconBox = await icon.boundingBox();
    const titleBox = await title.boundingBox();
    expect(iconBox).not.toBeNull();
    expect(titleBox).not.toBeNull();
    expect(iconBox!.y + iconBox!.height).toBeLessThanOrEqual(titleBox!.y);
  });

  test('내 방과 아직 정착하지 않은 방을 서로 다른 영역에 둔다', async ({
    page,
  }) => {
    const myRoom = {
      ...ROOM_HUB.exploreRooms[0],
      roomId: 8,
      name: '업무 자동화',
      membership: { state: 'ACTIVE', canJoin: false },
    };
    await fulfillRoomHub(page, {
      ...ROOM_HUB,
      myRooms: [myRoom],
      activeRoomCount: 1,
    });

    await page.goto('/community');

    await expect(page.getByRole('heading', { name: '내 방 1' })).toBeVisible();
    await expect(page.getByText('아직 정착하지 않은 방')).toBeVisible();
    await expect(page.getByRole('link', { name: /업무 자동화/ })).toBeVisible();
  });

  test('로그인 사용자의 비공개 평판 잔액을 표시한다', async ({
    page,
    request,
  }) => {
    await authenticatePage(
      page,
      request,
      requiredMemberId('E2E_RETENTION_NON_MEMBER_ID'),
    );
    await fulfillRoomHub(page, ROOM_HUB);
    await page.route('**/api/v1/community/posts/rep/me', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          content: {
            repBalance: 37,
            repEarnedTotal: 52,
            recentEarns: [],
          },
        }),
      }),
    );

    await page.goto('/community');

    await expect(page.getByTestId('community-my-rep')).toHaveText(
      '내 평판37점',
    );
  });

  test('방이 없으면 다음 행동을 안내한다', async ({ page }) => {
    await fulfillRoomHub(page, { ...ROOM_HUB, exploreRooms: [] });

    await page.goto('/community');

    await expect(page.getByTestId('community-room-empty')).toContainText(
      '방을 준비하고 있어요',
    );
  });

  test('목록 오류는 재시도 상태로 격리한다', async ({ page }) => {
    await fulfillRoomHub(page, { message: 'failed' }, 500);

    await page.goto('/community');

    await expect(page.getByTestId('community-room-error')).toBeVisible();
    await expect(page.getByRole('button', { name: '다시 시도' })).toBeVisible();
  });

  test('기존 방 만들기 모달에서 기본 사진과 첫 글로 방을 연다', async ({
    page,
    request,
  }) => {
    await authenticatePage(
      page,
      request,
      requiredMemberId('E2E_RETENTION_NON_MEMBER_ID'),
    );
    let createBody: Record<string, unknown> | undefined;

    await page.route('**/api/v1/community/rooms**', async (route) => {
      if (route.request().method() === 'POST') {
        createBody = route.request().postDataJSON() as Record<string, unknown>;
        return route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            content: {
              roomId: 99,
              slug: 'reservation-page',
              membership: {
                role: 'OWNER',
                status: 'ACTIVE',
                joinedAt: '2026-08-06T09:00:00',
              },
              firstPostId: 101,
              activeRoomCount: 1,
              revision: 1,
            },
          }),
        });
      }

      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ content: ROOM_HUB }),
      });
    });
    await page.route(
      '**/api/v1/community/posts/content-images/upload-ticket',
      (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            content: {
              uploadUrl: 'https://upload.test/community-room-banner',
              publicUrl:
                'https://cdn.test/uploads/community-rooms/e2e-room-banner.jpg',
              uploadMethod: 'PUT',
              uploadFieldName: 'file',
              expiresAt: '2026-08-06T10:00:00',
            },
          }),
        }),
    );
    await page.route('https://upload.test/**', (route) =>
      route.fulfill({ status: 200, body: '' }),
    );

    await page.goto('/community');
    await page.getByTestId('community-room-create-trigger').first().click();
    await page.getByLabel('방 이름').fill('노코드로 예약 페이지 만들기');
    await page
      .getByTestId('community-room-create-job')
      .getByRole('button', { name: '개발자' })
      .click();
    await page
      .getByTestId('community-room-create-goal')
      .getByRole('button', { name: '웹앱 수익화' })
      .click();
    await page
      .getByTestId('community-room-create-level')
      .getByRole('button', { name: '입문' })
      .click();
    await page
      .getByLabel(/방 소개.*누구를 위한 방인지 한두 줄/)
      .fill('코딩 없이 예약 받는 페이지까지 만드는 방이에요.');
    await page
      .getByLabel(/내 소개.*방장으로 처음 올라가는 소개/)
      .fill('공방 예약을 직접 자동화하려고 이 방을 열었어요.');
    await page
      .getByLabel(/첫 글 제목.*방 맨 위에 고정됩니다/)
      .fill('이 방을 시작하며');
    await page.getByRole('button', { name: '왜 이 방을 열었는지' }).click();
    await page
      .getByLabel(/첫 글 본문.*세 줄이면 충분해요/)
      .fill(
        '이 방을 왜 열었는지부터 적어 볼게요. 함께 예약 페이지를 완성해요.',
      );
    await page.getByTestId('community-room-create-submit').click();

    await expect.poll(() => createBody).toBeTruthy();
    expect(createBody?.bannerAssetKey).toBe(
      'uploads/community-rooms/e2e-room-banner.jpg',
    );
    expect(createBody?.axisTags).toEqual(['developer', 'webapp', 'beginner']);
  });

  test('단수 인사이트 경로는 복수 경로로 영구 리다이렉트한다', async ({
    request,
  }) => {
    const response = await request.get('/insight', { maxRedirects: 0 });

    expect(response.status()).toBe(200);
    expect(await response.text()).toMatch(
      /<meta[^>]+http-equiv="refresh"[^>]+url=\/insights/i,
    );
  });
});
