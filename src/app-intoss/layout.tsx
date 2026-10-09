import './global.css';

import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import type { ReactNode } from 'react';
import AppintossProviders from '@/components/appintoss/appintoss-providers';
import AppintossShell from '@/components/appintoss/appintoss-shell';
import { cn } from '@/components/common/ui/(shadcn)/lib/utils';

export const metadata: Metadata = {
  title: 'ZERO ONE IT',
  description: 'ZERO ONE IT 공개 콘텐츠 읽기 앱',
};

export const viewport: Viewport = {
  initialScale: 1,
  viewportFit: 'cover',
  width: 'device-width',
};

const pretendard = localFont({
  src: '../../public/fonts/PretendardVariable.woff2',
  variable: '--font-pretendard',
  display: 'swap',
});

const thesignature = localFont({
  src: '../../public/fonts/Thesignature.otf',
  variable: '--font-thesignature',
  display: 'swap',
});

export default function AppintossRootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html
      lang="ko"
      className={cn(pretendard.variable, thesignature.variable)}
      suppressHydrationWarning
    >
      <body
        className={cn(
          pretendard.className,
          'min-h-screen w-screen overflow-x-hidden bg-background-default',
        )}
      >
        <AppintossProviders>
          <AppintossShell>{children}</AppintossShell>
        </AppintossProviders>
      </body>
    </html>
  );
}
