# /insights 바다 지도 + 섬 선택 패널 (C안)

- 결정: 회장 2026-11-16 17:59. 시안 `docs/design/shotgun/insights-uxui-v0.1.0-claude-opus-20261116-1508/` C-map-panel (모노 저장소 문서 쪽).
- 구현: `src/components/insights/insight-learning-map.tsx`, 스타일 `sprint8-insights.module.css` 맨 끝 블록.
- PC(1024 이상): 지도 오른쪽 고정 패널(`island-panel`), 첫 진입에 글이 가장 많은 섬 자동 선택.
- 휴대폰·태블릿(1023 이하): 섬을 누르면 아래에서 올라오는 시트(`island-sheet`, 모달 대화 상자).
- 패널 내용: 섬 이름, NEW/미개척, 탐험자 수, 지킴이 자리("지킴이 모집 중", 백엔드 칸 생기기 전까지), 글 목록(레벨·첫 편 무료·잠김, `/insights/<slug>` 링크), 공부방(bridgeRoomId 있으면 그 방, 없으면 "아직 연결된 공부방이 없어요" + /community), 섬 들어가기.
- 정리: P1 제목 PC 노출, P3 화두 없으면 한 줄, P4 "새로 열린 섬" 구역 제거(지도 NEW 배지로 대체), P6 미개척 섬 작게·흐리게.
- 백엔드 필요(미구현): 섬 지킴이 필드(이름·프로필).
- 테스트: `e2e/insights/island-map-panel.spec.ts`(390·820·1280), `island-map-unexplored.spec.ts`(패널 기준으로 수정).

## 2026-11-17 빈 방 상태 → 인기 방 추천 (회장 2026-11-17 02:4x)

- 결정: 소속된 방이 없을 때 빈 안내 대신 인기 방을 보여 입장을 유도한다(결정.md 2026-11-17 03:0x ⑥).
- 정렬·값: 방 목록 API(`GET /community/rooms` 공개, `exploreRooms`)의 `memberCount` 내림차순 → `newPostsToday` → `roomId`. 이미 들어간 방과 회원 0명 방은 뺀다. 가짜 숫자 없음, API 값만. (`src/utils/recommended-rooms.ts`)
- 홈 오른쪽 '입장한 방 0/3' 카드(비회원)와 방 0개 회원의 '인기 방' 카드: 최대 3개, 방 이름·소개 첫 줄·멤버 수·`둘러보기`(`/community/rooms/<id>`). 추천할 방이 없으면 기존 안내 문구로 되돌아간다. (`home-feed.tsx` `RecommendedRoomRows`)
- 섬 패널 공부방 칸(`insight-learning-map.tsx`): 연결된 방이 있으면 방 이름(`bridgeRoomName` 없으면 방 목록의 이름)과 `멤버 N명`, 없으면 인기 방 최대 2개. 방 목록을 못 읽으면 이름만 보이고 멤버 수는 숨긴다.
- 백엔드·DB 변경 없음. 판 0(섬→방 연결 SQL)은 별도 적용.
- 테스트: `src/utils/recommended-rooms.test.ts`, `src/components/retention/home-feed.test.ts`(REC-ROOM-101~103), `e2e/room-recommend.spec.ts`(390·820·1280).
