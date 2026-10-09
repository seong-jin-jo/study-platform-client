import axios, { type AxiosRequestConfig } from 'axios';

const APPINTOSS_SLUG_PATTERN = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/i;
const APPINTOSS_MAX_IDENTIFIER_LENGTH = 191;

export const IS_APPINTOSS_RUNTIME =
  process.env.NEXT_PUBLIC_RUNTIME_TARGET === 'appintoss';

export interface AppintossArticleAccess {
  access: 'PUBLIC' | 'AUTHENTICATION_REQUIRED' | 'BUDGET_REQUIRED' | 'UNLOCKED';
  documentId: string;
  excerpt: string;
  firstFree: boolean;
  remainingToday?: number;
  slug: string;
  title: string;
}

export interface AppintossArticleBody {
  accessProof: 'PUBLIC' | 'UNLOCKED';
  bodyHtml: string;
  documentId: string;
  media: Array<{ alt: string; url: string }>;
  title: string;
}

export interface AppintossBaseResponse<T> {
  statusCode: number;
  timestamp: string;
  content: T;
  message: string | null;
}

export function unwrapAppintossBaseResponse<T>(value: unknown): T {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('content' in value) ||
    !('statusCode' in value) ||
    typeof value.statusCode !== 'number' ||
    !('timestamp' in value) ||
    typeof value.timestamp !== 'string'
  ) {
    throw new Error('Invalid App-in-Toss API response envelope');
  }

  return value.content as T;
}

export function assertAppintossSlug(value: string): string {
  const normalized = value.trim();
  if (
    normalized.length === 0 ||
    normalized.length > APPINTOSS_MAX_IDENTIFIER_LENGTH ||
    !APPINTOSS_SLUG_PATTERN.test(normalized)
  ) {
    throw new Error('Invalid App-in-Toss content slug');
  }
  return normalized;
}

export function assertAppintossPositiveId(value: string | number): number {
  const normalized = typeof value === 'number' ? value : Number(value);
  if (!Number.isSafeInteger(normalized) || normalized <= 0) {
    throw new Error('Invalid App-in-Toss numeric identifier');
  }
  return normalized;
}

const appintossPublicClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  headers: { Accept: 'application/json' },
  timeout: 15_000,
  withCredentials: false,
});

export async function appintossPublicGet<T>(
  path: string,
  config?: Omit<
    AxiosRequestConfig,
    'data' | 'method' | 'url' | 'withCredentials'
  >,
): Promise<T> {
  if (!path.startsWith('/api/')) {
    throw new Error('App-in-Toss public API path must start with /api/');
  }

  const response = await appintossPublicClient.get<AppintossBaseResponse<T>>(
    path,
    {
      ...config,
      withCredentials: false,
    },
  );
  return unwrapAppintossBaseResponse<T>(response.data);
}

export const getAppintossArticleAccess = (slug: string) =>
  appintossPublicGet<AppintossArticleAccess>(
    `/api/v7/app/insights/articles/${encodeURIComponent(assertAppintossSlug(slug))}/access`,
  );

export const getAppintossArticleBody = (slug: string) =>
  appintossPublicGet<AppintossArticleBody>(
    `/api/v7/app/insights/articles/${encodeURIComponent(assertAppintossSlug(slug))}/body`,
    { headers: { 'Cache-Control': 'no-store' } },
  );
