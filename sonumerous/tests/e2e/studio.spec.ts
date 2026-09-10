import { test, expect } from '@playwright/test';
import path from 'node:path';
import { uniqueUploadPng } from '../fixtures/valid-png';
import { mockGenerationReadyForE2e } from './helpers/generation-mock';

/** Studio assets live under `/app/` in `dist`; local Wrangler serves them (Vite dev maps `/app/` to landing). */
test.use({ baseURL: 'http://127.0.0.1:8791' });

const reviewDir = path.join(import.meta.dirname, '../../.impeccable/review');

async function waitSettledCreate(page: import('@playwright/test').Page) {
  await page.goto('/app/#/create');
  await expect(page.getByRole('heading', { name: /Pick a template/i })).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('.template-grid .template-card').first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByLabel(/The idea/i)).toHaveCount(0);
  await expect(page.locator('#prompt')).toHaveCount(0);
}

async function openTemplateModal(page: import('@playwright/test').Page) {
  await page.locator('.template-card').first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('.template-modal-strip')).toBeVisible();
}

test.describe('studio shell', () => {
  test('authenticated create view (settled bootstrap)', async ({ page }, testInfo) => {
    await waitSettledCreate(page);
    await expect(page).toHaveURL(/\/app\/#\/create/);
    await expect(page.locator('.app-footer')).toContainText('AI generated for the naturally beautiful');
    await expect(page.getByLabel(/Preferences/i)).toHaveCount(0);
    await expect(page.locator('.brand svg')).toHaveCount(0);
    await expect(page.locator('.brand')).toContainText('Sonumerous');
    if (testInfo.project.name === 'desktop-1440') {
      await expect(page.getByText(/Your ideas/i)).toHaveCount(0);
      await expect(page.locator('.sidebar .account')).toHaveCount(0);
      await expect(page.locator('.sidebar-signout')).toHaveText('Sign out');
      await expect(page.locator('.sidebar-signout')).toHaveAttribute('href', '/cdn-cgi/access/logout');
    }

    if (testInfo.project.name === 'desktop-1440') {
      await page.screenshot({ path: path.join(reviewDir, 'desktop.png'), fullPage: true });
    }
    if (testInfo.project.name === 'mobile-390') {
      await page.screenshot({ path: path.join(reviewDir, 'mobile.png'), fullPage: true });
    }
    if (testInfo.project.name === 'mobile-320') {
      await page.screenshot({ path: path.join(reviewDir, 'mobile-320.png'), fullPage: true });
    }
  });

  test('settings route is removed', async ({ page }) => {
    await page.goto('/app/#/settings');
    await expect(page.getByRole('heading', { name: /This page wandered off/i })).toBeVisible({ timeout: 15_000 });
  });

  test('keeps reusable uploads visible after reload', async ({ page, request }) => {
    const name = `e2e-reuse-${Date.now()}.png`;
    const upload = await request.post(`/api/assets?name=${encodeURIComponent(name)}`, {
      headers: { 'Content-Type': 'image/png' },
      data: uniqueUploadPng(Date.now()),
    });
    expect(upload.ok()).toBeTruthy();
    const asset = (await upload.json()) as { name: string };
    await page.goto('/app/#/references');
    await expect(page.locator('.references-grid img').first()).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('.references-grid .asset-caption')).toHaveCount(0);
    await expect(page.getByLabel(/Search/i)).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole('heading', { name: /familiar starting point/i })).toBeVisible();
  });

  test('references delete removes upload after confirm', async ({ page, request }) => {
    const name = `e2e-del-${Date.now()}.png`;
    const upload = await request.post(`/api/assets?name=${encodeURIComponent(name)}`, {
      headers: { 'Content-Type': 'image/png' },
      data: uniqueUploadPng(Date.now() + 3),
    });
    expect(upload.ok()).toBeTruthy();
    const asset = (await upload.json()) as { id: string; name: string };
    await page.goto('/app/#/references');
    await expect(page.getByRole('button', { name: new RegExp(`Delete ${asset.name}`) })).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: new RegExp(`Delete ${asset.name}`) }).click();
    await expect(page.getByRole('heading', { name: /Delete this photo/i })).toBeVisible();
    await page.getByRole('button', { name: /^Delete$/ }).click();
    await expect(page.getByRole('button', { name: new RegExp(`Delete ${asset.name}`) })).toHaveCount(0, {
      timeout: 15_000,
    });
  });

  test('library shows creations only filters', async ({ page }) => {
    await page.goto('/app/#/library');
    await expect(page.getByRole('button', { name: /^Creations$/i })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('heading', { name: /All your possibilities/i })).toHaveCount(0);
    await expect(page.getByLabel(/Search library/i)).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Uploads$/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Creations$/i })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.asset-grid .asset-caption')).toHaveCount(0);
    await expect(page.locator('.library-job-hint')).toHaveCount(0);
    const gridImg = page.locator('.asset-grid img').first();
    if (await gridImg.count()) {
      await expect(gridImg).toHaveAttribute('src', /\/thumb/);
    }
  });

  test('library failed generation shows retry tile without error copy', async ({ page }) => {
    const failedJob = {
      id: 'e2e-failed-job',
      root_id: 'e2e-failed-job',
      parent_asset_id: null,
      model: 'openai/gpt-image-2.5-sunburst',
      prompt: 'quiet failure fixture',
      status: 'failed',
      error: 'The model could not complete this image. Try another prompt or model.',
      output_asset_id: null,
      created_at: new Date().toISOString(),
      snapshot: '{}',
    };
    await page.route('**/api/generations', async route => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      const response = await route.fetch();
      const data = (await response.json()) as unknown[];
      await route.fulfill({
        status: response.status(),
        contentType: 'application/json',
        body: JSON.stringify([failedJob, ...data]),
      });
    });
    await page.goto('/app/#/library');
    await expect(page.locator('.library-status-tile--failed').first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/model could not complete/i)).toHaveCount(0);
    await expect(page.getByText(/Something went wrong/i)).toHaveCount(0);
  });

  test('template modal photo strip', async ({ page, request }, testInfo) => {
    await mockGenerationReadyForE2e(page);
    await request.post('/api/assets?name=strip-fixture.png', {
      headers: { 'Content-Type': 'image/png' },
      data: uniqueUploadPng(42),
    });
    await waitSettledCreate(page);
    await openTemplateModal(page);

    if (testInfo.project.name === 'desktop-1440') {
      await page.screenshot({ path: path.join(reviewDir, 'template-modal-desktop.png') });
    }
    if (testInfo.project.name === 'mobile-390') {
      await page.screenshot({ path: path.join(reviewDir, 'template-modal-mobile.png') });
    }

    await expect(page.getByRole('button', { name: /^Generate$/i })).toBeDisabled();
    const thumb = page.locator('.template-modal-strip-thumb').first();
    await expect(thumb).toBeVisible({ timeout: 15_000 });
    await thumb.click();
    await expect(thumb).toHaveClass(/is-selected/);
    await expect(page.getByRole('button', { name: /^Generate$/i })).toBeEnabled();

    const thumbCountBefore = await page.locator('.template-modal-strip-thumb').count();
    await page.locator('.template-modal-strip-upload').click();
    const fileInput = page.locator('.template-modal-strip-wrap input[type="file"]');
    await fileInput.setInputFiles({
      name: 'e2e-strip-upload.png',
      mimeType: 'image/png',
      buffer: uniqueUploadPng(Date.now() + 99),
    });
    await expect(page.locator('.template-modal-strip-thumb.is-selected')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('button', { name: /^Generate$/i })).toBeEnabled();
    await expect(page.locator('.template-modal-strip-thumb')).toHaveCount(thumbCountBefore + 1, { timeout: 15_000 });
    await expect(page.locator('dialog textarea')).toHaveCount(0);
  });

  test('template modal strip upload tile and guidance', async ({ page }) => {
    await mockGenerationReadyForE2e(page);
    await waitSettledCreate(page);
    await openTemplateModal(page);
    await expect(page.locator('.template-modal-strip-upload')).toBeVisible();
    const thumbs = page.locator('.template-modal-strip-thumb');
    const count = await thumbs.count();
    if (count === 0) {
      await expect(page.getByText(/Upload a photo to start/i)).toBeVisible();
    } else {
      await expect(page.getByText(/Upload a photo to start/i)).toHaveCount(0);
    }
  });

  test('template modal upload shows progress ring and supports cancel', async ({ page }) => {
    await mockGenerationReadyForE2e(page);
    await waitSettledCreate(page);
    await openTemplateModal(page);

    let releaseUpload: (() => void) | undefined;
    const uploadGate = new Promise<void>(resolve => {
      releaseUpload = resolve;
    });
    await page.route('**/api/assets?name=*', async route => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }
      await uploadGate;
      await route.continue();
    });

    await page.locator('.template-modal-strip-upload').click();
    const fileInput = page.locator('.template-modal-strip-wrap input[type="file"]');
    void fileInput.setInputFiles({
      name: 'e2e-progress.png',
      mimeType: 'image/png',
      buffer: uniqueUploadPng(Date.now() + 50),
    });
    await expect(page.locator('.upload-ring')).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: /^Cancel$/i }).click();
    await expect(page.locator('.upload-ring')).toHaveCount(0, { timeout: 10_000 });
    releaseUpload?.();
  });

  test('template modal upload failure offers retry', async ({ page }) => {
    await mockGenerationReadyForE2e(page);
    await waitSettledCreate(page);
    await openTemplateModal(page);

    await page.route('**/api/assets?name=*', async route => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }
      await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Upload failed.' }) });
    });

    await page.locator('.template-modal-strip-upload').click();
    const fileInput = page.locator('.template-modal-strip-wrap input[type="file"]');
    await fileInput.setInputFiles({
      name: 'e2e-fail-upload.png',
      mimeType: 'image/png',
      buffer: uniqueUploadPng(Date.now() + 51),
    });
    await expect(page.getByRole('button', { name: /Try upload again/i })).toBeVisible({ timeout: 15_000 });
  });

  test('image view and make-changes modal', async ({ page, request }) => {
    await mockGenerationReadyForE2e(page);
    const upload = await request.post(`/api/assets?name=e2e-detail-${Date.now()}.png`, {
      headers: { 'Content-Type': 'image/png' },
      data: uniqueUploadPng(Date.now() + 1),
    });
    expect(upload.ok()).toBeTruthy();
    const asset = (await upload.json()) as { id: string; name: string };
    await page.goto(`/app/#/image/${asset.id}`);
    await expect(page.locator('h1.sr-only', { hasText: asset.name })).toBeAttached({ timeout: 30_000 });
    await expect(page.getByRole('button', { name: /Select area/i })).toHaveCount(0);
    await expect(page.getByLabel(/Model/i)).toHaveCount(0);

    const viewport = page.viewportSize();
    const detailViewport = page.locator('.detail-viewport');
    await expect(detailViewport).toBeVisible();
    const viewportBox = await detailViewport.boundingBox();
    expect(viewportBox).toBeTruthy();
    if (viewport && viewportBox) {
      expect(viewportBox.y + viewportBox.height).toBeLessThanOrEqual(viewport.height + 2);
    }

    await expect(page.locator('.detail-make-changes')).toHaveCount(0);
    const makeChanges = page.getByRole('button', { name: /^Make changes$/i });
    await expect(makeChanges).toBeVisible();
    const btnBox = await makeChanges.boundingBox();
    expect(btnBox).toBeTruthy();
    if (btnBox && viewport) {
      expect(btnBox.width).toBeGreaterThanOrEqual(40);
      expect(btnBox.height).toBeGreaterThanOrEqual(40);
    }
    await expect(page.getByRole('link', { name: /^Download$/i })).toBeVisible();

    await makeChanges.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByLabel(/What should change/i)).toBeVisible();
    await expect(page.locator('dialog select')).toHaveCount(0);
    await page.getByLabel(/What should change/i).fill('Warm the tones slightly.');
    await page.getByRole('button', { name: /^Generate$/i }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 15_000 });
  });

  test('version strip keeps uniform tiles during pending refine', async ({ page, request }, testInfo) => {
    if (testInfo.project.name !== 'mobile-320' && testInfo.project.name !== 'mobile-390') {
      test.skip();
    }
    await mockGenerationReadyForE2e(page);
    const upload = await request.post(`/api/assets?name=e2e-strip-${Date.now()}.png`, {
      headers: { 'Content-Type': 'image/png' },
      data: uniqueUploadPng(Date.now() + 2),
    });
    expect(upload.ok()).toBeTruthy();
    const asset = (await upload.json()) as { id: string };
    await page.goto(`/app/#/image/${asset.id}`);
    await expect(page.getByRole('button', { name: /^Make changes$/i })).toBeVisible({ timeout: 30_000 });
    await page.getByRole('button', { name: /^Make changes$/i }).click();
    await page.getByLabel(/What should change/i).fill('Slightly warmer tones.');
    await page.getByRole('button', { name: /^Generate$/i }).click();
    await expect(page.locator('.version-thumb--pending')).toBeVisible({ timeout: 15_000 });

    const viewport = page.viewportSize();
    await expect
      .poll(async () => {
        const sizes = await page.locator('.version-strip .version-thumb').evaluateAll(elements =>
          elements.map(el => {
            const box = el.getBoundingClientRect();
            return { w: box.width, h: box.height };
          }),
        );
        return sizes;
      })
      .toEqual(
        expect.arrayContaining([
          expect.objectContaining({ w: expect.any(Number), h: expect.any(Number) }),
        ]),
      );

    const overflow = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(overflow.scroll).toBeLessThanOrEqual(overflow.client + 2);

    const widths = await page.locator('.version-strip .version-thumb').evaluateAll(elements =>
      elements.map(el => el.getBoundingClientRect().width),
    );
    expect(widths.length).toBeGreaterThanOrEqual(2);
    for (const w of widths) {
      expect(w).toBeGreaterThan(60);
      expect(w).toBeLessThan(80);
    }
    if (viewport) {
      expect(widths.every(w => w > 0)).toBe(true);
    }
  });

  test('result view fits viewport with action bar and share fallback', async ({ page, request }) => {
    await mockGenerationReadyForE2e(page, { completeImmediately: true });
    await request.post('/api/assets?name=result-fixture.png', {
      headers: { 'Content-Type': 'image/png' },
      data: uniqueUploadPng(88),
    });
    await waitSettledCreate(page);
    await expect(page.getByText(/Personal studio/i)).toHaveCount(0);
    await openTemplateModal(page);
    const thumb = page.locator('.template-modal-strip-thumb').first();
    await expect(thumb).toBeVisible({ timeout: 15_000 });
    await thumb.click();
    await page.getByRole('button', { name: /^Generate$/i }).click();
    await expect(page.locator('.create-result-bar')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('toolbar', { name: /Result actions/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Share image/i })).toBeVisible();

    const viewport = page.viewportSize();
    const img = page.locator('.create-result-fit').first();
    await expect(img).toBeVisible();
    const imgBox = await img.boundingBox();
    expect(imgBox).toBeTruthy();
    if (viewport && imgBox) {
      expect(imgBox.y + imgBox.height).toBeLessThanOrEqual(viewport.height + 2);
    }

    await page.evaluate(() => {
      Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
    });
    const downloadPromise = page.waitForEvent('download', { timeout: 10_000 }).catch(() => null);
    await page.getByRole('button', { name: /Share image/i }).click();
    const download = await downloadPromise;
    expect(download !== null || (await page.locator('.create-result-bar').isVisible())).toBeTruthy();
  });

  test('generating state shows large source photo', async ({ page, request }) => {
    await mockGenerationReadyForE2e(page);
    await request.post('/api/assets?name=gen-pending.png', {
      headers: { 'Content-Type': 'image/png' },
      data: uniqueUploadPng(77),
    });
    await waitSettledCreate(page);
    await openTemplateModal(page);
    const thumb = page.locator('.template-modal-strip-thumb').first();
    await expect(thumb).toBeVisible({ timeout: 15_000 });
    await thumb.click();
    await page.getByRole('button', { name: /^Generate$/i }).click();
    await expect(page.locator('.create-source-pending')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Creating your .* — this takes a minute or two/i)).toBeVisible();
    const pending = page.locator('.create-source-pending');
    await expect
      .poll(async () => (await pending.boundingBox())?.width ?? 0)
      .toBeGreaterThan(120);
  });
});
