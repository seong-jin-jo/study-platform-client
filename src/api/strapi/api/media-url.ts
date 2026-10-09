import 'server-only';

import rehypeRaw from 'rehype-raw';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import { getStrapiBaseUrl } from '@/api/strapi/config/strapi-config';
import type {
  RenderableArticle,
  RenderableArticleBlock,
  RenderableMedia,
  StrapiArticle,
} from '@/types/insights/article';

const UPLOAD_PATH = '/uploads/';
const FALLBACK_ARTICLE_AUTHOR_NAME = 'ZERO-ONE 편집팀';

export class UnsafeStrapiArticleContentError extends Error {
  readonly code = 'UNSAFE_STRAPI_ARTICLE_CONTENT';

  constructor(readonly reason: string) {
    super('Unsafe Strapi article content was rejected');
    this.name = 'UnsafeStrapiArticleContentError';
  }
}

const rejectUnsafeContent = (reason: string): never => {
  throw new UnsafeStrapiArticleContentError(reason);
};

interface RenderedMarkdownNode {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: RenderedMarkdownNode[];
}

const FORBIDDEN_HTML_ELEMENTS = new Set([
  'base',
  'embed',
  'iframe',
  'link',
  'math',
  'meta',
  'object',
  'script',
  'svg',
]);
const URL_PROPERTIES = new Set([
  'action',
  'cite',
  'data',
  'formaction',
  'href',
  'poster',
  'src',
  'srcset',
  'xlinkhref',
]);

const hasUnsafeUrlProtocol = (value: unknown): boolean => {
  const values = Array.isArray(value) ? value : [value];
  return values.some((candidate) => {
    if (typeof candidate !== 'string') return false;
    const compact = Array.from(candidate)
      .filter((character) => character.charCodeAt(0) > 0x20)
      .join('')
      .toLowerCase();
    return (
      compact.startsWith('javascript:') ||
      compact.startsWith('vbscript:') ||
      compact.startsWith('data:text/html')
    );
  });
};

const inspectRenderedMarkdownNode = (node: RenderedMarkdownNode): void => {
  if (node.type === 'element') {
    const tagName = node.tagName?.toLowerCase();
    if (tagName && FORBIDDEN_HTML_ELEMENTS.has(tagName)) {
      rejectUnsafeContent('forbidden-html-element');
    }
    for (const [name, value] of Object.entries(node.properties ?? {})) {
      const normalizedName = name.toLowerCase();
      if (normalizedName.startsWith('on')) {
        rejectUnsafeContent('event-handler-attribute');
      }
      if (URL_PROPERTIES.has(normalizedName) && hasUnsafeUrlProtocol(value)) {
        rejectUnsafeContent('unsafe-url-protocol');
      }
    }
  }
  node.children?.forEach(inspectRenderedMarkdownNode);
};

const assertSafeRichText = (value: string): void => {
  try {
    const processor = unified()
      .use(remarkParse)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeRaw);
    const tree = processor.runSync(
      processor.parse(value),
    ) as RenderedMarkdownNode;
    inspectRenderedMarkdownNode(tree);
  } catch (error) {
    if (error instanceof UnsafeStrapiArticleContentError) throw error;
    rejectUnsafeContent('invalid-rich-text-ast');
  }
};

export const toAbsoluteMediaUrl = (
  value: string | null | undefined,
): string | null | undefined => {
  if (!value?.startsWith(UPLOAD_PATH)) {
    return value;
  }

  return `${getStrapiBaseUrl()}${value}`;
};

const rewriteMarkdownMedia = (value: string): string => {
  const strapiBaseUrl = getStrapiBaseUrl();
  const rewriteOutsideInlineCode = (segment: string) =>
    segment
      .replace(
        /(!\[[^\]]*\]\()\/uploads\/([^\s)]+)(\))/g,
        `$1${strapiBaseUrl}/uploads/$2$3`,
      )
      .replace(
        /\b(src|srcset|href|poster)=(['"])\/uploads\/([^'"]+)\2/g,
        (_match, attribute: string, quote: string, path: string) =>
          `${attribute}=${quote}${strapiBaseUrl}/uploads/${path}${quote}`,
      );

  return value
    .split(/(```[\s\S]*?```|~~~[\s\S]*?~~~)/g)
    .map((fencedPart, index) => {
      if (index % 2 === 1) return fencedPart;

      return fencedPart
        .split(/(`+[^`]*`+)/g)
        .map((inlinePart, inlineIndex) =>
          inlineIndex % 2 === 1
            ? inlinePart
            : rewriteOutsideInlineCode(inlinePart),
        )
        .join('');
    })
    .join('');
};

const objectValue = (value: unknown): Record<string, unknown> | undefined =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;

const unwrapMedia = (value: unknown): Record<string, unknown> | undefined => {
  const raw = objectValue(value);
  if (!raw) return undefined;
  const data = objectValue(raw.data);
  const attributes = objectValue(data?.attributes ?? raw.attributes);
  return attributes ?? data ?? raw;
};

const projectMedia = (value: unknown): RenderableMedia | undefined => {
  const media = unwrapMedia(value);
  if (!media || typeof media.url !== 'string') return undefined;
  const url = toAbsoluteMediaUrl(media.url) ?? media.url;
  try {
    const protocol = new URL(url).protocol;
    if (protocol !== 'http:' && protocol !== 'https:') {
      return rejectUnsafeContent('unsafe-media-url');
    }
  } catch {
    return rejectUnsafeContent('invalid-media-url');
  }
  return {
    url,
    ...(typeof media.name === 'string' ? { name: media.name } : {}),
    ...(typeof media.mime === 'string' ? { mime: media.mime } : {}),
    ...(typeof media.alternativeText === 'string' ||
    media.alternativeText === null
      ? { alternativeText: media.alternativeText }
      : {}),
  };
};

const projectMediaList = (value: unknown): RenderableMedia[] => {
  const raw = objectValue(value);
  const candidates = Array.isArray(value)
    ? value
    : Array.isArray(raw?.data)
      ? raw.data
      : [];
  return candidates.map((candidate) => {
    const media = projectMedia(candidate);
    return media ?? rejectUnsafeContent('invalid-slider-media');
  });
};

type RenderableRichTextBody = Extract<
  RenderableArticleBlock,
  { __component: 'shared.rich-text' }
>['body'];

const projectRichTextBody = (
  value: unknown,
): RenderableRichTextBody | undefined => {
  if (typeof value === 'string') {
    assertSafeRichText(value);
    return rewriteMarkdownMedia(value);
  }
  if (!Array.isArray(value)) return undefined;
  return value.map((item) => {
    const record = objectValue(item);
    if (
      !record ||
      record.type !== 'paragraph' ||
      !Array.isArray(record.children)
    ) {
      return rejectUnsafeContent('unsupported-rich-text-node');
    }
    const children = record.children.map((child) => {
      const childRecord = objectValue(child);
      if (!childRecord || typeof childRecord.text !== 'string') {
        return rejectUnsafeContent('invalid-rich-text-child');
      }
      assertSafeRichText(childRecord.text);
      return { text: childRecord.text };
    });
    return { type: record.type, children };
  });
};

const projectBlock = (value: unknown): RenderableArticleBlock | undefined => {
  const block = objectValue(value);
  if (!block || typeof block.__component !== 'string') {
    return rejectUnsafeContent('invalid-component');
  }

  if (block.__component === 'shared.rich-text') {
    const body = projectRichTextBody(block.body);
    return body === undefined
      ? rejectUnsafeContent('invalid-rich-text-body')
      : { __component: 'shared.rich-text', body };
  }
  if (block.__component === 'shared.quote') {
    if (typeof block.title === 'string') assertSafeRichText(block.title);
    if (typeof block.body === 'string') assertSafeRichText(block.body);
    return {
      __component: 'shared.quote',
      ...(typeof block.title === 'string' ? { title: block.title } : {}),
      ...(typeof block.body === 'string' ? { body: block.body } : {}),
    };
  }
  if (block.__component === 'shared.media') {
    const file = projectMedia(block.file);
    const data = projectMedia(block.data);
    return file || data
      ? {
          __component: 'shared.media',
          ...(file ? { file } : {}),
          ...(data ? { data } : {}),
        }
      : rejectUnsafeContent('invalid-media-component');
  }
  if (block.__component === 'shared.slider') {
    const files = projectMediaList(block.files ?? block.data);
    return files.length > 0
      ? { __component: 'shared.slider', files }
      : rejectUnsafeContent('empty-slider-component');
  }
  if (block.__component === 'shared.seo') {
    return undefined;
  }
  return rejectUnsafeContent('unknown-component');
};

export const toRenderableArticle = (
  article: StrapiArticle & { documentId: string },
): RenderableArticle => {
  const cover = projectMedia(article.cover);
  const author = article.author;
  const avatar = projectMedia(author?.avatar);
  const blocks = article.blocks?.flatMap((block) => {
    const projected = projectBlock(block);
    return projected ? [projected] : [];
  });

  return {
    documentId: article.documentId,
    slug: article.slug,
    title: article.title,
    description: article.description,
    category: { name: article.category.name, slug: article.category.slug },
    author: {
      name: author?.name?.trim() || FALLBACK_ARTICLE_AUTHOR_NAME,
      ...(typeof author?.email === 'string' ? { email: author.email } : {}),
      ...(avatar ? { avatar } : {}),
    },
    publishedAt: article.publishedAt,
    updatedAt: article.updatedAt,
    ...(cover ? { cover } : {}),
    ...(blocks && blocks.length > 0 ? { blocks } : {}),
  };
};
