import { generateJSON, getSchema } from '@tiptap/core';
import { Node } from '@tiptap/pm/model';
import { isHtmlContent } from '@/utils/markdown-content-shared';
import { buildLessonEditorExtensions } from './lesson-editor-extensions';
import { serializeProseMirrorDocToMarkdown } from './markdown-serializer';
import { markdownToEditorHtml } from './markdown-to-editor-html';

let extensionsCache: ReturnType<typeof buildLessonEditorExtensions> | null =
  null;
let schemaCache: ReturnType<typeof getSchema> | null = null;

const editorExtensions = () =>
  (extensionsCache ??= buildLessonEditorExtensions());
const editorSchema = () => (schemaCache ??= getSchema(editorExtensions()));

/**
 * 레슨 본문을 마크다운으로 정규화한다.
 *
 * 레거시 본문은 HTML(`<p>` 등)로 저장돼 있다. 에디터(TipTap) 스키마로 파싱한 뒤
 * 마크다운 직렬화기를 태워, **로드 시점부터 폼이 마크다운을 들고 있게** 한다.
 * 덕분에 본문을 직접 편집하지 않고 저장해도 repo `.md`에 마크다운이 커밋된다
 * (편집 없이 저장하면 레거시 HTML이 그대로 커밋되던 버그 차단).
 *
 * - 이미 마크다운이면 그대로 통과(불필요한 변환 없음).
 * - SSR(window 없음)에서는 DOM이 없어 변환 불가 → 원본 반환(클라이언트 hydration에서 변환).
 * - 변환 중 예외가 나면 원본을 반환해 **본문 손실을 막는다**.
 */
export const normalizeLessonContentToMarkdown = (content: unknown): string => {
  const text = typeof content === 'string' ? content.trim() : '';
  if (!text) return '';
  if (typeof window === 'undefined') return text;
  if (!isHtmlContent(text)) return text;

  try {
    const json = generateJSON(markdownToEditorHtml(text), editorExtensions());
    return serializeProseMirrorDocToMarkdown(
      Node.fromJSON(editorSchema(), json),
    );
  } catch {
    return text;
  }
};
