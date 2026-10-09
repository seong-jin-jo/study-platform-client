export const DEFAULT_INSIGHT_SHARE_IMAGE =
  'https://www.zeroone.it.kr/images/og-image.png';

const isLoopbackOrPrivateHost = (hostname: string) =>
  hostname === 'localhost' ||
  hostname === '::1' ||
  hostname === '0.0.0.0' ||
  hostname.startsWith('127.') ||
  hostname.startsWith('10.') ||
  hostname.startsWith('192.168.') ||
  hostname.startsWith('169.254.') ||
  /^172\.(1[6-9]|2\d|3[01])\./.test(hostname) ||
  hostname.endsWith('.local') ||
  !hostname.includes('.');

export const resolvePublicMetadataImage = (
  candidate: string | undefined,
  fallback = DEFAULT_INSIGHT_SHARE_IMAGE,
): string => {
  const normalized = candidate?.trim();

  if (!normalized || normalized.startsWith('/uploads/')) {
    return fallback;
  }

  try {
    const url = new URL(normalized);
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      isLoopbackOrPrivateHost(url.hostname)
    ) {
      return fallback;
    }
    return url.toString();
  } catch {
    return fallback;
  }
};
