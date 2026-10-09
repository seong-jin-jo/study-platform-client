import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RoomSeoDocument } from '@/types/community/seo';

const mocks = vi.hoisted(() => ({ getRoomSeoDocumentInServer: vi.fn() }));
vi.mock('@/api/endpoints/community/community-seo.server', () => mocks);
vi.mock('@/components/community/pages/community-room-detail-page', () => ({
  default: () => createElement('main'),
}));
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('not found');
  },
}));

import Page from './page';

const document: RoomSeoDocument = {
  resourceType: 'COMMUNITY_ROOM',
  roomId: 17,
  canonicalPath: '/community/rooms/17',
  name: '배포방',
  description: '운영 경험을 나눕니다',
  updatedAt: '2026-08-16T06:00:00+09:00',
  posts: [
    {
      postId: 91,
      title: '롤백 기준',
      publicSummary: 'ROOM_TEASER_MARKER',
      canonicalPath: '/community/91',
      updatedAt: '2026-08-16T06:00:00+09:00',
    },
  ],
};

describe('room SEO SSR', () => {
  beforeEach(() =>
    mocks.getRoomSeoDocumentInServer.mockReset().mockResolvedValue(document),
  );
  it('renders room metadata and teaser without a full body key', async () => {
    const html = renderToStaticMarkup(
      await Page({ params: Promise.resolve({ roomId: '17' }) }),
    );
    expect(html).toContain('ROOM_TEASER_MARKER');
    expect(html).toContain('"@type":"CollectionPage"');
    expect(html).not.toContain('contentHtml');
  });
  it('reserves the hydrated hero actions and three public story cards on first paint', async () => {
    const stableDocument: RoomSeoDocument = {
      ...document,
      bannerUrl: 'https://cdn.zeroone.test/room-banner.jpg',
      posts: Array.from({ length: 20 }, (_, index) => ({
        ...document.posts[0],
        postId: 91 + index,
        canonicalPath: `/community/${91 + index}`,
      })),
    };
    mocks.getRoomSeoDocumentInServer.mockResolvedValue(stableDocument);

    const html = renderToStaticMarkup(
      await Page({ params: Promise.resolve({ roomId: '17' }) }),
    );

    expect(html).toContain('min-h-1250');
    expect(html.match(/min-h-1625/g)).toHaveLength(3);
    expect(html).toContain('room-banner.jpg');
    expect(html).not.toContain('max-w-2xl');
    expect(html.match(/<article/g)).toHaveLength(3);
    expect(html).toContain('"position":20');
    expect(html).toContain('방 목록');
    expect(html).toContain('이 방에 정착하기');
  });
  it.each([
    0, 1, 3, 4, 20,
  ])('renders min(%i, 3) visible cards while keeping the full schema list', async (postCount) => {
    const posts = Array.from({ length: postCount }, (_, index) => ({
      ...document.posts[0],
      postId: 91 + index,
      canonicalPath: `/community/${91 + index}`,
    }));
    mocks.getRoomSeoDocumentInServer.mockResolvedValue({
      ...document,
      posts,
    });

    const html = renderToStaticMarkup(
      await Page({ params: Promise.resolve({ roomId: '17' }) }),
    );

    expect(html.match(/<article/g) ?? []).toHaveLength(Math.min(postCount, 3));
    expect(html.match(/"@type":"ListItem"/g) ?? []).toHaveLength(postCount);
    if (postCount === 0) {
      expect(html).toContain('아직 새 글이 없어요');
      expect(html).toContain(
        '첫 질문과 작업 기록이 이 방의 다음 대화를 시작해요.',
      );
    }
  });
  it('does not reserve banner media when the public DTO has no banner', async () => {
    const html = renderToStaticMarkup(
      await Page({ params: Promise.resolve({ roomId: '17' }) }),
    );

    expect(html).not.toContain('배포방 배너');
    expect(html).not.toContain('h-1250 sm:h-1750');
  });
  it('uses one DTO fetch for room canonical metadata and content', async () => {
    const html = renderToStaticMarkup(
      await Page({ params: Promise.resolve({ roomId: '17' }) }),
    );
    expect(html).toContain(
      '<link rel="canonical" href="https://www.zeroone.it.kr/community/rooms/17"/>',
    );
    expect(html).toContain(
      `<meta name="description" content="${document.description}"/>`,
    );
    expect(mocks.getRoomSeoDocumentInServer).toHaveBeenCalledTimes(1);
  });
});
