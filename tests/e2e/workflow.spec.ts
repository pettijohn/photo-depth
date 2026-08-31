import { Buffer } from 'buffer';
import { expect, test } from '@playwright/test';

async function loadFixtures(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await page.getByLabel('Photograph').setInputFiles('sample/DSC00445.jpg');
  await page.getByLabel('DA3 depth map').setInputFiles('sample/results.npz');
  await expect(page.locator('.status-area')).toContainText('Preview ready', { timeout: 20_000 });
}

test('loads inputs and updates all focus controls with the keyboard', async ({ page }) => {
  await loadFixtures(page);
  const labels = [
    'Foreground cutoff', 'Foreground edge softness', 'Background cutoff',
    'Background edge softness', 'Blur Strength',
  ];
  for (const label of labels) {
    const slider = page.getByRole('slider', { name: label });
    const before = await slider.inputValue();
    await slider.focus();
    await slider.press('ArrowRight');
    await expect(slider).not.toHaveValue(before);
  }
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Download Image' })).toBeEnabled();
});

test('ignores stale file results after rapid replacement', async ({ page }) => {
  await page.goto('/');
  const photoInput = page.getByLabel('Photograph');
  await photoInput.setInputFiles({ name: 'invalid.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('invalid') });
  await photoInput.setInputFiles('sample/DSC00445.jpg');
  await page.getByLabel('DA3 depth map').setInputFiles('sample/results.npz');
  await expect(page.locator('.status-area')).toContainText('Preview ready', { timeout: 20_000 });
  await expect(page.locator('canvas')).toBeVisible();
});

test('restores the preview after WebGL context loss', async ({ page }) => {
  await loadFixtures(page);
  const canLoseContext = await page.locator('canvas').evaluate((canvas: HTMLCanvasElement) => {
    const extension = canvas.getContext('webgl2')?.getExtension('WEBGL_lose_context');
    Reflect.set(window, 'loseContextExtension', extension);
    extension?.loseContext();
    return Boolean(extension);
  });
  test.skip(!canLoseContext, 'WEBGL_lose_context is not available.');
  await expect(page.locator('.status-area')).toContainText('GPU context was lost');
  await page.evaluate(() => Reflect.get(window, 'loseContextExtension').restoreContext());
  await expect(page.locator('.status-area')).toContainText('GPU preview was restored', { timeout: 20_000 });
  await expect(page.locator('canvas')).toBeVisible();
});

test('selects output formats and preserves the preview after invalid replacement input', async ({ page }) => {
  await loadFixtures(page);
  const format = page.getByRole('combobox', { name: 'Download format' });
  await expect(format).toHaveValue('jpeg');
  await format.selectOption('png');
  await expect(format).toHaveValue('png');
  await page.getByLabel('DA3 depth map').setInputFiles({ name: 'invalid.npz', mimeType: 'application/octet-stream', buffer: Buffer.from('invalid') });
  await expect(page.locator('.status-area')).toContainText('not a valid NPZ file');
  await expect(page.locator('canvas')).toBeVisible();
});
