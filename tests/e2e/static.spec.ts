import { expect, test } from '@playwright/test';

test('runs the production build without a processing backend', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Photo Depth Bokeh' })).toBeVisible();
  await page.getByLabel('Photograph').setInputFiles('sample/DSC00445.jpg');
  await page.getByLabel('DA3 depth map').setInputFiles('sample/results.npz');
  await expect(page.locator('.status-area')).toContainText('Preview ready', { timeout: 20_000 });
  expect(requests.every((url) => url.startsWith('http://127.0.0.1:4173/'))).toBe(true);
  expect(requests.some((url) => /upload|api|depth/i.test(new URL(url).pathname))).toBe(false);
});
