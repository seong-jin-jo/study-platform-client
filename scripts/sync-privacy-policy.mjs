#!/usr/bin/env node
// 개인정보처리방침 원천 md 에서 "공개할 부분"만 뽑아 src/content/privacy/privacy-policy-v1.0.md 를 만든다.
// 사용: node scripts/sync-privacy-policy.mjs <원천 md 경로> [출력 경로]
//
// 이 저장소는 공개 GitHub 저장소다. 원천 md 에는 내부 작업 메모가 같이 들어 있으므로
// 통째로 복사하지 않고 아래 두 구간만 가져온다.
//   - 2-1 처리방침 페이지 맨 위 공지 블록
//   - 1절 개정 처리방침 전문 (`=== 시작 ===` ~ `=== 끝 ===`)
// 문장은 바꾸지 않는다. 바꿀 점은 원천 md 에서 고치고 이 스크립트를 다시 돌린다.
// 예외는 원천의 〔 〕 빈칸 두 곳(게시 위치 주소)뿐이며, 이 사이트의 /privacy 기준 주소로 채운다.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const V03_URL = 'https://gaan.notion.site/389fbb391d798087a519cda1255fdfc1';
const V1_ANCHOR = 'policy-v1-0';
const SOURCE_DIR_LABEL = 'zto1-it-edu-community/docs/app-release';

const BODY_START = /^=== 시작 ===$/m;
const BODY_END = /^=== 끝 ===$/m;
const NOTICE_HEADING = /^### 2-1\./m;

// 공개 파일에 있으면 안 되는 내부 표현. 하나라도 남으면 생성을 실패시킨다.
const INTERNAL_TERMS = [
  '변호사',
  '미확인',
  '확인 필요',
  '게시자',
  '초안',
  '미게시',
  'unsourced',
];

const PLACEHOLDERS = [
  ['〔v1.0 하위 페이지 주소〕', `[이 페이지 아래 전문](#${V1_ANCHOR})`],
  ['〔게시 시 v0.3 보관 페이지 주소〕', `[현행 v0.3 보기](${V03_URL})`],
];

function fillPlaceholders(markdown) {
  return PLACEHOLDERS.reduce(
    (text, [from, to]) => text.replaceAll(from, to),
    markdown,
  );
}

export function extractPolicyBody(source) {
  const start = BODY_START.exec(source);
  if (!start) throw new Error('원천에서 "=== 시작 ===" 를 찾지 못했습니다.');
  const from = start.index + start[0].length;
  const end = BODY_END.exec(source.slice(from));
  if (!end) throw new Error('원천에서 "=== 끝 ===" 를 찾지 못했습니다.');
  return source
    .slice(from, from + end.index)
    .trim()
    .replace(/^# 개인정보처리방침\s*\n/, '') // 페이지 제목과 겹치는 첫 제목만 뺀다
    .trim();
}

export function extractNotice(source) {
  const heading = NOTICE_HEADING.exec(source);
  if (!heading) throw new Error('원천에서 2-1 공지 블록을 찾지 못했습니다.');
  const quoted = [];
  let started = false;
  for (const line of source.slice(heading.index).split('\n').slice(1)) {
    if (line.startsWith('>')) {
      started = true;
      quoted.push(line.replace(/^>\s?/, ''));
    } else if (started) {
      break;
    }
  }
  const notice = quoted.join('\n').trim();
  if (!notice) throw new Error('2-1 공지 블록이 비어 있습니다.');
  return notice;
}

export function buildPublicPolicyFile(source, sourceFileName) {
  const notice = fillPlaceholders(extractNotice(source));
  const body = fillPlaceholders(extractPolicyBody(source));
  const output = [
    `<!-- 원천: ${SOURCE_DIR_LABEL}/${sourceFileName} 에서 생성, 손으로 고치지 말 것 (scripts/sync-privacy-policy.mjs) -->`,
    '<!-- notice:start -->',
    notice,
    '<!-- notice:end -->',
    '<!-- policy:start -->',
    body,
    '<!-- policy:end -->',
    '',
  ].join('\n');

  if (output.includes('〔')) {
    throw new Error('채우지 못한 〔 〕 빈칸이 남았습니다.');
  }
  const leaked = INTERNAL_TERMS.filter((term) => output.includes(term));
  if (leaked.length > 0) {
    throw new Error(
      `공개 파일에 내부 표현이 남았습니다: ${leaked.join(', ')}. 원천 md 의 공개 구간을 고치세요.`,
    );
  }
  return output;
}

function main() {
  const [sourcePath, outPathArg] = process.argv.slice(2);
  if (!sourcePath) {
    console.error(
      '사용: node scripts/sync-privacy-policy.mjs <원천 md 경로> [출력 경로]',
    );
    process.exit(1);
  }
  const defaultOut = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    '..',
    'src',
    'content',
    'privacy',
    'privacy-policy-v1.0.md',
  );
  const outPath = outPathArg ?? defaultOut;
  const output = buildPublicPolicyFile(
    readFileSync(sourcePath, 'utf8'),
    path.basename(sourcePath),
  );
  writeFileSync(outPath, output);
  console.log(`privacy-policy: 공개 구간만 생성 -> ${outPath}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
