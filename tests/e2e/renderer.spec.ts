import { expect, test } from '@playwright/test';

test('compiles shaders and renders a complete preview framebuffer', async ({ page }) => {
  await page.goto('/tests/render-harness.html');
  await page.waitForFunction(() => Reflect.get(window, 'testReady') === true);
  expect(await page.evaluate(() => Reflect.get(window, 'testError'))).toBeNull();
  const capabilities = await page.evaluate(() => Reflect.get(window, 'rendererCapabilities'));
  expect(capabilities.maxTextureSize).toBeGreaterThanOrEqual(64);
  const canvas = page.locator('#preview');
  await expect(canvas).toHaveAttribute('width', '64');
  await expect(canvas).toHaveScreenshot('renderer-bokeh.png', { maxDiffPixelRatio: 0.03 });
});

test('zero blur strength renders the sharp source', async ({ page }) => {
  await page.goto('/tests/render-harness.html?strength=zero');
  await page.waitForFunction(() => Reflect.get(window, 'testReady') === true);
  expect(await page.evaluate(() => Reflect.get(window, 'testError'))).toBeNull();
  await expect(page.locator('#preview')).toHaveScreenshot('renderer-sharp.png', { maxDiffPixelRatio: 0.01 });
});

test('releases preview resources after resize and disposal', async ({ page }) => {
  await page.goto('/tests/render-harness.html?lifecycle=1');
  await page.waitForFunction(() => Reflect.get(window, 'testReady') === true);
  expect(await page.evaluate(() => Reflect.get(window, 'testError'))).toBeNull();
  const resources = await page.evaluate(() => Reflect.get(window, 'rendererResources'));
  expect(resources.texturesDeleted).toBe(resources.texturesCreated);
  expect(resources.framebuffersDeleted).toBe(resources.framebuffersCreated);
});
