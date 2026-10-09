import {
  createElement,
  type AnchorHTMLAttributes,
  type ReactNode,
} from 'react';

type LinkShimProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  children?: ReactNode;
  href: string | { pathname?: string };
};

export default function LinkShim({ children, href, ...props }: LinkShimProps) {
  const resolvedHref = typeof href === 'string' ? href : (href.pathname ?? '#');
  return createElement('a', { ...props, href: resolvedHref }, children);
}
