/**
 * 시안 v10 대 구현 대조용 캡처.
 *   왼쪽(시안)  = visual-diff-out/proto/{mobile,desktop}/sc-*.png (capture-prototype.mjs 산출)
 *   오른쪽(구현) = 이 스크립트가 로컬 dev 서버에서 뽑는다
 * 시안과 같은 뷰포트(390 / 1440)를 쓴다. 화면 대응은 정합 대조표 §1을 따른다.
 *
 *   node scripts/visual-diff/capture-v10.mjs
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const BASE = process.env.CAPTURE_BASE ?? 'http://localhost:3000';
const API = process.env.E2E_API_BASE_URL ?? 'https://test-api.zeroone.it.kr';
const OUT = path.resolve('visual-diff-out', 'v10-impl');
const WIDTHS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'desktop', width: 1440, height: 900 },
];

/** 화면이 실제로 떴는지 확인하는 앵커. 200 만으로는 렌더 증거가 아니다. */
const SCREENS = [
  { id: 'sc-sea', path: '/insights', name: '바다(학습지도)' },
  { id: 'sc-land', path: null, name: '개척지-개념글목록', resolve: 'land' },
  { id: 'sc-read', path: null, name: '개념글-읽기', resolve: 'read' },
  { id: 'sc-room', path: null, name: '공부방(개척지 진입)', resolve: 'room' },
];

const settle = async (page) => {
  await page.waitForLoadState('load').catch(() => {});
  await page.waitForTimeout(2500);
};

/** QA 토큰을 캡처 시점에 발급한다. 저장된 토큰은 1시간이면 만료된다. */
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

const run = async () => {
  const memberToken = await mintToken('ROLE_MEMBER');
  console.log('토큰 발급·검증 완료 (/auth/me 200)');
  const host = new URL(BASE).hostname;
  const cookie = {
    name: 'accessToken',
    value: memberToken,
    domain: host,
    path: '/',
    expires: -1,
    httpOnly: false,
    secure: BASE.startsWith('https'),
    sameSite: 'Lax',
  };

  const browser = await chromium.launch();
  const results = [];

  for (const vp of WIDTHS) {
    const dir = path.join(OUT, vp.name);
    await mkdir(dir, { recursive: true });
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2,
      storageState: { cookies: [cookie], origins: [] },
    });
    const page = await ctx.newPage();
    const consoleErrors = [];
    page.on(
      'console',
      (m) => m.type() === 'error' && consoleErrors.push(m.text()),
    );

    // 개척지·방은 지도 API 로 확정한다. 바다의 섬은 버튼이라 DOM 에 링크가 없다.
    const map = await fetch(`${API}/api/v1/insight/map`, {
      headers: { Authorization: `Bearer ${memberToken}` },
    }).then((r) => r.json());
    const islands = map?.content?.islands ?? [];
    const bridged = islands.find((i) => i.bridgeRoomId);
    const landSlug = (bridged ?? islands[0])?.slug ?? null;
    const roomHref = bridged
      ? `/community/rooms/${bridged.bridgeRoomId}?from=${encodeURIComponent(bridged.slug)}`
      : null;

    // 개념글 1편도 지도 API 로 확정한다.
    // 개척지 화면의 개념글은 <a> 가 아니라 <button onClick=router.push> 라서
    // a[href] 탐색으로는 영원히 안 잡힌다(이것이 읽기 화면 캡처가 계속 실패한 원인).
    // test- 접두 글은 CMS 본문이 없는 시드라 오류 화면으로 떨어진다. 실제 글만 고른다.
    const readSlug =
      islands
        .flatMap((i) => i.articles ?? [])
        .find((a) => a.slug && !a.slug.startsWith('test-'))?.slug ?? null;

    for (const s of SCREENS) {
      let target = s.path;
      if (s.resolve === 'land')
        target = landSlug ? `/insights/land/${landSlug}` : null;
      if (s.resolve === 'read')
        target = readSlug ? `/insights/${readSlug}` : null;
      if (s.resolve === 'room') target = roomHref;
      if (!target) {
        results.push(`[${vp.name}] ${s.id} ${s.name} -> ⛔ 경로 발견 실패`);
        continue;
      }
      const before = consoleErrors.length;
      try {
        const res = await page.goto(`${BASE}${target}`, {
          waitUntil: 'domcontentloaded',
          timeout: 45000,
        });
        await settle(page);
        // 로그아웃 화면으로 떨어졌는지 검사 (HTTP 200 은 증거가 아니다)
        const loggedOut = await page.getByText(/로그인 \/ 회원가입/).count();
        await page.screenshot({
          path: path.join(dir, `${s.id}.png`),
          fullPage: true,
        });
        results.push(
          `[${vp.name}] ${s.id} ${s.name} ${target} -> ${res?.status()} ` +
            `(콘솔오류 ${consoleErrors.length - before}건)` +
            (loggedOut ? ' ⚠️ 비로그인 화면' : ''),
        );
      } catch (e) {
        results.push(
          `[${vp.name}] ${s.id} ${s.name} ${target} -> 실패: ${String(e).slice(0, 90)}`,
        );
      }
    }
    await ctx.close();
  }
  await browser.close();
  console.log(results.join('\n'));
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
