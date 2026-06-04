import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('valid credentials succeed and redirect to dashboard', async ({ page }) => {
    await page.getByLabel('Email Address').fill('test@example.com');
    await page.getByRole('button', { name: 'Log In' }).click();

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('invalid email shows error', async ({ page }) => {
    await page.getByLabel('Email Address').fill('not-an-email');
    await page.getByRole('button', { name: 'Log In' }).click();

    await expect(page.getByRole('alert').filter({ hasText: /failed|error|invalid/i })).toBeVisible();
  });

  test('login button is disabled when email is empty', async ({ page }) => {
    const loginButton = page.getByRole('button', { name: 'Log In' });
    await expect(loginButton).toBeDisabled();
  });

  test('successful login stores user session and persists on reload', async ({ page }) => {
    await page.getByLabel('Email Address').fill('session@example.com');
    await page.getByRole('button', { name: 'Log In' }).click();

    await expect(page).toHaveURL(/\/dashboard/);

    await page.reload();
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
