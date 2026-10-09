// @vitest-environment jsdom
import { generateJSON, getSchema } from '@tiptap/core';
import { Node } from '@tiptap/pm/model';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildLessonEditorExtensions } from '@/components/common/ui/editor/lesson-editor-extensions';
import { serializeProseMirrorDocToMarkdown } from '@/components/common/ui/editor/markdown-serializer';
import { markdownToEditorHtml } from '@/components/common/ui/editor/markdown-to-editor-html';
import { toAdminLessonForm } from '@/features/admin/course-management/model/admin-lesson-form-mapper';

const ext = buildLessonEditorExtensions();
const schema = getSchema(ext);

const MD = [
  '## 제목',
  '',
  '안녕하세요 **굵게** 입니다.',
  '',
  '- 항목1',
  '- 항목2',
  '',
  '| 항목 | 설명 |',
  '| --- | --- |',
  '| 예시 | 내용 |',
].join('\n');

const mockLesson = (content: string) =>
  ({
    chapterNumber: 1,
    lessonNumber: 1,
    title: '제목',
    description: '',
    content,
    estimatedMinutes: 30,
    retrospectivePurpose: 'PRACTICAL',
    isFree: false,
    isPublished: false,
    tags: [],
  }) as never;

describe('레슨 admin: 로드/저장이 마크다운을 HTML로 되돌리지 않는다', () => {
  let domWindow: typeof globalThis.window;
  let domDocument: typeof globalThis.document;
  beforeAll(() => {
    domWindow = globalThis.window;
    domDocument = globalThis.document;
  });
  beforeEach(() => {
    globalThis.window = domWindow;
    globalThis.document = domDocument;
  });

  it('toAdminLessonForm: 마크다운 본문을 <p> HTML로 변환하지 않고 보존', () => {
    const form = toAdminLessonForm(mockLesson(MD));
    // 진짜 버그(렌더된 #356): 여기서 markdown이 renderMarkdownToHtml로 <p>화됐었다.
    expect(form.content).not.toContain('<p>');
    expect(form.content).toContain('**굵게**');
    expect(form.content).toContain('| 항목 | 설명 |');
  });

  it('toAdminLessonForm: 레거시 HTML 본문을 로드 시 마크다운으로 자동변환', () => {
    // 사용자가 repo에서 본 실제 레거시 본문(HTML)
    const legacy =
      '<p>:welcome_xxl:</p><p>드디어 만났네요</p><p></p><p>여러분이 이 코스를 만난 것은 우연이 아니에요.</p>';
    const form = toAdminLessonForm(mockLesson(legacy));
    // 편집 없이 저장해도 마크다운이 커밋되도록 폼이 마크다운을 들고 있어야 한다.
    expect(form.content).not.toContain('<p>');
    expect(form.content).toContain(':welcome_xxl:');
    expect(form.content).toContain(
      '여러분이 이 코스를 만난 것은 우연이 아니에요.',
    );
  });

  it('편집 없이 저장(no-edit): lessonForm.content가 마크다운으로 남는다', () => {
    // 저장 payload는 toAdminLessonPayload가 content를 손대지 않으므로
    // toAdminLessonForm의 content가 그대로 content-source로 커밋된다.
    const form = toAdminLessonForm(mockLesson(MD));
    expect(form.content).not.toMatch(/<p>|<h[1-6]>|<ul>|<li>/);
  });

  it('로드→에디터→직렬화 전체 경로가 마크다운을 유지(<p> 없음)', () => {
    const form = toAdminLessonForm(mockLesson(MD));
    const doc = Node.fromJSON(
      schema,
      generateJSON(markdownToEditorHtml(form.content), ext),
    );
    const out = serializeProseMirrorDocToMarkdown(doc);
    expect(out).not.toContain('<p>');
    expect(out).toContain('**굵게**');
    expect(out).toContain('| 항목 | 설명 |');
  });
});
