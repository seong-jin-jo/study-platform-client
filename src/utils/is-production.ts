/**
 * 운영(production) 환경 여부 판단.
 *
 * Sentry 환경 감지(src/config/sentry.ts)와 동일한 규칙을 사용한다:
 * NEXT_PUBLIC_API_BASE_URL 이 `api.zeroone.it.kr` 이면서 `test-api` 가 아니면 production.
 * (test.zeroone.it.kr / test-api 는 staging, 그 외는 development)
 *
 * QA 시드 도구처럼 DEV/staging 에서만 노출해야 하는 화면의 렌더 게이트로 사용한다.
 * 백엔드 @Profile("!prod") 가 hard gate 이고, 이 helper 는 프론트 편의 게이트다.
 */
export function isProduction(): boolean {
  const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

  return apiUrl.includes('api.zeroone.it.kr') && !apiUrl.includes('test-api');
}
