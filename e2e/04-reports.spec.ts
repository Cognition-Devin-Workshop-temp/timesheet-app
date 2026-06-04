import { test, expect } from '@playwright/test';
import { login, navigateTo, createClient, createWorkEntry } from './helpers';

test.describe('Reporting', () => {
  test.beforeEach(async ({ page, request }) => {
    // Reset DB for test isolation
    await request.post('http://localhost:3001/api/test/reset');
    await login(page, 'report-test@example.com');
    // Create a client and some work entries
    await createClient(page, { name: 'Report Client' });
    await createWorkEntry(page, { clientName: 'Report Client', hours: '5', description: 'First entry' });
    await createWorkEntry(page, { clientName: 'Report Client', hours: '3', description: 'Second entry' });
  });

  test('should show correct totals after creating entries', async ({ page }) => {
    await navigateTo(page, 'Reports');

    // Select the client
    await page.getByRole('combobox', { name: /select client/i }).click();
    await page.getByRole('option', { name: 'Report Client' }).click();

    // Wait for report to load
    await expect(page.getByText('Total Hours')).toBeVisible({ timeout: 10000 });

    // Verify totals: 5 + 3 = 8 hours, 2 entries
    await expect(page.getByText('8.00')).toBeVisible();
    // Entry count inside its card
    const entriesCard = page.locator('.MuiCardContent-root').filter({ hasText: 'Total Entries' });
    await expect(entriesCard.locator('.MuiTypography-h4')).toHaveText('2');
    // Average = 8/2 = 4
    await expect(page.getByText('4.00')).toBeVisible();

    // Verify entries appear in the table
    await expect(page.getByText('First entry')).toBeVisible();
    await expect(page.getByText('Second entry')).toBeVisible();
  });

  test('should show empty state when no entries for a client', async ({ page }) => {
    // Create a second client with no entries
    await createClient(page, { name: 'Empty Client' });
    await navigateTo(page, 'Reports');

    await page.getByRole('combobox', { name: /select client/i }).click();
    await page.getByRole('option', { name: 'Empty Client' }).click();

    await expect(page.getByText('No work entries found for this client')).toBeVisible({ timeout: 10000 });
  });

  test('should show prompt when no clients exist', async ({ page }) => {
    // Login with user who has no clients
    await page.getByRole('button', { name: 'Logout' }).click();
    await login(page, 'no-clients-report@example.com');
    await navigateTo(page, 'Reports');

    await expect(page.getByText('You need to create at least one client before generating reports')).toBeVisible();
  });

  test('should update totals when more entries are added', async ({ page }) => {
    // Add a third entry
    await createWorkEntry(page, { clientName: 'Report Client', hours: '2', description: 'Third entry' });

    await navigateTo(page, 'Reports');
    await page.getByRole('combobox', { name: /select client/i }).click();
    await page.getByRole('option', { name: 'Report Client' }).click();

    // 5 + 3 + 2 = 10 hours, 3 entries, avg 3.33
    await expect(page.getByText('Total Hours')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('10.00')).toBeVisible();
    const entriesCard = page.locator('.MuiCardContent-root').filter({ hasText: 'Total Entries' });
    await expect(entriesCard.locator('.MuiTypography-h4')).toHaveText('3');
    await expect(page.getByText('3.33')).toBeVisible();
  });
});
