import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import Button from '@/components/common/ui/button';
import { Menu, shouldUseMenuMobileSheet } from '@/components/common/ui/menu';

describe('Menu', () => {
  it('switches long or crowded mobile menus to the sheet presentation', () => {
    expect(
      shouldUseMenuMobileSheet(
        Array.from({ length: 7 }, (_, index) => ({ label: `${index}` })),
      ),
    ).toBe(true);
    expect(
      shouldUseMenuMobileSheet([{ label: '열세글자가넘는긴메뉴항목입니다' }]),
    ).toBe(true);
    expect(shouldUseMenuMobileSheet([{ label: '최신순' }])).toBe(false);
  });

  it('keeps the shared Button as an accessible menu trigger', () => {
    const markup = renderToStaticMarkup(
      createElement(
        Menu.Root,
        null,
        createElement(
          Menu.Trigger,
          null,
          createElement(Button, { color: 'outlined' }, '정렬'),
        ),
      ),
    );

    expect(markup).toContain('aria-haspopup="menu"');
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).toContain('정렬');
  });
});
