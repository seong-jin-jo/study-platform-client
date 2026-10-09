import { createRequire } from 'node:module';
import { act, createElement } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import {
  PublicAuthBootstrap,
  usePublicAuthBootstrapState,
} from './public-auth-bootstrap';

const require = createRequire(import.meta.url);
const { JSDOM } = require('jsdom') as {
  JSDOM: new (
    html: string,
    options: { url: string },
  ) => { window: Window & typeof globalThis };
};

function BootstrapStateProbe() {
  return createElement('span', null, usePublicAuthBootstrapState());
}

const renderBootstrap = () =>
  renderToStaticMarkup(
    createElement(
      PublicAuthBootstrap,
      null,
      createElement(BootstrapStateProbe),
    ),
  );

describe('PublicAuthBootstrap hydration state', () => {
  it('keeps SSR and the browser first render pending even with a readable access token', () => {
    const serverMarkup = renderBootstrap();
    const dom = new JSDOM('<!doctype html><html><body></body></html>', {
      url: 'https://test.zeroone.it.kr',
    });
    dom.window.document.cookie = 'accessToken=readable-token; path=/';
    vi.stubGlobal('window', dom.window);
    vi.stubGlobal('document', dom.window.document);

    const browserFirstMarkup = renderBootstrap();

    expect(serverMarkup).toBe('<span>pending</span>');
    expect(browserFirstMarkup).toBe(serverMarkup);
  });

  it('hydrates server markup with a readable access token without a recoverable error', async () => {
    const serverMarkup = renderBootstrap();
    const dom = new JSDOM(
      `<!doctype html><html><body><div id="root">${serverMarkup}</div></body></html>`,
      { url: 'https://test.zeroone.it.kr' },
    );
    dom.window.document.cookie = 'accessToken=readable-token; path=/';
    vi.stubGlobal('window', dom.window);
    vi.stubGlobal('document', dom.window.document);
    vi.stubGlobal('navigator', dom.window.navigator);
    vi.stubGlobal('HTMLElement', dom.window.HTMLElement);
    vi.stubGlobal('Node', dom.window.Node);
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    const container = dom.window.document.querySelector('#root');
    if (!(container instanceof dom.window.HTMLElement)) {
      throw new Error('hydration root is missing');
    }
    const recoverableErrors: unknown[] = [];

    const root = hydrateRoot(
      container,
      createElement(
        PublicAuthBootstrap,
        null,
        createElement(BootstrapStateProbe),
      ),
      {
        onRecoverableError: (error) => recoverableErrors.push(error),
      },
    );
    await act(async () => Promise.resolve());

    expect(recoverableErrors).toEqual([]);
    expect(container.textContent).toBe('authenticated');
    await act(async () => root.unmount());
  });
});
