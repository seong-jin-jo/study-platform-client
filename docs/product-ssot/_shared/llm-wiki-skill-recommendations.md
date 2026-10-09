# LLM Wiki Skill Recommendations

작성일: 2026-05-28  
목표: ZERO-ONE LLM wiki를 만들 때 사용할 agent skill 조합을 단계별로 정한다.

## 현재 결론

LLM wiki 구축은 단일 skill 하나로 끝내지 않는다.

권장 기본 조합은 다음이다.

```text
deepinit / review-repo
→ external-context / deep-dive
→ wiki
→ ai-slop-cleaner
→ verify / validate
→ skillify
```

각 skill은 역할이 다르다.

- `deepinit`, `review-repo`: 현재 repo와 문서 지형을 파악한다.
- `external-context`, `deep-dive`: Notion/기존 문서/외부 원문을 작은 근거 단위로 분해한다.
- `wiki`: 세션 지식을 임시 wiki로 축적하고 cross-reference를 만든다.
- `ai-slop-cleaner`: LLM이 만든 장황한 문장을 사람이 운영 가능한 문서로 줄인다.
- `verify`, `validate`: 문서 경계, diff, index, secret 누락 여부를 검증한다.
- `skillify`: 반복되는 wiki 구축 절차를 재사용 가능한 skill로 승격한다.

## 적용 범위

이 문서는 아래 작업에 적용한다.

- Notion/PRD/FRD/운영 문서를 `docs/product-ssot/`로 승격할 때
- `docs/product-ssot/_shared/llm-knowledge-index.md`를 확장할 때
- `.omc/wiki/`에 쌓인 임시 지식을 canonical 문서로 옮길 때
- Claude/Codex 공통 skill SSOT를 `skills_context/SHARED/`에 정리할 때

## 추천 Skill 세트

### 1. 문서 지형 파악 세트

사용 시점: wiki를 처음 만들거나 domain을 새로 여는 순간.

권장 skill:

- `deepinit`: repo 구조, 문서 위치, 규칙, 검증 명령을 초기 inventory로 만든다.
- `review-repo`: 기존 문서의 중복, outdated 후보, 비어 있는 index를 찾는다.
- `setup`: 새 workspace나 worktree에서 환경과 규칙을 먼저 확인한다.

산출물:

- source 후보 목록
- domain 후보 목록
- canonical 위치 후보
- deprecated 후보
- 누락된 index 항목

주의:

- 이 단계에서 Notion 원문을 바로 active 문서로 만들지 않는다.
- `docs/product-ssot/`, `docs/frontend/`, `docs/backend/`, `docs/ops/` 경계를 먼저 확정한다.

### 2. 원문 분석 세트

사용 시점: 긴 Notion/PRD/FRD를 작은 단위로 쪼갤 때.

권장 skill:

- `deep-dive`: 긴 문서에서 정책, 요구사항, 예외, 결정 근거를 분리한다.
- `external-context`: 여러 원문이나 기존 문서가 흩어져 있을 때 병렬로 근거를 수집한다.
- `ask`: 결론보다 판단 기준이 중요한 문서를 검토할 때 사용한다.
- `clarify`: active/deprecated 판단에 사용자 결정이 필요한 경우에만 사용한다.

산출물:

- source별 freshness 판단
- 중복/충돌 후보
- domain별 chunk 초안
- 사람이 확인해야 하는 질문 목록

주의:

- 구현 상세를 product SSOT로 밀어 넣지 않는다.
- 오래된 문서와 최신 문서를 동시에 active로 두지 않는다.

### 3. Wiki 축적 세트

사용 시점: 아직 canonical 문서로 승격하기 전, 세션 지식을 쌓을 때.

권장 skill:

- `wiki`: `.omc/wiki/`에 임시 지식, session-log, cross-reference를 축적한다.
- `learner`: 반복되는 실수나 판단 규칙을 재사용 가능한 lesson으로 뽑는다.
- `remember`: 다음 세션에도 필요한 규칙을 기억 후보로 정리한다.

산출물:

- 임시 wiki page
- cross-reference
- 반복 실수 방지 규칙
- canonical 승격 후보

주의:

- `.omc/wiki/`는 canonical source가 아니다.
- 반복 사용 가치가 생긴 내용만 `docs/product-ssot/` 또는 `skills_context/SHARED/`로 승격한다.

### 4. Canonical 문서 작성 세트

사용 시점: 사람이 검토할 Markdown 문서를 만들 때.

권장 skill:

- `ai-slop-cleaner`: LLM 초안을 짧고 검토 가능한 문서로 정리한다.
- `doc-coauthoring`: 사용자가 정책 문장을 같이 다듬어야 할 때 사용한다.
- `skillify`: 반복 가능한 wiki 구축 절차를 skill로 만든다.
- `component-patterns`, `nextjs-patterns`, `expo-patterns`: product wiki가 아니라 구현 문서로 분류해야 하는 경우 사용한다.

산출물:

- `requirements.yaml`
- `glossary.md`
- `flows/*.md`
- `policies/*.md`
- `decisions/ADR-*.md`
- `traceability.md`
- `llm-knowledge-index.md` 갱신

주의:

- skill 파일에 장문 정책을 복사하지 않는다.
- 공통 절차는 `skills_context/SHARED/`에 두고 wrapper skill은 얇게 유지한다.

### 5. 품질 검증 세트

사용 시점: 문서 PR 또는 batch를 마무리할 때.

권장 skill:

- `verify`: 작성한 문서가 요청한 목적을 실제로 만족하는지 확인한다.
- `validate`: repo의 문서 검증 명령과 diff 검사를 실행한다.
- `code-review`: 문서 변경이라도 release/contract/운영 위험이 있으면 review 관점으로 본다.
- `retrospective`: 반복 수정이 많았던 batch 후 재발 방지 규칙을 남긴다.

기본 검증:

```bash
git diff --check
```

추가 확인:

- source registry에 원문이 등록되어 있는가?
- `llm-knowledge-index.md`가 갱신되었는가?
- active/deprecated 상태가 충돌하지 않는가?
- secret, token, env value가 문서에 들어가지 않았는가?
- product/frontend/backend/ops 경계가 맞는가?

## 작업 유형별 추천 조합

| 작업 유형 | 추천 skill 조합 | 결과물 |
| --- | --- | --- |
| LLM wiki 첫 구축 | `deepinit` + `review-repo` + `wiki` + `validate` | 위치/구조/index 초기안 |
| Notion 문서 1개 승격 | `deep-dive` + `wiki` + `ai-slop-cleaner` + `verify` | domain 문서 초안 |
| 중복 문서 정리 | `external-context` + `review-repo` + `verify` | active/deprecated 판단표 |
| 제품 요구사항 정리 | `deep-dive` + `doc-coauthoring` + `validate` | `requirements.yaml`, 정책 문서 |
| 운영 runbook 정리 | `deep-dive` + `ai-slop-cleaner` + `code-review` | `docs/ops/*.md` |
| 반복 workflow 승격 | `retrospective` + `skillify` + `verify` | `skills_context/SHARED/*`, thin wrapper |

## 사용하지 말아야 하는 방식

- `wiki` skill만 써서 `.omc/wiki/`에 모든 기준 문서를 묻어두지 않는다.
- `deepinit` 결과를 그대로 canonical 정책으로 쓰지 않는다.
- `external-context`가 가져온 원문을 freshness 검토 없이 active로 두지 않는다.
- `ai-slop-cleaner`가 문장만 예쁘게 만든 상태를 검증 완료로 보지 않는다.
- `skillify`로 만든 wrapper 안에 장문 정책을 중복 저장하지 않는다.

## 권장 실행 예시

### 새 domain wiki를 만들 때

```text
$deepinit
현재 domain 문서/구현/API/운영 지형 파악

$deep-dive
Notion/PRD/FRD 원문을 요구사항, 정책, 흐름, 결정으로 분해

$wiki
세션 중 판단과 cross-reference를 임시 저장

$ai-slop-cleaner
초안을 짧고 리뷰 가능한 Markdown으로 정리

$validate
git diff --check, index/source/secret 검증
```

### 반복 가능한 wiki 구축 절차가 생겼을 때

```text
$retrospective
반복된 판단과 실수 정리

$skillify
절차를 skill로 승격

$verify
새 skill이 장문 정책을 복사하지 않고 SSOT를 가리키는지 확인
```

## 관련 문서

- `docs/product-ssot/_shared/llm-knowledge-index.md`
- `docs/product-ssot/_shared/llm-wiki-location-policy.md`
- `docs/product-ssot/_shared/llm-wiki-build-strategy.md`
- `docs/product-ssot/_shared/notion-source-registry.yaml`
- `skills_context/SHARED/study-platform-fullstack-context.md`

## Freshness / Source

- 기준일: 2026-05-28
- source: 현재 repo의 LLM wiki 정책 문서와 로컬 skill 목록
- 상태: active draft
