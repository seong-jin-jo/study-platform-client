import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Regression: S7-VIS-02 - "답변 달리는 중" 배지가 3.31:1에 머물렀다.
// Found by /qa on 2026-08-15
// Report: .gstack/qa-reports/qa-report-test-zeroone-it-kr-2026-08-15.md

const readSource = (relativePath: string) =>
  readFileSync(join(process.cwd(), relativePath), 'utf8');

function resolveHexToken(css: string, name: string): string {
  const declarations = new Map<string, string>();
  for (const match of css.matchAll(/--([\w-]+):\s*([^;]+);/g)) {
    declarations.set(match[1], match[2].trim());
  }

  const resolve = (tokenName: string): string => {
    const value = declarations.get(tokenName);
    expect(value, `${tokenName} 토큰이 global.css에 있어야 한다`).toBeTruthy();
    const reference = value?.match(/^var\(--([^)]+)\)$/)?.[1];
    return reference ? resolve(reference) : (value ?? '');
  };

  return resolve(name);
}

function relativeLuminance(hex: string): number {
  const channels = hex
    .replace('#', '')
    .match(/.{2}/g)
    ?.map((channel) => parseInt(channel, 16) / 255);
  expect(channels, `${hex}는 6자리 hex 색상이어야 한다`).toHaveLength(3);
  const [red, green, blue] = (channels ?? []).map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(foreground: string, background: string): number {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

describe('홈 피드 답변 배지 대비', () => {
  it('기존 토큰만으로 일반 텍스트 기준 4.5:1 이상을 유지한다', () => {
    const component = readSource(
      'src/components/common/cards/home-feed-card.tsx',
    );
    const css = readSource('src/app/global.css');

    expect(component).toContain(
      'bg-background-accent-rose-subtle px-125 py-50 text-text-brand-strong',
    );

    const ratio = contrastRatio(
      resolveHexToken(css, 'color-text-brand-strong'),
      resolveHexToken(css, 'color-background-accent-rose-subtle'),
    );
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });
});
