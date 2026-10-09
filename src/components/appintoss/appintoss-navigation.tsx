'use client';

import { useRouter } from 'next/navigation';
import { type MouseEvent, type ReactNode, useState } from 'react';
import { resolveAppintossHref } from './resolve-appintoss-href.mjs';

export default function AppintossNavigation({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const [blockedMessage, setBlockedMessage] = useState<string>();

  const handleClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    if (event.defaultPrevented || event.button !== 0) return;
    const target = event.target as HTMLElement;
    const anchor = target.closest<HTMLAnchorElement>('a[href]');
    if (!anchor) return;

    const rawHref = anchor.getAttribute('href') ?? '';
    const resolvedHref = resolveAppintossHref(rawHref);
    if (
      !resolvedHref ||
      anchor.hasAttribute('download') ||
      (anchor.target && anchor.target !== '_self')
    ) {
      event.preventDefault();
      event.stopPropagation();
      setBlockedMessage('이 링크는 앱 안에서 열 수 없어요.');
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    setBlockedMessage(undefined);
    router.push(resolvedHref);
  };

  return (
    <div onClickCapture={handleClickCapture}>
      {blockedMessage ? (
        <output className="fixed inset-x-200 top-800 z-60 mx-auto max-w-page rounded-150 border border-border-warning bg-background-accent-yellow-subtle p-150 text-center font-designer-14m text-text-warning shadow-2">
          {blockedMessage}
        </output>
      ) : null}
      {children}
    </div>
  );
}
