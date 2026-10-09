import { axiosInstance } from '@/api/client/axios';
import type {
  InsightHelpfulResult,
  InsightIsland,
  InsightMap,
  InsightProgressResult,
} from '@/types/insight-worldmap';
import type { BaseResponse } from '@/types/retention/contracts';

export interface InsightUnlockResult {
  unlocked: boolean;
  balanceAfter: number;
  cost: number;
}

export async function getInsightMap() {
  const { data } =
    await axiosInstance.get<BaseResponse<InsightMap>>('insight/map');
  return data.content;
}
export async function getInsightIsland(islandId: number) {
  const { data } = await axiosInstance.get<BaseResponse<InsightIsland>>(
    `insight/islands/${islandId}`,
  );
  return data.content;
}
export async function markInsightRead(documentId: string) {
  const { data } = await axiosInstance.put<BaseResponse<InsightProgressResult>>(
    `insight/articles/${encodeURIComponent(documentId)}/progress/me`,
    { state: 'READ' },
  );
  return data.content;
}
export async function setInsightHelpful(documentId: string, helpful: boolean) {
  const path = `insight/articles/${encodeURIComponent(documentId)}/helpful/me`;
  const { data } = helpful
    ? await axiosInstance.put<BaseResponse<InsightHelpfulResult>>(path)
    : await axiosInstance.delete<BaseResponse<InsightHelpfulResult>>(path);
  return data.content;
}
export async function unlockInsightArticle(documentId: string) {
  const { data } = await axiosInstance.post<
    BaseResponse<InsightUnlockResult> & { errorCode?: string }
  >(`insight/articles/${encodeURIComponent(documentId)}/unlock`);
  if (data.content) return data.content;
  if (data.errorCode === 'RBG001') {
    return { unlocked: false, balanceAfter: 0, cost: 0 };
  }
  throw new Error('개념글 해금 응답에 결과가 없습니다.');
}
export function getInsightViewerKey() {
  if (typeof window === 'undefined') return '';
  const key = 'zero-one-insight-viewer-key';
  const saved = window.localStorage.getItem(key);
  if (saved) return saved;
  const created = window.crypto.randomUUID();
  window.localStorage.setItem(key, created);
  return created;
}
export async function recordInsightView(documentId: string) {
  await axiosInstance.put(
    `insight/articles/${encodeURIComponent(documentId)}/views/me`,
    undefined,
    { headers: { 'X-Insight-Viewer-Key': getInsightViewerKey() } },
  );
}
