'use client';

import { useCommunityPostDetailQuery } from '@/features/community/model/use-community-query';
import CommunityDetailBodySection from '@/features/community/ui/community-detail-body-section';
import { renderAndSanitizeAppintossMarkdown } from './appintoss-markdown';

export default function CommunityReadOnly({ postId }: { postId: number }) {
  const postQuery = useCommunityPostDetailQuery(postId);

  if (!Number.isInteger(postId) || postId <= 0) {
    return (
      <section className="mx-auto max-w-9250 px-300 py-800" role="alert">
        <h1 className="font-designer-28b text-text-strong">
          올바르지 않은 글 주소예요
        </h1>
        <p className="mt-125 font-designer-16r text-text-subtle">
          커뮤니티에서 다른 글을 선택해 주세요.
        </p>
      </section>
    );
  }

  if (postQuery.isError) {
    return (
      <section className="mx-auto max-w-9250 px-300 py-800" role="alert">
        <h1 className="font-designer-28b text-text-strong">
          글을 불러오지 못했어요
        </h1>
        <p className="mt-125 font-designer-16r text-text-subtle">
          공개되지 않았거나 주소가 바뀐 글입니다.
        </p>
      </section>
    );
  }

  if (!postQuery.data) {
    return (
      <output
        className="mx-auto min-h-2000 max-w-9250 animate-pulse bg-background-disabled"
        aria-label="커뮤니티 글을 불러오는 중"
      />
    );
  }

  const post = postQuery.data;
  const sanitizedContentHtml = post.contentHtml
    ? renderAndSanitizeAppintossMarkdown(post.contentHtml)
    : post.contentHtml;
  return (
    <article className="mx-auto max-w-9250 px-300 py-500 sm:px-500">
      <header className="mb-300 border-b border-border-subtle pb-300">
        <p className="font-designer-13b text-text-brand">{post.board}</p>
        <h1 className="mt-100 font-designer-30b text-text-strong">
          {post.title}
        </h1>
        <p className="mt-125 font-designer-14r text-text-subtle">
          {post.authorName} · {post.createdAt}
        </p>
      </header>
      <CommunityDetailBodySection
        postId={post.id}
        title={post.title}
        contentHtml={sanitizedContentHtml}
        content={post.content}
        previewImage={post.previewImage}
        previewImageAlt={post.previewImageAlt}
        isPreview={post.access?.mode === 'TEASER'}
      />
    </article>
  );
}
