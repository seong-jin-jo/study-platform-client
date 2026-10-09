import type { NextConfig } from 'next';

export const BUILD_TARGETS = {
  APPINTOSS: 'appintoss',
  WEB: 'web',
} as const;

export type BuildTarget = (typeof BUILD_TARGETS)[keyof typeof BUILD_TARGETS];

export function resolveBuildTarget(value?: string): BuildTarget {
  if (value === BUILD_TARGETS.APPINTOSS) {
    return BUILD_TARGETS.APPINTOSS;
  }

  return BUILD_TARGETS.WEB;
}

export function applyBuildTarget(
  baseConfig: NextConfig,
  target: BuildTarget,
): NextConfig {
  if (target === BUILD_TARGETS.WEB) {
    return baseConfig;
  }

  const staticCompatibleConfig = { ...baseConfig };
  delete staticCompatibleConfig.headers;
  delete staticCompatibleConfig.rewrites;
  delete staticCompatibleConfig.redirects;

  return {
    ...staticCompatibleConfig,
    // Keep Next's default distDir. In Next 16, a custom distDir is reused as
    // the output: "export" directory, while the packager contract consumes
    // the conventional projection-local out/ tree.
    images: {
      ...baseConfig.images,
      unoptimized: true,
    },
    output: 'export',
    trailingSlash: true,
  };
}
