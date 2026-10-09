/**
 * 영역별 캡처. 전체 페이지 한 장은 너무 길어 판정이 안 된다(2026-08-13: 1440x11773).
 * 회장 판단이 필요한 영역만 요소 단위로 잘라 찍는다.
 *   node scripts/visual-diff/capture-regions.mjs --label before --base https://test.zeroone.it.kr
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const arg = (n, d) => {
  const i = process.argv.indexOf(`--${n}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d;
};
const label = arg('label');
const BASE = arg('base', 'https://test.zeroone.it.kr');
const API = process.env.E2E_API_BASE_URL ?? 'https://test-api.zeroone.it.kr';
const OUT = path.resolve('visual-diff-out', `${label}-regions`);

const REGIONS = [
  {
    id: '01-클래스상세-4단계로드맵',
    route: '/class/__SLUG__',
    admin: false,
    anchor: 'text=막힘없는 4단계 로드맵',
    box: { up: 80, down: 800 },
    why: '데스크톱 활성 단계 5배 확장 전환(md:flex-5/1) 상실 의심',
  },
  {
    id: '01b-클래스상세-커리큘럼',
    route: '/class/__SLUG__',
    admin: false,
    anchor: 'text=로드맵 따라만 가세요',
    box: { up: 100, down: 900 },
    why: '접힘목록 화살표 아이콘',
  },
  {
    id: '02-내문의-접힘목록',
    route: '/my-inquiry',
    admin: false,
    anchor: null,
    box: null,
    why: '패널 너비제한 래퍼 + 화살표 아이콘',
  },
  {
    id: '03-관리자-코스목록',
    route: '/admin/courses',
    admin: true,
    anchor: 'text=코스 목록을 선택하고',
    box: { up: 40, down: 700 },
    why: '행 배경·높이 변경 + 선택행 좌측 브랜드선',
  },
  {
    id: '04-온보딩-목표방',
    route: '/onboarding/retention',
    admin: false,
    anchor: null,
    box: null,
    why: '가로정렬·높이 상실, 행동 버튼 변경',
  },
  {
    id: '05-관리자-시나리오',
    route: '/admin/qa-scenarios',
    admin: true,
    anchor: null,
    box: null,
    why: '원래 없던 화살표 아이콘',
  },
  {
    id: '06-협업클래스-질의응답',
    route: '/class/claude-cowork',
    admin: false,
    anchor: 'text=자주 묻는 질문',
    box: { up: 60, down: 800 },
    why: '접힘목록 이관',
  },
];

async function mint(role) {
  const id = process.env.E2E_MEMBER_ID ?? '2';
  const r = await fetch(
    `${API}/api/v1/tokens/token?member-id=${id}&role-id=${role}`,
  );
  const t = (await r.json())?.content?.accessToken;
  const me = await fetch(`${API}/api/v1/auth/me`, {
    headers: { Authorization: `Bearer ${t}` },
  });
  if (!me.ok) throw new Error(`${role} 토큰 거부: ${me.status}`);
  return t;
}

const member = await mint('ROLE_MEMBER');
const admin = await mint('ROLE_ADMIN');
const host = new URL(BASE).hostname;
const secure = BASE.startsWith('https');
const ck = (v) => ({
  name: 'accessToken',
  value: v,
  domain: host,
  path: '/',
  expires: -1,
  httpOnly: false,
  secure,
  sameSite: 'Lax',
});

const browser = await chromium.launch();
const probe = await browser.newContext({
  storageState: { cookies: [ck(member)], origins: [] },
});
const pp = await probe.newPage();
await pp.goto(`${BASE}/class`, { waitUntil: 'domcontentloaded' });
await pp
  .waitForFunction(
    () =>
      [...document.querySelectorAll('a[href^="/class/"]')].some(
        (a) => !(a.getAttribute('href') ?? '').includes('.'),
      ),
    { timeout: 30000 },
  )
  .catch(() => {});
const hrefs = await pp.$$eval('a[href^="/class/"]', (as) =>
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

const out = [];
for (const vp of [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'desktop', width: 1440, height: 900 },
]) {
  const dir = path.join(OUT, vp.name);
  await mkdir(dir, { recursive: true });
  for (const r of REGIONS) {
    const route = r.route.replace('__SLUG__', slug);
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      storageState: { cookies: [ck(r.admin ? admin : member)], origins: [] },
    });
    const page = await ctx.newPage();
    try {
      await page.goto(`${BASE}${route}`, {
        waitUntil: 'domcontentloaded',
        timeout: 45000,
      });
      await page.waitForLoadState('load', { timeout: 20000 }).catch(() => {});
      await page.waitForTimeout(2500);
      const loggedOut = await page
        .locator('text=로그인 / 회원가입')
        .count()
        .catch(() => 0);
      if (loggedOut > 0) {
        out.push({ vp: vp.name, id: r.id, authOk: false });
        await ctx.close();
        continue;
      }

      let clip;
      if (r.anchor) {
        const el = page.locator(r.anchor).first();
        if (await el.count()) {
          await el.scrollIntoViewIfNeeded().catch(() => {});
          await page.waitForTimeout(600);
          const b = await el.boundingBox();
          if (b)
            clip = {
              x: 0,
              y: Math.max(0, b.y - r.box.up),
              width: vp.width,
              height: r.box.down,
            };
        }
      }
      await page.screenshot({
        path: path.join(dir, `${r.id}.png`),
        ...(clip ? { clip } : { fullPage: false }),
      });
      out.push({
        vp: vp.name,
        id: r.id,
        route,
        why: r.why,
        authOk: true,
        clipped: !!clip,
      });
      console.log(`  [${vp.name}] ${r.id} ${clip ? '(영역)' : '(첫화면)'}`);
    } catch (e) {
      out.push({ vp: vp.name, id: r.id, error: String(e).slice(0, 120) });
      console.log(`  [${vp.name}] ${r.id} 실패`);
    }
    await ctx.close();
  }
}
await browser.close();
await writeFile(
  path.join(OUT, 'manifest.json'),
  JSON.stringify({ label, BASE, slug, out }, null, 2),
);
console.log(
  `[${label}] 영역 캡처 ${out.filter((o) => o.authOk).length}장, 인증실패 ${out.filter((o) => o.authOk === false).length}건`,
);
