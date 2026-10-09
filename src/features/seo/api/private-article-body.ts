import {
  CLIENT_AUTH_SESSION_REFRESH_RESULT_STATES,
  refreshClientAuthSession,
} from '@/api/client/auth-session-refresh';
import type { RenderableArticle } from '@/types/insights/article';

export interface PrivateArticleBodyResponse {
  article: RenderableArticle;
  access: { level: 'FREE' | 'UNLOCKED'; authDegraded: boolean };
}

type RequestBody = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;
type RefreshSession = typeof refreshClientAuthSession;

const requestPrivateBody = (slug: string, request: RequestBody) =>
  request(`/api/private/insights/${encodeURIComponent(slug)}/body`, {
    cache: 'no-store',
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
  });

export const fetchPrivateArticleBodyWithRefresh = async (
  slug: string,
  request: RequestBody = fetch,
  refresh: RefreshSession = refreshClientAuthSession,
): Promise<PrivateArticleBodyResponse | undefined> => {
  let response = await requestPrivateBody(slug, request);
  if (response.status === 401) {
    const refreshResult = await refresh();
    if (
      refreshResult.state !== CLIENT_AUTH_SESSION_REFRESH_RESULT_STATES.SUCCESS
    ) {
      return undefined;
    }
    response = await requestPrivateBody(slug, request);
  }

  if (response.status === 401 || response.status === 403) return undefined;
  if (!response.ok) {
    throw new Error(`Private article body failed: ${response.status}`);
  }
  return (await response.json()) as PrivateArticleBodyResponse;
};
