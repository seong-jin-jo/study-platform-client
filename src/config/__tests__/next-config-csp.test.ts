// 핫픽스(2026-09-17) 회귀 가드: CSP에 media-src 지시문이 없어 히어로 영상
// (blog.zeroone.it.kr 호스팅 mp4)이 default-src 'self' 로 떨어져 차단됐다.
// next.config.ts는 @sentry/nextjs + resolveStrapiDraftMode 등 모듈 로드
// 시점 부작용이 커서 실행 대신 소스 텍스트를 검증한다(이 repo의 next.config
// 관련 테스트가 텍스트 검증 방식을 쓰는 전례 없음 — 실행형 대안이 sandbox
// 환경변수 의존이라 더 깨지기 쉬워 텍스트 검증을 택했다).

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  join(__dirname, '..', '..', '..', 'next.config.ts'),
  'utf-8',
);

describe('CSP media-src (핫픽스 2026-09-17)', () => {
  it('cspDirectives 배열에 media-src 지시문이 존재하고 cspImgSrcHosts를 재사용한다', () => {
    expect(source).toMatch(
      /`media-src 'self' blob: data: \$\{cspImgSrcHosts\.join\(' '\)\}`/,
    );
  });

  it('CSP 헤더 블록이 하나뿐이며(Report-Only), media-src 추가가 그 한 곳에만 있으면 충분하다', () => {
    const enforcedHeaderCount = (
      source.match(/key: 'Content-Security-Policy'(?!-Report-Only)/g) ?? []
    ).length;
    const reportOnlyHeaderCount = (
      source.match(/key: 'Content-Security-Policy-Report-Only'/g) ?? []
    ).length;

    expect(reportOnlyHeaderCount).toBe(1);
    expect(enforcedHeaderCount).toBe(0);

    // media-src 지시문 자체는 cspDirectives 배열에 정확히 1번만 등장해야
    // 한다(중복 추가 방지).
    const mediaSrcCount = (source.match(/media-src 'self'/g) ?? []).length;
    expect(mediaSrcCount).toBe(1);
  });

  it('cspImgSrcHosts에 test-blog·blog 호스트가 둘 다 있어(media-src가 재사용하는 대상)', () => {
    const arrayMatch = source.match(
      /const cspImgSrcHosts = \[([\s\S]*?)\] as const;/,
    );
    expect(arrayMatch).not.toBeNull();
    const arrayBody = arrayMatch?.[1] ?? '';
    expect(arrayBody).toContain('https://test-blog.zeroone.it.kr');
    expect(arrayBody).toContain('https://blog.zeroone.it.kr');
  });
});
