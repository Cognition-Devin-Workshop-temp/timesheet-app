import { test, expect } from '@playwright/test';

test.describe('Reporting', () => {
  test('reports show correct totals after creating entries', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email Address').fill('report-totals@example.com');
    await page.getByRole('button', { name: 'Log In' }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    // Create a client
    await page.getByRole('navigation').getByRole('button', { name: 'Clients' }).click();
    await page.getByRole('button', { name: /add client/i }).click();
    const clientDialog = page.getByRole('dialog');
    await clientDialog.getByLabel('Client Name').fill('Report Client');
    await clientDialog.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByRole('cell', { name: 'Report Client' })).toBeVisible();

    // Create work entries
    await page.getByRole('navigation').getByRole('button', { name: 'Work Entries' }).click();

    // Entry 1: 5 hours
    await page.getByRole('button', { name: /add work entry/i }).click();
    let dialog = page.getByRole('dialog');
    await dialog.getByLabel('Client').click();
    await page.getByRole('option', { name: 'Report Client' }).click();
    await dialog.getByLabel('Hours').fill('5');
    await dialog.getByLabel('Description').fill('Report task 1');
    await dialog.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByText('5 hours')).toBeVisible();

    // Entry 2: 3 hours
    await page.getByRole('button', { name: /add work entry/i }).click();
    dialog = page.getByRole('dialog');
    await dialog.getByLabel('Client').click();
    await page.getByRole('option', { name: 'Report Client' }).click();
    await dialog.getByLabel('Hours').fill('3');
    await dialog.getByLabel('Description').fill('Report task 2');
    await dialog.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByText('3 hours')).toBeVisible();

    // Navigate to reports page
    await page.getByRole('navigation').getByRole('button', { name: 'Reports' }).click();
    await expect(page).toHaveURL(/\/reports/);

    // Select the client
    await page.getByLabel('Select Client').click();
    await page.getByRole('option', { name: 'Report Client' }).click();

    // Verify totals: 5 + 3 = 8 total hours, avg 4.00
    await expect(page.getByText('8.00')).toBeVisible();
    await expect(page.getByText('4.00')).toBeVisible();

    // Verify entries listed
    await expect(page.getByText('Report task 1')).toBeVisible();
    await expect(page.getByText('Report task 2')).toBeVisible();
  });
});
