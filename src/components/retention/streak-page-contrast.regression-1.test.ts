import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Regression: S7-VIS-03 - 스트릭 히어로의 흰 글씨가 밝은 주황 구간에서
// 3.01:1까지 내려갔다.
// Found: 2026-08-15
// Report: .gstack/qa-reports/qa-report-test-zeroone-it-kr-2026-08-15.md

const readSource = (relativePath: string) =>
  readFileSync(join(process.cwd(), relativePath), 'utf8');

function token(css: string, name: string): string {
  const declarations = new Map<string, string>();
  for (const match of css.matchAll(/--([\w-]+):\s*([^;]+);/g)) {
    declarations.set(match[1], match[2].trim());
  }

  const resolve = (tokenName: string): string => {
    const value = declarations.get(tokenName);
    if (!value) throw new Error(`Missing CSS token: --${tokenName}`);

    const reference = value.match(/^var\(--([^)]+)\)$/);
    return reference ? resolve(reference[1]) : value;
  };

  return resolve(name);
}

function rgb(hex: string): [number, number, number] {
  const normalized = hex.replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(normalized)) {
    throw new Error(`Expected a six-digit hex color, received: ${hex}`);
  }
  return [0, 2, 4].map((offset) =>
    Number.parseInt(normalized.slice(offset, offset + 2), 16),
  ) as [number, number, number];
}

function rgba(value: string): [number, number, number, number] {
  const match = value.match(
    /^rgba\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)$/,
  );
  if (!match) throw new Error(`Expected an rgba color, received: ${value}`);
  return [
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
    Number(match[4]),
  ];
}

function luminance(color: [number, number, number]): number {
  const [red, green, blue] = color.map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrast(
  foreground: [number, number, number],
  background: [number, number, number],
): number {
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

function compositeOverlay(
  background: [number, number, number],
  overlay: [number, number, number, number],
  opacityMultiplier: number,
): [number, number, number] {
  const opacity = overlay[3] * opacityMultiplier;
  return background.map(
    (channel, index) => overlay[index] * opacity + channel * (1 - opacity),
  ) as [number, number, number];
}

function compositeText(
  foreground: [number, number, number],
  background: [number, number, number],
  opacity: number,
): [number, number, number] {
  return foreground.map(
    (channel, index) => channel * opacity + background[index] * (1 - opacity),
  ) as [number, number, number];
}

describe('스트릭 히어로 대비', () => {
  it('주황-분홍 그라디언트의 가장 밝은 지점도 4.5:1 이상을 유지한다', () => {
    const component = readSource('src/components/retention/streak-page.tsx');
    const css = readSource('src/app/global.css');
    const hero = component.slice(
      component.indexOf('{/* 스트릭 히어로 */}'),
      component.indexOf('{/* 사이드: 오늘 할 것 + 마일스톤 + 프리즈 */}'),
    );

    expect(hero).toContain('bg-linear-to-br from-orange-500 to-rose-500');
    expect(hero).toContain('absolute inset-0 z-0 bg-background-dimmer/50');
    expect(hero).toContain('text-text-inverse');
    expect(hero).not.toMatch(/(?:text-white|bg-black)(?:\/\d+)?/);

    const white = rgb(token(css, 'color-text-inverse'));
    const overlay = rgba(token(css, 'color-background-dimmer'));
    const gradientStops = [
      rgb(token(css, 'color-orange-500')),
      rgb(token(css, 'color-rose-500')),
    ];
    const renderedStops = gradientStops.map((stop) =>
      compositeOverlay(stop, overlay, 0.5),
    );
    const minimum = Math.min(
      ...renderedStops.map((stop) => contrast(white, stop)),
    );

    expect(minimum).toBeGreaterThanOrEqual(4.5);

    const alphaRatios = [1, 0.85, 0.7].map((opacity) =>
      Math.min(
        ...renderedStops.map((stop) =>
          contrast(compositeText(white, stop, opacity), stop),
        ),
      ),
    );
    expect(alphaRatios[0]).toBeGreaterThan(alphaRatios[1]);
    expect(alphaRatios[1]).toBeGreaterThan(alphaRatios[2]);
  });
});
