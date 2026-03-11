import { test, expect } from '@playwright/test';

test('login page loads', async ({ page }) => {
  await page.goto('/login');
  await expect(page.locator('h1')).toContainText('Brolonist');
});

test('can enter guest name', async ({ page }) => {
  await page.goto('/login');
  const input = page.locator('input[type="text"]');
  await input.fill('TestPlayer');
  await expect(input).toHaveValue('TestPlayer');
});
