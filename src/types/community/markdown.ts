import {
  extractImageUrls,
  getFileExtension,
  getUrlPathExtension,
  stripUrlQueryAndFragment,
} from '@/lib/rich-text/markdown-utils';

export const COMMUNITY_MARKDOWN_MAX_IMAGE_COUNT = 3;
export const COMMUNITY_MARKDOWN_MAX_IMAGE_FILE_SIZE = 5 * 1024 * 1024;
export const COMMUNITY_MARKDOWN_ALLOWED_IMAGE_EXTENSIONS = [
  'jpg',
  'jpeg',
  'png',
  'webp',
  'gif',
  'heic',
  'heif',
] as const;
export const COMMUNITY_MARKDOWN_ALLOWED_IMAGE_EXTENSIONS_LABEL =
  COMMUNITY_MARKDOWN_ALLOWED_IMAGE_EXTENSIONS.join(', ');
export const COMMUNITY_CONTENT_IMAGE_PATH_PREFIX =
  'images/community-post-content/';
const COMMUNITY_CONTENT_IMAGE_PUBLIC_PATH_PREFIX = `/${COMMUNITY_CONTENT_IMAGE_PATH_PREFIX}`;
const COMMUNITY_MARKDOWN_HTML_BREAK_TAGS =
  /<(br|\/p|\/div|\/li|\/blockquote|\/h[1-6])[^>]*>/gi;
const COMMUNITY_MARKDOWN_HTML_TAGS = /<[^>]+>/g;
const COMMUNITY_MARKDOWN_IMG_SRC_ATTR_PATTERN =
  /(<img\b[^>]*?\bsrc\s*=\s*['"])([^'"]+)(['"][^>]*>)/gi;
const COMMUNITY_MARKDOWN_UNSAFE_HTML_PATTERN =
  /<\s*(script|iframe|object|embed|meta|link|style)|on[a-z]+\s*=|javascript:/i;

export { extractImageUrls, getFileExtension };

// 신뢰하는 이미지 origin은 누적 집합으로 관리한다. 단일 변수로 두면 마지막에
// 등록된 origin만 남아, 서로 다른 origin의 이미지가 본문에 섞이거나 SPA 내비게이션으로
// 다른 글의 origin이 덮어써질 때 검증이 영구 실패(저장 버튼 영구 비활성)한다.
const communityMarkdownAllowedAbsoluteImageOrigins = new Set<string>();

const decodeCommunityMarkdownHtmlEntities = (content: string) => {
  return content
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
};

export const isAllowedCommunityMarkdownImageExtension = (extension: string) => {
  return COMMUNITY_MARKDOWN_ALLOWED_IMAGE_EXTENSIONS.includes(
    extension as (typeof COMMUNITY_MARKDOWN_ALLOWED_IMAGE_EXTENSIONS)[number],
  );
};

export const extractCommunityMarkdownPlainText = (content: string) => {
  return decodeCommunityMarkdownHtmlEntities(content)
    .replace(COMMUNITY_MARKDOWN_HTML_BREAK_TAGS, '\n')
    .replace(COMMUNITY_MARKDOWN_HTML_TAGS, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

export const hasMeaningfulCommunityMarkdownContent = (content: string) => {
  return (
    extractCommunityMarkdownPlainText(content).length > 0 ||
    extractImageUrls(content).length > 0
  );
};

export const hasUnsafeCommunityMarkdownHtml = (content: string) => {
  return COMMUNITY_MARKDOWN_UNSAFE_HTML_PATTERN.test(content);
};

const getCommunityMarkdownAbsoluteImageOrigin = (url: string) => {
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return undefined;
    }

    const normalizedPath = stripUrlQueryAndFragment(parsedUrl.pathname);
    if (
      !normalizedPath.startsWith(COMMUNITY_CONTENT_IMAGE_PUBLIC_PATH_PREFIX)
    ) {
      return undefined;
    }

    return parsedUrl.origin;
  } catch {
    return undefined;
  }
};

export const registerCommunityMarkdownTrustedImageUrl = (url: string) => {
  const nextOrigin = getCommunityMarkdownAbsoluteImageOrigin(url);

  if (!nextOrigin) {
    return;
  }

  communityMarkdownAllowedAbsoluteImageOrigins.add(nextOrigin);
};

export const registerCommunityMarkdownTrustedImageUrlsFromContent = (
  content: string,
) => {
  for (const imageUrl of extractImageUrls(content)) {
    const nextOrigin = getCommunityMarkdownAbsoluteImageOrigin(imageUrl);

    if (!nextOrigin) {
      continue;
    }

    // 본문의 모든 이미지 origin을 등록한다(첫 이미지에서 멈추지 않는다).
    communityMarkdownAllowedAbsoluteImageOrigins.add(nextOrigin);
  }
};

export const isCommunityMarkdownImageUrl = (url: string) => {
  const trimmedUrl = url.trim();
  const normalizedUrl = stripUrlQueryAndFragment(trimmedUrl);

  if (
    normalizedUrl.startsWith(COMMUNITY_CONTENT_IMAGE_PATH_PREFIX) ||
    normalizedUrl.startsWith(COMMUNITY_CONTENT_IMAGE_PUBLIC_PATH_PREFIX)
  ) {
    return true;
  }

  try {
    const parsedUrl = new URL(trimmedUrl);
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return false;
    }

    const normalizedPath = stripUrlQueryAndFragment(parsedUrl.pathname);

    return (
      normalizedPath.startsWith(COMMUNITY_CONTENT_IMAGE_PUBLIC_PATH_PREFIX) &&
      communityMarkdownAllowedAbsoluteImageOrigins.has(parsedUrl.origin)
    );
  } catch {
    return false;
  }
};

export const toCommunityContentImagePath = (url: string) => {
  const trimmedUrl = decodeCommunityMarkdownHtmlEntities(url).trim();
  const normalizedUrl = stripUrlQueryAndFragment(trimmedUrl);

  if (normalizedUrl.startsWith(COMMUNITY_CONTENT_IMAGE_PATH_PREFIX)) {
    return normalizedUrl;
  }

  if (normalizedUrl.startsWith(COMMUNITY_CONTENT_IMAGE_PUBLIC_PATH_PREFIX)) {
    return normalizedUrl.slice(1);
  }

  try {
    const parsedUrl = new URL(trimmedUrl);
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return undefined;
    }

    const normalizedPath = stripUrlQueryAndFragment(parsedUrl.pathname);
    if (
      !normalizedPath.startsWith(COMMUNITY_CONTENT_IMAGE_PUBLIC_PATH_PREFIX)
    ) {
      return undefined;
    }

    return normalizedPath.slice(1);
  } catch {
    return undefined;
  }
};

export const normalizeCommunityMarkdownImageSourcesForStorage = (
  content: string,
) => {
  return content.replace(
    COMMUNITY_MARKDOWN_IMG_SRC_ATTR_PATTERN,
    (
      matchedImageTag,
      srcPrefix: string,
      imageUrl: string,
      srcSuffix: string,
    ) => {
      const internalImagePath = toCommunityContentImagePath(imageUrl);

      if (!internalImagePath) {
        return matchedImageTag;
      }

      return `${srcPrefix}${internalImagePath}${srcSuffix}`;
    },
  );
};

export const hasAllowedCommunityMarkdownImageExtension = (url: string) => {
  const extension = getUrlPathExtension(url);

  return isAllowedCommunityMarkdownImageExtension(extension);
};
