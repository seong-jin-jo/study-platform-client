#!/usr/bin/env node
// RELEASE.md 의 `public_note:` 블록을 읽어 src/content/release-notes.json 으로 쓴다.
// 사용: node scripts/sync-release-notes.mjs <RELEASE.md 경로> [출력 경로]
//
// 공개 문구의 원천은 RELEASE.md 하나다. 화면은 이 JSON 만 읽고, 문구를 손으로 두 곳에 쓰지 않는다.
// 지원하는 모양은 아래 계약 하나뿐이라 외부 YAML 라이브러리 없이 직접 읽는다.
//
//   public_note:
//     - version: "0.10.12"
//       date: "2026-11-12"
//       title: "한 줄 제목"
//       body:
//         - "무엇이 좋아졌나 한 줄"
//       notify: true
//       try_href: "/updates"
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const STRING_FIELDS = ['version', 'date', 'title', 'try_href'];
const REQUIRED_FIELDS = ['version', 'date', 'title', 'body', 'notify'];

function stripComment(line) {
  let quote = null;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (quote) {
      if (char === '\\' && quote === '"') i += 1;
      else if (char === quote) quote = null;
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (char === '#' && (i === 0 || /\s/.test(line[i - 1]))) {
      return line.slice(0, i);
    }
  }
  return line;
}

function parseScalar(raw) {
  const value = raw.trim();
  if (value.startsWith('"')) return JSON.parse(value);
  if (value.startsWith("'")) return value.slice(1, -1).replace(/''/g, "'");
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}

export function extractPublicNoteLines(markdown) {
  const lines = markdown.split(/\r?\n/);
  const start = lines.findIndex((line) => /^public_note:\s*$/.test(line));
  if (start === -1) {
    throw new Error('RELEASE.md 에 `public_note:` 블록이 없습니다.');
  }
  const block = [];
  for (const line of lines.slice(start + 1)) {
    if (line.trim() === '' || /^\s/.test(line)) block.push(line);
    else break; // 들여쓰기 없는 줄(다음 최상위 키)이나 코드 펜스에서 끝난다.
  }
  return block;
}

export function parsePublicNote(markdown) {
  const entries = [];
  let current = null;
  let inBody = false;

  for (const rawLine of extractPublicNoteLines(markdown)) {
    const line = stripComment(rawLine).replace(/\s+$/, '');
    if (line.trim() === '') continue;

    const itemStart = line.match(/^\s{2}-\s+([a-z_]+):\s*(.*)$/);
    if (itemStart) {
      current = {};
      entries.push(current);
      inBody = false;
      current[itemStart[1]] = parseScalar(itemStart[2]);
      continue;
    }
    if (!current) {
      throw new Error(`public_note 항목 밖의 줄: ${rawLine}`);
    }
    const bodyItem = line.match(/^\s{6}-\s+(.*)$/);
    if (inBody && bodyItem) {
      current.body.push(parseScalar(bodyItem[1]));
      continue;
    }
    const field = line.match(/^\s{4}([a-z_]+):\s*(.*)$/);
    if (!field) {
      throw new Error(`해석할 수 없는 줄: ${rawLine}`);
    }
    if (field[1] === 'body') {
      current.body = [];
      inBody = true;
      continue;
    }
    inBody = false;
    current[field[1]] = parseScalar(field[2]);
  }

  entries.forEach((entry, index) => {
    for (const key of REQUIRED_FIELDS) {
      if (entry[key] === undefined) {
        throw new Error(`public_note[${index}] 에 ${key} 가 없습니다.`);
      }
    }
    for (const key of STRING_FIELDS) {
      if (entry[key] !== undefined && typeof entry[key] !== 'string') {
        throw new Error(`public_note[${index}].${key} 는 문자열이어야 합니다.`);
      }
    }
    if (typeof entry.notify !== 'boolean') {
      throw new Error(
        `public_note[${index}].notify 는 true/false 여야 합니다.`,
      );
    }
    if (!Array.isArray(entry.body) || entry.body.length === 0) {
      throw new Error(`public_note[${index}].body 는 1줄 이상이어야 합니다.`);
    }
  });
  if (entries.length === 0) {
    throw new Error('public_note 항목이 하나도 없습니다.');
  }
  return entries;
}

function main() {
  const [releasePath, outPathArg] = process.argv.slice(2);
  if (!releasePath) {
    console.error(
      '사용: node scripts/sync-release-notes.mjs <RELEASE.md 경로> [출력 경로]',
    );
    process.exit(1);
  }
  const defaultOut = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    '..',
    'src',
    'content',
    'release-notes.json',
  );
  const outPath = outPathArg ?? defaultOut;
  const entries = parsePublicNote(readFileSync(releasePath, 'utf8'));
  writeFileSync(outPath, `${JSON.stringify(entries, null, 2)}\n`);
  console.log(`release-notes: ${entries.length}개 항목 -> ${outPath}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
