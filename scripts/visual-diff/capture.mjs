/**
 * 공용 컴포넌트 이관 전후 화면 캡처.
 *   변경 전 = origin/develop 이 올라간 dev 서버(https://test.zeroone.it.kr)
 *   변경 후 = 이 브랜치를 로컬에서 빌드·기동한 서버(http://localhost:3000)
 * 같은 dev API·같은 계정·같은 뷰포트를 쓰므로 데이터 상태가 같다.
 *
 *   node scripts/visual-diff/capture.mjs --label before --base https://test.zeroone.it.kr
 *   node scripts/visual-diff/capture.mjs --label after  --base http://localhost:3000
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const arg = (name, required = true) => {
  const i = process.argv.indexOf(`--${name}`);
  if (i < 0 || !process.argv[i + 1]) {
    if (required) throw new Error(`--${name} 필요`);
    return undefined;
  }
  return process.argv[i + 1];
};

const label = arg('label');
const BASE = arg('base', false) ?? 'https://test.zeroone.it.kr';
const API = process.env.E2E_API_BASE_URL ?? 'https://test-api.zeroone.it.kr';
const OUT = path.resolve('visual-diff-out', label);
const WIDTHS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'desktop', width: 1440, height: 900 },
];

/**
 * 5차 코드리뷰가 시각 이탈을 지목한 화면 우선. 회장 판단용이라 이 8곳이 먼저다.
 * needsAction 은 캡처 전에 눌러야 화면이 드러나는 경우(모달 등).
 */
const ROUTES = [
  {
    path: '/class/__SLUG__',
    name: '클래스상세-로드맵',
    why: '단계 확장 동작(md:flex-5/1) 상실 + 화살표 아이콘 추가',
  },
  {
    path: '/my-inquiry',
    name: '내문의-접힘목록',
    why: '패널 너비제한 래퍼가 배치 끊음 + 화살표 아이콘',
  },
  {
    path: '/admin/qa-scenarios',
    name: '관리자-시나리오',
    why: '원래 없던 화살표 아이콘 추가',
  },
  {
    path: '/admin/courses',
    name: '관리자-코스목록',
    why: '행 배경·고정높이 변경 + 선택행 좌측 브랜드선 추가',
  },
  {
    path: '/onboarding/retention',
    name: '온보딩-목표방선택',
    why: '가로정렬·높이 상실, 행동 버튼 문구·색·높이 변경',
  },
  {
    path: '/class/__SLUG__/complete',
    name: '수료-만족도',
    why: '별점 입력 컴포넌트 교체',
  },
  {
    path: '/class/__SLUG__/feed',
    name: '피드',
    why: '메뉴 모바일 전환 임계값',
  },
  {
    path: '/class/claude-cowork',
    name: '협업클래스-질의응답',
    why: '접힘목록 이관',
  },
];

async function mintToken(role) {
  const memberId = process.env.E2E_MEMBER_ID ?? '2';
  const r = await fetch(
    `${API}/api/v1/tokens/token?member-id=${memberId}&role-id=${role}`,
  );
  if (!r.ok) throw new Error(`${role} 발급 실패: ${r.status}`);
  const token = (await r.json())?.content?.accessToken;
  if (!token) throw new Error(`${role} 발급 응답에 accessToken 없음`);
  const me = await fetch(`${API}/api/v1/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!me.ok)
    throw new Error(`${role} 토큰이 /auth/me 에서 거부됨: ${me.status}`);
  return token;
}

async function main() {
  const memberToken = await mintToken('ROLE_MEMBER');
  const adminToken = await mintToken('ROLE_ADMIN');
  console.log(
    `[${label}] 토큰 발급·검증 완료 (회원·관리자 둘 다 /auth/me 200)`,
  );

  const host = new URL(BASE).hostname;
  const secure = BASE.startsWith('https');
  const cookie = (value) => ({
    name: 'accessToken',
    value,
    domain: host,
    path: '/',
    expires: -1,
    httpOnly: false,
    secure,
    sameSite: 'Lax',
  });

  const browser = await chromium.launch();

  // 실제 클래스 slug 발굴. 추측하지 않는다.
  const probe = await browser.newContext({
    storageState: { cookies: [cookie(memberToken)], origins: [] },
  });
  const probePage = await probe.newPage();
  await probePage.goto(`${BASE}/class`, { waitUntil: 'domcontentloaded' });
  // 목록은 클라이언트 렌더라 앵커가 붙을 때까지 기다린다. 없으면 slug 발굴이 조용히 실패한다.
  await probePage
    .waitForFunction(
      () =>
        [...document.querySelectorAll('a[href^="/class/"]')].some(
          (a) => !(a.getAttribute('href') ?? '').includes('.'),
        ),
      { timeout: 30000 },
    )
    .catch(() => {});
  const hrefs = await probePage.$$eval('a[href^="/class/"]', (as) =>
    as.map((a) => a.getAttribute('href')),
  );
  await probe.close();
  const slug = [
    ...new Set(
      hrefs
        .map((h) => h?.split('/')[2])
        .filter((s) => s && !s.includes('.') && s !== 'claude-cowork'),
    ),
  ][0];
  if (!slug) throw new Error('클래스 slug 발굴 실패 (목록 앵커 미렌더)');
  console.log(`[${label}] 클래스 slug: ${slug}`);

  const manifest = [];
  for (const vp of WIDTHS) {
    const dir = path.join(OUT, vp.name);
    await mkdir(dir, { recursive: true });
    for (const r of ROUTES) {
      const route = r.path.replace('__SLUG__', slug);
      const isAdmin = route.startsWith('/admin');
      const ctx = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        storageState: {
          cookies: [cookie(isAdmin ? adminToken : memberToken)],
          origins: [],
        },
      });
      const page = await ctx.newPage();
      const errors = [];
      page.on('console', (m) => {
        if (m.type() === 'error') errors.push(m.text());
      });
      const file = route.replace(/^\//, '').replace(/\//g, '__') || 'root';
      try {
        // networkidle 금지: 로그인 화면의 상시 폴링 때문에 영원히 오지 않는다(실측 45초 타임아웃).
        const res = await page.goto(`${BASE}${route}`, {
          waitUntil: 'domcontentloaded',
          timeout: 45000,
        });
        await page.waitForLoadState('load', { timeout: 20000 }).catch(() => {});
        await page.waitForTimeout(2500);
        // HTTP 200 은 판정 근거가 아니다. 로그인 버튼이 보이면 공개 랜딩으로 떨어진 것이다.
        const loggedOut = await page
          .locator('text=로그인 / 회원가입')
          .count()
          .catch(() => 0);
        const authOk = loggedOut === 0;
        await page.screenshot({
          path: path.join(dir, `${file}.png`),
          fullPage: true,
        });
        manifest.push({
          viewport: vp.name,
          name: r.name,
          why: r.why,
          route,
          file: `${file}.png`,
          status: res?.status() ?? null,
          finalUrl: page.url(),
          authOk,
          consoleErrors: errors.length,
        });
        console.log(
          `  [${vp.name}] ${r.name} ${route} -> ${res?.status()}${authOk ? '' : ' ⛔인증실패(공개랜딩)'} (콘솔오류 ${errors.length})`,
        );
      } catch (e) {
        manifest.push({
          viewport: vp.name,
          name: r.name,
          route,
          error: String(e).slice(0, 150),
        });
        console.log(`  [${vp.name}] ${r.name} ${route} -> 실패`);
      }
      await ctx.close();
    }
  }
  await browser.close();
  await writeFile(
    path.join(OUT, 'manifest.json'),
    JSON.stringify({ label, base: BASE, slug, manifest }, null, 2),
  );
  const authFailed = manifest.filter((m) => m.authOk === false);
  console.log(
    `\n[${label}] 총 ${manifest.length}장. 인증실패 ${authFailed.length}건. 실패 ${manifest.filter((m) => m.error).length}건.`,
  );
}

await main();
