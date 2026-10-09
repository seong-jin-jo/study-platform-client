import tailwindcss from '@tailwindcss/postcss';
import { readFile } from 'node:fs/promises';
import postcss from 'postcss';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import Pagination, {
  getVisibleMiddlePages,
} from '@/components/common/ui/pagination';

vi.mock('public/icons/keyboard-arrow-left.svg', () => ({
  default: () => createElement('svg'),
}));
vi.mock('public/icons/keyboard-arrow-right.svg', () => ({
  default: () => createElement('svg'),
}));
vi.mock('public/icons/more.svg', () => ({
  default: () => createElement('svg'),
}));

describe('Pagination', () => {
  it('keeps a bounded middle window for large page counts', () => {
    expect(getVisibleMiddlePages({ page: 50, totalPages: 128 })).toEqual([
      49, 50, 51,
    ]);
  });

  it('keeps all middle pages when the page count is small', () => {
    expect(getVisibleMiddlePages({ page: 2, totalPages: 4 })).toEqual([2, 3]);
  });

  it('keeps every control at fixed responsive dimensions for 20 pages', async () => {
    const markup = renderToStaticMarkup(
      createElement(Pagination, {
        onChangePage: () => undefined,
        page: 10,
        totalPages: 20,
      }),
    );
    const globalCss = await readFile('src/app/global.css', 'utf8');
    const generatedCss = (
      await postcss([tailwindcss()]).process(globalCss, {
        from: 'src/app/global.css',
      })
    ).css;
    const buttonClassNames = Array.from(
      markup.matchAll(/<button[^>]*class="([^"]*)"[^>]*>/g),
      (match) => match[1].split(' '),
    );
    const generatedRoot = postcss.parse(generatedCss);

    const generatedValues = (classNames: string[], property: string) => {
      const values = new Set<string>();
      for (const className of classNames) {
        const selector = `.${className.replaceAll(':', '\\:')}`;
        generatedRoot.walkRules((rule) => {
          if (rule.selector !== selector) return;
          rule.walkDecls(property, (declaration) => {
            values.add(declaration.value);
          });
        });
      }
      return values;
    };

    expect(buttonClassNames.length).toBeGreaterThan(5);
    for (const classNames of buttonClassNames) {
      expect(generatedValues(classNames, 'height')).toEqual(
        new Set(['40px', '32px']),
      );
      expect(generatedValues(classNames, 'width')).toEqual(
        new Set(['40px', '32px']),
      );
      expect(generatedValues(classNames, 'flex-shrink')).toEqual(
        new Set(['0']),
      );
    }
    expect(markup.match(/aria-current="page"[^>]*>(\d+)<\/button>/)?.[1]).toBe(
      '10',
    );
  }, 15_000);
});
