import type { KoanSummary } from '@/types/insights/koan';

export type KoanSort = 'recent' | 'answers';

export const KOAN_INITIAL_VISIBLE_COUNT = 10;
export const KOAN_LOAD_MORE_COUNT = 10;
export const KOAN_QUERY_SIZE = 100;
export const FOLD_FROM = 60;
export const FOLD_TO = 240;
export const REDUCED_MOTION_FOLD_POINT = 140;

export type IslandBand = 'here' | 'opened' | 'started' | 'far';

export interface IslandLayoutSource<T> {
  band: IslandBand;
  item: T;
}

export interface IslandLayoutItem<T> {
  band: IslandBand;
  boxHeight: number;
  boxWidth: number;
  item: T;
  key: string;
  row: number;
  scale: number;
  size: number;
  x: number;
  y: number;
}

export const ISLAND_LAYOUT_LIMIT = 20;
export const ISLAND_EXPANDED_COUNT = 7;
export const ISLAND_DENSE_COUNT = 15;

const ISLAND_BANDS = {
  here: { y: 0.84, span: 0, size: [118, 176], rows: 1, gap: [0, 0] },
  opened: {
    y: 0.51,
    span: 0.66,
    size: [70, 104],
    rows: 2,
    gap: [112, 138],
  },
  started: {
    y: 0.36,
    span: 0.8,
    size: [54, 80],
    rows: 2,
    gap: [112, 130],
  },
  far: {
    y: 0.2,
    span: 0.94,
    size: [40, 58],
    rows: 2,
    gap: [112, 132],
  },
} as const;

const ISLAND_BAND_ORDER: IslandBand[] = ['far', 'started', 'opened', 'here'];
const ISLAND_ROW_GAP = 24;
const ISLAND_BAND_GAP = 16;
const ISLAND_MAP_EDGE = 24;
const ISLAND_CELL_WIDTH = [96, 120] as const;
const ISLAND_MOBILE_ACTIVE_LABEL_WIDTH = 128;
const ISLAND_MOBILE_DENSE_Y: Record<IslandBand, number> = {
  far: 0.12,
  started: 0.24,
  opened: 0.34,
  here: 0.45,
};

const getIslandBox = (band: IslandBand, desktop: boolean, size: number) => ({
  boxHeight: size + (band === 'here' ? (desktop ? 40 : 56) : 32),
  boxWidth: Math.max(
    ISLAND_CELL_WIDTH[desktop ? 1 : 0],
    band === 'here' && !desktop ? ISLAND_MOBILE_ACTIVE_LABEL_WIDTH : 0,
    size,
  ),
});

export function layoutIslandNodes<T>(
  sources: ReadonlyArray<IslandLayoutSource<T>>,
  {
    desktop,
    height,
    width,
  }: { desktop: boolean; height: number; width: number },
): IslandLayoutItem<T>[] {
  const groups: Record<IslandBand, IslandLayoutSource<T>[]> = {
    here: [],
    opened: [],
    started: [],
    far: [],
  };

  sources.slice(0, ISLAND_LAYOUT_LIMIT).forEach((source) => {
    groups[source.band].push(source);
  });

  while (groups.here.length > 1) {
    const overflow = groups.here.pop();
    if (overflow) groups.opened.unshift({ ...overflow, band: 'opened' });
  }

  const expanded = sources.length >= ISLAND_EXPANDED_COUNT;
  const denseMobile = !desktop && sources.length >= ISLAND_DENSE_COUNT;
  const rowGap = denseMobile ? 48 : ISLAND_ROW_GAP;
  const bandGap = denseMobile ? 32 : ISLAND_BAND_GAP;
  let nextBandTop = ISLAND_MAP_EDGE;

  return ISLAND_BAND_ORDER.flatMap((band) => {
    const config = ISLAND_BANDS[band];
    const list = groups[band];
    if (list.length === 0) return [];

    const span = band === 'here' ? 0 : config.span;
    const usableWidth = width * span;
    const gap = config.gap[desktop ? 1 : 0] || 100;
    const perRow =
      band === 'here' ? 1 : Math.max(2, Math.floor(usableWidth / gap) + 1);
    const rowCount = Math.ceil(list.length / perRow);
    const rows = list.length > perRow ? Math.max(config.rows, rowCount) : 1;
    const shrink = Math.max(0.72, 1 - Math.max(0, list.length - 3) * 0.045);
    const baseSize = config.size[desktop ? 1 : 0];

    if (!expanded) {
      return list.map((source, index) => {
        const row = rows === 1 ? 0 : index % rows;
        const inRow = Math.ceil((list.length - row) / rows);
        const indexInRow = Math.floor(index / rows);
        let x = 0.5;

        if (band !== 'here' && list.length > 1) {
          const step = span / Math.max(1, inRow);
          x = 0.5 - span / 2 + step * (indexInRow + 0.5);
          if (row === 1) x += (step / 2) * 0.34;
        }

        const scale = (band === 'here' ? 1 : shrink) * (row === 1 ? 0.88 : 1);
        const size = baseSize * scale;
        const rowLift = row === 1 ? (size + 22) / height : 0;
        const perspectiveStagger =
          inRow > 1 ? ((indexInRow - (inRow - 1) / 2) * 8) / height : 0;

        return {
          band,
          ...getIslandBox(band, desktop, size),
          item: source.item,
          key: `${band}-${index}`,
          row,
          scale,
          size,
          x,
          y: config.y - rowLift + perspectiveStagger,
        };
      });
    }

    const rowBoxes = Array.from({ length: rowCount }, (_, row) => {
      const scale = (band === 'here' ? 1 : shrink) * (row === 0 ? 1 : 0.88);
      const size = baseSize * scale;

      return { scale, size, ...getIslandBox(band, desktop, size) };
    });
    const bandHeight = rowBoxes.reduce(
      (total, box, row) => total + box.boxHeight + (row > 0 ? rowGap : 0),
      0,
    );
    const bandY = denseMobile ? ISLAND_MOBILE_DENSE_Y[band] : config.y;
    const desiredBandTop = bandY * height - bandHeight / 2;
    let rowTop = Math.max(ISLAND_MAP_EDGE, nextBandTop, desiredBandTop);
    const layouts: IslandLayoutItem<T>[] = [];

    rowBoxes.forEach((box, row) => {
      const rowItems = list.slice(row * perRow, (row + 1) * perRow);
      const step = band === 'here' ? 0 : span / Math.max(1, rowItems.length);

      rowItems.forEach((source, indexInRow) => {
        let x = 0.5;

        if (band !== 'here' && rowItems.length > 1) {
          x = 0.5 - span / 2 + step * (indexInRow + 0.5);
          if (row % 2 === 1) x += step * 0.17;
        }

        const halfBoxRatio = box.boxWidth / width / 2;
        x = Math.max(halfBoxRatio, Math.min(1 - halfBoxRatio, x));
        const perspectiveStagger =
          rowItems.length > 1
            ? (indexInRow / (rowItems.length - 1) - 0.5) * 16
            : 0;

        layouts.push({
          band,
          ...box,
          item: source.item,
          key: `${band}-${row * perRow + indexInRow}`,
          row,
          x,
          y: (rowTop + box.boxHeight / 2 + perspectiveStagger) / height,
        });
      });

      rowTop += box.boxHeight + rowGap;
    });

    nextBandTop = rowTop - rowGap + bandGap;

    return layouts;
  });
}

export function sortKoans(koans: ReadonlyArray<KoanSummary>, sort: KoanSort) {
  if (sort === 'answers') {
    return [...koans].sort((left, right) => {
      const answerDelta = right.answerCount - left.answerCount;

      return answerDelta || right.publishedAt.localeCompare(left.publishedAt);
    });
  }

  return [...koans].sort((left, right) =>
    right.publishedAt.localeCompare(left.publishedAt),
  );
}

export function getVisibleKoans(
  koans: ReadonlyArray<KoanSummary>,
  requestedCount: number,
) {
  return koans.slice(0, Math.max(KOAN_INITIAL_VISIBLE_COUNT, requestedCount));
}

export function getFoldProgress(scrollY: number, reducedMotion: boolean) {
  if (reducedMotion) {
    return scrollY > REDUCED_MOTION_FOLD_POINT ? 1 : 0;
  }

  return Math.max(
    0,
    Math.min(1, (scrollY - FOLD_FROM) / (FOLD_TO - FOLD_FROM)),
  );
}

export function smoothFold(progress: number) {
  return progress * progress * (3 - 2 * progress);
}
