import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  compareWebBuilds,
  normalizeRenderedHtml,
  WEB_SMOKE_ROUTES,
} from '../../scripts/appintoss/compare-web-builds.mjs';

const workspaces: string[] = [];

async function createBuild({ hash = '11111111', route = '/' } = {}) {
  const root = await mkdtemp(path.join(tmpdir(), 'zeroone-web-build-test-'));
  workspaces.push(root);
  await mkdir(path.join(root, 'server'), { recursive: true });
  await writeFile(
    path.join(root, 'routes-manifest.json'),
    JSON.stringify({ staticRoutes: [{ page: route, regex: `^${route}$` }] }),
  );
  await writeFile(
    path.join(root, 'server', 'app-paths-manifest.json'),
    JSON.stringify({ [route]: `app/${hash}.js` }),
  );
  return root;
}

afterEach(async () => {
  await Promise.all(
    workspaces
      .splice(0)
      .map((workspace) => rm(workspace, { force: true, recursive: true })),
  );
});

describe('App-in-Toss web unchanged CI contract', () => {
  it('AIT-M6-01 생성 청크 경로가 달라도 웹 라우트 표면이 같으면 동일하다', async () => {
    const baseline = await createBuild({ hash: '11111111' });
    const candidate = await createBuild({ hash: '22222222' });

    await expect(compareWebBuilds(baseline, candidate)).resolves.toMatchObject({
      equal: true,
    });
  });

  it('AIT-M6-02 웹 라우트가 바뀌면 병합 차단 결과를 낸다', async () => {
    const baseline = await createBuild();
    const candidate = await createBuild({ route: '/changed' });

    await expect(compareWebBuilds(baseline, candidate)).resolves.toMatchObject({
      equal: false,
    });
  });

  it('AIT-CI-03 Next 내부 스크립트는 제외하고 사용자 DOM 변화는 검출한다', async () => {
    const baselineBuild = await createBuild();
    const candidateBuild = await createBuild();
    const baseline =
      '<body><main><h1>같은 화면</h1></main><script>build-a</script></body>';
    const sameUi =
      '<body><main><h1>같은 화면</h1></main><script>build-b</script></body>';
    const changedUi =
      '<body><main><h1>바뀐 화면</h1></main><script>build-b</script></body>';

    expect(normalizeRenderedHtml(baseline)).toBe(normalizeRenderedHtml(sameUi));
    expect(normalizeRenderedHtml(baseline)).not.toBe(
      normalizeRenderedHtml(changedUi),
    );
    const compareWithCandidate = (candidateHtml: string) =>
      compareWebBuilds(baselineBuild, candidateBuild, {
        baselineUrl: 'http://baseline.test',
        candidateUrl: 'http://candidate.test',
        routes: ['/'],
        fetchImpl: async (input) =>
          new Response(
            new URL(String(input)).hostname === 'baseline.test'
              ? baseline
              : candidateHtml,
            { status: 200 },
          ),
      });
    await expect(compareWithCandidate(sameUi)).resolves.toMatchObject({
      equal: true,
    });
    await expect(compareWithCandidate(changedUi)).resolves.toMatchObject({
      equal: false,
    });
    expect(WEB_SMOKE_ROUTES).toEqual([
      '/',
      '/insights',
      '/community',
      '/class',
    ]);
    expect(WEB_SMOKE_ROUTES).not.toContain('/insights/koans/1');
  });

  it('AIT-CI-06 기본 DOM 비교는 CI 데이터가 없어도 렌더되는 공개 셸만 사용한다', () => {
    expect(WEB_SMOKE_ROUTES).toEqual([
      '/',
      '/insights',
      '/community',
      '/class',
    ]);
    expect(
      WEB_SMOKE_ROUTES.every((route) => route.split('/').length <= 2),
    ).toBe(true);
  });

  it('AIT-M6-03 웹 비교는 운영 Node와 환경을 쓰고 배포 작업은 호출하지 않는다', async () => {
    const workflow = await readFile(
      path.resolve(process.cwd(), '../.github/workflows/appintoss-build.yml'),
      'utf8',
    );
    const webJob = workflow.split('  static-package:')[0];

    expect(webJob).toContain('web-unchanged:');
    expect(webJob).toContain('ref: ${{ github.event.pull_request.base.sha');
    expect(webJob).toContain('node-version: "20"');
    expect(webJob).toContain('secrets.NEXT_PUBLIC_API_PROD_BASE_URL');
    expect(webJob).toContain('http://127.0.0.1:3410');
    expect(webJob).toContain('http://127.0.0.1:3411');
    expect(webJob).not.toContain('cp study-platform-client/yarn.lock');
    expect(webJob).not.toContain('NEXT_PUBLIC_RUNTIME_TARGET: appintoss');
    expect(webJob).not.toContain('APPS_IN_TOSS_APP_NAME: zeroone-it');
    expect(workflow).toContain('src/config/appintoss-build-contract.test.ts');
    expect(workflow).toContain('src/config/appintoss-web-unchanged.test.ts');
    expect(
      workflow.match(
        /github\.event\.pull_request\.head\.repo\.full_name == github\.repository/g,
      ),
    ).toHaveLength(2);
    expect(workflow).not.toMatch(
      /uses:\s+\.\/\.github\/workflows\/client-deploy/,
    );
  });
});
