import path from 'node:path';

/**
 * 빌드 대조(build-compare) 캡처 저장 루트.
 *
 * 과거엔 `path.resolve(process.cwd(), '../docs/design/sprint7-v3/build-compare')`
 * 처럼 cwd 밖(모노레포 루트)을 기본값으로 잡았다. CI는
 * `mcr.microsoft.com/playwright` 컨테이너에서 `-v "$PWD":/w` 로
 * **study-platform-client 디렉터리 하나만** 마운트하고 cwd 를 `/w` 로 두므로,
 * `../docs` 는 컨테이너 루트의 `/docs` 로 풀려 `EACCES: permission denied` 로
 * 죽는다. 상위 디렉터리가 존재하지 않거나 마운트되지 않은 환경에서도 항상
 * 쓸 수 있어야 하므로, 기본값은 **cwd 밖으로 나가지 않는다.**
 *
 * 시안 캡처를 저장소의 `docs/design/...` 로 직접 받고 싶을 때(회장·세션이
 * 산출물을 리뷰용으로 커밋하려는 경우)는 `BUILD_COMPARE_OUTPUT_ROOT` 로
 * 명시적으로 지정한다. 이 값은 절대/상대 어느 쪽이든 받아 cwd 기준으로
 * resolve 한다.
 *
 * 경로를 잡지 못하는 상황을 조용히 통과시키지 않는다 — 이 저장소는
 * "가짜 초록"(실행 없이 통과)을 걷어낸 참이라, 여기서도 실패를 숨기지
 * 않고 즉시 throw 한다.
 */
export function resolveBuildCompareOutputRoot(defaultSubdir: string): string {
  const fromEnv = process.env.BUILD_COMPARE_OUTPUT_ROOT?.trim();
  if (fromEnv) {
    const resolved = path.resolve(process.cwd(), fromEnv);
    if (!resolved) {
      throw new Error(
        `BUILD_COMPARE_OUTPUT_ROOT 를 경로로 풀지 못했다: ${fromEnv}`,
      );
    }
    return resolved;
  }

  if (!defaultSubdir || !defaultSubdir.trim()) {
    throw new Error(
      'resolveBuildCompareOutputRoot: defaultSubdir 가 비어 있다. ' +
        '기본 저장 위치를 잡을 수 없다.',
    );
  }

  // cwd 밖으로 나가지 않는 기본값. test-results/ 는 .gitignore 대상이라
  // 커밋에 섞이지 않는다.
  return path.resolve(process.cwd(), 'test-results', defaultSubdir);
}
