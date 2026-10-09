/**
 * CI 게이트: Playwright JSON 리포터 결과에서 "실행됐지만 건너뛴" 테스트가
 * 1건이라도 있으면 실패시킨다.
 *
 * 왜 이 방식인가:
 *  - CI 는 `--grep-invert @auth` 로 @auth 스펙을 아예 "선택"에서 뺀다. 이렇게 뺀
 *    테스트는 Playwright 리포터 출력에 등장조차 하지 않는다(실행 대상이 아니므로).
 *    즉 "의도된 제외"는 이 리포트에 나타나지 않으므로 별도로 화이트리스트할
 *    필요가 없다. 리포트에 잡히는 skipped 는 전부 test.skip() 같은 런타임
 *    조건부 skip 이고, 그 조건(예: 픽스처 API 미기동)을 CI 가 몰래 통과시켜온 것.
 *  - 그래서 이 스크립트는 이유를 가려 뽑지 않는다. **리포트에 status:"skipped" 로
 *    남은 테스트가 있으면 무조건 실패.** 이유가 "정당한 전제부재"든 아니든,
 *    지금까지 그게 안 드러난 것 자체가 문제였다(SPRINT8 28건 사고).
 *
 * 사용:
 *   node scripts/e2e/fail-on-skipped.mjs <path-to-playwright-json-report> [...more]
 *
 * 리포트 부재 취급 (2026-08-23 수정. 이전 버전은 "존재하지 않는 파일은 조용히
 * 건너뛴다"였는데, 이게 바로 이 스크립트가 막으려는 것과 같은 종류의 가짜 초록이었다):
 *   호출자가 이 경로를 넘겼다는 것 자체가 "이 run은 돌았어야 한다"는 뜻이다.
 *   CI 워크플로에서는 이 스크립트를 부르는 스텝 자체가 해당 run 스텝과 동일한
 *   `if:` 조건으로 게이팅돼 있으므로(.github/workflows/ci.yml), 정당하게 안 돈
 *   run은 이 스크립트가 아예 호출되지 않는다. 즉 "이 스크립트가 호출됐는데
 *   파일이 없다"는 상황은 테스트 러너가 리포트를 쓰기 전에 죽었다는 신호이지,
 *   정상적으로 생략된 run이 아니다. 그래서 **파일이 없으면 실패**로 처리한다.
 *   샤드 분할 러너를 쓰게 되면 호출자가 기대하는 모든 샤드 리포트 경로를
 *   전부 인자로 넘겨야 하고, 그중 하나라도 없으면 이 규칙에 따라 같이 실패한다
 *   (부분 샤드 유실을 "일부라도 있으니 통과"로 넘기지 않는다).
 */
import { readFileSync, existsSync } from 'node:fs';

const reportPaths = process.argv.slice(2);

if (reportPaths.length === 0) {
  console.error(
    'usage: node scripts/e2e/fail-on-skipped.mjs <report.json> [...more]',
  );
  process.exit(2);
}

const missingReports = reportPaths.filter((p) => !existsSync(p));
if (missingReports.length > 0) {
  console.error('');
  console.error(
    `::error::Playwright JSON 리포트 ${missingReports.length}건이 없다. 테스트 러너가 리포트를 쓰기 전에 죽었을 가능성. 이 스크립트를 호출하는 CI 스텝은 run 스텝과 동일한 조건으로 게이팅돼 있어야 하며, 호출됐다면 리포트가 반드시 있어야 한다.`,
  );
  for (const p of missingReports) {
    console.error(`  - 없음: ${p}`);
  }
  console.error('');
  console.error(
    '(참고) "리포트 없음 = 통과"로 처리하지 않는다. 그건 이 게이트가 막으려는 것과 같은 종류의 가짜 초록이다.',
  );
  process.exit(1);
}

/**
 * Playwright JSON 리포터 구조: suites[].suites[]... 재귀 + suites[].specs[].tests[].results[]
 * spec 하나에 test 여러 개(project별), test 하나에 results 여러 개(retry별).
 * Playwright는 스킵된 테스트를 results 없이 test.status/outcome 로 표현한다
 * (실행 자체를 안 하므로) outcome 필드를 1차 판정 기준으로 쓴다.
 */
function collectSkipped(node, filePath, acc) {
  if (!node || typeof node !== 'object') return;

  if (Array.isArray(node.suites)) {
    for (const suite of node.suites) {
      collectSkipped(suite, node.file ?? filePath, acc);
    }
  }

  if (Array.isArray(node.specs)) {
    for (const spec of node.specs) {
      const specFile = spec.file ?? node.file ?? filePath;
      for (const test of spec.tests ?? []) {
        const outcome = test.status; // 'expected' | 'unexpected' | 'flaky' | 'skipped'
        const isSkipped =
          outcome === 'skipped' ||
          (test.results ?? []).some((r) => r.status === 'skipped');
        if (isSkipped) {
          const reason =
            (test.annotations ?? [])
              .filter((a) => a.type === 'skip' || a.type === 'fixme')
              .map((a) => a.description)
              .filter(Boolean)
              .join(' / ') || '(사유 미기재)';
          acc.push({
            file: specFile,
            title: spec.title,
            project: test.projectName,
            reason,
          });
        }
      }
    }
  }
}

// 여기 도달했다는 것은 위 존재 검사를 이미 통과했다는 뜻. reportPaths 전부 존재.
let allSkipped = [];

for (const reportPath of reportPaths) {
  const raw = readFileSync(reportPath, 'utf8');
  const json = JSON.parse(raw);
  const acc = [];
  collectSkipped(json, reportPath, acc);
  allSkipped = allSkipped.concat(acc);
}

if (allSkipped.length > 0) {
  console.error('');
  console.error(
    `::error::전제 부재 등으로 건너뛴 E2E 테스트 ${allSkipped.length}건 발견. CI 실패 처리`,
  );
  console.error('');
  for (const s of allSkipped) {
    console.error(`  - [${s.project ?? '?'}] ${s.file} :: ${s.title}`);
    console.error(`    사유: ${s.reason}`);
  }
  console.error('');
  console.error(
    '이 게이트는 test.skip() 등 런타임 조건부로 건너뛴 테스트를 초록으로 위장시키지 않기 위한 것이다.',
  );
  console.error(
    '(참고) --grep-invert 로 애초에 선택에서 제외한 테스트는 이 리포트에 나타나지 않으므로 여기 걸리지 않는다.',
  );
  process.exit(1);
}

console.log(`건너뛴 테스트 0건. 검사한 리포트 ${reportPaths.length}개. 통과`);
process.exit(0);
