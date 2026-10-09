'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { CSSProperties, KeyboardEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import styles from '@/app/(service)/insights/ui/sprint8-insights.module.css';
import {
  computeHorizonOffsetPx,
  getResponsiveIslandMapStyle,
  getResponsiveIslandNodeStyle,
  ISLAND_DENSE_COUNT,
  ISLAND_EXPANDED_COUNT,
  ISLAND_LAYOUT_LIMIT,
  type IslandBand,
  layoutIslandNodes,
  SCATTER_HORIZON_PAD,
} from '@/app/(service)/insights/ui/sprint8-v10-island-layout';
import { cn } from '@/components/common/ui/(shadcn)/lib/utils';
import Button from '@/components/common/ui/button';
import { getReadOnlyIslandArticleHref } from '@/components/insights/insight-learning-map-links';
import { useAuth } from '@/features/auth/model/use-auth';
import { useInsightMapQuery } from '@/hooks/queries/insights/use-insight-worldmap-query';
import { useKoansQuery } from '@/hooks/queries/insights/use-koan-query';
import type { InsightIsland } from '@/types/insight-worldmap';

const PINNED_ART: Record<string, string> = {
  algorithm: 'isl-web',
  'api-communication': 'isl-api',
  'backend-structure': 'isl-db',
  cache: 'isl-api',
  'cloud-introduction': 'isl-deploy',
  'computer-architecture': 'isl-cs',
  container: 'isl-deploy',
  'data-structure': 'isl-cs',
  'distributed-system': 'isl-api',
  'message-queue': 'isl-db',
  'network-basics': 'isl-web',
  observability: 'isl-deploy',
  'operating-system': 'isl-cs',
  security: 'isl-api',
  'software-design': 'isl-cs',
  testing: 'isl-cs',
  dep: 'isl-deploy',
  deploy: 'isl-deploy',
  db: 'isl-db',
  database: 'isl-db',
  cs: 'isl-cs',
  collaboration: 'isl-cs',
  net: 'isl-api',
  network: 'isl-api',
  web: 'isl-web',
  frontend: 'isl-web',
};
const ART = ['isl-deploy', 'isl-db', 'isl-cs', 'isl-api', 'isl-web'];

const getIslandArtIndex = (slug: string) => {
  const normalized = slug.toLowerCase();
  const exactArt = PINNED_ART[normalized];
  if (exactArt) return ART.indexOf(exactArt);
  const pinnedKey = Object.keys(PINNED_ART).find((key) =>
    normalized.includes(key),
  );

  if (pinnedKey) {
    return ART.indexOf(PINNED_ART[pinnedKey]);
  }

  const hash = [...slug].reduce(
    (value, character) => (value * 31 + (character.codePointAt(0) ?? 0)) >>> 0,
    0,
  );

  return hash % ART.length;
};

export const getIslandArt = (slug: string) =>
  `/insights/worldmap/${ART[getIslandArtIndex(slug)]}.png`;

const getBand = (island: InsightIsland, hereId?: number): IslandBand => {
  if (island.islandId === hereId) return 'here';
  if (island.progress?.conquered) return 'opened';
  if ((island.progress?.read ?? 0) > 0) return 'started';
  return 'far';
};

export default function InsightLearningMap({
  readOnly = false,
}: {
  readOnly?: boolean;
}) {
  const mapQuery = useInsightMapQuery();
  const koansQuery = useKoansQuery({ size: 7 });
  const { isAuthenticated } = useAuth();
  const [selectedIslandId, setSelectedIslandId] = useState<number | null>(null);
  const islandTriggerRefs = useRef(new Map<number, HTMLButtonElement>());
  const dialogRef = useRef<HTMLDivElement>(null);
  const dialogPrimaryRef = useRef<HTMLAnchorElement>(null);
  const [mapNode, setMapNode] = useState<HTMLDivElement | null>(null);
  const [stageNode, setStageNode] = useState<HTMLElement | null>(null);
  const [mapMetrics, setMapMetrics] = useState({
    desktop: false,
    width: 350,
  });
  // 수평선 추적 하늘 몫(O-28 = A, 2026-08-23 회장 결정 "사진에서 바다 위에
  // 띄워놓도록 흩뿌려"). 실측 전에는 undefined 라 layoutIslandNodes 가
  // SCATTER_SKY_RATIO 폴백을 쓴다. 실측 후에는 breakpoint 별로 채워진다.
  const [skyOffsetPx, setSkyOffsetPx] = useState<{
    desktop?: number;
    mobile?: number;
  }>({});
  // 프로토타입과 같은 3회 상한. 무대 높이가 바뀌면 수평선도 움직이므로
  // 한 번에 못 맞추고 다시 재는데, 계속 흔들리면 안 되니 끊는다(명세 §17.5).
  const skyPassRef = useRef(0);
  const islands = useMemo(
    () => mapQuery.data?.islands ?? [],
    [mapQuery.data?.islands],
  );
  const hasUnknownPresentationTier = islands.some(
    (island) =>
      island.presentationTier !== 'OCEAN' && island.presentationTier !== 'NEW',
  );
  useEffect(() => {
    if (hasUnknownPresentationTier) {
      console.error('[insight-map] unknown presentationTier; fail-closed');
    }
  }, [hasUnknownPresentationTier]);
  const oceanIslands = useMemo(
    () => islands.filter((island) => island.presentationTier === 'OCEAN'),
    [islands],
  );
  const newIslands = useMemo(
    () => islands.filter((island) => !oceanIslands.includes(island)),
    [islands, oceanIslands],
  );
  const hereIsland =
    oceanIslands.find(
      (island) =>
        (island.progress?.read ?? 0) > 0 && !island.progress?.conquered,
    ) ?? oceanIslands[0];
  const islandLayouts = useMemo(() => {
    const priorityIslands = [
      ...(hereIsland ? [hereIsland] : []),
      ...oceanIslands.filter(
        (island) =>
          island.islandId !== hereIsland?.islandId &&
          island.progress?.conquered,
      ),
      ...oceanIslands.filter(
        (island) =>
          island.islandId !== hereIsland?.islandId &&
          !island.progress?.conquered &&
          (island.progress?.read ?? 0) > 0,
      ),
    ];
    const priorityIds = new Set(
      priorityIslands.map((island) => island.islandId),
    );
    const visibleIslands = [
      ...priorityIslands,
      ...oceanIslands
        .filter((island) => !priorityIds.has(island.islandId))
        .slice(0, Math.max(0, ISLAND_LAYOUT_LIMIT - priorityIslands.length)),
    ].slice(0, ISLAND_LAYOUT_LIMIT);

    const sources = visibleIslands.map((island) => ({
      band: getBand(island, hereIsland?.islandId),
      item: island,
    }));

    return {
      desktop: layoutIslandNodes(sources, {
        desktop: true,
        height: 400,
        skyOffsetPx: skyOffsetPx.desktop,
        width: mapMetrics.desktop ? mapMetrics.width : 984,
      }),
      mobile: layoutIslandNodes(sources, {
        desktop: false,
        height: 264,
        skyOffsetPx: skyOffsetPx.mobile,
        width: mapMetrics.desktop ? 350 : mapMetrics.width,
      }),
    };
  }, [hereIsland, mapMetrics, oceanIslands, skyOffsetPx]);
  const desktopLayoutByKey = useMemo(
    () => new Map(islandLayouts.desktop.items.map((item) => [item.key, item])),
    [islandLayouts.desktop.items],
  );
  const islandDensity =
    oceanIslands.length >= ISLAND_DENSE_COUNT
      ? 'dense'
      : oceanIslands.length >= ISLAND_EXPANDED_COUNT
        ? 'expanded'
        : undefined;
  const selected = islands.find(
    (island) => island.islandId === selectedIslandId,
  );
  const selectedReadOnlyArticleHref = selected
    ? getReadOnlyIslandArticleHref(selected)
    : null;
  const koans = koansQuery.data?.items ?? [];
  const today = koans[0];
  useEffect(() => {
    if (!mapNode) return;

    const measure = () => {
      const nextMetrics = {
        desktop: window.innerWidth >= 1024,
        width: mapNode.clientWidth || 350,
      };
      setMapMetrics((current) =>
        current.desktop === nextMetrics.desktop &&
        current.width === nextMetrics.width
          ? current
          : nextMetrics,
      );
    };
    const observer = new ResizeObserver(measure);

    measure();
    observer.observe(mapNode);
    window.addEventListener('resize', measure, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [mapNode]);

  // 무대 크기가 바뀌면(리사이즈·섬 개수 변화로 지도가 늘어나는 것 포함) 하늘 몫을
  // 다시 재야 하므로 시도 횟수를 초기화한다.
  useEffect(() => {
    skyPassRef.current = 0;
  }, [mapMetrics.desktop, mapMetrics.width, islands.length]);

  // 수평선 실측(O-28 = A). `.seaStage`(배경 사진이 덮는 상자) 와 `.map`(섬을
  // 앉히는 좌표계) 의 실제 렌더 결과를 재서, 사진의 수평선이 `.map` 좌표계에서
  // 몇 px 인지 구한다. cover 배경이라 무대 높이가 바뀌면 수평선도 같이
  // 움직이므로, 계산한 하늘 몫으로 다시 그린 뒤에도 수평선이 밀렸으면 한 번
  // 더 잰다. 프로토타입 render() 의 pass 상한과 같은 이유로 3회에서 끊는다
  // (명세 §17.5, §17.7 #10).
  useEffect(() => {
    if (!stageNode || !mapNode) return;
    if (skyPassRef.current >= 3) return;

    // 실제 렌더 결과(다음 프레임)를 재야 한다. 이번 프레임 안에서 바로 재면
    // 방금 그린 레이아웃이 아니라 이전 값을 잡을 수 있다.
    const frame = requestAnimationFrame(() => {
      const desktop = mapMetrics.desktop;
      const key = desktop ? 'desktop' : 'mobile';
      const activeLayout = islandLayouts[key];
      if (activeLayout.items.length === 0) return;

      const stageRect = stageNode.getBoundingClientRect();
      const mapRect = mapNode.getBoundingClientRect();
      if (stageRect.height === 0 || stageRect.width === 0) return;

      const headOffset = mapRect.top - stageRect.top;
      const horizon = computeHorizonOffsetPx({
        desktop,
        stageHeight: stageRect.height,
        stageWidth: stageRect.width,
      });
      const need = Math.max(0, horizon + SCATTER_HORIZON_PAD - headOffset);

      setSkyOffsetPx((prev) => {
        const current = prev[key];
        if (current !== undefined && need <= current + 1) return prev;
        skyPassRef.current += 1;
        return { ...prev, [key]: need };
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [islandLayouts, mapMetrics, mapNode, skyOffsetPx, stageNode]);

  useEffect(() => {
    if (selectedIslandId === null) return;
    dialogPrimaryRef.current?.focus();
  }, [selectedIslandId]);

  const closeDialog = () => {
    const trigger =
      selectedIslandId === null
        ? null
        : islandTriggerRefs.current.get(selectedIslandId);
    setSelectedIslandId(null);
    requestAnimationFrame(() => trigger?.focus());
  };

  const handleDialogKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeDialog();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled])',
      ) ?? [],
    );
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  if (mapQuery.isPending || koansQuery.isPending) {
    return (
      <div className={styles.root} data-testid="insight-worldmap">
        <div className={styles.recoveryPanel} role="status">
          <div className={styles.recoveryLoader} aria-hidden />
          <h1>바다를 불러오고 있어요</h1>
          <p>열린 섬과 오늘의 화두를 확인하고 있습니다.</p>
          <Link href="/insights/koans" className={styles.recoverySecondary}>
            기다리지 않고 화두 보기
          </Link>
        </div>
      </div>
    );
  }

  if (mapQuery.isError || koansQuery.isError) {
    return (
      <div className={styles.root} data-testid="insight-worldmap">
        <div
          className={styles.recoveryPanel}
          data-testid="route-error"
          role="alert"
        >
          <h1>바다를 불러오지 못했어요</h1>
          <p>
            연결을 확인한 뒤 다시 시도해 주세요. 화두 목록은 계속 볼 수
            있습니다.
          </p>
          <div className={styles.recoveryActions}>
            <Button
              type="button"
              color="primary"
              size="large"
              onClick={() => {
                Promise.all([mapQuery.refetch(), koansQuery.refetch()]).catch(
                  () => {},
                );
              }}
            >
              다시 시도
            </Button>
            <Link href="/insights/koans" className={styles.recoverySecondary}>
              화두 보기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (hasUnknownPresentationTier) {
    return (
      <div className={styles.root} data-testid="insight-worldmap">
        <div className={styles.recoveryPanel} role="alert">
          <h1>섬 배치 정보를 확인하지 못했어요</h1>
          <p>
            안전한 배치를 확인할 때까지 섬을 숨겼습니다. 화두 목록은 계속 볼 수
            있습니다.
          </p>
          <Link href="/insights/koans" className={styles.recoverySecondary}>
            화두 보기
          </Link>
        </div>
      </div>
    );
  }

  if (islands.length === 0) {
    return (
      <div className={styles.root} data-testid="insight-worldmap">
        <div className={styles.recoveryPanel}>
          <span className={styles.recoveryEyebrow}>아직 열린 섬 0곳</span>
          <h1>첫 섬이 열리기 전이에요</h1>
          <p>
            오늘의 물음은 이미 열려 있습니다. 화두를 읽고 내 생각을 남겨보세요.
          </p>
          <Link href="/insights/koans" className={styles.recoveryPrimary}>
            오늘의 화두 보기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.root} data-testid="insight-worldmap">
      <section
        ref={setStageNode}
        className={styles.seaStage}
        aria-label="시작 섬 8개"
      >
        <div className={styles.seaBackdrop} aria-hidden />
        <div className={styles.seaScrim} aria-hidden />
        <div className={styles.stageInner}>
          <div className={styles.stageHead}>
            <p className={cn(styles.stageLabel, 'font-designer-13b')}>
              INSIGHT SEA
            </p>
            <h2 className="font-designer-28b">
              생각의 바다에서 나만의 길을 찾으세요
            </h2>
            <p className="font-designer-16r">
              여덟 섬을 둘러보고 첫 글부터 읽어 보세요. 잠긴 내용은 이유를
              알려드립니다.
            </p>
          </div>
          <div
            ref={setMapNode}
            className={styles.map}
            data-island-density={islandDensity}
            style={
              getResponsiveIslandMapStyle(
                islandLayouts.mobile.requiredHeight,
                islandLayouts.desktop.requiredHeight,
              ) as CSSProperties
            }
          >
            {islandLayouts.mobile.items.map((layout) => {
              const island = layout.item;
              const desktopLayout = desktopLayoutByKey.get(layout.key);
              if (!desktopLayout) return null;

              return (
                <button
                  key={island.islandId}
                  type="button"
                  data-layout-key={layout.key}
                  className={cn(
                    styles.island,
                    layout.band === 'here' && styles.islandHere,
                    layout.band === 'opened' && styles.islandOpened,
                    layout.band === 'started' && styles.islandStarted,
                    layout.band === 'far' && styles.islandFar,
                    layout.row > 0 && styles.islandBack,
                    styles[`islandTone${getIslandArtIndex(island.slug)}`],
                  )}
                  onClick={() => setSelectedIslandId(island.islandId)}
                  ref={(node) => {
                    if (node)
                      islandTriggerRefs.current.set(island.islandId, node);
                    else islandTriggerRefs.current.delete(island.islandId);
                  }}
                  aria-haspopup="dialog"
                  aria-expanded={selectedIslandId === island.islandId}
                  aria-label={`${island.name} 개척지 열기`}
                  data-testid={`island-${island.slug}`}
                  style={
                    getResponsiveIslandNodeStyle(
                      layout,
                      desktopLayout,
                    ) as CSSProperties
                  }
                >
                  <Image
                    unoptimized
                    src={getIslandArt(island.slug)}
                    alt=""
                    width={176}
                    height={176}
                    className={styles.islandArt}
                  />
                  <span
                    className={cn(
                      styles.islandName,
                      'max-md:font-designer-13b',
                    )}
                    data-testid={`island-label-${island.slug}`}
                  >
                    {island.name}
                  </span>
                  {/* 이름 아래 진행 문구. 섬 dialog 와 같은 문구 형식을 쓴다.
                      분류 이름을 앞에 붙이지 않는다. 칸이 좁아 이름과 겹친다. */}
                  <span
                    className={cn(styles.islandSub, 'max-md:font-designer-13b')}
                    data-testid={`island-progress-${island.slug}`}
                  >
                    {`${island.articles.length}편 중 ${island.progress?.read ?? 0}편 열림`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {today ? (
        <section className={styles.heroKoan} aria-labelledby="today-koan-title">
          <div className={styles.heroKicker}>오늘의 화두</div>
          <h1 id="today-koan-title" className={styles.heroQuestion}>
            {today.question}
          </h1>
          <p className={styles.heroDescription}>
            정답을 외우기 전에 선택의 기준을 먼저 붙잡아 봅니다.
          </p>
          <div className={styles.heroActions}>
            <Link
              href={`/insights/koans/${today.koanId}`}
              className={styles.heroCta}
            >
              화두 읽고 생각 남기기
            </Link>
            {hereIsland && !readOnly && (
              <Link
                href={`/insights/land/${hereIsland.slug}`}
                className={styles.heroSecondary}
              >
                {hereIsland.name} 섬 둘러보기
              </Link>
            )}
          </div>
        </section>
      ) : (
        <section className={styles.heroKoan}>
          <div className={styles.heroKicker}>오늘의 화두</div>
          <p className={styles.heroQuestion}>오늘 걸린 화두가 없습니다.</p>
        </section>
      )}

      {newIslands.length > 0 && (
        <section
          className={styles.newIslands}
          aria-labelledby="new-islands-title"
        >
          <h2 id="new-islands-title">새로 열린 섬 {newIslands.length}곳</h2>
          <p>
            활성 글이 연결되면 사람 승인 없이 이 목록에 자동으로 나타납니다.
          </p>
          <div className={styles.newIslandGrid}>
            {newIslands.map((island) => {
              const content = (
                <>
                  <Image
                    unoptimized
                    src={getIslandArt(island.slug)}
                    alt=""
                    width={40}
                    height={32}
                  />
                  <span>{island.name}</span>
                </>
              );
              return readOnly ? (
                <div key={island.islandId} className={styles.newIslandTile}>
                  {content}
                </div>
              ) : (
                <Link
                  key={island.islandId}
                  href={`/insights/land/${island.slug}`}
                  className={styles.newIslandTile}
                >
                  {content}
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {selected && (
        <div
          className={styles.popoverBackdrop}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDialog();
          }}
        >
          <div
            ref={dialogRef}
            className={styles.popover}
            role="dialog"
            aria-modal="true"
            aria-labelledby="island-dialog-title"
            onKeyDown={handleDialogKeyDown}
          >
            <b id="island-dialog-title" className={styles.popoverTitle}>
              {selected.name}
            </b>
            <span className={styles.popoverSubtitle}>
              {isAuthenticated
                ? `${selected.articles.length}편 중 ${selected.progress?.read ?? 0}편 열림`
                : `개념글 ${selected.articles.length}편`}
            </span>
            {!readOnly ? (
              <Link
                ref={dialogPrimaryRef}
                href={`/insights/land/${selected.slug}`}
                className={styles.popoverLink}
              >
                개척지 들어가기
                <small>{isAuthenticated ? '내 물길' : '첫 편 무료'}</small>
              </Link>
            ) : selectedReadOnlyArticleHref ? (
              <Link
                ref={dialogPrimaryRef}
                href={selectedReadOnlyArticleHref}
                className={styles.popoverLink}
              >
                개념글 읽기
                <small>앱에서 바로 읽기</small>
              </Link>
            ) : null}
            {selected.bridgeRoomId && !readOnly && (
              <Link
                href={`/community/rooms/${selected.bridgeRoomId}?from=${encodeURIComponent(selected.slug)}`}
                className={styles.popoverLink}
              >
                공부방 들어가기 <small>바로 방 안으로</small>
              </Link>
            )}
            <Button
              type="button"
              color="secondary"
              size="large"
              className={styles.popoverClose}
              onClick={closeDialog}
            >
              닫기
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
