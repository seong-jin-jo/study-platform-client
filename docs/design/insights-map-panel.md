# /insights 바다 지도 + 섬 선택 패널 (C안)

- 결정: 회장 2026-11-16 17:59. 시안 `docs/design/shotgun/insights-uxui-v0.1.0-claude-opus-20261116-1508/` C-map-panel (모노 저장소 문서 쪽).
- 구현: `src/components/insights/insight-learning-map.tsx`, 스타일 `sprint8-insights.module.css` 맨 끝 블록.
- PC(1024 이상): 지도 오른쪽 고정 패널(`island-panel`), 첫 진입에 글이 가장 많은 섬 자동 선택.
- 휴대폰·태블릿(1023 이하): 섬을 누르면 아래에서 올라오는 시트(`island-sheet`, 모달 대화 상자).
- 패널 내용: 섬 이름, NEW/미개척, 탐험자 수, 지킴이 자리("지킴이 모집 중", 백엔드 칸 생기기 전까지), 글 목록(레벨·첫 편 무료·잠김, `/insights/<slug>` 링크), 공부방(bridgeRoomId 있으면 그 방, 없으면 "아직 연결된 공부방이 없어요" + /community), 섬 들어가기.
- 정리: P1 제목 PC 노출, P3 화두 없으면 한 줄, P4 "새로 열린 섬" 구역 제거(지도 NEW 배지로 대체), P6 미개척 섬 작게·흐리게.
- 백엔드 필요(미구현): 섬 지킴이 필드(이름·프로필).
- 테스트: `e2e/insights/island-map-panel.spec.ts`(390·820·1280), `island-map-unexplored.spec.ts`(패널 기준으로 수정).
