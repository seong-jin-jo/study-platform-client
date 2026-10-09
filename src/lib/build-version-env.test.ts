import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveBuildMetadata } from '../../scripts/build-version-env.mjs';

const createProject = ({ envFile = '' } = {}) => {
  const cwd = mkdtempSync(path.join(tmpdir(), 'zeroone-build-version-'));
  if (envFile) writeFileSync(path.join(cwd, '.env'), envFile);
  return cwd;
};

describe('WEB-VERSION-002 빌드 버전 주입 경로', () => {
  it('운영 워크플로가 계산한 릴리스 신원을 패키지 버전 없이 사용한다', () => {
    const cwd = createProject();

    expect(
      resolveBuildMetadata({
        cwd,
        env: {
          FRONTEND_VERSION: 'v0.11.1',
          FRONTEND_COMMIT: 'abc1234',
          FRONTEND_DEPLOY_ID: 'frontend-prod-20261003-1200-abc1234',
          DEPLOYED_AT: '2026-10-03T12:00:00+09:00',
          ZEROONE_DEPLOY_TARGET: 'prod',
        },
        gitShaResolver: () => 'git9999',
      }),
    ).toEqual({
      release: 'v0.11.1',
      commit: 'abc1234',
      buildId: 'frontend-prod-20261003-1200-abc1234',
      builtAt: '2026-10-03T12:00:00+09:00',
      channel: 'prod',
    });
  });

  it('Docker 빌드의 공개 신원 변수를 가장 먼저 사용한다', () => {
    const cwd = createProject({
      envFile: [
        'NEXT_PUBLIC_APP_RELEASE=v0.11.2',
        'NEXT_PUBLIC_APP_COMMIT=def5678full',
        'NEXT_PUBLIC_APP_BUILD_ID=frontend-prod-2',
        'NEXT_PUBLIC_APP_BUILT_AT=2026-10-03T13:00:00+09:00',
        'NEXT_PUBLIC_APP_CHANNEL=prod',
      ].join('\n'),
    });

    expect(
      resolveBuildMetadata({
        cwd,
        env: {},
        gitShaResolver: () => undefined,
      }),
    ).toEqual({
      release: 'v0.11.2',
      commit: 'def5678full',
      buildId: 'frontend-prod-2',
      builtAt: '2026-10-03T13:00:00+09:00',
      channel: 'prod',
    });
  });

  it('신원을 어느 경로에서도 못 찾으면 패키지 버전으로 위장하지 않는다', () => {
    const cwd = createProject();

    expect(
      resolveBuildMetadata({
        cwd,
        env: {},
        gitShaResolver: () => undefined,
      }),
    ).toEqual({
      release: undefined,
      commit: undefined,
      buildId: undefined,
      builtAt: undefined,
      channel: undefined,
    });
  });
});
