import {
  ArticleAccessError,
  resolveArticleAccess,
} from '@/api/product/article-access';
import { readServerAccessToken } from '@/features/auth/model/server-auth-session';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const PRIVATE_HEADERS = {
  'Cache-Control': 'private, no-store',
  'Content-Type': 'application/json; charset=utf-8',
};

const errorResponse = (status: number, code: string) =>
  Response.json(
    { code, message: 'Article body request was rejected' },
    { status, headers: PRIVATE_HEADERS },
  );

const isAllowedBrowserSignal = (request: Request): boolean => {
  const configuredOrigin =
    process.env.APP_ORIGIN ?? 'https://www.zeroone.it.kr';
  const origin = request.headers.get('origin');
  const fetchSite = request.headers.get('sec-fetch-site');

  if (origin && origin !== configuredOrigin) return false;
  if (fetchSite && fetchSite !== 'same-origin') return false;
  return Boolean(origin || fetchSite);
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  if (!isAllowedBrowserSignal(request)) return errorResponse(403, 'BFF001');

  const { slug } = await params;
  try {
    const access = await resolveArticleAccess(
      slug,
      await readServerAccessToken(),
    );
    if (access.state === 'LOCKED') {
      return errorResponse(
        access.teaser.accessReason === 'AUTHENTICATION_REQUIRED' ? 401 : 403,
        access.teaser.accessReason,
      );
    }

    const article = await access.fetchBody();
    return Response.json(
      {
        article,
        access: { level: access.state, authDegraded: access.authDegraded },
      },
      { status: 200, headers: PRIVATE_HEADERS },
    );
  } catch (error) {
    if (error instanceof ArticleAccessError) {
      return errorResponse(error.status, error.code);
    }
    return errorResponse(503, 'SEO002');
  }
}
