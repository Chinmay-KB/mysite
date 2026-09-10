import { test, expect } from '@playwright/test';

test('unauthenticated visitors can use the public landing', async ({ page }) => {
  await page.route('**/api/public/themes', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify([
      { slug: 'studio', name: 'Studio Portrait', description: 'Editorial light.', coverUrl: '/public/covers/studio' },
      { slug: 'wanderlust', name: 'Wanderlust', description: 'A travel collage.', coverUrl: '/public/covers/wanderlust' },
    ]),
  }));

  await page.goto('/');

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: /AI generated for the naturally beautiful/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /Let's get started/i })).toHaveAttribute('href', '/app/');

  const cards = page.locator('.theme-card');
  await expect(cards).toHaveCount(2);
  await expect(cards.nth(0)).toHaveAttribute('href', '/app/');
  await expect(cards.nth(1)).toHaveAttribute('href', '/app/');
  await expect(page.getByRole('img', { name: 'Studio Portrait cover' })).toBeVisible();
  await expect(page.getByText('Wanderlust', { exact: true })).toBeVisible();
});

test('public theme metadata is available without identity', async ({ request }) => {
  const response = await request.get('/api/public/themes');

  expect(response.status()).toBe(200);
  const themes = await response.json() as { slug: string; name: string; description: string; coverUrl: string }[];
  expect(themes.length).toBeGreaterThan(0);
  expect(themes.every(theme => theme.coverUrl.startsWith('/public/covers/'))).toBe(true);
  expect(themes.every(theme => theme.description.length > 0)).toBe(true);
});

test.describe('landing navigation', () => {
  test('does not redirect before navigation', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/$/);
  });
});
