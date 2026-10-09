import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Disclosure } from '@/components/common/ui/disclosure';

function renderDisclosure(itemCount = 1) {
  return renderToStaticMarkup(
    createElement(
      Disclosure.Group,
      { defaultValue: ['item-0'] },
      ...Array.from({ length: itemCount }, (_, index) =>
        createElement(
          Disclosure.Item,
          { key: index, value: `item-${index}` },
          createElement(Disclosure.Header, null, `질문 ${index + 1}`),
          createElement(Disclosure.Panel, null, `답변 ${index + 1}`),
        ),
      ),
    ),
  );
}

describe('Disclosure', () => {
  it('connects the heading button and open panel with the full ARIA contract', () => {
    const markup = renderDisclosure();

    expect(markup).toContain('<h3>');
    expect(markup).toContain('aria-expanded="true"');
    expect(markup).toMatch(/aria-controls="[^"]+-panel"/);
    expect(markup).toMatch(/aria-labelledby="[^"]+-trigger"/);
    expect(markup).toContain('role="region"');
  });

  it('omits region landmarks when more than six panels can open', () => {
    expect(renderDisclosure(7)).not.toContain('role="region"');
  });
});
