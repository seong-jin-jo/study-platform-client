import type { AnyExtension } from '@tiptap/core';
import LinkExtension from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import UnderlineExtension from '@tiptap/extension-underline';
import StarterKit from '@tiptap/starter-kit';
import {
  InstantCodeBlockExtension,
  LinkExitOnSpaceExtension,
  lowlight,
  MarkdownHistoryShortcutsExtension,
  ResizableImageExtension,
  YouTubeEmbedExtension,
} from './extensions';

const DEFAULT_EDITOR_PLACEHOLDER = '내용을 자유롭게 작성해주세요.';

/**
 * 레슨 에디터의 표준 확장 세트.
 *
 * 에디터 본체(`MarkdownEditor`)와 헤드리스 변환(마크다운 직렬화기·레거시
 * 마이그레이션·round-trip 테스트)이 **동일 스키마**를 공유하도록 단일 정의로
 * 추출. `markdown-editor.tsx`의 인라인 확장 배열과 항상 일치해야 한다.
 */
export const buildLessonEditorExtensions = (options?: {
  placeholder?: string;
}): AnyExtension[] => [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    codeBlock: false,
  }),
  InstantCodeBlockExtension.configure({
    lowlight,
    defaultLanguage: 'plaintext',
  }),
  MarkdownHistoryShortcutsExtension,
  LinkExitOnSpaceExtension,
  YouTubeEmbedExtension,
  UnderlineExtension,
  LinkExtension.configure({
    openOnClick: false,
    HTMLAttributes: {
      rel: 'noreferrer',
      target: '_blank',
    },
  }),
  ResizableImageExtension,
  Placeholder.configure({
    placeholder: options?.placeholder ?? DEFAULT_EDITOR_PLACEHOLDER,
  }),
];
