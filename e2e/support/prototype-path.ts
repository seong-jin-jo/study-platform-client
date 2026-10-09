import { existsSync } from 'node:fs';
import path from 'node:path';

/**
 * 승인 프로토타입(시안) 파일 경로.
 *
 * SPRINT7 V3 회귀 스펙의 승인 핀은 v15다. 원본은 워크스페이스 루트
 * `zero-one/docs/design/sprint7-v3/` 에만 있어 모노레포 체크아웃과 전용
 * worktree, CI 컨테이너에서는 열 수 없었다. 승인본을 E2E fixture로 동기화해
 * 실행 환경과 무관하게 같은 파일을 사용한다.
 *
 * 해결:
 *  - 경로를 `E2E_PROTOTYPE_PATH` 로 주입받는다.
 *  - 안 주면 모노레포에 동기화한 E2E fixture를 사용한다.
 *  - 과거 로컬 구성과의 호환을 위해 워크스페이스 바깥 경로도 시도한다.
 *  - 그래도 없으면 `prototypeAvailable` 이 false 다. 스펙이 이걸 보고
 *    **명시적으로 건너뛴다.** 참조 이미지가 없으면 대조 자체가 성립하지
 *    않으므로, 이건 결함을 숨기는 skip 이 아니라 전제 부재를 밝히는 skip 이다.
 */
const PROTOTYPE_FILENAME = 'sprint7v3-flow-prototype-v15-claude-opus.html';

function resolvePrototypePath(): string {
  const fromEnv = process.env.E2E_PROTOTYPE_PATH?.trim();
  if (fromEnv) return path.resolve(fromEnv);

  // CI와 worktree에서 항상 보이는 동기화 fixture를 먼저 찾는다.
  const candidates = [
    path.resolve(process.cwd(), 'e2e/fixtures', PROTOTYPE_FILENAME),
    path.resolve(
      process.cwd(),
      'study-platform-client/e2e/fixtures',
      PROTOTYPE_FILENAME,
    ),
    path.resolve(
      process.cwd(),
      '../docs/design/sprint7-v3',
      PROTOTYPE_FILENAME,
    ),
    path.resolve(
      process.cwd(),
      '../../docs/design/sprint7-v3',
      PROTOTYPE_FILENAME,
    ),
  ];
  return candidates.find((candidate) => existsSync(candidate)) ?? candidates[0];
}

export const PROTOTYPE_PATH = resolvePrototypePath();

export const prototypeAvailable = existsSync(PROTOTYPE_PATH);

export const prototypeMissingReason =
  `승인 프로토타입을 찾지 못해 시안 대조를 건너뛴다. 찾은 경로: ${PROTOTYPE_PATH}. ` +
  'E2E_PROTOTYPE_PATH 로 실제 위치를 지정하면 실행된다.';
