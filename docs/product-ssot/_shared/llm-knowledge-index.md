# LLM knowledge index

이 파일은 LLM이 ZERO-ONE 제품 지식을 빠르게 찾기 위한 사람이 관리하는 index다.

## 사용 원칙

- 최신 기준은 `docs/product-ssot/{domain}/`의 active 문서다.
- Notion 원본 여부와 freshness는 `notion-source-registry.yaml`에서 먼저 확인한다.
- frontend 구현은 `docs/frontend/`, backend 구현은 `docs/backend/`, 운영 절차는 `docs/ops/`로 이동한다.
- deprecated 문서는 답변 근거로 사용하지 않는다. 단, 변경 이력 설명에는 사용할 수 있다.

## 현재 canonical 문서

| 질문 | 먼저 볼 위치 | 상태 |
| --- | --- | --- |
| 모노레포 전환 기준이 뭐지? | `docs/ops/mvp-to-client-monorepo.md` | active draft |
| Product SSOT 구조가 뭐지? | `docs/product-ssot/README.md` | active draft |
| Notion 문서를 어디에 등록하지? | `docs/product-ssot/_shared/notion-source-registry.yaml` | active draft |
| LLM wiki는 어디에 만들어야 하지? | `docs/product-ssot/_shared/llm-wiki-location-policy.md` | active draft |
| LLM wiki는 어떤 순서로 만들어야 하지? | `docs/product-ssot/_shared/llm-wiki-build-strategy.md` | active draft |
| LLM wiki를 만들 때 어떤 skill 조합을 쓰지? | `docs/product-ssot/_shared/llm-wiki-skill-recommendations.md` | active draft |
| frontend 구현 문서는 어디에 두지? | `docs/frontend/README.md` | active draft |
| backend 구현 문서는 어디에 두지? | `docs/backend/README.md` | active draft |

## Domain index

아직 domain별 canonical note는 생성하지 않았다. source registry에 원문을 등록하고 사람이 검토한 뒤 다음 형태로 승격한다.

```text
docs/product-ssot/auth/
docs/product-ssot/class/
docs/product-ssot/course/
docs/product-ssot/payment/
docs/product-ssot/notification/
```

## 중복/구버전 후보

아직 등록된 후보 없음.
