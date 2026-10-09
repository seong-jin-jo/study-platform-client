const POSITIVE_INTEGER = /^[1-9]\d*$/;
const CANONICAL_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const ARTICLE_RESERVED_SEGMENTS = new Set(['weekly', 'koans', 'land']);
const POST_RESERVED_SEGMENTS = new Set(['write', 'questions', 'rooms']);
const PUBLIC_SEO_ROOTS = new Set(['home', 'insights', 'community', 'members']);
const ENCODED_PATH_CONTROL = /%(?:25){0,2}(?:00|0a|0d|2f|5c)/i;
const RAW_PATH_CONTROL = /[\0\r\n\\]/;

export const PUBLIC_SEO_PATH_KINDS = {
  INVALID: 'invalid',
  OTHER: 'other',
  PUBLIC: 'public',
} as const;

export type PublicSeoPathDecision =
  | { kind: typeof PUBLIC_SEO_PATH_KINDS.PUBLIC; segments: string[] }
  | { kind: typeof PUBLIC_SEO_PATH_KINDS.INVALID; status: 400 | 404 }
  | { kind: typeof PUBLIC_SEO_PATH_KINDS.OTHER };

export const extractRawPathname = (requestUrl: string): string => {
  const scheme = requestUrl.indexOf('://');
  const authorityStart = scheme >= 0 ? scheme + 3 : 0;
  const pathStart = requestUrl.indexOf('/', authorityStart);
  if (pathStart < 0) return '/';
  const queryStart = requestUrl.indexOf('?', pathStart);
  const hashStart = requestUrl.indexOf('#', pathStart);
  const candidates = [queryStart, hashStart].filter((value) => value >= 0);
  const pathEnd =
    candidates.length > 0 ? Math.min(...candidates) : requestUrl.length;
  return requestUrl.slice(pathStart, pathEnd);
};

const decodePathLayers = (pathname: string): string | undefined => {
  let decoded = pathname;
  try {
    for (let depth = 0; depth < 3; depth += 1) {
      const next = decodeURIComponent(decoded);
      if (next === decoded) return decoded;
      decoded = next;
    }
    return decoded;
  } catch {
    return undefined;
  }
};

const rawPublicSeoRoot = (pathname: string): string | undefined => {
  const firstSegment = pathname.split('/')[1];
  if (!firstSegment) return undefined;
  const decoded = decodePathLayers(firstSegment)?.toLowerCase();
  return decoded && PUBLIC_SEO_ROOTS.has(decoded) ? decoded : undefined;
};

const isUnsafePublicSeoPath = (pathname: string): boolean => {
  if (RAW_PATH_CONTROL.test(pathname) || ENCODED_PATH_CONTROL.test(pathname)) {
    return true;
  }

  const decoded = decodePathLayers(pathname);
  if (
    !decoded ||
    RAW_PATH_CONTROL.test(decoded) ||
    ENCODED_PATH_CONTROL.test(decoded)
  ) {
    return true;
  }

  return decoded
    .split('/')
    .some((segment) => segment === '.' || segment === '..');
};

const decodePathSegments = (pathname: string): string[] | undefined => {
  const decoded = decodePathLayers(pathname);
  if (!decoded?.startsWith('/') || decoded.includes('\0')) return undefined;
  return decoded.split('/').filter(Boolean);
};

const isPublicSeoSegments = (segments: string[]): boolean => {
  if (segments.length === 0) return true;
  if (segments.length === 1) {
    return ['home', 'insights', 'community'].includes(segments[0]);
  }

  if (segments.length === 2) {
    const [root, identifier] = segments;
    if (root === 'insights') {
      if (identifier === 'koans') return true;
      return Boolean(identifier) && !ARTICLE_RESERVED_SEGMENTS.has(identifier);
    }
    if (root === 'community') {
      return (
        POSITIVE_INTEGER.test(identifier) &&
        !POST_RESERVED_SEGMENTS.has(identifier)
      );
    }
    if (root === 'members') return CANONICAL_UUID.test(identifier);
    return false;
  }

  if (segments.length !== 3) return false;

  const [root, branch, identifier] = segments;
  if (root === 'insights' && branch === 'land') return Boolean(identifier);
  if (root === 'insights' && branch === 'koans') {
    return POSITIVE_INTEGER.test(identifier);
  }
  if (root === 'community' && ['questions', 'rooms'].includes(branch)) {
    return POSITIVE_INTEGER.test(identifier);
  }

  return false;
};

const hasInvalidPublicIdentifier = (segments: string[]): boolean => {
  if (segments.length === 2 && segments[0] === 'members') {
    return !CANONICAL_UUID.test(segments[1]);
  }
  if (segments.length !== 3) return false;
  const [root, branch, identifier] = segments;
  if (root === 'insights' && branch === 'koans') {
    return !POSITIVE_INTEGER.test(identifier);
  }
  if (root === 'community' && ['questions', 'rooms'].includes(branch)) {
    return !POSITIVE_INTEGER.test(identifier);
  }
  return false;
};

export const resolvePublicSeoPath = (
  pathname: string,
  rawPathname = pathname,
): PublicSeoPathDecision => {
  const publicRoot =
    rawPublicSeoRoot(rawPathname) ?? rawPublicSeoRoot(pathname);
  if (publicRoot && isUnsafePublicSeoPath(rawPathname)) {
    return { kind: PUBLIC_SEO_PATH_KINDS.INVALID, status: 400 };
  }

  const segments = decodePathSegments(pathname);
  if (!segments) {
    return publicRoot
      ? { kind: PUBLIC_SEO_PATH_KINDS.INVALID, status: 400 }
      : { kind: PUBLIC_SEO_PATH_KINDS.OTHER };
  }
  if (isPublicSeoSegments(segments)) {
    return { kind: PUBLIC_SEO_PATH_KINDS.PUBLIC, segments };
  }
  if (hasInvalidPublicIdentifier(segments)) {
    return { kind: PUBLIC_SEO_PATH_KINDS.INVALID, status: 404 };
  }
  return { kind: PUBLIC_SEO_PATH_KINDS.OTHER };
};

export const isPublicSeoPath = (pathname: string): boolean =>
  resolvePublicSeoPath(pathname).kind === PUBLIC_SEO_PATH_KINDS.PUBLIC;

export const PUBLIC_SEO_CREDENTIAL_HEADERS = [
  'cookie',
  'authorization',
  'x-zeroone-auth-session-state',
  'x-zeroone-auth-access-token',
  'x-zeroone-auth-member-id',
] as const;

export const createPublicSeoRequestHeaders = (headers: Headers): Headers => {
  const sanitized = new Headers(headers);
  PUBLIC_SEO_CREDENTIAL_HEADERS.forEach((name) => {
    sanitized.delete(name);
  });
  return sanitized;
};
