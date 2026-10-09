import { sendGTMEvent } from '@next/third-parties/google';

/**
 * 공유 시도를 방문 분석에 남긴다.
 *
 * 왜 필요한가(2026-08-27): 공유 표면이 최소 7종 있는데 **어느 것도 서버에도
 * 방문 분석에도 기록을 안 남긴다**. URL 복사가 성공하면 토스트만 뜨고 끝이라
 * "사람들이 공유를 하기는 하나"조차 모른다. 추천 관문이 통째로 미측정인
 * 이유의 절반이 이것이다(나머지 절반은 도착·가입 귀속이 없는 것).
 *
 * 이 함수가 여는 것과 못 여는 것을 정확히 적는다.
 *   연다: 공유 시도 수, 표면별 비교, 공유하는 사람이 있기는 한지
 *   못 연다: 누가 누구를 데려왔는지. 그건 추천 토큰이 있어야 하고
 *           DB 스키마·API 계약이 필요해 기술설계 단계에서 회장과 정한다
 *           (docs/growth/referral-design.md).
 *
 * 개인정보: 회원 번호도 보내지 않는다. 표면 이름과 대상 종류만 보낸다.
 * 회원 식별은 이미 방문 분석 쪽에서 별도로 붙는다(analytics-identity.ts).
 */
export type ShareSurface =
  | 'course_complete'
  | 'course_complete_instagram'
  | 'class_detail'
  | 'builder_feed'
  | 'community_post'
  | 'community_qna'
  | 'builder_ticket';

/** 공유가 실제로 어떻게 끝났는지. 복사와 시스템 공유창은 성사율이 다르다. */
export type ShareMethod = 'clipboard' | 'system_share' | 'canceled' | 'failed';

export const trackShare = (
  surface: ShareSurface,
  method: ShareMethod,
): void => {
  try {
    sendGTMEvent({
      event: 'custom_share',
      dl_timestamp: new Date().toISOString(),
      dl_share_surface: surface,
      dl_share_method: method,
    });
  } catch {
    // 계측이 실패해도 공유는 막지 않는다. 사용자가 하려던 일이 우선이다.
  }
};
