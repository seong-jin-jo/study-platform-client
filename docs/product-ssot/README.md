# Product SSOT

`docs/product-ssot/`는 ZERO-ONE 제품 요구사항, 정책, 결정, 테스트 추적성의 canonical source다.

이 디렉터리는 frontend 문서 저장소도 backend 문서 저장소도 아니다. 제품 도메인에서 “무엇이 참이어야 하는가”만 관리하고, 구현 세부는 각각 `docs/frontend/`, `docs/backend/`에 둔다.

## 역할

- Notion/PRD/FRD에서 확정된 요구사항을 도메인별로 정규화한다.
- `REQ-*` 요구사항과 acceptance/API/manual 검증 근거를 연결한다.
- 오래된 문서와 최신 기준이 섞이지 않도록 source/freshness/deprecated 상태를 관리한다.
- LLM이 빠르게 검색할 수 있는 Markdown wiki의 기준 위치로 사용한다.

## 기본 구조

```text
docs/product-ssot/
  README.md
  _shared/
    notion-source-registry.yaml
    llm-knowledge-index.md
    traceability-rules.md
    testing-layer-policy.md
  {domain}/
    README.md
    requirements.yaml
    glossary.md
    flows/
    policies/
    decisions/
      ADR-*.md
    traceability.md
```

처음부터 빈 도메인 폴더를 대량 생성하지 않는다. 실제로 검토된 요구사항이나 정책이 생길 때 추가한다.

## 문서 분류 원칙

| 위치 | 넣는 문서 | 넣지 않는 문서 |
| --- | --- | --- |
| `docs/product-ssot/{domain}/requirements.yaml` | 제품 요구사항, 상태, 우선순위, owner, trace tag | React hook 사용법, Spring service 구현 상세 |
| `docs/product-ssot/{domain}/flows/` | 사용자/시스템 end-to-end 흐름 | 단순 화면 컴포넌트 설명 |
| `docs/product-ssot/{domain}/policies/` | 토큰, 권한, 결제, 환불, 공개 여부 같은 제품 규칙 | DB migration 상세 |
| `docs/product-ssot/{domain}/decisions/` | 대안 중 무엇을 선택했고 왜 선택했는지 | 일회성 작업 로그 |
| `docs/frontend/` | frontend API 사용법, UI/UX 패턴, Storybook/Playwright | backend DB/Flyway runbook |
| `docs/backend/` | backend API 구현, DB/Flyway, local backend run | frontend 컴포넌트 상태관리 |
| `docs/ops/` | release, deploy, rollback, migration, incident runbook | 도메인 요구사항 원장 |

## Notion → LLM wiki 파이프라인

```text
Notion export/API
→ source registry
→ markdown normalize
→ duplicate detection
→ domain chunking
→ frontmatter metadata
→ reviewer checklist
→ docs/product-ssot publish
→ index refresh
```

## page frontmatter 기준

```yaml
---
title: "Class Payment Policy"
source: "notion"
source_url: "internal-or-redacted"
source_updated_at: "2026-05-27"
domain: "payment"
status: "active"
freshness: "verified"
tags: ["class", "payment", "refund", "api-contract"]
canonical: true
supersedes: []
---
```

## 운영 원칙

1. 요구사항 ID는 `REQ-{DOMAIN}-{NUMBER}` 형식을 사용한다.
2. 확정 전 Notion 원문은 registry에만 남기고, domain 문서로 바로 승격하지 않는다.
3. near-duplicate 문서는 하나만 canonical로 두고 나머지는 deprecated 또는 superseded로 표시한다.
4. image-heavy 문서는 이미지 자체보다 이미지가 말하는 결정/정책을 텍스트로 추출한다.
5. frontend/backend 구현 문서는 product-ssot에 복사하지 말고 링크만 건다.
