export interface ArticleMedia {
  id: number;
  documentId: string;
  name: string;
  url: string;
  mime: string;
  alternativeText?: string | null;
  formats?: Record<string, unknown>;
}

export interface RenderableMedia {
  name?: string;
  url: string;
  mime?: string;
  alternativeText?: string | null;
}

export type RenderableArticleBlock =
  | {
      __component: 'shared.rich-text';
      body:
        | string
        | Array<{
            type: string;
            children: Array<{ text: string }>;
          }>;
    }
  | { __component: 'shared.quote'; title?: string; body?: string }
  | {
      __component: 'shared.media';
      file?: RenderableMedia;
      data?: RenderableMedia;
    }
  | { __component: 'shared.slider'; files: RenderableMedia[] };

export interface StrapiArticle {
  category: {
    name: string;
    createdAt: string;
    updatedAt: string;
    publishedAt: string;
    id: number;
    slug: string;
    documentId: string;
    description: string;
  };
  author?: {
    name: string;
    createdAt: string;
    updatedAt: string;
    publishedAt: string;
    id: number;
    email?: string;
    documentId: string;
    avatar?: ArticleMedia;
  } | null;
  title: string;
  slug: string;
  description: string;
  cover?: ArticleMedia;
  blocks?: Record<string, unknown>[];
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

export interface RenderableArticle {
  documentId: string;
  slug: string;
  title: string;
  description: string;
  cover?: RenderableMedia;
  category: { name: string; slug: string };
  author: {
    name: string;
    email?: string;
    avatar?: RenderableMedia;
  };
  publishedAt: string;
  updatedAt: string;
  blocks?: RenderableArticleBlock[];
}

export interface ArticleTeaser {
  documentId: string;
  slug: string;
  title: string;
  islandId: number;
  islandSlug: string;
  islandName?: string;
  ordinal: number;
  teaser: string;
  coverUrl: string | null;
  unlockCost: number;
  accessReason:
    | 'FIRST_ARTICLE'
    | 'ALREADY_UNLOCKED'
    | 'AUTHENTICATION_REQUIRED'
    | 'BUDGET_REQUIRED'
    | 'AUTH_DEGRADED';
  budget: { balance: number; dailyCap: number } | null;
  freeAlternative: { type: 'KOAN'; koanId: number } | null;
}
