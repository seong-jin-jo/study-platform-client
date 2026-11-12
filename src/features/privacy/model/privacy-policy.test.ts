import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  extractNotice,
  extractPolicyBody,
  PRIVACY_POLICY_V03_URL,
  readPrivacyPolicySource,
  renderMarkdown,
} from './privacy-policy';

const SYNC_SCRIPT = path.join(process.cwd(), 'scripts/sync-privacy-policy.mjs');

// 내부 메모가 섞인 원천을 흉내 낸 입력. 공개 구간 밖에만 내부 표현을 둔다.
const SOURCE_FIXTURE = `# 개정 문안 (내부 제목)

> 상태: 초안, 미게시. 변호사 검토를 거치지 않았다.

## 0. 게시 방법 (게시자용)

1. 게시자가 Notion 에 붙여 넣는다.

## 1. 개정 처리방침 전문

> 아래 "=== 시작 ===" 과 "=== 끝 ===" 사이를 붙여 넣는다.

=== 시작 ===

# 개인정보처리방침

**시행일:** 2026-12-13

### 11. 변경 안내

- 이전 버전 보기: v0.3 〔게시 시 v0.3 보관 페이지 주소〕

=== 끝 ===

## 2. 공지 문안

### 2-1. 공지 블록 (게시용)

> **개정 안내 (시행일 2026-12-13)**
>
> 시행일 전까지는 현행 방침(v0.3)이 적용됩니다.
>
> 개정 전문 보기: 〔v1.0 하위 페이지 주소〕

### 2-2. 짧은 버전

> 다른 문안

## 5. 게시자가 확인해야 할 것 (미확인 칸)

| 칸 | 상태 |
|---|---|
| 18 | 미확인 |
`;

const runSync = (source: string) => {
  const dir = mkdtempSync(path.join(tmpdir(), 'privacy-'));
  const input = path.join(dir, 'privacy-policy-source.md');
  const output = path.join(dir, 'out.md');
  writeFileSync(input, source);
  execFileSync('node', [SYNC_SCRIPT, input, output], { stdio: 'pipe' });
  return readFileSync(output, 'utf8');
};

describe('공개용 파일 생성 스크립트', () => {
  it('PRIVACY-040 공지 블록과 1절 전문만 담고 내부 절과 표현은 담지 않는다', () => {
    const out = runSync(SOURCE_FIXTURE);
    expect(out).toContain('**시행일:** 2026-12-13');
    expect(out).toContain('시행일 전까지는 현행 방침(v0.3)이 적용됩니다.');
    for (const internal of [
      '변호사',
      '미확인',
      '게시자',
      '초안',
      '짧은 버전',
      '내부 제목',
    ]) {
      expect(out).not.toContain(internal);
    }
  });

  it('PRIVACY-041 머리에 원천과 "손으로 고치지 말 것" 한 줄을 남기고, 문장은 고치지 않는다', () => {
    const out = runSync(SOURCE_FIXTURE);
    const firstLine = out.split('\n')[0];
    expect(firstLine).toContain(
      '원천: zto1-it-edu-community/docs/app-release/privacy-policy-source.md',
    );
    expect(firstLine).toContain('손으로 고치지 말 것');
    // 원천이 "아래 본문" 이었다면 그대로 나온다: 문장 치환은 하지 않는다.
    const legacy = runSync(
      SOURCE_FIXTURE.replace(
        '현행 방침(v0.3)이 적용',
        '아래 본문(v0.3)이 적용',
      ),
    );
    expect(legacy).toContain('아래 본문(v0.3)이 적용');
  });

  it('PRIVACY-042 게시 위치 빈칸 두 곳만 이 사이트 주소로 채우고 〔 〕 가 남지 않는다', () => {
    const out = runSync(SOURCE_FIXTURE);
    expect(out).not.toContain('〔');
    expect(out).toContain('(#policy-v1-0)');
    expect(out).toContain(`(${PRIVACY_POLICY_V03_URL})`);
  });

  it('PRIVACY-043 공개 구간에 내부 표현이 남으면 생성을 실패시킨다', () => {
    expect(() =>
      runSync(
        SOURCE_FIXTURE.replace('**시행일:**', '변호사 검토 필요 **시행일:**'),
      ),
    ).toThrow();
    expect(() => runSync('# 구간 없음')).toThrow();
  });
});

describe('저장소에 올라가는 공개용 파일', () => {
  const source = readPrivacyPolicySource();

  it('PRIVACY-010 머리에 생성 표시가 있고 시행일·공고일을 담는다', () => {
    expect(source.split('\n')[0]).toContain('손으로 고치지 말 것');
    expect(source).toContain('**시행일:** 2026-12-13');
    expect(source).toContain('**공고일:** 2026-11-13');
  });

  it('PRIVACY-011 전문은 1절 본문 전체이고 페이지 제목과 겹치는 첫 제목은 없다', () => {
    const body = extractPolicyBody(source);
    expect(body.startsWith('# 개인정보처리방침')).toBe(false);
    expect(body).toContain('### 1. 수집하는 개인정보 항목 및 수집 방법');
    expect(body).toContain('### 11. 개인정보처리방침 변경 안내');
    expect(body).toContain('| Vercel Inc. | 웹사이트 호스팅 및 전송');
    expect(body).not.toContain('=== 시작 ===');
  });

  it('PRIVACY-012 공지 블록은 시행일을 밝히고 인용 표시만 벗긴다', () => {
    const notice = extractNotice(source);
    expect(notice).toContain('개인정보처리방침 개정 안내');
    expect(notice).toContain('시행일 2026-12-13');
    expect(notice).toContain('2026-11-06부터 웹사이트에서 이미 작동');
    expect(notice).toContain('시행일 전까지는 현행 방침(v0.3)이 적용됩니다');
    expect(notice).not.toContain('아래 본문(v0.3)');
    expect(notice.startsWith('>')).toBe(false);
  });

  it('PRIVACY-013 빈칸(〔 〕)이 채워져 남지 않는다', () => {
    expect(source).not.toContain('〔');
    expect(extractNotice(source)).toContain('(#policy-v1-0)');
    expect(extractPolicyBody(source)).toContain(`(${PRIVACY_POLICY_V03_URL})`);
  });

  it('PRIVACY-014 표는 HTML 표로 렌더된다', () => {
    const html = renderMarkdown(extractPolicyBody(source));
    expect(html).toContain('<table>');
    expect(html).toContain('<td>Vercel Inc.</td>');
  });

  it('PRIVACY-015 구간을 못 찾으면 조용히 빈 화면 대신 실패한다', () => {
    expect(() => extractPolicyBody('# 비어 있음')).toThrow();
    expect(() => extractNotice('# 비어 있음')).toThrow();
  });

  it('PRIVACY-016 공개 저장소에 올라가는 파일에 내부 표현이 없다', () => {
    for (const internal of [
      '변호사',
      '미확인',
      '확인 필요',
      '게시자',
      '초안',
      '미게시',
      'unsourced',
    ]) {
      expect(source).not.toContain(internal);
    }
  });
});
