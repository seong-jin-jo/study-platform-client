/**
 * 방문 분석에 회원번호를 붙인다.
 *
 * 왜 필요한가: 지금 분석 도구는 브라우저 단위로만 사람을 센다. 같은 사람이
 * 폰과 노트북으로 들어오면 두 명으로 잡히고, 가입 전 방문과 가입 후 방문이
 * 이어지지 않는다. 회원번호를 붙이면 그 둘이 한 사람으로 묶인다.
 *
 * 회원번호만 보낸다. 이메일·로그인 아이디·이름·전화번호는 절대 보내지 않는다.
 * 개인정보를 분석 도구에 넘기는 것은 정책 위반이고, 한 번 들어가면 지우기 어렵다.
 */

type GtagFn = (
  command: string,
  targetOrParam: string,
  params?: Record<string, unknown>,
) => void;

const getGtag = (): GtagFn | null => {
  if (typeof window === 'undefined') return null;
  const candidate = (window as unknown as { gtag?: GtagFn }).gtag;

  return typeof candidate === 'function' ? candidate : null;
};

const MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

/** 로그인·가입 직후에 부른다. 새로고침으로 초기화되므로 세션마다 다시 불러야 한다. */
export const setAnalyticsUserId = (memberId: string | number): void => {
  const gtag = getGtag();
  if (!gtag || !MEASUREMENT_ID) return;
  gtag('config', MEASUREMENT_ID, { user_id: String(memberId) });
};

/** 로그아웃 때 부른다. 안 지우면 다음 사람의 방문이 이전 회원으로 붙는다. */
export const clearAnalyticsUserId = (): void => {
  const gtag = getGtag();
  if (!gtag || !MEASUREMENT_ID) return;
  gtag('config', MEASUREMENT_ID, { user_id: undefined });
};
