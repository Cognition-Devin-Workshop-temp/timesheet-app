import { test, expect } from '@playwright/test';
import { login, navigateTo, resetAppState, createClient, createWorkEntry } from './helpers';

test.describe('Reporting', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await resetAppState(page);
  });

  test('verify reports show correct totals after creating entries', async ({ page }) => {
    await createClient(page, { name: 'ReportClient' });

    // Create three work entries with known hours
    await createWorkEntry(page, { clientName: 'ReportClient', hours: '3', description: 'Task A' });
    await createWorkEntry(page, { clientName: 'ReportClient', hours: '5', description: 'Task B' });
    await createWorkEntry(page, { clientName: 'ReportClient', hours: '2.5', description: 'Task C' });

    // Go to reports and select the client
    await navigateTo(page, 'Reports');
    await page.locator('.MuiSelect-select').click();
    await page.getByRole('option', { name: 'ReportClient' }).click();

    // Wait for report data to load
    await expect(page.getByText('Total Hours')).toBeVisible({ timeout: 5000 });

    // Total hours = 3 + 5 + 2.5 = 10.5
    await expect(page.getByText('10.50')).toBeVisible();
    // Total entries = 3
    await expect(page.getByText('3').first()).toBeVisible();
    // Average = 10.5 / 3 = 3.50
    await expect(page.getByText('3.50')).toBeVisible();

    // Verify individual entries in the report table
    await expect(page.getByRole('cell', { name: 'Task A' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Task B' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Task C' })).toBeVisible();
  });

  test('report shows no entries for client with no work entries', async ({ page }) => {
    await createClient(page, { name: 'EmptyClient' });

    await navigateTo(page, 'Reports');
    await page.locator('.MuiSelect-select').click();
    await page.getByRole('option', { name: 'EmptyClient' }).click();

    await expect(page.getByText('Total Hours')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('0.00').first()).toBeVisible();
    await expect(page.getByText('No work entries found for this client')).toBeVisible();
  });

  test('shows prompt when no clients exist', async ({ page }) => {
    await navigateTo(page, 'Reports');
    await expect(page.getByText('You need to create at least one client before generating reports')).toBeVisible();
  });

  test('CSV export button is enabled when client is selected', async ({ page }) => {
    await createClient(page, { name: 'ExportClient' });
    await createWorkEntry(page, { clientName: 'ExportClient', hours: '1', description: 'Export test' });

    await navigateTo(page, 'Reports');
    await page.locator('.MuiSelect-select').click();
    await page.getByRole('option', { name: 'ExportClient' }).click();
    await expect(page.getByText('Total Hours')).toBeVisible({ timeout: 5000 });

    // CSV export icon should be enabled
    const csvBtn = page.getByRole('button', { name: /csv/i });
    await expect(csvBtn).toBeEnabled();
  });
});
