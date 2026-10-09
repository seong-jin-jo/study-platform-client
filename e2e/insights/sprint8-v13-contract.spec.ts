import { expect, test } from '@playwright/test';

test('D13 SEA 390은 OCEAN 8개, today hero, NEW 섬을 렌더하고 dialog focus를 복귀한다', async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/insights', { waitUntil: 'domcontentloaded' });

  const worldmap = page.getByTestId('insight-worldmap');
  await expect(worldmap).toBeVisible({ timeout: 30_000 });
  const ocean = worldmap.locator('button[data-testid^="island-"]');
  await expect(ocean).toHaveCount(8);
  await expect(
    worldmap.getByText('오늘의 화두', { exact: true }),
  ).toBeVisible();
  await expect(
    worldmap.getByRole('heading', { name: /새로 열린 섬/ }),
  ).toBeVisible();

  const trigger = ocean.first();
  await trigger.click();
  const dialog = worldmap.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole('link', { name: /개척지 들어가기/ }),
  ).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  await page.evaluate(() =>
    (document.activeElement as HTMLElement | null)?.blur(),
  );

  await page.screenshot({
    fullPage: true,
    path: '/private/tmp/sprint8-dev-v094-d13-390-full.png',
  });
  expect(consoleErrors).toEqual([]);
});
