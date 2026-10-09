const ALLOWED_STATIC_PATHS = new Set([
  '/',
  '/class',
  '/class/detail',
  '/community',
  '/community/read',
  '/insights',
  '/insights/read',
]);

const toQuery = (key, value) => `${key}=${encodeURIComponent(value)}`;

const normalizePathname = (pathname) =>
  pathname === '/' ? pathname : pathname.replace(/\/+$/, '');

const toStaticPath = (pathname) =>
  pathname === '/' ? pathname : `${pathname}/`;

export function resolveAppintossHref(rawHref) {
  if (
    !rawHref.startsWith('/') ||
    rawHref.startsWith('//') ||
    rawHref.includes('\\')
  ) {
    return undefined;
  }

  const url = new URL(rawHref, 'https://appintoss.invalid');
  if (url.origin !== 'https://appintoss.invalid') return undefined;

  const pathname = normalizePathname(url.pathname);
  if (ALLOWED_STATIC_PATHS.has(pathname)) {
    return `${toStaticPath(pathname)}${url.search}${url.hash}`;
  }

  const koanMatch = pathname.match(/^\/insights\/koans\/(\d+)$/);
  if (koanMatch) {
    return `/insights/read/?kind=koan&${toQuery('id', koanMatch[1])}`;
  }

  if (pathname === '/insights/koans' || pathname === '/insights/land') {
    return '/insights/';
  }

  const insightMatch = pathname.match(/^\/insights\/([a-z0-9_-]+)$/i);
  if (insightMatch) {
    return `/insights/read/?${toQuery('slug', insightMatch[1])}`;
  }

  const communityMatch = pathname.match(/^\/community\/(\d+)$/);
  if (communityMatch) {
    return `/community/read/?${toQuery('postId', communityMatch[1])}`;
  }

  const classMatch = pathname.match(/^\/class\/([a-z0-9_-]+)$/i);
  if (classMatch) {
    return `/class/detail/?${toQuery('slug', classMatch[1])}`;
  }

  return undefined;
}
