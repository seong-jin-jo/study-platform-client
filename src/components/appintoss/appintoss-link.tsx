'use client';

import {
  type AnchorHTMLAttributes,
  forwardRef,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { resolveAppintossHref } from './resolve-appintoss-href.mjs';

type QueryValue = string | number | boolean | null | undefined;
type AppintossHref =
  | string
  | {
      hash?: string;
      pathname?: string;
      query?: Record<string, QueryValue | QueryValue[]>;
    };

type AppintossLinkProps = Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  'href'
> & {
  children?: ReactNode;
  href: AppintossHref;
  legacyBehavior?: boolean;
  locale?: string | false;
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>) => void;
  passHref?: boolean;
  prefetch?: boolean | null;
  replace?: boolean;
  scroll?: boolean;
  shallow?: boolean;
};

function stringifyHref(href: AppintossHref) {
  if (typeof href === 'string') return href;

  const search = new URLSearchParams();
  for (const [key, rawValue] of Object.entries(href.query ?? {})) {
    const values = Array.isArray(rawValue) ? rawValue : [rawValue];
    for (const value of values) {
      if (value !== null && value !== undefined) {
        search.append(key, String(value));
      }
    }
  }
  const query = search.size > 0 ? `?${search}` : '';
  const hash = href.hash
    ? href.hash.startsWith('#')
      ? href.hash
      : `#${href.hash}`
    : '';
  return `${href.pathname ?? '/'}${query}${hash}`;
}

const AppintossLink = forwardRef<HTMLAnchorElement, AppintossLinkProps>(
  function AppintossLink(
    {
      href,
      legacyBehavior: _legacyBehavior,
      locale: _locale,
      onNavigate: _onNavigate,
      passHref: _passHref,
      prefetch: _prefetch,
      replace: _replace,
      scroll: _scroll,
      shallow: _shallow,
      ...anchorProps
    },
    ref,
  ) {
    const rawHref = stringifyHref(href);
    const resolvedHref = resolveAppintossHref(rawHref) ?? rawHref;

    return <a ref={ref} href={resolvedHref} {...anchorProps} />;
  },
);

export default AppintossLink;
