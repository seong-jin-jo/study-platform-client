/**
 * SPRINT8 공개 SEO 스펙이 전제하는 픽스처 API.
 *
 * 이 스펙들은 진짜 백엔드로는 못 하는 것을 확인한다.
 *  - 테스트 픽스처/시드 데이터(`/insights/dep-article-1`, `/community/rooms/8` 등)
 *  - 상류 장애 주입(`POST /__control/public-seo-upstream/fail` · `/recover`)
 *  - 수명주기 상태 전환(`POST /__control/lifecycle/<action>`)
 *
 * 픽스처 서버는 `scripts/test/sprint8-fixture-server.mjs`(API, 기본 3290) +
 * `scripts/test/sprint8-strapi-fixture.mjs`(이미지, 3212)다. 로컬/CI 러너는
 * `yarn e2e:sprint8:fixture`(`scripts/e2e/run-sprint8-fixture-e2e.sh`) —
 * 픽스처 서버 2개 + 그 위에서 빌드한 앱을 띄운 뒤 이 4개 스펙만 돌리고
 * 종료 시 전부 정리한다.
 *
 * 계약을 추측해 가짜 서버를 만들면 "통과"가 거짓이 된다. 그래서 이 서버의
 * 응답 형태는 `src/api/openapi/models/`(OpenAPI 생성 타입)와
 * `../docs/eng-design/api-contract-sprint8-seo-v1.0.7.md`(모노레포 루트 docs)를
 * 근거로 삼는다.
 * 서버가 어떤 이유로든 안 떠 있으면 지금도 **그 사실을 밝히고 건너뛴다** —
 * 결함을 숨기는 skip 이 아니라 전제가 없다는 것을 드러내는 skip 이다.
 */
export const FIXTURE_API_BASE =
  process.env.E2E_FIXTURE_API_BASE?.trim() ?? 'http://127.0.0.1:3290';

export async function fixtureApiReachable(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);
    const response = await fetch(`${FIXTURE_API_BASE}/api/v1/insight/map`, {
      signal: controller.signal,
    });
    clearTimeout(timer);
    return response.status < 500;
  } catch {
    return false;
  }
}

export const fixtureMissingReason =
  `픽스처 API(${FIXTURE_API_BASE})에 붙지 못해 건너뛴다. ` +
  '이 스펙은 테스트 픽스처 데이터와 장애 주입 제어를 전제하는데 해당 서버를 띄우는 코드가 저장소에 없다. ' +
  'E2E_FIXTURE_API_BASE 로 실제 주소를 지정하면 실행된다.';
