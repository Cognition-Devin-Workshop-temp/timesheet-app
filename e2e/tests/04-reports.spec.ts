import { test, expect } from '@playwright/test';
import { login, createClient, createWorkEntry } from './helpers';

test.describe('Reporting', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should show correct totals after creating entries', async ({ page }) => {
    const clientName = `ReportClient ${Date.now()}`;
    await createClient(page, { name: clientName });

    // Create two work entries
    await createWorkEntry(page, { clientName, hours: '3', description: 'Task A' });
    await createWorkEntry(page, { clientName, hours: '5', description: 'Task B' });

    // Navigate to reports
    await page.goto('/reports');
    await expect(page.getByRole('heading', { name: 'Reports' })).toBeVisible();

    // Select the client from the dropdown
    await page.locator('main').getByRole('combobox').click();
    await page.getByRole('option', { name: clientName }).click();

    // Wait for report data
    await page.waitForResponse((r) => r.url().includes('/api/reports/client/'));

    // Verify totals: 3 + 5 = 8 total hours, 2 entries, 4.00 average
    await expect(page.getByText('8.00').first()).toBeVisible();
    await expect(page.getByText('4.00').first()).toBeVisible();

    // Verify entries listed
    await expect(page.getByText('Task A')).toBeVisible();
    await expect(page.getByText('Task B')).toBeVisible();
  });

  test('should show no entries message for client without work entries', async ({ page }) => {
    const clientName = `EmptyReport ${Date.now()}`;
    await createClient(page, { name: clientName });

    await page.goto('/reports');
    await page.locator('main').getByRole('combobox').click();
    await page.getByRole('option', { name: clientName }).click();

    await page.waitForResponse((r) => r.url().includes('/api/reports/client/'));

    await expect(page.getByText('0.00').first()).toBeVisible();
    await expect(page.getByText('No work entries found for this client.')).toBeVisible();
  });

  test('should prompt to create client when none exist', async ({ page }) => {
    // Use a fresh email to guarantee no clients
    const freshEmail = `fresh-${Date.now()}@example.com`;
    await page.goto('/login');
    await page.getByLabel('Email Address').fill(freshEmail);
    await page.getByRole('button', { name: 'Log In' }).click();
    await page.waitForURL('**/dashboard');

    await page.goto('/reports');
    await expect(
      page.getByText('You need to create at least one client before generating reports.')
    ).toBeVisible();
  });
});
