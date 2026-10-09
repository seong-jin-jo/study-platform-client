import pwaColors from './pwa-colors.json';

export const PWA_NAME = 'ZERO ONE IT DREAM';
export const PWA_SHORT_NAME = 'ZERO ONE';
export const PWA_DESCRIPTION =
  '구글에 없는 질문을 나누는 곳. 0에서 1까지, 개발자가 아닌 사람들의 IT 커뮤니티.';

// DESIGN semantic token: gray-0. The shell header, browser chrome, and launch
// background stay white; the rose brand color remains inside the original logo.
// Manifest and browser metadata cannot resolve CSS custom properties, so their
// canonical hex values are mirrored here once for non-CSS consumers.
export const PWA_COLORS = pwaColors;

export const PWA_CACHE_VERSION =
  process.env.NEXT_PUBLIC_PWA_CACHE_VERSION ?? 'development';

export const PWA_SERVICE_WORKER_ENABLED =
  process.env.NEXT_PUBLIC_PWA_SW_ENABLED !== 'false';
