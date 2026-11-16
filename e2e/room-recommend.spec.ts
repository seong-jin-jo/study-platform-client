import { expect, test } from '@playwright/test';

// 2026-11-17 회장 확정: 빈 방 상태는 안내문 대신 인기 방 추천으로 입장을 유도한다.
// 홈 오른쪽 '입장한 방 0/3' 카드(비회원)와 /insights 섬 패널 공부방 칸을 본다.
const VIEWPORTS = [
  { name: '휴대폰', width: 390, height: 844, sheet: true },
  { name: '태블릿', width: 820, height: 1180, sheet: true },
  { name: 'PC', width: 1280, height: 900, sheet: false },
] as const;

const SHOT_DIR = process.env.ROOM_SHOT_DIR;

type RoomLite = { roomId: number; name: string; memberCount: number };

const horizontalOverflow = (page: import('@playwright/test').Page) =>
  page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );

test.describe('인기 방 추천(빈 방 상태)', () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  test.setTimeout(180_000);

  // 로컬 빌드를 운영 API 에 붙여 돌릴 때만 쓴다(E2E_API_PROXY=1).
  test.beforeEach(async ({ page }) => {
    if (process.env.E2E_API_PROXY !== '1') return;
    await page.route(/https:\/\/api\.zeroone\.it\.kr\//, async (route) => {
      const cors = {
        'access-control-allow-origin':
          route.request().headers().origin ?? 'http://localhost:3000',
        'access-control-allow-credentials': 'true',
      };
      if (route.request().method() === 'OPTIONS') {
        await route.fulfill({
          status: 204,
          headers: {
            ...cors,
            'access-control-allow-headers':
              route.request().headers()['access-control-request-headers'] ??
              '*',
            'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
          },
        });
        return;
      }
      const response = await route.fetch({
        headers: {
          ...route.request().headers(),
          origin: 'https://www.zeroone.it.kr',
        },
      });
      await route.fulfill({
        response,
        headers: { ...response.headers(), ...cors },
      });
    });
  });

  for (const vp of VIEWPORTS) {
    test(`${vp.name} ${vp.width}: 홈 입장한 방 카드가 인기 방(이름·회원 수·둘러보기)을 API 값대로 보인다`, async ({
      page,
    }) => {
      const hubResponse = page.waitForResponse((res) =>
        /\/api\/v1\/community\/rooms(\?|$)/.test(res.url()),
      );
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      const hub = await (await hubResponse).json();
      const explore = (hub.content?.exploreRooms ?? []) as RoomLite[];
      const expected = explore
        .filter((room) => room.memberCount > 0)
        .sort((a, b) => b.memberCount - a.memberCount || a.roomId - b.roomId)
        .slice(0, 3);
      test.skip(expected.length === 0, '회원이 있는 방이 없는 데이터');

      const rail = page.getByTestId('guest-room-rail');
      await expect(rail).toBeVisible({ timeout: 30_000 });
      await expect(page.getByText('홈 정보를 불러오지 못했어요')).toHaveCount(
        0,
      );
      await expect(rail).toContainText('0/3');
      await expect(rail).not.toContainText('아직 소속된 방이 없어요');
      const rows = rail.getByTestId('recommended-room');
      await expect(rows).toHaveCount(expected.length);
      for (const [index, room] of expected.entries()) {
        const row = rows.nth(index);
        await expect(row).toContainText(room.name);
        await expect(row).toContainText(`멤버 ${room.memberCount}명`);
        await expect(
          row.getByRole('link', { name: '둘러보기' }),
        ).toHaveAttribute('href', `/community/rooms/${room.roomId}`);
      }
      await rail.scrollIntoViewIfNeeded();
      // 가로 넘침이 숨겨져 있어도 버튼이 화면 밖으로 밀리면 안 된다.
      for (let i = 0; i < expected.length; i += 1) {
        const box = await rows
          .nth(i)
          .getByRole('link', { name: '둘러보기' })
          .boundingBox();
        expect(box).not.toBeNull();
        expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(vp.width);
        expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
      }
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
      if (SHOT_DIR) {
        await rail.screenshot({
          path: `${SHOT_DIR}/home-rail-${vp.width}x${vp.height}.png`,
        });
      }

      // 둘러보기는 그 방 화면으로 간다.
      await rows.first().getByRole('link', { name: '둘러보기' }).click();
      await page.waitForURL(`**/community/rooms/${expected[0].roomId}`, {
        waitUntil: 'commit',
        timeout: 120_000,
      });
    });

    test(`${vp.name} ${vp.width}: 섬 패널 공부방 칸은 연결된 방 이름·회원 수, 없으면 인기 방을 보인다`, async ({
      page,
    }) => {
      const mapResponse = page.waitForResponse((res) =>
        /\/api\/v1\/insight\/map(\?|$)/.test(res.url()),
      );
      const hubResponse = page.waitForResponse((res) =>
        /\/api\/v1\/community\/rooms(\?|$)/.test(res.url()),
      );
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/insights', { waitUntil: 'domcontentloaded' });
      const islands = ((await (await mapResponse).json()).content?.islands ??
        []) as Array<{
        slug: string;
        bridgeRoomId: number | null;
        articles: Array<{ slug: string }>;
      }>;
      const rooms = ((await (await hubResponse).json()).content?.exploreRooms ??
        []) as RoomLite[];
      const worldmap = page.getByTestId('insight-worldmap');
      await expect(worldmap).toBeVisible({ timeout: 30_000 });
      await expect(worldmap.getByText('바다를 불러오지 못했어요')).toHaveCount(
        0,
      );

      const surfaceId = vp.sheet ? 'island-sheet' : 'island-panel';
      const open = async (slug: string) => {
        await worldmap.locator(`button[data-testid="island-${slug}"]`).click();
        const surface = worldmap.getByTestId(surfaceId);
        await expect(surface).toBeVisible();
        return surface.getByTestId('island-room');
      };

      // 연결된 방이 있는 섬: 방 이름과 회원 수는 방 목록 API 값 그대로.
      const linked = islands.find(
        (island) =>
          island.bridgeRoomId &&
          rooms.some((room) => room.roomId === island.bridgeRoomId),
      );
      if (linked) {
        const room = rooms.find((r) => r.roomId === linked.bridgeRoomId);
        if (!room) throw new Error('unreachable');
        const roomBox = await open(linked.slug);
        await expect(roomBox.getByTestId('island-room-name')).toHaveText(
          room.name,
        );
        await expect(roomBox.getByTestId('island-room-members')).toHaveText(
          `멤버 ${room.memberCount}명`,
        );
        await expect(
          roomBox.getByRole('link', { name: '들어가기' }),
        ).toHaveAttribute(
          'href',
          new RegExp(`^/community/rooms/${room.roomId}\\?from=`),
        );
        expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
        if (SHOT_DIR) {
          await page.screenshot({
            path: `${SHOT_DIR}/island-linked-${vp.width}x${vp.height}.png`,
          });
        }
        if (vp.sheet) await page.keyboard.press('Escape');
      } else {
        test.info().annotations.push({
          type: 'note',
          description: '방이 연결된 섬 없음',
        });
      }

      // 연결된 방이 없는 섬: 인기 방 1~2개 추천.
      const unlinked = islands.find((island) => !island.bridgeRoomId);
      if (!unlinked) return;
      const roomBox = await open(unlinked.slug);
      const picks = rooms
        .filter((room) => room.memberCount > 0)
        .sort((a, b) => b.memberCount - a.memberCount || a.roomId - b.roomId)
        .slice(0, 2);
      const list = roomBox.getByTestId('island-room-recommend');
      await expect(list.locator('li')).toHaveCount(picks.length);
      for (const [index, room] of picks.entries()) {
        const item = list.locator('li').nth(index);
        await expect(item).toContainText(room.name);
        await expect(item).toContainText(`멤버 ${room.memberCount}명`);
        await expect(
          item.getByRole('link', { name: '둘러보기' }),
        ).toHaveAttribute(
          'href',
          new RegExp(`^/community/rooms/${room.roomId}\\?from=`),
        );
      }
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
      if (SHOT_DIR) {
        await page.screenshot({
          path: `${SHOT_DIR}/island-recommend-${vp.width}x${vp.height}.png`,
        });
      }
    });
  }
});
