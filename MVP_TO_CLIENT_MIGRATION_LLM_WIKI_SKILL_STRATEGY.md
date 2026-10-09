# study-platform 단일 레포 전환 · LLM wiki · skill 개선 전략

작성일: 2026-05-27  
작성 위치: `study-platform-client` root  
대상 레포: `study-platform-client`, `study-platform-mvp`

## 0. 결론

1. **단일 레포의 기준점은 `study-platform-client`로 둔다.**  
   현재 `study-platform-client`는 Next.js frontend, Storybook, Playwright, release record, `StudyVault`, frontend AI skill surface를 이미 갖고 있다. 여기에 backend를 `apps/backend` 또는 `backend`로 단계적으로 흡수한다.
2. **첫 목표는 “코드 이동”이 아니라 “운영 가능한 monorepo 경계”다.**  
   backend repo를 즉시 삭제하지 말고, contract·CI·배포·release record가 통합된 뒤 archived/read-only 전환한다.
3. **Notion 데이터는 LLM이 읽는 Markdown wiki로 정규화한다.**  
   Notion 원본을 그대로 신뢰하지 말고, `source → normalize → chunk → index → review → publish` 파이프라인을 둔다.
4. **모노레포의 상시 기준 브랜치는 `main` / `develop` 두 개만 둔다.**  
   `main`은 production, `develop`은 QA/staging/test-server 기준이다. 기존 `study-platform-mvp`의 `dev`와 `study-platform-client`의 `develop`을 계속 병행하면 “frontend는 `develop`에서 통과, backend는 `dev`에서 통과했지만 두 조합이 같은 시점인지 모르는” 문제가 남는다. 모노레포 전환의 핵심은 이 상태 불일치를 제거하는 것이다.
5. **skill은 두 레포 지식을 합치는 것이 아니라 SSOT를 분리해 얇게 연결한다.**  
   세부 지식은 `skills_context/SHARED/`에 두고, `.codex/skills` / `.claude/skills`는 그 문서를 lazy-load하는 wrapper로 유지한다.

## 1. 현재 상태 요약

### 1.1 `study-platform-client`

- Stack: Next.js 15, React 19, TypeScript 5, Tailwind CSS 4, Yarn 1.x.
- 주요 검증 명령: `yarn lint:fix`, `yarn prettier:fix`, `yarn typecheck`.
- API 경계:
  - legacy axios: `src/api/client`, `src/api/endpoints/*`
  - generated OpenAPI: `src/api/openapi/`는 수정 금지
  - feature API: `src/features/*/api`, `src/hooks/queries/*`
- 지식/문서 surface:
  - `StudyVault/`
  - `docs/`
  - `skills_context/SHARED/zeroone-version-management.md`
  - `.codex/skills/*`, `.claude/skills/*`
- 현재 특징: frontend 중심이지만 release record와 AI skill surface가 이미 발달했다.

### 1.2 `study-platform-mvp`

- Stack: Spring Boot 3.4.0, Java 21, Gradle Kotlin DSL, Flyway 10.20.1.
- 주요 검증 명령: `./gradlew compileJava`, `./gradlew test`, `./gradlew bootJar`, 필요 시 `dev.local` boot.
- 주요 backend domain:
  - `domain/course`, `domain/member`, `domain/payment`, `domain/notification`, `domain/groupstudy`, `growth/*`, `global/*`
- 지식/문서 surface:
  - `docs/product-ssot/`
  - `docs/FRD`, `docs/PRD`, `docs/operations`, `docs/local-development`
  - `skills_context/SHARED/*`
  - `skills_context/SHARED/prd-to-frd-v2/*`
  - `.codex/skills/SHARED/*`, `.claude/skills/SHARED/*`
- 현재 특징: backend 운영·검증·plan-to-develop·product SSOT가 발달했다.

## 2. 목표 아키텍처

### 2.1 권장 repository layout

기준은 새 `packages/*`를 먼저 만드는 것이 아니라, 현재 두 레포에 이미 있는 구조를 이어받는 것이다. `study-platform-mvp`의 `docs/product-ssot/`는 현재 도메인별 제품 요구사항과 요구사항-테스트 추적성 원장으로 정의되어 있으며, 도메인 내부 기본형은 `requirements.yaml`과 `decisions/ADR-*.md`다. 따라서 frontend/backend 구현 문서를 모두 `product-ssot`에 넣지 않는다.

```text
study-platform-client/
  src/                           # 기존 Next.js app 유지
  backend/                       # study-platform-mvp Spring Boot app 이관
  docs/
    product-ssot/                # 제품 요구사항/결정/traceability canonical SSOT
      README.md
      _shared/
        traceability-rules.md
        testing-layer-policy.md
        notion-source-registry.yaml
        llm-knowledge-index.md
      auth/
        README.md
        requirements.yaml
        glossary.md
        flows/
          login.md
          logout.md
          token-refresh.md
        policies/
          token-policy.md
          authorization-policy.md
        decisions/
          ADR-*.md
        traceability.md
      class/
      course/
      payment/
      notification/
    frontend/                    # frontend 구현/UX/API 사용 문서
      openapi-usage.md
      auth-proposition/
      ui-patterns/
    backend/                     # backend 구현/API/DB/Flyway/local 문서
      local-development/
      api-contracts/
      flyway/
    operations/                  # 배포/릴리즈/마이그레이션 runbook
      mvp-to-client-monorepo.md
      version-management.md
      release-record-shared-contract.md
  scripts/
    product-ssot/                # traceability/index/report 도구
    docs/                        # 문서 normalize/migration 도구
  skills_context/
    SHARED/
      study-platform-fullstack-context.md
      study-platform-contract-verification.md
      study-platform-llm-wiki.md
      study-platform-skill-governance.md
  releases/                      # frontend/backend/release-record 통합
```

`packages/api-contract`, `packages/test-contract`, `packages/llm-wiki-tools`는 1차 구조가 아니다. 자동화가 충분히 커지고 재사용 가능한 코드 패키지가 필요해질 때만 승격한다. 현재 단계에서는 `docs/product-ssot/`, `docs/frontend/`, `docs/backend/`, `scripts/product-ssot/`가 더 자연스럽다.

### 2.2 1차 현실적 layout

한 번에 `src/`를 `apps/web`로 옮기거나 `packages/*`를 새로 만들면 현재 Next.js, Storybook, backend product SSOT 구조가 동시에 흔들린다. 따라서 1차는 다음처럼 둔다.

```text
study-platform-client/
  src/                           # 기존 frontend 유지
  backend/                       # mvp repo를 subtree 또는 history-preserving copy로 이관
  docs/
    product-ssot/                # mvp의 현재 구조를 이관: requirements.yaml + decisions/
      _shared/
      auth/
      class/
      course/
      payment/
      notification/
    frontend/                    # 기존 client docs 중 frontend 구현 문서
    backend/                     # 기존 mvp docs 중 backend 구현/local/API/DB 문서
    operations/
      mvp-to-client-monorepo.md
  scripts/
    product-ssot/                # 필요할 때만 traceability/index 스크립트 추가
```

2차 안정화 후에만 `src → apps/web/src` 이동과 `packages/*` 승격을 검토한다.

### 2.3 문서 분류 원칙

`docs/product-ssot`와 `docs/frontend`/`docs/backend`는 역할이 다르다.

| 위치 | 넣는 문서 | 넣지 않는 문서 |
|---|---|---|
| `docs/product-ssot/{domain}/requirements.yaml` | 제품 요구사항, 상태, 우선순위, owner, trace tag | React hook 사용법, Spring service 구현 상세 |
| `docs/product-ssot/{domain}/decisions/ADR-*.md` | 제품 정책 결정, 요구사항 충돌 결정, 테스트 전략 결정 | 단순 컴포넌트 리팩토링 기록 |
| `docs/frontend/` | frontend API 사용법, UI/UX 패턴, auth client session, Storybook/Playwright 사용법 | backend DB/Flyway/runbook |
| `docs/backend/` | backend API 구현, DB/Flyway, local backend run, Swagger/OpenAPI export, controller/service 정책 | frontend 컴포넌트 배치/상태관리 |
| `docs/operations/` | release, deploy, rollback, migration, incident runbook | 도메인 요구사항 원장 |

즉, product SSOT는 “프론트 문서 저장소”도 “백엔드 문서 저장소”도 아니다. 제품 도메인의 진짜 기준만 둔다. 프론트가 그 요구사항을 어떻게 소비하는지, 백엔드가 어떻게 구현하는지는 각각 `docs/frontend/`, `docs/backend/`에 둔다.

### 2.4 Product SSOT 도메인 내부 표준

`requirements.yaml + decisions/`만으로는 도메인 지식이 커졌을 때 흐름, 정책, 용어, 추적성이 한 파일에 섞인다. 그래서 각 domain은 다음 표준 구조를 기본으로 둔다. 단, 처음부터 빈 폴더를 대량 생성하지 말고 해당 내용이 생길 때 파일을 추가한다.

```text
docs/product-ssot/{domain}/
  README.md                      # 도메인 목적, 소유 범위, 관련 frontend/backend 문서 링크
  requirements.yaml              # REQ-* 요구사항 원장
  glossary.md                    # 도메인 용어, 상태값, role, enum 의미
  flows/                         # 사용자/시스템 흐름. Mermaid 가능
    *.md
  policies/                      # 제품 정책. 구현 detail보다 정책/규칙 중심
    *.md
  decisions/                     # 정책 충돌/요구사항 변경 결정 ADR
    ADR-*.md
  traceability.md                # REQ-* ↔ acceptance/api/e2e/manual evidence 연결 요약
```

`auth` 도메인 예시는 다음처럼 둔다.

```text
docs/product-ssot/auth/
  README.md
  requirements.yaml
  glossary.md
  flows/
    social-login.md
    logout.md
    token-refresh.md
    guest-signup.md
  policies/
    token-policy.md
    cookie-policy.md
    authorization-policy.md
    redirect-policy.md
  decisions/
    ADR-0001-requirements-yaml-cucumber-karate.md
  traceability.md
```

분류 기준:

- `requirements.yaml`: 요구사항 ID, 상태, 우선순위, owner, 설명. “무엇이 참이어야 하는가”.
- `flows/`: login, payment, lesson import처럼 단계가 있는 end-to-end 흐름.
- `policies/`: token 만료, redirect 허용 범위, 무료/유료 접근, refund rule처럼 규칙 자체.
- `decisions/`: 대안 중 무엇을 선택했는지와 왜 선택했는지.
- `traceability.md`: `REQ-*`가 어떤 Cucumber/Karate/Playwright/manual 검증과 연결되는지 사람이 빠르게 보는 index.
- frontend 구현 detail은 `docs/frontend/`, backend 구현 detail은 `docs/backend/`로 보낸 뒤 product-ssot에서는 링크만 건다.

## 3. 마이그레이션 전략

### Phase 0. Freeze & inventory

목표: 실제 차이와 소유권을 확정한다.

- 양쪽 repo의 현재 base branch를 inventory하되, 통합 후 상시 브랜치 정책은 먼저 확정한다.
  - 현재 client 기준: `develop`
  - 현재 backend 기준: `dev`
  - 통합 monorepo 기준: `develop` 하나로 수렴
- 미병합 PR, release branch, hotfix branch 목록화
- env 파일 목록화. 새 worktree나 통합 workspace에는 `.env*`를 복사하되 값은 문서화하지 않는다.
- CI/배포 흐름 inventory
  - client: lint/typecheck/build/storybook/security/release record
  - backend: compile/test/Flyway/dev.local boot/Jenkins/prod workflow
- API contract inventory
  - backend Swagger: `/v3/api-docs`
  - frontend generated client: `src/api/openapi/`
  - custom axios endpoints: `src/api/endpoints`, `src/hooks/queries`, `src/features/*/api`

완료 조건:

- `docs/operations/mvp-to-client-monorepo.md`에 repo/branch/CI/deploy inventory 기록
- domain별 frontend 사용 API ↔ backend controller 매핑표는 `docs/product-ssot/_reports/`에 생성하고, 확정 요구사항과 관련된 항목만 `REQ-*`로 연결
- 기존 `client:develop` / `backend:dev` 차이가 어떤 PR·배포·CI에 남아 있는지 문서에 남아 있음
- 통합 후 상시 브랜치는 `main` / `develop`만 사용한다는 결정이 문서에 명시됨

### Phase 1. Monorepo shell 먼저 만들기

목표: 코드 복사 전 운영 경계부터 합의한다.

권장 작업:

1. `study-platform-client`에 `backend/` 디렉터리 생성.
2. backend repo를 `git subtree`, `git filter-repo`, 또는 history-preserving merge 중 하나로 이관.
3. 루트에 backend 빌드 wrapper 추가 여부 결정.
4. root 문서에 frontend/backend 검증 명령을 병렬로 기록.
5. `.gitignore`, `.dockerignore`, CI path filter 정리.

권장 선택:

- history가 중요하면 `git filter-repo`로 backend history를 `backend/` prefix로 재작성 후 merge.
- 빠른 통합이 중요하면 `git subtree add --prefix=backend <backend-remote> dev`.
- 단순 copy는 마지막 선택이다. blame/history 손실 때문에 장애 분석 비용이 커진다.

완료 조건:

- `backend/`에서 `./gradlew compileJava` 가능
- root에서 frontend 기존 검증 가능
- 기존 backend repo는 아직 read-only 전환하지 않음

### Phase 2. Contract bridge 통합

목표: frontend/backend가 같은 repo 안에서 contract를 검증한다.

작업:

- backend OpenAPI export 명령 표준화: `docs/backend/api-contracts/`
- frontend OpenAPI generate/usage 정책 표준화: `docs/frontend/openapi-usage.md`
- domain별 제품 요구사항과 연결되는 API는 `docs/product-ssot/{domain}/requirements.yaml`의 `REQ-*`와 연결
- FE 사용 endpoint ↔ BE controller 매핑 리포트는 generated report로 `docs/product-ssot/_reports/`에 생성
- `src/api/openapi/` 직접 수정 금지 규칙 유지
- CI에 다음 순서 추가

```text
backend compile → backend OpenAPI export → frontend generated client diff check → frontend typecheck
```

추가로 contract drift 리포트를 만든다.

```text
docs/product-ssot/_reports/
  openapi-diff.md
  frontend-usage-map.md
  missing-endpoints.md
```

완료 조건:

- backend DTO field/enum/path 변경이 frontend typecheck 또는 contract diff에서 잡힘
- custom axios endpoint는 generated OpenAPI와 차이를 `docs/frontend/openapi-usage.md` 또는 `docs/backend/api-contracts/`에 명시하고, 제품 요구사항과 관련된 경우만 `REQ-*`로 연결

### Phase 3. Branch / CI / CD 통합

목표: `main` / `develop` 두 상시 브랜치만 기준으로 삼고, 변경 범위별 빠른 검증과 production gate를 같이 둔다.

#### 3.1 상시 브랜치 정책

모노레포 전환 후 상시 유지 브랜치는 두 개만 둔다.

```text
main        # production
develop     # QA / staging / test server
```

작업 브랜치는 임시 브랜치로만 둔다.

```text
feature/*   # 기능 작업
fix/*       # 일반 버그 수정
hotfix/*    # production 긴급 수정
release/*   # 필요할 때만 임시 release hardening
```

기존 repo branch는 다음처럼 매핑하고, 통합 완료 후 `backend dev`는 기준 브랜치에서 제거한다.

```text
old study-platform-client develop  → new monorepo develop
old study-platform-mvp dev         → new monorepo develop
old production main                → new monorepo main
```

이 결정을 먼저 못 박는 이유는 다음과 같다.

- API contract 깨짐을 한 CI에서 잡아야 한다.
- frontend/backend 배포 기록을 하나로 남겨야 한다.
- “frontend는 `develop`, backend는 `dev`” 같은 기준 불일치를 없애야 한다.
- `frontend develop` 기준으로는 통과하고 `backend dev` 기준으로도 통과했지만, 둘이 같은 시점의 조합인지 모르는 상태를 제거해야 한다.

따라서 monorepo에서는 frontend-only 변경, backend-only 변경, full-stack 변경 모두 PR target을 `develop`으로 통일한다.

```text
feature/some-change
  → PR to develop
  → 통합 CI
  → develop 배포/QA
  → release PR to main
```

#### 3.2 CI matrix

권장 CI matrix:

| 변경 경로 | 필수 검증 |
|---|---|
| `src/**`, frontend config | `yarn lint:fix` 또는 check, `yarn prettier`, `yarn typecheck`, build |
| `backend/**` | `./gradlew compileJava`, focused test, Flyway compatibility check |
| API contract | backend OpenAPI export, frontend client generation, typecheck |
| docs/skills only | `git diff --check`, markdown/link/contract validator |
| prod/main merge | release label, release record, rollback note, deploy health check |

원칙:

- `develop`/`dev` 이중 branch는 “전환 중 매핑 대상”일 뿐, 통합 후 운영 모델이 아니다.
- `develop`은 frontend/backend의 유일한 QA/staging/test-server 기준 브랜치다.
- `main`은 production 기준 브랜치다.
- production merge 전 release intent label은 hard gate로 둔다.

완료 조건:

- `main` / `develop` 외 상시 기준 브랜치가 남지 않음
- frontend-only, backend-only, full-stack PR이 모두 `develop` 기준 통합 CI를 통과함
- 기존 client release record와 backend release metadata가 하나의 release record schema로 합쳐짐
- backend-only deploy도 통합 release record에 남는 현재 운영 요구를 보존

### Phase 4. Runtime/dev experience 통합

목표: 한 명령으로 frontend/backend local dev를 띄울 수 있게 한다.

권장 scripts:

```jsonc
{
  "scripts": {
    "dev:web": "next dev --turbopack",
    "dev:backend": "cd backend && ./gradlew bootRun",
    "dev:all": "concurrently \"yarn dev:web\" \"yarn dev:backend\"",
    "verify:web": "yarn lint:fix && yarn prettier:fix && yarn typecheck",
    "verify:backend": "cd backend && ./gradlew compileJava",
    "verify:contract": "node scripts/product-ssot/check-contract.mjs"
  }
}
```

주의:

- backend env 값은 root 문서에 적지 않는다.
- `.env*` 파일명과 필요 여부만 기록한다.
- `dev.local` profile 기준을 유지한다.

완료 조건:

- 신규 개발자가 root README만 보고 frontend/backend local smoke까지 가능
- env 누락 시 어떤 파일이 필요한지 알 수 있음

### Phase 5. Legacy backend repo read-only 전환

전환 조건:

- 마지막 backend prod deploy가 통합 repo에서 성공
- 기존 backend repo의 open PR/issue/branch가 정리됨
- GitHub repo 설명에 archive/read-only 상태와 새 repo 링크가 명시됨
- 기존 CI/Jenkins/webhook이 통합 repo 기준으로 변경됨

금지:

- 통합 repo에서 prod 검증 전 `study-platform-mvp`를 삭제하거나 archive하지 않는다.

## 4. LLM wiki 구축 전략

### 4.1 목표

Notion에 흩어진 스터디 프로젝트 기획/FRD/API/운영 데이터를 LLM이 빠르게 읽고 검색할 수 있는 Markdown wiki로 만든다.

핵심 목표:

- 오래된 Notion 페이지와 최신 문서가 섞이지 않게 한다.
- 중복 페이지를 제거한다.
- 이미지-heavy 문서는 원문 링크와 요약을 분리한다.
- API/DB/상태머신/정책 결정은 사람이 검토 가능한 Markdown으로 남긴다.

### 4.2 저장 위치

권장 canonical location:

```text
study-platform-client/
  docs/product-ssot/
    README.md
    _shared/
      notion-source-registry.yaml
      llm-knowledge-index.md
      traceability-rules.md
      testing-layer-policy.md
    auth/
      README.md
      requirements.yaml
      glossary.md
      flows/
      policies/
      decisions/
        ADR-*.md
      traceability.md
    class/
    course/
    payment/
    notification/
```

`docs/product-ssot/`를 제품 지식의 canonical 위치로 둔다. 현재 MVP의 최소형은 `requirements.yaml + decisions/`였지만, 통합 후에는 `README`, `glossary`, `flows`, `policies`, `traceability`까지 도메인 표준으로 확장한다. 단, LLM wiki라는 이유로 도메인 안에 임의의 구현 문서를 대량 추가하지 않는다. Notion 원본 registry와 LLM용 index는 `_shared/`에 두고, 도메인별로 확정된 내용만 requirements/flow/policy/ADR/traceability로 승격한다. frontend/backend 구현 설명은 `docs/frontend/`, `docs/backend/`에 둔다.

### 4.3 데이터 파이프라인

```text
Notion export or API
  → source registry
  → markdown normalize
  → duplicate detection
  → chunking by domain
  → frontmatter metadata
  → reviewer checklist
  → docs/product-ssot publish
  → index refresh
```

각 page frontmatter 예시:

```yaml
---
title: "Class Payment Policy"
source: "notion"
source_url: "redacted-or-internal"
source_updated_at: "2026-05-27"
domain: "payment"
status: "active"
freshness: "verified"
tags: ["class", "payment", "refund", "api-contract"]
canonical: true
supersedes: []
---
```

### 4.4 Notion sync 운영 원칙

- 대량 ZIP import보다 **작은 단위 chunk update**를 기본으로 한다.
- 사용자가 old/new를 구분하기 어렵기 때문에 near-duplicate는 남기지 않는다.
- page별 상태를 둔다.
  - `draft`: 정리 전
  - `reviewed`: 사람이 확인
  - `active`: 현재 기준
  - `deprecated`: 오래된 문서
- API contract와 DB schema는 domain page에 산문으로만 두지 말고 별도 structured block으로 둔다.
- image-heavy 문서는 이미지 자체보다 “이미지가 말하는 결정/정책”을 텍스트로 추출한다.

### 4.5 LLM wiki 최소 MVP

1주차 MVP 범위:

1. `docs/product-ssot/_shared/notion-source-registry.yaml`
2. `docs/product-ssot/_shared/llm-knowledge-index.md`
3. domain note 5개
   - `auth.md`
   - `course.md`
   - `payment.md`
   - `notification.md`
   - `class.md`
4. `docs/backend/api-contracts/backend-v5.md`와 `docs/frontend/openapi-usage.md` 연결
5. `docs/backend/local-development/README.md`와 연결되는 local-dev note

완료 조건:

- “class payment refund API 어디 있지?” 같은 질문에 `docs/product-ssot` 검색으로 1~2개 page가 바로 잡힘
- Notion 원본 링크, freshness, deprecated 여부가 같이 보임
- 중복 page 후보 목록이 남아 있음

## 5. skill 개선 전략

### 5.1 기본 원칙

- skill 파일에는 긴 지식을 넣지 않는다.
- 긴 지식은 `skills_context/SHARED/*.md`에 둔다.
- Claude/Codex skill은 같은 SHARED 문서를 바라보는 얇은 wrapper로 유지한다.
- PERSONAL 실험은 검증 전 SHARED로 승격하지 않는다.
- frontend/backend 지식을 하나의 거대한 skill에 합치지 않는다. “상황별 skill”로 나눈다.

### 5.2 통합 후 필요한 skill 세트

| skill | 목적 | 읽어야 할 SSOT |
|---|---|---|
| `study-platform-fullstack-context` | repo 구조, frontend/backend 경계, 검증 선택 | `skills_context/SHARED/study-platform-fullstack-context.md` |
| `study-platform-contract-verification` | API contract 변경 시 FE/BE 동시 검증 | `skills_context/SHARED/study-platform-contract-verification.md` |
| `study-platform-backend-verify` | 기존 backend post-change gate 유지 | 기존 backend verify 문서 이관 |
| `study-platform-frontend-verify` | client lint/typecheck/build 기준 유지 | client CLAUDE/rules/version-management |
| `study-platform-llm-wiki` | Notion→product-ssot sync, dedupe, freshness 관리 | `skills_context/SHARED/study-platform-llm-wiki.md` |
| `study-platform-release` | frontend/backend 통합 release record | version-management frontend/backend 문서 통합 |
| `study-platform-plan-to-develop` | PRD/FRD/product SSOT 생성 | `prd-to-frd-v2`와 product-ssot |

### 5.3 기존 skill 정리 방향

`study-platform-client` 쪽:

- `api-query-patterns`, `auth-patterns`, `nextjs-patterns`, `component-patterns`는 frontend-specific로 유지.
- `zeroone-version-management`는 backend release record와 통합될 때까지 유지.
- `zeroone-project-context`가 있다면 새 fullstack context wrapper로 대체하거나 내용을 줄인다.

`study-platform-mvp` 쪽:

- `study-platform-backend-context`, `study-platform-backend-verify`, `local-backend-run`, `local-playwright-e2e`는 그대로 이관 가치가 높다.
- `prd-to-frd-v2`, `plan-to-develop`은 product SSOT와 LLM wiki 생성에 연결한다.
- `deploy-pr-to-dev`, `deploy-pr-to-main`, `zero-one-version-management-backend`는 통합 release skill로 점진 통합한다.

### 5.4 skill 승격 절차

```text
PERSONAL experiment
  → 실제 작업 2회 이상 사용
  → 실패/보완점 기록
  → SHARED context 문서화
  → Claude wrapper + Codex wrapper 동시 추가
  → validator 또는 checklist 추가
  → PR 리뷰 후 승격
```

승격 기준:

- 특정 개인 path에 의존하지 않음
- secret/env 값을 포함하지 않음
- 어떤 상황에서 읽어야 하는지 trigger가 좁음
- 검증 명령 또는 완료 조건이 있음
- frontend/backend 중 어느 쪽 파일을 바꿀 수 있는지 명확함

## 6. 실행 순서 제안

### Sprint 1: 문서·inventory

- `docs/operations/mvp-to-client-monorepo.md`
- `docs/frontend/README.md` / `docs/backend/README.md`
- `docs/product-ssot/_shared/notion-source-registry.yaml`
- `docs/product-ssot/_shared/llm-knowledge-index.md`
- `skills_context/SHARED/study-platform-fullstack-context.md` 초안

### Sprint 2: backend 이관 dry-run

- 별도 branch/worktree에서 backend를 `backend/`로 이관
- Gradle compile 확인
- frontend 기존 검증 확인
- CI path filter draft
- release record schema 충돌 확인

### Sprint 3: contract bridge

- backend OpenAPI export 자동화
- frontend OpenAPI generate/diff check 자동화
- custom axios endpoint inventory
- `docs/backend/api-contracts/`와 `docs/frontend/openapi-usage.md` 정리

### Sprint 4: LLM wiki MVP

- `docs/product-ssot/_shared/notion-source-registry.yaml` 작성
- domain별 5개 LLM-readable note 작성
- duplicate/deprecated 후보 표시
- `docs/product-ssot/_shared/llm-knowledge-index.md` refresh

### Sprint 5: skill 통합

- fullstack context skill 추가
- contract verification skill 추가
- LLM wiki skill 추가
- frontend/backend release skill 통합안 작성

## 7. 리스크와 대응

| 리스크 | 영향 | 대응 |
|---|---|---|
| backend history 손실 | 장애 분석 어려움 | subtree/filter-repo로 history 보존 |
| branch 기준 혼선 (`develop` vs `dev`) | API contract/배포 조합이 같은 시점인지 알 수 없음 | 통합 후 상시 브랜치는 `main`/`develop`만 허용하고, 기존 backend `dev`는 `develop`으로 매핑 후 폐기 |
| OpenAPI generated 파일 직접 수정 | 재생성 시 유실 | generated directory 수정 금지 유지, diff check 추가 |
| Notion 중복/구버전 혼재 | LLM 답변 오염 | source registry, canonical flag, deprecated 상태 사용 |
| skill 지식 중복 | Claude/Codex drift | SHARED context SSOT + 얇은 wrapper 원칙 |
| env/secret 문서 유출 | 보안 사고 | 파일명만 기록, 값 금지 |
| 한번에 `apps/web` 이동 | frontend 대규모 breakage | 1차는 `src/` 유지, backend만 흡수 |

## 8. 바로 다음 액션

1. `study-platform-client`에 `docs/product-ssot/`를 이관/확장하고, migration runbook은 `docs/operations/mvp-to-client-monorepo.md`로 둔다.
2. 양쪽 repo의 branch/PR/CI/deploy inventory를 채우고, 통합 후 상시 브랜치가 `main`/`develop`뿐임을 migration gate로 둔다.
3. backend 이관 방식을 선택한다.
   - 추천: history 보존이 필요하면 `git filter-repo`, 빠른 검증이면 `git subtree`.
4. `docs/product-ssot/_shared/notion-source-registry.yaml`를 먼저 만든다. 확정 내용만 domain `requirements.yaml`/`decisions`로 승격하고 구현 문서는 `docs/frontend`/`docs/backend`에 둔다.
5. skill은 곧바로 대량 수정하지 말고 `study-platform-fullstack-context` 하나부터 만든다.
