import { describe, expect, it } from 'vitest';
import type { KoanSummary } from '@/types/insights/koan';
import {
  FOLD_FROM,
  FOLD_TO,
  getFoldProgress,
  getVisibleKoans,
  KOAN_INITIAL_VISIBLE_COUNT,
  KOAN_LOAD_MORE_COUNT,
  layoutIslandNodes,
  smoothFold,
  sortKoans,
} from './sprint8-v10-state';

const koan = (
  koanId: number,
  answerCount: number,
  publishedAt: string,
): KoanSummary => ({
  koanId,
  categorySlug: 'dep',
  categoryName: '배포·운영',
  question: `화두 ${koanId}`,
  answerCount,
  viewCount: 0,
  publishedAt,
});

describe('Sprint 8 v10 상태 계산', () => {
  it('최근순과 보완 많은 순을 원본 배열 변경 없이 정렬한다', () => {
    const input = [
      koan(1, 2, '2026-08-10T00:00:00+09:00'),
      koan(2, 7, '2026-08-09T00:00:00+09:00'),
      koan(3, 7, '2026-08-11T00:00:00+09:00'),
    ];

    expect(sortKoans(input, 'recent').map(({ koanId }) => koanId)).toEqual([
      3, 1, 2,
    ]);
    expect(sortKoans(input, 'answers').map(({ koanId }) => koanId)).toEqual([
      3, 2, 1,
    ]);
    expect(input.map(({ koanId }) => koanId)).toEqual([1, 2, 3]);
  });

  it('대량 데이터는 10건에서 시작해 10건 단위로 확장한다', () => {
    const input = Array.from({ length: 22 }, (_, index) =>
      koan(
        index + 1,
        index,
        `2026-08-${String(index + 1).padStart(2, '0')}T00:00:00+09:00`,
      ),
    );

    expect(getVisibleKoans(input, KOAN_INITIAL_VISIBLE_COUNT)).toHaveLength(10);
    expect(
      getVisibleKoans(input, KOAN_INITIAL_VISIBLE_COUNT + KOAN_LOAD_MORE_COUNT),
    ).toHaveLength(20);
    expect(getVisibleKoans(input, 30)).toHaveLength(22);
  });

  it('60~240px를 0~1로 제한하고 smoothstep 이징을 적용한다', () => {
    expect(getFoldProgress(FOLD_FROM - 1, false)).toBe(0);
    expect(getFoldProgress((FOLD_FROM + FOLD_TO) / 2, false)).toBe(0.5);
    expect(getFoldProgress(FOLD_TO + 1, false)).toBe(1);
    expect(smoothFold(0)).toBe(0);
    expect(smoothFold(0.5)).toBe(0.5);
    expect(smoothFold(1)).toBe(1);
  });

  it('움직임 감소 설정에서는 140px 단일 임계값을 쓴다', () => {
    expect(getFoldProgress(140, true)).toBe(0);
    expect(getFoldProgress(141, true)).toBe(1);
  });

  it('수심대 좌표는 모든 섬의 y를 엇물리고 뒤쪽 섬을 더 작게 둔다', () => {
    const layouts = layoutIslandNodes(
      [
        { band: 'far' as const, item: '프론트엔드' },
        { band: 'far' as const, item: '네트워크·보안' },
        { band: 'started' as const, item: '데이터베이스' },
        { band: 'started' as const, item: '협업·도구' },
        { band: 'opened' as const, item: '백엔드' },
        { band: 'opened' as const, item: '테스트·품질' },
        { band: 'here' as const, item: '배포·운영' },
      ],
      { desktop: true, height: 420, width: 1120 },
    );

    expect(new Set(layouts.map(({ y }) => y.toFixed(6))).size).toBe(
      layouts.length,
    );
    expect(layouts.find(({ band }) => band === 'far')?.size).toBeLessThan(
      layouts.find(({ band }) => band === 'here')?.size ?? 0,
    );
  });

  it.each([
    ['모바일 390', false, 350, 2080],
    ['데스크톱 1440', true, 1120, 800],
  ])('%s에서 섬 20개의 섬·라벨 경계상자가 겹치지 않는다', (_name, desktop, width, height) => {
    const layouts = layoutIslandNodes(
      [
        { band: 'here' as const, item: 1 },
        ...Array.from({ length: 2 }, (_, index) => ({
          band: 'opened' as const,
          item: index + 2,
        })),
        ...Array.from({ length: 2 }, (_, index) => ({
          band: 'started' as const,
          item: index + 4,
        })),
        ...Array.from({ length: 15 }, (_, index) => ({
          band: 'far' as const,
          item: index + 6,
        })),
      ],
      { desktop, height, width },
    );
    const boxes = layouts.map((layout) => ({
      bottom: layout.y * height + layout.boxHeight / 2,
      left: layout.x * width - layout.boxWidth / 2,
      right: layout.x * width + layout.boxWidth / 2,
      top: layout.y * height - layout.boxHeight / 2,
    }));

    expect(layouts).toHaveLength(20);
    expect(layouts.find(({ band }) => band === 'here')?.boxWidth).toBe(
      desktop ? 176 : 128,
    );
    boxes.forEach((box) => {
      expect(box.left).toBeGreaterThanOrEqual(0);
      expect(box.top).toBeGreaterThanOrEqual(0);
      expect(box.right).toBeLessThanOrEqual(width);
      expect(box.bottom).toBeLessThanOrEqual(height);
    });
    boxes.forEach((box, index) => {
      boxes.slice(index + 1).forEach((other) => {
        const overlaps =
          box.left < other.right &&
          box.right > other.left &&
          box.top < other.bottom &&
          box.bottom > other.top;

        expect(overlaps).toBe(false);
      });
    });
    if (!desktop) {
      expect(
        Math.max(...boxes.map(({ bottom }) => bottom)),
      ).toBeLessThanOrEqual(height / 2);
    }
  });

  it('20개가 한 수심대에 몰려도 실제 섬 20개를 모두 배치한다', () => {
    const layouts = layoutIslandNodes(
      Array.from({ length: 20 }, (_, index) => ({
        band: 'far' as const,
        item: index + 1,
      })),
      { desktop: false, height: 2080, width: 350 },
    );

    expect(layouts.map(({ item }) => item)).toEqual(
      Array.from({ length: 20 }, (_, index) => index + 1),
    );
    expect(Math.max(...layouts.map(({ row }) => row))).toBeGreaterThan(1);
  });
});
