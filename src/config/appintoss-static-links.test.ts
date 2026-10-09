import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { assertAppintossStaticLinks } from '../../scripts/appintoss/assert-static-links.mjs';

const workspaces: string[] = [];
const workflow = await readFile(
  new URL('../../../.github/workflows/appintoss-build.yml', import.meta.url),
  'utf8',
);

async function createOutput(html: string) {
  const workspace = await mkdtemp(path.join(tmpdir(), 'appintoss-links-'));
  workspaces.push(workspace);
  await mkdir(path.join(workspace, 'insights'), { recursive: true });
  await writeFile(path.join(workspace, 'index.html'), html);
  await writeFile(
    path.join(workspace, 'insights', 'index.html'),
    '<a href="/">홈</a>',
  );
  return workspace;
}

afterEach(async () => {
  await Promise.all(
    workspaces
      .splice(0)
      .map((workspace) => rm(workspace, { recursive: true, force: true })),
  );
});

describe('App-in-Toss 정적 HTML 내부 링크 경계', () => {
  it('AIT-NAV-LINK-01 끝 슬래시가 있는 허용 내부 링크를 모두 통과시킨다', async () => {
    const outputRoot = await createOutput(`
      <a href="/insights/">인사이트</a>
      <a href="/community/">커뮤니티</a>
      <a href="/class/">클래스</a>
      <a href="/class/detail/?slug=a">클래스 상세</a>
      <a href="/insights/koans/12/">코안</a>
      <a href="/community/34/">글</a>
      <a href="https://example.com">외부</a>
    `);

    await expect(assertAppintossStaticLinks(outputRoot)).resolves.toEqual({
      htmlFiles: 2,
      internalLinks: 7,
    });
  });

  it('AIT-NAV-LINK-02 허용 목록 밖 내부 링크가 있으면 파일과 경로를 보고한다', async () => {
    const outputRoot = await createOutput('<a href="/payment/1/">결제</a>');

    await expect(assertAppintossStaticLinks(outputRoot)).rejects.toThrow(
      'index.html: /payment/1/',
    );
  });

  it('AIT-NAV-LINK-03 CI 정적 패키지 작업이 실제 산출물 링크 검사를 실행한다', () => {
    const staticPackageJob = workflow.split('  static-package:')[1];

    expect(staticPackageJob).toContain(
      'node scripts/appintoss/assert-static-links.mjs out-appintoss',
    );
  });
});
