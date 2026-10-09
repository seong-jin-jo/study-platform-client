import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  computeHorizonOffsetPx,
  getResponsiveIslandMapStyle,
  getResponsiveIslandNodeStyle,
  SCATTER_HORIZON_PAD,
  SCATTER_PHOTO_HEIGHT,
  SCATTER_PHOTO_WIDTH,
  type IslandLayoutResult,
  layoutIslandNodes,
} from './sprint8-v10-island-layout';

describe('Sprint 8 v10 island geometry', () => {
  const expectNoIntersectionOrClipping = (
    result: IslandLayoutResult<number>,
    width: number,
  ) => {
    const { items: layouts, requiredHeight: height } = result;
    const boxes = layouts.map((layout) => ({
      bottom: layout.y * height + layout.boxHeight / 2,
      left: layout.x * width - layout.boxWidth / 2,
      right: layout.x * width + layout.boxWidth / 2,
      top: layout.y * height - layout.boxHeight / 2,
    }));

    boxes.forEach((box, index) => {
      if (
        box.left < 0 ||
        box.top < 0 ||
        box.right > width ||
        box.bottom > height
      ) {
        throw new Error(
          `island ${index} clips: ${JSON.stringify({ box, height, width })}`,
        );
      }
      boxes.slice(index + 1).forEach((other, otherIndex) => {
        const intersects =
          box.left < other.right &&
          box.right > other.left &&
          box.top < other.bottom &&
          box.bottom > other.top;

        if (intersects) {
          throw new Error(
            `islands ${index} and ${index + otherIndex + 1} intersect: ${JSON.stringify({ box, other })}`,
          );
        }
      });
    });
  };

  it('390px에서 opened 3개가 포함된 승인 fixture 9개 경계상자가 겹치지 않는다', () => {
    const width = 350;
    const layouts = layoutIslandNodes(
      [
        { band: 'here' as const, item: 1 },
        { band: 'opened' as const, item: 2 },
        { band: 'opened' as const, item: 3 },
        { band: 'opened' as const, item: 4 },
        { band: 'started' as const, item: 5 },
        ...Array.from({ length: 4 }, (_, index) => ({
          band: 'far' as const,
          item: index + 6,
        })),
      ],
      { desktop: false, height: 322, width },
    );

    expect(layouts.items).toHaveLength(9);
    expectNoIntersectionOrClipping(layouts, width);
  });

  it('390px dense 15개는 1200px map 안에서 교차와 clipping이 없다', () => {
    const width = 350;
    const layouts = layoutIslandNodes(
      [
        { band: 'here' as const, item: 1 },
        ...Array.from({ length: 3 }, (_, index) => ({
          band: 'opened' as const,
          item: index + 2,
        })),
        ...Array.from({ length: 3 }, (_, index) => ({
          band: 'started' as const,
          item: index + 5,
        })),
        ...Array.from({ length: 8 }, (_, index) => ({
          band: 'far' as const,
          item: index + 8,
        })),
      ],
      { desktop: false, height: 322, width },
    );

    expect(layouts.items).toHaveLength(15);
    expectNoIntersectionOrClipping(layouts, width);
  });

  it.each([
    ['390px', false, 350, 322],
    ['1024px', true, 984, 420],
  ] as const)('%s total 1~20의 모든 band 분포는 산출 높이 안에서 교차와 clipping이 없다', (_name, desktop, width, height) => {
    for (let total = 1; total <= 20; total += 1) {
      const remaining = total - 1;
      for (let opened = 0; opened <= remaining; opened += 1) {
        for (let started = 0; started <= remaining - opened; started += 1) {
          const far = remaining - opened - started;
          const sources = [
            { band: 'here' as const, item: 1 },
            ...Array.from({ length: opened }, (_, index) => ({
              band: 'opened' as const,
              item: index + 2,
            })),
            ...Array.from({ length: started }, (_, index) => ({
              band: 'started' as const,
              item: index + opened + 2,
            })),
            ...Array.from({ length: far }, (_, index) => ({
              band: 'far' as const,
              item: index + opened + started + 2,
            })),
          ];
          const result = layoutIslandNodes(sources, {
            desktop,
            height,
            width,
          });

          if (result.items.length !== total) {
            throw new Error(
              `expected ${total} islands, received ${result.items.length}`,
            );
          }
          expectNoIntersectionOrClipping(result, width);
        }
      }
    }
  });

  it('requiredHeight는 입력 최소 높이보다 작아지지 않는다', () => {
    const result = layoutIslandNodes([{ band: 'here' as const, item: 1 }], {
      desktop: false,
      height: 322,
      width: 350,
    });

    expect(result.requiredHeight).toBeGreaterThanOrEqual(322);
  });

  it('첫 HTML에 mobile·desktop map과 island 위치 변수를 직렬화한다', () => {
    const mobile = layoutIslandNodes([{ band: 'here' as const, item: 1 }], {
      desktop: false,
      height: 322,
      width: 350,
    });
    const desktop = layoutIslandNodes([{ band: 'here' as const, item: 1 }], {
      desktop: true,
      height: 420,
      width: 984,
    });
    const html = renderToStaticMarkup(
      createElement(
        'div',
        {
          style: getResponsiveIslandMapStyle(
            mobile.requiredHeight,
            desktop.requiredHeight,
          ),
        },
        createElement('button', {
          type: 'button',
          style: getResponsiveIslandNodeStyle(
            mobile.items[0],
            desktop.items[0],
          ),
        }),
      ),
    );

    expect(html).toContain('--island-map-height:');
    expect(html).toContain('--island-map-height-desktop:');
    expect(html).toContain('--island-x:');
    expect(html).toContain('--island-x-desktop:');
    expect(html).toContain('--island-y-desktop:');
  });

  // O-28 = A(2026-08-23 회장 결정 "사진에서 바다 위에 띄워놓도록 흩뿌려") 이후
  // 수평선 추적 하늘 몫. 프로토타입 horizonTop() 과 같은 식이어야 한다(명세 §17.5, §17.7 #10).
  describe('수평선 추적 (computeHorizonOffsetPx)', () => {
    it('무대가 사진보다 상대적으로 넓으면(cover가 세로를 기준삼음) 상하 여백이 생기고 그만큼 세로 위치가 반영된다', () => {
      // 사진 원본비(673:900)보다 무대가 훨씬 넓은 경우(1440x400) → cover 스케일은
      // 가로 기준이 되고, 세로에는 잘리지 않는 여백이 생겨 position(0.26)이 그대로 반영된다.
      const stageWidth = 1440;
      const stageHeight = 400;
      const scale = stageWidth / SCATTER_PHOTO_WIDTH;
      const imageHeight = SCATTER_PHOTO_HEIGHT * scale;
      const expected = (stageHeight - imageHeight) * 0.26 + imageHeight * 0.18;

      const actual = computeHorizonOffsetPx({
        desktop: true,
        stageHeight,
        stageWidth,
      });

      expect(actual).toBeCloseTo(expected, 5);
    });

    it('모바일(12%)과 데스크톱(26%) 은 같은 무대 크기에서도 다른 수평선 위치를 낸다', () => {
      const stageWidth = 800;
      const stageHeight = 700;

      const mobile = computeHorizonOffsetPx({
        desktop: false,
        stageHeight,
        stageWidth,
      });
      const desktop = computeHorizonOffsetPx({
        desktop: true,
        stageHeight,
        stageWidth,
      });

      expect(mobile).not.toBeCloseTo(desktop, 5);
    });

    it('무대 폭이나 높이가 0이어도 NaN이나 음수를 내지 않는다(거절 조건)', () => {
      const zeroWidth = computeHorizonOffsetPx({
        desktop: false,
        stageHeight: 672,
        stageWidth: 0,
      });
      const zeroHeight = computeHorizonOffsetPx({
        desktop: false,
        stageHeight: 0,
        stageWidth: 390,
      });

      expect(Number.isFinite(zeroWidth)).toBe(true);
      expect(Number.isFinite(zeroHeight)).toBe(true);
    });
  });

  describe('layoutIslandNodes 의 skyOffsetPx (수평선 실측 하늘 몫)', () => {
    it('실측 skyOffsetPx 를 넘기면 그 값을 하늘 몫으로 쓰고, 20곳이 겹치거나 지도 밖으로 나가지 않는다', () => {
      const width = 350;
      const stageWidth = 390;
      const stageHeight = 892; // 명세 §17.5 실측: 모바일 20곳 수평선 추적 시 +90px
      const skyOffsetPx =
        computeHorizonOffsetPx({
          desktop: false,
          stageHeight,
          stageWidth,
        }) + SCATTER_HORIZON_PAD;

      const sources = [
        { band: 'here' as const, item: 1 },
        ...Array.from({ length: 19 }, (_, index) => ({
          band: 'far' as const,
          item: index + 2,
        })),
      ];
      const result = layoutIslandNodes(sources, {
        desktop: false,
        height: 322,
        skyOffsetPx,
        width,
      });

      expect(result.items).toHaveLength(20);
      expectNoIntersectionOrClipping(result, width);
      // 하늘 몫을 준 만큼 지도가 자란다. 6% 고정 폴백(≈ 322*0.06)보다 크게 잡았으므로
      // requiredHeight 가 폴백보다 커야 한다(고정 6% 로는 못 따라가던 문제의 재발 확인).
      const fallback = layoutIslandNodes(sources, {
        desktop: false,
        height: 322,
        width,
      });
      expect(result.requiredHeight).toBeGreaterThan(fallback.requiredHeight);
    });

    it('skyOffsetPx 가 음수여도 0으로 바닥을 잡아 겹침·클리핑이 없다(거절 조건)', () => {
      const width = 350;
      const sources = [
        { band: 'here' as const, item: 1 },
        ...Array.from({ length: 7 }, (_, index) => ({
          band: 'far' as const,
          item: index + 2,
        })),
      ];
      const result = layoutIslandNodes(sources, {
        desktop: false,
        height: 322,
        skyOffsetPx: -50,
        width,
      });

      expect(result.items).toHaveLength(8);
      expectNoIntersectionOrClipping(result, width);
    });
  });
});
