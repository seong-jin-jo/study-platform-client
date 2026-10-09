import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { QuestionSeoDocument } from '@/types/community/seo';

const mocks = vi.hoisted(() => ({ getQuestionSeoDocumentInServer: vi.fn() }));
vi.mock('@/api/endpoints/community/community-seo.server', () => mocks);
vi.mock(
  '@/features/community/ui/pages/community-qna-detail-page-client',
  () => ({ default: () => createElement('main') }),
);
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('not found');
  },
}));

import Page from './page';

const document: QuestionSeoDocument = {
  resourceType: 'QNA_QUESTION',
  questionId: 501,
  canonicalPath: '/community/questions/501',
  title: 'health check 경계는?',
  contentHtml: '<p>QUESTION_PUBLIC_MARKER</p>',
  excerpt: '질문 요약',
  author: { name: '빌더A' },
  acceptedAnswer: null,
  answers: [
    {
      answerId: 702,
      contentHtml: '<p>ANSWER_PUBLIC_MARKER</p>',
      author: { name: '빌더B' },
      createdAt: '2026-08-16T06:00:00+09:00',
      updatedAt: '2026-08-16T06:00:00+09:00',
      commentCount: 0,
      likeCount: 1,
    },
  ],
  answerCount: 1,
  createdAt: '2026-08-16T06:00:00+09:00',
  updatedAt: '2026-08-16T06:00:00+09:00',
};

describe('question SEO SSR', () => {
  beforeEach(() =>
    mocks.getQuestionSeoDocumentInServer
      .mockReset()
      .mockResolvedValue(document),
  );
  it('renders public question, answer and QAPage before hydration', async () => {
    const html = renderToStaticMarkup(
      await Page({
        params: Promise.resolve({ questionId: '501' }),
        searchParams: Promise.resolve({}),
      }),
    );
    expect(html).toContain('QUESTION_PUBLIC_MARKER');
    expect(html).toContain('ANSWER_PUBLIC_MARKER');
    expect(html).toContain('"text":"QUESTION_PUBLIC_MARKER"');
    expect(html).not.toContain('"text":"\\u003cp\\u003e');
    expect(html).toContain('"datePublished"');
    expect(html).not.toContain('"dateCreated"');
    expect(html).toContain('"@type":"QAPage"');
  });
  it('uses one DTO fetch for canonical metadata and the visible summary', async () => {
    const html = renderToStaticMarkup(
      await Page({
        params: Promise.resolve({ questionId: '501' }),
        searchParams: Promise.resolve({}),
      }),
    );
    expect(html).toContain(
      '<link rel="canonical" href="https://www.zeroone.it.kr/community/questions/501"/>',
    );
    expect(html).toContain('<meta name="description" content="질문 요약"/>');
    expect(mocks.getQuestionSeoDocumentInServer).toHaveBeenCalledTimes(1);
  });

  it('renders a valid zero-answer QAPage without Answer nodes', async () => {
    mocks.getQuestionSeoDocumentInServer.mockResolvedValueOnce({
      ...document,
      acceptedAnswer: null,
      answers: [],
      answerCount: 0,
    });

    const html = renderToStaticMarkup(
      await Page({
        params: Promise.resolve({ questionId: '501' }),
        searchParams: Promise.resolve({}),
      }),
    );

    expect(html).toContain('답변 0개');
    expect(html).toContain('"answerCount":0');
    expect(html).not.toContain('"@type":"Answer"');
    expect(html).not.toContain('"acceptedAnswer"');
  });

  it('keeps total 21 while rendering accepted once plus 19 ordered answers', async () => {
    const accepted = {
      answerId: 700,
      contentHtml: '<p>ACCEPTED_700</p>',
      author: { name: '채택자' },
      createdAt: '2026-08-16T06:00:00+09:00',
      updatedAt: '2026-08-16T06:00:00+09:00',
      commentCount: 0,
      likeCount: 3,
    };
    const answers = Array.from({ length: 19 }, (_, index) => ({
      ...accepted,
      answerId: 701 + index,
      contentHtml: `<p>ANSWER_${701 + index}</p>`,
      author: { name: `답변자 ${index + 1}` },
      createdAt: `2026-08-16T06:${String(index + 1).padStart(2, '0')}:00+09:00`,
    }));
    mocks.getQuestionSeoDocumentInServer.mockResolvedValueOnce({
      ...document,
      acceptedAnswer: accepted,
      answers,
      answerCount: 21,
    });

    const html = renderToStaticMarkup(
      await Page({
        params: Promise.resolve({ questionId: '501' }),
        searchParams: Promise.resolve({}),
      }),
    );

    expect(html).toContain('답변 21개');
    expect(html.match(/"@type":"Answer"/g)).toHaveLength(20);
    expect(html.match(/ACCEPTED_700/g)).toHaveLength(2);
    expect(html.indexOf('ANSWER_701')).toBeLessThan(html.indexOf('ANSWER_719'));
  });
});
