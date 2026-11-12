import { trackGa4Event } from '@/components/common/analytics/ga4-events';

/**
 * "새로운 기능" 카드 GA4 이벤트. 기존 trackGa4Event(gtag 형식, send_to=측정 ID)로 보낸다.
 * GTM 을 거치지 않고 페이지의 GA4 속성(NEXT_PUBLIC_GA_MEASUREMENT_ID)으로 바로 가므로
 * GTM 태그 추가는 필요 없다.
 */
export const trackWhatsNewView = (version: string) =>
  trackGa4Event('whats_new_view', { version });

export const trackWhatsNewTry = (version: string, href: string) =>
  trackGa4Event('whats_new_try', { version, href });

/** method: 의견을 어떤 방법으로 남기는지. 지금은 기존 문의 화면 이동뿐이다. */
export const trackWhatsNewFeedback = (version: string, method: string) =>
  trackGa4Event('whats_new_feedback', { version, method });
