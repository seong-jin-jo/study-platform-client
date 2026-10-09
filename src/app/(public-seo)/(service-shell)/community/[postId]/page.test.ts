import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CommunitySeoDocument } from '@/types/community/seo';
import CommunityDetailPage from './page';

const { getCommunitySeoDocumentInServer } = vi.hoisted(() => ({
  getCommunitySeoDocumentInServer: vi.fn(),
}));

vi.mock('@/api/endpoints/community/community-seo.server', () => ({
  getCommunitySeoDocumentInServer,
}));

vi.mock('@/features/community/ui/pages/community-detail-page-client', () => ({
  default: () =>
    createElement('main', { 'data-testid': 'community-detail-client' }),
}));

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('not found');
  },
}));

const document: CommunitySeoDocument = {
  resourceType: 'COMMUNITY_POST',
  postId: 913,
  canonicalPath: '/community/913',
  title: '초기 HTML SEO 검증 글',
  publicSummaryText: '사람에게 보이는 300자 이하 미리보기입니다.',
  publicSummaryHtml: '<p>사람에게 보이는 미리보기입니다.</p>',
  accessMode: 'TEASER',
  bodyAccess: 'ROOM_MEMBER',
  author: {
    publicProfileUuid: '11111111-1111-4111-8111-111111111111',
    nickname: '검증 작성자',
  },
  sourceRoom: {
    roomId: 7,
    name: '바이브코딩 질문',
    canonicalPath: '/community/rooms/7',
  },
  commentCount: 0,
  likeCount: 0,
  viewCount: 0,
  publishedAt: '2026-08-06T09:00:00+09:00',
  updatedAt: '2026-08-06T10:00:00+09:00',
};

describe('community detail SEO server render', () => {
  beforeEach(() => {
    getCommunitySeoDocumentInServer.mockReset().mockResolvedValue(document);
  });

  it('renders only the room teaser and safe JSON-LD in server HTML', async () => {
    const page = await CommunityDetailPage({
      params: Promise.resolve({ postId: '913' }),
      searchParams: Promise.resolve({}),
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain('"@type":"WebPage"');
    expect(html).toContain(
      '"abstract":"사람에게 보이는 300자 이하 미리보기입니다."',
    );
    expect(html).not.toContain('SEO_FULL_BODY_MARKER');
    expect(html).not.toContain('gatedBodyHtml');
    expect(html).not.toContain('cssSelector');
  });

  it('renders canonical and social metadata from one upstream document fetch', async () => {
    const html = renderToStaticMarkup(
      await CommunityDetailPage({
        params: Promise.resolve({ postId: '913' }),
        searchParams: Promise.resolve({}),
      }),
    );

    expect(html).toContain(
      '<link rel="canonical" href="https://www.zeroone.it.kr/community/913"/>',
    );
    expect(html).toContain(
      `<meta name="description" content="${document.publicSummaryText}"/>`,
    );
    expect(html).toContain('<meta property="og:type" content="article"/>');
    expect(getCommunitySeoDocumentInServer).toHaveBeenCalledTimes(1);
  });

  it('renders a global FULL post as DiscussionForumPosting with public text and source fields', async () => {
    getCommunitySeoDocumentInServer.mockResolvedValueOnce({
      ...document,
      accessMode: 'FULL',
      bodyAccess: 'PUBLIC',
      publicBodyHtml: '<p>GLOBAL_FULL_BODY_MARKER</p>',
      author: {
        publicProfileUuid: '11111111-1111-4111-8111-111111111111',
        nickname: '검증 작성자',
        canonicalPath: '/members/11111111-1111-4111-8111-111111111111',
      },
      sourceRoom: undefined,
      commentCount: 7,
      likeCount: 11,
      viewCount: 29,
    });

    const html = renderToStaticMarkup(
      await CommunityDetailPage({
        params: Promise.resolve({ postId: '913' }),
        searchParams: Promise.resolve({}),
      }),
    );

    expect(html).toContain('"@type":"DiscussionForumPosting"');
    expect(html).toContain('"text":" GLOBAL_FULL_BODY_MARKER "');
    expect(html).toContain('"commentCount":7');
    expect(html).toContain('"datePublished"');
    expect(html).toContain('/members/11111111-1111-4111-8111-111111111111');
  });

  it('uses the withdrawn-author fallback name and omits author URL', async () => {
    getCommunitySeoDocumentInServer.mockResolvedValueOnce({
      ...document,
      accessMode: 'FULL',
      bodyAccess: 'PUBLIC',
      publicBodyHtml: '<p>탈퇴 뒤에도 남는 공개 글</p>',
      author: { nickname: '탈퇴한 사용자' },
      sourceRoom: undefined,
    });

    const html = renderToStaticMarkup(
      await CommunityDetailPage({
        params: Promise.resolve({ postId: '913' }),
        searchParams: Promise.resolve({}),
      }),
    );

    expect(html).toContain('"name":"탈퇴한 사용자"');
    expect(html).not.toContain('"url":"https://www.zeroone.it.kr/members/');
  });

  it('returns notFound for a missing or newly ineligible public post', async () => {
    getCommunitySeoDocumentInServer.mockResolvedValueOnce(undefined);

    await expect(
      CommunityDetailPage({
        params: Promise.resolve({ postId: '913' }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow('not found');
    expect(getCommunitySeoDocumentInServer).toHaveBeenCalledTimes(1);
  });
});
