import { test, expect } from '@playwright/test';
import { login, uniqueEmail } from './helpers';

test.describe('Login flow', () => {
  test('valid email login succeeds', async ({ page }) => {
    const email = uniqueEmail();
    await page.goto('/login');
    await page.locator('#email').fill(email);
    await page.getByRole('button', { name: 'Log In' }).click();
    await page.waitForURL('**/dashboard', { timeout: 10_000 });
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('invalid email shows error', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#email').fill('not-an-email');
    await page.getByRole('button', { name: 'Log In' }).click();
    // Backend Joi validation will return 400; frontend shows error alert
    await expect(page.getByRole('alert').filter({ hasText: /failed|error|invalid/i })).toBeVisible({ timeout: 5_000 });
  });

  test('empty email cannot submit — button disabled', async ({ page }) => {
    await page.goto('/login');
    // Email starts empty, button should be disabled
    const btn = page.getByRole('button', { name: 'Log In' });
    await expect(btn).toBeDisabled();
  });

  test('after login, user stays logged in on page reload', async ({ page }) => {
    const email = uniqueEmail();
    await login(page, email);
    await page.reload();
    // Should still be on dashboard, not redirected to login
    await expect(page).toHaveURL(/dashboard/);
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('logout works', async ({ page }) => {
    const email = uniqueEmail();
    await login(page, email);
    await page.getByRole('button', { name: 'Logout' }).click();
    // Should be redirected to login
    await expect(page).toHaveURL(/login/);
  });
});
