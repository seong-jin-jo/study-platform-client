---
description: Run the design-to-dev skill to convert a Figma component node into project component code. Use with a Figma URL.
argument-hint: <figma-url> [component-name]
version: 1.0.0
---

# /design-to-dev — Figma → 컴포넌트 코드

`/design-to-dev <figma-url> [component-name]` 입력 시 **design-to-dev 스킬**을 실행한다.

```
/design-to-dev https://figma.com/design/xxx?node-id=123 StudyCard
```

## 역할

이 파일은 인자 파싱 + 스킬 위임만 담당한다. 전체 절차(프레임 타입 분류, Code Connect 게이트, 토큰 매핑, 컴포넌트 생성, Type B VisualMatrix/Interactive, form-field traps, 백엔드 엣지케이스 게이트, 픽셀+토큰 hex 시각검증, 커밋)는 정본인 `.claude/skills/design-to-dev/SKILL.md`에 있다.

1. 첫 번째 인자 = Figma URL (`node-id` 포함). 없으면 사용자에게 요청.
2. 두 번째 인자(선택) = 컴포넌트 이름(PascalCase). 없으면 Figma 노드명에서 유도.
3. `design-to-dev` 스킬을 위 인자로 호출하고, 스킬의 절차를 그대로 따른다.

키워드 진입("컴포넌트 만들어줘" + Figma URL)과 이 슬래시 커맨드는 **동일한 산출물**을 내야 한다 — 진입 경로에 따라 품질이 갈리지 않는다.
