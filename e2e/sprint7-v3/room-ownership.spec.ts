/** 담당 테스트 케이스: S7-OWNER-N01, S7-OWNER-E01, S7-OWNER-Z01, S7-OWNER-A01 */
import {
  type APIRequestContext,
  type APIResponse,
  expect,
  type Page,
  test,
} from '@playwright/test';

import {
  missingSprint7Env,
  sprint7EnvMissingReason,
} from '../support/sprint7-v3';

test.skip(missingSprint7Env().length > 0, sprint7EnvMissingReason());

const WEB_BASE_URL = process.env.E2E_BASE_URL ?? 'https://test.zeroone.it.kr';
const API_BASE_URL =
  process.env.E2E_API_BASE_URL ?? 'https://test-api.zeroone.it.kr';

test.use({ storageState: { cookies: [], origins: [] } });

interface ApiEnvelope<T> {
  content: T;
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `${name} is required for the Sprint 7 V3 real-environment suite`,
    );
  }
  return value;
}

function requiredMemberId(name = 'E2E_SPRINT7_MEMBER_ID'): number {
  const value = Number(requiredEnv(name));
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return value;
}

function parseMemberIds(name: string): number[] {
  const ids = requiredEnv(name)
    .split(',')
    .map((value) => Number(value.trim()));
  if (
    ids.length < 2 ||
    ids.some((id) => !Number.isSafeInteger(id) || id <= 0)
  ) {
    throw new Error(`${name} must contain at least two positive integer IDs`);
  }
  return [...new Set(ids)];
}

function bearer(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

async function mintMemberToken(
  request: APIRequestContext,
  memberId = requiredMemberId(),
): Promise<string> {
  const configured = process.env.E2E_SPRINT7_MEMBER_TOKEN?.trim();
  if (configured && memberId === requiredMemberId()) return configured;

  const response = await request.get(
    `${API_BASE_URL}/api/v1/tokens/token?member-id=${memberId}&role-id=ROLE_MEMBER`,
  );
  expect(response.status(), `QA token mint failed for member ${memberId}`).toBe(
    200,
  );
  const body = (await response.json()) as ApiEnvelope<{ accessToken: string }>;
  expect(body.content.accessToken).toBeTruthy();
  return body.content.accessToken;
}

async function authenticatePage(
  page: Page,
  request: APIRequestContext,
  memberId = requiredMemberId(),
): Promise<string> {
  const token = await mintMemberToken(request, memberId);
  const target = new URL(WEB_BASE_URL);
  await page.context().addCookies([
    {
      name: 'accessToken',
      value: token,
      domain: target.hostname,
      path: '/',
      httpOnly: false,
      secure: target.protocol === 'https:',
      sameSite: 'Lax',
    },
  ]);
  return token;
}

async function apiJson<T>(
  request: APIRequestContext,
  path: string,
  options: { token?: string; expectedStatus?: number } = {},
): Promise<T> {
  const response = await request.get(`${API_BASE_URL}${path}`, {
    headers: options.token ? bearer(options.token) : undefined,
  });
  expect(response.status(), `GET ${path}`).toBe(options.expectedStatus ?? 200);
  const body = (await response.json()) as ApiEnvelope<T>;
  return body.content;
}

interface RoomResponse {
  roomId: number;
  ownership: {
    state: 'ACTIVE' | 'VACANT';
    claimable: boolean;
    revision: number;
    ownerPublicProfileUuid?: string;
  };
}

interface MyRoomsResponse {
  activeRoomCount: number;
  limit: number;
  activeRooms: Array<{ roomId: number; name: string }>;
}

interface PreparedMembership {
  memberId: number;
  token: string;
  initiallyActive: boolean;
  displacedRoomId?: number;
}

async function expectHttpStatus(
  response: APIResponse,
  expectedStatus: number,
  label: string,
): Promise<void> {
  if (response.status() !== expectedStatus) {
    throw new Error(
      `${label}: expected=${expectedStatus} actual=${response.status()} body=${await response.text()}`,
    );
  }
}

async function myRooms(
  request: APIRequestContext,
  token: string,
): Promise<MyRoomsResponse> {
  return apiJson<MyRoomsResponse>(request, '/api/v1/community/rooms/me', {
    token,
  });
}

async function ensureActiveMembership(
  request: APIRequestContext,
  memberId: number,
  roomId: number,
): Promise<PreparedMembership> {
  const token = await mintMemberToken(request, memberId);
  const before = await myRooms(request, token);
  if (before.activeRooms.some((room) => room.roomId === roomId)) {
    return { memberId, token, initiallyActive: true };
  }

  const displacedRoomId =
    before.activeRoomCount >= before.limit
      ? before.activeRooms.find((room) => room.roomId !== roomId)?.roomId
      : undefined;
  if (before.activeRoomCount >= before.limit && !displacedRoomId) {
    throw new Error(`member ${memberId} has no replaceable room membership`);
  }
  const join = await request.post(
    `${API_BASE_URL}/api/v1/community/rooms/${roomId}/join`,
    {
      headers: bearer(token),
      data: {
        introduction: 'Sprint 7 V3 ownership fixture membership',
        ...(displacedRoomId ? { leaveRoomId: displacedRoomId } : {}),
      },
    },
  );
  await expectHttpStatus(join, 200, `prepare member ${memberId} membership`);
  return { memberId, token, initiallyActive: false, displacedRoomId };
}

async function removeTemporaryMembership(
  request: APIRequestContext,
  roomId: number,
  prepared: PreparedMembership,
): Promise<void> {
  if (prepared.initiallyActive) return;

  const current = await myRooms(request, prepared.token);
  if (!current.activeRooms.some((room) => room.roomId === roomId)) return;

  const leave = await request.delete(
    `${API_BASE_URL}/api/v1/community/rooms/${roomId}/join`,
    { headers: bearer(prepared.token) },
  );
  await expectHttpStatus(
    leave,
    200,
    `remove member ${prepared.memberId} temporary membership`,
  );
}

async function restorePreparedMembership(
  request: APIRequestContext,
  roomId: number,
  prepared: PreparedMembership,
): Promise<void> {
  // Remove the room the verification run added before restoring anything
  // else. Doing this first (rather than relying on a separate earlier pass)
  // keeps this function idempotent and safe to re-run after a partial
  // previous failure: whatever the verification temporarily added is always
  // cleared before we try to add the displaced room back, so the member
  // never transiently exceeds the 3-room limit.
  await removeTemporaryMembership(request, roomId, prepared);

  let current = await myRooms(request, prepared.token);
  const targetIsActive = current.activeRooms.some(
    (room) => room.roomId === roomId,
  );
  if (prepared.initiallyActive && !targetIsActive) {
    const rejoin = await request.post(
      `${API_BASE_URL}/api/v1/community/rooms/${roomId}/join`,
      {
        headers: bearer(prepared.token),
        data: { introduction: 'Sprint 7 V3 restore race membership' },
      },
    );
    await expectHttpStatus(
      rejoin,
      200,
      `restore member ${prepared.memberId} target membership`,
    );
    current = await myRooms(request, prepared.token);
  }

  if (
    prepared.displacedRoomId &&
    !current.activeRooms.some(
      (room) => room.roomId === prepared.displacedRoomId,
    )
  ) {
    // Re-check capacity right before restoring, using fresh state (not the
    // `current` snapshot taken above), so a slot freed by removing the
    // verification-added room above is reliably reflected here.
    const beforeRestore = await myRooms(request, prepared.token);
    if (beforeRestore.activeRoomCount >= beforeRestore.limit) {
      throw new Error(
        `member ${prepared.memberId} is already at the room limit ` +
          `(${beforeRestore.activeRoomCount}/${beforeRestore.limit}: ` +
          `${beforeRestore.activeRooms.map((room) => room.roomId).join(', ')}) ` +
          `before restoring displaced room ${prepared.displacedRoomId}. ` +
          `This means a room was added outside of this fixture's tracked ` +
          `state (target room ${roomId} temporary membership should already ` +
          `be removed at this point) — investigate before restoring blindly.`,
      );
    }
    const restoreDisplaced = await request.post(
      `${API_BASE_URL}/api/v1/community/rooms/${prepared.displacedRoomId}/join`,
      {
        headers: bearer(prepared.token),
        data: { introduction: 'Sprint 7 V3 restore displaced membership' },
      },
    );
    await expectHttpStatus(
      restoreDisplaced,
      200,
      `restore member ${prepared.memberId} displaced membership`,
    );
  }
}

async function readRoom(
  request: APIRequestContext,
  roomId: number,
  token: string,
): Promise<RoomResponse> {
  return apiJson<RoomResponse>(request, `/api/v1/community/rooms/${roomId}`, {
    token,
  });
}

/**
 * 방을 VACANT 로 되돌린다.
 *
 * 방 응답에는 "지금 보는 사람이 소유자냐" 를 알려주는 필드가 없고, member-id
 * 로 공개 프로필 uuid 를 얻는 경로도 없다. 그래서 후보를 한 명씩 내보내며
 * 소유권 상태가 VACANT 로 떨어지는지 본다. 소유자가 아닌 멤버가 나가면
 * 소유권 상태는 그대로이므로, 상태가 바뀐 그 순간의 사람이 소유자였다.
 */
async function vacateRoom(
  request: APIRequestContext,
  roomId: number,
  candidateIds: number[],
  readerToken: string,
): Promise<boolean> {
  for (const memberId of candidateIds) {
    const token = await mintMemberToken(request, memberId);
    let leave = await request.delete(
      `${API_BASE_URL}/api/v1/community/rooms/${roomId}/join`,
      { headers: bearer(token) },
    );
    if (leave.status() === 409) {
      // 소유자로 기록돼 있는데 그 사람의 멤버십은 ACTIVE 가 아닌 상태가 실제로
      // 남아 있다(2026-08-25 방 5번). 그 상태에서 leave 는 409 다. 백엔드의 leave
      // 는 소유자가 나갈 때 소유권을 함께 비우므로, 멤버십을 되살린 뒤 다시
      // 내보내면 소유권까지 정상 경로로 풀린다.
      await ensureActiveMembership(request, memberId, roomId);
      leave = await request.delete(
        `${API_BASE_URL}/api/v1/community/rooms/${roomId}/join`,
        { headers: bearer(token) },
      );
    }
    if (leave.status() !== 200) continue;
    const after = await readRoom(request, roomId, readerToken);
    if (after.ownership.state === 'VACANT') return true;
  }
  return false;
}

/**
 * 픽스처 오너가 이 방의 소유자이면서 멤버인 상태로 되돌린다.
 *
 * 종전에는 방 소유권이 ACTIVE 이기만 하면 그대로 돌아갔다. 그런데 소유권이
 * ACTIVE 라는 것과 그 소유자가 픽스처 오너라는 것은 다른 얘기고, 오너 본인의
 * 멤버십이 살아 있다는 것과도 또 다른 얘기다. 앞선 실행이 race 멤버의 claim 을
 * 되돌리지 못한 채 끝나면 소유권은 남의 것이 되고 오너 멤버십은 끊긴 채로
 * 남는다. 그 상태에서 leave 는 200 이 아니라 409 로 떨어진다(2026-08-25 실측,
 * 방 5번이 실제로 그 상태였다). 그래서 세 가지를 순서대로 맞춘다.
 */
async function restoreInitialOwnerFromVacant(
  request: APIRequestContext,
  roomId: number,
): Promise<void> {
  const ownerId = requiredMemberId('E2E_SPRINT7_OWNER_MEMBER_ID');
  const ownerToken = await mintMemberToken(request, ownerId);

  await ensureActiveMembership(request, ownerId, roomId);
  let current = await readRoom(request, roomId, ownerToken);

  if (current.ownership.state === 'ACTIVE') {
    // 후보는 이 스위트가 건드릴 수 있는 픽스처 멤버 전부다. 오너를 맨 앞에 둔다.
    // 실제로 방 5번은 E2E_SPRINT7_MEMBER_ID 가 소유권을 쥔 채로 남아 있었다
    // (2026-08-25 실측, ownerPublicProfileUuid 가 그 멤버의 공개 프로필 uuid).
    // race 멤버만 후보로 두면 그 상태를 영영 못 푼다.
    // E2E_SPRINT7_THREE_ROOM_MEMBER_ID 는 후보에 넣지 않는다. 그 멤버는 "방 3개를
    // 다 채운 사람" 이라는 상태 자체가 픽스처라, 여기서 한 번 내보내면 다른 스펙의
    // '입장한 방 3/3' 단언이 깨진다(2026-08-25 실측, 내가 한 번 깨뜨렸다).
    const candidates = [
      ownerId,
      requiredMemberId(),
      ...parseMemberIds('E2E_SPRINT7_RACE_MEMBER_IDS'),
    ];
    const vacated = await vacateRoom(
      request,
      roomId,
      [...new Set(candidates)],
      ownerToken,
    );
    expect(
      vacated,
      `room ${roomId} is owned by a member outside the fixture set; reseed dev`,
    ).toBe(true);
    current = await readRoom(request, roomId, ownerToken);
    await ensureActiveMembership(request, ownerId, roomId);
  }

  expect(current.ownership.state, 'room must be vacant before reclaim').toBe(
    'VACANT',
  );
  const claimable = await apiJson<RoomResponse>(
    request,
    `/api/v1/community/rooms/${roomId}`,
    { token: ownerToken },
  );
  expect(claimable.ownership.state).toBe('VACANT');
  const ownerClaim = await request.post(
    `${API_BASE_URL}/api/v1/community/rooms/${roomId}/ownership-claims`,
    {
      headers: bearer(ownerToken),
      data: { expectedRevision: claimable.ownership.revision },
    },
  );
  expect(ownerClaim.status(), 'restore initial room ownership').toBe(200);
}

test.describe.configure({ mode: 'serial' });

test.describe('Sprint 7 V3 room ownership @responsive', () => {
  const roomId = () => Number(requiredEnv('E2E_SPRINT7_OWNER_ROOM_ID'));
  const preparedRaceMemberships: PreparedMembership[] = [];

  test.beforeAll(async ({ request }) => {
    await restoreInitialOwnerFromVacant(request, roomId());
    for (const memberId of parseMemberIds('E2E_SPRINT7_RACE_MEMBER_IDS')) {
      preparedRaceMemberships.push(
        await ensureActiveMembership(request, memberId, roomId()),
      );
    }
  });

  test.afterAll(async ({ request }) => {
    // Restore members one at a time: each call removes the room verification
    // added for that member before restoring their original displaced room
    // (see restorePreparedMembership). Keeping this a single per-member pass
    // (instead of a remove-all-then-restore-all batch) means a member's
    // restore never depends on every other member having finished first, so
    // a mid-run failure for one member cannot leave another member's cleanup
    // half-done.
    for (const prepared of preparedRaceMemberships) {
      await restorePreparedMembership(request, roomId(), prepared);
    }
    await restoreInitialOwnerFromVacant(request, roomId());
  });

  test('owner can leave while the room survives as vacant', async ({
    request,
  }) => {
    const ownerId = requiredMemberId('E2E_SPRINT7_OWNER_MEMBER_ID');
    const token = await mintMemberToken(request, ownerId);
    const before = await apiJson<RoomResponse>(
      request,
      `/api/v1/community/rooms/${roomId()}`,
      { token },
    );
    expect(before.ownership.state).toBe('ACTIVE');

    const leave = await request.delete(
      `${API_BASE_URL}/api/v1/community/rooms/${roomId()}/join`,
      { headers: bearer(token) },
    );
    expect(leave.status()).toBe(200);

    const activeMemberToken = preparedRaceMemberships[0].token;
    const after = await apiJson<RoomResponse>(
      request,
      `/api/v1/community/rooms/${roomId()}`,
      { token: activeMemberToken },
    );
    expect(after.roomId).toBe(roomId());
    expect(after.ownership.state).toBe('VACANT');
    expect(after.ownership.claimable).toBe(true);
    expect(after.ownership.revision).toBeGreaterThan(before.ownership.revision);
  });

  test('vacant room exposes one explicit claim action', async ({
    page,
    request,
  }) => {
    const raceIds = parseMemberIds('E2E_SPRINT7_RACE_MEMBER_IDS');
    await authenticatePage(page, request, raceIds[0]);
    await page.goto(`/community/rooms/${roomId()}`);
    await expect(
      page.getByText('방장 없음 · 먼저 맡는 사람이 방장이 돼요'),
    ).toBeVisible();
    await expect(
      page.getByTestId('community-room-claim-ownership'),
    ).toBeEnabled();
  });

  test('concurrent claims produce exactly one winner and conflict losers', async ({
    request,
  }) => {
    const vacant = await apiJson<RoomResponse>(
      request,
      `/api/v1/community/rooms/${roomId()}`,
    );
    expect(vacant.ownership.state).toBe('VACANT');
    const tokens = preparedRaceMemberships.map((prepared) => prepared.token);
    const responses = await Promise.all(
      tokens.map((token) =>
        request.post(
          `${API_BASE_URL}/api/v1/community/rooms/${roomId()}/ownership-claims`,
          {
            headers: bearer(token),
            data: { expectedRevision: vacant.ownership.revision },
          },
        ),
      ),
    );
    const winnerIndex = responses.findIndex(
      (response) => response.status() === 200,
    );
    try {
      expect(
        responses.filter((response) => response.status() === 200),
      ).toHaveLength(1);
      expect(
        responses.filter((response) => response.status() === 409),
      ).toHaveLength(responses.length - 1);
      expect(winnerIndex).toBeGreaterThanOrEqual(0);

      const after = await apiJson<RoomResponse>(
        request,
        `/api/v1/community/rooms/${roomId()}`,
      );
      expect(after.ownership.state).toBe('ACTIVE');
      expect(after.ownership.ownerPublicProfileUuid).toBeTruthy();
    } finally {
      if (winnerIndex >= 0) {
        const winnerLeave = await request.delete(
          `${API_BASE_URL}/api/v1/community/rooms/${roomId()}/join`,
          { headers: bearer(tokens[winnerIndex]) },
        );
        expect(winnerLeave.status(), 'release race winner ownership').toBe(200);
      }
      await restoreInitialOwnerFromVacant(request, roomId());
    }
  });

  test('guest cannot claim ownership and receives no owner mutation', async ({
    request,
  }) => {
    const before = await apiJson<RoomResponse>(
      request,
      `/api/v1/community/rooms/${roomId()}`,
    );
    const response = await request.post(
      `${API_BASE_URL}/api/v1/community/rooms/${roomId()}/ownership-claims`,
      { data: { expectedRevision: before.ownership.revision } },
    );
    expect([401, 403]).toContain(response.status());
    const after = await apiJson<RoomResponse>(
      request,
      `/api/v1/community/rooms/${roomId()}`,
    );
    expect(after.ownership.revision).toBe(before.ownership.revision);
  });
});
