'use client';

import { useEffect, useState } from 'react';
import type { ArticleTeaser } from '@/types/insights/article';
import { useAuthReady } from '@/features/auth/model/use-auth';
import {
  fetchPrivateArticleBodyWithRefresh,
  type PrivateArticleBodyResponse,
} from '@/features/seo/api/private-article-body';
import { PUBLIC_AUTH_BOOTSTRAP_STATES } from '@/features/auth/client/public-auth-bootstrap-state';
import { usePublicAuthBootstrapState } from '@/features/auth/client/public-auth-bootstrap';
import BlogDetailPage from './blog-detail-page';
import LockedArticleView from './locked-article-view';

export default function GatedArticleClient({
  teaser,
}: {
  teaser: ArticleTeaser;
}) {
  const { isHydrated, isAuthenticated, memberId } = useAuthReady();
  const bootstrapState = usePublicAuthBootstrapState();
  const [body, setBody] = useState<PrivateArticleBodyResponse>();
  const [degraded, setDegraded] = useState(false);

  useEffect(() => {
    if (
      !isHydrated ||
      !isAuthenticated ||
      bootstrapState === PUBLIC_AUTH_BOOTSTRAP_STATES.PENDING ||
      body
    )
      return;
    const controller = new AbortController();

    fetchPrivateArticleBodyWithRefresh(teaser.slug, (input, init) =>
      fetch(input, { ...init, signal: controller.signal }),
    )
      .then((value) => {
        if (value) setBody(value);
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          setDegraded(true);
        }
      });

    return () => controller.abort();
  }, [body, bootstrapState, isAuthenticated, isHydrated, teaser.slug]);

  if (body) {
    return (
      <BlogDetailPage
        article={body.article}
        memberId={memberId}
        authDegraded={body.access.authDegraded}
        accessMeta={teaser}
      />
    );
  }

  return (
    <LockedArticleView
      teaser={teaser}
      memberId={memberId}
      authDegraded={degraded}
    />
  );
}
