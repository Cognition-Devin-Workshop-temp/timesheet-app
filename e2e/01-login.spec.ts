import { test, expect } from '@playwright/test';
import { TEST_EMAIL } from './helpers';

test.describe('Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('valid email login succeeds and navigates to dashboard', async ({ page }) => {
    await page.getByLabel('Email Address').fill(TEST_EMAIL);
    await page.getByRole('button', { name: 'Log In' }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('invalid email shows validation error', async ({ page }) => {
    await page.getByLabel('Email Address').fill('not-an-email');
    await page.getByRole('button', { name: 'Log In' }).click();
    // API returns validation error for invalid email format
    const errorAlert = page.getByRole('alert').filter({ hasText: /fail|invalid|error/i });
    await expect(errorAlert).toBeVisible({ timeout: 5000 });
  });

  test('empty email keeps login button disabled', async ({ page }) => {
    const loginButton = page.getByRole('button', { name: 'Log In' });
    await expect(loginButton).toBeDisabled();
  });

  test('login page displays expected UI elements', async ({ page }) => {
    await expect(page.getByText('Time Tracker')).toBeVisible();
    await expect(page.getByText(/enter your email/i)).toBeVisible();
    await expect(page.getByLabel('Email Address')).toBeVisible();
  });
});
