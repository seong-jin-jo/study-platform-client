import { expect, type Page, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const MOBILE_WIDTHS = [360, 390, 412, 600, 700, 780, 820, 900, 1000] as const;
const DESKTOP_WIDTHS = [1024, 1280] as const;
const ROUTES = ['/', '/insights', '/community', '/class'] as const;

// 본문 문장 안의 링크만 줄높이를 누름 영역으로 인정한다. 카드·탭·CTA는
// 이 예외에 들어오지 않도록 article의 p/li 직계 문맥으로 한정한다.
const INLINE_TOUCH_TARGET_EXCEPTIONS = [
  'main article p > a[href]',
  'main article li > a[href]',
] as const;

type FontHistogram = Record<string, number>;
interface DesktopBaseline {
  baseSha: string;
  histograms: Record<string, Record<string, FontHistogram>>;
}

const desktopBaseline = JSON.parse(
  readFileSync(
    path.join(
      process.cwd(),
      'e2e/fixtures/mobile-typography-desktop-baseline.json',
    ),
    'utf8',
  ),
) as DesktopBaseline;

async function waitForFixtureData(page: Page, route: (typeof ROUTES)[number]) {
  await expect(page.getByTestId('route-error')).toHaveCount(0);
  await expect(page.getByText('불러오지 못했어요')).toHaveCount(0);

  if (route === '/') {
    await expect
      .poll(() => page.locator('[data-testid="home-feed-card"]').count())
      .toBeGreaterThanOrEqual(3);
    const card = page.locator('[data-testid="home-feed-card"]').first();
    const positions = await card.evaluate((element) => {
      const title = element.querySelector('a.font-designer-16b');
      const preview = element.querySelector('p.font-designer-13m');
      if (!title || !preview) return null;
      const titleBox = title.getBoundingClientRect();
      const previewBox = preview.getBoundingClientRect();
      return { titleBottom: titleBox.bottom, previewTop: previewBox.top };
    });
    expect(
      positions,
      '홈 피드 카드 제목·미리보기 요소가 있어야 한다',
    ).not.toBeNull();
    expect(
      positions?.previewTop ?? 0,
      `홈 피드 카드 제목 아래에 미리보기가 세로로 쌓여야 한다: ${JSON.stringify(positions)}`,
    ).toBeGreaterThanOrEqual(positions?.titleBottom ?? 1);
    await expect(page.getByTestId('route-error')).toHaveCount(0);
    return;
  }

  if (route === '/insights') {
    await expect
      .poll(() => page.locator('button[data-testid^="island-"]').count())
      .toBeGreaterThanOrEqual(3);
    await expect(page.locator('#today-koan-title')).toBeVisible();
    await expect(page.getByTestId('route-error')).toHaveCount(0);
    return;
  }

  if (route === '/community') {
    await expect
      .poll(() => page.locator('[data-testid="community-room-card"]').count())
      .toBeGreaterThanOrEqual(3);
    await expect(page.getByTestId('route-error')).toHaveCount(0);
    return;
  }

  await expect
    .poll(() => page.locator('[data-testid="mobile-class-card"]').count())
    .toBeGreaterThanOrEqual(3);
  await expect(page.getByTestId('route-error')).toHaveCount(0);
}

async function collectFontHistogram(page: Page): Promise<FontHistogram> {
  return page.evaluate(() => {
    const main = document.querySelector('main');
    if (!main) throw new Error('main 요소 없음');

    const histogram: Record<string, number> = {};
    for (const element of main.querySelectorAll<HTMLElement>('*')) {
      if (element.getClientRects().length === 0) continue;
      const hasDirectText = [...element.childNodes].some(
        (node) =>
          node.nodeType === Node.TEXT_NODE &&
          (node.textContent?.trim().length ?? 0) > 0,
      );
      if (!hasDirectText) continue;
      const size = Number.parseFloat(
        getComputedStyle(element).fontSize,
      ).toFixed(2);
      histogram[size] = (histogram[size] ?? 0) + 1;
    }
    return histogram;
  });
}

async function collectMobileMetrics(page: Page) {
  return page.evaluate((inlineExceptions) => {
    const isVisible = (element: Element) =>
      element.getClientRects().length > 0 && !element.closest('.sr-only');
    const elementSelector = (element: Element) => {
      const testId = element.getAttribute('data-testid');
      if (testId) {
        return `${element.tagName.toLowerCase()}[data-testid="${testId}"]`;
      }
      const id = element.id ? `#${CSS.escape(element.id)}` : '';
      const classes = [...element.classList]
        .slice(0, 2)
        .map((name) => `.${CSS.escape(name)}`)
        .join('');
      return `${element.tagName.toLowerCase()}${id}${classes}`;
    };
    const main = document.querySelector('main');
    if (!main) throw new Error('main 요소 없음');

    const textNodes = [...main.querySelectorAll<HTMLElement>('*')]
      .filter(isVisible)
      .filter((element) =>
        [...element.childNodes].some(
          (node) =>
            node.nodeType === Node.TEXT_NODE &&
            (node.textContent?.trim().length ?? 0) > 0,
        ),
      )
      .map((element) => ({
        selector: elementSelector(element),
        size: Number.parseFloat(getComputedStyle(element).fontSize),
        text: element.innerText.trim().slice(0, 36),
      }));
    const sizes = textNodes.map(({ size }) => size).sort((a, b) => a - b);
    const middle = Math.floor(sizes.length / 2);
    const median = sizes.length
      ? sizes.length % 2
        ? sizes[middle]
        : (sizes[middle - 1] + sizes[middle]) / 2
      : 0;

    const touchTargets = [
      ...document.querySelectorAll<HTMLElement>(
        'header a,header button,header [role="button"],header input,' +
          '[data-testid="mobile-tab-bar"] a,[data-testid="mobile-tab-bar"] button,' +
          'main a,main button,main [role="button"],main input',
      ),
    ]
      .filter(isVisible)
      .filter(
        (element) =>
          !inlineExceptions.some((selector) => element.matches(selector)),
      );

    const activeSelectors: string[] = [];
    const walkRules = (rules: CSSRuleList) => {
      for (const rule of rules) {
        if ('selectorText' in rule && typeof rule.selectorText === 'string') {
          activeSelectors.push(
            ...rule.selectorText
              .split(',')
              .filter((candidate) => candidate.includes(':active'))
              .map((candidate) => candidate.replaceAll(':active', '').trim()),
          );
        }
        const groupedRule = rule as CSSRule & { cssRules?: CSSRuleList };
        if (groupedRule.cssRules) walkRules(groupedRule.cssRules);
      }
    };
    for (const sheet of document.styleSheets) {
      try {
        walkRules(sheet.cssRules);
      } catch {
        // 외부 교차 출처 스타일시트는 눌림 상태 커버리지에서 제외한다.
      }
    }
    const hasActiveFeedback = (element: HTMLElement) =>
      activeSelectors.some((selector) => {
        try {
          return element.matches(selector);
        } catch {
          return false;
        }
      });

    const smallText = textNodes.filter(({ size }) => size < 13);
    const textBelowBodyMinimum = textNodes
      .filter(({ size }) => size < 16)
      .slice(0, 20);
    const shortTargets = touchTargets
      .map((element) => {
        const box = element.getBoundingClientRect();
        return {
          selector: elementSelector(element),
          width: box.width,
          height: box.height,
          text: element.innerText.trim().slice(0, 36),
        };
      })
      .filter(({ width, height }) => width < 43.5 || height < 43.5);
    const withoutActive = touchTargets
      .filter((element) => !hasActiveFeedback(element))
      .map((element) => ({
        selector: elementSelector(element),
        text: element.innerText.trim().slice(0, 36),
      }));

    return {
      smallText,
      textBelowBodyMinimum,
      median,
      shortTargets,
      withoutActive,
      activeRatio: touchTargets.length
        ? (touchTargets.length - withoutActive.length) / touchTargets.length
        : 1,
      overflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    };
  }, INLINE_TOUCH_TARGET_EXCEPTIONS);
}

test.describe('WEB-TYPOGRAPHY-001 1023px 이하 가독성과 누름 영역', () => {
  test.use({ hasTouch: true, isMobile: true, locale: 'ko-KR' });

  for (const width of MOBILE_WIDTHS) {
    for (const route of ROUTES) {
      test(`${width}px ${route} 데이터·글자·누름·눌림 상태 계약`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(route, { waitUntil: 'domcontentloaded' });
        await waitForFixtureData(page, route);

        const metrics = await collectMobileMetrics(page);
        expect(
          metrics.smallText,
          `${width}px ${route} 13px 미만 글자: ${JSON.stringify(metrics.smallText)}`,
        ).toEqual([]);
        expect(
          metrics.median,
          `${width}px ${route} 글자 중앙값 ${metrics.median}px, 16px 미만: ${JSON.stringify(metrics.textBelowBodyMinimum)}`,
        ).toBeGreaterThanOrEqual(16);
        expect(
          metrics.shortTargets,
          `${width}px ${route} 44px 미만 누름 대상: ${JSON.stringify(metrics.shortTargets)}`,
        ).toEqual([]);
        expect(
          metrics.activeRatio,
          `${width}px ${route} 눌림 상태 미적용: ${JSON.stringify(metrics.withoutActive)}`,
        ).toBeGreaterThanOrEqual(0.9);
        expect(
          metrics.overflow,
          `${width}px ${route} 가로 넘침 ${metrics.overflow}px`,
        ).toBeLessThanOrEqual(1);
      });
    }
  }
});

test.describe('WEB-TYPOGRAPHY-002 데스크톱 글자 분포 회귀', () => {
  test.use({ hasTouch: false, isMobile: false, locale: 'ko-KR' });

  for (const width of DESKTOP_WIDTHS) {
    for (const route of ROUTES) {
      test(`${width}px ${route} 기준 커밋 ${desktopBaseline.baseSha.slice(0, 8)} 대비 회귀 없음`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(route, { waitUntil: 'domcontentloaded' });
        await waitForFixtureData(page, route);

        const histogram = await collectFontHistogram(page);
        expect(
          histogram,
          `${width}px ${route} 글자 크기 히스토그램이 기준 커밋과 달라졌다`,
        ).toEqual(desktopBaseline.histograms[String(width)][route]);
      });
    }
  }
});
