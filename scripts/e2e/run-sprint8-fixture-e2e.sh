#!/usr/bin/env bash
# SPRINT8 픽스처 전제 스펙 4개와 모바일 글자 계약을 실행하는 로컬/CI 러너.
#
# e2e/support/fixture-api.ts 가 서술하는 문제: 이 스펙들은 테스트 픽스처 데이터와
# 상류 장애 주입을 전제하는데, 그 서버가 저장소에 없어 CI 에서 늘
# ECONNREFUSED 로 건너뛰었다(2026-08-21 실측). 이 스크립트는 그 전제 3개를
# 순서대로 띄운다:
#   1. SPRINT8 픽스처 API 서버 (scripts/test/sprint8-fixture-server.mjs, 기본 3290)
#   2. SPRINT8 이미지 픽스처 서버 (scripts/test/sprint8-strapi-fixture.mjs, 3212 고정,
#      /insights/dep-article-1 등이 참조하는 http://127.0.0.1:3212/uploads/cover.png 를 낸다)
#   3. 픽스처 API 를 백엔드로 삼는 Next.js 앱 (NEXT_PUBLIC_API_BASE_URL=픽스처 API,
#      기본 포트 3299 — 기존 e2e 잡이 쓰는 3000 과 겹치지 않게 분리)
#
# 그 위에서 픽스처 의존 스펙을 돌린다. 나머지 스펙은 실제 시딩된
# test-api 를 기대하므로 같은 앱 인스턴스로 같이 돌리면 안 된다 — 그래서
# 이 러너는 --grep 으로 그 4개 파일만 선택한다.
#
# 종료 시(성공/실패/중단 무관) 띄운 프로세스를 전부 정리한다.
set -euo pipefail
cd "$(dirname "$0")/../.."

FIXTURE_API_PORT="${SPRINT8_FIXTURE_PORT:-3290}"
APP_PORT="${SPRINT8_APP_PORT:-3299}"
FIXTURE_API_BASE="http://127.0.0.1:${FIXTURE_API_PORT}"
APP_BASE_URL="http://127.0.0.1:${APP_PORT}"
# 본문 CMS 픽스처. 앱은 서버에서 본문을 가져올 때 STRAPI_URL 이 없으면 요약 전용
# 화면으로 떨어지므로, 위에서 띄우는 3212 픽스처를 build/start 양쪽에 넘긴다.
STRAPI_FIXTURE_BASE="http://127.0.0.1:3212"
# 이 값은 픽스처 서버(scripts/test/sprint8-strapi-fixture.mjs L90)가 그대로 대조하는
# 값이라 바꾸면 401 이 된다. 실제 비밀값이 아니다.
STRAPI_FIXTURE_TOKEN="fixture-token"

PIDS=()
cleanup() {
  for pid in "${PIDS[@]:-}"; do
    if [ -n "${pid:-}" ] && kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
      wait "$pid" 2>/dev/null || true
    fi
  done
}
trap cleanup EXIT INT TERM

wait_for() {
  local url="$1"
  local label="$2"
  for _ in $(seq 1 60); do
    if curl -sf --max-time 2 "$url" >/dev/null 2>&1; then
      echo "[sprint8-fixture-e2e] ${label} ready: ${url}"
      return 0
    fi
    sleep 1
  done
  echo "::error::[sprint8-fixture-e2e] ${label} did not become ready at ${url}" >&2
  return 1
}

echo "[sprint8-fixture-e2e] starting fixture API on ${FIXTURE_API_PORT}"
SPRINT8_FIXTURE_PORT="$FIXTURE_API_PORT" SPRINT8_APP_PORT="$APP_PORT" node scripts/test/sprint8-fixture-server.mjs &
PIDS+=("$!")
wait_for "${FIXTURE_API_BASE}/api/v1/insight/map" "fixture API"

echo "[sprint8-fixture-e2e] starting media fixture on 3212"
node scripts/test/sprint8-strapi-fixture.mjs &
PIDS+=("$!")
wait_for "${STRAPI_FIXTURE_BASE}/uploads/cover.png" "media fixture"

# 사이트맵 파티션 서명 비밀값. src/api/endpoints/seo/sitemap.server.ts 가
# NEXTAUTH_SECRET 폴백 없이 실패하면 이 값을 요구한다 — 픽스처 러너 전용 값이라
# 운영 비밀값과 무관하다(회장 하네스 §4.5 대상 아님, 실제 비밀 아님).
SITEMAP_PARTITION_SECRET="${SITEMAP_PARTITION_SECRET:-sprint8-fixture-e2e-not-a-real-secret}"

if [ "${SPRINT8_SKIP_BUILD:-}" != "1" ]; then
  echo "[sprint8-fixture-e2e] building app with NEXT_PUBLIC_API_BASE_URL=${FIXTURE_API_BASE}"
  NEXT_PUBLIC_API_BASE_URL="$FIXTURE_API_BASE" \
  SITEMAP_PARTITION_SECRET="$SITEMAP_PARTITION_SECRET" \
  SEO_DOCUMENT_REVALIDATE_SECONDS=0 \
STRAPI_URL="$STRAPI_FIXTURE_BASE" \
  STRAPI_API_TOKEN="$STRAPI_FIXTURE_TOKEN" \
    npx next build
fi

echo "[sprint8-fixture-e2e] starting app on ${APP_PORT}"
NEXT_PUBLIC_API_BASE_URL="$FIXTURE_API_BASE" \
SITEMAP_PARTITION_SECRET="$SITEMAP_PARTITION_SECRET" \
SEO_DOCUMENT_REVALIDATE_SECONDS=0 \
STRAPI_URL="$STRAPI_FIXTURE_BASE" \
STRAPI_API_TOKEN="$STRAPI_FIXTURE_TOKEN" \
PORT="$APP_PORT" \
  npx next start -p "$APP_PORT" &
PIDS+=("$!")
wait_for "${APP_BASE_URL}/insights" "app"

# 워커 1개로 고정한다. 픽스처 서버는 lifecycle 상태를 하나만 들고 있어서
# 스펙 파일이 동시에 돌면 lifecycle 스펙의 변경(방 보관·화두 회수)이 다른 파일의
# 화면에 그대로 보인다. fullyParallel:false 는 파일 "안"만 직렬이라 이걸 못 막는다.
REPORT_FILE="${E2E_PLAYWRIGHT_JSON_OUTPUT_FILE:-e2e-reports/results-sprint8-fixture.json}"
MOBILE_REPORT_FILE="${REPORT_FILE%.json}-mobile-typography.json"

# Playwright는 CLI에 적은 파일 순서를 보장하지 않고 파일명으로 정렬한다. 한 실행에
# lifecycle과 같이 넘기면 상태 변경 스펙이 mobile-typography보다 먼저 돌 수 있으므로,
# 데이터가 초기 상태일 때 크기 계약을 별도 실행으로 먼저 고정한다.
echo "[sprint8-fixture-e2e] running mobile typography before lifecycle specs"
MOBILE_TYPOGRAPHY_STATUS=0
E2E_BASE_URL="$APP_BASE_URL" \
E2E_API_BASE_URL="$FIXTURE_API_BASE" \
E2E_FIXTURE_API_BASE="$FIXTURE_API_BASE" \
E2E_PLAYWRIGHT_JSON_OUTPUT_FILE="$MOBILE_REPORT_FILE" \
  npx playwright test \
    e2e/mobile-typography.spec.ts \
    --project=chromium \
    --workers=1 "$@" || MOBILE_TYPOGRAPHY_STATUS=$?

echo "[sprint8-fixture-e2e] running remaining fixture-dependent specs"
SPRINT8_STATUS=0
E2E_BASE_URL="$APP_BASE_URL" \
E2E_API_BASE_URL="$FIXTURE_API_BASE" \
E2E_FIXTURE_API_BASE="$FIXTURE_API_BASE" \
E2E_PLAYWRIGHT_JSON_OUTPUT_FILE="$REPORT_FILE" \
  npx playwright test \
    e2e/insights/sprint8.spec.ts \
    e2e/insights/sprint8-lifecycle.spec.ts \
    e2e/insights/sprint8-ui-smoke.spec.ts \
    e2e/insights/sprint8-seo-public.spec.ts \
    --project=chromium \
    --workers=1 "$@" || SPRINT8_STATUS=$?

if ((MOBILE_TYPOGRAPHY_STATUS != 0 || SPRINT8_STATUS != 0)); then
  echo "[sprint8-fixture-e2e] failed: mobile-typography=${MOBILE_TYPOGRAPHY_STATUS}, sprint8=${SPRINT8_STATUS}" >&2
  exit 1
fi
