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

export interface IslandLayoutResult<T> {
  items: IslandLayoutItem<T>[];
  requiredHeight: number;
}

export const getResponsiveIslandMapStyle = (
  mobileHeight: number,
  desktopHeight: number,
) => ({
  '--island-map-height': `${mobileHeight}px`,
  '--island-map-height-desktop': `${desktopHeight}px`,
});

export const getResponsiveIslandNodeStyle = <T>(
  mobile: IslandLayoutItem<T>,
  desktop: IslandLayoutItem<T>,
) => ({
  '--island-scale': mobile.scale.toFixed(3),
  '--island-scale-desktop': desktop.scale.toFixed(3),
  '--island-x': `${(mobile.x * 100).toFixed(2)}%`,
  '--island-x-desktop': `${(desktop.x * 100).toFixed(2)}%`,
  '--island-y': `${(mobile.y * 100).toFixed(2)}%`,
  '--island-y-desktop': `${(desktop.y * 100).toFixed(2)}%`,
  // 배정된 칸 폭. 섬 이름이 이 폭을 넘지 못하게 묶는 데 쓴다.
  //
  // 밴드를 두 줄로 묶으면서 칸이 좁아졌는데, 이름표는 `max-width: 11em`(=132px)
  // 그대로라 칸 밖으로 퍼져 서로 겹쳤다. 20곳 모바일에서 이름이 통째로 뭉개져
  // 한 글자도 못 읽는 화면이 나왔다(2026-08-22 dev 실측).
  // 단위테스트는 버튼 상자만 봤기 때문에 이 겹침을 못 잡았다.
  // 섬 그림 크기도 레이아웃이 정한다. 예전에는 CSS 가 밴드별로 크기를 달리 줬는데
  // (개척한 땅은 크게, 먼 땅은 작게), 회장이 "크기 상관없이 똑같은 위계"로 정했다
  // (2026-08-22). 그래서 크기를 한 곳에서 계산해 내려보내고 CSS 는 그대로 쓴다.
  '--island-size': `${Math.round(mobile.size)}px`,
  '--island-size-desktop': `${Math.round(desktop.size)}px`,
  '--island-cell': `${Math.round(mobile.boxWidth)}px`,
  '--island-cell-desktop': `${Math.round(desktop.boxWidth)}px`,
});

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
/**
 * `crowd` 는 한 줄에 자연 수용량보다 많이 밀어 넣었을 때의 축소 비율이다(1 = 안 밀어 넣음).
 *
 * 셀 폭에는 `ISLAND_CELL_WIDTH` 하한이 걸려 있다. 섬 그림만 줄이고 이 하한을 그대로 두면
 * 박스가 96px 아래로 안 내려가서 옆 섬과 겹친다(2026-08-21 단위테스트로 확인:
 * "islands 0 and 1 intersect"). 밀어 넣은 만큼 하한도 같이 좁혀야 두 줄 안에 들어간다.
 */
const getIslandBox = (
  band: IslandBand,
  desktop: boolean,
  size: number,
  crowd = 1,
  cellLimit = Number.POSITIVE_INFINITY,
) => {
  const boxWidth = Math.max(
    ISLAND_CELL_WIDTH[desktop ? 1 : 0] * crowd,
    band === 'here' && !desktop ? ISLAND_MOBILE_ACTIVE_LABEL_WIDTH : 0,
    size,
  );

  return {
    boxHeight: size + (band === 'here' ? (desktop ? 40 : 56) : 32),
    // 실제로 배정된 칸보다 넓은 상자는 옆 섬을 침범한다. 축소 하한에 걸려 폭이
    // 더 안 줄어드는 경우가 있어(2026-08-21 단위테스트 실측 1.8px 겹침),
    // 마지막에 배정 칸 폭으로 잘라 준다. 6% 는 라벨이 서로 닿지 않게 두는 여백이다.
    boxWidth: Math.min(boxWidth, cellLimit * 0.94),
  };
};

/**
 * 섬 배치 = **바다 위에 흩뿌리기** (회장 결정 2026-08-22).
 *
 * 회장 지시 원문: "한 화면에서 섬 다 보이도록 해. 똑같은 위계로 화면에서 다 보여주는거지
 * 크기 상관없이 그냥 여기저기 섬이 바다위에 떠있고 클릭해서 들어가볼 수 있도록.
 * 정렬하지않고 사진 상의 바닷가 지점에 여기저기 랜덤으로 뿌려져있으면 더 자연스러울듯."
 *
 * 그래서 예전 규칙을 버린다.
 *  - 개척 상태로 세로축을 나누던 밴드(가까움/멂) → **없앤다. 전부 같은 크기·같은 선명도.**
 *  - 행과 열로 줄 맞추던 격자 → **없앤다. 자리마다 흩어 놓는다.**
 *
 * 왜 바꿨나: 격자로 두 줄에 20곳을 욱여넣으니 한 칸이 39px 이 되어 섬 이름이
 * 세 글자에서 잘렸다("수평..." 다섯 개가 서로 구분이 안 됐다, 2026-08-22 dev 실측).
 * 흩뿌리면 같은 넓이를 더 알뜰하게 쓰므로 이름이 들어갈 칸을 확보할 수 있다.
 *
 * 지켜야 할 것 넷.
 *  1. 섬이 **전부** 보인다(접거나 버리지 않는다).
 *  2. 서로 **겹치지 않는다**(이름표까지).
 *  3. 지도 밖으로 **나가지 않는다**.
 *  4. **같은 입력이면 같은 배치**가 나온다. 새로고침마다 섬이 춤추면 못 쓴다.
 *     그래서 진짜 난수를 쓰지 않고 자리 번호로 씨앗을 만든 의사난수를 쓴다.
 *     (`Math.random` 은 서버·클라이언트 렌더가 어긋나 화면이 튄다.)
 *
 * 자리를 못 찾으면 씨앗을 바꿔 다시 돌리고, 그래도 안 되면 지도를 세로로 늘린다.
 * 늘리는 것이 겹치는 것보다 낫다.
 */

/** 자리 번호로 만드는 의사난수. 같은 씨앗이면 늘 같은 수열이 나온다. */
const seededRandom = (seed: number) => {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/**
 * 섬 하나가 차지하는 상자. 밴드에 상관없이 전부 같다(회장: "크기 상관없이").
 *
 * ★ 이 값은 화면에 실제로 그려지는 버튼 크기와 같아야 한다.
 * 예전에는 레이아웃이 62px 로 계산하는데 CSS 가 96px(`--spacing-1200`)로 그려서,
 * 단위테스트는 통과하는데 실제 화면에서는 섬이 겹쳤다(2026-08-22 CI e2e: "섬 버튼 8·20 겹침").
 * 그래서 지금은 레이아웃이 `--island-cell` 로 폭을 내려보내고 CSS 가 그걸 그대로 쓴다.
 */
const SCATTER_ART = [30, 58] as const;
const SCATTER_BOX_WIDTH = [60, 104] as const;
/** 이름표 두 줄 + 버튼 안쪽 여백. */
const SCATTER_LABEL_HEIGHT = [38, 40] as const;
/** 상자 사이 최소 여백. 0 이면 이름표가 서로 닿아 읽기 힘들다. */
const SCATTER_GAP = [6, 10] as const;
/** 지도 가장자리 여백. */
const SCATTER_EDGE = 8;
/**
 * 수평선과 하늘이 있는 위쪽은 살짝 비운다. 배경 사진에서 바다가 아닌 구간이다.
 *
 * ★ v1.2.0 부터 이 비율은 **DOM 을 측정하기 전의 폴백값**일 뿐이다(O-28 = A,
 * 2026-08-23 회장 결정 "사진에서 바다 위에 띄워놓도록 흩뿌려"). 배경 사진은
 * `background-size: cover` 라 무대가 높아지면 사진이 확대되고 수평선도 같이
 * 내려가는데, 고정 비율은 그 움직임을 못 따라가 모바일에서 최대 4곳이 수평선
 * 위 하늘에 떠 있었다(명세 §17.5 실측). 그래서 실제 렌더 후에는
 * {@link computeHorizonOffsetPx} 로 실측한 값을 `skyOffsetPx` 로 넘겨 이 비율을
 * 대체한다. 최초 렌더(측정 전)와 테스트에서만 이 폴백이 쓰인다.
 */
const SCATTER_SKY_RATIO = 0.06;

/**
 * 줄 간격을 상자보다 조금 넉넉히 잡는다. 딱 맞게 잡으면 위아래로 흔들 여지가 0이라
 * 섬이 줄마다 같은 높이에 서서 자로 그은 것처럼 보인다(2026-08-23 모바일 실측).
 */
const SCATTER_JITTER_ROOM = 1.14;

/** 배경 사진(`bg-web.jpg`) 원본 크기. 수평선 위치 계산의 기준이다. */
export const SCATTER_PHOTO_WIDTH = 673;
export const SCATTER_PHOTO_HEIGHT = 900;
/** 노을 띠(수평선)는 원본 사진 세로의 18% 지점이다(2026-08-23 실측, 명세 §17.5). */
const SCATTER_HORIZON_FRAC = 0.18;
/** 수평선 바로 위 섬 상자 top 이 사진과 맞닿지 않게 두는 여유. */
export const SCATTER_HORIZON_PAD = 6;
/** `background-position: center 12%`(모바일) / `center 26%`(1024 이상). */
const SCATTER_PHOTO_POSITION_Y = [0.12, 0.26] as const;

/**
 * 프로토타입 `horizonTop()` 과 같은 식이다(`sprint8-sea-scatter-v12-opus5.html`).
 *
 * 배경 사진은 `cover` 로 깔린다. `stageWidth`·`stageHeight` 는 배경이 실제로
 * 덮는 상자(`.seaStage`, 헤더 줄 + 지도 + 오늘의 화두를 전부 포함한 실측값)다.
 * 반환값은 그 상자의 top 을 0 으로 뒀을 때 수평선까지의 세로 거리(px)다.
 */
export function computeHorizonOffsetPx({
  desktop,
  stageHeight,
  stageWidth,
}: {
  desktop: boolean;
  stageHeight: number;
  stageWidth: number;
}): number {
  const positionY = SCATTER_PHOTO_POSITION_Y[desktop ? 1 : 0];
  const scale = Math.max(
    stageWidth / SCATTER_PHOTO_WIDTH,
    stageHeight / SCATTER_PHOTO_HEIGHT,
  );
  const imageHeight = SCATTER_PHOTO_HEIGHT * scale;

  return (
    (stageHeight - imageHeight) * positionY + imageHeight * SCATTER_HORIZON_FRAC
  );
}

export function layoutIslandNodes<T>(
  sources: ReadonlyArray<IslandLayoutSource<T>>,
  {
    desktop,
    height,
    skyOffsetPx,
    width,
  }: {
    desktop: boolean;
    height: number;
    /**
     * 수평선 추적으로 잰 하늘 몫(px). `.map` 상단 기준. 없으면 `SCATTER_SKY_RATIO`
     * 폴백을 쓴다(측정 전 첫 렌더·단위테스트). {@link computeHorizonOffsetPx} 로 구한다.
     */
    skyOffsetPx?: number;
    width: number;
  },
): IslandLayoutResult<T> {
  const list = sources.slice(0, ISLAND_LAYOUT_LIMIT);
  const index = desktop ? 1 : 0;
  const size = SCATTER_ART[index];
  const gap = SCATTER_GAP[index];
  const boxWidth = Math.min(
    SCATTER_BOX_WIDTH[index],
    Math.max(24, width - SCATTER_EDGE * 2),
  );
  const boxHeight = size + SCATTER_LABEL_HEIGHT[index];

  if (list.length === 0) {
    return { items: [], requiredHeight: Math.ceil(height) };
  }

  // 자리를 무작위로 던져 놓고 겹치면 다시 던지는 방식은 20곳쯤 되면 자리를 못 찾는다.
  // 못 찾으면 지도를 세로로 늘리게 되는데, 그러면 "한 화면에서 섬 다 보이도록" 이라는
  // 회장 지시가 깨진다(2026-08-22). 그래서 보이지 않는 줄만 깔고 그 안에서 흩는다.
  //
  // 줄 사이 세로 간격은 늘 상자 하나보다 크게 잡는다. 그러면 **다른 줄끼리는 가로로
  // 어떻게 움직여도 겹치지 않는다.** 덕분에 줄마다 통째로 좌우로 밀 수 있고, 줄마다
  // 섬 개수도 다르게 둘 수 있다. 개수가 다르면 섬 간격이 줄마다 달라져서 격자로 안 보인다.
  // (처음엔 줄마다 개수를 똑같이 뒀더니 화면이 그냥 5열 표로 보였다, 2026-08-22 dev 실측.)
  const usableWidth = Math.max(boxWidth, width - SCATTER_EDGE * 2);
  const maxColumns = Math.max(
    1,
    Math.min(list.length, Math.floor(usableWidth / (boxWidth + gap))),
  );
  // 한 줄을 꽉 채우면 줄마다 개수를 바꿀 여지가 사라져 격자가 된다. 모바일 20곳이
  // 정확히 5열 x 4줄로 떨어져 화면이 표로 보였다(2026-08-23 dev 실측). 그래서
  // 한 줄에 최대치보다 한 곳 적게 잡아 여백과 개수 변화를 남긴다.
  const rowTarget = maxColumns >= 3 ? maxColumns - 1 : maxColumns;
  const rows = Math.ceil(list.length / rowTarget);
  // 지도를 늘리면 위쪽 하늘 구간도 같은 비율로 같이 늘어난다. 그래서 필요한 높이를
  // 늘리기 전 높이로 계산하면 줄 간격이 상자보다 좁아진다(2026-08-22 단위테스트
  // "islands 0 and 1 intersect"). 하늘 몫을 먼저 빼고 역산한다.
  //
  // skyOffsetPx 가 있으면(수평선 실측, O-28 = A) 비율이 아니라 실제 px 을 하늘
  // 몫으로 쓴다. 배경 사진이 cover 라 수평선의 화면상 위치는 무대 높이에 따라
  // 움직이고, 고정 비율로는 그 움직임을 못 따라간다(명세 §17.5).
  let requiredHeight: number;
  let top: number;

  if (skyOffsetPx === undefined) {
    requiredHeight = Math.ceil(
      Math.max(
        height,
        (rows * (boxHeight + gap) * SCATTER_JITTER_ROOM + SCATTER_EDGE) /
          (1 - SCATTER_SKY_RATIO),
      ),
    );
    top = requiredHeight * SCATTER_SKY_RATIO;
  } else {
    top = Math.max(0, skyOffsetPx);
    requiredHeight = Math.ceil(
      Math.max(
        height,
        rows * (boxHeight + gap) * SCATTER_JITTER_ROOM + SCATTER_EDGE + top,
      ),
    );
  }

  const cellHeight = (requiredHeight - top - SCATTER_EDGE) / rows;
  const jitterY = Math.max(0, (cellHeight - boxHeight - gap) / 2);

  // 같은 개수면 늘 같은 그림이 나오게 씨앗을 개수로 만든다.
  const random = seededRandom(0x5eed + list.length * 7919);

  // 줄마다 몇 곳을 둘지 고르게 나눈 뒤 한둘씩 옮겨 들쭉날쭉하게 만든다.
  const counts = Array.from({ length: rows }, (_, row) =>
    Math.floor((list.length - row - 1) / rows + 1),
  );

  for (let pass = 0; pass < rows; pass += 1) {
    const from = Math.floor(random() * rows);
    const to = Math.floor(random() * rows);
    if (from !== to && counts[from] > 1 && counts[to] < maxColumns) {
      counts[from] -= 1;
      counts[to] += 1;
    }
  }

  const spots: { row: number; x: number; y: number }[] = [];

  counts.forEach((count, row) => {
    // 이 줄에서 남는 가로 여백을 섬 사이사이에 무작위로 나눠 준다.
    //
    // 처음에는 줄을 통째로 밀고 섬마다 흔든 다음 지도 밖으로 나가면 도로 안으로
    // 밀어 넣었는데, 그 마지막 밀어 넣기가 이웃과의 간격을 깨뜨려 겹쳤다
    // (2026-08-22 단위테스트 "islands 0 and 1 intersect", 두 섬 중심이 58px 로
    // 최소 간격 66px 보다 좁았다). 여백을 나눠 주는 방식은 간격이 늘 최소값
    // 이상이라 밀어 넣기 자체가 필요 없다.
    const pitch = boxWidth + gap;
    const slack = Math.max(0, usableWidth - count * pitch);
    const shares = Array.from({ length: count + 1 }, () => random());
    const total = shares.reduce((sum, share) => sum + share, 0) || 1;
    let offset = 0;

    for (let column = 0; column < count; column += 1) {
      offset += (shares[column] / total) * slack;
      spots.push({
        row,
        x: SCATTER_EDGE + boxWidth / 2 + offset + column * pitch,
        y:
          top +
          row * cellHeight +
          cellHeight / 2 +
          (random() * 2 - 1) * jitterY,
      });
    }
  });

  return {
    items: list.map((source, item) => ({
      band: source.band,
      boxHeight,
      boxWidth,
      item: source.item,
      key: `island-${item}`,
      row: spots[item].row,
      scale: 1,
      size,
      x: spots[item].x / width,
      y: spots[item].y / requiredHeight,
    })),
    requiredHeight,
  };
}
