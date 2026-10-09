const DEFAULT_ALLOWED_MEDIA_HOSTS = new Set([
  'api.zeroone.it.kr',
  'blog.zeroone.it.kr',
  'test-api.zeroone.it.kr',
  'test-blog.zeroone.it.kr',
  'www.zeroone.it.kr',
]);

export const APPINTOSS_ALLOWED_MARKDOWN_ELEMENTS = [
  'a',
  'blockquote',
  'br',
  'code',
  'del',
  'div',
  'em',
  'figcaption',
  'figure',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'img',
  'li',
  'ol',
  'p',
  'pre',
  'section',
  'span',
  'strong',
  'table',
  'tbody',
  'td',
  'th',
  'thead',
  'tr',
  'u',
  'ul',
  'video',
] as const;

const getAllowedMediaHosts = (runtimeHost?: string) => {
  const hosts = new Set(DEFAULT_ALLOWED_MEDIA_HOSTS);

  for (const value of [
    process.env.NEXT_PUBLIC_API_BASE_URL,
    process.env.NEXT_PUBLIC_API_PROD_BASE_URL,
  ]) {
    if (!value) continue;
    try {
      hosts.add(new URL(value).hostname);
    } catch {
      // Invalid environment URLs never become allowlist entries.
    }
  }

  if (runtimeHost) hosts.add(runtimeHost);
  return hosts;
};

export function isAllowedAppintossMediaUrl(
  value: string,
  runtimeHost?: string,
) {
  const normalized = value.trim();
  if (
    normalized.startsWith('/') &&
    !normalized.startsWith('//') &&
    !normalized.includes('\\')
  ) {
    return true;
  }

  try {
    const url = new URL(normalized);
    const allowedHosts = getAllowedMediaHosts(runtimeHost);
    return (
      url.protocol === 'https:' &&
      (allowedHosts.has(url.hostname) ||
        url.hostname.endsWith('.r2.cloudflarestorage.com'))
    );
  } catch {
    return false;
  }
}

export function isAllowedAppintossHref(value: string) {
  const normalized = value.trim();
  if (normalized.startsWith('#')) return !normalized.includes('\\');
  if (
    !normalized.startsWith('/') ||
    normalized.startsWith('//') ||
    normalized.includes('\\')
  ) {
    return false;
  }

  try {
    const appOrigin = 'https://appintoss.invalid';
    return new URL(normalized, appOrigin).origin === appOrigin;
  } catch {
    return false;
  }
}

export function transformAppintossMarkdownUrl(
  value: string,
  key: string,
  node: Readonly<{ tagName: string }>,
) {
  if (
    (key === 'src' || key === 'poster') &&
    (node.tagName === 'img' || node.tagName === 'video')
  ) {
    return isAllowedAppintossMediaUrl(value) ? value : '';
  }

  if (key === 'href' && node.tagName === 'a') {
    return isAllowedAppintossHref(value) ? value : '';
  }
  return '';
}
