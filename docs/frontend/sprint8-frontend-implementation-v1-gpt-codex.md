# SPRINT8 프론트엔드 구현 기록

> STAMP: 2026-08-06 01:18 KST · model=gpt-codex/GPT-5 · agent=code-builder · skills=없음(매칭 스킬 없음) · 근거=https://nextjs.org/docs/app/getting-started/server-and-client-components · 고민=잠긴 본문이 RSC payload에 들어갈 가능성을 타입과 호출 순서 양쪽에서 제거했다.

## 기반 산출물

- `docs/fdd-sprint8-v1.3.0.md` + 위임 프롬프트의 v1.3.1 확정 접근 계약
- `docs/prd-sprint8-koan-v1.2.1.md`
- `docs/DESIGN.md`
- `docs/api-contract.md`, `docs/test-plan.md`의 SPRINT8 절
- `docs/prototype/sprint8-koan/sprint8-app-v9-opus5.html`
- `docs/prototype/sprint8-koan/sprint8-integration-F-sea-stage-v9-opus5.html`
- `docs/prototype/sprint8-koan/sprint8-koan-list-v2-opus5.html`
- `docs/prototype/sprint8-koan/sprint8-koan-detail-v3-opus5.html`
- `docs/prototype/sprint8-koan/sprint8-v9.css`
- 코드 기준: `origin/develop` `ca56aee8`

## 기존 구현 확인

기준 커밋에는 인사이트 지도 조회, 섬·개념글 진행 상태, 읽기 예산, 조회·도움됨·완독 기록, Strapi 공개 조회, 개념글 상세 UI가 이미 있었다. SPRINT8은 이를 삭제하거나 그린필드로 복제하지 않고 아래처럼 확장했다.

- 지도 응답과 기존 진행 상태 위에 바다/섬 시각 구조와 잠금 상태를 결합했다.
- 기존 조회·도움됨을 유지하고, 수동 완독 버튼만 글 끝 자동 관찰로 바꿨다.
- 기존 블로그 렌더러를 유지하면서 본문 공급 경계만 서버 전용 접근 판정 뒤로 옮겼다.
- 기존 커뮤니티 Q&A 컨트롤러와 답변 mutation을 화두 상세의 참여·사회적 증거에 재사용했다.

기준 커밋에는 `docs/구현현황.md`가 없었다. 공유 mono 작업공간의 미추적 구현현황 문서는 별도로 읽었고, SPRINT7 배포·기존 Strapi 인사이트를 확인했으나 SPRINT8 항목은 아직 없었다. 이 문서가 이번 프론트 구현현황의 라인별 기록이며, 병합 시 전사 구현현황 정본에 합쳐야 한다.

## 구현 결과

- `/insights`: 바다/섬 지도, 오늘의 화두, 지난 화두 통합 허브
- `/insights/land/[slug]`: 섬 상세, 개념글 잠금/해제, 물때 잔액, 공부방·화두 연결
- `/insights/[slug]`: 제품 백엔드 접근 판정 후에만 Strapi 본문을 읽는 개념글 상세
- `/insights/koans`: 프로토타입의 히어로·카테고리 축·목록·우측 레일
- `/insights/koans/[koanId]`: AI/사람 검토 고지, 정정 기록, 보완 답변, 참여 입력, 누적 사회적 증거
- 비회원 첫 편은 본문 전체를 제공하고 로그인 유도는 글 끝에만 둔다.
- Strapi 본문 JSON은 `STRAPI_URL` + `STRAPI_API_TOKEN` 서버 경계에 두고, `/uploads` URL은 서버에서 절대 URL로 변환한다.
- 잠금 판별 유니온의 `LOCKED`에는 본문 클로저가 없고, 열린 분기에만 판정 시점 `documentId`를 캡처한 무인자 `fetchBody()`가 있다.

## 검증

- TypeScript: 후속 수정까지 포함한 `yarn typecheck` 통과(exit 0, `/tmp/sprint8-typecheck.log`, 2026-08-06 04:41 KST).
- ESLint: `yarn lint` 통과. 화면/클라이언트의 `api/strapi/**` 직접 import 제한 포함
- 접근·미디어 단위 테스트: 5건 통과
- 바다·섬·화두 목록·화두 상세 서버 렌더 테스트: 4건 통과
- 프로덕션 빌드: 컨트롤러가 후속 수정 전 커밋에서 exit 0을 관찰했다. 후속 수정 커밋 `67a06df1`은 TypeScript/단위 테스트로 검증했지만 프로덕션 빌드는 미검증이다. 이 세션의 기존 Turbopack 프로세스 PID 28925가 `.next/lock`을 계속 점유했고, 별도 임시 작업본의 Webpack 빌드는 `fonts.googleapis.com` DNS 차단 뒤 컴파일 단계에서 멈췄다.
- Playwright E2E와 1440/390 CDP 스크린샷: 후속 수정 전 데스크톱 캡처 8개만 존재한다. 후속 수정 뒤 캡처는 미검증이다. Chromium이 Mach rendezvous 등록에서 `Permission denied (1100)`로 종료돼 최종 8개 구현 화면을 새로 만들지 못했다.

재현용으로 `scripts/test/sprint8-fixture-server.mjs`, `scripts/test/sprint8-strapi-fixture.mjs`, `scripts/test/sprint8-visual-capture.mjs`, `e2e/insights/sprint8.spec.ts`를 남겼다. fixture는 테스트 전용이며 제품 런타임에 연결되지 않는다.

## 레드팀 및 셀프심문

- 레드팀 공격: 화면이 잠금 판정을 했더라도 메타데이터 생성이 Strapi를 먼저 부르면 본문이 새어 나간다. 수정: 페이지와 `generateMetadata`가 같은 `resolveArticleAccess()`를 먼저 통과하도록 고정하고 LOCKED 테스트에서 본문 호출 0회를 검증했다.
- 이 결론이 틀렸다면 가장 그럴듯한 이유: 타입 계약은 맞지만 실제 브라우저에서 프로토타입과 픽셀 차이가 남았을 수 있다. 샌드박스가 Chromium 실행을 막아 육안 대조 증거를 만들지 못했으므로 디자인 일치는 완료가 아니라 미검증으로 남긴다.

## 남은 운영 조건

- GitHub Actions 환경에 `STRAPI_URL`, `STRAPI_API_TOKEN`, `PROD_STRAPI_URL`, `PROD_STRAPI_API_TOKEN` 시크릿을 넣어야 배포 workflow가 동작한다.
- 백엔드 SPRINT8 API가 병합된 뒤 테스트 fixture 없이 Playwright를 실행해야 한다.
- 스크린샷 검증은 1440×1000과 CDP `Emulation.setDeviceMetricsOverride`의 실제 390×844에서 수행한다.

## SPRINT8 시각 정합 후속 수정 exit report

> STAMP: 2026-08-06 05:07 KST · model=gpt-codex/GPT-5 · agent=code-builder · skills=없음(매칭 스킬 없음) · 근거=https://playwright.dev/docs/api/class-locator#locator-screenshot · 고민=쇼케이스 외곽이 아니라 승인 프레임 자체를 캡처하면서 구현 뷰포트는 실제 1440/390으로 유지했다.

### 변경 결과

- 커밋: `c340b5e3` 캡처 구조 교정, `67a06df1` 네 화면 시각 정합 보완
- 후속 전체 변경(`a41e8632..HEAD`): 7파일, `+668/-92`. 이 중 시각 정합 구현 커밋 `67a06df1`은 6파일, `+519/-80`이다.
- SPRINT8 프론트 브랜치 전체(`ca56aee8..HEAD`): 49파일, `+4524/-566`
- 캡처: 쇼케이스의 실제 `#frame` 요소만 `locator.screenshot()`으로 저장하고, `[data-vw="390"]`/`[data-vw="1024"]`를 먼저 선택한다. 구현 화면은 1440×1000/390×844 실제 뷰포트를 유지한다.
- 허브: 섬 라벨을 현재 섬 외에는 좌우로 분리하고, 우상단을 fixture 진행도 기반 `두곳 개척 →`, 현재 섬을 `6편 중 5편` 형식으로 맞췄다.
- 화두 목록: 발행 페이스, 메일 카드, 분야별 진입 레일을 복원했다. 기존 데이터베이스/전체 바다 링크는 보존했다.
- 화두 상세: 사람 검토 칩, 답 제목, 화두 도움 반응, 같은 분야 다른 물음, 분야 연결, 모바일 고정 참여 바를 복원했다. 기존 정정·운영팀 의견·Q&A 작성/반응·개념글 링크는 보존했다.

### 검증 증거

- `node --check scripts/test/sprint8-visual-capture.mjs`: 통과
- Biome format check 6파일: 통과
- 변경 파일 대상 ESLint: 통과
- `sprint8-routes-render.test.ts`: 5/5 통과(`/tmp/sprint8-vitest.log`)
- `yarn typecheck`: 통과(`/tmp/sprint8-typecheck.log`)
- 프로덕션 빌드 및 수정 후 실제 렌더 대조: 미검증(위 Chromium/네트워크/고아 프로세스 차단)

### 최종 구현 스크린샷 출력 계약

아래 8개가 최종 출력 경로다. 현재 파일 중 데스크톱 4개는 후속 수정 전 산출물이므로 최종 증거로 쓰지 않으며, 모바일 4개는 아직 생성되지 않았다.

- `test-results/sprint8-visual/hub-implementation-desktop-1440.png`
- `test-results/sprint8-visual/hub-implementation-mobile-390.png`
- `test-results/sprint8-visual/island-implementation-desktop-1440.png`
- `test-results/sprint8-visual/island-implementation-mobile-390.png`
- `test-results/sprint8-visual/koan-list-implementation-desktop-1440.png`
- `test-results/sprint8-visual/koan-list-implementation-mobile-390.png`
- `test-results/sprint8-visual/koan-detail-implementation-desktop-1440.png`
- `test-results/sprint8-visual/koan-detail-implementation-mobile-390.png`

### 남은 차이와 회수 필요

- 시각 차이: 수정 후 캡처를 직접 보지 못했으므로 0건이라고 주장하지 않는다. QA에서 8개 구현 이미지와 대응 prototype 이미지를 전수 대조해야 한다.
- 기능 차이: 승인 프로토타입의 메일 구독 버튼에 대응하는 API/route가 기반 계약과 코드에 없다. 버튼과 카드는 재현하되 비활성화했다. `⛔ 회수 필요: 메일 구독 계약을 별도 기술설계에서 확정해야 활성화할 수 있다.`
- 데이터 차이: 프로토타입의 분야별 개념글 수 집계 API가 없다. 존재하는 화두 목록 데이터만 집계하며 임의 숫자는 만들지 않았다.

### 다음 QA 실행

fixture API `3211`, Strapi fixture `3212`, 승인 프로토타입 `3213`, 빌드된 웹 `3210`을 기동한 뒤 `node scripts/test/sprint8-visual-capture.mjs`를 실행한다. 이어 `PLAYWRIGHT_TEST_BASE_URL=http://127.0.0.1:3210 yarn playwright test e2e/insights/sprint8.spec.ts`로 happy/접근 경계를 확인한다.

SOURCES: 기반 산출물 전부, 코드 기준 `ca56aee8`, Next.js 공식 Server/Client Components 문서 https://nextjs.org/docs/app/getting-started/server-and-client-components, `/Users/sj/.claude/standards/dev.md`, `/Users/sj/.claude/standards/benchmarks.md`

MODEL: gpt-codex/GPT-5

SKILLS_USED: 없음

SKILLS_SKIPPED: 없음(매칭 스킬 없음)

## 2026-08-06 16:44 KST 코드리뷰 critic_loop cycle 1 보정

> STAMP: 2026-08-06 16:44 KST · model=gpt-5.6-sol · agent=code-builder · skills=없음(매칭 스킬 없음) · 근거=`docs/fdd-sprint8-v1.3.1.md` + Strapi field selection 계약 · 고민=잠금 판정과 본문 원본 호출 사이를 public helper 없이 하나의 모듈 경계로 닫고, 정적 게이트와 회귀 테스트를 함께 뒀다.

### 한 줄 결론

중대 1·2와 경미 1은 본문 fetch 비공개화, production 전체 Strapi import 금지, sitemap 최소 field projection, URL 문맥 한정 미디어 변환으로 닫았다. 폐기된 matching/study-week 생성물·route·sidebar도 제거했으며 기존 SPRINT8 화면 레이아웃과 플로우는 바꾸지 않았다.

### 항목별 처리 결과

| 리뷰 항목 | 판정 | 어떻게 닫았는가 / 근거 |
|---|---|---|
| 1. 본문 원본 함수 public export로 게이트 우회 | 수용·수정 | `fetchArticleBodyByDocumentId` 구현을 `article-access.ts`의 non-exported 함수로 이동하고 `article-body.ts`를 삭제했다. FREE/UNLOCKED 결과만 판정 시점 documentId를 캡처한 무인자 closure를 받는다. ESLint zone은 `article-access.ts` 외 모든 production 모듈에서 `src/api/strapi/**` import를 금지하고, Node 구조 테스트가 우회 import와 public body module 재생성을 검사한다. |
| 2. sitemap이 `populate=*`로 본문까지 조회 | 수용·수정 | sitemap 전용 catalog가 `fields[0]=slug`, `fields[1]=updatedAt`, sort/pagination만 전송한다. `populate`가 없음을 단위 테스트로 확인했다. |
| 5. matching/study controller prod 제거가 운영 계약 파괴 | 리뷰어 지적 틀림·잔재만 정리 | 회장 확인상 matching과 `/api/v1/study/week`는 폐기 레거시이며 production runtime 프론트 import 0건이다. 백엔드 profile 방침은 건드리지 않았다. 프론트 자동생성 API 3종과 전용 model/docs export, dead local type, `/admin/matching` legacy route, 관리자 sidebar 항목만 제거했다. 삭제 전 StudySpace 생성물의 모든 endpoint가 `/api/v1/study/week*`인지 직접 대조했다. |
| 경미. `/uploads/` 포함 모든 문자열 재귀 변환 | 수용·수정 | cover/avatar와 알려진 media block의 URL field만 구조 변환한다. rich-text는 Markdown image와 HTML media attribute만 바꾸며 일반 문장, inline code, fenced code, unknown block은 보존한다. |

### 기존 구현 확인과 보존

- 인사이트 허브·섬 상세·화두 목록·화두 상세의 승인 프로토타입 레이아웃, 데이터축, 접근 플로우, 401 익명 강등, 바다/섬/화두 인터랙션은 변경하지 않았다.
- article access 응답 envelope와 FREE/UNLOCKED/LOCKED union, unlock 비용·budget·freeAlternative 전달을 보존했다.
- 기존 Strapi category/article 공개 catalog는 `article-access.ts` 경계 안에서 재사용했다.
- 사용자 소유 동시 변경인 `e2e/insights/sprint8.spec.ts`, `scripts/test/sprint8-visual-capture.mjs`는 수정·stage·commit하지 않았다.
- `docs/구현현황.md`는 작업 트리에 없었다. 기존 코드·git handoff·exit report를 기준으로 확장했으며 정본 부재를 회수 항목으로 남긴다.

### 추가·변경한 것

- 본문 private closure와 sitemap projection catalog.
- production Strapi import ESLint zone·구조 테스트 2건·access 단위 테스트 보강.
- URL 문맥 기반 media transformer와 일반 텍스트/코드 보존 테스트.
- 폐기된 matching/study-week generated API·models·docs와 admin 진입 잔재 제거.

### 프로토타입 대조 diff

- 승인 SPRINT8 화면의 레이아웃·컴포넌트·문구·flow 변경: **0건**. 이번 변경은 서버 데이터 접근 경계와 폐기된 관리자 메뉴 제거뿐이다.
- 렌더 결과: 브라우저 open 금지 지시로 새 스크린샷을 찍지 않았다. 이전 13:37 보고의 데스크톱 구버전 8장·모바일 0장 상태는 그대로이며 시각 일치는 **미검증**이다.
- 미디어 출력은 URL 변환 범위가 축소됐으므로, 실제 Strapi article에서 image/video/attachment 렌더와 code sample 보존을 QA 브라우저에서 재검증해야 한다.

### 변경량과 커밋

- 구현/테스트/레거시 생성물: 72개 파일, +388/-5,182줄.
- `b580443d` — 본문 게이트·sitemap·media 변환·구조 테스트.
- `c9c0293c` — 폐기 matching/study-week generated client·route·sidebar 제거.
- 이 exit report와 루트 `docs/api-contract.md` 갱신은 위 수치 밖의 문서 변경이다.

### 검증 결과

| 등급 | 검증 | 결과 |
|---|---|---|
| 테스트됨 | Vitest `article-access.test.ts` + `media-url.test.ts` | 2 files, 7/7 성공 |
| 테스트됨 | Node architecture test | 2/2 성공 |
| 테스트됨 | 대상 ESLint | 오류 0, 기존 규칙 warning 12 |
| 근거 확인 | `yarn typecheck` | exit 0 |
| 근거 확인 | 레거시 symbol/import·게이트 밖 Strapi import 전수 검색 | 잔존 0건 |
| 근거 확인 | `NEXT_PRIVATE_BUILD_WORKER=1 ... next build --webpack` | exit 0; compile 5.1분, TypeScript 4.5분, static 34/34 |
| 미검증 | browser E2E·프로토타입 screenshot | 브라우저 open 금지, 실행 0회 |

### 빌드·gate·다음 QA

- backend: access 워크트리에서 별도 검증.
- web: 첫 build는 compile 성공 후 내장 TypeScript 단계가 10분 이상 무응답이라 중단했다. 단일 build worker 재시도는 exit 0(compile 5.1분, TypeScript 4.5분, static 34/34)으로 통과했다. sitemap fixture `127.0.0.1:3212` 접속은 sandbox `EPERM`으로 실패했으나 기존 fail-soft 경로로 build는 종료됐다.
- mobile: 두 작업 트리에 Expo 앱이 없어 대상 없음·미실행.
- 미통과 gate: build 승인 대기, QA 미승인, ship 미승인.
- 다음 QA 명령: `yarn vitest run src/api/product/article-access.test.ts src/api/strapi/api/media-url.test.ts && node --test scripts/test/sprint8-architecture.test.mjs`; dev 통합 후 `PLAYWRIGHT_TEST_BASE_URL=<dev URL> yarn playwright test e2e/insights/sprint8.spec.ts --project=chromium`과 prototype/build 16장 대조를 실행한다.

### 레드팀·셀프심문

- 레드팀: static import 금지만 막으면 동적 import나 새 alias가 우회로가 될 수 있다. ESLint path zone을 production 전체에 적용하고 public body module 존재 자체를 구조 테스트에서 금지했지만, 새 resolver alias 추가 시 테스트도 함께 갱신해야 한다.
- 이 결론이 틀렸다면 가장 그럴듯한 이유: Strapi unknown component 안의 실제 media URL이 더 이상 변환되지 않는 경우다. 임의 재귀변환은 코드 샘플을 깨뜨리므로 되돌리지 않았고, 새 component는 schema/type과 URL field를 명시해 converter에 추가하는 것이 안전하다.

⛔ 회수 필요: `docs/구현현황.md` 정본이 없으며, 브라우저 금지로 변경 후 실제 media render와 프로토타입 시각 정합은 미검증이다.

SOURCES: `docs/fdd-sprint8-v1.3.1.md` · `docs/api-contract.md` S8-6 · Strapi REST field selection https://docs.strapi.io/cms/api/rest/populate-select · `/Users/sj/.claude/standards/dev.md` · `/Users/sj/.claude/standards/benchmarks.md`

MODEL: gpt-codex/gpt-5.6-sol

SKILLS_USED: 없음 / SKILLS_SKIPPED: 없음(매칭 스킬 없음)

RUBRIC_SCORE: correctness=5/5 evidence=5/5 regression=5/5 verification=4/5 clarity=5/5 total=24/25

WEAKEST_LINE: 브라우저 금지 때문에 실제 media render와 새 prototype screenshot을 직접 관찰하지 못했다.

## 2026-08-06 13:37 KST 재실행 결과

> STAMP: 2026-08-06 13:37 KST · model=gpt-5.6-sol · agent=code-builder · skills=없음(매칭 스킬 없음) · 근거=https://playwright.dev/docs/screenshots · https://chromedevtools.github.io/devtools-protocol/tot/Emulation/ · 고민=빌드 성공을 시각 정합으로 오인하지 않고, 브라우저가 실제로 뜨지 않은 범위는 미검증으로 남겼다.

### 한 줄 결론

프로토타입 데이터 정합과 웹 프로덕션 빌드는 통과했지만, 현재 Codex 샌드박스가 로컬 포트 bind와 Chromium Mach rendezvous를 차단해 **최종 16장·좌우 비교 HTML·육안 일치는 미검증**이다. 구버전 8장을 새 증거처럼 재사용하지 않았다.

### 이번 추가 변경

- 커밋 `b1d6f840`: 배포·운영 fixture를 승인 프로토타입과 같은 **8편·제목·설명**으로 정렬했다. 이전 보고의 `6편 중 5편`은 정합이 아니라 잔존 차이였으며, 현재 기대값은 `8편 중 5편`이다.
- `.env.local`의 `STRAPI_API_TOKEN=fixture-token`과 Strapi fixture의 허용 토큰을 일치시켰다.
- 첫 편 제목을 지도 fixture·Strapi fixture·Playwright 수용기준에서 하나로 맞췄다.
- 기존 바다/섬/화두/접근 경계와 제품 API 계약은 변경하지 않았다.

### 직접 관찰 증거

- **테스트됨:** `node --check`(fixture 2개·캡처 스크립트) 통과.
- **테스트됨:** 대상 ESLint 통과. `sprint8-routes-render.test.ts` **5/5 PASS**.
- **테스트됨:** `NEXT_FONT_GOOGLE_MOCKED_RESPONSES=/tmp/sprint8-next-font-mock.cjs yarn next build --webpack` exit 0. 컴파일 117초, TypeScript 106초, 정적 페이지 34/34. 외부 Corinthia 다운로드만 검증용 로컬 폰트로 치환했다. sitemap의 fixture 접속은 sandbox `EPERM`으로 실패했으나 빌드 자체는 exit 0이다.
- **관찰됨:** fixture API `127.0.0.1:3211`, Strapi fixture `127.0.0.1:3212`, Next `127.0.0.1:3210`이 모두 `listen EPERM`으로 기동 실패. 프로토타입 서버 `127.0.0.1:3213`만 컨트롤러가 띄운 기존 프로세스로 살아 있다.
- **관찰됨:** `node scripts/test/sprint8-visual-capture.mjs`를 실제 실행했으나 Chromium이 `MachPortRendezvousServer ... Permission denied (1100)`에서 종료했다. 따라서 파일 생성 0개다.
- **관찰됨:** `test-results/sprint8-visual/`은 여전히 2026-08-06 03:36 KST 데스크톱 8장뿐이고 모바일은 0장이다.

### 최종 16장 경로와 현재 상태

| 화면 | 뷰포트 | 프로토타입 | 구현 | 상태 |
|---|---|---|---|---|
| 허브 | 데스크톱 | `test-results/sprint8-visual/hub-prototype-desktop-1440.png` | `test-results/sprint8-visual/hub-implementation-desktop-1440.png` | 둘 다 03:36 구버전, 증거 사용 금지 |
| 허브 | 모바일 | `test-results/sprint8-visual/hub-prototype-mobile-390.png` | `test-results/sprint8-visual/hub-implementation-mobile-390.png` | 미생성 |
| 섬 상세 | 데스크톱 | `test-results/sprint8-visual/island-prototype-desktop-1440.png` | `test-results/sprint8-visual/island-implementation-desktop-1440.png` | 둘 다 03:36 구버전, 증거 사용 금지 |
| 섬 상세 | 모바일 | `test-results/sprint8-visual/island-prototype-mobile-390.png` | `test-results/sprint8-visual/island-implementation-mobile-390.png` | 미생성 |
| 화두 목록 | 데스크톱 | `test-results/sprint8-visual/koan-list-prototype-desktop-1440.png` | `test-results/sprint8-visual/koan-list-implementation-desktop-1440.png` | 둘 다 03:36 구버전, 증거 사용 금지 |
| 화두 목록 | 모바일 | `test-results/sprint8-visual/koan-list-prototype-mobile-390.png` | `test-results/sprint8-visual/koan-list-implementation-mobile-390.png` | 미생성 |
| 화두 상세 | 데스크톱 | `test-results/sprint8-visual/koan-detail-prototype-desktop-1440.png` | `test-results/sprint8-visual/koan-detail-implementation-desktop-1440.png` | 둘 다 03:36 구버전, 증거 사용 금지 |
| 화두 상세 | 모바일 | `test-results/sprint8-visual/koan-detail-prototype-mobile-390.png` | `test-results/sprint8-visual/koan-detail-implementation-mobile-390.png` | 미생성 |

`test-results/sprint8-visual/index.html`은 새 16장이 없으므로 만들지 않았다. 구버전만 묶은 비교판은 회장에게 잘못된 완료 증거가 된다.

### 화면별 남은 차이

| 화면 | 정적 대조에서 닫은 것 | 남은 차이 / 미검증 |
|---|---|---|
| 허브 | 섬 라벨 좌우 배치, `두곳 개척 →`, `8편 중 5편` 데이터 정렬 | 새 데스크톱·390 렌더가 없어 실제 위치·겹침은 미검증 |
| 섬 상세 | 승인 프로토타입과 같은 8편 제목·설명·READ/NEXT/LOCKED 순서 | 새 데스크톱·390 렌더가 없어 카드 높이·줄바꿈·하단 건널목은 미검증 |
| 화두 목록 | 히어로·분야 축·지난 화두·우측 레일 구현 존재 확인 | 메일 구독은 API 계약 부재로 비활성, 분야별 개념글 수는 집계 계약 부재. 시각은 미검증 |
| 화두 상세 | 사람 검토 칩·답 제목·도움 반응·연관 물음·분야 연결·모바일 참여 바 구현 존재 확인 | 새 데스크톱·390 렌더가 없어 우측 레일·모바일 고정 바·본문 줄바꿈은 미검증 |

### 유지한 기존 기능 / 추가·변경한 것

- **유지:** 바다/섬 팝오버/지난 화두, 섬 물때·잠금·공부방, 화두 필터·정정·운영 의견·Q&A·반응·개념글 연결, 비회원 첫 편 전체 공개와 글 끝 로그인 유도.
- **추가·변경:** 테스트 fixture의 8편 데이터, Strapi fixture 토큰, 첫 편 제목 수용기준만 정렬. 제품 런타임 소스는 이번 재실행에서 변경하지 않았다.

### 빌드·게이트·다음 QA

- backend: 이번 프론트 시각 정합 범위 밖, 미실행.
- web: 프로덕션 Webpack 빌드 exit 0. 실제 Next 서버·브라우저 E2E는 sandbox 차단으로 미검증.
- mobile: 대상 없음, 미실행.
- 수정 파일: 3개 fixture/E2E + 이 exit report 1개.
- 미통과 gate: build 종료 판정 보류, qa·ship 미승인.
- 다음 QA 명령: 포트 bind와 Chromium이 허용된 컨트롤러 환경에서 fixture API 3211 + Strapi 3212 + prototype 3213 + Next 3210 기동 후 `node scripts/test/sprint8-visual-capture.mjs`, 이어 `PLAYWRIGHT_TEST_BASE_URL=http://127.0.0.1:3210 yarn playwright test e2e/insights/sprint8.spec.ts --project=chromium`.

### 레드팀·셀프심문

- 레드팀: “빌드가 통과했으니 비교 HTML만 만들어 출고하면 되지 않나?” → 반대한다. 빌드는 레이아웃·390px 줄바꿈·겹침을 증명하지 못하고, 구버전 이미지를 묶으면 오히려 시각 회귀를 숨긴다.
- 이 결론이 틀렸다면 가장 그럴듯한 이유: 샌드박스 밖 브라우저에서는 이미 일치할 수 있다. 그러나 그 가능성은 관찰 증거가 아니므로 `육안 일치`로 승격하지 않았다.

SOURCES: `DESIGN.md` v1.9.0 · `docs/WIREFRAMES/sprint8-koan-screens-v5.0.0.md` · `docs/prototype/sprint8-koan/sprint8-app-v9-opus5.html` · `sprint8-integration-F-sea-stage-v9-opus5.html` · `sprint8-koan-list-v2-opus5.html` · `sprint8-koan-detail-v3-opus5.html` · Playwright Screenshots https://playwright.dev/docs/screenshots · CDP Emulation https://chromedevtools.github.io/devtools-protocol/tot/Emulation/

MODEL: gpt-5.6-sol

SKILLS_USED: 없음

SKILLS_SKIPPED: 없음(매칭 스킬 없음)
