import { test, expect } from '@playwright/test';
import { login, createClient, selectClient, uniqueName } from './helpers';

test.describe('Reports', () => {
  let clientName: string;

  test.beforeEach(async ({ page }) => {
    await login(page);
    page.on('dialog', (dialog) => dialog.accept());

    clientName = uniqueName('ReportClient');
    await createClient(page, clientName, { department: 'Finance' });

    // Create two work entries for the client
    await page.goto('/work-entries');
    for (const hours of ['3', '5']) {
      await page.getByRole('button', { name: 'Add Work Entry' }).click();
      await selectClient(page, clientName);
      await page.getByLabel('Hours').fill(hours);
      await page.getByLabel('Description').fill(`Entry for ${hours}h`);
      await page.getByRole('button', { name: 'Create' }).click();
      await expect(page.getByRole('dialog')).toBeHidden();
    }
  });

  test('should show correct report for a client', async ({ page }) => {
    await page.goto('/reports');

    // Select the client from the MUI Select
    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: clientName }).click();

    // Wait for report data to load
    await expect(page.getByText('Total Hours')).toBeVisible();

    // Total = 3 + 5 = 8
    await expect(page.getByText('8.00')).toBeVisible();

    // Entry count = 2
    await expect(page.getByText('Total Entries')).toBeVisible();
    await expect(page.getByText('2').first()).toBeVisible();

    // Verify individual entries in the table
    await expect(page.getByText('3 hours')).toBeVisible();
    await expect(page.getByText('5 hours')).toBeVisible();
  });
});
