'use client';

import { sendGTMEvent } from '@next/third-parties/google';
import { useEffect, useRef } from 'react';

export function IslandEnterTracker({
  islandName,
  islandSlug,
}: {
  islandName: string;
  islandSlug: string;
}) {
  const trackedIslandSlug = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (trackedIslandSlug.current === islandSlug) return;

    trackedIslandSlug.current = islandSlug;
    sendGTMEvent({
      event: 'island_enter',
      island_slug: islandSlug,
      island_name: islandName,
    });
  }, [islandName, islandSlug]);

  return null;
}

export function ArticleViewTracker({
  accessState,
  articleSlug,
  islandSlug,
}: {
  accessState: 'FREE' | 'LOCKED' | 'UNLOCKED';
  articleSlug: string;
  islandSlug: string;
}) {
  const trackedView = useRef<string | undefined>(undefined);

  useEffect(() => {
    const viewKey = `${articleSlug}:${accessState}`;
    if (trackedView.current === viewKey) return;

    trackedView.current = viewKey;
    sendGTMEvent({
      event: 'article_view',
      article_slug: articleSlug,
      island_slug: islandSlug,
      access_state: accessState,
    });
  }, [accessState, articleSlug, islandSlug]);

  return null;
}
