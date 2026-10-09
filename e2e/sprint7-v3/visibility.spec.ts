/**
 * SPRINT7 V3 가시성(색 대비) 회귀 검증.
 *
 * 실제 사고: 홈 피드 인사이트 카드가 `bg-linear-to-br from-gray-900 to-gray-800`
 * 그라디언트 + `text-white` 조합인데, 그라디언트 클래스가 빠지면 카드
 * 배경이 투명해져 부모(흰 페이지 배경)가 그대로 비치고 흰 글씨와 겹쳐
 * "흰 바탕에 흰 글씨"가 된다. 브라우저 실측:
 *   backgroundColor: rgba(0, 0, 0, 0)  (투명)
 *   color:           rgb(255, 255, 255) (흰색)
 * 그런데도 기존 E2E 34건은 "텍스트가 DOM에 존재하는지"만 봤기 때문에
 * 전부 통과했다. 이 파일은 존재가 아니라 "실제로 보이는지"(대비)를 검증한다.
 *
 * 기준: WCAG 2.2 SC 1.4.3 Contrast (Minimum).
 * - 일반 텍스트: 4.5:1 이상
 * - 큰 텍스트(24px 이상, 또는 18.66px 이상 + bold(700+)): 3:1 이상
 * - 대비 계산식: ratio = (L1 + 0.05) / (L2 + 0.05), L = relative luminance
 *   (WCAG 2.2 Techniques G18, https://www.w3.org/WAI/WCAG22/Techniques/general/G18)
 *
 * 담당 테스트 케이스: S7-VIS-01, S7-VIS-02, S7-VIS-03
 */
// biome-ignore assist/source/organizeImports: repository ESLint import/order is authoritative.
import {
  type APIRequestContext,
  expect,
  type Locator,
  type Page,
  test,
} from '@playwright/test';

import {
  missingSprint7Env,
  sprint7EnvMissingReason,
} from '../support/sprint7-v3';

test.skip(missingSprint7Env().length > 0, sprint7EnvMissingReason());

const FRONTEND_ORIGIN =
  process.env.E2E_BASE_URL ?? 'https://test.zeroone.it.kr';
const API_ORIGIN =
  process.env.E2E_API_BASE_URL ?? 'https://test-api.zeroone.it.kr';

test.use({ storageState: { cookies: [], origins: [] } });

interface ApiEnvelope<T> {
  content: T;
}

type JsonRecord = Record<string, unknown>;

function requiredMemberId(): number {
  const value = Number(process.env.E2E_SPRINT7_MEMBER_ID?.trim());
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(
      'E2E_SPRINT7_MEMBER_ID is required and must be a positive integer',
    );
  }
  return value;
}

function bearer(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

async function mintMemberToken(
  request: APIRequestContext,
  memberId = requiredMemberId(),
): Promise<string> {
  const configured = process.env.E2E_SPRINT7_MEMBER_TOKEN?.trim();
  if (configured && memberId === requiredMemberId()) return configured;

  const response = await request.get(
    `${API_ORIGIN}/api/v1/tokens/token?member-id=${memberId}&role-id=ROLE_MEMBER`,
  );
  expect(response.status(), `QA token mint failed for member ${memberId}`).toBe(
    200,
  );
  const body = (await response.json()) as ApiEnvelope<{ accessToken: string }>;
  expect(body.content.accessToken).toBeTruthy();
  return body.content.accessToken;
}

async function authenticatePage(
  page: Page,
  request: APIRequestContext,
): Promise<string> {
  const token = await mintMemberToken(request);
  const target = new URL(FRONTEND_ORIGIN);
  await page.context().addCookies([
    {
      name: 'accessToken',
      value: token,
      domain: target.hostname,
      path: '/',
      httpOnly: false,
      secure: target.protocol === 'https:',
      sameSite: 'Lax',
    },
  ]);
  return token;
}

function unwrapContent(value: unknown): JsonRecord {
  expect(value).toBeTruthy();
  expect(typeof value).toBe('object');
  const content = (value as JsonRecord).content;
  expect(content).toBeTruthy();
  expect(typeof content).toBe('object');
  return content as JsonRecord;
}

interface NormalizedColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

interface ContrastProbeResult {
  textColor: NormalizedColor;
  solidBg: NormalizedColor;
  usedDefaultWhite: boolean;
  bgImageRaw: string | null;
  gradientColors: NormalizedColor[];
  overlayColor?: NormalizedColor;
  fontSizePx: number;
  fontWeight: number;
  ancestorTrail: string;
  text: string;
}

/**
 * 대상 요소의 글자색과 "실제로 칠해진" 배경색을 브라우저에서 계산해 WCAG 대비를
 * 구하고, 기준 미만이면 실패시킨다.
 *
 * - 배경이 투명하면 조상을 거슬러 올라가 최초로 발견되는 불투명 배경을 쓴다.
 *   끝까지 못 찾으면 "기본 흰 페이지 배경"으로 폴백한다 (이번 결함이 정확히
 *   이 경로 — 카드 배경이 투명해 흰 페이지가 비쳤다).
 * - 배경에 backgroundImage(그라디언트 등)가 있으면 그 안의 모든 색상 정지점을
 *   파싱해 텍스트와의 최소 대비로 판정한다. 그라디언트가 통째로 사라지면
 *   gradientColors가 비어 solid 배경 경로로 빠지고, 위 white 폴백에 걸려
 *   실패한다.
 */
async function assertVisibleContrast(
  locator: Locator,
  label: string,
): Promise<void> {
  // 요소가 실제로 attach + visible(0 크기 아님, display:none/visibility:hidden
  // 아님) 상태가 아니면 여기서 타임아웃/실패한다 — 화면 밖·미렌더 요소가
  // 조용히 통과하는 것을 막는다.
  await expect(
    locator,
    `${label} 요소가 화면에 렌더링돼 보여야 한다`,
  ).toBeVisible();

  const result = (await locator.evaluate((el) => {
    function normalizeColor(
      value: string,
    ): { r: number; g: number; b: number; a: number } | null {
      const ctx = document.createElement('canvas').getContext('2d');
      if (!ctx) return null;
      const sentinel = '#010203';
      ctx.fillStyle = sentinel;
      try {
        ctx.fillStyle = value;
      } catch {
        return null;
      }
      const normalized = ctx.fillStyle;
      if (normalized === sentinel && value.trim() !== sentinel) return null;
      const hexMatch = normalized.match(/^#([0-9a-f]{6})$/i);
      if (hexMatch) {
        const n = parseInt(hexMatch[1], 16);
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 };
      }
      const rgbaMatch = normalized.match(
        /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i,
      );
      if (rgbaMatch) {
        return {
          r: Number(rgbaMatch[1]),
          g: Number(rgbaMatch[2]),
          b: Number(rgbaMatch[3]),
          a: rgbaMatch[4] === undefined ? 1 : Number(rgbaMatch[4]),
        };
      }

      ctx.clearRect(0, 0, 1, 1);
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b, alpha] = ctx.getImageData(0, 0, 1, 1).data;
      return { r, g, b, a: alpha / 255 };
    }

    function extractGradientColors(image: string) {
      const matches = image.match(
        /(?:rgb|rgba|hsl|hsla|oklch|oklab|lab|lch|color)\([^()]*(?:\([^()]*\)[^()]*)*\)|#[0-9a-fA-F]{3,8}\b/g,
      );
      if (!matches) return [];
      return matches
        .map((m) => normalizeColor(m))
        .filter(
          (c): c is { r: number; g: number; b: number; a: number } =>
            !!c && c.a > 0.05,
        );
    }

    let node: Element | null = el;
    let bgImageRaw: string | null = null;
    let overlayColor:
      | { r: number; g: number; b: number; a: number }
      | undefined;
    const trail: string[] = [];
    let solidBg: { r: number; g: number; b: number; a: number } | null = null;

    while (node) {
      const style = getComputedStyle(node);
      const cls =
        node instanceof HTMLElement && node.className
          ? `.${String(node.className).trim().split(/\s+/).slice(0, 2).join('.')}`
          : '';
      trail.push(`${node.tagName.toLowerCase()}${cls}`);

      if (
        !bgImageRaw &&
        style.backgroundImage &&
        style.backgroundImage !== 'none'
      ) {
        bgImageRaw = style.backgroundImage;

        const targetRect = el.getBoundingClientRect();
        const targetCenter = {
          x: targetRect.left + targetRect.width / 2,
          y: targetRect.top + targetRect.height / 2,
        };
        for (const child of Array.from(node.children)) {
          const childStyle = getComputedStyle(child);
          const childBg = normalizeColor(childStyle.backgroundColor);
          const childRect = child.getBoundingClientRect();
          const coversTarget =
            childRect.left <= targetCenter.x &&
            childRect.right >= targetCenter.x &&
            childRect.top <= targetCenter.y &&
            childRect.bottom >= targetCenter.y;
          if (
            childStyle.position === 'absolute' &&
            childBg &&
            childBg.a > 0.01 &&
            coversTarget
          ) {
            overlayColor = childBg;
            break;
          }
        }
      }

      const parsedBg = normalizeColor(style.backgroundColor);
      if (parsedBg && parsedBg.a > 0.01) {
        solidBg = parsedBg;
        break;
      }
      node = node.parentElement;
    }

    const usedDefaultWhite = !solidBg;
    if (!solidBg) {
      solidBg = { r: 255, g: 255, b: 255, a: 1 };
      trail.push('(default page background: white)');
    }

    const elStyle = getComputedStyle(el);
    const textColor = normalizeColor(elStyle.color) ?? {
      r: 0,
      g: 0,
      b: 0,
      a: 1,
    };
    const fontSizePx = parseFloat(elStyle.fontSize);
    const fontWeight = parseInt(elStyle.fontWeight, 10) || 400;

    const gradientColors = bgImageRaw ? extractGradientColors(bgImageRaw) : [];

    return {
      textColor,
      solidBg,
      usedDefaultWhite,
      bgImageRaw,
      gradientColors,
      overlayColor,
      fontSizePx,
      fontWeight,
      ancestorTrail: trail.join(' < '),
      text: el.textContent?.trim().slice(0, 60) ?? '',
    };
  })) as ContrastProbeResult;

  function relativeLuminance(c: { r: number; g: number; b: number }): number {
    const [rs, gs, bs] = [c.r, c.g, c.b].map((channel) => {
      const s = channel / 255;
      return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  }

  function ratio(
    a: { r: number; g: number; b: number },
    b: { r: number; g: number; b: number },
  ): number {
    const la = relativeLuminance(a);
    const lb = relativeLuminance(b);
    const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
    return (hi + 0.05) / (lo + 0.05);
  }

  // WCAG 2.2 SC 1.4.3: 일반 텍스트 4.5:1 / 큰 텍스트(>=24px, 또는 >=18.66px+bold) 3:1
  const isLargeText =
    result.fontSizePx >= 24 ||
    (result.fontSizePx >= 18.66 && result.fontWeight >= 700);
  const minRatio = isLargeText ? 3 : 4.5;

  const describe = (c: NormalizedColor) =>
    `rgb(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)})`;

  const composite = (
    foreground: NormalizedColor,
    background: NormalizedColor,
  ): NormalizedColor => ({
    r: foreground.r * foreground.a + background.r * (1 - foreground.a),
    g: foreground.g * foreground.a + background.g * (1 - foreground.a),
    b: foreground.b * foreground.a + background.b * (1 - foreground.a),
    a: foreground.a + background.a * (1 - foreground.a),
  });

  if (result.gradientColors.length > 0) {
    // 그라디언트 배경: 모든 색상 정지점 대비 최솟값이 기준을 넘어야 한다.
    const renderedStops = result.overlayColor
      ? result.gradientColors.map((stop) =>
          composite(result.overlayColor as NormalizedColor, stop),
        )
      : result.gradientColors;
    const ratios = renderedStops.map((stop) =>
      ratio(composite(result.textColor, stop), stop),
    );
    const worst = Math.min(...ratios);
    expect(
      worst,
      [
        `${label}: 그라디언트 배경의 대비가 부족하다.`,
        `글자색 ${describe(result.textColor)} / 그라디언트 정지점 최저대비 ${worst.toFixed(2)}:1 (기준 ${minRatio}:1)`,
        `backgroundImage: ${result.bgImageRaw}`,
        `overlay: ${result.overlayColor ? describe(result.overlayColor) + ` / alpha ${result.overlayColor.a}` : 'none'}`,
        `요소 텍스트: "${result.text}"`,
      ].join('\n'),
    ).toBeGreaterThanOrEqual(minRatio);
    return;
  }

  // 그라디언트가 없는 경로. usedDefaultWhite=true는 조상 전체가 투명해 기본
  // 흰 배경으로 폴백했다는 뜻 — 그라디언트 클래스가 통째로 빠졌을 때 정확히
  // 이 경로를 타므로, 흰 글씨라면 여기서 반드시 실패해야 한다.
  const contrast = ratio(
    composite(result.textColor, result.solidBg),
    result.solidBg,
  );
  expect(
    contrast,
    [
      `${label}: 대비가 기준 미만이다.`,
      `글자색 ${describe(result.textColor)} / 실제 배경색 ${describe(result.solidBg)} (${
        result.usedDefaultWhite
          ? '조상 전체 투명 → 기본 흰 배경으로 폴백'
          : '조상에서 발견'
      })`,
      `대비 ${contrast.toFixed(2)}:1 (기준 ${minRatio}:1, 폰트 ${result.fontSizePx}px/${result.fontWeight})`,
      `배경 탐색 경로: ${result.ancestorTrail}`,
      `요소 텍스트: "${result.text}"`,
    ].join('\n'),
  ).toBeGreaterThanOrEqual(minRatio);
}

test.describe('Sprint 7 V3 가시성(색 대비) 회귀', () => {
  test('홈 피드 인사이트 카드 제목이 실제로 보인다 (S7-VIS-01)', async ({
    page,
    request,
  }) => {
    const token = await authenticatePage(page, request);
    const hotFeedResponse = await request.get(
      `${API_ORIGIN}/api/v1/home/feed`,
      {
        headers: bearer(token),
        params: { sort: 'HOT', size: 20 },
      },
    );
    expect(hotFeedResponse.status()).toBe(200);
    const hotFeed = unwrapContent(await hotFeedResponse.json());
    const discoveryFeed = hotFeed.discoveryFeed as JsonRecord;
    const items = discoveryFeed.items as JsonRecord[];
    const insightItem = items.find((item) => item.type === 'INSIGHT_ARTICLE');
    expect(
      insightItem,
      'HOT feed must include at least one insight article to verify against',
    ).toBeTruthy();
    const insightTitle = String(insightItem?.title);

    const sortedFeedResponse = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return (
        url.pathname === '/api/v1/home/feed' &&
        url.searchParams.get('sort') === 'HOT' &&
        response.request().method() === 'GET'
      );
    });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: '많이 도움된 글' }).click();
    expect((await sortedFeedResponse).status()).toBe(200);

    // 인사이트 카드 제목 링크는 프로덕션 코드에서
    // `bg-linear-to-br from-gray-900 to-gray-800 ... text-white`(article) 위
    // `line-clamp-2` 클래스로 렌더된다. 이 그라디언트가 빠지면 이번 사고와
    // 동일하게 흰 배경에 흰 글씨가 된다.
    const insightTitleLocator = page
      .locator('a.line-clamp-2', { hasText: insightTitle })
      .first();
    await assertVisibleContrast(
      insightTitleLocator,
      `홈 피드 인사이트 카드 제목("${insightTitle}")`,
    );
  });

  test('회장 호평 3종 문구가 실제로 보인다 (S7-VIS-02)', async ({
    page,
    request,
  }) => {
    const token = await authenticatePage(page, request);
    const hotFeedResponse = await request.get(
      `${API_ORIGIN}/api/v1/home/feed`,
      {
        headers: bearer(token),
        params: { sort: 'HOT', size: 20 },
      },
    );
    expect(hotFeedResponse.status()).toBe(200);
    const hotFeed = unwrapContent(await hotFeedResponse.json());
    const discoveryFeed = hotFeed.discoveryFeed as JsonRecord;
    const hotItems = discoveryFeed.items as JsonRecord[];
    const answeredPost = hotItems.find((item) => {
      const stats = item.stats as JsonRecord | undefined;
      return item.type === 'COMMUNITY_POST' && Number(stats?.commentCount) > 0;
    });
    expect(
      answeredPost,
      'HOT feed must include a community post with an actual answer',
    ).toBeTruthy();
    const answeredPostTitle = String(answeredPost?.title);

    const sortedFeedResponse = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return (
        url.pathname === '/api/v1/home/feed' &&
        url.searchParams.get('sort') === 'HOT' &&
        response.request().method() === 'GET'
      );
    });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: '많이 도움된 글' }).click();
    expect((await sortedFeedResponse).status()).toBe(200);

    const answeredPostCard = page
      .getByTestId('home-feed-card')
      .filter({ hasText: answeredPostTitle })
      .first();

    await assertVisibleContrast(
      answeredPostCard.getByText('답변 달리는 중'),
      `"${answeredPostTitle}" 카드의 "답변 달리는 중" 배지`,
    );
    await assertVisibleContrast(
      answeredPostCard.locator('b', { hasText: /명이 다녀갔어요/ }).first(),
      `"${answeredPostTitle}" 카드의 "N명이 다녀갔어요" 문구`,
    );
    await assertVisibleContrast(
      answeredPostCard
        .locator('p', { hasText: '최근 같은 방 멤버가 답을 보고 있어요' })
        .first(),
      `"${answeredPostTitle}" 카드의 "최근 같은 방 멤버가 답을 보고 있어요" 문구`,
    );
  });

  test('스트릭 화면의 흰 글씨 영역이 실제로 보인다 (S7-VIS-03)', async ({
    page,
    request,
  }) => {
    await authenticatePage(page, request);
    await page.goto('/streak', { waitUntil: 'domcontentloaded' });

    // 스트릭 히어로 섹션은 코드상 `bg-linear-to-br from-orange-500 to-rose-500`
    // (또는 스트릭 0일 때 `from-gray-800 to-gray-700`) 그라디언트 위에
    // `text-white`로 렌더된다 — 인사이트 카드와 동일한 결함 패턴.
    const heroSection = page
      .locator('section', { hasText: '일 연속 학습' })
      .first();
    await expect(
      heroSection,
      '스트릭 히어로 섹션이 렌더돼야 한다',
    ).toBeVisible();

    await assertVisibleContrast(
      heroSection.locator('strong').first(),
      '스트릭 히어로의 연속일수 숫자',
    );
    await assertVisibleContrast(
      heroSection.getByText(/일 연속 학습/).first(),
      '스트릭 히어로의 "N일 연속 학습" 라벨',
    );
    await assertVisibleContrast(
      heroSection.locator('p').first(),
      '스트릭 히어로의 안내 문구(greet)',
    );
  });
});
