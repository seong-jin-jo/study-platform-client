import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const SCRIPT = path.join(process.cwd(), 'scripts/sync-release-notes.mjs');

const RELEASE_MD = `# 릴리스

\`\`\`yaml
release: v0.10.12
next:
  scope: "무관한 블록"
public_note:
  - version: "0.10.12"
    date: "2026-11-12"   # 예정일
    title: "한 줄 제목 # 따옴표 안 샵은 유지"
    body:
      - "무엇이 좋아졌나 한 줄"
    notify: true
    try_href: "/updates"
  - version: "0.10.11"
    date: "2026-11-12"
    title: "끝 항목"
    body:
      - "첫째"
      - "둘째"
    notify: false
\`\`\`

## 다음 절
`;

const run = (markdown: string) => {
  const dir = mkdtempSync(path.join(tmpdir(), 'release-notes-'));
  const input = path.join(dir, 'RELEASE.md');
  const output = path.join(dir, 'out.json');
  writeFileSync(input, markdown);
  execFileSync('node', [SCRIPT, input, output], { stdio: 'pipe' });
  return JSON.parse(readFileSync(output, 'utf8'));
};

describe('RELEASE.md public_note 동기화 스크립트', () => {
  it('SYNC-001 public_note 블록을 계약 모양 JSON 으로 바꾼다', () => {
    expect(run(RELEASE_MD)).toEqual([
      {
        version: '0.10.12',
        date: '2026-11-12',
        title: '한 줄 제목 # 따옴표 안 샵은 유지',
        body: ['무엇이 좋아졌나 한 줄'],
        notify: true,
        try_href: '/updates',
      },
      {
        version: '0.10.11',
        date: '2026-11-12',
        title: '끝 항목',
        body: ['첫째', '둘째'],
        notify: false,
      },
    ]);
  });

  it('SYNC-002 public_note 가 없거나 notify 가 빠지면 실패한다', () => {
    expect(() => run('# 비어 있음\n')).toThrow();
    expect(() =>
      run(
        'public_note:\n  - version: "1.0.0"\n    date: "2026-01-01"\n    title: "t"\n    body:\n      - "b"\n',
      ),
    ).toThrow();
  });
});
