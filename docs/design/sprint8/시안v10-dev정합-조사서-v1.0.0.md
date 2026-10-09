# SPRINT8 시안 v10 대 dev 소스 정합 조사서 v1.0.0

> STAMP | 생성 2026-08-14 KST | 모델 gpt-5.6-sol | 에이전트 code-reviewer | 스킬 goal-lock | 기반 `sprint8-app-v10-opus5.html`, `sprint8-v10.css`, `DESIGN.md` v2.3.0, 현재 구현 소스, 기존 정합 대조표 v1.0.0 | 고민: 시각 표현은 자동 결함으로 만들지 않고 부품·기능·플로우·상태 누락만 머지 차단으로 분리했다.

## 한 줄 결론

소스 계약 70칸 중 일치 46, 불일치 18, 미검증 6이다. 컨트롤러의 해소 주장 10건은 반영 8, 부분 반영 2이며, 새 MAJOR 7건과 MINOR 2건이 있어 머지 판정은 `BLOCK`이다.

## 1. 조사 범위와 방법

- 승인 시안: `sprint8-app-v10-opus5.html`과 이 HTML이 순서대로 불러오는 v3·v7·v8·v9·v10 CSS 전부를 읽었다(`sprint8-app-v10-opus5.html:8`).
- 제품 정본: `/Users/sj/sj_code_master/zero-one/DESIGN.md` v2.3.0과 `/Users/sj/.claude/standards/design.md`. 소스 계약과 시각 표현을 분리했고, 스크린샷 없는 표현 차이는 자동 MAJOR로 올리지 않았다(`/Users/sj/.claude/standards/design.md:116`).
- 구현: 과제 지정 파일 전부와 실제 라우팅 종착점을 읽었다. `#/read`의 제품 화면은 `koan-detail.tsx`가 아니라 `src/app/(service)/insights/[id]/page.tsx:124`가 렌더하는 `blog-detail-page.tsx`다.
- 기존 대조표는 출발점으로만 쓰고 모든 판정을 원문과 현재 소스로 다시 확인했다. `docs/**/requests-*.md`는 조사 루트에서 발견되지 않았다.
- 각 화면의 8축과 6상태를 값 대 값으로 대조했다. 런타임 치수·폰트·실제 API가 필요한 항목은 미검증으로 낮췄다. 브라우저·E2E·배포는 실행하지 않았다.
- 공부방 2열은 확정 전제에 따라 일치로 처리했다. `#/parts`는 제품 라우트가 아닌 공용 부품 참조판으로 처리했다. 섬 5 대 20은 데이터 차이로 처리했다.

### 정본 핀 드리프트

과제와 구현 기록은 v10·DESIGN v2.3.0을 기반으로 하지만 승인 핀은 아직 `DESIGN.md-v2.0.0 + sprint8-app-v9-opus5`다(`pipeline-state.sprint8.md:10`). 이번 조사는 사용자 지시의 v10을 정본으로 삼았지만 승인 추적성은 불일치다.

## 2. 화면 5개 x 8축 대조

### 2.1 바다 `#/sea`

| 축 | 시안 값 | 구현 값 | 판정 | 근거 파일:줄 |
|---|---|---|---|---|
| 주축 방향 | stage 세로 흐름, 지도 뒤 오늘 화두, 이어서 여울·지난 화두 | `.seaStage`, `.stageInner` 세로, 같은 순서 | 일치 | `sprint8-app-v10-opus5.html:30`, `sprint8-app-v10-opus5.html:56`; `sprint8-insights.module.css:33`, `sprint8-insights.module.css:127` |
| 요소 순서 | 머리줄 → 지도·팝오버 → 오늘 화두 → 여울 → 지난 화두 → 안내 | 같은 DOM 순서 | 일치 | `sprint8-app-v10-opus5.html:35`, `sprint8-app-v10-opus5.html:45`, `sprint8-app-v10-opus5.html:71`, `sprint8-app-v10-opus5.html:84`; `insight-learning-map.tsx:341`, `insight-learning-map.tsx:374`, `insight-learning-map.tsx:454`, `insight-learning-map.tsx:481`, `insight-learning-map.tsx:588` |
| 열 수 | 상태별 수심대, 밴드 내 균등 분산. 지난 화두 1열 | `far → started → opened → here` 밴드 계산, 지난 화두 1열 | 일치 | `sprint8-app-v10-opus5.html:458`, `sprint8-app-v10-opus5.html:474`; `sprint8-v10-state.ts:61`, `sprint8-v10-state.ts:113`, `sprint8-insights.module.css:528` |
| 정렬·여백 | 최대 1120, 좌우 20, 지도 322/420. 현재 승인 보정은 20개 전부 표시 | 값 동일, `ISLAND_LAYOUT_LIMIT=20`까지 전부 배치 | 일치 | `sprint8-v7.css:43`, `sprint8-v7.css:67`, `sprint8-v7.css:210`; `sprint8-insights.module.css:127`, `sprint8-insights.module.css:173`; `sprint8-v10-state.ts:32`, `sprint8-v10-state.ts:98` |
| 표시·숨김 | 0건 지도 상태. 지난 화두 오류여도 "위 오늘의 화두는 이미 받아 둔 것이라 그대로 읽을 수 있습니다" | 0건 상태는 있음. map/koan 한쪽 로딩·오류도 화면 전체 조기 반환 | 불일치 | `sprint8-app-v10-opus5.html:584`, `sprint8-app-v10-opus5.html:1611`; `insight-learning-map.tsx:287`, `insight-learning-map.tsx:308` |
| 타이포 | 질문 25px/900/1.38, 데스크톱 38px/1.3, 지난 화두 15px | 같은 값 | 일치 | `sprint8-v7.css:151`, `sprint8-v7.css:217`; `sprint8-insights.module.css:457`, `sprint8-insights.module.css:517`, `sprint8-insights.module.css:1978` |
| 버튼 위계 | 오늘 화두 CTA만 rose 채움. 정렬·더 보기는 outlined | 같은 위계 | 일치 | `sprint8-app-v10-opus5.html:66`, `sprint8-v10.css:323`; `sprint8-insights.module.css:477`, `insight-learning-map.tsx:493`, `insight-learning-map.tsx:570` |
| 390·768·1440 | 390·768 모바일 계열, 1440은 1024 이상 규칙 | 구현도 1024에서 지도·타이포·정렬 전환 | 미검증 | `sprint8-app-v10-opus5.html:1885`; `sprint8-insights.module.css:615`, `sprint8-insights.module.css:1877`. 실제 좌표는 브라우저 금지로 미검증 |

### 2.2 개척지 `#/land`

| 축 | 시안 값 | 구현 값 | 판정 | 근거 파일:줄 |
|---|---|---|---|---|
| 주축 방향 | 뒤로가기 → 헤더 → 물때 → 문서 → 건너가기 | 같은 세로 흐름 | 일치 | `sprint8-app-v10-opus5.html:99`, `sprint8-app-v10-opus5.html:109`; `island-article-list.tsx:158`, `island-article-list.tsx:189`, `island-article-list.tsx:242`, `island-article-list.tsx:299` |
| 요소 순서 | 그림·이름·상태·탐험자 → 물때 → 개념글 → 화두·공부방 | 같은 순서 | 일치 | `sprint8-app-v10-opus5.html:100`; `island-article-list.tsx:164`, `island-article-list.tsx:189`, `island-article-list.tsx:227`, `island-article-list.tsx:299` |
| 열 수 | 390·768 문서 1열, 1024 이상 2열. 건너가기 1024 이상 가로 | 동일 | 일치 | `sprint8-v8.css:133`, `sprint8-v8.css:169`; `sprint8-insights.module.css:1310`, `sprint8-insights.module.css:2000`, `sprint8-insights.module.css:2006` |
| 정렬·여백 | 최대 1120, 좌우 20, 하단 26/44. 문서 gap 2/8 | 동일 | 일치 | `sprint8-v8.css:114`, `sprint8-v8.css:170`; `sprint8-insights.module.css:127`, `sprint8-insights.module.css:1310`, `sprint8-insights.module.css:1962`, `sprint8-insights.module.css:2000` |
| 표시·숨김 | 비회원 물때 숨김. 0건·로딩·오류 전용 상태. 0건 건너가기 숨김 | 같은 조건 | 일치 | `sprint8-app-v10-opus5.html:790`, `sprint8-app-v10-opus5.html:803`, `sprint8-app-v10-opus5.html:815`; `island-article-list.tsx:79`, `island-article-list.tsx:100`, `island-article-list.tsx:227`, `island-article-list.tsx:299` |
| 타이포 | 제목 24/34. 문서 제목 14/800/1.45, 설명 11.5/600/1.5 | 동일 | 일치 | `sprint8-v8.css:122`, `sprint8-v8.css:139`; `sprint8-insights.module.css:1235`, `sprint8-insights.module.css:1355`, `sprint8-insights.module.css:1366` |
| 버튼 위계 | 읽은 편 저채도, NEXT 한 편만 pill, 잠금 흐림. 하단 링크 동급 | `READ`, `NEXT`, `LOCKED` 분리, pill은 NEXT에만 | 일치 | `sprint8-app-v10-opus5.html:825`, `sprint8-app-v10-opus5.html:846`; `island-article-list.tsx:243`, `island-article-list.tsx:275`, `island-article-list.tsx:281` |
| 390·768·1440 | 390·768 한 열, 1440 두 열. 그림 88/132, 제목 24/34 | 전환값 동일 | 미검증 | `sprint8-v8.css:122`, `sprint8-v8.css:169`; `sprint8-insights.module.css:1205`, `sprint8-insights.module.css:1235`, `sprint8-insights.module.css:1991`, `sprint8-insights.module.css:1996`, `sprint8-insights.module.css:2000`. 실제 긴 제목·20편은 미검증 |

### 2.3 개념글 읽기 `#/read`

| 축 | 시안 값 | 구현 값 | 판정 | 근거 파일:줄 |
|---|---|---|---|---|
| 주축 방향 | sticky 읽기 바 → 제목·byline → 본문 → 반응 → 도착 → 다음 경로 | sticky 바 → 커버·제목 → 본문 → 반응 → 질문하기 → 저자 | 일치 | 세로 주축만 일치. `sprint8-app-v10-opus5.html:121`; `blog-detail-page.tsx:488`, `blog-detail-page.tsx:529` |
| 요소 순서 | `8편 중 6번째`, `ZERO-ONE 편집팀 · 읽는 데 7분`, 본문 뒤 다음 경로 | `{ordinal+1}번째 물길`, 발행일만. 다음 편·화두·공부방·개척지·바다 링크 없음 | 불일치 | `sprint8-app-v10-opus5.html:125`, `sprint8-app-v10-opus5.html:132`, `sprint8-app-v10-opus5.html:1077`; `blog-detail-page.tsx:498`, `blog-detail-page.tsx:557`, `insight-article-actions.tsx:141` |
| 열 수 | 본문·상태 1열 | 본문 1열 | 일치 | `sprint8-v8.css:192`, `sprint8-v9.css:106`; `blog-detail-page.tsx:529`, `insight-article-actions.tsx:84` |
| 정렬·여백 | 최대 760, 좌우 20 | `max-w-9250` 740, 좌우 24/40 | 불일치, 표현 차이 | `sprint8-v8.css:183`, `sprint8-v8.css:192`; `blog-detail-page.tsx:491`, `blog-detail-page.tsx:529`. 자동 MAJOR 아님 |
| 표시·숨김 | 비회원·재독·읽는 중·완독·마지막 편을 구분. waiting 뒤 arrive | 비회원과 섬 완전 개척만 있음. waiting·재독 안내·일반 도착·다음 경로 없음 | 불일치 | `sprint8-app-v10-opus5.html:967`, `sprint8-app-v10-opus5.html:977`, `sprint8-app-v10-opus5.html:991`, `sprint8-app-v10-opus5.html:1049`; `insight-article-actions.tsx:53`, `insight-article-actions.tsx:125`, `insight-article-actions.tsx:141` |
| 타이포 | 제목 26/900/1.35, byline 12/700, 본문 15/1.85 | 제목 26/bold/1.35, byline 없음, 본문 16/1.75와 17 | 불일치 | `sprint8-v8.css:194`, `sprint8-v8.css:195`, `sprint8-v8.css:197`; `blog-detail-page.tsx:235`, `blog-detail-page.tsx:546`, `blog-detail-page.tsx:557` |
| 버튼 위계 | 도움됨 보조. 완독 뒤 이동 링크 동급. 비회원 로그인만 채움 | 도움됨·저장은 있음. 질문하기가 채움, 완독 이동 묶음 없음 | 불일치 | `sprint8-v9.css:108`, `sprint8-app-v10-opus5.html:1068`; `insight-article-actions.tsx:101`, `blog-detail-page.tsx:579` |
| 390·768·1440 | 1열 본문 폭 고정 | 구현도 최대 폭 고정 1열 | 미검증 | `sprint8-v8.css:192`; `blog-detail-page.tsx:491`, `blog-detail-page.tsx:529`. sticky·커버 비율은 미검증 |

### 2.4 공부방 `#/room`

| 축 | 시안 값 | 구현 값 | 판정 | 근거 파일:줄 |
|---|---|---|---|---|
| 주축 방향 | 기존 방에 개척지 진입 맥락 한 줄 추가 | 기존 방 흐름·2열 유지, RoomHero에 한 줄 추가 | 일치 | `sprint8-app-v10-opus5.html:165`, `sprint8-app-v10-opus5.html:169`; `community-room-detail-page.tsx:373`, `community-room-detail-page.tsx:434` |
| 요소 순서 | `{땅} 개척지에서 들어왔습니다`가 방 제목 앞 | 제목 앞이지만 `from` 있을 때만. land는 전달, sea는 미전달 | 불일치 | `sprint8-app-v10-opus5.html:1164`; `community-room-detail-page.tsx:395`, `community-room-detail-page.tsx:434`; `island-article-list.tsx:315`, `insight-learning-map.tsx:440` |
| 열 수 | 회장 확정에 따라 제품 2열 수용 | `xl:grid-cols-[minmax(0,1fr)_316px]` | 일치 | `community-room-detail-page.tsx:735` |
| 정렬·여백 | 기존 방 정렬 유지, 진입 한 줄만 추가 | PageContainer·RoomHero·aside 유지 | 일치 | `sprint8-app-v10-opus5.html:169`; `community-room-detail-page.tsx:675`, `community-room-detail-page.tsx:735` |
| 표시·숨김 | 정상 진입이면 맥락 한 줄, 방 미연결만 데이터 예외 | 바다 정상 진입도 `from`이 없어 맥락 숨김 | 불일치 | `sprint8-app-v10-opus5.html:1139`, `sprint8-app-v10-opus5.html:1164`; `community-room-detail-page.tsx:396`, `insight-learning-map.tsx:440` |
| 타이포 | 진입 11.5/800, 제목 22/26 | 진입 `12b`, 제목 `28b` | 일치, 표현 차이 | `sprint8-v9.css:174`, `sprint8-v9.css:182`; `community-room-detail-page.tsx:386`, `community-room-detail-page.tsx:439`. 기존 방 표현은 확정 범위 |
| 버튼 위계 | 기존 참여·글쓰기 유지, 신규 범위는 맥락 한 줄 | 비회원 정착하기, 회원 질문 쓰기 주 행동 유지 | 일치 | `sprint8-app-v10-opus5.html:169`; `community-room-detail-page.tsx:665`, `community-room-detail-page.tsx:687` |
| 390·768·1440 | 회장 확정 제품 구조: 390·768 한 열, 1440 2열 | 같은 breakpoint 구조 | 미검증 | `community-room-detail-page.tsx:678`, `community-room-detail-page.tsx:735`. 실제 폭은 미검증 |

### 2.5 부품 견본 `#/parts`

제품 라우트를 요구하지 않고 공용 컴포넌트와 Storybook만 판정했다.

| 축 | 시안 값 | 구현 값 | 판정 | 근거 파일:줄 |
|---|---|---|---|---|
| 주축 방향 | 메뉴 → 아코디언 → 선택 카드 → OAuth → 페이지네이션 → 탭 | 여섯 공용 컴포넌트와 story 존재 | 일치 | `sprint8-app-v10-opus5.html:1679`; `menu/menu.stories.tsx:66`, `disclosure/disclosure.stories.tsx:44`, `selectable-card/selectable-card.stories.tsx:61`, `oauth-button/oauth-button.stories.tsx:35`, `pagination/pagination.stories.tsx:40`, `tabs/tabs.stories.tsx:25` |
| 요소 순서 | 여섯 부품의 설명·데모·값 표 | 제품 라우트 순서는 해당없음, 여섯 구현 존재 | 일치 | `sprint8-app-v10-opus5.html:1679`, `sprint8-app-v10-opus5.html:1690` |
| 열 수 | 선택 카드 390/768/1440은 1/2/3열, 1~2개는 1열. 페이지 칸은 앞뒤 1/2/3 | 선택 카드는 일치. Pagination은 뷰포트 무관 동일 배열 | 불일치 | `sprint8-app-v10-opus5.html:1794`, `sprint8-app-v10-opus5.html:1838`; `selectable-card/index.tsx:93`, `pagination/index.tsx:12` |
| 정렬·여백 | 탭 최소 88, 높이 48, 모바일 오른쪽 fade. 메뉴 200~320 | 탭에 min-width 88과 fade 없음. 메뉴 200~320 | 불일치 | `sprint8-app-v10-opus5.html:1855`, `sprint8-app-v10-opus5.html:1860`; `tabs/index.tsx:29`, `tabs/index.tsx:136`, `menu/index.tsx:62` |
| 표시·숨김 | 1페이지면 미렌더. 탭 6개 초과 전환. 메뉴 임계 시 자동 모바일 시트 | Pagination은 1페이지도 nav 렌더. Tabs 상한 전환 없음. Menu는 `mobileSheet`를 호출자가 넣음 | 불일치 | `sprint8-app-v10-opus5.html:1829`, `sprint8-app-v10-opus5.html:1861`, `sprint8-app-v10-opus5.html:1680`; `pagination/index.tsx:107`, `tabs/index.tsx:102`, `menu/index.tsx:11`, `menu/index.tsx:46` |
| 타이포 | 메뉴 14/16, 카드 16, OAuth 16, 페이지 14, 탭 16 | 같은 토큰·수치 | 일치 | `sprint8-v10.css:102`, `sprint8-v10.css:199`, `sprint8-v10.css:220`, `sprint8-v10.css:240`; 각 공용 `index.tsx` |
| 버튼 위계 | 선택·현재 상태는 두 신호, OAuth 브랜드, 현재 페이지 채움, 잠긴 탭 focus 유지 | 같은 위계 | 일치 | `sprint8-app-v10-opus5.html:1792`, `sprint8-app-v10-opus5.html:1836`, `sprint8-app-v10-opus5.html:1859`; `selectable-card/index.tsx:169`, `pagination/index.tsx:83`, `tabs/index.tsx:59` |
| 390·768·1440 | 참조판 세 폭 명시 | 다섯 component story는 세 폭. Tabs는 세 폭 story 없음 | 미검증 | `sprint8-app-v10-opus5.html:1885`; `menu/menu.stories.tsx:136`, `disclosure/disclosure.stories.tsx:135`, `selectable-card/selectable-card.stories.tsx:163`, `oauth-button/oauth-button.stories.tsx:81`, `pagination/pagination.stories.tsx:77`, `tabs/tabs.stories.tsx:39` |

## 3. 화면별 데이터 상태 6칸

| 화면 | 0건 | 1~2건 | 보통 | 아주 많을 때 | 로딩 | 오류 |
|---|---|---|---|---|---|---|
| 바다 | 일치: 지도·지난 화두 empty (`insight-learning-map.tsx:356`, `insight-learning-map.tsx:526`) | 일치: 정렬 숨김 (`insight-learning-map.tsx:490`) | 일치 | 일치: 현재 20섬 전부, 화두 10개씩 (`sprint8-v10-state.ts:32`, `insight-learning-map.tsx:569`) | 불일치: 전체 조기 반환 (`insight-learning-map.tsx:287`) | 불일치: 한쪽 실패도 전체 대체 (`insight-learning-map.tsx:308`) |
| 개척지 | 일치: empty+CTA, crossings 숨김 (`island-article-list.tsx:227`) | 일치: 한 열, NEXT pill 하나 | 일치 | 일치: 전체 문서, 1024+ 2열 | 일치: 헤더·물때·5행 skeleton (`island-article-list.tsx:79`) | 일치: 원인·재시도·바다 대안 (`island-article-list.tsx:100`) |
| 읽기 | 일치: block 0이면 `내용이 없습니다` (`blog-detail-page.tsx:564`) | 일치 | 일치 | 일치: 세로 증가, code overflow (`blog-detail-page.tsx:343`) | 불일치: 읽기 전용 대신 공용 3카드 skeleton (`src/app/(service)/insights/loading.tsx:3`) | 불일치: 읽기 맥락 없는 공용 지도 오류 (`src/app/(service)/insights/error.tsx:6`) |
| 공부방 | 일치: 피드 empty (`community-room-detail-page.tsx:844`) | 일치 | 일치 | 일치: 회원 전체, 비회원 3개 preview (`community-room-detail-page.tsx:520`) | 일치: 방·피드 skeleton (`community-room-detail-page.tsx:616`, `community-room-detail-page.tsx:807`) | 일치: 방·피드 재시도 (`community-room-detail-page.tsx:625`, `community-room-detail-page.tsx:822`) |
| 부품 견본 | 불일치: Empty story와 달리 Pagination 자체는 0/1 숨김 미강제 (`pagination/index.tsx:107`) | 불일치: 카드 1~2는 맞지만 Pagination 1페이지 잔존 | 일치 | 불일치: Tabs 상한·페이지 폭별 칸 없음 | 일치: OAuth loading·Skeleton 존재 | 미검증: 비제품 참조판의 전체 오류 계약 미정의 |

상태 표 집계: 일치 22, 불일치 7, 미검증 1.

## 4. 컨트롤러 해소 주장 10건 재검증

| 번호 | 주장 | 결과 | 근거와 판정 |
|---|---|---|---|
| 1 | 넘침 배지 제거, 섬 전부 배치 | 반영됨 | 20개 제한과 20개 slice가 일치한다(`sprint8-v10-state.ts:32`, `sprint8-v10-state.ts:98`). |
| 2 | 모바일 정렬 좌측 | 반영됨 | 기본 `margin-left:0`, 1024+만 auto(`sprint8-insights.module.css:606`, `sprint8-insights.module.css:615`). |
| 3 | 활성 섬·제목 겹침, 728px | 반영됨 | dense 모바일 `var(--spacing-9100)`, 주석에 728 산출(`sprint8-insights.module.css:184`). 실제 픽셀은 미검증. |
| 4 | 개척지 pill 위계 | 반영됨 | NEXT 한 편에만 `documentKey`(`island-article-list.tsx:275`, `island-article-list.tsx:281`). |
| 5 | 개척지 하단 숫자 | 반영됨 | 화두 `totalElements`, 방 `memberCount` 실제 응답(`island-article-list.tsx:307`, `island-article-list.tsx:319`). |
| 6 | 공부방 진입 맥락 | 부분 | land는 `?from=` 전달, sea는 미전달(`island-article-list.tsx:315`, `insight-learning-map.tsx:440`). |
| 7 | 정렬 Menu 클릭식 | 반영됨 | Radix Trigger, hover-only 없음(`insight-learning-map.tsx:491`, `menu/index.tsx:29`). |
| 8 | 더 보기 전폭 중앙 | 반영됨 | width 100%, justify center(`sprint8-insights.module.css:591`). |
| 9 | 하단 안내 축자 | 반영됨 | 시안 `:85`와 구현 `insight-learning-map.tsx:588` 축자 일치. |
| 10 | 10건 단위 + 전체 수 | 부분 | 10건씩과 total 표시. 조회 100 고정이라 101+는 추가 조회 불가(`sprint8-v10-state.ts:5`, `sprint8-v10-state.ts:7`, `koan-list.tsx:75`, `koan-list.tsx:262`). |

재검증 집계: 반영 8, 부분 2, 미반영 0.

## 5. 새로 발견한 불일치

### MAJOR

1. [승인 시안 이탈·회귀 위험] `src/components/insights/insight-learning-map.tsx:287` : map/koan 한쪽만 로딩이어도 바다 전체를 skeleton으로 바꾸고 `src/components/insights/insight-learning-map.tsx:308`은 한쪽 오류에도 정상 영역을 모두 제거한다 / 시안은 지난 화두 오류에서 "위 오늘의 화두는 이미 받아 둔 것이라 그대로 읽을 수 있습니다"라고 명시한다(`sprint8-app-v10-opus5.html:1611`) / 조회 상태를 영역별로 분리해 실패한 영역만 대체해야 한다.

2. [승인 시안 이탈·회귀 위험] `src/components/insights/insight-learning-map.tsx:440` : 바다 공부방 링크에 `?from={slug}`가 없다 / 시안은 방 상단 `{땅} 개척지에서 들어왔습니다`를 명시하고(`sprint8-app-v10-opus5.html:1164`), 구현도 쿼리가 있어야 렌더한다(`community-room-detail-page.tsx:395`) / land 링크(`island-article-list.tsx:315`)와 같은 출발 slug를 전달해야 한다.

3. [승인 시안 이탈] `src/app/(service)/insights/ui/blog-detail-page.tsx:498` : 상단이 `{ordinal+1}번째 물길`만 표시하고 전체 편 수가 없다. `src/app/(service)/insights/ui/blog-detail-page.tsx:557`에는 발행일만 있고 편집팀·읽기 시간이 없다 / 시안의 `8편 중 6번째`, `ZERO-ONE 편집팀 · 읽는 데 7분`과 어긋난다(`sprint8-app-v10-opus5.html:125`, `sprint8-app-v10-opus5.html:132`) / 필요한 meta 계약을 합의해 연결해야 한다.

4. [승인 시안 이탈·기능 누락] `src/components/insights/insight-article-actions.tsx:141` : 완독 뒤 섬 전체 개척 알림만 조건부로 나오고 다음 편·화두·공부방·개척지·바다 경로가 없다 / 시안은 일반 완독과 재독 모두 후속 경로를 명시한다(`sprint8-app-v10-opus5.html:1068`, `sprint8-app-v10-opus5.html:1077`) / 완독 결과와 문서 순서를 받아 승인 링크 묶음을 렌더해야 한다.

5. [회귀 위험] `src/app/(service)/insights/ui/koan-list.tsx:262` : 전체 수는 `totalElements`로 표시하면서 더 보기 조건은 적재된 `past.length`만 본다. 조회 상한은 100이다(`sprint8-v10-state.ts:7`) / 시안은 전체 목록을 10건씩 계속 여는 계약이다(`sprint8-app-v10-opus5.html:1625`, `sprint8-app-v10-opus5.html:1629`) / 101건 이상 서버 페이지 추가 조회가 필요하다.

6. [승인 시안 이탈] `src/components/common/ui/pagination/index.tsx:107` : 1페이지에도 nav를 렌더하고 `src/components/common/ui/pagination/index.tsx:12`는 폭과 무관한 페이지 배열을 쓴다 / 시안은 1페이지 미렌더와 390·768·1440 앞뒤 1·2·3칸을 명시한다(`sprint8-app-v10-opus5.html:1829`, `sprint8-app-v10-opus5.html:1838`) / 조기 반환과 폭별 window 계약을 구현해야 한다.

7. [승인 시안 이탈] `src/components/common/ui/tabs/index.tsx:136` : 가로 스크롤만 있고 모바일 오른쪽 fade, 최소 폭 88, 6개 초과 전환이 없다 / 시안의 세 계약(`sprint8-app-v10-opus5.html:1855`, `sprint8-app-v10-opus5.html:1860`, `sprint8-app-v10-opus5.html:1861`)과 어긋난다 / 넘침 표시와 상한 정책을 구현하거나 6개 초과 사용을 차단해야 한다.

### MINOR

1. [토큰 위반] `src/app/(service)/insights/ui/sprint8-insights.module.css:2` : `#fff1f3`, `#f63d68`, `#181d27` 등 색상 리터럴 26개를 모듈 변수로 재정의한다 / DESIGN.md는 `global.css` 토큰을 진실원으로 둔다(`/Users/sj/sj_code_master/zero-one/DESIGN.md:423`) / 전역 semantic token으로 치환해야 한다.

2. [토큰 위반] `src/app/(service)/insights/ui/blog-detail-page.tsx:235` : `text-[16px]`, `leading-[1.75]`, `mt-[60px]`, `h-[360px]`, `min-h-[200px]`과 `src/app/(service)/insights/ui/blog-detail-page.tsx:579`의 raw rose·gray·gradient를 쓴다 / DESIGN.md는 임의 px와 raw 값을 금지한다(`/Users/sj/sj_code_master/zero-one/DESIGN.md:409`) / typography·spacing·semantic color token으로 치환해야 한다.

### 기록 위험

- `pipeline-state.sprint8.md:10`의 승인 핀이 v9·DESIGN v2.0.0이다. v10·v2.3.0 정본을 다시 핀하지 않으면 다음 리뷰가 다른 기준을 읽는다.
- `docs/구현현황.md:205`부터 `docs/구현현황.md:293`까지 병합 충돌 표지가 남아 있다. 이번 조사는 양쪽 내용을 증거로만 읽고 정본 확정으로 보지 않았다.

## 6. 판정 요약

| 범위 | 일치 | 불일치 | 미검증 | 합계 |
|---|---:|---:|---:|---:|
| 화면 5개 x 8축 | 24 | 11 | 5 | 40 |
| 화면 5개 x 상태 6칸 | 22 | 7 | 1 | 30 |
| 전체 | **46** | **18** | **6** | **70** |

불일치 셀은 같은 근본 결함이 여러 축에 걸친 중복을 포함한다. 고유 지적은 MAJOR 7, MINOR 2다.

### 4축 판정

- 승인 시안 이탈: 지적 6건. 바다 부분 오류 격리, 공부방 출발 맥락, 읽기 상단 meta, 완독 후 이동, Pagination, Tabs 계약이 어긋난다.
- 회귀 위험: 지적 3건. 독립 조회 한쪽 실패가 전체 화면을 지우고, 바다 공부방 경로가 맥락을 잃으며, 지난 화두 101건 이상을 끝까지 열 수 없다.
- 토큰 위반: 지적 2건. Sprint8 모듈 색상 리터럴과 BlogDetail 임의 px·raw palette·gradient가 남아 있다.
- 무기록 삭제: 미검토. 읽기 후속 경로는 승인 계약상 누락이지만, git diff·삭제 전 기준·삭제 사유를 조사하지 말라는 git 조작 금지 범위 때문에 실제 삭제인지는 단언하지 않았다.

### 셀프심문

"내가 PASS를 준다면, 회장이 dev에서 직접 써보고 발견할 가장 그럴듯한 문제는 무엇인가?"

바다에서 공부방으로 바로 들어가면 개척지 맥락이 사라지는 것, 개념글을 끝까지 읽어도 다음 편·개척지·바다로 이어지는 길이 없는 것, 지난 화두가 100건을 넘었는데 전체 수만 크고 더 보기가 끝나는 것이다. 모두 소스에서 확인해 MAJOR로 반영했다.

REVIEW_VERDICT: BLOCK

SKILLS_USED: goal-lock

SKILLS_SKIPPED: 코드리뷰 전용 매칭 스킬은 제공 목록에 없었다. 외부 벤치마크는 승인 소스 축자 대조 과업과 브라우저·외부 조사 금지 범위 때문에 수행하지 않았다.

벤치마크: 해당 없음. 이 과업은 외부 사례를 차용하는 설계 작업이 아니라, 사용자가 고정한 승인 시안과 현재 소스를 축자 대조하는 조사이며 브라우저·외부 조사가 금지됐다.

소스 1: `/Users/sj/sj_code_master/zero-one/docs/prototype/sprint8-koan/sprint8-app-v10-opus5.html`과 연결 CSS v3·v7·v8·v9·v10.

소스 2: `/Users/sj/sj_code_master/zero-one/DESIGN.md` v2.3.0과 `/Users/sj/.claude/standards/design.md`.

소스 3: `src/components/insights/insight-learning-map.tsx`, `src/app/(service)/insights/ui/*`, `src/components/community/pages/community-room-detail-page.tsx` 및 실제 읽기 라우팅 종착점.

SOURCES: `/Users/sj/sj_code_master/zero-one/docs/prototype/sprint8-koan/sprint8-app-v10-opus5.html`; 같은 폴더의 `sprint8-v3.css`, `sprint8-v7.css`, `sprint8-v8.css`, `sprint8-v9.css`, `sprint8-v10.css`; `/Users/sj/sj_code_master/zero-one/DESIGN.md` v2.3.0; `/Users/sj/.claude/standards/design.md`; `/Users/sj/sj_code_master/zero-one/_wt-s8-r4/pipeline-state.sprint8.md`; `/Users/sj/sj_code_master/zero-one/_wt-s8-r4/docs/design/sprint8/시안v10-구현-정합대조표-v1.0.0.md`; 본문에 인용한 현재 구현 파일.

모델: gpt-5.6-sol

MODEL: gpt-5.6-sol
