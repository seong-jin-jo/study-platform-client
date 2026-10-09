import { createServer } from 'node:http';

// 기본값 3290 = e2e/support/fixture-api.ts 의 FIXTURE_API_BASE 기본 포트와 정합.
// scripts/test/sprint8-ui-fixture-contract.test.mjs 처럼 계약 테스트가 다른
// 포트를 쓰고 싶으면 SPRINT8_FIXTURE_PORT 로 덮어쓴다.
const port = Number(process.env.SPRINT8_FIXTURE_PORT ?? 3290);
const now = '2026-08-04T09:00:00+09:00';
let publicSeoUpstreamFailure = false;
const requestCounts = new Map();
const initialLifecycle = () => ({
  profileActive: true,
  post801Active: true,
  room8Active: true,
  koan1Active: true,
});
let lifecycle = initialLifecycle();

const questions = [
  [
    '프로젝트 SSH 키가 이미 있는데 인스턴스 키를 더하면, 둘은 공존할까 덮어쓸까?',
    '배포·운영',
    'dep',
    3,
    312,
  ],
  ['배포는 성공이라는데 화면은 옛날 그대로다', '배포·운영', 'dep', 4, 113],
  ['인덱스를 걸었는데 왜 더 느려졌을까', '데이터베이스', 'db', 6, 106],
  ['로그를 남겼는데 서버를 다시 띄우면 사라진다', '배포·운영', 'dep', 2, 99],
  ['https가 붙었는데 왜 "안전하지 않음"이 뜰까', '네트워크·보안', 'net', 5, 92],
  ['상태 관리 라이브러리를 안 쓰면 정말 안 되나', '프론트엔드', 'web', 1, 85],
  ['브랜치를 지웠는데 커밋은 어디로 갔나', '협업·도구', 'cs', 3, 78],
].map(
  ([question, categoryName, categorySlug, answerCount, viewCount], index) => ({
    koanId: index + 1,
    categorySlug,
    categoryName,
    question,
    answerCount,
    viewCount,
    publishedAt: new Date(Date.parse(now) - index * 2 * 86400000).toISOString(),
  }),
);

const article = (island, index) => ({
  documentId: `${island.slug}-doc-${index + 1}`,
  slug: `${island.slug}-article-${index + 1}`,
  title: island.titles[index],
  description:
    island.descriptions?.[index] ??
    '현장에서 바로 구분할 수 있도록 핵심 원리와 실패 조건을 함께 봅니다.',
  coverUrl: 'http://127.0.0.1:3212/uploads/cover.png',
  level: index === 0 ? 'BEGINNER' : index < 3 ? 'INTERMEDIATE' : 'ADVANCED',
  unlockCost: index === 0 ? 0 : 1,
  accessLevel:
    index === 0 ? 'FREE' : index < island.read ? 'UNLOCKED' : 'LOCKED',
  required: true,
  state:
    index < island.read ? 'READ' : index === island.read ? 'NEXT' : 'LOCKED',
  socialProof: {
    viewCount: island.slug === 'dep' && index === 0 ? 396 : 128 + index * 17,
    helpfulCount: island.slug === 'dep' && index === 0 ? 37 : 12 + index,
    explorerCount: island.explorers,
    helpfulByMe: false,
  },
});

const islandSeeds = [
  {
    slug: 'dep',
    name: '배포·운영',
    read: 5,
    explorers: 312,
    titles: [
      '배포가 끝났다는 말은 무엇이 끝났다는 뜻인가',
      '빌드 산출물은 어디에 남고 언제 지워지는가',
      '무중단 배포가 실제로 멈추는 순간',
      '롤백은 되돌리는 것이 아니라 다시 배포하는 것이다',
      'SSH 키는 어디에 저장되고 누가 읽는가',
      '환경변수는 언제 읽히고 언제 굳는가',
      '로그를 컨테이너 안에 남기면 안 되는 이유',
      '배포 기록을 남기지 않으면 무엇을 잃는가',
    ],
    descriptions: [
      '빌드·전송·전환 셋 중 어디까지가 배포인지부터 가른다.',
      '캐시가 부풀어 디스크를 먹는 사고의 출발점.',
      '헬스체크가 통과하는 시점과 트래픽이 넘어가는 시점의 간격.',
      '이전 이미지를 다시 올리는 일이라 시간이 든다.',
      '프로젝트 키와 인스턴스 키가 겹칠 때 무슨 일이 생기나.',
      '빌드 타임과 런타임을 헷갈리면 값이 안 바뀐다.',
      '재시작하면 사라지는 이유와 대안.',
      '원장이 없으면 다음 배포가 막힌다.',
    ],
  },
  {
    slug: 'db',
    name: '데이터베이스',
    read: 6,
    explorers: 204,
    titles: [
      '데이터가 저장되는 자리',
      '트랜잭션의 경계',
      '인덱스가 찾는 방법',
      '락과 충돌',
      '백업과 복구',
      '마이그레이션 순서',
    ],
  },
  {
    slug: 'cs',
    name: '협업·도구',
    read: 2,
    explorers: 171,
    titles: [
      'Git이 기억하는 것',
      '브랜치가 갈라지는 이유',
      '리뷰가 지키는 경계',
      '자동화가 실패하는 곳',
      '팀 규칙의 비용',
    ],
  },
  {
    slug: 'net',
    name: '네트워크·보안',
    read: 0,
    explorers: 96,
    titles: [
      '요청은 어디를 지나가는가',
      'DNS가 주소를 찾는 법',
      'TLS가 증명하는 것',
      '세션과 토큰',
      '방화벽의 경계',
    ],
  },
  {
    slug: 'web',
    name: '프론트엔드',
    read: 0,
    explorers: 128,
    titles: [
      '브라우저가 화면을 그리는 순서',
      '상태는 어디에 머무는가',
      '서버와 클라이언트의 경계',
      '접근 가능한 인터페이스',
      '느린 화면을 찾는 법',
    ],
  },
  {
    slug: 'ai',
    name: 'AI 에이전트',
    read: 1,
    explorers: 143,
    titles: [
      '에이전트가 기억하는 범위',
      '도구 호출이 실패하는 경계',
      '검증 가능한 위임',
      '프롬프트보다 강한 계약',
      '자동화의 중단 조건',
    ],
  },
  {
    slug: 'cloud',
    name: '클라우드',
    read: 0,
    explorers: 118,
    titles: [
      '서버가 빌려 쓰는 자원',
      '리전과 존의 거리',
      '오토스케일의 시작점',
      '관리형 서비스의 책임',
      '비용 알림의 기준',
    ],
  },
  {
    slug: 'career',
    name: '커리어',
    read: 0,
    explorers: 87,
    titles: [
      '포트폴리오가 증명하는 것',
      '경험을 문제로 설명하는 법',
      '기술 선택의 근거',
      '리뷰를 성장 기록으로 남기기',
      '면접에서 모르는 것을 다루는 법',
    ],
  },
  {
    slug: 'be',
    name: '백엔드',
    read: 0,
    explorers: 134,
    titles: [
      'API 계약이 깨지는 순간',
      '트랜잭션 경계를 잡는 법',
      '재시도가 데이터를 중복하지 않게',
      '인덱스는 언제 비용이 되는가',
      '장애 범위를 줄이는 격리',
    ],
  },
];

if (process.env.SPRINT8_D13_MANY === '1') {
  const d13Names = [
    ['database', '데이터베이스'],
    ['web-principles', '웹의 작동 원리'],
    ['api-communication', 'API와 통신'],
    ['computer-architecture', '컴퓨터 구조'],
    ['deployment', '배포와 운영'],
    ['network-basics', '네트워크 기초'],
    ['operating-system', '운영체제'],
    ['cloud-introduction', '클라우드 입문'],
    ['security', '보안의 기초'],
    ['testing', '테스트 설계'],
    ['frontend', '프론트엔드'],
    ['backend-structure', '백엔드 구조'],
    ['container', '컨테이너'],
    ['cache', '캐시 전략'],
    ['data-structure', '자료구조'],
    ['algorithm', '알고리즘'],
    ['message-queue', '메시지 큐'],
    ['observability', '관측 가능성'],
    ['distributed-system', '분산 시스템'],
    ['software-design', '소프트웨어 설계'],
  ];
  islandSeeds.splice(
    0,
    islandSeeds.length,
    ...d13Names.map(([slug, name]) => ({
      slug,
      name,
      read: 0,
      explorers: 0,
      titles: [`${name} 첫 개념`],
    })),
  );
  questions[0] = {
    ...questions[0],
    categorySlug: 'database',
    categoryName: '데이터베이스',
    question: '좋은 데이터 구조는 무엇을 지키고, 무엇을 포기할까요?',
  };
}

const islands = islandSeeds.map((seed, index) => ({
  islandId: index + 1,
  slug: seed.slug,
  name: seed.name,
  presentationTier: index < 8 ? 'OCEAN' : 'NEW',
  firstFreeDocumentId: `${seed.slug}-doc-1`,
  bridgeRoomId: 8 + index,
  bridgeRoomName: `${seed.name}방`,
  progress: {
    read: seed.read,
    total: seed.titles.length,
    conquered: seed.read >= seed.titles.length,
    conqueredAt: seed.read >= seed.titles.length ? now : null,
  },
  explorerCount: seed.explorers,
  articles: seed.titles.map((_, articleIndex) => article(seed, articleIndex)),
}));

const page = (items) => ({
  items,
  page: 1,
  size: items.length,
  totalElements: items.length,
  totalPages: 1,
  hasNext: false,
  hasPrevious: false,
});
const emptyPage = () => page([]);
const ok = (content) => ({ statusCode: 200, timestamp: now, content });

const room8 = {
  roomId: 8,
  cohortId: null,
  slug: 'deploy-ops',
  code: 'deploy',
  name: '배포·운영방',
  description: '배포와 운영의 실전 경험을 나눕니다.',
  bannerUrl: null,
  axisTags: [{ code: 'deploy', label: '배포·운영', axis: 'GOAL' }],
  jobAxis: [],
  goalAxis: [{ code: 'deploy', label: '배포·운영', axis: 'GOAL' }],
  levelAxis: [],
  stats: { memberCount: 14, postCount7d: 3, commentCount7d: 18 },
  memberCount: 14,
  newPostsToday: 1,
  liveSignal: true,
  membership: { state: 'NONE', canJoin: true },
  ownership: {
    state: 'ACTIVE',
    ownerPublicProfileUuid: 'room-owner-dep',
    claimable: false,
    revision: 1,
  },
  admissionQuestions: [],
  members: {
    items: [
      {
        publicProfileUuid: 'room-owner-dep',
        nickname: '조성진',
        profileImageUrl: null,
        joinedAt: now,
        newcomer: false,
      },
    ],
    nextCursor: null,
  },
  activity: { posts7d: 3, comments7d: 18, helpful7d: 5, activeMembers7d: 14 },
  quietState: { quiet: false, reason: null },
  rules: [{ order: 1, body: '질문에는 확인한 증거를 함께 남겨요.' }],
  revision: 1,
};

const roomSummaries = [
  room8,
  {
    ...room8,
    roomId: 9,
    slug: 'frontend-practice',
    code: 'frontend',
    name: '프론트엔드 실습방',
    description: '브라우저 화면과 인터랙션을 함께 검증합니다.',
    goalAxis: [{ code: 'frontend', label: '프론트엔드', axis: 'GOAL' }],
    axisTags: [{ code: 'frontend', label: '프론트엔드', axis: 'GOAL' }],
    memberCount: 11,
    newPostsToday: 2,
    stats: { memberCount: 11, postCount7d: 5, commentCount7d: 12 },
  },
  {
    ...room8,
    roomId: 10,
    slug: 'ai-automation',
    code: 'automation',
    name: 'AI 자동화 실험방',
    description: '반복 업무를 줄인 실제 흐름과 실패를 나눕니다.',
    goalAxis: [{ code: 'automation', label: '업무 자동화', axis: 'GOAL' }],
    axisTags: [{ code: 'automation', label: '업무 자동화', axis: 'GOAL' }],
    memberCount: 16,
    newPostsToday: 3,
    stats: { memberCount: 16, postCount7d: 7, commentCount7d: 20 },
  },
];

const courseSummaries = [
  {
    courseId: 1,
    slug: 'claude-cowork',
    title: '클로드 Cowork로 업무 자동화하기',
    headline: '반복 업무를 에이전트에게 넘기는 첫 흐름',
    summary: '기획부터 검증까지 실제 자동화 흐름을 만듭니다.',
    thumbnailUrl: null,
    status: 'OPEN',
    tags: ['업무 자동화', '클로드'],
    learnerCount: 28,
    learnerLabel: '28명이 학습 중',
    regularPrice: 129000,
    discountPrice: 99000,
    ctaType: 'DETAIL',
  },
  {
    courseId: 2,
    slug: 'vibe-coding-start',
    title: '바이브 코딩 첫 서비스 만들기',
    headline: '아이디어를 배포 가능한 서비스로',
    summary: '화면, API, 배포를 한 흐름으로 연결합니다.',
    thumbnailUrl: null,
    status: 'COMING_SOON',
    tags: ['바이브 코딩', '입문'],
    learnerCount: 17,
    learnerLabel: '17명이 기다리는 중',
    regularPrice: null,
    discountPrice: null,
    ctaType: 'ALERT_SUBSCRIBE',
  },
  {
    courseId: 3,
    slug: 'service-security',
    title: '내 서비스를 지키는 보안 기초',
    headline: '출시 전에 막아야 할 취약점',
    summary: '인증과 권한 경계를 실습으로 확인합니다.',
    thumbnailUrl: null,
    status: 'COMING_SOON',
    tags: ['보안', '서비스 운영'],
    learnerCount: 12,
    learnerLabel: '12명이 기다리는 중',
    regularPrice: null,
    discountPrice: null,
    ctaType: 'ALERT_SUBSCRIBE',
  },
];

const roomPosts = [
  [
    '해원',
    '무중단 배포라는데 30초쯤 502가 뜹니다',
    '헬스체크는 통과했는데 트래픽이 넘어가기 전이라 그런 것 같습니다. 저만 그런가요.',
    7,
    2,
  ],
  [
    '태오',
    '환경변수 바꾸고 재배포했는데 값이 그대로입니다',
    '빌드 타임에 굳은 값이었습니다. 같은 걸로 이틀 날렸습니다.',
    3,
    6,
  ],
  [
    '서아',
    '롤백 눌렀는데 왜 4분이나 걸리나 했더니',
    '되돌리는 게 아니라 이전 이미지를 다시 배포하는 거더군요. 개념글 4편 읽고 이해했습니다.',
    8,
    19,
  ],
].map(([author, title, excerpt, commentCount, hoursAgo], index) => ({
  postId: 801 + index,
  revision: 1,
  board: '질문',
  title,
  excerpt,
  previewImageUrl: null,
  previewImageAlt: null,
  author: {
    memberId: index + 2,
    name: author,
    profileImageUrl: null,
    role: 'member',
  },
  stats: { viewCount: 42 - index * 5, likeCount: 6 - index, commentCount },
  viewer: { isAuthenticated: false, canEdit: false, canDelete: false },
  createdAt: new Date(
    Date.parse(now) - Number(hoursAgo) * 3600000,
  ).toISOString(),
  updatedAt: new Date(
    Date.parse(now) - Number(hoursAgo) * 3600000,
  ).toISOString(),
}));
const roomPost = roomPosts[0];

const qnaDetail = {
  question: {
    questionId: 101,
    revision: 1,
    title: questions[0].question,
    contentHtml: '<p>SSH 키가 적용되는 범위를 묻는 화두입니다.</p>',
    excerpt: 'SSH 키 적용 범위',
    author: { memberId: 1, name: 'ZERO-ONE 운영팀', role: 'developer' },
    stats: {
      viewCount: 312,
      answerCount: 3,
      questionCommentCount: 0,
      likeCount: 24,
    },
    acceptedAnswerId: 1001,
    createdAt: now,
    updatedAt: now,
  },
  viewer: {
    isAuthenticated: false,
    canEditQuestion: false,
    canDeleteQuestion: false,
    canCreateAnswer: false,
    canAcceptAnswer: false,
    myAnswerId: null,
    questionReaction: null,
  },
  acceptedAnswer: null,
  questionCommentsPage: emptyPage(),
  answersPage: page([
    {
      answerId: 1001,
      revision: 1,
      contentHtml:
        '<p>스냅샷으로 만든 서버에서는 차단 설정도 함께 복제됐습니다.</p>',
      author: { memberId: 2, name: '현장 개발자', role: 'developer' },
      stats: { commentCount: 2, likeCount: 18 },
      isAccepted: true,
      viewer: {
        canEdit: false,
        canDelete: false,
        canComment: false,
        reaction: null,
      },
      createdAt: now,
      updatedAt: now,
    },
    {
      answerId: 1002,
      revision: 1,
      contentHtml:
        '<p>OS Login을 켠 프로젝트에서는 메타데이터 키보다 IAM 권한을 먼저 확인했습니다.</p>',
      author: { memberId: 3, name: '클라우드 엔지니어', role: 'developer' },
      stats: { commentCount: 1, likeCount: 11 },
      isAccepted: false,
      viewer: {
        canEdit: false,
        canDelete: false,
        canComment: false,
        reaction: null,
      },
      createdAt: now,
      updatedAt: now,
    },
  ]),
};

// 앱 origin = run-sprint8-fixture-e2e.sh 가 띄우는 Next.js 앱 주소(기본 3299).
// SPRINT8_APP_PORT 로 러너와 정합을 맞춘다 — 하드코딩된 포트(구 3210)는
// 러너가 3299 로 앱을 띄우면서 모든 XHR/fetch 를 CORS 로 막는 사고를 냈다.
const appOrigin =
  process.env.SPRINT8_APP_ORIGIN?.trim() ??
  `http://127.0.0.1:${process.env.SPRINT8_APP_PORT ?? 3299}`;

const json = (res, body, status = 200) => {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': appOrigin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, X-Insight-Viewer-Key',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  });
  res.end(JSON.stringify(body));
};

createServer((req, res) => {
  if (req.method === 'OPTIONS') return json(res, {});
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
  const path = url.pathname;

  if (req.method === 'POST' && path === '/__control/request-counts/reset') {
    requestCounts.clear();
    return json(res, { content: {} });
  }
  if (req.method === 'GET' && path === '/__control/request-counts') {
    return json(res, { content: Object.fromEntries(requestCounts) });
  }
  if (path.startsWith('/api/')) {
    requestCounts.set(path, (requestCounts.get(path) ?? 0) + 1);
  }

  if (req.method === 'POST' && path === '/__control/public-seo-upstream/fail') {
    publicSeoUpstreamFailure = true;
    return json(res, { content: { failed: true } });
  }
  if (
    req.method === 'POST' &&
    path === '/__control/public-seo-upstream/recover'
  ) {
    publicSeoUpstreamFailure = false;
    return json(res, { content: { failed: false } });
  }
  if (req.method === 'POST' && path === '/__control/lifecycle/reset') {
    lifecycle = initialLifecycle();
    return json(res, { content: lifecycle });
  }
  if (req.method === 'POST' && path.startsWith('/__control/lifecycle/')) {
    const action = path.slice('/__control/lifecycle/'.length);
    if (action === 'profile-inactive') lifecycle.profileActive = false;
    else if (action === 'post-801-delete') lifecycle.post801Active = false;
    else if (action === 'room-8-archive') lifecycle.room8Active = false;
    else if (action === 'koan-1-retract') lifecycle.koan1Active = false;
    else return json(res, { code: 'UNKNOWN_LIFECYCLE_ACTION' }, 400);
    return json(res, { content: lifecycle });
  }
  if (publicSeoUpstreamFailure && path.startsWith('/api/')) {
    return json(res, { code: 'QA_UPSTREAM_FAIL' }, 500);
  }

  if (path === '/api/v1/auth/access-token/refresh') {
    return json(res, { content: {} });
  }
  if (path === '/api/v1/home/public-feed') {
    return json(res, {
      content: {
        topInsights: islands.slice(0, 3).map((island, index) => ({
          id: index + 1,
          board: island.slug,
          title: island.articles[0].title,
          excerpt: island.articles[0].description,
          viewCount: island.explorerCount,
        })),
        activeRooms: roomSummaries.map((room) => ({
          id: room.roomId,
          goalLabel: room.name,
          memberCount: room.memberCount,
          todayQuestions: room.newPostsToday,
        })),
        newMembersWeek: {
          total: 9,
          byInterest: [
            { interest: '웹 개발', count: 4 },
            { interest: '업무 자동화', count: 3 },
            { interest: '서비스 운영', count: 2 },
          ],
        },
        hotQuestions: questions.slice(0, 3).map((question) => ({
          id: question.koanId,
          title: question.question,
          excerpt: `${question.categoryName}에서 확인할 선택 기준`,
          answerCount: question.answerCount,
        })),
      },
    });
  }
  if (path === '/api/v5/courses') {
    return json(res, { content: { content: courseSummaries } });
  }
  if (path === '/api/v1/insight/map')
    return json(
      res,
      ok({ islands, readingBudget: { balance: 5, dailyCap: 5 } }),
    );
  const islandMatch = path.match(/^\/api\/v1\/insight\/islands\/(\d+)$/);
  if (islandMatch)
    return json(
      res,
      ok(islands.find((item) => item.islandId === Number(islandMatch[1]))),
    );
  if (path === '/api/v1/koans')
    return json(res, {
      data: {
        ...page(
          questions.filter(
            (item) => item.koanId !== 1 || lifecycle.koan1Active,
          ),
        ),
        size: Number(url.searchParams.get('size') ?? questions.length),
      },
    });
  const koanDetailMatch = path.match(/^\/api\/v1\/koans\/(\d+)$/);
  if (koanDetailMatch) {
    if (Number(koanDetailMatch[1]) === 1 && !lifecycle.koan1Active)
      return json(res, { code: 'NOT_FOUND' }, 404);
    const koan = questions[Number(koanDetailMatch[1]) - 1];
    if (!koan) return json(res, { code: 'NOT_FOUND' }, 404);
    return json(res, {
      data: {
        ...koan,
        conceptSummary:
          '클라우드 VM의 SSH 키는 서버 안 파일이 아니라 메타데이터 이름표 두 층에 붙습니다.',
        modelAnswerMd:
          '**공존합니다. 다만 조건이 하나 붙습니다.**\n\n인스턴스 수준 키를 추가해도 프로젝트 수준 키는 지워지지 않습니다. 프로젝트 전체 SSH 키 차단을 켜면 프로젝트 층을 읽지 않습니다.\n\n- 기본값: 두 키 모두 통함\n- 차단 켜짐: 인스턴스 키만 통함',
        qnaQuestionId: 101,
        corrections: [],
      },
    });
  }
  if (path === '/api/v1/koans/1/corrections')
    return json(res, {
      data: [
        {
          correctionId: 1,
          fieldName: 'modelAnswerMd',
          beforeText: '인스턴스 키가 프로젝트 키를 삭제합니다.',
          afterText:
            '두 키는 공존하고 차단 설정에 따라 프로젝트 키를 무시합니다.',
          reason: '사실 정정',
          correctedAt: '2026-08-02T14:20:00+09:00',
        },
      ],
    });
  if (path === '/api/v1/community/questions/101')
    return json(res, { content: qnaDetail });
  if (path === '/api/v1/community/questions/101/seo-document')
    return json(res, {
      content: {
        resourceType: 'QNA_QUESTION',
        questionId: 101,
        canonicalPath: '/community/questions/101',
        title: questions[0].question,
        contentHtml: '<p>SSH 키가 적용되는 범위를 묻는 화두입니다.</p>',
        excerpt: 'SSH 키 적용 범위',
        author: { name: 'ZERO-ONE 운영팀' },
        acceptedAnswer: {
          answerId: 1001,
          contentHtml:
            '<p>스냅샷으로 만든 서버에서는 차단 설정도 함께 복제됐습니다.</p>',
          author: { name: '현장 개발자' },
          createdAt: now,
          updatedAt: now,
          commentCount: 2,
          likeCount: 18,
        },
        answers: [
          {
            answerId: 1002,
            contentHtml:
              '<p>OS Login을 켠 프로젝트에서는 IAM 권한을 먼저 확인합니다.</p>',
            author: { name: '클라우드 엔지니어' },
            createdAt: now,
            updatedAt: now,
            commentCount: 1,
            likeCount: 11,
          },
        ],
        answerCount: 2,
        createdAt: now,
        updatedAt: now,
      },
    });
  const roomSeoDocumentMatch = path.match(
    /^\/api\/v1\/community\/rooms\/(\d+)\/seo-document$/,
  );
  if (roomSeoDocumentMatch) {
    const roomId = Number(roomSeoDocumentMatch[1]);
    if (roomId === 8 && !lifecycle.room8Active)
      return json(res, { code: 'NOT_FOUND' }, 404);
    return json(res, {
      content: {
        resourceType: 'COMMUNITY_ROOM',
        roomId,
        canonicalPath: `/community/rooms/${roomId}`,
        name: room8.name,
        description: room8.description,
        posts: roomPosts.map((post) => ({
          postId: post.postId,
          title: post.title,
          publicSummary: post.excerpt,
          canonicalPath: `/community/${post.postId}`,
          updatedAt: post.updatedAt,
        })),
        updatedAt: now,
      },
    });
  }
  if (path === '/__legacy/community/rooms/8/seo-document')
    return json(res, {
      content: {
        resourceType: 'COMMUNITY_ROOM',
        roomId: 8,
        canonicalPath: '/community/rooms/8',
        name: '배포·운영방',
        description: '배포와 운영의 실전 경험을 나눅니다.',
        posts: [
          {
            postId: 801,
            title: '롤백 기준',
            publicSummary: '장애 전에 롤백 기준을 정합니다.',
            canonicalPath: '/community/801',
            updatedAt: now,
          },
        ],
        updatedAt: now,
      },
    });
  if (path === '/api/v1/community/rooms/8' && !lifecycle.room8Active)
    return json(res, { code: 'NOT_FOUND' }, 404);
  if (path === '/api/v1/community/rooms/8')
    return json(res, { content: room8 });
  if (path === '/api/v1/community/rooms')
    return json(res, {
      content: {
        myRooms: [],
        exploreRooms: roomSummaries,
        axes: {
          job: [],
          goal: roomSummaries.flatMap((room) => room.goalAxis),
          level: [],
        },
        activeRoomCount: 0,
        activeRoomLimit: 3,
      },
    });
  const communityPostMatch = path.match(/^\/api\/v1\/community\/posts\/(\d+)$/);
  if (communityPostMatch) {
    if (
      Number(communityPostMatch[1]) === 801 &&
      (!lifecycle.post801Active || !lifecycle.room8Active)
    )
      return json(res, { code: 'NOT_FOUND' }, 404);
    const post = roomPosts.find(
      (item) => item.postId === Number(communityPostMatch[1]),
    );
    if (!post) return json(res, { code: 'NOT_FOUND' }, 404);
    return json(res, {
      content: {
        access: {
          mode: 'TEASER',
          reason: 'ROOM_MEMBERSHIP_REQUIRED',
          roomId: 8,
          canJoin: true,
        },
        post: {
          postId: post.postId,
          roomId: 8,
          board: post.board,
          title: post.title,
          author: { displayName: post.author.name },
          createdAt: post.createdAt,
          teaserHtml: `<p>${post.excerpt}</p>`,
          stats: {
            viewCount: post.stats.viewCount,
            commentCount: post.stats.commentCount,
            helpfulCount: post.stats.likeCount,
          },
        },
      },
    });
  }
  if (path === '/__legacy/community/posts/801')
    return json(res, {
      content: {
        access: {
          mode: 'TEASER',
          reason: 'ROOM_MEMBERSHIP_REQUIRED',
          roomId: 8,
          canJoin: true,
        },
        post: {
          postId: 801,
          roomId: 8,
          board: 'free',
          title: roomPost.title,
          author: { displayName: roomPost.author.name },
          createdAt: now,
          teaserHtml: '<p>장애 전에 롤백 기준을 정합니다.</p>',
          stats: { viewCount: 34, commentCount: 3, helpfulCount: 8 },
        },
      },
    });
  if (path === '/api/v1/community/posts')
    return json(res, {
      content: {
        popularItems: roomPosts,
        items: roomPosts,
        page: 1,
        size: roomPosts.length,
        totalElements: roomPosts.length,
        totalPages: 1,
        hasNext: false,
        hasPrevious: false,
        totalPostCount: roomPosts.length,
      },
    });
  const communityPostSeoMatch = path.match(
    /^\/api\/v2\/community\/posts\/(\d+)\/seo-document$/,
  );
  if (communityPostSeoMatch) {
    if (
      Number(communityPostSeoMatch[1]) === 801 &&
      (!lifecycle.post801Active || !lifecycle.room8Active)
    )
      return json(res, { code: 'NOT_FOUND' }, 404);
    const post = roomPosts.find(
      (item) => item.postId === Number(communityPostSeoMatch[1]),
    );
    if (!post) return json(res, { code: 'NOT_FOUND' }, 404);
    return json(res, {
      content: {
        resourceType: 'COMMUNITY_POST',
        postId: post.postId,
        canonicalPath: `/community/${post.postId}`,
        title: post.title,
        publicSummaryText: post.excerpt,
        publicSummaryHtml: `<p>${post.excerpt}</p>`,
        accessMode: 'TEASER',
        bodyAccess: 'ROOM_MEMBER',
        author: { nickname: post.author.name },
        sourceRoom: {
          roomId: 8,
          name: room8.name,
          canonicalPath: '/community/rooms/8',
        },
        commentCount: post.stats.commentCount,
        likeCount: post.stats.likeCount,
        viewCount: post.stats.viewCount,
        publishedAt: post.createdAt,
        updatedAt: post.updatedAt,
      },
    });
  }
  if (path === '/__legacy/community/posts/801/seo-document')
    return json(res, {
      content: {
        resourceType: 'COMMUNITY_POST',
        postId: 801,
        canonicalPath: '/community/801',
        title: '롤백 기준',
        publicSummaryText: '장애 전에 롤백 기준을 정합니다.',
        publicSummaryHtml: '<p>장애 전에 롤백 기준을 정합니다.</p>',
        accessMode: 'TEASER',
        bodyAccess: 'ROOM_MEMBER',
        author: { nickname: '현장 개발자' },
        sourceRoom: {
          roomId: 8,
          name: '배포·운영방',
          canonicalPath: '/community/rooms/8',
        },
        commentCount: 3,
        likeCount: 8,
        viewCount: 34,
        publishedAt: now,
        updatedAt: now,
      },
    });
  if (path === '/api/v1/insight/sitemap-resources') {
    const selectedTypes = new Set(
      (url.searchParams.get('types') ?? 'ARTICLE,ISLAND,KOAN').split(','),
    );
    const start = url.searchParams.get('partitionStartExclusive');
    const end = url.searchParams.get('partitionEndInclusive');
    const all = [
      ...islands.flatMap((island) =>
        island.articles.map((item) => ({
          type: 'ARTICLE',
          resourceKey: item.documentId,
          canonicalPath: `/insights/${item.slug}`,
          updatedAt: now,
        })),
      ),
      ...islands.map((island) => ({
        type: 'ISLAND',
        resourceKey: String(island.islandId),
        canonicalPath: `/insights/land/${island.slug}`,
        updatedAt: now,
      })),
      ...questions
        .filter((koan) => koan.koanId !== 1 || lifecycle.koan1Active)
        .map((koan) => ({
          type: 'KOAN',
          resourceKey: String(koan.koanId),
          canonicalPath: `/insights/koans/${koan.koanId}`,
          updatedAt: koan.publishedAt,
        })),
    ].filter((item) => selectedTypes.has(item.type));
    const compare = (left, right, type) => {
      if (type === 'ARTICLE')
        return Buffer.compare(Buffer.from(left), Buffer.from(right));
      const leftValue = BigInt(left);
      const rightValue = BigInt(right);
      return leftValue < rightValue ? -1 : leftValue > rightValue ? 1 : 0;
    };
    const items = all.filter(
      (item) =>
        (start === null || compare(item.resourceKey, start, item.type) > 0) &&
        (end === null || compare(item.resourceKey, end, item.type) <= 0),
    );
    return json(res, {
      code: 'SUCCESS',
      data: {
        items,
        nextCursor: null,
        snapshot: `fixture-insight-${[...selectedTypes].sort().join('-')}-${start ?? 'all'}-${end ?? 'all'}`,
        datasetTotalItems: all.length,
        totalItems: items.length,
      },
    });
  }
  if (path === '/api/v1/community/sitemap-resources') {
    const selectedTypes = new Set(
      (url.searchParams.get('types') ?? 'POST,ROOM,QUESTION').split(','),
    );
    const all = [
      ...roomPosts
        .filter(
          (post) =>
            lifecycle.room8Active &&
            (post.postId !== 801 || lifecycle.post801Active),
        )
        .map((post) => ({
          type: 'POST',
          id: post.postId,
          canonicalPath: `/community/${post.postId}`,
          updatedAt: post.updatedAt,
        })),
      ...(lifecycle.room8Active
        ? [
            {
              type: 'ROOM',
              id: 8,
              canonicalPath: '/community/rooms/8',
              updatedAt: now,
            },
          ]
        : []),
      {
        type: 'QUESTION',
        id: 101,
        canonicalPath: '/community/questions/101',
        updatedAt: now,
      },
    ].filter((item) => selectedTypes.has(item.type));
    const start = BigInt(
      url.searchParams.get('partitionStartExclusive') ?? '0',
    );
    const end = BigInt(
      url.searchParams.get('partitionEndInclusive') ??
        String(Number.MAX_SAFE_INTEGER),
    );
    const items = all.filter(
      (item) => BigInt(item.id) > start && BigInt(item.id) <= end,
    );
    return json(res, {
      content: {
        items,
        nextCursor: null,
        snapshot: `fixture-community-${[...selectedTypes].sort().join('-')}-${start}-${end}`,
        datasetTotalItems: all.length,
        totalItems: items.length,
      },
    });
  }
  if (path === '/api/v1/members/public-profile-sitemap-resources') {
    const all = lifecycle.profileActive
      ? [
          {
            publicProfileUuid: '11111111-1111-4111-8111-111111111111',
            canonicalPath: '/members/11111111-1111-4111-8111-111111111111',
            updatedAt: now,
          },
        ]
      : [];
    const start = url.searchParams.get('partitionStartExclusive') ?? '';
    const end =
      url.searchParams.get('partitionEndInclusive') ??
      'ffffffff-ffff-ffff-ffff-ffffffffffff';
    const items = all.filter(
      (item) => item.publicProfileUuid > start && item.publicProfileUuid <= end,
    );
    return json(res, {
      content: {
        items,
        nextCursor: null,
        snapshot: `fixture-profile-${start}-${end}`,
        datasetTotalItems: all.length,
        totalItems: items.length,
      },
    });
  }
  if (
    path ===
    '/api/v1/members/11111111-1111-4111-8111-111111111111/public-profile'
  ) {
    if (!lifecycle.profileActive) return json(res, { code: 'NOT_FOUND' }, 404);
    return json(res, {
      content: {
        publicProfileUuid: '11111111-1111-4111-8111-111111111111',
        nickname: '새로온 개척자',
        simpleIntroduction: '배운 것을 공개하며 만듭니다.',
        buildGoal: '가장 작은 서비스를 운영까지 완주합니다.',
        weeksTogether: 1,
        weeksTogetherLabel: '1주째 함께하는 중',
        rooms: { items: [], nextCursor: null },
        posts: { items: [], nextCursor: null },
        canonicalPath: '/members/11111111-1111-4111-8111-111111111111',
        indexEligibility: { indexable: true, reason: 'ACTIVE_PUBLIC_PROFILE' },
        updatedAt: now,
      },
    });
  }
  if (path === '/api/v1/community/posts/801/views')
    return json(res, { content: { recorded: true } });
  if (path === '/api/v1/community/posts/801/related-posts')
    return json(res, { content: [] });
  if (/\/views\/me$/.test(path)) return json(res, ok({ recorded: true }));
  if (path === '/api/v1/insight/seo-documents/articles/dep-article-1')
    return json(res, {
      code: 'SUCCESS',
      data: {
        resourceType: 'ARTICLE',
        documentId: islands[0].articles[0].documentId,
        canonicalPath: '/insights/dep-article-1',
        title: islands[0].articles[0].title,
        publicSummary: islands[0].articles[0].description,
        coverUrl: 'http://127.0.0.1:3212/uploads/cover.png',
        author: { name: 'ZERO-ONE', canonicalPath: null },
        updatedAt: now,
        isAccessibleForFree: true,
        bodyAccess: 'PUBLIC_FIRST_ARTICLE',
        island: { id: 1, slug: 'dep', name: '배포·운영' },
      },
    });
  if (path === '/api/v1/insight/seo-documents/articles/dep-article-2')
    return json(res, {
      code: 'SUCCESS',
      data: {
        resourceType: 'ARTICLE',
        documentId: islands[0].articles[1].documentId,
        canonicalPath: '/insights/dep-article-2',
        title: islands[0].articles[1].title,
        publicSummary: islands[0].articles[1].description,
        coverUrl: 'http://127.0.0.1:3212/uploads/cover.png',
        author: { name: 'ZERO-ONE', canonicalPath: null },
        updatedAt: now,
        isAccessibleForFree: false,
        bodyAccess: 'LOGIN_AND_BUDGET',
        island: { id: 1, slug: 'dep', name: '배포·운영' },
      },
    });
  if (
    path === '/api/v1/insight/articles/by-slug/dep-article-1/access' ||
    path === '/api/v2/insight/articles/by-slug/dep-article-1/access'
  )
    return json(res, {
      code: 'SUCCESS',
      data: {
        ...islands[0].articles[0],
        islandId: 1,
        islandSlug: 'dep',
        islandName: '배포·운영',
        ordinal: 1,
        teaser: islands[0].articles[0].description,
        coverUrl: 'http://127.0.0.1:3212/uploads/cover.png',
        unlockCost: 0,
        budget: { balance: 5, dailyCap: 5 },
        freeAlternative: null,
        accessLevel: 'FREE',
        accessReason: 'FIRST_ARTICLE',
      },
    });
  if (
    path === '/api/v1/insight/articles/by-slug/dep-article-2/access' ||
    path === '/api/v2/insight/articles/by-slug/dep-article-2/access'
  )
    return json(res, {
      code: 'SUCCESS',
      data: {
        ...islands[0].articles[1],
        islandId: 1,
        islandSlug: 'dep',
        islandName: '배포·운영',
        ordinal: 2,
        teaser: islands[0].articles[1].description,
        coverUrl: 'http://127.0.0.1:3212/uploads/cover.png',
        unlockCost: 1,
        budget: null,
        freeAlternative: { type: 'KOAN', koanId: 1 },
        accessLevel: 'LOCKED',
        accessReason: path.startsWith('/api/v1/')
          ? 'LOGIN_REQUIRED'
          : 'AUTHENTICATION_REQUIRED',
      },
    });

  // 참여 API 빈 스냅샷. 투표·반응·저장이 없는 픽스처 상태(0·빈 배열)이지
  // 운영 시드 숫자가 아니다. 이 라우트가 없으면 글 본문이 404 를 받아
  // 브라우저 콘솔에 Failed to load resource 가 찍힌다.
  const pollMatch = path.match(
    /^\/api\/v1\/insight\/articles\/[^/]+\/polls\/([^/]+)(?:\/votes\/me)?$/,
  );
  if (pollMatch && (req.method === 'GET' || req.method === 'PUT')) {
    return json(
      res,
      ok({
        pollId: decodeURIComponent(pollMatch[1]),
        total: 0,
        options: [],
        mine: null,
      }),
    );
  }
  const sectionMatch = path.match(
    /^\/api\/v1\/insight\/articles\/[^/]+\/sections\/([^/]+)\/(?:reactions(?:\/me)?|comments)$/,
  );
  if (
    sectionMatch &&
    (req.method === 'GET' || req.method === 'PUT' || req.method === 'POST')
  ) {
    return json(
      res,
      ok({
        sectionId: decodeURIComponent(sectionMatch[1]),
        counts: { agree: 0, known: 0, new: 0 },
        mine: null,
        comments: [],
        commentCount: 0,
      }),
    );
  }
  const tipSavedMatch = path.match(
    /^\/api\/v1\/insight\/articles\/[^/]+\/tips\/[^/]+\/saved\/me$/,
  );
  if (
    tipSavedMatch &&
    (req.method === 'GET' || req.method === 'PUT' || req.method === 'DELETE')
  ) {
    return json(res, ok({ saved: req.method === 'PUT' }));
  }

  return json(res, { code: 'NOT_FOUND', message: path }, 404);
}).listen(port, '127.0.0.1', () => {
  process.stdout.write(`SPRINT8 fixture API listening on ${port}\n`);
});
