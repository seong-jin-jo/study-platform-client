import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ACTIVITY_PROGRESS_TARGETS,
  clampActivityProgress,
  type MyRepUiState,
  type RelatedPostsUiState,
  resolveMyRepUiState,
  resolveRelatedPostsUiState,
} from '@/utils/screen-resilience';

const readSource = (relativePath: string) =>
  readFileSync(join(process.cwd(), relativePath), 'utf8');

describe('screen resilience state resolution', () => {
  it.each<
    [
      string,
      Parameters<typeof resolveRelatedPostsUiState>[0],
      RelatedPostsUiState,
    ]
  >([
    [
      'hidden before observation',
      { isVisible: false, isLoading: true, isError: false, itemCount: 0 },
      'hidden',
    ],
    [
      'loading',
      { isVisible: true, isLoading: true, isError: false, itemCount: 0 },
      'loading',
    ],
    [
      'error',
      { isVisible: true, isLoading: false, isError: true, itemCount: 0 },
      'error',
    ],
    [
      'empty',
      { isVisible: true, isLoading: false, isError: false, itemCount: 0 },
      'empty',
    ],
    [
      'ready',
      { isVisible: true, isLoading: false, isError: false, itemCount: 1 },
      'ready',
    ],
    [
      'ready with cached posts during a background error',
      { isVisible: true, isLoading: false, isError: true, itemCount: 1 },
      'ready',
    ],
  ])('resolves related posts %s state', (_label, input, expected) => {
    expect(resolveRelatedPostsUiState(input)).toBe(expected);
  });

  it.each<[string, Parameters<typeof resolveMyRepUiState>[0], MyRepUiState]>([
    [
      'login',
      {
        isAuthenticated: false,
        isLoading: false,
        isError: false,
        hasData: false,
      },
      'login',
    ],
    [
      'loading',
      {
        isAuthenticated: true,
        isLoading: true,
        isError: false,
        hasData: false,
      },
      'loading',
    ],
    [
      'error',
      {
        isAuthenticated: true,
        isLoading: false,
        isError: true,
        hasData: false,
      },
      'error',
    ],
    [
      'empty',
      {
        isAuthenticated: true,
        isLoading: false,
        isError: false,
        hasData: false,
      },
      'empty',
    ],
    [
      'ready',
      {
        isAuthenticated: true,
        isLoading: false,
        isError: false,
        hasData: true,
      },
      'ready',
    ],
    [
      'ready with cached reputation during a background error',
      {
        isAuthenticated: true,
        isLoading: false,
        isError: true,
        hasData: true,
      },
      'ready',
    ],
  ])('resolves my reputation %s state', (_label, input, expected) => {
    expect(resolveMyRepUiState(input)).toBe(expected);
  });
});

describe('activity progress display', () => {
  it('keeps progress numerators inside their displayed denominators', () => {
    expect(
      clampActivityProgress(-1, ACTIVITY_PROGRESS_TARGETS.readingPoints),
    ).toBe(0);
    expect(
      clampActivityProgress(3, ACTIVITY_PROGRESS_TARGETS.readingPoints),
    ).toBe(3);
    expect(clampActivityProgress(12, ACTIVITY_PROGRESS_TARGETS.islands)).toBe(
      ACTIVITY_PROGRESS_TARGETS.islands,
    );
  });
});

describe('screen resilience markup contract', () => {
  it.each([
    'src/app/(landing)/class/page-client.tsx',
    'src/components/landing/benefit-carousel.tsx',
    'src/components/class/benefit-scroll-character.tsx',
  ])('gives every fill image an explicit object fit in %s', (relativePath) => {
    const source = readSource(relativePath);
    const fillImages = source
      .match(/<Image\b[\s\S]*?\/>/g)
      ?.filter((imageTag) => /\bfill\b/.test(imageTag));

    expect(fillImages?.length).toBeGreaterThan(0);
    expect(
      fillImages?.every((imageTag) =>
        /object-(?:cover|contain)/.test(imageTag),
      ),
    ).toBe(true);
  });

  it.each([
    'src/app/(class-lesson)/class/[slug]/lesson/[id]/_components/lesson-builder-feed-card.tsx',
    'src/app/(class-lesson)/class/[slug]/lesson/[id]/_components/lesson-qna-detail-modal.tsx',
    'src/app/(class-lesson)/class/[slug]/lesson/[id]/_components/lesson-builder-feed-detail-modal.tsx',
    'src/app/(landing)/class/[slug]/(learning)/qa/[id]/page-client.tsx',
    'src/app/(landing)/class/[slug]/(learning)/_components/qna-tab.tsx',
    'src/app/(landing)/class/[slug]/(learning)/feed/_components/feed-list-card.tsx',
    'src/app/(landing)/class/[slug]/(learning)/_components/feed-tab.tsx',
  ])('keeps user names inspectable and truncatable in %s', (relativePath) => {
    const source = readSource(relativePath);

    expect(source).toContain('title=');
    expect(source).toContain('truncate');
    expect(source).toContain('min-w-0');
  });

  it('keeps extracted home feed user names inspectable and truncatable', () => {
    const homeFeed = readSource('src/components/retention/home-feed.tsx');
    const homeFeedCard = readSource(
      'src/components/common/cards/home-feed-card.tsx',
    );

    expect(homeFeed).toContain('HomeFeedCommunityPostCard');
    expect(homeFeedCard).toContain('title={data.authorName}');
    expect(homeFeedCard).toContain('truncate');
    expect(homeFeedCard).toContain('min-w-0');
  });

  it('keeps empty and error modules visible', () => {
    const relatedPosts = readSource(
      'src/features/community/ui/community-detail-feed-section.tsx',
    );
    const articleDetail = readSource(
      'src/app/(service)/insights/ui/blog-detail-page.tsx',
    );
    const roomHub = readSource(
      'src/components/community/pages/community-room-hub-page.tsx',
    );

    expect(relatedPosts).toContain("uiState === 'empty'");
    expect(articleDetail).not.toContain(
      'if (!files || files.length === 0) return null',
    );
    expect(roomHub).not.toContain(
      'if (isLoading || isError || !data) return null',
    );
  });
});
