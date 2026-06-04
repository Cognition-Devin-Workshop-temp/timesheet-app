import { test, expect } from '@playwright/test';
import { login, createClient, createWorkEntry, uniqueName } from './helpers';

test.describe('Reporting', () => {
  let clientName: string;

  test.beforeEach(async ({ page }) => {
    clientName = uniqueName('Report Client');
    await login(page);
    await createClient(page, clientName);
    await createWorkEntry(page, clientName, '5', 'Report entry one');
    await createWorkEntry(page, clientName, '3', 'Report entry two');
  });

  test('should show correct totals in report after creating entries', async ({ page }) => {
    await page.goto('/reports');
    await expect(page.getByRole('heading', { name: 'Reports' })).toBeVisible();

    // MUI Select — click on the select element directly
    const formControl = page.locator('.MuiFormControl-root').filter({ hasText: 'Select Client' });
    await formControl.locator('.MuiSelect-select').click();
    await page.getByRole('option', { name: clientName }).click();

    // Wait for report to load
    await expect(page.getByText('Total Hours')).toBeVisible({ timeout: 10000 });

    // Verify total hours (5 + 3 = 8.00)
    await expect(page.getByText('8.00')).toBeVisible();

    // Verify entry count
    await expect(page.getByText('Total Entries')).toBeVisible();
  });

  test('should show select prompt when no client is selected', async ({ page }) => {
    await page.goto('/reports');
    await expect(page.getByRole('heading', { name: 'Reports' })).toBeVisible();
    await expect(page.getByText('Choose a client')).toBeVisible();
  });
});
