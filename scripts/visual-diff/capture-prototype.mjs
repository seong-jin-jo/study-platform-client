/**
 * 승인 시안(sprint8-app-v10-opus5.html)의 각 화면을 캡처한다.
 * 이것이 "시안 대 구현" 대조의 좌측 기준이 된다. 시안은 해시 라우팅이라 해시를 바꿔 화면을 전환한다.
 *   node scripts/visual-diff/capture-prototype.mjs
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import fs from 'node:fs';

const PROTO_DIR =
  '/Users/sj/sj_code_master/zero-one/docs/prototype/sprint8-koan';
const FILE = 'sprint8-app-v10-opus5.html';
const OUT = path.resolve('visual-diff-out', 'proto');
const PORT = 8912;

const SCREENS = [
  { id: 'sc-sea', hash: '#/sea', name: '화두-피드(바다)' },
  { id: 'sc-land', hash: '#/land/dep', name: '분야-랜딩(땅)' },
  { id: 'sc-read', hash: '#/read/dep/5', name: '화두-상세(읽기)' },
  { id: 'sc-room', hash: '#/room/dep', name: '학습방' },
  { id: 'sc-parts', hash: '#/parts', name: '컴포넌트-견본' },
];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};
const server = http.createServer((req, res) => {
  const rel =
    decodeURIComponent(req.url.split('?')[0].split('#')[0]).replace(
      /^\//,
      '',
    ) || FILE;
  const fp = path.join(PROTO_DIR, rel);
  if (
    !fp.startsWith(PROTO_DIR) ||
    !fs.existsSync(fp) ||
    fs.statSync(fp).isDirectory()
  ) {
    res.writeHead(404);
    return res.end('nf');
  }
  res.writeHead(200, {
    'Content-Type': MIME[path.extname(fp)] ?? 'application/octet-stream',
  });
  fs.createReadStream(fp).pipe(res);
});
await new Promise((r) => server.listen(PORT, r));

const browser = await chromium.launch();
const out = [];
for (const vp of [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'desktop', width: 1440, height: 900 },
]) {
  const dir = path.join(OUT, vp.name);
  await mkdir(dir, { recursive: true });
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  for (const s of SCREENS) {
    await page.goto(`http://localhost:${PORT}/${FILE}${s.hash}`, {
      waitUntil: 'load',
    });
    // 해시 라우팅은 첫 진입 후 hashchange 가 안 돌 수 있으니 명시적으로 다시 설정한다.
    await page.evaluate((h) => {
      window.location.hash = h.slice(1);
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    }, s.hash);
    await page.waitForTimeout(1500);
    const visible = await page.locator(`#${s.id}.screen.on`).count();
    await page.screenshot({
      path: path.join(dir, `${s.id}.png`),
      fullPage: true,
    });
    out.push({
      vp: vp.name,
      id: s.id,
      name: s.name,
      hash: s.hash,
      activeConfirmed: visible > 0,
      consoleErrors: errors.length,
    });
    console.log(
      `  [${vp.name}] ${s.name} ${s.hash} ${visible > 0 ? '' : '⚠️활성확인실패'} (콘솔오류 ${errors.length})`,
    );
  }
  await ctx.close();
}
await browser.close();
server.close();
await writeFile(
  path.join(OUT, 'manifest.json'),
  JSON.stringify({ file: FILE, out }, null, 2),
);
console.log(
  `시안 캡처 ${out.length}장. 활성확인 실패 ${out.filter((o) => !o.activeConfirmed).length}건.`,
);
