import type { InsightIsland } from '@/types/insight-worldmap';

/**
 * 섬 이름 아래와 섬 dialog 가 함께 쓰는 문구.
 *
 * 글이 없는 섬에 "0편 중 0편 열림" 을 쓰면 지도에 같은 문장이 여러 번 깔린다
 * (회장 2026-11-15 "0편 중 0편 열림이 똑같은 정보가 8개가 있는 게 이상하고").
 * 글이 없는 섬은 "미개척" 한 단어로 둔다. 비회원은 읽은 기록이 없으니 편 수만 쓴다.
 */
export const formatIslandMapLabel = (
  island: Pick<InsightIsland, 'articles' | 'progress'>,
  isAuthenticated: boolean,
) => {
  const total = island.articles.length;
  if (total === 0) return '미개척';
  return isAuthenticated
    ? `${total}편 중 ${island.progress?.read ?? 0}편 열림`
    : `개념글 ${total}편`;
};
