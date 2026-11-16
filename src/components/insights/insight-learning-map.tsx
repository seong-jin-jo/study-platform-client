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
import { formatIslandMapLabel } from '@/components/insights/insight-island-map-label';
import { useAuth } from '@/features/auth/model/use-auth';
import { useCommunityRoomHubQuery } from '@/hooks/queries/community/use-community-room-hub-query';
import { useInsightMapQuery } from '@/hooks/queries/insights/use-insight-worldmap-query';
import { useKoansQuery } from '@/hooks/queries/insights/use-koan-query';
import type { InsightIsland } from '@/types/insight-worldmap';
import { pickRecommendedRooms, roomOneLiner } from '@/utils/recommended-rooms';

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

const EMPTY_ROOM_FILTERS = {};

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
  // 공부방 칸에 방 이름·회원 수를 보이고, 연결된 방이 없으면 인기 방을 추천하려고
  // 방 목록(공개 API)을 함께 읽는다. 실패해도 지도는 그대로 뜬다.
  const roomHubQuery = useCommunityRoomHubQuery(EMPTY_ROOM_FILTERS);
  const roomHubRooms = useMemo(
    () => [
      ...(roomHubQuery.data?.myRooms ?? []),
      ...(roomHubQuery.data?.exploreRooms ?? []),
    ],
    [roomHubQuery.data],
  );
  const recommendedRooms = useMemo(
    () => pickRecommendedRooms(roomHubQuery.data?.exploreRooms, 2),
    [roomHubQuery.data?.exploreRooms],
  );
  const [selectedIslandId, setSelectedIslandId] = useState<number | null>(null);
  // 휴대폰·태블릿(1024 미만)에서만 쓰는 아래 시트의 열림 상태. PC 패널은 항상 떠 있다.
  const [sheetOpen, setSheetOpen] = useState(false);
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
  // 지도에는 등급(OCEAN·NEW)과 상관없이 모든 섬을 올린다. 예전에는 NEW 섬을
  // 지도 밖 목록에만 두어서, 글이 있는 섬이 정작 지도에서 안 보였다
  // (회장 2026-11-15 "새로 열린 섬 2곳이 섬 목록에는 없거든").
  // 글이 있는 섬을 앞에 두어 시작 섬과 배치 우선순위를 받게 한다.
  const oceanIslands = useMemo(
    () =>
      islands
        .filter(
          (island) =>
            island.presentationTier === 'OCEAN' ||
            island.presentationTier === 'NEW',
        )
        .map((island, index) => ({ island, index }))
        .sort(
          (a, b) =>
            Number(b.island.articles.length > 0) -
              Number(a.island.articles.length > 0) || a.index - b.index,
        )
        .map(({ island }) => island),
    [islands],
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
  const isDesktop = mapMetrics.desktop;
  const openedCount = oceanIslands.filter(
    (island) => island.articles.length > 0,
  ).length;
  const articleTotal = oceanIslands.reduce(
    (sum, island) => sum + island.articles.length,
    0,
  );
  // PC 첫 진입: 글이 가장 많은 열린 섬을 미리 골라 패널이 비어 있지 않게 한다.
  // 동수면 앞선 섬(oceanIslands 는 글 있는 섬이 앞)을 쓴다.
  const defaultIslandId = oceanIslands.reduce<InsightIsland | undefined>(
    (best, island) =>
      !best || island.articles.length > best.articles.length ? island : best,
    undefined,
  )?.islandId;
  useEffect(() => {
    if (!isDesktop || selectedIslandId !== null) return;
    if (defaultIslandId !== undefined) setSelectedIslandId(defaultIslandId);
  }, [defaultIslandId, isDesktop, selectedIslandId]);
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

  const sheetVisible = sheetOpen && !isDesktop && selected !== undefined;
  useEffect(() => {
    if (!sheetVisible) return;
    // 미개척 섬은 들어갈 링크가 없으니 닫기 버튼으로 초점을 보낸다.
    (
      dialogPrimaryRef.current ??
      dialogRef.current?.querySelector<HTMLButtonElement>('button')
    )?.focus();
  }, [sheetVisible]);

  const closeDialog = () => {
    const trigger =
      selectedIslandId === null
        ? null
        : islandTriggerRefs.current.get(selectedIslandId);
    setSheetOpen(false);
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

  const levelLabel = {
    BEGINNER: '입문',
    INTERMEDIATE: '중급',
    ADVANCED: '고급',
  };
  const renderPanelBody = (island: InsightIsland) => {
    const unexplored = island.articles.length === 0;
    const isNew = island.presentationTier === 'NEW' && !unexplored;
    return (
      <>
        <div className={styles.panelHead}>
          <Image
            unoptimized
            src={getIslandArt(island.slug)}
            alt=""
            width={64}
            height={64}
            className={styles.panelArt}
          />
          <div className={styles.panelHeadText}>
            <span className={styles.panelEyebrow}>
              선택한 섬{isNew && <em className={styles.panelNew}>NEW</em>}
            </span>
            <b id="island-panel-title" className={styles.panelTitle}>
              {island.name}
            </b>
            <span className={styles.panelMeta}>
              {formatIslandMapLabel(island, isAuthenticated)}
              {!unexplored && ` · 탐험자 ${island.explorerCount}명`}
            </span>
          </div>
        </div>
        <div className={styles.panelKeeper} data-testid="island-keeper">
          <span>지킴이</span>
          <b>지킴이 모집 중</b>
        </div>
        {unexplored ? (
          <p
            className={styles.panelNotice}
            data-testid="island-unexplored-notice"
          >
            아직 개척되지 않은 섬입니다. 첫 글이 올라오면 이 섬이 열립니다.
          </p>
        ) : (
          <ul className={styles.panelArticles} data-testid="island-articles">
            {island.articles.map((article) => {
              const firstFree =
                article.accessLevel === 'FREE' ||
                island.firstFreeDocumentId === article.documentId;
              const locked =
                !firstFree &&
                (article.accessLevel === 'LOCKED' ||
                  article.state === 'LOCKED' ||
                  (!isAuthenticated && article.accessLevel !== 'UNLOCKED'));
              const href = readOnly
                ? firstFree
                  ? `/insights/read?slug=${encodeURIComponent(article.slug)}`
                  : null
                : `/insights/${article.slug}`;
              const row = (
                <>
                  <span className={styles.panelArticleTags}>
                    <span>{levelLabel[article.level]}</span>
                    {firstFree && (
                      <span className={styles.panelFree}>첫 편 무료</span>
                    )}
                    {locked && (
                      <span className={styles.panelLock}>
                        {isAuthenticated ? '잠김' : '로그인하면 이어서 엽니다'}
                      </span>
                    )}
                  </span>
                  <span className={styles.panelArticleTitle}>
                    {article.title}
                  </span>
                </>
              );
              return (
                <li key={article.documentId}>
                  {href ? (
                    <Link
                      href={href}
                      className={styles.panelArticle}
                      data-testid="island-article-link"
                    >
                      {row}
                    </Link>
                  ) : (
                    <div className={styles.panelArticle}>{row}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <div className={styles.panelRoom} data-testid="island-room">
          <span>공부방</span>
          {island.bridgeRoomId ? (
            (() => {
              const linked = roomHubRooms.find(
                (room) => room.roomId === island.bridgeRoomId,
              );
              const roomName =
                island.bridgeRoomName ?? linked?.name ?? '공부방';
              return (
                <div className={styles.panelRoomRow}>
                  <div className={styles.panelRoomText}>
                    <b data-testid="island-room-name">{roomName}</b>
                    {linked && (
                      <small data-testid="island-room-members">
                        멤버 {linked.memberCount}명
                      </small>
                    )}
                  </div>
                  {!readOnly && (
                    <Link
                      href={`/community/rooms/${island.bridgeRoomId}?from=${encodeURIComponent(island.slug)}`}
                    >
                      들어가기
                    </Link>
                  )}
                </div>
              );
            })()
          ) : recommendedRooms.length > 0 ? (
            <>
              <p>아직 연결된 공부방이 없어요. 지금 인기 있는 방은 여기예요.</p>
              <ul
                className={styles.panelRoomList}
                data-testid="island-room-recommend"
              >
                {recommendedRooms.map((room) => (
                  <li key={room.roomId} className={styles.panelRoomRow}>
                    <div className={styles.panelRoomText}>
                      <b>{room.name}</b>
                      <small>
                        멤버 {room.memberCount}명 ·{' '}
                        {roomOneLiner(room.description)}
                      </small>
                    </div>
                    {!readOnly && (
                      <Link
                        href={`/community/rooms/${room.roomId}?from=${encodeURIComponent(island.slug)}`}
                      >
                        둘러보기
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p>
              아직 연결된 공부방이 없어요.{' '}
              {!readOnly && <Link href="/community">커뮤니티 둘러보기</Link>}
            </p>
          )}
        </div>
        {!unexplored && !readOnly && (
          <Link
            ref={isDesktop ? undefined : dialogPrimaryRef}
            href={`/insights/land/${island.slug}`}
            className={styles.panelCta}
            data-testid="island-enter"
          >
            섬 들어가기
            <small>{isAuthenticated ? '내 물길' : '첫 편 무료'}</small>
          </Link>
        )}
      </>
    );
  };

  return (
    <div className={styles.root} data-testid="insight-worldmap">
      <section
        ref={setStageNode}
        className={styles.seaStage}
        aria-label={`열린 섬 ${openedCount}곳`}
      >
        <div className={styles.seaBackdrop} aria-hidden />
        <div className={styles.seaScrim} aria-hidden />
        <div className={cn(styles.stageInner, styles.stageLayout)}>
          <div className={styles.stageMain}>
            <div className={cn(styles.stageHead, styles.stageHeadShown)}>
              <p className={cn(styles.stageLabel, 'font-designer-13b')}>
                INSIGHT SEA
              </p>
              <h2 className="font-designer-28b">
                생각의 바다에서 나만의 길을 찾으세요
              </h2>
              <ul className={styles.stageChips} data-testid="sea-summary">
                <li>열린 섬 {openedCount}곳</li>
                <li>개념글 {articleTotal}편</li>
                {oceanIslands.length - openedCount > 0 && (
                  <li>개척 대기 {oceanIslands.length - openedCount}곳</li>
                )}
              </ul>
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
                      island.articles.length === 0 && styles.islandUnexplored,
                      selectedIslandId === island.islandId &&
                        styles.islandSelected,
                      styles[`islandTone${getIslandArtIndex(island.slug)}`],
                    )}
                    onClick={() => {
                      setSelectedIslandId(island.islandId);
                      setSheetOpen(true);
                    }}
                    ref={(node) => {
                      if (node)
                        islandTriggerRefs.current.set(island.islandId, node);
                      else islandTriggerRefs.current.delete(island.islandId);
                    }}
                    aria-pressed={selectedIslandId === island.islandId}
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
                    {island.presentationTier === 'NEW' &&
                      island.articles.length > 0 && (
                        <span className={styles.islandNewBadge}>NEW</span>
                      )}
                    {/* 이름 아래 진행 문구. 섬 dialog 와 같은 문구 형식을 쓴다.
                        분류 이름을 앞에 붙이지 않는다. 칸이 좁아 이름과 겹친다. */}
                    <span
                      className={cn(
                        styles.islandSub,
                        'max-md:font-designer-13b',
                      )}
                      data-testid={`island-progress-${island.slug}`}
                    >
                      {formatIslandMapLabel(island, isAuthenticated)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          {isDesktop && selected && (
            <aside
              className={styles.panel}
              aria-labelledby="island-panel-title"
              data-testid="island-panel"
            >
              {renderPanelBody(selected)}
            </aside>
          )}
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
        <section className={styles.koanEmpty} data-testid="koan-empty">
          <span className={styles.koanEmptyKicker}>오늘의 화두</span>
          <span className={styles.koanEmptyText}>걸린 화두가 없어요</span>
          <Link href="/insights/koans" className={styles.koanEmptyLink}>
            지난 화두 보기
          </Link>
        </section>
      )}

      {sheetVisible && selected && (
        <div className={styles.sheetBackdrop}>
          <button
            type="button"
            tabIndex={-1}
            aria-hidden
            className={styles.sheetScrim}
            onClick={closeDialog}
          />
          <div
            ref={dialogRef}
            className={styles.sheet}
            role="dialog"
            aria-modal="true"
            aria-labelledby="island-panel-title"
            data-testid="island-sheet"
            onKeyDown={handleDialogKeyDown}
          >
            <div className={styles.sheetGrip} aria-hidden />
            {renderPanelBody(selected)}
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
