# LLM Wiki 위치 정책

작성일: 2026-05-27  
적용 범위: `study-platform-client` 단일 레포 전환 이후의 제품 지식, Notion 정리본, agent-facing 지식 문서

## 1. 결론

ZERO-ONE LLM wiki의 canonical 위치는 다음이다.

```text
docs/product-ssot/
```

단, 모든 문서를 이 위치에 넣는다는 뜻은 아니다. `docs/product-ssot/`에는 제품 요구사항, 정책, 결정, traceability처럼 “제품 기준으로 참이어야 하는 지식”만 둔다.

구현/운영/skill 지식은 아래처럼 분리한다.

| 지식 종류 | 위치 |
| --- | --- |
| 제품 요구사항, 정책, 결정, traceability | `docs/product-ssot/` |
| Notion 원본 출처/상태/freshness registry | `docs/product-ssot/_shared/notion-source-registry.yaml` |
| LLM 검색 시작점/index | `docs/product-ssot/_shared/llm-knowledge-index.md` |
| frontend 구현/UX/API 사용법 | `docs/frontend/` |
| backend 구현/API/DB/Flyway/local runbook | `docs/backend/` |
| release/deploy/rollback/migration runbook | `docs/ops/` |
| Claude/Codex 공통 skill SSOT | `skills_context/SHARED/` |
| 개인 실험 skill/context | `skills_context/PERSONAL/` |
| session-local 임시 wiki | `.omc/wiki/` |

## 2. 왜 `docs/product-ssot/`인가

LLM wiki의 목적은 “LLM이 아무 문서나 많이 읽게 하는 것”이 아니라, 오래된 Notion/PRD/FRD/작업 메모 중 현재 제품 기준만 빠르게 찾게 하는 것이다.

따라서 canonical wiki는 git으로 리뷰되고, PR에서 diff가 보이며, release/contract와 연결할 수 있는 위치에 있어야 한다.

`docs/product-ssot/`를 기준으로 두는 이유는 다음과 같다.

1. 제품 요구사항과 정책의 source of truth 역할이 명확하다.
2. frontend/backend 구현 문서와 섞이지 않는다.
3. `REQ-*`와 테스트/contract evidence를 연결하기 쉽다.
4. Notion 중복/구버전 문서를 registry로 통제할 수 있다.
5. Claude/Codex skill이 같은 문서를 읽도록 만들 수 있다.

## 3. 넣어도 되는 것

`docs/product-ssot/`에 넣어도 되는 문서:

- 도메인별 요구사항 원장: `requirements.yaml`
- 제품 정책: 권한, 결제, 환불, 공개 여부, 상태 전이 등
- 사용자/시스템 흐름: login, payment, lesson, notification 등
- 제품 결정 ADR: 대안 중 무엇을 선택했고 왜 선택했는지
- `REQ-*` ↔ 테스트/API/manual evidence 연결 문서
- Notion 원본 registry와 LLM index
- deprecated/superseded 여부가 명시된 정리본

## 4. 넣으면 안 되는 것

`docs/product-ssot/`에 넣으면 안 되는 문서:

- React component 구현 상세
- TanStack Query hook 사용법
- Spring service/repository 구현 상세
- Flyway migration 작성법 자체
- dev server 실행법
- release runbook 전문
- agent skill 내부 장문 가이드
- 검토되지 않은 Notion 원문 전체 복사본
- 개인 실험 메모

이런 문서는 각각 `docs/frontend/`, `docs/backend/`, `docs/ops/`, `skills_context/SHARED/`, `skills_context/PERSONAL/`로 보낸다.

## 5. `.omc/wiki/`와의 관계

`.omc/wiki/`는 session-local 임시 지식 저장소다. 자동 캡처나 빠른 메모에는 사용할 수 있지만, ZERO-ONE 제품 기준의 canonical source가 아니다.

원칙:

- `.omc/wiki/`에만 있는 내용은 release/contract/제품 기준으로 보지 않는다.
- 반복 사용 가치가 생기면 `docs/product-ssot/`, `docs/frontend/`, `docs/backend/`, `docs/ops/`, `skills_context/SHARED/` 중 맞는 위치로 승격한다.
- 승격 시에는 source, freshness, deprecated 여부를 명시한다.

## 6. 도메인 문서 기본 위치

도메인별 canonical 문서는 다음 형태를 기본으로 한다.

```text
docs/product-ssot/{domain}/
  README.md
  requirements.yaml
  glossary.md
  flows/
  policies/
  decisions/
  traceability.md
```

처음부터 빈 폴더를 대량 생성하지 않는다. 검토된 지식이 생길 때 domain을 만든다.

## 7. 승격 기준

Notion/메모/작업 산출물을 LLM wiki canonical 문서로 승격하려면 다음 조건을 만족해야 한다.

- source가 기록되어 있다.
- 현재 기준인지, 오래된 문서인지 판단되어 있다.
- 중복 문서가 있으면 canonical 하나만 남긴다.
- 제품 요구사항/정책/결정/흐름 중 어떤 종류인지 분류되어 있다.
- frontend/backend 구현 상세와 분리되어 있다.
- secret, token, private env value가 포함되어 있지 않다.

## 8. 완료 조건

LLM wiki 위치 정책이 지켜진 상태는 다음으로 판단한다.

- LLM이 제품 정책을 물으면 `docs/product-ssot/`에서 시작할 수 있다.
- 구현 질문은 `docs/frontend/` 또는 `docs/backend/`로 자연스럽게 이동한다.
- 운영 질문은 `docs/ops/`로 이동한다.
- skill은 긴 지식을 복사하지 않고 `skills_context/SHARED/`를 읽는다.
- Notion 원본은 `notion-source-registry.yaml`에서 freshness와 canonical 여부를 확인할 수 있다.
