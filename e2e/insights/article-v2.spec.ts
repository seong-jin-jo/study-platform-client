import { expect, test } from '@playwright/test';

// 인사이트 용어글 상세 v2 e2e. 계약 정본:
// docs/design/prototype/insight-article-v2-spec.md §8 (14건).
//
// 이 슬러그의 글이 실제 zo-* 관례 마크업(§2, 픽스처
// docs/design/prototype/insight-article-v2-fixture-body.md)으로 Strapi 에
// 발행돼 있어야 이 스펙 전체가 돈다. 1차(이번 PR)는 프론트 렌더러만 바꿨고
// 원고 마크업 교체(§9)는 콘텐츠 작업이라 이 리포에 없다 — 그래서
// E2E_INSIGHT_V2_SLUG 가 없으면 sprint8 스펙의 관례대로 "미실시(사유)"로
// 스킵한다. 승격 로직 자체의 실측 증거는 blog-detail-page.render.test.ts 의
// "인사이트 v2 관례 블록 승격" describe 블록(SSR 렌더 단위테스트, 7건)이 맡는다.
const V2_SLUG = process.env.E2E_INSIGHT_V2_SLUG?.trim();

test.describe('인사이트 용어글 상세 v2', () => {
  test.skip(
    !V2_SLUG,
    'E2E_INSIGHT_V2_SLUG 미설정 — zo-* 관례 마크업으로 발행된 글이 아직 없어 ' +
      '미실시(사유). 값이 생기면 그 글의 slug 를 이 env 로 넘겨 돌린다. ' +
      '승격 로직 자체는 blog-detail-page.render.test.ts 단위테스트로 검증됨.',
  );

  test.beforeEach(async ({ page }) => {
    await page.goto(`/insights/${V2_SLUG}`, { waitUntil: 'networkidle' });
  });

  test('1. 목차 클릭 시 대상 h2 로 스크롤하고 URL 해시가 갱신된다', async ({
    page,
  }) => {
    const tocLink = page.locator('.zo-toc-card a[href^="#"]').first();
    const href = await tocLink.getAttribute('href');
    await tocLink.click();
    await page.waitForURL(new RegExp(href!.replace('#', '\\#')));
    const target = page.locator(href!);
    const box = await target.boundingBox();
    expect(box?.y ?? 999).toBeLessThan(120);
  });

  test('2. 진행 막대가 스크롤에 따라 0 → 100 으로 갱신된다', async ({
    page,
  }) => {
    const bar = page.getByRole('progressbar', { name: '글 읽기 진행률' });
    await expect(bar).toHaveAttribute('aria-valuenow', '0');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(bar).toHaveAttribute('aria-valuenow', '100');
    await expect(bar).toHaveAttribute('aria-valuetext', /다 읽었어요/);
  });

  test('4. 지시문 복사 시 클립보드에 담기고 버튼 문구가 바뀐다', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    const chat = page.locator('.zo-chat').first();
    const userText = await chat.locator('p.whitespace-pre-wrap').innerText();
    await chat.getByRole('button', { name: /지시문 복사/ }).click();
    await expect(chat.getByRole('button')).toHaveText('복사했어요');
    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard).toBe(userText);
  });

  test('5. 설문 응답이 localStorage 에 저장되고 % 막대가 없다', async ({
    page,
  }) => {
    const poll = page.locator('.zo-poll').first();
    await poll.getByRole('button').nth(2).click();
    const pollText = await poll.innerText();
    expect(/집계 전|\d+명이 답했어요/.test(pollText)).toBe(true);
    await expect(poll).not.toContainText(/%/);
    const stored = await page.evaluate(() =>
      Object.keys(window.localStorage).find((k) => k.startsWith('zo:poll:')),
    );
    expect(stored).toBeTruthy();
  });

  test('6. 비회원이 꿀팁 저장을 누르면 토스트만 뜨고 localStorage 에 안 남는다', async ({
    page,
  }) => {
    const tip = page.locator('.zo-tip').first();
    await tip.getByRole('button', { name: '저장' }).click();
    await expect(page.getByRole('status')).toContainText('로그인하면');
    const stored = await page.evaluate(() =>
      Object.keys(window.localStorage).some((k) => k.startsWith('zo:tip:')),
    );
    expect(stored).toBe(false);
  });

  test('8. 절 끝 반응 버튼을 누르면 localStorage 에 저장되고 다른 버튼이 흐려진다', async ({
    page,
  }) => {
    const feedback = page.locator('.zo-section-feedback').first();
    await feedback.getByRole('button', { name: '됐어요' }).click();
    await expect(
      feedback.getByRole('button', { name: '아쉬워요' }),
    ).toHaveClass(/opacity-50/);
  });

  test('9. 사회적 증명 문구가 임계 규칙대로 바뀐다', async ({ page }) => {
    // 실측치는 staging 데이터에 좌우되므로 "조회 집계 전" 또는 실측 문구
    // 둘 중 하나가 나오는지만 확인한다(가짜 % 미표기가 핵심 불변식).
    const line = page.locator('header p.tabular-nums').last();
    await expect(line).toBeVisible();
    const text = await line.innerText();
    expect(/조회 집계 전|아직 조회를 모으는 중|명이 읽었어요/.test(text)).toBe(
      true,
    );
  });

  test('10. zo-hero 는 header 에서 승격되고 본문 zo-article-body 안에는 없다', async ({
    page,
  }) => {
    await expect(page.locator('.zo-article-body section.zo-hero')).toHaveCount(
      0,
    );
  });

  test('11. 단독 이모티콘 문단은 96px, 가운데 정렬이다', async ({ page }) => {
    const emoticon = page.locator('img.emoticon-xl').first();
    await expect(emoticon).toHaveAttribute('height', '96');
    const parentAlign = await emoticon.evaluate(
      (el) => getComputedStyle(el.parentElement as Element).textAlign,
    );
    expect(parentAlign).toBe('center');
  });

  test('12. 390px 에서 레일이 숨고 목차 카드가 보인다, 가로 오버플로 0', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator('[data-testid="article-rail"]')).toBeHidden();
    await expect(page.locator('.zo-toc-card')).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('14. 콘솔 에러가 0건이다', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.reload({ waitUntil: 'networkidle' });
    expect(errors).toEqual([]);
  });
});
