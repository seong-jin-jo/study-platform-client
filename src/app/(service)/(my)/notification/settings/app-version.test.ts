import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { resolveAppBuildMetadata } from '@/lib/app-build-metadata';
import AppVersion from './app-version';

describe('WEB-VERSION-001 설정 화면 앱 버전', () => {
  it('운영 릴리스와 7자리 커밋 SHA를 보조 문구로 렌더한다', () => {
    const markup = renderToStaticMarkup(
      createElement(AppVersion, {
        metadata: resolveAppBuildMetadata({
          release: 'v0.11.1',
          commit: 'abc1234full',
          build_id: 'frontend-prod-1',
          built_at: '2026-10-03T12:00:00+09:00',
          channel: 'prod',
        }),
      }),
    );

    expect(markup).toContain('data-testid="app-version"');
    expect(markup).toContain('앱 버전 v0.11.1 (abc1234)');
  });

  it('릴리스 신원이 없으면 확인 불가를 숨기지 않는다', () => {
    const markup = renderToStaticMarkup(
      createElement(AppVersion, {
        metadata: resolveAppBuildMetadata({}),
      }),
    );

    expect(markup).toContain('앱 버전 확인 불가 (커밋 확인 불가)');
  });
});
