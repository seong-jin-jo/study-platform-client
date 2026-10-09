export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PWA_INSTALL_PROMPT_PROPERTY = '__zeroonePwaInstallPrompt';
export const PWA_INSTALL_PROMPT_READY_EVENT =
  'zeroone:pwa-install-prompt-ready';
export const PWA_INSTALL_PROMPT_CLEARED_EVENT =
  'zeroone:pwa-install-prompt-cleared';
export const PWA_INSTALL_MENU_MEDIA_QUERY = '(max-width: 767.98px)';

type PwaInstallPromptWindow = Window & {
  [PWA_INSTALL_PROMPT_PROPERTY]?: BeforeInstallPromptEvent;
};

export function readStoredPwaInstallPrompt(targetWindow: Window = window) {
  return (targetWindow as PwaInstallPromptWindow)[PWA_INSTALL_PROMPT_PROPERTY];
}

export function clearStoredPwaInstallPrompt(targetWindow: Window = window) {
  delete (targetWindow as PwaInstallPromptWindow)[PWA_INSTALL_PROMPT_PROPERTY];
  targetWindow.dispatchEvent(
    new targetWindow.Event(PWA_INSTALL_PROMPT_CLEARED_EVENT),
  );
}

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

export function isStandaloneDisplayMode(
  targetWindow: Window = window,
  targetNavigator: NavigatorWithStandalone = navigator,
) {
  return (
    targetWindow.matchMedia('(display-mode: standalone)').matches ||
    targetNavigator.standalone === true
  );
}

export function isIosSafari(
  userAgent: string,
  vendor: string,
  maxTouchPoints: number,
) {
  const isIosDevice =
    /iPad|iPhone|iPod/.test(userAgent) ||
    (userAgent.includes('Macintosh') && maxTouchPoints > 1);
  const isSafari =
    /Safari/.test(userAgent) &&
    /Apple Computer/.test(vendor) &&
    !/CriOS|FxiOS|EdgiOS|OPiOS/.test(userAgent);

  return isIosDevice && isSafari;
}

export function shouldRegisterPwaServiceWorker({
  nodeEnv,
  enabled,
  hasServiceWorker,
}: {
  nodeEnv: string | undefined;
  enabled: boolean;
  hasServiceWorker: boolean;
}) {
  return nodeEnv === 'production' && enabled && hasServiceWorker;
}
