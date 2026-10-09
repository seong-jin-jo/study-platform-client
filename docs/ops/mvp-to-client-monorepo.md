# MVP to client monorepo 전환 Runbook

작성일: 2026-05-27  
기준 레포: `study-platform-client`  
이관 대상: `study-platform-mvp` backend

## 1. 결론

`study-platform-client`를 단일 레포 기준점으로 두고, `study-platform-mvp` backend는 단계적으로 `backend/` 아래로 이관한다.

이 작업의 1차 목표는 코드 복사가 아니라 다음 운영 경계를 먼저 맞추는 것이다.

- frontend/backend 기준 브랜치 통일
- contract 검증 통합
- CI/CD path와 release record 통합
- Jenkins backend deploy를 GitHub Actions로 단계적 이전
- Product SSOT와 LLM wiki 위치 확정
- backend 원본 레포 read-only 전환 조건 정의

## 2. 최종 브랜치 정책

통합 후 상시 기준 브랜치는 두 개만 둔다.

```text
main     # production
develop  # QA / staging / test server
```

기존 브랜치 매핑은 다음과 같다.

| 기존 위치 | 통합 후 기준 |
| --- | --- |
| `study-platform-client:develop` | `study-platform-client:develop` |
| `study-platform-mvp:dev` | `study-platform-client:develop` |
| production `main` | `study-platform-client:main` |

전환 이후 frontend-only, backend-only, full-stack PR은 모두 `develop`을 기준으로 통합 CI를 통과해야 한다.

## 3. 1차 목표 layout

처음부터 `apps/web`나 `packages/*`로 대규모 재배치하지 않는다. 현재 frontend 구조를 유지하고 backend만 흡수한다.

```text
study-platform-client/
  src/                         # 기존 Next.js frontend 유지
  backend/                     # study-platform-mvp Spring Boot app 이관 위치
  docs/
    product-ssot/              # 제품 요구사항/정책/결정/추적성
    frontend/                  # frontend 구현/UX/API 사용 문서
    backend/                   # backend 구현/API/DB/Flyway/local 문서
    ops/                       # release/deploy/migration runbook
  scripts/
    product-ssot/              # traceability/index/report 도구 후보
  skills_context/
    SHARED/                    # Claude/Codex 공통 skill SSOT
```

`packages/*`는 자동화 코드가 충분히 커지고 재사용 단위가 분명해진 뒤 승격한다.

## 4. Phase 0 — freeze & inventory

목표: 이관 전 양쪽 레포의 실제 운영 상태를 기록한다.

### 확인 항목

- 현재 기준 브랜치
  - client: `develop`
  - backend: `dev`
  - monorepo target: `develop`
- 미병합 PR / release branch / hotfix branch
- `.env*` 파일명 목록. 값은 기록하지 않는다.
- CI/CD 흐름
  - client: lint, typecheck, prettier, build, Storybook, security, release record
  - backend: compile, test, bootJar, Flyway, dev.local boot, Jenkins/prod workflow
- API contract 흐름
  - backend Swagger: `/v3/api-docs`
  - frontend generated OpenAPI: `src/api/openapi/`
  - custom axios endpoint: `src/api/endpoints`, `src/hooks/queries`, `src/features/*/api`

### 완료 조건

- 이 문서에 inventory 결과가 추가되어 있음
- `main` / `develop` 외 상시 기준 브랜치를 만들지 않는 결정이 명시되어 있음
- frontend API 사용처와 backend controller 매핑 리포트 생성 위치가 정해져 있음

## 5. Phase 1 — monorepo shell

목표: backend 코드를 넣기 전 운영 경계를 먼저 합의한다.

### 이관 방식 후보

| 방식 | 선택 기준 | 비고 |
| --- | --- | --- |
| `git filter-repo` | history 보존이 가장 중요할 때 | `backend/` prefix로 history 재작성 후 merge |
| `git subtree` | 빠른 검증과 적당한 history 보존이 필요할 때 | `git subtree add --prefix=backend <remote> dev` |
| 단순 copy | 마지막 선택 | blame/history 손실로 장애 분석 비용 증가 |

### 완료 조건

- `backend/`에서 `./gradlew compileJava` 가능
- root에서 기존 frontend 검증 가능
- 기존 `study-platform-mvp` 레포는 아직 archive/read-only 처리하지 않음

## 6. Phase 2 — contract bridge

목표: backend contract 변경이 frontend에서 바로 잡히게 한다.

권장 CI 순서:

```text
backend compile
→ backend OpenAPI export
→ frontend generated client diff check
→ frontend typecheck
```

생성 리포트 후보:

```text
docs/product-ssot/_reports/openapi-diff.md
docs/product-ssot/_reports/frontend-usage-map.md
docs/product-ssot/_reports/missing-endpoints.md
```

원칙:

- `src/api/openapi/` 직접 수정 금지
- custom axios endpoint는 generated OpenAPI와 차이를 문서화
- 제품 요구사항과 관련된 API만 `REQ-*`와 연결

## 7. Phase 3 — CI/CD/release 통합

상세 Jenkins → GitHub Actions 이전 전략은 `docs/ops/jenkins-to-github-actions-migration.md`를 기준으로 한다. 이관 순서는 QA shadow run → QA cutover → prod dry-run → prod cutover → Jenkins retirement다.

| 변경 경로 | 필수 검증 |
| --- | --- |
| `src/**`, frontend config | `yarn lint:fix`, `yarn prettier:fix`, `yarn typecheck`, build |
| `backend/**` | `./gradlew compileJava`, focused test, Flyway 영향 확인 |
| API contract | OpenAPI export, client generation, typecheck |
| docs/skills only | `git diff --check`, 관련 문서 검토 |
| `main` merge | release label, release record, rollback note, deploy health check |

production merge 전 release intent label은 hard gate로 유지한다.

## 8. Phase 4 — local dev 통합

root script 후보:

```jsonc
{
  "scripts": {
    "dev:web": "next dev --turbopack",
    "dev:backend": "cd backend && ./gradlew bootRun",
    "dev:all": "concurrently \"yarn dev:web\" \"yarn dev:backend\"",
    "verify:web": "yarn lint:fix && yarn prettier:fix && yarn typecheck",
    "verify:backend": "cd backend && ./gradlew compileJava"
  }
}
```

주의:

- backend env 값은 문서에 적지 않는다.
- 필요한 `.env*` 파일명과 profile만 기록한다.
- local backend 기본 profile은 기존 `dev.local` 기준을 우선한다.

## 9. Phase 5 — legacy backend repo read-only

다음 조건을 모두 만족하기 전에는 `study-platform-mvp`를 archive하지 않는다.

- 통합 repo에서 마지막 backend production deploy 성공
- 기존 backend repo의 open PR/issue/branch 정리
- GitHub repo 설명에 새 repo 링크와 read-only 상태 명시
- 기존 CI/Jenkins/webhook이 통합 repo 기준으로 전환

## 10. 바로 다음 작업

1. 양쪽 repo의 branch/PR/CI/deploy inventory를 이 문서에 채운다.
2. backend 이관 방식을 `git filter-repo` 또는 `git subtree` 중 하나로 결정한다.
3. `docs/product-ssot/_shared/notion-source-registry.yaml`에 Notion 출처 등록을 시작한다.
4. contract bridge 리포트 생성 위치와 최소 검증 명령을 확정한다.
