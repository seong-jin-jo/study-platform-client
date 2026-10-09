import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

describe('Strapi media URL server conversion', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('STRAPI_URL', 'https://blog.zeroone.test/');
    vi.stubEnv('STRAPI_API_TOKEN', 'test-token');
  });

  it('커버·아바타·본문 이미지·비디오·첨부를 절대 URL로 변환한다', async () => {
    const { toRenderableArticle } = await import('./media-url');
    const article = {
      id: 1,
      documentId: 'doc-1',
      slug: 'event-loop',
      title: '이벤트 루프',
      description: '설명',
      createdAt: '2026-08-01',
      updatedAt: '2026-08-01',
      publishedAt: '2026-08-01',
      category: {
        id: 1,
        documentId: 'cat-1',
        name: '웹',
        slug: 'web',
        description: '',
        createdAt: '2026-08-01',
        updatedAt: '2026-08-01',
        publishedAt: '2026-08-01',
      },
      author: {
        id: 1,
        documentId: 'author-1',
        name: 'ZERO-ONE',
        email: 'team@zeroone.test',
        createdAt: '2026-08-01',
        updatedAt: '2026-08-01',
        publishedAt: '2026-08-01',
        avatar: {
          id: 2,
          documentId: 'avatar-1',
          name: 'avatar',
          mime: 'image/png',
          url: '/uploads/avatar.png',
        },
      },
      cover: {
        id: 3,
        documentId: 'cover-1',
        name: 'cover',
        mime: 'image/png',
        url: '/uploads/cover.png',
        formats: { thumbnail: { url: '/uploads/internal-thumbnail.png' } },
      },
      blocks: [
        {
          __component: 'shared.rich-text',
          id: 998,
          body: '![그림](/uploads/body.png) <video poster="/uploads/poster.jpg" src="/uploads/movie.mp4"></video>',
          internalNote: 'DROP_BLOCK_INTERNAL',
        },
        {
          __component: 'shared.media',
          file: { url: '/uploads/attachment.pdf' },
        },
      ],
    };

    const converted = toRenderableArticle(article);

    expect(converted.cover?.url).toBe(
      'https://blog.zeroone.test/uploads/cover.png',
    );
    expect(converted.author.avatar?.url).toBe(
      'https://blog.zeroone.test/uploads/avatar.png',
    );
    expect(converted.author.email).toBe('team@zeroone.test');
    expect(converted).not.toHaveProperty('id');
    expect(converted.category).toEqual({ name: '웹', slug: 'web' });
    expect(converted.cover).not.toHaveProperty('id');
    expect(converted.cover).not.toHaveProperty('documentId');
    expect(converted.cover).not.toHaveProperty('formats');
    expect(converted.blocks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          body: expect.stringContaining(
            'https://blog.zeroone.test/uploads/movie.mp4',
          ),
        }),
        expect.objectContaining({
          file: { url: 'https://blog.zeroone.test/uploads/attachment.pdf' },
        }),
      ]),
    );
    expect(converted.blocks).toHaveLength(2);
    expect(converted.blocks?.[0]).not.toHaveProperty('id');
    expect(converted.blocks?.[0]).not.toHaveProperty('internalNote');
    expect(JSON.stringify(converted)).not.toContain('DROP_BLOCK_INTERNAL');
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
  ])('작성자 relation이 %s여도 편집팀 fallback으로 렌더하고 개인정보를 만들지 않는다', async (_state, author) => {
    const { toRenderableArticle } = await import('./media-url');
    const article = {
      documentId: 'doc-without-author',
      slug: 'article-without-author',
      title: '작성자 없는 글',
      description: '설명',
      createdAt: '2026-08-01',
      updatedAt: '2026-08-01',
      publishedAt: '2026-08-01',
      category: {
        id: 1,
        documentId: 'cat-1',
        name: '웹',
        slug: 'web',
        description: '',
        createdAt: '2026-08-01',
        updatedAt: '2026-08-01',
        publishedAt: '2026-08-01',
      },
      author,
      blocks: [{ __component: 'shared.rich-text', body: '안전한 본문입니다.' }],
    };

    const converted = toRenderableArticle(article);

    expect(converted.author).toEqual({ name: 'ZERO-ONE 편집팀' });
    expect(converted.author).not.toHaveProperty('email');
    expect(converted.author).not.toHaveProperty('avatar');
    expect(converted.blocks).toHaveLength(1);
  });

  it('S8-SEO-001 정상: 렌더 대상이 아닌 Strapi SEO 메타 블록은 본문에서 제외한다', async () => {
    const { toRenderableArticle } = await import('./media-url');
    const article = {
      documentId: 'doc-with-seo-block',
      slug: 'article-with-seo-block',
      title: 'SEO 블록이 포함된 글',
      description: '설명',
      createdAt: '2026-08-01',
      updatedAt: '2026-08-01',
      publishedAt: '2026-08-01',
      category: {
        id: 1,
        documentId: 'cat-1',
        name: '웹',
        slug: 'web',
        description: '',
        createdAt: '2026-08-01',
        updatedAt: '2026-08-01',
        publishedAt: '2026-08-01',
      },
      author: null,
      blocks: [
        { __component: 'shared.rich-text', body: '안전한 본문입니다.' },
        {
          __component: 'shared.seo',
          metaTitle: '검색 제목',
          metaDescription: '검색 설명',
        },
      ],
    };

    const converted = toRenderableArticle(article);

    expect(converted.blocks).toEqual([
      { __component: 'shared.rich-text', body: '안전한 본문입니다.' },
    ]);
  });

  it('S8-SEO-002 거절: shared.seo 이외의 unknown component는 계속 fail-closed한다', async () => {
    const { toRenderableArticle, UnsafeStrapiArticleContentError } =
      await import('./media-url');
    const article = {
      documentId: 'doc-with-unknown-block',
      slug: 'article-with-unknown-block',
      title: '알 수 없는 블록이 포함된 글',
      description: '설명',
      createdAt: '2026-08-01',
      updatedAt: '2026-08-01',
      publishedAt: '2026-08-01',
      category: {
        id: 1,
        documentId: 'cat-1',
        name: '웹',
        slug: 'web',
        description: '',
        createdAt: '2026-08-01',
        updatedAt: '2026-08-01',
        publishedAt: '2026-08-01',
      },
      author: null,
      blocks: [
        { __component: 'shared.rich-text', body: '안전한 본문입니다.' },
        { __component: 'future.unknown-media', body: 'future' },
      ],
    };

    expect(() =>
      toRenderableArticle(article as Parameters<typeof toRenderableArticle>[0]),
    ).toThrow(UnsafeStrapiArticleContentError);
  });

  it.each([
    [
      'script element',
      {
        __component: 'shared.rich-text',
        body: '<script>alert(1)</script>',
      },
    ],
    [
      'mismatched inline code delimiter around script',
      {
        __component: 'shared.rich-text',
        body: '`<script>alert(1)</script>``',
      },
    ],
    [
      'event attribute',
      {
        __component: 'shared.rich-text',
        body: '<img src="/uploads/x.png" onerror="alert(1)">',
      },
    ],
    [
      'executable protocol',
      {
        __component: 'shared.rich-text',
        body: '[실행](javascript:alert(1))',
      },
    ],
    [
      'unsafe media URL',
      {
        __component: 'shared.media',
        file: { url: 'javascript:alert(1)' },
      },
    ],
    [
      'script in quote body',
      {
        __component: 'shared.quote',
        title: '인용',
        body: '<script>alert(1)</script>',
      },
    ],
    [
      'event attribute in quote body',
      {
        __component: 'shared.quote',
        body: '<img src="/uploads/x.png" onerror="alert(1)">',
      },
    ],
  ])('fails closed for %s', async (_name, block) => {
    const { toRenderableArticle, UnsafeStrapiArticleContentError } =
      await import('./media-url');
    const article = {
      documentId: 'unsafe-doc',
      slug: 'unsafe-article',
      title: '거부 대상',
      description: '설명',
      createdAt: '2026-08-01',
      updatedAt: '2026-08-01',
      publishedAt: '2026-08-01',
      category: {
        id: 1,
        documentId: 'cat-1',
        name: '웹',
        slug: 'web',
        description: '',
        createdAt: '2026-08-01',
        updatedAt: '2026-08-01',
        publishedAt: '2026-08-01',
      },
      author: {
        id: 1,
        documentId: 'author-1',
        name: 'ZERO-ONE',
        email: 'team@zeroone.test',
        createdAt: '2026-08-01',
        updatedAt: '2026-08-01',
        publishedAt: '2026-08-01',
      },
      blocks: [block],
    };

    expect(() =>
      toRenderableArticle(article as Parameters<typeof toRenderableArticle>[0]),
    ).toThrow(UnsafeStrapiArticleContentError);
  });

  it('일반 텍스트와 fenced/inline code의 uploads 경로는 변조하지 않는다', async () => {
    const { toRenderableArticle } = await import('./media-url');
    const body = [
      '본문 예시: curl /uploads/plain.txt',
      '`curl /uploads/inline.txt`',
      '`<img src="x" onerror="alert(1)">`',
      '```sh',
      '<script>curl /uploads/fenced.txt</script>',
      '```',
      '![그림](/uploads/image.png)',
      '<video poster="/uploads/poster.jpg" src="/uploads/movie.mp4"></video>',
    ].join('\n');
    const article = {
      id: 1,
      documentId: 'doc-1',
      slug: 'event-loop',
      title: '이벤트 루프',
      description: 'curl /uploads/description.txt',
      createdAt: '2026-08-01',
      updatedAt: '2026-08-01',
      publishedAt: '2026-08-01',
      category: {
        id: 1,
        documentId: 'cat-1',
        name: '웹',
        slug: 'web',
        description: '',
        createdAt: '2026-08-01',
        updatedAt: '2026-08-01',
        publishedAt: '2026-08-01',
      },
      author: {
        id: 1,
        documentId: 'author-1',
        name: 'ZERO-ONE',
        email: 'team@zeroone.test',
        createdAt: '2026-08-01',
        updatedAt: '2026-08-01',
        publishedAt: '2026-08-01',
      },
      blocks: [{ __component: 'shared.rich-text', body }],
    };

    const converted = toRenderableArticle(article);
    const firstBlock = converted.blocks?.[0];
    if (firstBlock?.__component !== 'shared.rich-text') {
      throw new Error('rich text block expected');
    }
    const convertedBody = firstBlock.body as string;

    expect(converted.description).toBe('curl /uploads/description.txt');
    expect(convertedBody).toContain('curl /uploads/plain.txt');
    expect(convertedBody).toContain('`curl /uploads/inline.txt`');
    expect(convertedBody).toContain('`<img src="x" onerror="alert(1)">`');
    expect(convertedBody).toContain('curl /uploads/fenced.txt');
    expect(convertedBody).toContain(
      '![그림](https://blog.zeroone.test/uploads/image.png)',
    );
    expect(convertedBody).toContain(
      'poster="https://blog.zeroone.test/uploads/poster.jpg"',
    );
  });

  it('이미 절대 URL인 미디어는 그대로 둔다', async () => {
    const { toAbsoluteMediaUrl } = await import('./media-url');

    expect(toAbsoluteMediaUrl('https://cdn.example.com/image.png')).toBe(
      'https://cdn.example.com/image.png',
    );
  });
});
