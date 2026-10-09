import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { afterEach, describe, expect, it } from 'vitest';
import {
  APPINTOSS_MAX_UNCOMPRESSED_BYTES,
  assertStaticPackageSize,
} from '../../scripts/appintoss/assert-static-boundary.mjs';
import {
  assertSourcePublicAssetsExist,
  optimizeAppintossPngAssets,
  pruneUnreferencedPublicAssets,
  removeStaticSourceMaps,
} from '../../scripts/appintoss/prepare-static-output.mjs';

const workspaces: string[] = [];

async function createWorkspace() {
  const workspace = await mkdtemp(path.join(tmpdir(), 'appintoss-package-'));
  workspaces.push(workspace);
  const outputRoot = path.join(workspace, 'out');
  const publicRoot = path.join(workspace, 'public');
  await mkdir(outputRoot, { recursive: true });
  await mkdir(publicRoot, { recursive: true });
  return { outputRoot, publicRoot };
}

async function writeBoth(
  outputRoot: string,
  publicRoot: string,
  relativePath: string,
  contents: string,
) {
  for (const root of [outputRoot, publicRoot]) {
    const filePath = path.join(root, relativePath);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, contents);
  }
}

afterEach(async () => {
  await Promise.all(
    workspaces
      .splice(0)
      .map((workspace) => rm(workspace, { recursive: true, force: true })),
  );
});

describe('App-in-Toss public 자산 참조 경계', () => {
  it('AIT-PKG-01 허용 경로의 직접·연쇄 참조 자산만 남긴다', async () => {
    const { outputRoot, publicRoot } = await createWorkspace();
    await writeBoth(outputRoot, publicRoot, 'images/keep.png', 'keep');
    await writeBoth(outputRoot, publicRoot, 'images/nested.png', 'nested');
    await writeBoth(outputRoot, publicRoot, 'images/drop.png', 'drop');
    await writeBoth(
      outputRoot,
      publicRoot,
      'styles/app.css',
      'background: url("/images/nested.png")',
    );
    await writeFile(
      path.join(outputRoot, 'index.html'),
      '<img src="/images/keep.png"><link href="/styles/app.css">',
    );

    await expect(
      pruneUnreferencedPublicAssets(outputRoot, publicRoot),
    ).resolves.toMatchObject({ keptFiles: 3, removedFiles: 1 });
    await expect(
      readFile(path.join(outputRoot, 'images/keep.png'), 'utf8'),
    ).resolves.toBe('keep');
    await expect(
      readFile(path.join(outputRoot, 'images/nested.png'), 'utf8'),
    ).resolves.toBe('nested');
    await expect(
      stat(path.join(outputRoot, 'images/drop.png')),
    ).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('AIT-PKG-02 JSON의 이스케이프된 참조도 보존한다', async () => {
    const { outputRoot, publicRoot } = await createWorkspace();
    await writeBoth(outputRoot, publicRoot, 'images/escaped.png', 'escaped');
    await writeFile(
      path.join(outputRoot, 'route.txt'),
      String.raw`{"image":"\/images\/escaped.png"}`,
    );

    await expect(
      pruneUnreferencedPublicAssets(outputRoot, publicRoot),
    ).resolves.toMatchObject({ keptFiles: 1, removedFiles: 0 });
    await expect(
      readFile(path.join(outputRoot, 'images/escaped.png'), 'utf8'),
    ).resolves.toBe('escaped');
  });

  it('AIT-PKG-07 앱 소스의 정적 문자열과 템플릿 자산을 모두 보존한다', async () => {
    const { outputRoot, publicRoot } = await createWorkspace();
    const sourcePath = path.join(path.dirname(outputRoot), 'app-source.tsx');
    await writeBoth(outputRoot, publicRoot, 'images/logo.svg', '<svg />');
    for (const name of [
      'isl-api',
      'isl-cs',
      'isl-db',
      'isl-deploy',
      'isl-web',
    ]) {
      await writeBoth(
        outputRoot,
        publicRoot,
        `insights/worldmap/${name}.png`,
        name,
      );
    }
    await writeBoth(outputRoot, publicRoot, 'images/drop.png', 'drop');
    await writeFile(
      sourcePath,
      [
        `const logo = '/images/logo.svg';`,
        [
          'const island = `',
          '/insights/worldmap/',
          '${',
          'art}.png',
          '`;',
        ].join(''),
      ].join('\n'),
    );
    await writeFile(path.join(outputRoot, 'index.html'), '<main>app</main>');

    await expect(
      pruneUnreferencedPublicAssets(outputRoot, publicRoot, {
        sourceFiles: [sourcePath],
      }),
    ).resolves.toMatchObject({ keptFiles: 6, removedFiles: 1 });
    await expect(
      assertSourcePublicAssetsExist(outputRoot, publicRoot, [sourcePath]),
    ).resolves.toEqual({ assets: 6, exact: 1, templates: 1 });
  });

  it('AIT-PKG-08 앱 소스가 가리키는 자산이 산출물에 없으면 거절한다', async () => {
    const { outputRoot, publicRoot } = await createWorkspace();
    const sourcePath = path.join(path.dirname(outputRoot), 'app-source.tsx');
    await writeBoth(outputRoot, publicRoot, 'images/required.png', 'required');
    await writeFile(sourcePath, `const image = '/images/required.png';`);
    await rm(path.join(outputRoot, 'images/required.png'));

    await expect(
      assertSourcePublicAssetsExist(outputRoot, publicRoot, [sourcePath]),
    ).rejects.toThrow(
      'source public asset boundary failed:\nsource asset is absent from output: /images/required.png',
    );
  });
});

describe('App-in-Toss PNG 변환 경계', () => {
  it('AIT-PKG-03 앱 산출물의 큰 PNG만 표시 크기 WebP 사본으로 바꾼다', async () => {
    const { outputRoot, publicRoot } = await createWorkspace();
    const relativePath = 'images/card.png';
    const outputPng = path.join(outputRoot, relativePath);
    const publicPng = path.join(publicRoot, relativePath);
    await mkdir(path.dirname(outputPng), { recursive: true });
    await mkdir(path.dirname(publicPng), { recursive: true });
    const original = await sharp({
      create: {
        background: '#f63d68',
        channels: 4,
        height: 600,
        width: 600,
      },
    })
      .png()
      .toBuffer();
    await writeFile(outputPng, original);
    await writeFile(publicPng, original);
    await writeFile(
      path.join(outputRoot, 'index.html'),
      '<img src="/images/card.png">',
    );
    await writeFile(
      path.join(outputRoot, 'route.txt'),
      String.raw`{"image":"\/images\/card.png"}`,
    );

    await expect(
      optimizeAppintossPngAssets(
        outputRoot,
        new Map([[relativePath, { width: 192 }]]),
      ),
    ).resolves.toEqual([
      expect.objectContaining({
        destinationRelativePath: 'images/card.appintoss.webp',
        sourceRelativePath: relativePath,
        width: 192,
      }),
    ]);
    await expect(stat(outputPng)).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(readFile(publicPng)).resolves.toEqual(original);
    await expect(
      readFile(path.join(outputRoot, 'index.html'), 'utf8'),
    ).resolves.toContain('/images/card.appintoss.webp');
    await expect(
      readFile(path.join(outputRoot, 'route.txt'), 'utf8'),
    ).resolves.toContain(String.raw`\/images\/card.appintoss.webp`);
    await expect(
      sharp(path.join(outputRoot, 'images/card.appintoss.webp')).metadata(),
    ).resolves.toMatchObject({ format: 'webp', width: 192 });
  });
});

describe('App-in-Toss 소스맵 경계', () => {
  it('AIT-PKG-04 외부 소스맵 파일과 참조 주석을 모두 제거한다', async () => {
    const { outputRoot } = await createWorkspace();
    const scriptPath = path.join(outputRoot, '_next/static/chunks/app.js');
    const sourceMapPath = `${scriptPath}.map`;
    await mkdir(path.dirname(scriptPath), { recursive: true });
    await writeFile(
      scriptPath,
      'console.log("app");\n//# sourceMappingURL=app.js.map',
    );
    await writeFile(sourceMapPath, '{"version":3}');

    await expect(removeStaticSourceMaps(outputRoot)).resolves.toEqual({
      removedBytes: 13,
      removedFiles: 1,
      strippedReferences: 1,
    });
    await expect(stat(sourceMapPath)).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(readFile(scriptPath, 'utf8')).resolves.toBe(
      'console.log("app");\n',
    );
  });
});

describe('App-in-Toss 압축 해제 크기 경계', () => {
  it('AIT-PKG-05 총량 30MB 이하를 허용하고 상위 파일을 크기순으로 출력한다', async () => {
    const { outputRoot } = await createWorkspace();
    await writeFile(path.join(outputRoot, 'small.js'), '1234');
    await writeFile(path.join(outputRoot, 'large.js'), '123456');
    const logs: string[] = [];

    await expect(
      assertStaticPackageSize(outputRoot, {
        logger: (message) => logs.push(message),
      }),
    ).resolves.toMatchObject({
      maxBytes: APPINTOSS_MAX_UNCOMPRESSED_BYTES,
      totalBytes: 10,
    });
    expect(logs[0]).toBe(
      `APPINTOSS_PACKAGE_SIZE bytes=10 limit=${APPINTOSS_MAX_UNCOMPRESSED_BYTES} files=2`,
    );
    expect(logs[1]).toContain('rank=1 bytes=6 path=large.js');
    expect(logs[2]).toContain('rank=2 bytes=4 path=small.js');
  });

  it('AIT-PKG-06 총량이 제한을 넘으면 실제 바이트와 함께 거절한다', async () => {
    const { outputRoot } = await createWorkspace();
    await writeFile(path.join(outputRoot, 'too-large.bin'), '1234567890');

    await expect(
      assertStaticPackageSize(outputRoot, {
        logger: () => undefined,
        maxBytes: 9,
      }),
    ).rejects.toThrow('static output exceeds 9 bytes: 10');
  });
});
