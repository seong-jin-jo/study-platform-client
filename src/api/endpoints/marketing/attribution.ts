import { axiosInstance } from '@/api/client/axios';
import {
  type AttributionData,
  getAttributionData,
} from '@/utils/attribution-tracker';

/**
 * 회원이 어디서 들어왔는지를 서버에 한 번 넘긴다.
 *
 * 왜 필요한가: 지금까지 유입경로는 브라우저 쿠키와 GTM 이벤트에만 있었다.
 * 쿠키는 지워지고 GTM 은 회원번호를 모른다. 그래서 "이 회원은 어디서 왔나"를
 * 물으면 답이 안 나왔다(2026-08-23 기준 회원 158명 전원 출처 미상).
 * 우리 DB 에 적어 두면 도구가 바뀌어도 남는다.
 *
 * 실패해도 조용히 넘어간다. 유입경로를 못 적는 것보다 로그인이 막히는 쪽이 비싸다.
 */

/** utm_source 가 없을 때 어디서 왔는지를 추론한다. 추측이 아니라 관찰된 referrer 다. */
const deriveSource = (
  data: AttributionData,
): { source: string; medium: string } => {
  if (data.utm_source) {
    return { source: data.utm_source, medium: data.utm_medium ?? 'unknown' };
  }
  if (data.referrer_domain) {
    return { source: data.referrer_domain, medium: 'referral' };
  }

  return { source: 'direct', medium: 'none' };
};

/**
 * 서버는 시간대 없는 날짜시각(LocalDateTime)을 받는다. 브라우저가 만든 ISO 문자열은
 * 끝에 Z 가 붙어 있어 그대로 보내면 파싱에서 튕긴다. 한국 시각으로 바꿔서 넘긴다.
 */
const toServerDateTime = (iso: string): string | null => {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return null;
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(parsed);

  // sv-SE 로케일은 "2026-08-23 14:05:09" 형태를 준다. 가운데 공백만 T 로 바꾸면 된다.
  return parts.replace(' ', 'T');
};

export const recordAttribution = async (): Promise<boolean> => {
  const data = getAttributionData();
  if (!data) return false;

  const { source, medium } = deriveSource(data);

  try {
    await axiosInstance.post('members/me/attribution', {
      utmSource: source.slice(0, 100),
      utmMedium: medium.slice(0, 100),
      utmCampaign: data.utm_campaign?.slice(0, 150) ?? null,
      firstTouchAt: toServerDateTime(data.first_visit_timestamp),
    });

    return true;
  } catch {
    return false;
  }
};
