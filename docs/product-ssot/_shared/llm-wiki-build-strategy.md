# LLM Wiki 구축 전략 정책

작성일: 2026-05-27  
목표: Notion/PRD/FRD/운영 문서를 LLM이 안전하게 읽을 수 있는 Markdown 지식 체계로 전환

## 1. 결론

LLM wiki는 대량 import로 만들지 않는다.

기본 전략은 다음 순서다.

```text
source 등록
→ 중복/구버전 판정
→ 작은 단위 chunk 정리
→ domain 분류
→ 사람이 검토
→ canonical 문서로 승격
→ index 갱신
```

가장 중요한 원칙은 “많이 넣기”가 아니라 “오래된 지식과 최신 기준을 섞지 않기”다.

## 2. 1차 MVP 범위

처음에는 아래 파일만 확실히 만든다.

```text
docs/product-ssot/_shared/notion-source-registry.yaml
docs/product-ssot/_shared/llm-knowledge-index.md
docs/product-ssot/_shared/llm-wiki-location-policy.md
docs/product-ssot/_shared/llm-wiki-build-strategy.md
```

그 다음 domain별로 검토된 문서만 추가한다.

우선순위 domain:

1. `auth`
2. `class`
3. `course`
4. `payment`
5. `notification`

## 3. 파이프라인

### Step 1. source 등록

모든 Notion/PRD/FRD 원문은 먼저 registry에 등록한다.

```text
docs/product-ssot/_shared/notion-source-registry.yaml
```

필수 metadata:

- id
- title
- source
- source_url 또는 내부 식별자
- source_updated_at
- domain
- status
- freshness
- canonical
- supersedes
- target_docs
- notes

### Step 2. 중복/구버전 판정

같은 주제의 문서가 여러 개 있으면 바로 domain 문서로 복사하지 않는다.

판정 기준:

- 더 최신 정책인가?
- 실제 backend/frontend 구현과 맞는가?
- release 이후 변경된 내용인가?
- 다른 문서를 대체하는가?
- 일부만 유효한 phase-scoped 문서인가?

결과는 다음 중 하나로 표시한다.

| 상태 | 의미 |
| --- | --- |
| `draft` | 아직 검토 전 |
| `reviewed` | 사람이 읽고 분류함 |
| `active` | 현재 기준으로 사용 가능 |
| `deprecated` | 오래되어 기준으로 쓰면 안 됨 |

### Step 3. 작은 단위 chunk 정리

큰 Notion page 하나를 그대로 붙여넣지 않는다. LLM이 잘 찾고 사람이 리뷰할 수 있게 작은 단위로 나눈다.

권장 단위:

- 요구사항: `requirements.yaml`
- 용어/상태값: `glossary.md`
- 흐름: `flows/*.md`
- 정책: `policies/*.md`
- 결정: `decisions/ADR-*.md`
- 검증 연결: `traceability.md`

### Step 4. domain 분류

문서는 먼저 domain을 가진다.

예시:

```text
auth
class
course
payment
notification
member
groupstudy
admin
```

한 문서가 여러 domain에 걸치면 canonical domain 하나를 정하고, 다른 domain에서는 링크만 건다.

### Step 5. 사람이 검토

LLM이 정리한 초안은 바로 `active`가 아니다.

검토자는 다음을 확인한다.

- 원문 의미가 왜곡되지 않았는가?
- 현재 구현/운영 기준과 충돌하지 않는가?
- 중복 문서가 남아 있지 않은가?
- secret/env 값이 들어가지 않았는가?
- 구현 디테일이 product-ssot에 과도하게 들어오지 않았는가?

### Step 6. canonical 승격

검토가 끝난 문서만 domain 문서로 승격한다.

승격 시 필요한 frontmatter 예시:

```yaml
---
title: "Class payment refund policy"
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

### Step 7. index 갱신

승격 후 반드시 다음 파일을 갱신한다.

```text
docs/product-ssot/_shared/llm-knowledge-index.md
```

index에는 “어떤 질문이면 어디를 먼저 볼지”를 적는다.

## 4. 작성 규칙

LLM wiki 문서는 다음 형식을 우선한다.

```markdown
# 제목

## 현재 결론

## 적용 범위

## 정책/요구사항

## 예외

## 관련 문서

## freshness / source
```

요구사항 원장은 YAML을 사용한다.

```yaml
requirements:
  - id: REQ-PAYMENT-001
    status: active
    priority: high
    owner: product
    description: "..."
    evidence:
      acceptance: []
      api: []
      manual: []
```

## 5. 금지 사항

- Notion ZIP 전체를 무검토로 commit하지 않는다.
- old/new가 불명확한 문서를 동시에 active로 두지 않는다.
- 이미 deprecated된 문서를 LLM 답변의 기본 근거로 쓰지 않는다.
- 이미지 안의 중요한 정책을 이미지로만 남기지 않는다.
- secret, token, env value를 문서에 적지 않는다.
- frontend/backend 구현 문서를 product-ssot로 대량 복사하지 않는다.
- skill 파일에 긴 지식을 중복 저장하지 않는다.

## 6. 검증 방법

문서 변경 PR은 최소 다음을 확인한다.

```bash
git diff --check
```

추가 확인:

- registry에 source가 등록되어 있는가?
- `llm-knowledge-index.md`가 갱신되었는가?
- canonical 문서와 deprecated 문서가 충돌하지 않는가?
- product/frontend/backend/ops 경계가 맞는가?
- secret 값이 없는가?

## 7. 운영 리듬

권장 운영 방식:

- 한 번에 전체 Notion을 옮기지 않는다.
- domain 하나 또는 질문 하나 단위로 작은 batch를 만든다.
- batch마다 중복 후보와 deprecated 후보를 남긴다.
- 검토가 끝난 문서만 active로 승격한다.
- LLM이 자주 틀리는 질문은 `llm-knowledge-index.md`에 먼저 볼 위치를 추가한다.

## 8. 성공 기준

LLM wiki 구축이 성공한 상태는 다음과 같다.

- “환불 정책 어디 있어?” 같은 질문에 1~2개 문서로 바로 도달한다.
- Notion 원본의 최신성/freshness가 보인다.
- 오래된 문서가 active 기준과 섞이지 않는다.
- frontend/backend 구현 문서와 제품 정책 문서가 분리되어 있다.
- Claude/Codex skill은 같은 `skills_context/SHARED/`와 `docs/product-ssot/`를 읽는다.
