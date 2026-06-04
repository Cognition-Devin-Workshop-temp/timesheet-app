import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('should display the login page with correct elements', async ({ page }) => {
    await expect(page.getByText('Time Tracker')).toBeVisible();
    await expect(page.getByText('Enter your email to log in')).toBeVisible();
    await expect(page.getByLabel('Email Address')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Log In' })).toBeVisible();
  });

  test('should login with valid email and redirect to dashboard', async ({ page }) => {
    await page.getByLabel('Email Address').fill('valid@example.com');
    await page.getByRole('button', { name: 'Log In' }).click();

    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
    await expect(page.getByText('valid@example.com')).toBeVisible();
  });

  test('should show error for invalid email format', async ({ page }) => {
    await page.getByLabel('Email Address').fill('not-an-email');
    await page.getByRole('button', { name: 'Log In' }).click();

    // Backend validates email with Joi; should show an error
    await expect(page.getByRole('alert').filter({ hasText: /failed|error|invalid/i })).toBeVisible({ timeout: 10000 });
    // Should stay on login page
    await expect(page).toHaveURL(/\/login/);
  });

  test('should disable login button when email is empty', async ({ page }) => {
    const loginBtn = page.getByRole('button', { name: 'Log In' });
    await expect(loginBtn).toBeDisabled();
  });

  test('should persist session after login', async ({ page }) => {
    await page.getByLabel('Email Address').fill('persist@example.com');
    await page.getByRole('button', { name: 'Log In' }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Reload the page — session should persist via localStorage
    await page.reload();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });

  test('should logout and redirect to login page', async ({ page }) => {
    // First login
    await page.getByLabel('Email Address').fill('logout@example.com');
    await page.getByRole('button', { name: 'Log In' }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Click logout
    await page.getByRole('button', { name: 'Logout' }).click();
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });
});
