import { marked } from 'marked';
import { isHtmlContent } from '@/utils/markdown-content-shared';
import {
  normalizeMarkdownForRichRendering,
  shouldRenderMarkdownAsMarkdown,
} from '@/utils/markdown-rendering-utils';
import { replaceEmoticonShortcodes } from './emoticon-shortcode';
import { renderMarkdownTablesInHtml } from './markdown-table-utils';
import { replaceStandaloneYouTubeLinksWithEmbeds } from './youtube-utils';

const parseMarkdown = (value: string) => {
  const rendered = marked.parse(value, { breaks: true, gfm: true });
  return typeof rendered === 'string' ? rendered : '';
};

// 이모티콘 shortcode·YouTube 링크는 marked 파싱 전에 각각 <img>·<iframe>로 치환된다.
// marked는 줄 맨 앞에 단독으로 놓인 블록 HTML 태그를 "다음 빈 줄까지 이어지는 HTML 블록"으로
// 본다(CommonMark HTML block type 7). 에디터 본문은 단일 개행을 쓰므로 뒤에 빈 줄이 없으면,
// 그 태그가 이후 모든 줄을 raw HTML 블록으로 삼켜 그 아래 마크다운이 원문 그대로 노출된다.
// 단독으로 놓인 임베드 줄을 빈 줄로 감싸 HTML 블록을 종료시키고 마크다운 파싱이 이어지게 한다.
// 코드펜스 내부는 (실수로 임베드가 들어가더라도) 펜스가 깨지지 않도록 건너뛴다.
const STANDALONE_BLOCK_EMBED_LINE =
  /^[ \t]*(?:<img\b[^>]*class="emoticon-[^"]*"[^>]*>|<iframe\b[^>]*class="youtube-embed"[^>]*>(?:<\/iframe>)?)[ \t]*$/i;
const CODE_FENCE_LINE = /^[ \t]*(?:```|~~~)/;

const isolateStandaloneBlockEmbeds = (markdown: string): string => {
  if (!markdown.includes('<img') && !markdown.includes('<iframe')) {
    return markdown;
  }

  const lines = markdown.split('\n');
  const result: string[] = [];
  let insideFence = false;

  for (const line of lines) {
    if (CODE_FENCE_LINE.test(line)) {
      insideFence = !insideFence;
      result.push(line);
      continue;
    }

    if (!insideFence && STANDALONE_BLOCK_EMBED_LINE.test(line)) {
      if (result.length > 0 && result[result.length - 1].trim() !== '') {
        result.push('');
      }
      result.push(line.trim());
      result.push('');
      continue;
    }

    result.push(line);
  }

  return result.join('\n');
};

export const renderMarkdownContentHtml = (content: string) => {
  const renderableContent = normalizeMarkdownForRichRendering(content);
  const shouldPreserveOriginalHtml =
    isHtmlContent(renderableContent) &&
    !shouldRenderMarkdownAsMarkdown(renderableContent);
  const contentWithEmbeds = replaceEmoticonShortcodes(
    replaceStandaloneYouTubeLinksWithEmbeds(renderableContent),
  );

  if (shouldPreserveOriginalHtml) {
    return renderMarkdownTablesInHtml(contentWithEmbeds);
  }

  return parseMarkdown(isolateStandaloneBlockEmbeds(contentWithEmbeds));
};
