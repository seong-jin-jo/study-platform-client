import { marked } from 'marked';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * 공개용 개인정보처리방침 파일. scripts/sync-privacy-policy.mjs 가 회장 승인 원천 md 에서
 * "공지 블록(2-1)"과 "1절 전문"만 뽑아 만든 것이다(이 저장소는 공개라 내부 메모는 두지 않는다).
 * 문안을 여기나 화면에 다시 쓰지 않는다. 문안이 바뀌면 원천을 고치고 스크립트를 다시 돌린다.
 */
export const PRIVACY_POLICY_SOURCE_PATH = path.join(
  process.cwd(),
  'src/content/privacy/privacy-policy-v1.0.md',
);

/** 현재 시행 중인 v0.3 방침(Notion). v1.0 시행일 전날까지 유효하다. */
export const PRIVACY_POLICY_V03_URL =
  'https://gaan.notion.site/389fbb391d798087a519cda1255fdfc1';

/** 전문 영역의 앵커. 공지 블록의 "개정 전문 보기"가 가리킨다(스크립트가 같은 값으로 채운다). */
export const PRIVACY_POLICY_V1_ANCHOR = 'policy-v1-0';

const between = (source: string, name: 'notice' | 'policy'): string => {
  const start = `<!-- ${name}:start -->`;
  const end = `<!-- ${name}:end -->`;
  const from = source.indexOf(start);
  const to = source.indexOf(end);
  if (from === -1 || to === -1 || to < from) {
    throw new Error(
      `개인정보처리방침 파일에서 ${name} 구간을 찾지 못했습니다.`,
    );
  }
  const text = source.slice(from + start.length, to).trim();
  if (!text) {
    throw new Error(`개인정보처리방침 파일의 ${name} 구간이 비어 있습니다.`);
  }
  return text;
};

export const extractNotice = (source: string): string =>
  between(source, 'notice');

export const extractPolicyBody = (source: string): string =>
  between(source, 'policy');

/** 신뢰하는 저장소 안 파일만 렌더한다(GFM 표 포함). 외부 입력에는 쓰지 않는다. */
export const renderMarkdown = (markdown: string): string =>
  marked.parse(markdown, { gfm: true, async: false });

export const readPrivacyPolicySource = (): string =>
  readFileSync(PRIVACY_POLICY_SOURCE_PATH, 'utf8');
