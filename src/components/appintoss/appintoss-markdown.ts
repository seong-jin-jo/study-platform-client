import { renderMarkdownContentHtml } from '@/components/common/ui/editor/markdown-rendering-pipeline';
import { sanitizeAppintossArticleHtml } from './appintoss-html-sanitizer';

export function renderAndSanitizeAppintossMarkdown(value: string) {
  return sanitizeAppintossArticleHtml(renderMarkdownContentHtml(value));
}
