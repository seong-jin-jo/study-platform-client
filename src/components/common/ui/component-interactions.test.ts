// @vitest-environment jsdom

import userEvent from '@testing-library/user-event';
import {
  act,
  type ComponentProps,
  type ComponentType,
  createElement,
  type ReactElement,
  type ReactNode,
  useState,
} from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { JourneyChapterList } from '@/components/class/journey-chapter-list';
import Button from '@/components/common/ui/button';
import Checkbox from '@/components/common/ui/checkbox';
import ChipInput from '@/components/common/ui/chip-input';
import { Disclosure } from '@/components/common/ui/disclosure';
import SingleDropdown from '@/components/common/ui/dropdown/single';
import IconButton from '@/components/common/ui/icon-button';
import List from '@/components/common/ui/list';
import OAuthButton from '@/components/common/ui/oauth-button';
import { SelectableCard } from '@/components/common/ui/selectable-card';
import SurfacePanel, {
  SurfacePanelEmpty,
  SurfacePanelHeader,
} from '@/components/common/ui/surface-panel';
import Tabs from '@/components/common/ui/tabs';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const mountedRoots: Array<{ container: HTMLDivElement; root: Root }> = [];
const testDocument = document;
const testWindow = window;
type ListItemTestProps = Omit<ComponentProps<typeof List.Item>, 'children'> & {
  children?: ReactNode;
};
const ListItemForTest = List.Item as ComponentType<ListItemTestProps>;

function StatefulCheckbox() {
  const [checked, setChecked] = useState(false);

  return createElement(Checkbox, {
    checked,
    id: 'keyboard-consent',
    label: '필수 동의',
    ariaLabel: '필수 동의',
    onToggle: () => setChecked((currentChecked) => !currentChecked),
  });
}

beforeEach(() => {
  vi.stubGlobal('document', testDocument);
  vi.stubGlobal('window', testWindow);
});

async function mount(element: ReactElement) {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  mountedRoots.push({ container, root });
  await act(async () => root.render(element));
  return container;
}

afterEach(async () => {
  for (const { container, root } of mountedRoots.splice(0)) {
    await act(async () => root.unmount());
    container.remove();
  }
});

describe('common UI interaction integration', () => {
  it('keeps the checkbox in normal flow and toggles it with the keyboard', async () => {
    const user = userEvent.setup();
    const container = await mount(createElement(StatefulCheckbox));
    const checkbox =
      container.querySelector<HTMLInputElement>('#keyboard-consent');

    expect(checkbox).not.toBeNull();
    expect(checkbox?.getAttribute('aria-label')).toBe('필수 동의');
    const label = checkbox?.closest('label');
    // jsdom does not calculate Tailwind layout. Guard the DOM structure from
    // reintroducing an out-of-flow pseudo hit area that can cross row bounds.
    expect(label?.className).not.toContain('before:');
    expect(label?.className).not.toContain('absolute');
    expect(label?.className).not.toContain('h-550');
    expect(label?.className).not.toContain('w-550');
    await user.tab();
    expect(document.activeElement).toBe(checkbox);
    await act(async () => user.keyboard(' '));
    expect(checkbox?.checked).toBe(true);
  });

  it('opens a Disclosure panel through its real header button', async () => {
    const container = await mount(
      createElement(
        Disclosure.Group,
        null,
        createElement(
          Disclosure.Item,
          { value: 'faq' },
          createElement(Disclosure.Header, null, '질문'),
          createElement(Disclosure.Panel, null, '답변'),
        ),
      ),
    );
    const button = container.querySelector('button');
    expect(button?.getAttribute('aria-expanded')).toBe('false');
    expect(container.textContent).not.toContain('답변');
    await act(async () => button?.click());
    const panel = container.querySelector('[aria-labelledby]');
    expect(button?.getAttribute('aria-expanded')).toBe('true');
    expect(panel).not.toBeNull();
    expect(container.textContent).toContain('답변');
  });

  it('keeps List.Item as one selectable row and invokes its action', async () => {
    const onClick = vi.fn();
    const container = await mount(
      createElement(
        List,
        null,
        createElement(
          ListItemForTest,
          {
            onClick,
            selected: true,
          },
          '목록 행',
        ),
      ),
    );
    const item = container.querySelector('button');

    expect(item?.parentElement?.tagName).toBe('LI');
    expect(item?.getAttribute('aria-current')).toBe('true');
    await act(async () => item?.click());
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('preserves the journey header flex children and lesson selection flow', async () => {
    const onSelectLesson = vi.fn();
    const container = await mount(
      createElement(JourneyChapterList, {
        chapters: [
          {
            chapterId: 1,
            chapterNumber: 1,
            description: '첫 챕터 설명',
            estimatedMinutes: 15,
            lessons: [
              {
                description: null,
                estimatedMinutes: 15,
                isFree: true,
                isLocked: false,
                lessonId: 11,
                order: 1,
                title: '첫 레슨',
              },
            ],
            order: 1,
            title: '첫 챕터',
          },
        ],
        hasMoreChapters: false,
        lessonStatusMap: new Map(),
        onSelectLesson,
        onShowMore: () => undefined,
      }),
    );
    const header = container.querySelector<HTMLButtonElement>(
      'button[aria-expanded]',
    );

    expect(header?.children).toHaveLength(3);
    expect(header?.children[0].textContent).toContain('Chapter');
    expect(header?.children[1].textContent).toContain('첫 챕터');
    await act(async () => header?.click());

    const lessonButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent?.includes('LESSON 01'),
    );
    await act(async () => lessonButton?.click());
    expect(onSelectLesson).toHaveBeenCalledOnce();
  });

  it('renders generated loading spinner dimensions for Button and IconButton', async () => {
    const container = await mount(
      createElement(
        'div',
        null,
        createElement(Button, { loading: true }, '저장'),
        createElement(IconButton, {
          label: '새로고침',
          loading: true,
        }),
      ),
    );
    const spinners = container.querySelectorAll('.animate-spin');

    expect(spinners).toHaveLength(2);
    expect(
      Array.from(spinners).every((spinner) =>
        spinner.classList.contains('size-175'),
      ),
    ).toBe(true);
  });

  it('moves and checks SelectableCard radio focus with ArrowRight', async () => {
    const container = await mount(
      createElement(
        SelectableCard.Group,
        { defaultValue: 'one', label: '선택' },
        createElement(SelectableCard.Item, { value: 'one' }, '첫 번째'),
        createElement(SelectableCard.Item, { value: 'two' }, '두 번째'),
      ),
    );
    const radios = container.querySelectorAll<HTMLElement>('[role="radio"]');
    radios[0].focus();

    await act(async () =>
      radios[0].dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowRight' }),
      ),
    );

    expect(radios[1].getAttribute('aria-checked')).toBe('true');
    expect(document.activeElement).toBe(radios[1]);
  });

  it('calls the OAuth provider action and blocks it while disabled', async () => {
    const onClick = vi.fn();
    const container = await mount(
      createElement(OAuthButton, { onClick, provider: 'google' }),
    );
    await act(async () => container.querySelector('button')?.click());
    expect(onClick).toHaveBeenCalledOnce();

    const disabledClick = vi.fn();
    const disabledContainer = await mount(
      createElement(OAuthButton, {
        disabled: true,
        onClick: disabledClick,
        provider: 'kakao',
      }),
    );
    await act(async () => disabledContainer.querySelector('button')?.click());
    expect(disabledClick).not.toHaveBeenCalled();
  });

  it('uses one tab stop and activates the next tab with ArrowRight', async () => {
    const onChange = vi.fn();
    const container = await mount(
      createElement(Tabs, {
        activeTab: 'feed',
        onChange,
        tabs: [
          { label: '피드', panel: '피드 내용', value: 'feed' },
          { label: '질문', panel: '질문 내용', value: 'qna' },
          { label: '잠김', locked: true, panel: '잠김 내용', value: 'locked' },
        ],
      }),
    );
    const tabs = container.querySelectorAll<HTMLButtonElement>('[role="tab"]');

    expect(container.querySelector('[role="tablist"]')).not.toBeNull();
    expect(Array.from(tabs).filter((tab) => tab.tabIndex === 0)).toHaveLength(
      1,
    );
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    expect(tabs[2].hasAttribute('aria-disabled')).toBe(false);
    expect(tabs[2].querySelector('.sr-only')?.textContent).toBe('잠김');
    expect(container.querySelectorAll('[role="tabpanel"]')).toHaveLength(1);
    expect(container.textContent).toContain('피드 내용');
    expect(container.textContent).not.toContain('질문 내용');
    expect(container.textContent).not.toContain('잠김 내용');
    const activePanel = container.querySelector<HTMLElement>(
      '[role="tabpanel"]:not([hidden])',
    );
    expect(tabs[0].getAttribute('aria-controls')).toBe(activePanel?.id);
    expect(activePanel?.getAttribute('aria-labelledby')).toBe(tabs[0].id);
    tabs[0].focus();

    await act(async () =>
      tabs[0].dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowRight' }),
      ),
    );

    expect(onChange).toHaveBeenCalledWith('qna');
    expect(document.activeElement).toBe(tabs[1]);
  });
});

describe('shared component interaction states from SPRINT7 V3', () => {
  it('adds a unique ChipInput value through its rendered add control', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const container = await mount(
      createElement(ChipInput, {
        chips: [],
        onChange,
      }),
    );
    const input = container.querySelector<HTMLInputElement>('input');
    const addControl = input?.parentElement?.nextElementSibling as HTMLElement;

    expect(input).not.toBeNull();
    expect(addControl).toBeInstanceOf(HTMLElement);
    await act(async () => user.type(input!, '새 칩'));
    await act(async () => user.click(addControl));
    expect(onChange).toHaveBeenCalledWith(['새 칩']);
    expect(input?.value).toBe('');
  });

  it('keeps controlled Checkbox state unchanged until its owner updates it', async () => {
    const onToggle = vi.fn();
    const container = await mount(
      createElement(Checkbox, {
        id: 'controlled-checkbox',
        checked: false,
        onToggle,
      }),
    );
    const input = container.querySelector<HTMLInputElement>('input');

    expect(input?.checked).toBe(false);
    await act(async () => input?.click());
    expect(onToggle).toHaveBeenCalledOnce();
    expect(input?.checked).toBe(false);
  });

  it('blocks ListItem click and focus when disabled', async () => {
    const onClick = vi.fn();
    const container = await mount(
      createElement(
        ListItemForTest,
        {
          disabled: true,
          onClick,
        },
        '선택 불가',
      ),
    );
    const item = container.querySelector<HTMLButtonElement>('button');

    expect(item?.disabled).toBe(true);
    await act(async () => item?.click());
    expect(onClick).not.toHaveBeenCalled();
    await act(async () => item?.focus());
    expect(document.activeElement).not.toBe(item);
  });

  it('exposes the selected SingleDropdown value through its disabled trigger', () => {
    const markup = renderToStaticMarkup(
      createElement(SingleDropdown, {
        options: [{ label: '첫 번째', value: 'first' }],
        ariaLabel: '선택',
        disabled: true,
        value: 'first',
      }),
    );

    expect(markup).toContain('aria-label="선택"');
    expect(markup).toContain('aria-haspopup="menu"');
    expect(markup).toContain('disabled=""');
    expect(markup).toContain('첫 번째');
  });

  it('composes supported SurfacePanel axes with semantic markup', () => {
    const markup = renderToStaticMarkup(
      createElement(SurfacePanel, {
        as: 'article',
        className: 'p-200',
        radius: 'lg',
        overflow: 'hidden',
      }),
    );

    expect(markup).toContain('<article');
    expect(markup).toContain('border-border-subtle');
    expect(markup).toContain('rounded-200');
    expect(markup).toContain('p-200');
    expect(markup).toContain('overflow-hidden');
  });

  it('keeps SurfacePanel header and empty-state structure tokenized', () => {
    const markup = renderToStaticMarkup(
      createElement(
        SurfacePanel,
        null,
        createElement(SurfacePanelHeader, null, '패널 제목'),
        createElement(SurfacePanelEmpty, null, '표시할 데이터가 없습니다.'),
      ),
    );

    expect(markup).toContain('rounded-100');
    expect(markup).toContain('border-b p-200');
    expect(markup).toContain('px-200 py-250 text-center');
    expect(markup).toContain('패널 제목');
    expect(markup).toContain('표시할 데이터가 없습니다.');
  });
});
