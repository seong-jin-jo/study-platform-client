import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import test from 'node:test';

const port = 3293;
const origin = `http://127.0.0.1:${port}`;
let fixture;

const contentOf = (payload) => payload.content ?? payload.data;

test.before(async () => {
  fixture = spawn(
    process.execPath,
    ['scripts/test/sprint8-fixture-server.mjs'],
    {
      env: { ...process.env, SPRINT8_FIXTURE_PORT: String(port) },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );

  const [chunk] = await once(fixture.stdout, 'data');
  assert.match(String(chunk), /3293/);
});

test.after(() => {
  fixture?.kill('SIGTERM');
});

test('v10 SEA, LAND, ROOM, koan fixture contract stays aligned', async () => {
  const map = contentOf(
    await (await fetch(`${origin}/api/v1/insight/map`)).json(),
  );
  assert.equal(map.islands.length, 9);
  assert.deepEqual(map.readingBudget, { balance: 5, dailyCap: 5 });
  assert.deepEqual(map.islands[0].progress, {
    read: 5,
    total: 8,
    conquered: false,
    conqueredAt: null,
  });
  assert.deepEqual(map.islands[0].articles[0].socialProof, {
    viewCount: 396,
    helpfulCount: 37,
    explorerCount: 312,
    helpfulByMe: false,
  });

  const koans = contentOf(
    await (await fetch(`${origin}/api/v1/koans?size=10`)).json(),
  );
  assert.equal(koans.items.length, 7);
  assert.deepEqual(
    koans.items.slice(1).map((item) => item.question),
    [
      '배포는 성공이라는데 화면은 옛날 그대로다',
      '인덱스를 걸었는데 왜 더 느려졌을까',
      '로그를 남겼는데 서버를 다시 띄우면 사라진다',
      'https가 붙었는데 왜 "안전하지 않음"이 뜰까',
      '상태 관리 라이브러리를 안 쓰면 정말 안 되나',
      '브랜치를 지웠는데 커밋은 어디로 갔나',
    ],
  );

  const room = contentOf(
    await (await fetch(`${origin}/api/v1/community/rooms/8`)).json(),
  );
  assert.equal(room.memberCount, 14);
  assert.equal(room.stats.postCount7d, 3);
  assert.equal(room.stats.commentCount7d, 18);

  const posts = contentOf(
    await (await fetch(`${origin}/api/v1/community/posts?roomId=8`)).json(),
  );
  assert.equal(posts.items.length, 3);
  assert.deepEqual(
    posts.items.map(({ title, stats }) => [title, stats.commentCount]),
    [
      ['무중단 배포라는데 30초쯤 502가 뜹니다', 7],
      ['환경변수 바꾸고 재배포했는데 값이 그대로입니다', 3],
      ['롤백 눌렀는데 왜 4분이나 걸리나 했더니', 8],
    ],
  );
});

test('insight social participation APIs return empty snapshots, not 404', async () => {
  const poll = contentOf(
    await (
      await fetch(`${origin}/api/v1/insight/articles/dep-doc-1/polls/poll-1`)
    ).json(),
  );
  assert.deepEqual(poll, {
    pollId: 'poll-1',
    total: 0,
    options: [],
    mine: null,
  });

  const reactions = contentOf(
    await (
      await fetch(
        `${origin}/api/v1/insight/articles/dep-doc-1/sections/why-keys/reactions`,
      )
    ).json(),
  );
  assert.deepEqual(reactions, {
    sectionId: 'why-keys',
    counts: { agree: 0, known: 0, new: 0 },
    mine: null,
    comments: [],
    commentCount: 0,
  });

  const saved = contentOf(
    await (
      await fetch(
        `${origin}/api/v1/insight/articles/dep-doc-1/tips/tip-2/saved/me`,
      )
    ).json(),
  );
  assert.deepEqual(saved, { saved: false });
});

test('mobile typography routes receive at least three real cards', async () => {
  const home = contentOf(
    await (await fetch(`${origin}/api/v1/home/public-feed`)).json(),
  );
  const rooms = contentOf(
    await (await fetch(`${origin}/api/v1/community/rooms`)).json(),
  );
  const posts = contentOf(
    await (await fetch(`${origin}/api/v1/community/posts`)).json(),
  );
  const courses = contentOf(
    await (await fetch(`${origin}/api/v5/courses`)).json(),
  );

  assert.ok(home.topInsights.length >= 3);
  assert.ok(home.activeRooms.length >= 3);
  assert.ok(rooms.exploreRooms.length >= 3);
  assert.ok(posts.items.length >= 3);
  assert.ok(courses.content.length >= 3);
  assert.deepEqual(
    [...new Set(courses.content.map(({ ctaType }) => ctaType))].sort(),
    ['ALERT_SUBSCRIBE', 'DETAIL'],
  );
});
