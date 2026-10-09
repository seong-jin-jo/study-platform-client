import { describe, expect, it } from 'vitest';
import {
  APP_BUILD_VALUE_UNAVAILABLE,
  createAppIdentityHeaders,
  formatAppVersionLabel,
  resolveAppBuildMetadata,
} from './app-build-metadata';

describe('WEB-VERSION-003 런타임 빌드 신원', () => {
  it('릴리스·커밋·빌드 정보를 하나의 계약으로 정규화한다', () => {
    const metadata = resolveAppBuildMetadata({
      release: '0.11.1',
      commit: 'abc1234full',
      build_id: 'frontend-prod-20261003-1200-abc1234',
      built_at: '2026-10-03T12:00:00+09:00',
      channel: 'prod',
    });

    expect(metadata).toEqual({
      release: 'v0.11.1',
      commit: 'abc1234full',
      build_id: 'frontend-prod-20261003-1200-abc1234',
      built_at: '2026-10-03T12:00:00+09:00',
      channel: 'prod',
    });
    expect(createAppIdentityHeaders(metadata)).toEqual({
      'X-App-Version': 'v0.11.1',
      'X-App-Commit': 'abc1234full',
    });
    expect(formatAppVersionLabel(metadata)).toBe('앱 버전 v0.11.1 (abc1234)');
  });

  it('값이 없으면 package.json 값으로 위장하지 않고 명시적으로 표시한다', () => {
    const metadata = resolveAppBuildMetadata({});

    expect(metadata).toEqual({
      release: APP_BUILD_VALUE_UNAVAILABLE,
      commit: APP_BUILD_VALUE_UNAVAILABLE,
      build_id: APP_BUILD_VALUE_UNAVAILABLE,
      built_at: APP_BUILD_VALUE_UNAVAILABLE,
      channel: APP_BUILD_VALUE_UNAVAILABLE,
    });
    expect(formatAppVersionLabel(metadata)).toBe(
      '앱 버전 확인 불가 (커밋 확인 불가)',
    );
  });
});
