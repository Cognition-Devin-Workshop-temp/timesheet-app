import { test, expect } from '@playwright/test';
import { login, createClient, createWorkEntry, uniqueEmail } from './helpers';

test.describe('Reporting', () => {
  const clientName = 'Reports Test Client';

  test.beforeEach(async ({ page }) => {
    await login(page, uniqueEmail());
    await createClient(page, { name: clientName });
  });

  test('verify report shows correct totals', async ({ page }) => {
    await createWorkEntry(page, { clientName, hours: 5, description: 'Entry 1' });
    await createWorkEntry(page, { clientName, hours: 3, description: 'Entry 2' });
    await createWorkEntry(page, { clientName, hours: 2, description: 'Entry 3' });

    await page.goto('/reports');
    await expect(page.getByRole('heading', { name: 'Reports' })).toBeVisible();
    // Select the client from dropdown (MUI Select on the page, not in dialog)
    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: clientName }).click();

    // Verify totals
    await expect(page.getByText('10.00')).toBeVisible({ timeout: 10_000 }); // Total Hours
    await expect(page.getByText('3.33')).toBeVisible(); // Average Hours per Entry
  });

  test('verify report lists all work entries', async ({ page }) => {
    await createWorkEntry(page, { clientName, hours: 4, description: 'Alpha work' });
    await createWorkEntry(page, { clientName, hours: 6, description: 'Beta work' });

    await page.goto('/reports');
    await expect(page.getByRole('heading', { name: 'Reports' })).toBeVisible();
    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: clientName }).click();

    await expect(page.getByText('Alpha work')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Beta work')).toBeVisible();
    await expect(page.getByText('4 hours')).toBeVisible();
    await expect(page.getByText('6 hours')).toBeVisible();
  });

  test('report with no entries', async ({ page }) => {
    await page.goto('/reports');
    await expect(page.getByRole('heading', { name: 'Reports' })).toBeVisible();
    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: clientName }).click();

    await expect(page.getByText('No work entries found')).toBeVisible({ timeout: 10_000 });
  });
});
