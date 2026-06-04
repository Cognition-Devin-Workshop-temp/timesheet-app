import { test, expect } from '@playwright/test';
import { TEST_EMAIL } from './helpers';

test.describe('Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('should display the login form', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Time Tracker' })).toBeVisible();
    await expect(page.getByLabel('Email Address')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Log In' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Log In' })).toBeDisabled();
  });

  test('should login with valid email and redirect to dashboard', async ({ page }) => {
    await page.getByLabel('Email Address').fill(TEST_EMAIL);
    await expect(page.getByRole('button', { name: 'Log In' })).toBeEnabled();
    await page.getByRole('button', { name: 'Log In' }).click();
    await page.waitForURL('**/dashboard');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByText(TEST_EMAIL)).toBeVisible();
  });

  test('should show error for invalid email format', async ({ page }) => {
    await page.getByLabel('Email Address').fill('not-an-email');
    await page.getByRole('button', { name: 'Log In' }).click();
    await expect(page.getByRole('alert').filter({ hasText: /fail|error|invalid/i })).toBeVisible();
    await expect(page).toHaveURL(/.*login.*/);
  });

  test('should keep the Log In button disabled when email field is empty', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Log In' })).toBeDisabled();
    await page.getByLabel('Email Address').fill('a');
    await expect(page.getByRole('button', { name: 'Log In' })).toBeEnabled();
    await page.getByLabel('Email Address').clear();
    await expect(page.getByRole('button', { name: 'Log In' })).toBeDisabled();
  });
});
