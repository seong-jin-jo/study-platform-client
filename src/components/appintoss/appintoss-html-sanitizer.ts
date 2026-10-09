import DOMPurify from 'dompurify';
import {
  isAllowedAppintossHref,
  isAllowedAppintossMediaUrl,
} from './appintoss-content-policy';

const FORBIDDEN_APPINTOSS_TAGS = [
  'audio',
  'embed',
  'form',
  'iframe',
  'link',
  'object',
  'script',
  'source',
  'style',
  'track',
  'video',
];

export function sanitizeAppintossArticleHtml(value: string): string {
  if (typeof window === 'undefined') {
    throw new Error('App-in-Toss article sanitizer requires a browser runtime');
  }
  const purifier = DOMPurify(window);
  if (!purifier.isSupported) {
    throw new Error('App-in-Toss article sanitizer requires a browser runtime');
  }

  const sanitized = purifier.sanitize(value, {
    FORBID_ATTR: ['srcdoc', 'style'],
    FORBID_TAGS: FORBIDDEN_APPINTOSS_TAGS,
    USE_PROFILES: { html: true },
  });
  const document = new window.DOMParser().parseFromString(
    sanitized,
    'text/html',
  );
  document.querySelectorAll('img[src]').forEach((image) => {
    const source = image.getAttribute('src')?.trim();
    if (
      !source ||
      !isAllowedAppintossMediaUrl(source, window.location.hostname)
    ) {
      image.remove();
    }
  });
  document.querySelectorAll('a[href]').forEach((anchor) => {
    const href = anchor.getAttribute('href')?.trim();
    if (href && isAllowedAppintossHref(href)) return;
    anchor.removeAttribute('href');
    anchor.removeAttribute('target');
    anchor.removeAttribute('rel');
  });

  return document.body.innerHTML;
}
