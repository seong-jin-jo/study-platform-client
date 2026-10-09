import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  assertStaticOutput,
  assertStaticSourceBoundary,
} from '../../scripts/appintoss/assert-static-boundary.mjs';

const ROUTES = [
  'page.tsx',
  'insights/page.tsx',
  'insights/read/page.tsx',
  'community/page.tsx',
  'community/read/page.tsx',
  'class/page.tsx',
  'class/detail/page.tsx',
];

const OUTPUT_ROUTES = [
  'index.html',
  'insights/index.html',
  'insights/read/index.html',
  'community/index.html',
  'community/read/index.html',
  'class/index.html',
  'class/detail/index.html',
];

const workspaces: string[] = [];

async function createApp(
  source = 'export default function Page() { return null; }',
) {
  const workspace = await mkdtemp(
    path.join(tmpdir(), 'appintoss-boundary-test-'),
  );
  workspaces.push(workspace);
  const appRoot = path.join(workspace, 'app');
  for (const route of ROUTES) {
    const filePath = path.join(appRoot, route);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, route === 'page.tsx' ? source : 'export {};');
  }
  return appRoot;
}

async function createOutput() {
  const workspace = await mkdtemp(
    path.join(tmpdir(), 'appintoss-output-boundary-test-'),
  );
  workspaces.push(workspace);
  const outputRoot = path.join(workspace, 'out');
  for (const route of OUTPUT_ROUTES) {
    const filePath = path.join(outputRoot, route);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, '<img src="/logo.svg">');
  }
  return outputRoot;
}

afterEach(async () => {
  await Promise.all(
    workspaces
      .splice(0)
      .map((workspace) => rm(workspace, { recursive: true, force: true })),
  );
});

describe('App-in-Toss 정적 소스 경계', () => {
  it('AIT-m3-01 허용 라우트만 있는 정적 앱은 통과한다', async () => {
    await expect(
      assertStaticSourceBoundary(await createApp()),
    ).resolves.toEqual({
      files: 7,
      routes: 7,
    });
  });

  it.each([
    [
      'LoginModal 정적 import',
      "import LoginModal from '@/components/auth/modals/login-modal'; export default LoginModal;",
      'LoginModal static import',
    ],
    [
      'location 대입',
      'window.location.href = "/login";',
      'location assignment',
    ],
    ['location.assign', 'location.assign("/login");', 'location assignment'],
    ['window.open', 'window.open("https://evil.example");', 'window.open()'],
    ['eval', 'eval("1 + 1");', 'eval()'],
    [
      '이미지 최적화 주소 직접 사용',
      'const image = "/_next/image?url=%2Flogo.png&w=640&q=75";',
      'Next image optimizer URL',
    ],
  ])('AIT-m3-02 %s 코드를 거절한다', async (_name, source, message) => {
    await expect(
      assertStaticSourceBoundary(await createApp(source)),
    ).rejects.toThrow(message);
  });
});

describe('App-in-Toss 정적 산출물 경계', () => {
  it('AIT-CI-609-IMG-01 기본 로더 문자열만 포함한 Next 청크는 허용한다', async () => {
    const outputRoot = await createOutput();
    const chunkPath = path.join(outputRoot, '_next/static/chunks/image.js');
    await mkdir(path.dirname(chunkPath), { recursive: true });
    await writeFile(
      chunkPath,
      'const defaultLoader = "/_next/image?url="; export { defaultLoader };',
    );

    await expect(assertStaticOutput(outputRoot)).resolves.toMatchObject({
      routes: 7,
    });
  });

  it.each([
    ['HTML', 'index.html'],
    ['RSC 텍스트', 'insights/index.txt'],
  ])('AIT-CI-609-IMG-02 %s에 직렬화된 이미지 최적화 요청을 거절한다', async (_name, relativePath) => {
    const outputRoot = await createOutput();
    await writeFile(
      path.join(outputRoot, relativePath),
      '<img src="/_next/image?url=%2Flogo.png&w=640&q=75">',
    );

    await expect(assertStaticOutput(outputRoot)).rejects.toThrow(
      'Next image optimizer URL',
    );
  });

  it('AIT-CI-609-IMG-03 기존 외부 서비스 청크 차단을 유지한다', async () => {
    const outputRoot = await createOutput();
    const chunkPath = path.join(outputRoot, '_next/static/chunks/payment.js');
    await mkdir(path.dirname(chunkPath), { recursive: true });
    await writeFile(chunkPath, 'const sdk = "https://js.tosspayments.com";');

    await expect(assertStaticOutput(outputRoot)).rejects.toThrow(
      'Toss Payments',
    );
  });
});
