// biome-ignore assist/source/organizeImports: repository ESLint import/order is authoritative.
import {
  type APIRequestContext,
  expect,
  type Page,
  test,
} from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
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
  API_BASE_URL,
  mintMemberToken,
  requiredMemberId,
  WEB_BASE_URL,
  missingSprint7Env,
  sprint7EnvMissingReason,
} from '../support/sprint7-v3';

const OUTPUT_ROOT = resolveBuildCompareOutputRoot(
  'sprint7-v3/build-compare/dev-live',
);

const APP_ORIGIN =
  process.env.E2E_BUILD_COMPARE_APP_ORIGIN?.trim() || WEB_BASE_URL;
const TOKEN =
  'eyJhbGciOiJub25lIn0.eyJtZW1iZXJJZCI6MSwicm9sZUlkcyI6WyJST0xFX01FTUJFUiJdLCJleHAiOjQxMDQ5OTUyMDB9.signature';

type ScreenName =
  | 'home'
  | 'search'
  | 'comm'
  | 'room'
  | 'post'
  | 'write'
  | 'saved'
  | 'profile'
  | 'my'
  | 'noti';

const viewports = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'desktop', width: 1440, height: 900 },
] as const;

const setMemberSession = async (
  page: Page,
  request: APIRequestContext,
  memberId = requiredMemberId(),
) => {
  const usesLocalFixtureSession =
    process.env.E2E_BUILD_COMPARE_LOCAL_FIXTURE_SESSION === 'true';
  if (!usesLocalFixtureSession) {
    await authenticatePage(page, request, memberId);
    return;
  }
  await page.context().addCookies([
    {
      name: 'accessToken',
      value: TOKEN,
      url: APP_ORIGIN,
      sameSite: 'Lax',
    },
    {
      name: 'memberId',
      value: '1',
      url: APP_ORIGIN,
      sameSite: 'Lax',
    },
  ]);
};

const capturePrototype = async (
  page: Page,
  screen: ScreenName,
  viewport: (typeof viewports)[number],
  outputRoot: string,
) => {
  const prototypeViewport = viewport.name === 'mobile' ? '390' : '1280';
  await page.goto(
    `${pathToFileURL(PROTOTYPE_PATH).href}#scr=${screen}&vp=${prototypeViewport}&auth=member&data=ok`,
  );
  await page.evaluate(
    ({ screenId, viewportName }) => {
      const stage = document.querySelector('#stage');
      if (stage) stage.className = `stage vp-${viewportName}`;
      document.querySelectorAll('.screen').forEach((element) => {
        element.classList.toggle('on', element.id === `scr-${screenId}`);
      });
    },
    { screenId: screen, viewportName: prototypeViewport },
  );
  await page.addStyleTag({
    content:
      '.note,.ctrl,.controls,.topbar{display:none!important} body{background:#fff!important}',
  });
  const target = page.locator(`#scr-${screen}`);
  await expect(target).toBeVisible();
  await target.screenshot({
    path: path.join(outputRoot, screen, `proto-${viewport.name}.png`),
    animations: 'disabled',
  });
};

const requiredString = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
};

const buildScreens = () => {
  const roomId = requiredMemberId('E2E_SPRINT7_OWNER_ROOM_ID');
  const postId = requiredMemberId('E2E_SPRINT7_GATED_POST_ID');
  const searchQuery =
    process.env.E2E_SPRINT7_SEARCH_QUERY?.trim() || '데이터베이스';

  const screens = [
    { name: 'home', route: '/' },
    { name: 'search', route: `/search?q=${encodeURIComponent(searchQuery)}` },
    { name: 'comm', route: '/community' },
    { name: 'room', route: `/community/rooms/${roomId}` },
    { name: 'post', route: `/community/${postId}?roomId=${roomId}` },
    { name: 'write', route: '/community/write' },
    { name: 'saved', route: '/saved-posts' },
    // 공개 프로필 화면. 종전에는 검색 결과 화면을 열고 거기 있는 프로필 링크를
    // 눌러서 모달을 띄웠다. 그런데 검색 API 의 커뮤니티 결과에는 작성자 정보가
    // 없어서 결과 카드에 프로필 링크 자체가 안 붙는다(2026-08-25 실측). 링크를
    // 3분 기다리다 죽는 검사였다. 인앱 모달 경로는 public-profile.spec.ts 가
    // 이미 따로 검증하므로, 여기서는 공개 프로필 화면을 직접 열어 캡처한다.
    {
      name: 'profile',
      route: `/members/${requiredString('E2E_SPRINT7_PUBLIC_PROFILE_UUID')}`,
    },
    { name: 'my', route: '/my-page' },
    { name: 'noti', route: '/' },
  ] as const satisfies ReadonlyArray<{ name: ScreenName; route: string }>;
  const rawSelection = process.env.E2E_BUILD_COMPARE_SCREENS;
  if (rawSelection === undefined) {
    return { outputRoot: OUTPUT_ROOT, screens };
  }

  const requestedNames = rawSelection
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);
  if (requestedNames.length === 0) {
    throw new Error(
      'E2E_BUILD_COMPARE_SCREENS must select at least one screen',
    );
  }

  const knownNames = new Set(screens.map((screen) => screen.name));
  const unknownNames = requestedNames.filter(
    (name) => !knownNames.has(name as ScreenName),
  );
  if (unknownNames.length > 0) {
    throw new Error(
      `Unknown E2E_BUILD_COMPARE_SCREENS: ${unknownNames.join(', ')}`,
    );
  }

  const selectedNames = new Set(requestedNames);
  const selectedScreens = screens.filter((screen) =>
    selectedNames.has(screen.name),
  );
  const selectionSlug = selectedScreens.map((screen) => screen.name).join('--');

  return {
    outputRoot: path.join(OUTPUT_ROOT, 'partial', selectionSlug),
    screens: selectedScreens,
  };
};

/**
 * 방 이름을 dev 백엔드에서 읽어온다.
 *
 * 이 스펙은 방 화면 헤딩을 'QA B 방장 검증방' 이라는 글자로 단언하고 있었다.
 * 그 이름은 시드 데이터의 표시 이름이라 시드가 바뀌면 함께 바뀐다. 실제로
 * E2E_SPRINT7_OWNER_ROOM_ID 가 가리키는 방 이름이 '국비개발자 생존방' 으로
 * 바뀌어 있어 이 검사만 계속 실패했다(2026-08-25 실측). 화면이 아니라 스펙이
 * 낡은 것이다. 이름을 박지 말고 그 ID 의 현재 이름을 물어서 대조한다.
 */
const resolveRoomName = async (
  request: APIRequestContext,
  memberId: number,
  roomId: number,
): Promise<string> => {
  const token = await mintMemberToken(request, memberId);
  const response = await request.get(
    `${API_BASE_URL}/api/v1/community/rooms/${roomId}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  expect(response.status(), `fetch room ${roomId}`).toBe(200);
  const body = (await response.json()) as { content: { name: string } };
  expect(body.content.name, `room ${roomId} name`).toBeTruthy();
  return body.content.name;
};

/**
 * 글 제목도 방 이름과 같은 이유로 시드에서 읽어온다. 박아둔 제목이
 * E2E_SPRINT7_GATED_POST_ID 가 가리키는 글의 실제 제목과 어긋나 있었다
 * (2026-08-25 실측).
 */
const resolvePostTitle = async (
  request: APIRequestContext,
  memberId: number,
  postId: number,
): Promise<string> => {
  const token = await mintMemberToken(request, memberId);
  const response = await request.get(
    `${API_BASE_URL}/api/v1/community/posts/${postId}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  expect(response.status(), `fetch post ${postId}`).toBe(200);
  const body = (await response.json()) as { content: { title: string } };
  expect(body.content.title, `post ${postId} title`).toBeTruthy();
  return body.content.title;
};

/**
 * 홈 상단 배너는 피드를 다 불러온 뒤에 그려진다. dev 백엔드가 느릴 때(스위트를
 * 길게 돌린 뒤가 특히 그렇다) 5초 기본 대기로는 로딩 화면만 보고 죽는다
 * (2026-08-25 실측, 단독 실행은 통과하고 전체 실행에서만 실패했다). 로딩 문구가
 * 사라지는 것을 먼저 기다린 뒤 배너를 본다.
 */
const waitForHomeFeed = async (page: Page) => {
  await expect(page.getByText('오늘의 피드를 불러오는 중이에요.')).toBeHidden({
    timeout: 30_000,
  });
};

const assertScreenReady = async (
  page: Page,
  request: APIRequestContext,
  screen: ScreenName,
  roomName: string,
  postTitle: string,
) => {
  await expect(page).not.toHaveURL(/\/(?:login|sign-up|redirection)(?:\?|$)/);
  if (screen === 'home') {
    await waitForHomeFeed(page);
    await expect(
      page.getByRole('heading', { name: /혼자 막히지 않는/ }),
    ).toBeVisible({ timeout: 30_000 });
  } else if (screen === 'search') {
    await expect(page.getByTestId('search-result-card').first()).toBeVisible();
  } else if (screen === 'comm') {
    await expect(page.getByText('아직 정착하지 않은 방')).toBeVisible();
  } else if (screen === 'room') {
    await expect(page.getByRole('heading', { name: roomName })).toBeVisible();
  } else if (screen === 'post') {
    await expect(page.getByRole('heading', { name: postTitle })).toBeVisible();
  } else if (screen === 'write') {
    await expect(page.getByRole('heading', { name: '글 작성' })).toBeVisible();
    await expect(page.getByText('내 방을 불러오는 중이에요.')).toBeHidden();
    await expect(page.getByRole('button', { name: roomName })).toBeVisible();
  } else if (screen === 'saved') {
    await expect(
      page.getByRole('heading', { name: /저장한 글/ }),
    ).toBeVisible();
  } else if (screen === 'profile') {
    const profileUuid = requiredString('E2E_SPRINT7_PUBLIC_PROFILE_UUID');
    const profileResponse = await request.get(
      `${API_BASE_URL}/api/v1/members/${profileUuid}/public-profile`,
    );
    expect(profileResponse.status(), `public profile ${profileUuid}`).toBe(200);
    const profileBody = (await profileResponse.json()) as {
      content: { nickname: string };
    };
    await expect(
      page.getByText(profileBody.content.nickname).first(),
    ).toBeVisible();
    await expect(page.getByText('이 사람이 있는 방')).toBeVisible();
    await expect(page.getByText('최근에 쓴 글')).toBeVisible();
  } else if (screen === 'my') {
    await expect(page.getByRole('heading', { name: '프로필' })).toBeVisible();
  } else {
    await waitForHomeFeed(page);
    await expect(
      page.getByRole('heading', { name: /혼자 막히지 않는/ }),
    ).toBeVisible({ timeout: 30_000 });
    const notificationTrigger = page
      .getByRole('button', { name: /알림/ })
      .first();
    await expect(notificationTrigger).toBeEnabled();
    await notificationTrigger.click();
    await expect(page.getByText('알림', { exact: true })).toBeVisible();
    await expect(
      page.getByText('삭제된 글 알림', { exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: '알림 설정' })).toBeVisible();
    await expect(page.getByRole('link', { name: '전체 보기' })).toBeVisible();
  }
};

test.skip(missingSprint7Env().length > 0, sprint7EnvMissingReason());

test('승인 프로토타입과 구현 10화면을 두 뷰포트로 캡처한다', async ({
  page,
  request,
}) => {
  test.setTimeout(180_000);
  const { outputRoot, screens } = buildScreens();
  const manifest: Array<Record<string, unknown>> = [];
  const pageErrors: string[] = [];
  const defaultMemberId = requiredMemberId();
  const postTitle = await resolvePostTitle(
    request,
    requiredMemberId(),
    requiredMemberId('E2E_SPRINT7_GATED_POST_ID'),
  );
  const roomName = await resolveRoomName(
    request,
    requiredMemberId(),
    requiredMemberId('E2E_SPRINT7_OWNER_ROOM_ID'),
  );
  const writeMemberId = requiredMemberId('E2E_SPRINT7_OWNER_MEMBER_ID');
  let activeMemberId: number | undefined;
  page.on('pageerror', (error) => pageErrors.push(error.message));

  for (const screen of screens) {
    const screenMemberId =
      screen.name === 'write' ? writeMemberId : defaultMemberId;
    if (activeMemberId !== screenMemberId) {
      await setMemberSession(page, request, screenMemberId);
      activeMemberId = screenMemberId;
    }
    await mkdir(path.join(outputRoot, screen.name), { recursive: true });
    for (const viewport of viewports) {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
      await capturePrototype(page, screen.name, viewport, outputRoot);

      pageErrors.length = 0;
      const response = await page.goto(`${APP_ORIGIN}${screen.route}`, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });
      await page.waitForTimeout(1_000);
      expect(response?.status(), `${screen.name} HTTP status`).toBe(200);
      expect(new URL(page.url()).pathname).toBe(
        new URL(screen.route, APP_ORIGIN).pathname,
      );
      await assertScreenReady(page, request, screen.name, roomName, postTitle);
      expect(pageErrors, `${screen.name} page errors`).toEqual([]);
      await page.screenshot({
        path: path.join(outputRoot, screen.name, `impl-${viewport.name}.png`),
        animations: 'disabled',
        fullPage: false,
      });
      manifest.push({
        screen: screen.name,
        viewport: viewport.name,
        requestedRoute: screen.route,
        finalUrl: page.url(),
        httpStatus: response?.status() ?? null,
        title: await page.title(),
        bodyText: (await page.locator('body').innerText()).slice(0, 500),
      });
    }
  }

  await writeFile(
    path.join(outputRoot, 'capture-manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8',
  );
});

test.skip(!prototypeAvailable, prototypeMissingReason);
