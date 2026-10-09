import { expect, test } from '@playwright/test';
import {
  fixtureApiReachable,
  fixtureMissingReason,
} from '../support/fixture-api';

// 이 파일은 처음부터 **픽스처 서버 데이터셋**을 전제로 쓰였다.
// `/insights/land/dep`, `article-dep-article-1`, `/community/rooms/8`,
// `/insights/koans/1`, `127.0.0.1:3212/uploads/cover.png` 는 전부 그 서버의
// 테스트 픽스처이지 dev 의 데이터가 아니다. 그래서 dev 를 향해 돌리면
// 섬 개수·방 연결·본문 제목이 전부 어긋나고, 그 어긋남은 제품 결함이 아니라
// **전제가 다른 것**이다(2026-08-21 실측: dev 지도 API 는 섬 20곳,
// 공부방에 연결된 섬은 database 하나뿐, 방 8 은 어느 섬에도 안 붙어 있다).
//
// 계약을 추측해 기대값을 dev 에 맞추면 이 스펙이 원래 지키려던 것(테스트 픽스처
// 위에서의 정확한 렌더 대조)이 사라진다. 그래서 같은 저장소가 이미 쓰고 있는
// 규격을 따른다 — 픽스처 서버가 없으면 **그 사실을 밝히고 건너뛴다.**
// 통과로 올리지 않는다.
let fixtureReady = false;
test.beforeAll(async () => {
  fixtureReady = await fixtureApiReachable();
});

test.describe('SPRINT8 인사이트 프론트 렌더', () => {
  test.beforeEach(() => {
    test.skip(!fixtureReady, fixtureMissingReason);
  });

  test('바다·섬·화두 목록·화두 상세가 실제 라우트에서 렌더된다', async ({
    page,
  }) => {
    await page.goto('/insights');
    await expect(page.getByTestId('insight-worldmap')).toBeVisible();
    await expect(page.getByText('오늘의 화두')).toBeVisible();
    // 시작 섬(OCEAN) 8곳만 버튼으로 그린다. 화면이 스스로 "시작 섬 8개" 라고
    // 밝히고(insight-learning-map.tsx L393), 픽스처도 앞 8곳만 OCEAN 으로 준다
    // (scripts/test/sprint8-fixture-server.mjs L247). 9 는 그 정정 전의 값이라
    // 정상 화면에서도 8 을 받아 실패했다(2026-08-31 CI 실측).
    await expect(page.locator('button[data-testid^="island-"]')).toHaveCount(8);

    await page.goto('/insights/land/dep');
    await expect(page.getByTestId('island-detail')).toBeVisible();
    await expect(
      page.getByText('로그인하면 하루 다섯 물길이 생깁니다'),
    ).toBeVisible();
    await expect(page.getByTestId('article-dep-article-1')).toBeEnabled();

    await page.goto('/insights/koans');
    await expect(page.getByTestId('koan-list')).toBeVisible();
    await expect(
      page.getByText(
        '프로젝트 SSH 키가 이미 있는데 인스턴스 키를 더하면, 둘은 공존할까 덮어쓸까?',
      ),
    ).toBeVisible();

    await page.goto('/insights/koans/1');
    await expect(page.getByTestId('koan-detail')).toBeVisible();
    await expect(
      page.getByText('AI가 정리한 초안', { exact: true }).first(),
    ).toBeVisible();
    await expect(page.getByText('현장 개발자')).toBeVisible();
  });

  test('공부방은 개척지 출처·CTA 2개·실제 이야기 3개를 표시한다', async ({
    page,
  }) => {
    await page.goto('/community/rooms/8');

    await expect(page.getByTestId('community-room-detail')).toBeVisible();
    await expect(page.getByTestId('community-room-entry-context')).toHaveText(
      '배포·운영 개척지에서 들어왔습니다',
    );
    await expect(
      page.getByRole('heading', { name: '배포·운영방' }),
    ).toBeVisible();
    await expect(page.getByText('멤버 14명')).toBeVisible();
    await expect(page.getByTestId('community-room-detail-join')).toBeVisible();
    await expect(
      page.getByTestId('community-room-insight-articles-link'),
    ).toHaveAttribute('href', '/insights/land/dep');

    await page.goto('/community/rooms/8?from=db');
    await expect(page.getByTestId('community-room-entry-context')).toHaveText(
      '배포·운영 개척지에서 들어왔습니다',
    );
    await expect(
      page.getByTestId('community-room-insight-articles-link'),
    ).toHaveAttribute('href', '/insights/land/dep');
    await expect(page.getByText('이 방의 이야기')).toBeVisible();
    for (const title of [
      '무중단 배포라는데 30초쯤 502가 뜹니다',
      '환경변수 바꾸고 재배포했는데 값이 그대로입니다',
      '롤백 눌렀는데 왜 4분이나 걸리나 했더니',
    ]) {
      await expect(page.getByText(title, { exact: true })).toBeVisible();
    }
    await expect(page.getByTestId('community-room-detail-media')).toHaveCount(
      0,
    );
  });

  test('비회원 첫 편 본문은 끝까지 열리고 끝에서만 로그인을 권한다', async ({
    page,
  }) => {
    await page.goto('/insights/dep-article-1');
    await expect(
      page.getByRole('heading', {
        name: '배포가 끝났다는 말은 무엇이 끝났다는 뜻인가',
        exact: true,
      }),
    ).toBeVisible();
    for (const heading of [
      '키는 서버가 아니라 계정에 붙는다',
      '프로젝트 키와 인스턴스 키가 만나면',
      '그래서 무엇을 확인해야 하나',
    ]) {
      await expect(
        page.getByRole('heading', { name: heading, exact: true }),
      ).toBeVisible();
    }
    await expect(
      page.getByText(/ZERO-ONE 편집팀 · 읽는 데 \d+분/),
    ).toBeVisible();
    await expect(page.getByText('조회 396', { exact: true })).toBeVisible();
    await expect(page.getByText('도움됨 37', { exact: true })).toBeVisible();
    await expect(page.getByTestId('insight-completion-journey')).toBeVisible();
    // 2026-08-25 회장 결정: 완독 후속 카드는 시안대로 다음 글 + 관련 화두 2개로
    // 줄였다. 공부방·바다 카드는 더 이상 렌더되지 않는다.
    for (const testId of [
      'insight-completion-next',
      'insight-completion-koan',
    ]) {
      await expect(page.getByTestId(testId)).toBeVisible();
    }
    await expect(page.getByTestId('insight-completion-room')).toHaveCount(0);
    await expect(page.getByTestId('insight-completion-sea')).toHaveCount(0);
    await expect(page.getByText('여기서 막혔나요')).toHaveCount(0);
    await expect(page.getByText(/401|Unauthorized/i)).toHaveCount(0);
  });

  test('공개 미디어 5종은 화면에 붙고 인증 없이 200으로 열린다', async ({
    page,
    request,
  }) => {
    // TC-S8-REG-002 를 여기로 옮겼다. 종전에는 dev 실데이터에서 5종 경로를 받아
    // 검사하게 돼 있었는데, dev CMS 가 운영과 같은 인스턴스라 검사용 글을 발행할 수
    // 없어 그 값을 채우지 못했고 계속 미실시로 남았다(2026-08-26 확인).
    // 픽스처 CMS 는 우리가 내용을 정하므로 5종을 실제로 붙여 검사한다.
    const mediaBase =
      process.env.E2E_STRAPI_FIXTURE_BASE ?? 'http://127.0.0.1:3212';
    const media = [
      ['커버', '/uploads/cover.png', 'image/png'],
      ['본문 이미지', '/uploads/body.png', 'image/png'],
      ['비디오', '/uploads/clip.mp4', 'video/mp4'],
      ['아바타', '/uploads/cover.png', 'image/png'],
      ['첨부', '/uploads/notes.pdf', 'application/pdf'],
    ] as const;

    for (const [label, path, type] of media) {
      const response = await request.get(`${mediaBase}${path}`);
      expect(response.status(), `${label} 무인증 응답`).toBe(200);
      expect(response.headers()['content-type'], `${label} 형식`).toBe(type);
    }

    await page.goto('/insights/dep-article-1');
    await expect(
      page.locator('img[src*="/uploads/body.png"]'),
      '본문 이미지가 화면에 붙는다',
    ).toHaveCount(1);
    await expect(
      page.locator('video source[src*="/uploads/clip.mp4"]'),
      '비디오가 화면에 붙는다',
    ).toHaveCount(1);
    await expect(
      page.locator('a[href*="/uploads/notes.pdf"]'),
      '첨부 링크가 화면에 붙는다',
    ).toHaveCount(1);
  });
});
