import { expect, test, type Download, type Page } from '@playwright/test';

async function loadFixtures(page: Page): Promise<{ width: number; height: number }> {
  await page.goto('/');
  await page.getByLabel('Photograph').setInputFiles('sample/DSC00445.jpg');
  await page.getByLabel('DA3 depth map').setInputFiles('sample/results.npz');
  await expect(page.locator('.status-area')).toContainText('Preview ready', { timeout: 20_000 });
  return page.getByLabel('Photograph').evaluate(async (input: HTMLInputElement) => {
    const bitmap = await createImageBitmap(input.files![0]!);
    const dimensions = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return dimensions;
  });
}

async function decodedDownloadSize(page: Page, download: Download): Promise<{ width: number; height: number }> {
  const path = await download.path();
  if (!path) throw new Error('The browser did not provide a download path.');
  await page.evaluate(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.id = 'download-decoder';
    document.body.append(input);
  });
  await page.locator('#download-decoder').setInputFiles(path);
  return page.locator('#download-decoder').evaluate(async (input: HTMLInputElement) => {
    const file = input.files![0]!;
    const bitmap = await createImageBitmap(file);
    const result = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return result;
  });
}

test('downloads source-resolution JPEG and PNG images', async ({ page }) => {
  test.setTimeout(120_000);
  const source = await loadFixtures(page);
  const previewSize = await page.locator('canvas').evaluate((canvas: HTMLCanvasElement) => ({ width: canvas.width, height: canvas.height }));
  await page.getByRole('slider', { name: 'Blur Strength' }).fill('0.85');
  for (const format of ['jpeg', 'png'] as const) {
    await page.getByLabel('Download format').selectOption(format);
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download Image' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(format === 'jpeg' ? /-bokeh\.jpg$/ : /-bokeh\.png$/);
    const decoded = await decodedDownloadSize(page, download);
    expect(decoded).toEqual(source);
    await expect(page.locator('.status-area')).toContainText('Downloaded');
    await expect(page.getByRole('button', { name: 'Download Image' })).toBeEnabled();
    expect(await page.locator('canvas').evaluate((canvas: HTMLCanvasElement) => ({ width: canvas.width, height: canvas.height }))).toEqual(previewSize);
    await page.locator('#download-decoder').evaluate((element) => element.remove());
  }
});
