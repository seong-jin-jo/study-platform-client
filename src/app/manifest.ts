import type { MetadataRoute } from 'next';

import {
  PWA_COLORS,
  PWA_DESCRIPTION,
  PWA_NAME,
  PWA_SHORT_NAME,
} from '@/config/pwa';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: PWA_NAME,
    short_name: PWA_SHORT_NAME,
    description: PWA_DESCRIPTION,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: PWA_COLORS.background,
    theme_color: PWA_COLORS.theme,
    lang: 'ko',
    icons: [
      {
        src: '/icons/pwa-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/pwa-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/pwa-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
