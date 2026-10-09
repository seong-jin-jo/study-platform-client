import 'server-only';

import { cache } from 'react';
import type {
  PublicProfileResponse,
  PublicProfileSitemapResource,
  PublicProfileSitemapResourcePage,
} from '@/types/api/public-profile.types';

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
): Promise<T | undefined> => {
  const url = new URL(`${apiBase()}${path}`);
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined) url.searchParams.set(key, String(value));
  });
  const response = await fetch(url, {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });
  if (response.status === 404 || response.status === 410) return undefined;
  if (!response.ok) {
    throw new Error(`Public profile API failed: ${response.status}`);
  }
  const envelope = (await response.json()) as Partial<ApiResponse<T>>;
  if (envelope.content === undefined) {
    throw new Error('Public profile API returned a malformed envelope');
  }
  return envelope.content;
};

export const getPublicProfileInServer = cache(
  async (profileUuid: string): Promise<PublicProfileResponse | undefined> => {
    return publicGet<PublicProfileResponse>(
      `/api/v1/members/${encodeURIComponent(profileUuid)}/public-profile`,
      { listSize: 5 },
    );
  },
);

export const getPublicProfileSitemapResourcesInServer = async (
  options: {
    partitionStartExclusive?: string;
    partitionEndInclusive?: string;
  } = {},
): Promise<PublicProfileSitemapResource[]> => {
  const deadline = Date.now() + 10_000;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const resources: PublicProfileSitemapResource[] = [];
    const paths = new Set<string>();
    let cursor: string | undefined;
    let snapshot: string | undefined;
    const seenCursors = new Set<string>();
    let expectedTotal: number | undefined;
    let restart = false;

    do {
      if (Date.now() >= deadline)
        throw new Error('Profile sitemap traversal timed out');
      const url = new URL(
        `${apiBase()}/api/v1/members/public-profile-sitemap-resources`,
      );
      url.searchParams.set('size', '1000');
      if (cursor) url.searchParams.set('cursor', cursor);
      if (snapshot) url.searchParams.set('snapshot', snapshot);
      if (options.partitionStartExclusive !== undefined) {
        url.searchParams.set(
          'partitionStartExclusive',
          options.partitionStartExclusive,
        );
      }
      if (options.partitionEndInclusive !== undefined) {
        url.searchParams.set(
          'partitionEndInclusive',
          options.partitionEndInclusive,
        );
      }
      const response = await fetch(url, {
        cache: 'no-store',
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(Math.max(1, deadline - Date.now())),
      });
      if (response.status === 409) {
        restart = true;
        break;
      }
      if (!response.ok)
        throw new Error(`Profile sitemap API failed: ${response.status}`);
      const envelope = (await response.json()) as Partial<
        ApiResponse<PublicProfileSitemapResourcePage>
      >;
      const page = envelope.content;
      if (!page || !Array.isArray(page.items) || !page.snapshot) {
        throw new Error('Profile sitemap endpoint returned malformed data');
      }
      if (snapshot && page.snapshot !== snapshot) {
        throw new Error('Profile sitemap snapshot changed during traversal');
      }
      expectedTotal ??= page.totalItems;
      if (page.totalItems !== expectedTotal) {
        throw new Error(
          'Profile sitemap signed total changed during traversal',
        );
      }
      for (const item of page.items) {
        if (paths.has(item.canonicalPath)) {
          throw new Error('Profile sitemap canonical path duplicate detected');
        }
        paths.add(item.canonicalPath);
        resources.push(item);
      }
      const nextCursor = page.nextCursor ?? undefined;
      if (nextCursor && seenCursors.has(nextCursor)) {
        throw new Error('Profile sitemap cursor cycle detected');
      }
      if (nextCursor) seenCursors.add(nextCursor);
      cursor = nextCursor;
      snapshot = page.snapshot;
      if (seenCursors.size > 10_000)
        throw new Error('Profile sitemap page guard exceeded');
    } while (cursor);

    if (restart) continue;
    if (resources.length !== expectedTotal) {
      throw new Error('Profile sitemap emitted count mismatch');
    }
    return resources;
  }
  throw new Error('Profile sitemap snapshot invalidated repeatedly');
};
