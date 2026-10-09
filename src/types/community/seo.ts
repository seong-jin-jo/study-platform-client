/* eslint-disable @rushstack/no-new-null -- backend SEO JSON contract explicitly returns nullable fields and cursors. */
export interface CommunitySeoAuthor {
  publicProfileUuid?: string | null;
  nickname: string;
  canonicalPath?: string | null;
}

export interface CommunitySeoSourceRoom {
  roomId: number;
  name: string;
  canonicalPath?: string;
}

interface CommunitySeoDocumentBase {
  resourceType: 'COMMUNITY_POST';
  postId: number;
  canonicalPath: string;
  title: string;
  publicSummaryText: string;
  publicSummaryHtml: string;
  author: CommunitySeoAuthor;
  sourceRoom?: CommunitySeoSourceRoom | null;
  previewImageUrl?: string | null;
  commentCount: number;
  likeCount: number;
  viewCount: number;
  publishedAt: string;
  updatedAt: string;
}

export interface CommunitySeoFullDocument extends CommunitySeoDocumentBase {
  accessMode: 'FULL';
  bodyAccess: 'PUBLIC';
  publicBodyHtml: string;
}

export interface CommunitySeoTeaserDocument extends CommunitySeoDocumentBase {
  accessMode: 'TEASER';
  bodyAccess: 'ROOM_MEMBER';
  publicBodyHtml?: never;
}

export type CommunitySeoDocument =
  | CommunitySeoFullDocument
  | CommunitySeoTeaserDocument;

export type CommunitySeoPreview = {
  postId: number;
  title: string;
  previewText: string;
  author: CommunitySeoAuthor;
  sourceRoom?: CommunitySeoSourceRoom | null;
  publishedAt: string;
  accessMode: 'FULL' | 'TEASER';
  publicBodyHtml?: string;
};

export interface CommunitySitemapResource {
  type: 'POST' | 'ROOM' | 'QUESTION';
  id: string | number;
  canonicalPath: string;
  updatedAt: string;
}

export interface CommunitySitemapResourcePage {
  items: CommunitySitemapResource[];
  nextCursor?: string | null;
  snapshot: string;
  datasetTotalItems: number;
  totalItems: number;
}

export interface LegacyCommunitySeoDocument {
  postId: number;
  canonicalPath: string;
  title: string;
  previewText: string;
  gatedBodyHtml?: string;
  gatedCssSelector?: string;
  hasPart?: unknown;
  author: CommunitySeoAuthor;
  sourceRoom?: CommunitySeoSourceRoom | null;
  publishedAt: string;
  updatedAt: string;
}

export interface QuestionSeoAuthor {
  name: string;
  publicProfileUuid?: string | null;
  canonicalPath?: string | null;
  profileImageUrl?: string | null;
}

export interface QuestionSeoAnswer {
  answerId: number;
  contentHtml: string;
  author: QuestionSeoAuthor;
  createdAt: string;
  updatedAt: string;
  commentCount: number;
  likeCount: number;
}

export interface QuestionSeoDocument {
  resourceType: 'QNA_QUESTION';
  questionId: number;
  canonicalPath: string;
  title: string;
  contentHtml: string;
  excerpt: string;
  author: QuestionSeoAuthor;
  acceptedAnswer?: QuestionSeoAnswer | null;
  answers: QuestionSeoAnswer[];
  answerCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface RoomSeoDocument {
  resourceType: 'COMMUNITY_ROOM';
  roomId: number;
  canonicalPath: string;
  name: string;
  description: string;
  bannerUrl?: string | null;
  posts: Array<{
    postId: number;
    title: string;
    publicSummary: string;
    canonicalPath: string;
    updatedAt: string;
  }>;
  updatedAt: string;
}
