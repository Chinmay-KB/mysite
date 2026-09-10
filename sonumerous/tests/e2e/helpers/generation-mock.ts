import type { Page } from '@playwright/test';
import type { Generation } from '../../../shared/types';

/** E2E-only: enable refine UI without a real OpenRouter key; does not mock annotation uploads. */
export async function mockGenerationReadyForE2e(page: Page, options?: { completeImmediately?: boolean }) {
  await page.route('**/api/session', async route => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    const response = await route.fetch();
    const session = (await response.json()) as Record<string, unknown>;
    await route.fulfill({
      status: response.status(),
      contentType: 'application/json',
      body: JSON.stringify({ ...session, generationReady: true }),
    });
  });

  const syntheticJobs: Generation[] = [];

  await page.route('**/api/generations', async route => {
    if (route.request().method() === 'GET') {
      if (!syntheticJobs.length) {
        await route.continue();
        return;
      }
      try {
        const response = await route.fetch();
        const data = (await response.json()) as Generation[];
        const merged = [...syntheticJobs.filter(s => !data.some(d => d.id === s.id)), ...data];
        await route.fulfill({
          status: response.status(),
          contentType: 'application/json',
          body: JSON.stringify(merged),
        });
      } catch {
        await route.continue();
      }
      return;
    }
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }
    let parentAssetId: string | null = null;
    let outputAssetId: string | null = null;
    let requestKey: string = crypto.randomUUID();
    try {
      const body = route.request().postDataJSON() as {
        parentAssetId?: string | null;
        referenceIds?: string[];
        requestKey?: string;
        model?: string;
        prompt?: string;
      };
      parentAssetId = body.parentAssetId ?? null;
      outputAssetId = body.referenceIds?.[0] ?? body.parentAssetId ?? null;
      if (typeof body.requestKey === 'string') requestKey = body.requestKey;
    } catch {
      /* use defaults */
    }
    const id = crypto.randomUUID();
    const immediate = options?.completeImmediately === true;
    const job: Generation = {
      id,
      root_id: id,
      parent_asset_id: parentAssetId,
      model: 'google/gemini-3.1-flash-image',
      prompt: 'e2e synthetic refinement',
      status: immediate ? 'ready' : 'queued',
      error: null,
      output_asset_id: immediate ? outputAssetId : null,
      created_at: new Date().toISOString(),
      snapshot: JSON.stringify({ e2e: true, requestKey }),
    };
    syntheticJobs.unshift(job);
    await route.fulfill({
      status: 202,
      contentType: 'application/json',
      body: JSON.stringify(job),
    });
  });
}
