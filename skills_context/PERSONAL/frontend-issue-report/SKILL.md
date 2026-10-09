---
name: frontend-issue-report
description: PERSONAL workflow for creating evidence-backed frontend GitHub issues with live screenshots, red numbered annotations, grouped checklists, proposed fixes, and acceptance criteria.
---

# Frontend Issue Report

<frontend_issue_report scope="PERSONAL" repo="study-platform-client" version="2026-05-26">

## 역할

프론트엔드 UI/UX/layout 버그를 GitHub issue로 올릴 때 사용하는 PERSONAL workflow다.
목표는 글만 많은 이슈가 아니라, **실제 화면 증거 + 빨간 박스 번호 + 번호와 일치하는 체크리스트 + 해결책 + 완료 기준**을 한 세트로 만드는 것이다.

## 적용 시점

사용자가 다음과 같이 요청하면 이 workflow를 적용한다.

- 프론트 문제를 GitHub issue로 정리/생성해달라고 함
- 스크린샷 기반으로 UI 버그를 설명해달라고 함
- 좁은 화면, 모바일, 반응형, 겹침, 깨짐, overflow, footer/layout 문제를 지적함
- “빨간 박스”, “체크리스트”, “해결책도 제안” 같은 표현을 사용함

## 핵심 원칙

1. **실제 화면을 먼저 확인한다.**
   - URL, 날짜, viewport, 재현 위치를 기록한다.
   - 반응형 문제는 기본적으로 `390`, `430`, `768`, `1024`, desktop 폭을 확인한다.

2. **스크린샷은 issue의 1차 증거다.**
   - 원본 캡처와 annotated 캡처를 분리한다.
   - 원본을 덮어쓰지 않는다.

3. **빨간 박스는 번호만 표시한다.**
   - 이미지 안에 긴 설명을 넣지 않는다.
   - 빨간 박스 + 큰 번호 badge만 남긴다.
   - 설명은 issue 본문 체크리스트에서 번호로 연결한다.

4. **번호는 root problem에 매핑한다.**
   - 같은 문제가 여러 위치에서 반복되면 같은 번호를 사용한다.
   - 예: `1 = fixed CTA가 콘텐츠를 덮음`, `2 = floating action 버튼끼리 충돌`, `3 = TOP 버튼 충돌`, `4 = 섹션 제목 가림`, `5 = 푸터 모바일 레이아웃 깨짐`.

5. **체크리스트는 동어반복하지 않는다.**
   - “모바일에서 가림”, “태블릿에서 가림”, “다른 섹션에서 가림”을 별도 root issue로 반복하지 않는다.
   - root issue 아래 관찰 증거로 묶는다.

6. **이슈에는 항상 해결책을 제안한다.**
   - 증상만 나열하지 않는다.
   - breakpoint 정책, component 통합, safe-area/padding, overflow 원인 추적, footer 구조 재배치 등 가능한 해결 방향을 제안한다.
   - 코드 위치를 아직 확인하지 않았다면 “제안”으로 명시한다.

7. **완료 기준을 포함한다.**
   - viewport별 acceptance criteria를 쓴다.
   - 가능한 경우 측정 가능한 기준을 포함한다.
   - 예: `document.documentElement.scrollWidth <= window.innerWidth`.

## 실행 절차

### 1. 증거 수집

- 대상 URL 또는 로컬 페이지를 연다.
- viewport별 캡처를 만든다.
- 필요한 경우 Playwright로 다음 정보를 수집한다.

```js
document.documentElement.scrollWidth - window.innerWidth
```

- 문제 요소의 DOM 좌표가 필요하면 `getBoundingClientRect()`를 사용한다.

### 2. 빨간 박스 annotation

가능하면 `skills_context/PERSONAL/frontend-issue-report/scripts/annotate_issue_screenshots.py`를 사용한다.

JSON spec 예시:

```json
{
  "images": [
    {
      "src": "/tmp/audit/mobile-390.png",
      "out": "/tmp/audit/annotated/mobile-390-annotated.png",
      "boxes": [
        { "id": 1, "rect": [14, 654, 376, 745] },
        { "id": 2, "rect": [210, 624, 337, 720] }
      ]
    }
  ]
}
```

실행 예시:

```bash
python3 -m venv /tmp/frontend-issue-venv
/tmp/frontend-issue-venv/bin/pip install pillow
/tmp/frontend-issue-venv/bin/python \
  skills_context/PERSONAL/frontend-issue-report/scripts/annotate_issue_screenshots.py \
  /tmp/audit/annotation-spec.json
```

### 3. issue 본문 작성

아래 구조를 기본으로 사용한다.

```md
# <문제 제목>

## 요약
<root problem과 사용자 영향 1~3문장>

## 증거
- URL: <url>
- 검증일: <YYYY-MM-DD>
- 확인 viewport: <list>
- 측정값: <overflow, console error 등>

## 첨부 이미지
- `<annotated-image-1>`
- `<annotated-image-2>`

## 빨간 박스 번호별 체크리스트

### 1. <root problem>
- [ ] <관찰 증상>
- [ ] <관찰 증상>

### 2. <root problem>
- [ ] <관찰 증상>

## 제안 해결 방향

### A. <해결 방향>
- <구체적 제안>

### B. <해결 방향>
- <구체적 제안>

## 완료 기준
- [ ] <viewport별 확인 기준>
- [ ] <측정 가능한 기준>
```

## Frontend issue 품질 게이트

issue를 올리기 전 다음을 확인한다.

- 모든 첨부 annotated screenshot에 빨간 박스와 번호가 보인다.
- 모든 빨간 박스 번호는 체크리스트 heading에 정확히 한 번 등장한다.
- 같은 root problem을 다른 말로 반복하지 않는다.
- 모든 root problem에는 해결 방향 또는 완료 기준이 연결되어 있다.
- 개발자가 채팅 없이 issue만 보고 재현할 수 있다.
- `study-platform-client` 코드 수정이 필요한 후속 작업이라면 `CLAUDE.md`의 UI/스타일 규칙을 따른다.

</frontend_issue_report>
