# Retired Workflows

이 디렉토리의 워크플로우들은 **monorepo 마이그레이션으로 비활성화**되었습니다.

GitHub Actions는 repository root의 `.github/workflows/`만 읽습니다.
이 디렉토리(`study-platform-client/.github/workflows/`)의 파일들은 실행되지 않습니다.

## 대체 워크플로우 위치

모든 CI/CD는 monorepo root의 `.github/workflows/`에서 실행됩니다:

| 기존 파일 | 대체 위치 |
|---|---|
| `ci.yml` | `/.github/workflows/client-ci.yml` |
| `chromatic.yml` | `/.github/workflows/client-ci.yml` (chromatic job) |
| `deploy-dev.yml` | `/.github/workflows/client-deploy-dev.yml` |
| `deploy-prod.yml` | `/.github/workflows/client-deploy-prod.yml` |
| `release-record-check.yml` | `/.github/workflows/release-record-check.yml` |
| `record-backend-prod-release.yml` | `/.github/workflows/record-backend-prod-release.yml` |
| `claude.yml` | `/.github/workflows/claude.yml` |
| `claude-code-review.yml` | `/.github/workflows/claude-code-review.yml` |
| `notify-*.yml` | `/.github/workflows/notify-*.yml` |
