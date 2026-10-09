# Backend Jenkins to GitHub Actions 마이그레이션 전략

작성일: 2026-05-27  
기준 레포: `study-platform-client` monorepo target  
분석 대상: `study-platform-mvp/Jenkinsfile-qa`, `study-platform-mvp/Jenkinsfile-prod`, `study-platform-mvp/jenkins/prod/*.groovy`  
목표: backend QA/prod Jenkins 배포 파이프라인을 GitHub Actions로 이관하고, frontend/backend 통합 CI/CD와 release record를 하나로 운영한다.

## 1. 결론

backend Jenkins를 한 번에 제거하지 않는다. 먼저 Jenkins 파이프라인이 가진 기능을 GitHub Actions job으로 1:1 대응시키고, QA부터 shadow run으로 검증한 뒤 prod를 전환한다.

최종 목표는 다음이다.

- backend QA deploy: `develop` push 또는 수동 dispatch로 GitHub Actions에서 수행
- backend prod deploy: `main` push 또는 수동 dispatch로 GitHub Actions에서 수행
- frontend/backend release record: `study-platform-client/releases/`에서 단일 schema로 관리
- backend-only prod deploy도 현재처럼 frontend repo의 release record workflow를 통해 기록
- Jenkins credential, Slack, Docker, compose env 파일은 GitHub Secrets/Environments로 이전
- Jenkins는 GitHub Actions prod deploy가 최소 1회 성공하고 rollback evidence가 확보된 뒤 read-only/disable 처리

## 2. 현재 Jenkins 파이프라인 요약

### 2.1 QA Jenkinsfile

파일: `study-platform-mvp/Jenkinsfile-qa`

현재 stage:

| Jenkins stage | 하는 일 | GitHub Actions 이관 방향 |
| --- | --- | --- |
| `Notify start` | Slack 시작 알림, commit message 포함 | `slackapi/slack-github-action` 또는 webhook curl step |
| `Authorize Build assistant` | `chmod 755 ./gradlew` | checkout 후 `chmod +x backend/gradlew` |
| `Verify Flyway migrations` | `./gradlew test --tests "*FlywayMigrationSyntaxTest"` | backend QA deploy workflow의 preflight job |
| `Build JAR` | `./gradlew clean build -x test` | build job |
| `Build Image` | registry login, `deploy/Dockerfile` build, `latest` push | Docker login action + immutable tag + QA alias push |
| `Deploy` | compose env file 생성, `zeroone-net-qa`, compose down/up | self-hosted runner 또는 SSH deploy step |
| `API` | `deploy/api_git_push.sh`로 frontend `feature/openapi-new`에 generated OpenAPI push | monorepo contract job으로 대체. 임시 단계에서는 PR/comment 방식 유지 가능 |
| `post always` | workspace clean, docker image/volume prune | GitHub runner cleanup. self-hosted면 prune step 별도 |
| `post success/failure` | Slack 결과 알림 | workflow conclusion 알림 |

중요한 현재 특징:

- QA profile은 `qa.test`다.
- image는 현재 `latest` 중심이다.
- QA compose는 `deploy/docker-compose.yml`의 `mvp-app-qa` profile을 사용한다.
- QA DB는 compose의 `qa-db` service와 external volume `db-data`를 사용한다.
- OpenAPI generated client를 frontend repo에 직접 push하는 단계가 있다.

### 2.2 PROD Jenkinsfile

파일: `study-platform-mvp/Jenkinsfile-prod`

현재 stage:

| Jenkins stage | 하는 일 | GitHub Actions 이관 방향 |
| --- | --- | --- |
| `Authorize Build assistant` | `chmod 755 ./gradlew` | checkout 후 `chmod +x backend/gradlew` |
| `Load prod pipeline helpers` | `jenkins/prod/releaseMetadataSupport.groovy`, `frontendDispatchSupport.groovy` 로드 | Groovy helper를 Node/Python script로 포팅 |
| `Resolve prod release metadata` | PR/label/commit/image/db migration/version/rollback metadata 계산 | `scripts/release/resolve-backend-prod-release.mjs` 후보 |
| `Notify start` | Slack 시작 알림 | Slack action/webhook |
| `Verify Flyway migrations` | `FlywayMigrationSyntaxTest` 실행 | prod preflight job |
| `Build JAR` | `./gradlew clean build -x test` | build job |
| `Build canonical image` | `vX.Y.Z-<sha>` image build/push | immutable Docker tag build/push |
| `Deploy backend` | prod env file + `IMAGE_TAG`, `RELEASE_ID`, `SERVICE_VERSION`, compose config 검증, down/up | SSH deploy 또는 self-hosted deploy job |
| `Backend health check` | `http://localhost:13754/actuator/health` polling | deploy 후 health gate |
| `Build frontend release payload` | backend-only release dispatch payload 생성/검증, artifact archive | Node/Python script + artifact upload |
| `Trigger frontend release record workflow` | frontend repo `repository_dispatch` event `backend-prod-deployed` 호출 | monorepo에서는 같은 repo workflow_call 또는 repository_dispatch 유지 후 제거 |
| `Update floating prod pointers` | canonical image를 `prod`, `latest-prod`로 tag/push | health success 후 alias update job |
| `post always/success/failure` | cleanup + Slack 결과 알림 | always cleanup + Slack notification |

중요한 현재 특징:

- prod는 main branch 전용이다. `releaseMetadataSupport.resolveProdReleaseMetadata()`가 main 외 branch를 거부한다.
- release intent는 PR label `release:major|minor|patch` 또는 merge commit message에서 가져온다.
- release label이 여러 개면 fail이다.
- bootstrap mode에서는 `bootstrap:approved` label이 필요하다.
- DB migration 파일은 `src/main/resources/db/migration/` diff로 감지한다.
- high-risk migration은 `DROP COLUMN`, `DROP TABLE`, `RENAME COLUMN`, `NOT NULL`, `UNIQUE`, `FOREIGN KEY` 등 패턴으로 감지한다.
- service version은 현재 prod container image tag에서 추출하고 release intent로 bump한다.
- canonical image tag는 `vX.Y.Z-<shortSha>` 형식이다.
- rollback backend image는 이전 prod container image에서 계산한다.
- backend prod deploy 후 frontend repo에 `backend-prod-deployed` dispatch를 보내 release record를 생성한다.
- health check는 prod host의 `localhost:13754/actuator/health` 기준이다.

### 2.3 기존 GitHub Actions와 연결되는 부분

`study-platform-mvp`에는 이미 다음 guard workflow가 있다.

| Workflow | 현재 역할 | monorepo 이관 방향 |
| --- | --- | --- |
| `ops-compatibility-guard.yml` | Flyway migration 변경 시 compatibility, naming, clean migrate 검증 | `backend/**` path 기준으로 monorepo에 이관 |
| `require-main-release-intent.yml` | main PR에 release intent label 정확히 1개 요구 | monorepo main PR hard gate로 통합 |
| `release-preflight.yml` | `ops/releases/prod-*.yaml` preflight | 통합 release record schema와 연결 |

`study-platform-client`에는 이미 다음 workflow가 있다.

| Workflow | 현재 역할 | monorepo 이관 방향 |
| --- | --- | --- |
| `deploy-dev.yml` | frontend develop deploy | backend develop deploy와 병렬/순차 통합 후보 |
| `deploy-prod.yml` | frontend prod image/deploy/release record | backend prod deploy metadata와 같은 release record로 통합 |
| `record-backend-prod-release.yml` | backend Jenkins prod deploy dispatch를 받아 release record 생성 | Jenkins 제거 전 bridge, 이후 workflow_call/script로 내부화 |
| `release-record-check.yml` | release record 검증 | frontend/backend 통합 release record 검증 유지 |

## 3. 목표 GitHub Actions 구조

### 3.1 권장 workflow 목록

monorepo 전환 후 권장 workflow:

```text
.github/workflows/ci.yml
.github/workflows/backend-qa-deploy.yml
.github/workflows/backend-prod-deploy.yml
.github/workflows/contract-bridge.yml
.github/workflows/release-record-check.yml
.github/workflows/require-main-release-intent.yml
```

선택적으로 frontend/backend deploy를 한 파일로 합칠 수 있지만, 초기에는 분리한다.

이유:

- Jenkins QA/prod 제거 범위를 작게 유지할 수 있다.
- backend-only deploy와 frontend-only deploy evidence를 분리할 수 있다.
- release record만 공통 schema로 묶으면 된다.

### 3.2 backend QA deploy target

Trigger:

```yaml
on:
  push:
    branches: [develop]
    paths:
      - 'backend/**'
      - '.github/workflows/backend-qa-deploy.yml'
      - 'docs/backend/**'
  workflow_dispatch:
```

권장 jobs:

```text
preflight
  - checkout
  - setup java 21
  - chmod gradlew
  - FlywayMigrationSyntaxTest
  - compile/build

image
  - docker login
  - build backend image
  - push immutable tag sha-<shortSha>
  - push QA alias develop/latest-qa

deploy
  - render env file from GitHub Environment: qa
  - docker compose config validation
  - docker network create zeroone-net-qa || true
  - docker compose pull/up -d
  - health check http://localhost:14854/actuator/health or remote equivalent

openapi-contract
  - export OpenAPI
  - compare generated frontend client diff
  - create PR/comment instead of direct force push

notify
  - Slack success/failure
```

QA에서 `latest`만 쓰던 현재 방식은 전환 중 유지할 수 있지만, 목표는 `qa-<shortSha>` 같은 immutable tag와 `latest-qa` alias를 같이 쓰는 것이다.

### 3.3 backend PROD deploy target

Trigger:

```yaml
on:
  push:
    branches: [main]
    paths:
      - 'backend/**'
      - '.github/workflows/backend-prod-deploy.yml'
      - 'docs/ops/**'
  workflow_dispatch:
    inputs:
      release_intent:
        type: choice
        options: [major, minor, patch]
      dry_run:
        type: boolean
```

권장 jobs:

```text
resolve-release
  - main branch 확인
  - source PR number 확인
  - release intent label 정확히 1개 확인
  - bootstrap mode면 bootstrap:approved 확인
  - migration files/high-risk migration 계산
  - previous prod image inspection
  - service version bump
  - canonical image tag 계산

preflight
  - FlywayMigrationSyntaxTest
  - ops compatibility guard
  - release metadata validate

build-image
  - build deploy/Dockerfile
  - push canonical image vX.Y.Z-<shortSha>

deploy
  - GitHub Environment: production approval gate 사용
  - env file 생성. secret 값은 로그 출력 금지
  - docker compose config 검증
  - docker compose down/up -d
  - health check

release-record
  - backend release payload 생성
  - release record 생성/검증
  - releases/prod-YYYYMMDD-HHmm.yaml commit 또는 PR 생성

alias-update
  - health check 성공 후 prod/latest-prod tag push

notify
  - Slack success/failure
```

prod에서 alias update는 반드시 health check 성공 후 수행한다. canonical image는 rollback 기준이므로 alias보다 먼저 push한다.

## 4. Jenkins 기능별 이관 설계

| Jenkins 기능 | GitHub Actions 대체 | 주의 |
| --- | --- | --- |
| `disableConcurrentBuilds()` | `concurrency` | prod release record와 deploy는 `cancel-in-progress: false` |
| Jenkins credentials | GitHub Secrets + Environments | 값은 문서화 금지 |
| Slack plugin | Slack webhook/action | channel 이름은 변수화 |
| `cleanWs()` | GitHub hosted runner는 자동 clean, self-hosted는 cleanup step | Docker prune은 self-hosted에서만 신중히 |
| Docker login | `docker/login-action@v3` | registry별 secret 분리 |
| Docker build/push | `docker/build-push-action` 또는 shell | 초기에는 shell이 Jenkins parity 확인에 유리 |
| compose env file credential | GitHub Environment secret multiline env | 파일 생성 시 `set +x`, permission 600 |
| Groovy release metadata helper | Node/Python script | 기존 frontend release script와 언어 통일 권장 |
| `repository_dispatch` | 전환 중 유지, monorepo 완료 후 workflow_call/script | backend-only release record semantics 보존 |
| OpenAPI direct push script | contract bridge workflow | 자동 PR 또는 diff artifact로 전환 |

## 5. Secret / Environment 이전 계획

값은 절대 문서화하지 않는다. 이름과 용도만 이전한다.

### 5.1 Jenkins credential 후보

| Jenkins credential | GitHub target | 용도 |
| --- | --- | --- |
| `container-registry-url-qa` | `vars.BACKEND_QA_REGISTRY_URL` | QA image registry URL |
| `container-repo-name-qa` | `vars.BACKEND_QA_REPO_NAME` | QA image repo name |
| `container-registry-token-qa` | `secrets.BACKEND_QA_REGISTRY_TOKEN` | QA registry login token |
| `container-registry-username-qa` | `secrets.BACKEND_QA_REGISTRY_USERNAME` | QA registry username |
| `docker-compose-envs-qa` | `secrets.BACKEND_QA_COMPOSE_ENV` | QA compose env file content |
| `container-registry-url-prod` | `vars.BACKEND_PROD_REGISTRY_URL` | prod image registry URL |
| `container-repo-name-prod` | `vars.BACKEND_PROD_REPO_NAME` | prod image repo name |
| `container-registry-token-qa` used in prod | `secrets.BACKEND_PROD_REGISTRY_TOKEN` | prod registry token. 이름은 prod로 분리 권장 |
| `container-registry-username-qa` used in prod | `secrets.BACKEND_PROD_REGISTRY_USERNAME` | prod registry username. 이름은 prod로 분리 권장 |
| `docker-compose-envs-prod` | `secrets.BACKEND_PROD_COMPOSE_ENV` | prod compose env file content |
| `github-token` | `secrets.RELEASE_DISPATCH_TOKEN` 또는 `GITHUB_TOKEN` | repository_dispatch, PR label 조회 |

### 5.2 GitHub Environment

권장 Environment:

```text
qa-backend
production-backend
production-release-record
```

`production-backend`에는 manual approval protection을 둔다. 단, hotfix 운영 요구가 있으면 승인자를 최소화하고 audit trail을 남긴다.

## 6. Release metadata script 이관 계획

Jenkins Groovy helper는 GitHub Actions에서 직접 재사용하지 않는다. 다음 script로 포팅한다.

```text
scripts/release/resolve-backend-prod-release.mjs
scripts/release/build-backend-release-dispatch-payload.mjs
scripts/release/validate-backend-release-dispatch-payload.mjs
```

기존 Groovy 기능 mapping:

| Groovy 함수 | 새 script 책임 |
| --- | --- |
| `resolveBranchName` | GitHub context의 `ref_name` 확인 |
| `resolvePullRequestNumber` | commit associated PR API 또는 merge commit parsing |
| `fetchPullRequestLabels` | GitHub REST API 또는 `gh api` |
| `validateReleaseLabels` | main PR에 release label 정확히 1개 확인 |
| `resolveReleaseIntent` | label 우선, manual dispatch input fallback |
| `listChangedFiles` | GitHub compare/diff 또는 `git diff HEAD^ HEAD` |
| `extractHighestMigrationVersion` | migration files에서 최고 `V*` 계산 |
| `hasHighRiskMigration` | SQL high-risk pattern scan |
| `extractServiceVersionFromImage` | 현재 prod container image inspect 결과 parsing |
| `bumpServiceVersion` | SemVer bump |
| `buildBackendDeployId` | `${workflow_run_id}` 또는 `${run_number}` 기반 ID |

## 7. OpenAPI 자동화 이관 계획

현재 QA Jenkins `API` stage는 backend에서 OpenAPI client를 생성해 frontend repo의 `feature/openapi-new` branch에 push한다.

monorepo에서는 이 방식을 바꾼다.

### 전환 전 bridge

- Jenkins stage는 유지하되 실패/변경 여부를 더 명확히 기록한다.
- frontend repo에 direct push하는 branch는 보호/청소 정책을 둔다.

### 전환 후 목표

```text
backend OpenAPI export
→ frontend generated client regenerate
→ git diff --exit-code
→ 변경 있으면 artifact 또는 bot PR 생성
→ typecheck
```

원칙:

- `src/api/openapi/`를 사람이 직접 수정하지 않는다.
- backend DTO/path/enum 변경이 frontend typecheck 또는 OpenAPI diff에서 잡혀야 한다.
- custom axios endpoint는 generated OpenAPI와 차이를 `docs/frontend/openapi-usage.md`에 기록한다.

## 8. 단계별 실행 계획

### Phase A. Inventory freeze

- Jenkins credential 목록을 이름만 정리한다.
- Jenkins job trigger, branch, runner/server 위치를 확인한다.
- 현재 QA/prod Docker registry와 image alias 사용 방식을 기록한다.
- 현재 prod container image inspect 결과가 service version parsing 규칙과 맞는지 확인한다.

완료 조건:

- 이 문서의 secret mapping table이 실제 Jenkins credential과 일치한다.
- production GitHub Environment에 필요한 secret/var 이름이 확정된다.

### Phase B. Script parity

- Groovy release metadata helper를 Node/Python script로 포팅한다.
- 기존 Jenkins sample 환경값 없이 unit test 가능한 pure function을 먼저 만든다.
- release payload validation은 기존 `record-backend-prod-release.yml` contract와 맞춘다.

완료 조건:

- 동일 commit/label/migration fixture에서 Groovy와 새 script의 release metadata가 일치한다.
- bootstrap/high-risk migration/release label 다중 선택 케이스가 test fixture에 있다.

### Phase C. QA shadow workflow

- `backend-qa-deploy.yml`을 수동 dispatch로 먼저 만든다.
- Jenkins QA와 같은 commit에서 build/image/deploy를 dry-run 또는 shadow tag로 실행한다.
- QA health check와 OpenAPI diff artifact를 확인한다.

완료 조건:

- GitHub Actions QA workflow가 Jenkins QA와 같은 Dockerfile/compose profile을 사용해 성공한다.
- Slack 알림과 failure log가 Jenkins보다 나빠지지 않는다.

### Phase D. QA cutover

- `develop` push trigger를 GitHub Actions로 켠다.
- Jenkins QA trigger를 disable한다.
- 최소 2회 develop 배포가 Actions에서 성공해야 한다.

완료 조건:

- QA backend image, container, health check가 Actions 기준으로 검증됨.
- OpenAPI generation/diff 방식이 정리됨.

### Phase E. PROD shadow/preflight

- prod workflow는 처음에 `workflow_dispatch dry_run=true`만 허용한다.
- release metadata, canonical image tag, rollback image, release payload artifact를 생성한다.
- 실제 deploy는 하지 않는다.

완료 조건:

- Jenkins prod와 Actions dry-run metadata가 같은 commit에서 동일하게 계산된다.
- release record dry-run이 `record-backend-prod-release.yml` validation을 통과한다.

### Phase F. PROD cutover

- GitHub Environment approval을 켠다.
- prod Actions에서 실제 deploy 1회를 수행한다.
- health check 성공 후 alias update와 release record commit을 확인한다.
- Jenkins prod trigger를 disable한다.

완료 조건:

- Actions prod deploy 성공
- `releases/prod-*.yaml` 생성/검증 성공
- rollback image가 record에 남음
- Slack success 알림에 release id, service version, backend image, rollback image가 포함됨

### Phase G. Jenkins retirement

- Jenkins job을 read-only/disabled 상태로 둔다.
- Jenkinsfile은 history 보존을 위해 일정 기간 남기거나 `docs/ops/legacy/`로 이동한다.
- GitHub repo/ops 문서에 Jenkins retired date를 기록한다.

완료 조건:

- 최소 1회 prod deploy와 1회 rollback drill 또는 rollback dry-run evidence가 있다.
- Jenkins credential이 더 이상 prod deploy path에 필요하지 않다.

## 9. 리스크와 대응

| 리스크 | 영향 | 대응 |
| --- | --- | --- |
| Jenkins와 Actions가 서로 동시에 deploy | QA/prod 상태 경합 | concurrency + cutover 시 Jenkins trigger disable |
| prod alias를 health 실패 전에 갱신 | rollback 기준 오염 | canonical image push → deploy → health → alias update 순서 고정 |
| release metadata script drift | release record 오류 | Groovy parity fixture와 validation test 추가 |
| GitHub hosted runner에서 server-local Docker compose 불가 | deploy 실패 | self-hosted runner 또는 SSH/cloudflared deploy 방식 선택 |
| compose env secret 로그 노출 | 보안 사고 | `set +x`, env file permission 600, 값 출력 금지 |
| OpenAPI direct push가 monorepo에서 충돌 | generated client drift | bot PR/diff artifact 방식으로 전환 |
| DB migration high-risk 판단 누락 | prod 장애 | 기존 pattern scan + ops compatibility guard 유지 |
| release label 누락 | SemVer/record 불명확 | main PR release label hard gate 유지 |

## 10. 문서/Workflow 산출물 목록

이 계획이 구현 단계로 넘어가면 최소 다음 파일이 필요하다.

```text
.github/workflows/backend-qa-deploy.yml
.github/workflows/backend-prod-deploy.yml
.github/workflows/contract-bridge.yml
scripts/release/resolve-backend-prod-release.mjs
scripts/release/build-backend-release-dispatch-payload.mjs
scripts/release/validate-backend-release-dispatch-payload.mjs
docs/backend/api-contracts/README.md
docs/ops/backend-github-actions-runbook.md
```

이 문서는 전략/계획 문서이며, 위 파일 구현은 별도 PR에서 진행한다.
