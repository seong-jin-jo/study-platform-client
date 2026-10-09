import { createServer } from 'node:http';

const port = Number(process.env.SPRINT7V3_API_PORT ?? 4317);
const appOrigin = process.env.SPRINT7V3_APP_ORIGIN ?? 'http://127.0.0.1:3107';

const communityItem = (index) => ({
  type: 'COMMUNITY_POST',
  id: `post:${index}`,
  roomId: 17,
  roomName: '바이브코딩 질문 방',
  title: `배포 오류를 해결한 기록 ${index}`,
  excerpt:
    '배포 단계에서 같은 오류를 겪은 사람에게 도움이 되도록 원인과 해결 순서를 정리했습니다.',
  authorName: index % 2 === 0 ? '서진' : '민아',
  createdAt: '2026-08-06T04:00:00Z',
  stats: {
    viewCount: 120 + index,
    commentCount: 3 + (index % 2),
    helpfulCount: 9 + index,
  },
});

const insightItem = (index) => ({
  type: 'INSIGHT_ARTICLE',
  id: `insight:${index}`,
  documentId: String(index),
  slug: `vibe-coding-insight-${index}`,
  title: `막힘을 줄이는 바이브코딩 습관 ${index}`,
  excerpt: '질문을 작게 나누고 실행 결과를 남기면 다음 시도가 빨라집니다.',
  categoryLabel: '실전 가이드',
  stats: { viewCount: 240 + index, helpfulCount: 18 + index },
});

const homeShell = {
  userName: '테스트 멤버',
  streak: {
    count: 4,
    todayCompleted: false,
    atRisk: false,
    nextMilestone: 7,
  },
  continueReading: {
    articleTitle: '질문을 잘 만드는 법',
    progressPct: 60,
    minutesLeft: 4,
    readingPointsBalance: 3,
  },
  myRooms: [
    {
      id: 17,
      kind: 'interest',
      goalLabel: '바이브코딩 질문 방',
      badge: 'WEBAPP',
      newPostsCount: 7,
      stuckQuestionsCount: 2,
      memberCount: 128,
    },
  ],
  communityToday: {
    activeRooms: [
      {
        id: 17,
        goalLabel: '바이브코딩 질문 방',
        memberCount: 128,
        liveReaders: 9,
        todayQuestions: 6,
      },
    ],
    topReads: [
      {
        id: 1,
        kicker: '오늘 많이 읽음',
        title: '배포 오류를 해결한 기록 1',
        segmentReaderCount: 42,
        faces: [],
      },
    ],
  },
  newMembersWeek: {
    total: 14,
    byInterest: [{ interest: '웹앱', count: 9 }],
  },
};

const response = (content, statusCode = 200) => ({
  statusCode,
  timestamp: '2026-08-06T12:00:00+09:00',
  content,
});

const room = {
  roomId: 7,
  cohortId: 7,
  slug: 'webapp-revenue',
  code: 'webapp-revenue',
  name: '웹앱으로 돈 벌기',
  description: '만든 걸로 첫 매출을 내보는 방이에요.',
  bannerUrl: null,
  axisTags: [],
  jobAxis: [],
  goalAxis: [],
  levelAxis: [],
  stats: { memberCount: 12, postCount7d: 14, commentCount7d: 30 },
  memberCount: 12,
  newPostsToday: 3,
  liveSignal: true,
  membership: { state: 'ACTIVE', canJoin: false },
  ownership: {
    state: 'ACTIVE',
    ownerPublicProfileUuid: '11111111-1111-4111-8111-111111111111',
    claimable: false,
    revision: 8,
  },
  admissionQuestions: [],
  members: { items: [], nextCursor: null },
  activity: {
    posts7d: 14,
    comments7d: 30,
    helpful7d: 8,
    activeMembers7d: 31,
  },
  rules: [
    { order: 1, body: '뭘 하려다 어디서 막혔는지 세 줄이면 충분해요.' },
    { order: 2, body: '화면을 찍어 붙이면 답이 더 빨라져요.' },
    { order: 3, body: '느린 건 잘못이 아니에요.' },
  ],
  revision: 8,
};

const postSummary = {
  postId: 42,
  revision: 1,
  board: '자유',
  title: 'Supabase 로그인 후 프로필이 안 만들어져요',
  excerpt: '프로필을 만드는 규칙부터 확인한 과정을 정리했습니다.',
  previewImageUrl: null,
  previewImageAlt: null,
  author: {
    memberId: 3,
    name: '민아',
    profileImageUrl: null,
    role: 'MEMBER',
  },
  stats: { viewCount: 31, likeCount: 8, commentCount: 3 },
  viewer: { isAuthenticated: true, canEdit: false, canDelete: false },
  createdAt: '2026-08-06T09:00:00+09:00',
  updatedAt: '2026-08-06T09:00:00+09:00',
};

const json = (res, body, status = 200) => {
  res.writeHead(status, {
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Origin': appOrigin,
    'Content-Type': 'application/json; charset=utf-8',
    Vary: 'Origin',
  });
  res.end(JSON.stringify(body));
};

createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Allow-Methods': 'DELETE, GET, OPTIONS, PATCH, POST, PUT',
      'Access-Control-Allow-Origin': appOrigin,
    });
    res.end();
    return;
  }

  const url = new URL(req.url ?? '/', `http://127.0.0.1:${port}`);

  if (url.pathname === '/api/v1/auth/me') {
    json(res, response({ memberId: 1, roleId: 'ROLE_MEMBER' }));
    return;
  }

  if (
    url.pathname ===
    '/api/v1/members/11111111-1111-4111-8111-111111111111/public-profile'
  ) {
    json(
      res,
      response({
        publicProfileUuid: '11111111-1111-4111-8111-111111111111',
        nickname: '서진',
        profileImageUrl: null,
        simpleIntroduction: '매일 하나씩 만들고 기록합니다.',
        buildGoal: '작은 웹앱으로 첫 매출 만들기',
        weeksTogether: 12,
        weeksTogetherLabel: '12주째 함께하고 있어요',
        rooms: {
          items: [
            { roomId: 7, name: '웹앱으로 돈 벌기', visibility: 'PUBLIC' },
          ],
          nextCursor: null,
        },
        posts: {
          items: [
            {
              postId: 42,
              title: 'Supabase 로그인 후 프로필이 안 만들어져요',
              previewText: '프로필 생성 규칙을 확인한 과정을 정리했습니다.',
              destination: '/community/42',
            },
          ],
          nextCursor: null,
        },
        canonicalPath: '/members/11111111-1111-4111-8111-111111111111',
        indexEligibility: { indexable: true, reason: 'ACTIVE_WITH_ACTIVITY' },
        updatedAt: '2026-08-06T09:00:00+09:00',
      }),
    );
    return;
  }

  if (url.pathname === '/api/v1/community/posts/42/seo-document') {
    json(
      res,
      response({
        postId: 42,
        canonicalPath: '/community/42',
        title: postSummary.title,
        previewText: postSummary.excerpt,
        gatedBodyHtml:
          '<p>회원가입 뒤 프로필 행을 만드는 데이터베이스 규칙부터 확인했습니다.</p>',
        gatedCssSelector: '.zeroone-gated-body',
        isAccessibleForFree: false,
        hasPart: {
          '@type': 'WebPageElement',
          isAccessibleForFree: false,
          cssSelector: '.zeroone-gated-body',
        },
        author: {
          publicProfileUuid: '11111111-1111-4111-8111-111111111111',
          nickname: '민아',
        },
        sourceRoom: { roomId: 7, name: room.name },
        publishedAt: postSummary.createdAt,
        updatedAt: postSummary.updatedAt,
      }),
    );
    return;
  }

  if (url.pathname === '/api/v1/community/rooms') {
    json(
      res,
      response({
        myRooms: [room],
        exploreRooms: [{ ...room, roomId: 8, name: '업무 자동화' }],
        axes: { job: [], goal: [], level: [] },
        activeRoomCount: 1,
        activeRoomLimit: 3,
      }),
    );
    return;
  }

  if (url.pathname === '/api/v1/community/rooms/7') {
    json(res, response(room));
    return;
  }

  if (url.pathname === '/api/v1/community/posts/rep/me') {
    json(
      res,
      response({ repBalance: 128, repEarnedTotal: 180, recentEarns: [] }),
    );
    return;
  }

  if (url.pathname === '/api/v1/community/posts/42') {
    json(
      res,
      response({
        access: {
          mode: 'TEASER',
          reason: 'ROOM_MEMBERSHIP_REQUIRED',
          roomId: 7,
          canJoin: true,
        },
        post: {
          postId: 42,
          roomId: 7,
          board: '자유',
          title: postSummary.title,
          author: { displayName: '민아' },
          createdAt: postSummary.createdAt,
          teaserHtml:
            '<p>프로필을 만드는 규칙부터 확인한 과정을 정리했습니다.</p>',
          stats: { viewCount: 31, commentCount: 3, helpfulCount: 8 },
        },
      }),
    );
    return;
  }

  if (url.pathname === '/api/v1/community/posts') {
    json(
      res,
      response({
        popularItems: [],
        items: [postSummary],
        page: 1,
        size: 50,
        totalElements: 1,
        totalPages: 1,
        hasNext: false,
        hasPrevious: false,
        totalPostCount: 1,
      }),
    );
    return;
  }

  if (url.pathname === '/api/v1/saved-resources') {
    json(
      res,
      response({
        items: [
          {
            resourceType: 'COMMUNITY_POST',
            resourceKey: '42',
            title: postSummary.title,
            preview: postSummary.excerpt,
            destination: '/community/42',
            savedAt: '2026-08-06T10:00:00+09:00',
            resourceState: 'AVAILABLE',
          },
        ],
        nextCursor: null,
      }),
    );
    return;
  }

  if (url.pathname === '/api/v1/notifications/has-new') {
    json(res, response({ hasNewNotification: true }));
    return;
  }

  if (url.pathname === '/api/v1/notifications/categories') {
    json(res, response({ notificationCategories: [] }));
    return;
  }

  if (url.pathname === '/api/v1/notifications') {
    json(
      res,
      response({
        content: [
          {
            id: 1,
            topicType: 'COMMENT',
            topicDescription: '커뮤니티 답변',
            title: '서진님이 내 글에 답을 남겼어요',
            content: 'Supabase 로그인 후 프로필이 안 만들어져요',
            isRead: false,
            createdAt: '2026-08-06T10:00:00+09:00',
            destination: { state: 'AVAILABLE', path: '/community/42' },
          },
        ],
        page: 1,
        size: 10,
        totalElements: 1,
        totalPages: 1,
        hasNext: false,
        hasPrevious: false,
      }),
    );
    return;
  }

  if (url.pathname === '/api/v1/members/1/profile') {
    json(
      res,
      response({
        memberProfile: {
          nickname: '테스트 멤버',
          profileImage: { resizedImages: [] },
        },
        sincerityTemp: { levelName: '씨앗' },
      }),
    );
    return;
  }

  if (url.pathname === '/api/v6/class-onboarding/me') {
    json(
      res,
      response({ currentStep: 'COMPLETED', completedAt: '2026-08-01' }),
    );
    return;
  }

  if (url.pathname === '/api/v1/home/feed') {
    const secondPage = url.searchParams.get('cursor') === 'page-2';
    const items = secondPage
      ? [communityItem(7), insightItem(8), communityItem(9), communityItem(10)]
      : [
          communityItem(1),
          communityItem(2),
          insightItem(3),
          communityItem(4),
          communityItem(5),
          communityItem(6),
        ];

    json(
      res,
      response({
        ...homeShell,
        discoveryFeed: {
          sort: url.searchParams.get('sort') ?? 'NEW',
          items,
          nextCursor: secondPage ? null : 'page-2',
        },
      }),
    );
    return;
  }

  if (url.pathname === '/api/v1/search') {
    const query = url.searchParams.get('q') ?? '';
    if (query === '오류상태') {
      json(res, { errorCode: 'SEARCH_UNAVAILABLE' }, 503);
      return;
    }

    const sendSearchResponse = () =>
      json(
        res,
        response({
          items:
            query === '결과없음'
              ? []
              : [
                  {
                    type: 'COMMUNITY_POST',
                    resourceKey: 'post:1',
                    title: '배포 오류를 해결한 기록',
                    previewText: '같은 방 멤버가 남긴 해결 순서입니다.',
                    access: 'FULL',
                    destination: '/community/1',
                    publishedAt: '2026-08-06T04:00:00Z',
                  },
                  {
                    type: 'INSIGHT_ARTICLE',
                    resourceKey: 'insight:3',
                    title: '배포 전 확인할 것',
                    previewText: '실패를 줄이는 배포 체크리스트입니다.',
                    access: 'FULL',
                    destination: '/insight-articles/3',
                    publishedAt: '2026-08-05T04:00:00Z',
                  },
                ],
          nextCursor: null,
          partial: false,
          unavailableSources: [],
        }),
      );

    if (query === '로딩상태') {
      setTimeout(sendSearchResponse, 500);
      return;
    }

    sendSearchResponse();
    return;
  }

  json(res, response(null, 404), 404);
}).listen(port, '127.0.0.1', () => {
  process.stdout.write(`sprint7v3 mock api listening on ${port}\n`);
});
