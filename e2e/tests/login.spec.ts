import { test, expect } from '@playwright/test';

test.describe('Login flow', () => {
  test('should log in with a valid email and redirect to dashboard', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByText('Time Tracker')).toBeVisible();
    await expect(page.getByText('Enter your email to log in')).toBeVisible();

    await page.getByLabel('Email Address').fill('test@example.com');
    await page.getByRole('button', { name: 'Log In' }).click();

    await page.waitForURL('**/dashboard');
    await expect(page.getByText('test@example.com')).toBeVisible();
  });

  test('should show error for invalid email format', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('Email Address').fill('notanemail');
    await page.getByRole('button', { name: 'Log In' }).click();

    await expect(page.getByRole('alert').filter({ hasText: /failed|error|invalid/i })).toBeVisible({ timeout: 10000 });
  });

  test('should disable Log In button when email is empty', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('button', { name: 'Log In' })).toBeDisabled();
  });
});
