import { isAxiosError } from 'axios';
import { isApiError } from '@/api/client/api-error';
import { axiosInstance } from '@/api/client/axios';
import { getInsightViewerKey } from '@/api/endpoints/insights/insight-worldmap-api';
import type { BaseResponse } from '@/types/retention/contracts';

export const INSIGHT_SOCIAL_PENDING_LABEL = '집계 전';
export const INSIGHT_SECTION_COMMENT_MAX_LENGTH = 120;
export const INSIGHT_SECTION_COMMENT_LOGIN_PROMPT =
  '로그인하면 한 줄 의견을 남길 수 있어요.';
export const INSIGHT_TIP_LOGIN_PROMPT =
  '로그인하면 꿀팁 저장을 남길 수 있어요.';

export type InsightSectionReactionKind = 'agree' | 'known' | 'new';

export interface InsightPollOptionTally {
  key: string;
  count: number;
}

export interface InsightPollSnapshot {
  pollId: string;
  total: number;
  options: InsightPollOptionTally[];
  mine: string | null;
}

export interface InsightSectionComment {
  id: number | string;
  nickname: string;
  text: string;
  createdAt: string;
}

export interface InsightSectionReactionSnapshot {
  sectionId: string;
  counts: Record<InsightSectionReactionKind, number>;
  mine: InsightSectionReactionKind | null;
  comments: InsightSectionComment[];
  commentCount: number;
}

export interface InsightTipSavedResult {
  saved: boolean;
}

function unwrap<T>(data: BaseResponse<T>, fallbackMessage: string): T {
  if (data.content === undefined || data.content === null) {
    throw new Error(fallbackMessage);
  }
  return data.content;
}

function isQuietInsightSocialFailure(error: unknown): boolean {
  if (isApiError(error)) {
    return error.statusCode >= 400 && error.statusCode < 500;
  }
  if (!isAxiosError(error)) return false;
  if (!error.response) return true;
  const status = error.response.status;
  return status >= 400 && status < 500;
}

async function readInsightSocialOrNull<T>(
  run: () => Promise<T>,
): Promise<T | null> {
  try {
    return await run();
  } catch (error) {
    if (isQuietInsightSocialFailure(error)) return null;
    throw error;
  }
}

function viewerHeaders() {
  return { headers: { 'X-Insight-Viewer-Key': getInsightViewerKey() } };
}

function articlePath(documentId: string, rest: string) {
  return `insight/articles/${encodeURIComponent(documentId)}/${rest}`;
}

// 서버 option 은 [A-Za-z0-9]+(?:-[A-Za-z0-9]+)* (최대 64자)만 받는다.
// 화면 라벨은 보내지 않고 o0, o1, ... 만 보낸다.
export function pollOptionKey(_option: string, index: number): string {
  return `o${index}`;
}

// h2 슬러그를 s- + djb2 하위 32bit hex 8자리로 바꾼다.
// localStorage 키와 h2 앵커는 슬러그 원문이고, 이 값은 요청 경로에만 쓴다.
export function sectionReactionToken(sectionId: string): string {
  return `s-${djb2Hex8(sectionId)}`;
}

function djb2Hex8(value: string): string {
  let hash = 5381;
  for (let i = 0; i < value.length; i += 1) {
    hash = (Math.imul(hash, 33) + value.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

export function findPollOptionIndex(
  mine: string | null | undefined,
  options: string[],
): number | null {
  if (mine === null || mine === undefined || mine === '') return null;
  const token = /^o(\d+)$/.exec(mine);
  if (token) {
    const index = Number(token[1]);
    return index < options.length ? index : null;
  }
  const byLabel = options.findIndex((option) => option.trim() === mine.trim());
  if (byLabel >= 0) return byLabel;
  if (/^\d+$/.test(mine)) {
    const asIndex = Number(mine);
    if (asIndex < options.length) return asIndex;
  }
  return null;
}

export function pollOptionCount(
  snapshot: InsightPollSnapshot | null,
  option: string,
  index: number,
): number | null {
  if (!snapshot) return null;
  const key = pollOptionKey(option, index);
  const legacyLabel = option.trim();
  const found =
    snapshot.options.find((item) => item.key === key) ??
    (legacyLabel.length > 0
      ? snapshot.options.find((item) => item.key === legacyLabel)
      : undefined) ??
    snapshot.options.find((item) => item.key === String(index));
  return found ? found.count : null;
}

export function formatReactionCountLabel(
  count: number | null | undefined,
): string {
  if (typeof count !== 'number' || !Number.isFinite(count)) {
    return INSIGHT_SOCIAL_PENDING_LABEL;
  }
  return Math.max(0, Math.trunc(count)).toLocaleString('ko-KR');
}

export function insightPollFooterMessage(hasServerSnapshot: boolean): string {
  return hasServerSnapshot
    ? '답을 저장했어요.'
    : '답을 저장했어요. 결과는 집계 전이라 아직 비율을 보여드리지 않아요.';
}

export function clampInsightSectionComment(text: string): string {
  return text.trim().slice(0, INSIGHT_SECTION_COMMENT_MAX_LENGTH);
}

export function canSubmitInsightSectionComment(
  isMember: boolean,
  text: string,
): 'guest' | 'empty' | 'ok' {
  if (!isMember) return 'guest';
  if (clampInsightSectionComment(text).length < 1) return 'empty';
  return 'ok';
}

export function asInsightSectionReaction(
  value: string | null | undefined,
): InsightSectionReactionKind | null {
  return value === 'agree' || value === 'known' || value === 'new'
    ? value
    : null;
}

export async function getInsightPoll(documentId: string, pollId: string) {
  return readInsightSocialOrNull(async () => {
    const { data } = await axiosInstance.get<BaseResponse<InsightPollSnapshot>>(
      articlePath(documentId, `polls/${encodeURIComponent(pollId)}`),
      viewerHeaders(),
    );
    return unwrap(data, '설문 집계 응답이 없습니다.');
  });
}

export async function voteInsightPoll(
  documentId: string,
  pollId: string,
  option: string,
) {
  const { data } = await axiosInstance.put<BaseResponse<InsightPollSnapshot>>(
    articlePath(documentId, `polls/${encodeURIComponent(pollId)}/votes/me`),
    { option },
    viewerHeaders(),
  );
  return unwrap(data, '설문 투표 응답이 없습니다.');
}

export async function getInsightSectionReactions(
  documentId: string,
  sectionId: string,
) {
  return readInsightSocialOrNull(async () => {
    const { data } = await axiosInstance.get<
      BaseResponse<InsightSectionReactionSnapshot>
    >(
      articlePath(
        documentId,
        `sections/${encodeURIComponent(sectionId)}/reactions`,
      ),
      viewerHeaders(),
    );
    return unwrap(data, '절 반응 집계 응답이 없습니다.');
  });
}

export async function setInsightSectionReaction(
  documentId: string,
  sectionId: string,
  reaction: InsightSectionReactionKind,
) {
  const { data } = await axiosInstance.put<
    BaseResponse<InsightSectionReactionSnapshot>
  >(
    articlePath(
      documentId,
      `sections/${encodeURIComponent(sectionId)}/reactions/me`,
    ),
    { reaction },
    viewerHeaders(),
  );
  return unwrap(data, '절 반응 응답이 없습니다.');
}

export async function addInsightSectionComment(
  documentId: string,
  sectionId: string,
  text: string,
) {
  const { data } = await axiosInstance.post<
    BaseResponse<InsightSectionReactionSnapshot>
  >(
    articlePath(
      documentId,
      `sections/${encodeURIComponent(sectionId)}/comments`,
    ),
    { text: clampInsightSectionComment(text) },
  );
  return unwrap(data, '한 줄 의견 응답이 없습니다.');
}

export async function getInsightTipSaved(documentId: string, tipId: string) {
  return readInsightSocialOrNull(async () => {
    const { data } = await axiosInstance.get<
      BaseResponse<InsightTipSavedResult>
    >(articlePath(documentId, `tips/${encodeURIComponent(tipId)}/saved/me`));
    return unwrap(data, '꿀팁 저장 응답이 없습니다.');
  });
}

export async function setInsightTipSaved(
  documentId: string,
  tipId: string,
  saved: boolean,
) {
  const path = articlePath(
    documentId,
    `tips/${encodeURIComponent(tipId)}/saved/me`,
  );
  const { data } = saved
    ? await axiosInstance.put<BaseResponse<InsightTipSavedResult>>(path)
    : await axiosInstance.delete<BaseResponse<InsightTipSavedResult>>(path);
  return unwrap(data, '꿀팁 저장 응답이 없습니다.');
}
