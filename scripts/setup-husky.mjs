#!/usr/bin/env node
/**
 * pre-commit / prepare-commit-msg 훅 설치 스크립트 (모노레포 대응).
 *
 * # 왜 core.hooksPath를 쓰지 않는가
 *
 * core.hooksPath는 git local config에 저장되며 **모든 워크트리가 공유**한다.
 * 이 모노레포는 백엔드(study-platform-mvp)와 프론트엔드(study-platform-client)가
 * 동일한 .git 아래에 있고, git worktree도 30개 이상 운용 중이다.
 * core.hooksPath = "study-platform-client/.husky"로 설정하면
 * 백엔드 전용 커밋 시 study-platform-client/.husky/pre-commit이 발동해
 * "package.json 없음" 오류가 발생한다.
 *
 * # 올바른 방식: .git/hooks/ 직접 설치
 *
 * git의 기본 훅 경로인 .git/hooks/에 직접 스크립트를 설치한다.
 * pre-commit 스크립트는 staged 파일 목록을 검사해 study-platform-client/ 파일이
 * 하나도 없으면 즉시 exit 0으로 통과한다(백엔드 전용 커밋 안전).
 *
 * # CI 동작
 *
 * HUSKY=0 이면 설치를 건너뛴다(CI에서 훅 없이 실행).
 */
import { execFileSync } from 'node:child_process';
import {
  chmodSync,
  copyFileSync,
  existsSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

if (process.env.HUSKY === '0') {
  console.log('husky: HUSKY=0, skipping hook install');
  process.exit(0);
}

const packageDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);

let gitRoot;
try {
  gitRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], {
    cwd: packageDir,
    encoding: 'utf8',
  }).trim();
} catch {
  // git 저장소가 아님 → 조용히 건너뜀
  process.exit(0);
}

// core.hooksPath가 남아 있으면 제거 (이전 잘못된 설치 정리)
try {
  execFileSync('git', ['config', '--local', '--unset', 'core.hooksPath'], {
    cwd: gitRoot,
    encoding: 'utf8',
  });
  console.log('husky: removed stale core.hooksPath');
} catch {
  // 이미 없으면 무시
}

const gitHooksDir = path.join(gitRoot, '.git', 'hooks');
const huskyDir = path.join(packageDir, '.husky');

// CI/배포 러너에서는 git hook을 설치하지 않는다.
// 훅은 로컬 개발자용이며, CI의 openapi 자동 커밋 등이 yarn 없는 환경에서
// pre-commit(yarn lint-staged)에 막혀 배포가 깨지기 때문이다.
// persistent self-hosted runner를 위해 이전 잡이 남긴 훅도 제거한다.
if (process.env.CI) {
  for (const name of ['pre-commit', 'prepare-commit-msg']) {
    const hookPath = path.join(gitHooksDir, name);
    if (existsSync(hookPath)) {
      rmSync(hookPath, { force: true });
    }
  }
  console.log('husky: CI 환경 감지 — 훅 미설치(기존 훅 제거)');
  process.exit(0);
}

/**
 * .git/hooks/pre-commit 설치.
 * 프론트 파일이 staged됐을 때만 lint-staged를 실행하고,
 * 백엔드 전용 커밋은 exit 0으로 통과한다.
 */
const preCommitContent = `#!/usr/bin/env sh
# pre-commit hook — study-platform-mono
# 자동 생성: study-platform-client/scripts/setup-husky.mjs
#
# study-platform-client/ 파일이 staged된 경우에만 biome format(lint-staged)을 실행.
# 백엔드(study-platform-mvp) 전용 커밋은 즉시 exit 0으로 통과.

# CI/배포 러너에서는 훅을 건너뛴다(yarn 미설치 환경의 자동 커밋이 막히지 않도록).
if [ -n "$CI" ]; then
  exit 0
fi

CLIENT_DIR="study-platform-client"

has_client_files=$(git diff --cached --name-only | grep -c "^\${CLIENT_DIR}/")

if [ "$has_client_files" -eq 0 ]; then
  exit 0
fi

cd "$CLIENT_DIR" || exit 1
yarn lint-staged
`;

const preCommitPath = path.join(gitHooksDir, 'pre-commit');
writeFileSync(preCommitPath, preCommitContent, { encoding: 'utf8' });
chmodSync(preCommitPath, 0o755);
console.log(`husky: installed .git/hooks/pre-commit`);

/**
 * .git/hooks/prepare-commit-msg 설치.
 * 브랜치명에서 ticket ID를 추출해 커밋 메시지 앞에 자동으로 붙인다.
 * study-platform-client/.husky/prepare-commit-msg를 복사한다.
 */
const prepareMsgSrc = path.join(huskyDir, 'prepare-commit-msg');
const prepareMsgDst = path.join(gitHooksDir, 'prepare-commit-msg');
if (existsSync(prepareMsgSrc)) {
  copyFileSync(prepareMsgSrc, prepareMsgDst);
  chmodSync(prepareMsgDst, 0o755);
  console.log(`husky: installed .git/hooks/prepare-commit-msg`);
}
