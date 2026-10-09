import 'server-only';

import { cache } from 'react';
import type {
  CommunitySeoDocument,
  CommunitySitemapResource,
  CommunitySitemapResourcePage,
  LegacyCommunitySeoDocument,
  QuestionSeoDocument,
  RoomSeoDocument,
} from '@/types/community/seo';

interface ApiResponse<T> {
  content: T;
}

const apiBase = () => {
  const value = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '');
  if (!value) throw new Error('NEXT_PUBLIC_API_BASE_URL is required');
  return value;
};

const publicGet = async <T>(
  path: string,
  params?: Record<string, string | number | undefined>,
  signal?: AbortSignal,
): Promise<{ status: number; content?: T }> => {
  const url = new URL(`${apiBase()}${path}`);
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined) url.searchParams.set(key, String(value));
  });
  const response = await fetch(url, {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
    signal,
  });
  if (response.status === 404 || response.status === 410) {
    return { status: response.status };
  }
  if (response.status === 409) return { status: response.status };
  if (!response.ok) {
    throw new Error(`Public community API failed: ${response.status}`);
  }
  const envelope = (await response.json()) as Partial<ApiResponse<T>>;
  if (envelope.content === undefined) {
    throw new Error('Public community API returned a malformed envelope');
  }
  return { status: response.status, content: envelope.content };
};

const toSafeLegacyTeaser = (
  legacy: LegacyCommunitySeoDocument,
): CommunitySeoDocument => {
  const {
    gatedBodyHtml: _discardedBody,
    gatedCssSelector: _discardedSelector,
    hasPart: _discardedPart,
    ...publicFields
  } = legacy;

  return {
    resourceType: 'COMMUNITY_POST',
    postId: publicFields.postId,
    canonicalPath: publicFields.canonicalPath,
    title: publicFields.title,
    publicSummaryText: publicFields.previewText,
    publicSummaryHtml: `<p>${publicFields.previewText}</p>`,
    accessMode: 'TEASER',
    bodyAccess: 'ROOM_MEMBER',
    author: publicFields.author,
    sourceRoom: publicFields.sourceRoom,
    commentCount: 0,
    likeCount: 0,
    viewCount: 0,
    publishedAt: publicFields.publishedAt,
    updatedAt: publicFields.updatedAt,
  };
};

export const getCommunitySeoDocumentInServer = cache(
  async (postId: number): Promise<CommunitySeoDocument | undefined> => {
    const current = await publicGet<CommunitySeoDocument>(
      `/api/v2/community/posts/${postId}/seo-document`,
    );
    if (current.content) return current.content;
    if (current.status !== 404) return undefined;

    const legacy = await publicGet<LegacyCommunitySeoDocument>(
      `/api/v1/community/posts/${postId}/seo-document`,
    );
    return legacy.content ? toSafeLegacyTeaser(legacy.content) : undefined;
  },
);

export const getCommunitySitemapResourcesInServer = async (
  options: {
    types?: string;
    partitionStartExclusive?: string;
    partitionEndInclusive?: string;
  } = {},
): Promise<CommunitySitemapResource[]> => {
  const deadline = Date.now() + 10_000;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const resources: CommunitySitemapResource[] = [];
    const paths = new Set<string>();
    const seenCursors = new Set<string>();
    let cursor: string | undefined;
    let snapshot: string | undefined;
    let expectedTotal: number | undefined;
    let restart = false;

    do {
      if (Date.now() >= deadline)
        throw new Error('Community sitemap traversal timed out');
      const response = await publicGet<CommunitySitemapResourcePage>(
        '/api/v1/community/sitemap-resources',
        {
          types: options.types ?? 'POST,ROOM,QUESTION',
          size: 1000,
          ...(cursor ? { cursor } : {}),
          ...(snapshot ? { snapshot } : {}),
          partitionStartExclusive: options.partitionStartExclusive,
          partitionEndInclusive: options.partitionEndInclusive,
        },
        AbortSignal.timeout(Math.max(1, deadline - Date.now())),
      );
      if (response.status === 409) {
        restart = true;
        break;
      }
      if (!response.content)
        throw new Error('Community sitemap endpoint disappeared');
      const page = response.content;
      if (snapshot && page.snapshot !== snapshot) {
        throw new Error('Community sitemap snapshot changed during traversal');
      }
      expectedTotal ??= page.totalItems;
      if (page.totalItems !== expectedTotal) {
        throw new Error(
          'Community sitemap signed total changed during traversal',
        );
      }
      for (const item of page.items) {
        if (paths.has(item.canonicalPath)) {
          throw new Error(
            'Community sitemap canonical path duplicate detected',
          );
        }
        paths.add(item.canonicalPath);
        resources.push(item);
      }
      const nextCursor = page.nextCursor ?? undefined;
      if (nextCursor && seenCursors.has(nextCursor)) {
        throw new Error('Community sitemap cursor cycle detected');
      }
      if (nextCursor) seenCursors.add(nextCursor);
      cursor = nextCursor;
      snapshot = page.snapshot;
      if (seenCursors.size > 10_000)
        throw new Error('Community sitemap page guard exceeded');
    } while (cursor);

    if (restart) continue;
    if (resources.length !== expectedTotal) {
      throw new Error('Community sitemap emitted count mismatch');
    }
    return resources;
  }
  throw new Error('Community sitemap snapshot invalidated repeatedly');
};

const getPublicSeoDocument = async <T>(
  path: string,
): Promise<T | undefined> => {
  const response = await publicGet<T>(path);
  return response.content;
};

export const getQuestionSeoDocumentInServer = cache((questionId: number) =>
  getPublicSeoDocument<QuestionSeoDocument>(
    `/api/v1/community/questions/${questionId}/seo-document`,
  ),
);

export const getRoomSeoDocumentInServer = cache((roomId: number) =>
  getPublicSeoDocument<RoomSeoDocument>(
    `/api/v1/community/rooms/${roomId}/seo-document`,
  ),
);

export { toSafeLegacyTeaser };
