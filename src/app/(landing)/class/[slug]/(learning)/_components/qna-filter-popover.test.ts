// @vitest-environment jsdom

import userEvent from '@testing-library/user-event';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QnaFilterPopover } from './qna-filter-popover';

vi.mock('public/icons/modal-close.svg', () => ({
  default: ({ className }: { className?: string }) =>
    createElement('svg', { className }),
}));

vi.mock('@/hooks/queries/course/course-queries', () => ({
  useGetCourseCurriculum: () => ({
    data: {
      chapters: [
        {
          chapterId: 10,
          lessons: [{ lessonId: 100, title: '첫 레슨' }],
          title: '첫 챕터',
        },
      ],
      courseId: 1,
    },
  }),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const testDocument = document;
const testWindow = window;
const mountedRoots: Array<{
  container: HTMLDivElement;
  root: ReturnType<typeof createRoot>;
}> = [];

beforeEach(() => {
  vi.stubGlobal('document', testDocument);
  vi.stubGlobal('window', testWindow);
});

afterEach(async () => {
  for (const { container, root } of mountedRoots.splice(0)) {
    await act(async () => root.unmount());
    container.remove();
  }
});

async function renderPopover() {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  mountedRoots.push({ container, root });
  await act(async () =>
    root.render(
      createElement(QnaFilterPopover, {
        courseTitle: '테스트 코스',
        onApply: vi.fn(),
        slug: 'test-course',
      }),
    ),
  );
  const user = userEvent.setup();
  const trigger = container.querySelector<HTMLButtonElement>(
    'button[aria-haspopup="dialog"]',
  );

  expect(trigger).not.toBeNull();
  await act(async () => user.click(trigger as HTMLButtonElement));
  const dialog = container.querySelector<HTMLFormElement>('[role="dialog"]');
  expect(dialog).not.toBeNull();

  return {
    container,
    dialog: dialog as HTMLFormElement,
    trigger: trigger as HTMLButtonElement,
    user,
  };
}

function getDialogButtons(dialog: HTMLFormElement) {
  return Array.from(
    dialog.querySelectorAll<HTMLButtonElement>('button:not([disabled])'),
  );
}

describe('QnaFilterPopover keyboard flow', () => {
  it('closes only the inner menu on Escape and outside click', async () => {
    const { container, dialog, user } = await renderPopover();
    const courseTrigger = getDialogButtons(dialog).find((button) =>
      button.textContent?.includes('테스트 코스'),
    );
    expect(courseTrigger).toBeDefined();

    await act(async () => user.click(courseTrigger as HTMLButtonElement));
    expect(
      document.querySelector('[data-qna-filter-select-menu]'),
    ).not.toBeNull();

    await act(async () => user.keyboard('{Escape}'));
    expect(document.querySelector('[data-qna-filter-select-menu]')).toBeNull();
    expect(container.querySelector('[role="dialog"]')).toBe(dialog);

    await act(async () => user.click(courseTrigger as HTMLButtonElement));
    expect(
      document.querySelector('[data-qna-filter-select-menu]'),
    ).not.toBeNull();
    const outsideButton = document.createElement('button');
    outsideButton.type = 'button';
    outsideButton.textContent = '바깥 버튼';
    document.body.append(outsideButton);
    await act(async () => user.click(outsideButton));
    outsideButton.remove();

    expect(document.querySelector('[data-qna-filter-select-menu]')).toBeNull();
    expect(container.querySelector('[role="dialog"]')).toBe(dialog);
  });

  it('restores focus to the filter trigger after Escape closes the panel', async () => {
    const { container, trigger, user } = await renderPopover();

    await act(async () => {
      await user.keyboard('{Escape}');
      await Promise.resolve();
    });

    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('traps Tab and Shift+Tab inside the open filter panel', async () => {
    const { container, dialog, user } = await renderPopover();
    const focusableButtons = getDialogButtons(dialog);
    expect(focusableButtons.length).toBeGreaterThan(1);
    expect(document.activeElement).toBe(focusableButtons[0]);

    for (let index = 1; index < focusableButtons.length; index += 1) {
      await act(async () => user.tab());
      expect(document.activeElement).toBe(focusableButtons[index]);
      expect(container.querySelector('[role="dialog"]')).toBe(dialog);
    }

    await act(async () => user.tab());
    expect(document.activeElement).toBe(focusableButtons[0]);
    expect(dialog.contains(document.activeElement)).toBe(true);

    await act(async () => user.tab({ shift: true }));
    expect(document.activeElement).toBe(focusableButtons.at(-1));
    expect(dialog.contains(document.activeElement)).toBe(true);
  });
});
