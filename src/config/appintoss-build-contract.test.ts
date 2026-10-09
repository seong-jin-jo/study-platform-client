import { lstat, readFile, realpath, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  assertProjectionHasNoRequestInterceptors,
  createProjection,
  removeProjection,
} from '../../scripts/appintoss/materialize.mjs';

const appConfig = await readFile(
  new URL('../../appintoss/apps-in-toss.config.ts', import.meta.url),
  'utf8',
);
const materializer = await readFile(
  new URL('../../scripts/appintoss/materialize.mjs', import.meta.url),
  'utf8',
);
const packageManifest = JSON.parse(
  await readFile(
    new URL('../../appintoss/package.json', import.meta.url),
    'utf8',
  ),
) as {
  dependencies?: Record<string, string>;
};
const tsconfig = await readFile(
  new URL('../../tsconfig.json', import.meta.url),
  'utf8',
);
const appintossTsconfig = await readFile(
  new URL('../../tsconfig.appintoss.json', import.meta.url),
  'utf8',
);

describe('App-in-Toss 빌드 계약', () => {
  it('AIT-m6-01 앱 브랜드 기본색은 승인 DESIGN 정본과 같다', () => {
    expect(appConfig).toContain("primaryColor: '#f63d68'");
    expect(appConfig).not.toContain('#ff5c8a');
  });

  it('AIT-CI-02 정적 투영의 심볼릭 링크는 저장소 파일시스템 루트 안에만 둔다', async () => {
    const projectRoot = path.resolve(process.cwd());
    const workspace = await createProjection();

    try {
      expect(
        workspace.startsWith(
          path.join(projectRoot, '.appintoss-work', 'projection-'),
        ),
      ).toBe(true);
      expect(
        (await lstat(path.join(workspace, 'package.json'))).isSymbolicLink(),
      ).toBe(true);
      expect(await realpath(path.join(workspace, 'package.json'))).toBe(
        path.join(projectRoot, 'package.json'),
      );
      expect(
        (await lstat(path.join(workspace, 'tsconfig.base.json'))).isFile(),
      ).toBe(true);
      expect(
        (await lstat(path.join(workspace, 'tsconfig.appintoss.json'))).isFile(),
      ).toBe(true);
      expect(
        await readFile(path.join(workspace, 'tsconfig.appintoss.json'), 'utf8'),
      ).toContain('"extends": "./tsconfig.base.json"');
      expect(materializer).toContain(
        "path.join(PROJECT_ROOT, '.appintoss-work')",
      );
    } finally {
      await removeProjection(workspace);
    }
  });

  it('AIT-CI-04 정적 투영은 middleware와 Next 16 proxy를 포함하지 않는다', async () => {
    const workspace = await createProjection();

    try {
      await expect(
        lstat(path.join(workspace, 'src', 'middleware.ts')),
      ).rejects.toMatchObject({ code: 'ENOENT' });
      await expect(
        lstat(path.join(workspace, 'src', 'proxy.ts')),
      ).rejects.toMatchObject({ code: 'ENOENT' });
      await expect(
        assertProjectionHasNoRequestInterceptors(workspace),
      ).resolves.toBeUndefined();

      await writeFile(path.join(workspace, 'src', 'proxy.ts'), 'export {};');
      await expect(
        assertProjectionHasNoRequestInterceptors(workspace),
      ).rejects.toThrow('projection includes request interceptors: proxy.ts');
    } finally {
      await removeProjection(workspace);
    }
  });

  it('AIT-CI-05 Next 표준 export 디렉터리 out을 앱 산출물로 검증한다', () => {
    expect(materializer).toContain(
      "const generatedOutput = path.join(workspace, 'out')",
    );
  });

  it('AIT-CI-01 앱 패키징 도구는 웹 패키지 밖의 전용 패키지에만 설치한다', () => {
    expect(packageManifest.dependencies?.['@apps-in-toss/web-framework']).toBe(
      '3.7.0',
    );
    expect(appConfig).toContain("webBundleDir: '../out-appintoss'");
    expect(tsconfig).toContain('"appintoss"');
  });

  it('AIT-PREFETCH-03 앱 투영만 Next Link를 프리페치 없는 링크로 바꾼다', () => {
    expect(appintossTsconfig).toContain('"next/link"');
    expect(appintossTsconfig).toContain(
      './src/components/appintoss/appintoss-link.tsx',
    );
    expect(tsconfig).not.toContain('appintoss-link.tsx');
  });
});
