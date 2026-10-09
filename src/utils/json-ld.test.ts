import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { JsonLd } from '@/components/common/seo/json-ld';
import { serializeJsonLd } from './json-ld';

describe('safe JSON-LD serialization', () => {
  const hostileValue = '</script><script>alert(1)</script>\u2028\u2029&';

  it('escapes script terminators, HTML delimiters, and JavaScript line separators', () => {
    const serialized = serializeJsonLd({ name: hostileValue });

    expect(serialized).not.toContain('<');
    expect(serialized).not.toContain('>');
    expect(serialized).not.toContain('&');
    expect(serialized).not.toContain('\u2028');
    expect(serialized).not.toContain('\u2029');
    expect(serialized).toContain('\\u003c/script\\u003e');
    expect(serialized).toContain('\\u2028\\u2029');
    expect(JSON.parse(serialized)).toEqual({ name: hostileValue });
  });

  it('renders one inert JSON-LD script for hostile schema values', () => {
    const markup = renderToStaticMarkup(
      createElement(JsonLd, { data: { name: hostileValue } }),
    );

    expect(markup.match(/<script/g)).toHaveLength(1);
    expect(markup.match(/<\/script>/g)).toHaveLength(1);
    expect(markup).not.toContain('<script>alert(1)</script>');
    expect(markup).toContain('\\u003c/script\\u003e');
  });
});
