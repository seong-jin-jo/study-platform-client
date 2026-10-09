import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';

const authFile = 'e2e/fixtures/auth.json';
const baseURL = process.env.E2E_BASE_URL ?? 'https://test.zeroone.it.kr';
const isStaging = baseURL.includes('zeroone.it.kr');
const proxyServer = process.env.E2E_PROXY_SERVER?.trim();
// CI 스킵 게이트(scripts/e2e/fail-on-skipped.mjs)가 읽는 JSON 리포트 경로.
// 같은 CI job 안에서 non-auth run과 auth run이 순차로 도므로, run마다 다른
// 파일명을 지정해 서로 덮어쓰지 않게 한다(see 루트 .github/workflows/client-ci.yml,
// 실제로 GitHub이 실행하는 워크플로).
//
// 이름이 E2E_ 로 시작해야 한다: e2e 잡은 Playwright를 도커 컨테이너 안에서 돌리고,
// 컨테이너에는 러너 쉘 env 전체가 아니라 `E2E_` 접두 변수만 -e 로 골라 넘긴다
// (client-ci.yml: `env | grep -oE '^E2E_[A-Z0-9_]+'`). 접두어가 없으면 이 값은
// 컨테이너 안에서 안 보이고 매 run이 기본값 하나로 서로 덮어써 리포트가 사라진다.
const jsonReportFile =
  process.env.E2E_PLAYWRIGHT_JSON_OUTPUT_FILE ??
  'playwright-report/results.json';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 60000,
  // 개별 확인(expect)의 기본 대기는 5초다. 그런데 이 검사들은 공유 dev 백엔드를
  // 상대로 돌고, 그 응답이 느린 순간이 실제로 있다.
  //
  // 실측(2026-08-28): 같은 원인으로 서로 다른 검사가 세 번 빨갛게 떴다.
  //   - 방 목록 로딩 문구가 5초를 못 넘기고 남아 있음
  //   - koan-detail 이 로딩 상태라 testid 가 아직 안 붙음
  //     (koan-detail.tsx 는 로딩 중일 때 testid 를 달지 않는다)
  // 셋 다 코드 결함이 아니라 "5초 안에" 라는 전제가 틀린 것이었다. 확인의 뜻은
  // "이 상태가 된다" 이지 "5초 안에 된다" 가 아니다.
  //
  // 하나씩 찾아 고치면 같은 유형이 계속 나온다. 기본값을 올려 한 번에 막는다.
  // 검사 전체 제한 60초는 그대로라 진짜 멈춘 검사는 여전히 잡힌다.
  expect: { timeout: 15000 },
  reporter: [
    ['html', { open: 'never' }],
    ['json', { outputFile: jsonReportFile }],
  ],
  use: {
    baseURL,
    proxy: proxyServer ? { server: proxyServer } : undefined,
    storageState: isStaging && existsSync(authFile) ? authFile : undefined,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // 반응형 검증 전용 프로젝트 — @responsive 태그가 붙은 describe/test만 돈다.
    // 34건 전부를 3배로 돌리면 API 계약 검증까지 중복 실행되므로,
    // 화면 레이아웃을 눈으로 확인하는 테스트만 골라 태깅했다(goto+toBeVisible 기준, 상세는 e2e/AGENTS.md).
    {
      name: 'mobile',
      grep: /@responsive/,
      use: {
        ...devices['Desktop Chrome'],
        // 390x844 = 승인 프로토타입 mobile 뷰포트(390px, iPhone 13/14 논리 해상도)와 동일값.
        // e2e/sprint7-v3/authenticated-captures.spec.ts, e2e/retention/*-build-compare.spec.ts 의
        // 기존 viewports 배열이 이미 이 값을 프로토타입 기준으로 쓰고 있어 그대로 맞춘다.
        viewport: { width: 390, height: 844 },
      },
    },
    {
      name: 'tablet',
      grep: /@responsive/,
      use: {
        ...devices['Desktop Chrome'],
        // 768x1024 = 프로젝트 Tailwind 브레이크포인트 md:(768px, .claude/rules/styling.md) +
        // iPad 세로 논리 해상도. 승인 시안엔 태블릿 전용 값이 없어 md 브레이크포인트를 근거로 삼았다.
        viewport: { width: 768, height: 1024 },
      },
    },
  ],
});
