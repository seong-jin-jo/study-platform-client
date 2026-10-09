import './global.css';

import type { Metadata, Viewport } from 'next';
import { Corinthia } from 'next/font/google';
import localFont from 'next/font/local';
import type React from 'react';

import { cn } from '@/components/common/ui/(shadcn)/lib/utils';
import PwaRuntime from '@/components/pwa/pwa-runtime';
import { PWA_COLORS, PWA_NAME } from '@/config/pwa';
import MotionProvider from '@/providers/motion-provider';
import {
  PWA_INSTALL_MENU_MEDIA_QUERY,
  PWA_INSTALL_PROMPT_CLEARED_EVENT,
  PWA_INSTALL_PROMPT_PROPERTY,
  PWA_INSTALL_PROMPT_READY_EVENT,
} from '@/utils/pwa';

const SITE_URL = 'https://www.zeroone.it.kr';
const OG_IMAGE = `${SITE_URL}/images/og-image.png`;
const OG_TITLE = 'ZERO ONE IT | The questions you can\u2019t google.';
const OG_DESCRIPTION =
  'Zero to one, for the rest of us. A community for people building with AI who want to understand what they shipped.';
const pwaInstallPromptBootstrap = `(() => {
  const promptProperty = ${JSON.stringify(PWA_INSTALL_PROMPT_PROPERTY)};
  const promptReadyEvent = ${JSON.stringify(PWA_INSTALL_PROMPT_READY_EVENT)};
  const promptClearedEvent = ${JSON.stringify(PWA_INSTALL_PROMPT_CLEARED_EVENT)};
  const installMenuViewport = window.matchMedia(${JSON.stringify(PWA_INSTALL_MENU_MEDIA_QUERY)});

  window.addEventListener('beforeinstallprompt', (event) => {
    if (!installMenuViewport.matches) return;
    event.preventDefault();
    window[promptProperty] = event;
    window.dispatchEvent(new Event(promptReadyEvent));
  });

  window.addEventListener('appinstalled', () => {
    delete window[promptProperty];
    window.dispatchEvent(new Event(promptClearedEvent));
  });
})();`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'ZERO ONE IT',
  description:
    '구글에 없는 질문을 나누는 곳. 0에서 1까지, 개발자가 아닌 사람들의 IT 커뮤니티.',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icons/pwa-192.png', type: 'image/png', sizes: '192x192' },
      { url: '/icons/pwa-512.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: [
      {
        url: '/icons/apple-touch-icon.png',
        type: 'image/png',
        sizes: '180x180',
      },
    ],
  },
  appleWebApp: {
    capable: true,
    title: PWA_NAME,
    statusBarStyle: 'default',
  },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: SITE_URL,
    siteName: 'ZERO ONE IT',
    title: OG_TITLE,
    description: OG_DESCRIPTION,
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: 'ZERO ONE IT',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: OG_TITLE,
    description: OG_DESCRIPTION,
    images: [OG_IMAGE],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: PWA_COLORS.theme,
};

const pretendard = localFont({
  src: '../../public/fonts/PretendardVariable.woff2',
  variable: '--font-pretendard',
  display: 'swap',
});

// Decorative script face for the "Benefit" display heading (Figma: Thesignature).
const thesignature = localFont({
  src: '../../public/fonts/Thesignature.otf',
  variable: '--font-thesignature',
  display: 'swap',
});

// Decorative Latin script face for the Instructor "Define / Build / Run" headings (Figma: Corinthia).
const corinthia = Corinthia({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-corinthia',
  display: 'swap',
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={cn(
        pretendard.variable,
        thesignature.variable,
        corinthia.variable,
      )}
      suppressHydrationWarning
    >
      <head>
        {/* This small inline bootstrap must run before DOMContentLoaded so
            Chromium's one-shot mobile install event cannot be lost. */}
        <script>{pwaInstallPromptBootstrap}</script>
      </head>
      <body
        className={cn(
          pretendard.className,
          'min-h-screen w-screen overflow-x-hidden',
        )}
      >
        <PwaRuntime />
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
