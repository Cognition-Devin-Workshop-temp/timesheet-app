import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('shows login page with email field and info alert', async ({ page }) => {
    await expect(page.getByText('Time Tracker')).toBeVisible();
    await expect(page.getByLabel('Email Address')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Log In' })).toBeVisible();
    await expect(page.getByText('This app intentionally does not have a password field')).toBeVisible();
  });

  test('valid email logs in and redirects to dashboard', async ({ page }) => {
    await page.getByLabel('Email Address').fill('user@test.com');
    await page.getByRole('button', { name: 'Log In' }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
    // Verify dashboard content loads — look for something on the dashboard
    await expect(page.locator('text=Dashboard').first()).toBeVisible({ timeout: 5000 });
  });

  test('invalid email shows error', async ({ page }) => {
    await page.getByLabel('Email Address').fill('not-an-email');
    await page.getByRole('button', { name: 'Log In' }).click();
    // The backend validates email format; we should see an error alert
    await expect(page.getByRole('alert').filter({ hasText: /fail|error|invalid/i })).toBeVisible({ timeout: 5000 });
  });

  test('empty email keeps Log In button disabled', async ({ page }) => {
    const loginBtn = page.getByRole('button', { name: 'Log In' });
    await expect(loginBtn).toBeDisabled();
  });

  test('can log out and return to login page', async ({ page }) => {
    // First log in
    await page.getByLabel('Email Address').fill('logout@test.com');
    await page.getByRole('button', { name: 'Log In' }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Click Logout button
    await page.getByRole('button', { name: 'Logout' }).click();
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });
});
