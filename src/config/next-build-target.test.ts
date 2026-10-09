import { describe, expect, it } from 'vitest';
import {
  applyBuildTarget,
  BUILD_TARGETS,
  resolveBuildTarget,
} from './next-build-target';

describe('App-in-Toss Next.js build target contract', () => {
  it('AIT-NC-01 웹 기본 빌드는 기존 설정 객체를 그대로 반환한다', () => {
    const baseConfig = {
      images: { minimumCacheTTL: 60 },
      output: 'standalone' as const,
      skipProxyUrlNormalize: true,
    };

    const result = applyBuildTarget(baseConfig, BUILD_TARGETS.WEB);

    expect(result).toBe(baseConfig);
    expect(result).toEqual(baseConfig);
  });

  it('AIT-NC-02 앱인토스 빌드만 정적 출력과 이미지 비최적화를 적용한다', () => {
    const headers = async () => [];
    const rewrites = async () => [];
    const baseConfig = {
      headers,
      images: { minimumCacheTTL: 60 },
      output: 'standalone' as const,
      rewrites,
    };

    expect(applyBuildTarget(baseConfig, BUILD_TARGETS.APPINTOSS)).toMatchObject(
      {
        images: { minimumCacheTTL: 60, unoptimized: true },
        output: 'export',
        trailingSlash: true,
      },
    );
    expect(
      applyBuildTarget(baseConfig, BUILD_TARGETS.APPINTOSS),
    ).not.toHaveProperty('distDir');
    expect(
      applyBuildTarget(baseConfig, BUILD_TARGETS.APPINTOSS),
    ).not.toHaveProperty('headers');
    expect(
      applyBuildTarget(baseConfig, BUILD_TARGETS.APPINTOSS),
    ).not.toHaveProperty('rewrites');
  });

  it('AIT-M2-01 Storybook과 외부 도구의 빌드 대상 값은 웹 기본값을 바꾸지 않는다', () => {
    expect(resolveBuildTarget('test')).toBe(BUILD_TARGETS.WEB);
    expect(resolveBuildTarget('mobile')).toBe(BUILD_TARGETS.WEB);
    expect(resolveBuildTarget(undefined)).toBe(BUILD_TARGETS.WEB);
  });
});
