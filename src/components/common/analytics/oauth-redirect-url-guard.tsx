import { OAUTH_REDIRECT_BOOTSTRAP_SCRIPT } from '@/features/auth/model/scrub-oauth-redirect-url';

/**
 * 로그인 복귀 주소(/redirection?access-token=…&member-id=…)의 쿼리를 HTML 파싱 중에 지운다.
 *
 * 분석 스크립트(GTM·gtag·Clarity)는 하이드레이션 뒤에 로드된다. 그런데 이 주소를 읽는 컨트롤러는
 * Suspense 안에 있어 레이아웃보다 늦게 하이드레이션될 수 있고, 그 사이에 gtag 가 전체 주소를
 * 읽어 page_view 의 dl·dr 에 토큰이 실린다(2026-11-13 운영·로컬 실측). 하이드레이션 이전에 도는
 * 인라인 스크립트만이 이 순서를 보장한다. 쿼리는 컨트롤러가 읽도록 탭의 JS 변수에 한 번 보관한다.
 *
 * 분석 로더보다 앞에 렌더해야 한다. /redirection 이외 경로에서는 아무것도 하지 않는다.
 */
export default function OAuthRedirectUrlGuard() {
  return (
    <script
      // 고정 문자열이라 사용자 입력이 섞이지 않는다.
      dangerouslySetInnerHTML={{ __html: OAUTH_REDIRECT_BOOTSTRAP_SCRIPT }}
    />
  );
}
