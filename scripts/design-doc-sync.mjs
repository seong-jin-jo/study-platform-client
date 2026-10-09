#!/usr/bin/env node
/**
 * 디자인시스템 문서(DESIGN.md) 와 정본 코드(global.css) 의 정합을 검사한다.
 *
 * 왜 필요한가:
 *   문서가 "코드에 있다" 고 적어둔 이름이 실제로는 없으면, 그 이름으로 그린 시안과
 *   그 시안대로 짠 코드가 조용히 화면에서 사라진다. 빌드도 타입검사도 이걸 못 잡는다.
 *   2026-08-12 실측에서 문서 5건이 실제 코드와 어긋나 있었다.
 *
 * 판정:
 *   문서가 백틱으로 인용한 토큰/유틸 이름이 global.css 에 정의돼 있어야 한다.
 *   폐기·조건부로 명시된 항목(취소선 또는 "미등재"/"사용 금지" 표기 줄)은 면제한다.
 *
 * 사용: node scripts/design-doc-sync.mjs [--report]
 */
import { readFileSync } from 'node:fs';

const DOC = process.env.DESIGN_MD ?? '../../DESIGN.md';
const CSS = 'src/app/global.css';

const css = readFileSync(CSS, 'utf8');
const docText = readFileSync(DOC, 'utf8');

const vars = new Set(
  [...css.matchAll(/(--[a-z0-9-]+)\s*:/gi)].map((m) => m[1]),
);
const utils = new Set(
  [...css.matchAll(/@utility\s+([a-z][a-z0-9-]+)/gi)].map((m) => m[1]),
);

/**
 * 유틸리티 접두어 -> 대응하는 CSS 변수 후보들.
 * 색은 두 형태가 공존한다. `bg-fill-brand-*` 는 접두어를 떼고(`--color-fill-brand-*`),
 * `border-subtle` 는 접두어를 살린다(`--color-border-subtle`). 둘 중 하나만 있으면 통과.
 */
const UTILITY_TO_VAR = [
  [
    /^(bg|text|border|fill|stroke|ring|from|via|to)-([a-z][a-z0-9-]*)$/,
    (g, pre) => [`--color-${g}`, `--color-${pre}-${g}`],
  ],
  [
    /^(?:gap|gap-x|gap-y|p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|w|h|size|min-w|max-w|min-h|max-h|top|bottom|left|right|space-x|space-y)-(\d+)$/,
    (g) => `--spacing-${g}`,
  ],
  [/^rounded-(\d+)$/, (g) => `--radius-${g}`],
  [/^shadow-([a-z0-9]+)$/, (g) => `--shadow-${g}`],
];

/** 인용이지만 토큰 이름이 아닌 것 (와일드카드·범위·산문·문법 예시) */
const NOT_A_NAME = /[*~<>()\s]|\/|^--[a-z-]+-N$|^-?\d|초기|initial/;

/** 그 줄이 "이건 코드에 없다" 고 이미 밝힌 줄이면 면제한다 */
const DECLARED_ABSENT =
  /미등재|정의 없|존재하지 않|값이 없|코드에 없|사용 금지|사용처 0|폐기|죽은|~~|없앴|뺐다|삭제|치환|쓰지 않는|잘못 적|렌더되지 않/;

const lines = docText.split('\n');
const findings = [];
const checked = new Set();

lines.forEach((line, idx) => {
  if (DECLARED_ABSENT.test(line)) return;
  // 파일 경로가 섞인 줄은 컴포넌트 이름이 토큰으로 오인된다.
  if (/\.tsx|\.ts\b|src\//.test(line)) return;
  for (const [, raw] of line.matchAll(/`([^`\n]+)`/g)) {
    const name = raw.trim();
    if (NOT_A_NAME.test(name)) continue;
    const key = name + '@' + idx;
    if (checked.has(key)) continue;
    checked.add(key);

    if (name.startsWith('--')) {
      if (!vars.has(name)) findings.push({ line: idx + 1, name, want: name });
      continue;
    }
    if (utils.has(name)) continue;
    for (const [re, fn] of UTILITY_TO_VAR) {
      const m = name.match(re);
      if (!m) continue;
      const got = m.length > 2 ? fn(m[2], m[1]) : fn(m[1]);
      const cands = Array.isArray(got) ? got : [got];
      if (!cands.some((c) => vars.has(c))) {
        findings.push({ line: idx + 1, name, want: cands.join(' 또는 ') });
      }
      break;
    }
  }
});

console.log(`문서 ${DOC} 대 코드 ${CSS}`);
console.log(`코드 변수 ${vars.size}건 · 코드 유틸 ${utils.size}건`);

if (!findings.length) {
  console.log('\n정합 위반 0건.');
  process.exit(0);
}

console.log(`\n정합 위반 ${findings.length}건 (문서가 인용했으나 코드에 없음)`);
for (const f of findings) {
  console.log(`  DESIGN.md:${f.line}  ${f.name}  ->  ${f.want} 미정의`);
}
console.log(
  '\n고치는 법: 코드에 등재하거나, 문서 줄에 "미등재" 또는 "사용 금지" 를 명시해 폐기로 표기한다.',
);
process.exit(1);
