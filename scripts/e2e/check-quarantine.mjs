/**
 * CI 게이트: 실패·건너뜀을 **격리 목록과 대조**한다.
 *
 * 왜 이 방식인가:
 *   알려진 실패 3건을 그냥 빨간 채로 두니, 새로 생긴 실패와 회장이 수용한 실패가
 *   화면에서 구분되지 않았다. 매번 사람이 "이 빨간 불은 그거예요" 라고 말해줘야 했고,
 *   그 사이에 새 결함이 섞여 들어와도 아무도 몰랐을 것이다(회장 2026-08-27 지적:
 *   "CI 실패하는건 아예 감지할 생각이 없나봄?").
 *
 * 판정 규칙 셋:
 *   1. 격리 목록에 있는 것이 실패 → 통과시키되 목록으로 보여준다.
 *   2. 목록에 없는 것이 하나라도 실패 → **빨갛다.** 이게 이 게이트의 존재 이유다.
 *   3. 격리된 것이 통과 → 알린다. 격리가 낡았다는 뜻이니 목록에서 빼야 한다.
 *      (실패로 만들지는 않는다. 고쳐진 것을 벌하면 아무도 안 고친다.)
 *
 * 건너뜀은 fail-on-skipped.mjs 가 이미 "하나라도 있으면 실패" 로 잡는다. 그런데 수용된
 * 건너뜀 1건 때문에 그 게이트가 상시 빨갰다. 그래서 건너뜀도 여기서 같이 대조하고,
 * fail-on-skipped 는 이 스크립트가 대신한다.
 *
 * 사용:
 *   node scripts/e2e/check-quarantine.mjs <report.json> [...more]
 *
 * 리포트가 없으면 실패다. 호출됐다는 것은 그 run 이 돌았어야 한다는 뜻이다
 * (fail-on-skipped.mjs 의 같은 판단을 그대로 따른다).
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const quarantinePath = resolve(here, '../../e2e/quarantine.json');

const reportPaths = process.argv.slice(2);
if (reportPaths.length === 0) {
  console.error(
    'usage: node scripts/e2e/check-quarantine.mjs <report.json> [...more]',
  );
  process.exit(2);
}

const missing = reportPaths.filter((p) => !existsSync(p));
if (missing.length > 0) {
  console.error('');
  console.error(
    `::error::Playwright JSON 리포트 ${missing.length}건이 없다. 러너가 리포트를 쓰기 전에 죽었을 가능성.`,
  );
  for (const p of missing) console.error(`  - 없음: ${p}`);
  console.error('');
  console.error('"리포트 없음 = 통과" 로 처리하지 않는다. 그건 가짜 초록이다.');
  process.exit(1);
}

const quarantine = JSON.parse(readFileSync(quarantinePath, 'utf8'));
const failRules = quarantine.quarantined ?? [];
const skipRules = quarantine.quarantinedSkips ?? [];

/** Playwright JSON: suites[].suites[]... 재귀 + suites[].specs[].tests[] */
function walk(node, filePath, acc) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node.suites)) {
    for (const suite of node.suites) walk(suite, node.file ?? filePath, acc);
  }
  if (Array.isArray(node.specs)) {
    for (const spec of node.specs) {
      const file = spec.file ?? node.file ?? filePath;
      for (const test of spec.tests ?? []) {
        const status = test.status; // expected | unexpected | flaky | skipped
        const skipped =
          status === 'skipped' ||
          (test.results ?? []).some((r) => r.status === 'skipped');
        const failed = status === 'unexpected';
        const reason =
          (test.annotations ?? [])
            .filter((a) => a.type === 'skip' || a.type === 'fixme')
            .map((a) => a.description)
            .filter(Boolean)
            .join(' / ') || '(사유 미기재)';
        acc.push({
          file,
          title: spec.title,
          project: test.projectName,
          failed,
          skipped,
          passed: status === 'expected',
          reason,
        });
      }
    }
  }
}

const all = [];
for (const p of reportPaths) {
  walk(JSON.parse(readFileSync(p, 'utf8')), p, all);
}

const matches = (rules, title) =>
  rules.find((r) => title.includes(r.titleContains));

const unexpectedFails = [];
const acceptedFails = [];
const unexpectedSkips = [];
const acceptedSkips = [];
const staleQuarantine = [];

for (const t of all) {
  if (t.failed) {
    const rule = matches(failRules, t.title);
    (rule ? acceptedFails : unexpectedFails).push({ ...t, rule });
  } else if (t.skipped) {
    const rule = matches(skipRules, t.title);
    (rule ? acceptedSkips : unexpectedSkips).push({ ...t, rule });
  } else if (t.passed) {
    const rule = matches(failRules, t.title) ?? matches(skipRules, t.title);
    if (rule) staleQuarantine.push({ ...t, rule });
  }
}

const line = (t) =>
  `  - ${t.title}\n      (${t.file}${t.project ? ` · ${t.project}` : ''})`;

console.log('');
console.log(`검사 ${all.length}건 대조 결과`);
console.log(
  `  통과 ${all.filter((t) => t.passed).length} · 실패 ${unexpectedFails.length + acceptedFails.length} · 건너뜀 ${unexpectedSkips.length + acceptedSkips.length}`,
);

if (acceptedFails.length > 0) {
  console.log('');
  console.log(
    `[수용된 실패 ${acceptedFails.length}건] 회장이 인지하고 승인한 것이다.`,
  );
  for (const t of acceptedFails) {
    console.log(line(t));
    console.log(`      왜: ${t.rule.why}`);
    console.log(`      누가: ${t.rule.owner} (수용 ${t.rule.acceptedAt})`);
  }
}

if (acceptedSkips.length > 0) {
  console.log('');
  console.log(`[수용된 건너뜀 ${acceptedSkips.length}건]`);
  for (const t of acceptedSkips) {
    console.log(line(t));
    console.log(`      왜: ${t.rule.why}`);
  }
}

if (staleQuarantine.length > 0) {
  console.log('');
  console.log(
    `::warning::격리해 둔 검사 ${staleQuarantine.length}건이 이제 통과한다. e2e/quarantine.json 에서 빼라.`,
  );
  for (const t of staleQuarantine) console.log(line(t));
}

let bad = false;

if (unexpectedFails.length > 0) {
  bad = true;
  console.error('');
  console.error(
    `::error::승인된 적 없는 실패 ${unexpectedFails.length}건. 이게 이 게이트가 잡으려는 것이다.`,
  );
  for (const t of unexpectedFails) console.error(line(t));
}

if (unexpectedSkips.length > 0) {
  bad = true;
  console.error('');
  console.error(
    `::error::승인된 적 없는 건너뜀 ${unexpectedSkips.length}건. 전제가 안 갖춰진 채로 조용히 지나갔다.`,
  );
  for (const t of unexpectedSkips) {
    console.error(line(t));
    console.error(`      사유: ${t.reason}`);
  }
}

if (bad) {
  console.error('');
  console.error(
    '수용하려면 e2e/quarantine.json 에 사유와 담당을 적어 넣어라. 사유 없는 격리는 은폐다.',
  );
  process.exit(1);
}

console.log('');
console.log('승인된 적 없는 실패·건너뜀 없음.');
