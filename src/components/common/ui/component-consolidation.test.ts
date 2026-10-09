// @vitest-environment jsdom

import { act, createElement, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CommonAvatarStack from '@/components/common/ui/avatar-stack';
import ChipInput from '@/components/common/ui/chip-input';
import StarRatingInput from '@/components/common/ui/star-rating-input';
import { AvatarStack as RetentionAvatarStack } from '@/components/retention/retention-shell';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const mountedRoots: Array<{ container: HTMLDivElement; root: Root }> = [];
const testDocument = document;
const testWindow = window;

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

async function setInputValue(input: HTMLInputElement, value: string) {
  const valueSetter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value',
  )?.set;
  await act(async () => {
    valueSetter?.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

afterEach(async () => {
  for (const { container, root } of mountedRoots.splice(0)) {
    await act(async () => root.unmount());
    container.remove();
  }
});

describe('common component consolidation', () => {
  it('routes the retention AvatarStack export to the common canonical component', () => {
    expect(RetentionAvatarStack).toBe(CommonAvatarStack);
  });

  it('renders five named lesson-rating controls and the matching hint', () => {
    const markup = renderToStaticMarkup(
      createElement(StarRatingInput, {
        appearance: 'lesson',
        value: 3,
        onChange: () => undefined,
      }),
    );

    const wrapper = document.createElement('div');
    wrapper.innerHTML = markup;

    expect(wrapper.querySelectorAll('button')).toHaveLength(5);
    expect(
      Array.from(wrapper.querySelectorAll('button')).map((button) =>
        button.getAttribute('aria-label'),
      ),
    ).toEqual(['1점', '2점', '3점', '4점', '5점']);
    expect(wrapper.querySelectorAll('img[aria-hidden="true"]')).toHaveLength(8);
    expect(markup).toContain('보통이에요');
  });

  it('keeps half-point pointer selection in the compact rating input', async () => {
    const onChange = vi.fn();
    const container = await mount(
      createElement(StarRatingInput, {
        appearance: 'compact',
        value: 0,
        onChange,
      }),
    );
    const thirdStar = container.querySelectorAll('button')[2];
    vi.spyOn(thirdStar, 'getBoundingClientRect').mockReturnValue({
      bottom: 42,
      height: 42,
      left: 0,
      right: 42,
      top: 0,
      width: 42,
      x: 0,
      y: 0,
      toJSON: () => undefined,
    });

    await act(async () =>
      thirdStar.dispatchEvent(
        new MouseEvent('click', {
          bubbles: true,
          clientX: 10,
          detail: 1,
        }),
      ),
    );

    expect(onChange).toHaveBeenCalledWith(2.5);
  });

  it('keeps lesson rating pointer selection on whole numbers', async () => {
    const onChange = vi.fn();
    const container = await mount(
      createElement(StarRatingInput, {
        appearance: 'lesson',
        precision: 'whole',
        value: 0,
        onChange,
      }),
    );
    const thirdStar = container.querySelectorAll('button')[2];
    vi.spyOn(thirdStar, 'getBoundingClientRect').mockReturnValue({
      bottom: 42,
      height: 42,
      left: 0,
      right: 42,
      top: 0,
      width: 42,
      x: 0,
      y: 0,
      toJSON: () => undefined,
    });

    await act(async () =>
      thirdStar.dispatchEvent(
        new MouseEvent('click', {
          bubbles: true,
          clientX: 10,
          detail: 1,
        }),
      ),
    );

    expect(onChange).toHaveBeenCalledWith(3);
  });

  it('rejects a duplicate chip before React receives a duplicate key', async () => {
    const onChange = vi.fn();
    const container = await mount(
      createElement(ChipInput, { chips: ['React'], onChange }),
    );
    const input = container.querySelector('input');
    const addControl = container.querySelector<HTMLElement>('.cursor-pointer');

    expect(input).not.toBeNull();
    expect(addControl).not.toBeNull();
    await setInputValue(input as HTMLInputElement, 'React');
    await act(async () => addControl?.click());

    expect(onChange).not.toHaveBeenCalled();
    expect(container.textContent?.match(/React/g)).toHaveLength(1);
  });
});
