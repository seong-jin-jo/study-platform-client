import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';
import test from 'node:test';

const ROOT = new URL('../../src/', import.meta.url);
const ALLOWED_GATE = 'api/product/article-access.ts';
const STRAPI_INTERNAL = 'api/strapi/';

const walk = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? walk(path) : [path];
    }),
  );
  return nested.flat();
};

test('article-access만 production Strapi 모듈을 import한다', async () => {
  const sourceRoot = ROOT.pathname;
  const violations = [];

  for (const file of await walk(sourceRoot)) {
    const sourcePath = relative(sourceRoot, file).replaceAll('\\', '/');
    if (!['.ts', '.tsx'].includes(extname(file))) continue;
    if (sourcePath.startsWith(STRAPI_INTERNAL)) continue;
    if (sourcePath === ALLOWED_GATE) continue;
    if (/\.(test|stories)\.[jt]sx?$/.test(sourcePath)) continue;

    const source = await readFile(file, 'utf8');
    if (/from\s+['"]@\/api\/strapi\//.test(source)) {
      violations.push(sourcePath);
    }
  }

  assert.deepEqual(
    violations,
    [],
    `Direct Strapi imports bypass article-access: ${violations.join(', ')}`,
  );
});

test('공개 article-body 모듈이 존재하지 않는다', async () => {
  const files = await walk(ROOT.pathname);
  const publicBodyModules = files
    .map((file) => relative(ROOT.pathname, file).replaceAll('\\', '/'))
    .filter((file) => file.endsWith('/article-body.ts'));

  assert.deepEqual(publicBodyModules, []);
});

test('인사이트 OG 기본 이미지는 외부에서 접근 가능한 절대 URL이다', async () => {
  const pageSource = await readFile(
    new URL('../../src/app/(service)/insights/[id]/page.tsx', import.meta.url),
    'utf8',
  );

  assert.match(
    pageSource,
    /const defaultShareImage\s*=\s*['"]https:\/\/www\.zeroone\.it\.kr\/insights\/worldmap\/bg-web\.jpg['"];/,
  );
});
