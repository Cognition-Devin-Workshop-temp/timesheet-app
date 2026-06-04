import { test, expect } from '@playwright/test';
import { login, createClient } from './helpers';

test.describe('Reporting', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);

    // Create a client
    await createClient(page, 'Report Client');

    // Create work entries
    await page.goto('/work-entries');
    await page.getByRole('button', { name: 'Add Work Entry' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('dialog').getByRole('combobox').click();
    await page.getByRole('option', { name: 'Report Client' }).first().click();
    await page.getByRole('spinbutton', { name: 'Hours' }).fill('5');
    await page.getByRole('dialog').getByLabel('Description').fill('Report test work 1');
    await page.getByRole('dialog').getByRole('button', { name: 'Create' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Report test work 1').first()).toBeVisible({ timeout: 5000 });

    await page.getByRole('button', { name: 'Add Work Entry' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('dialog').getByRole('combobox').click();
    await page.getByRole('option', { name: 'Report Client' }).first().click();
    await page.getByRole('spinbutton', { name: 'Hours' }).fill('3');
    await page.getByRole('dialog').getByLabel('Description').fill('Report test work 2');
    await page.getByRole('dialog').getByRole('button', { name: 'Create' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Report test work 2').first()).toBeVisible({ timeout: 5000 });
  });

  test('report shows correct total hours after creating entries', async ({ page }) => {
    await page.goto('/reports');
    await expect(page.getByRole('heading', { name: 'Reports' })).toBeVisible();

    // Select the client using the MUI Select combobox
    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: 'Report Client' }).first().click();

    // Wait for report to load and verify total (5 + 3 = 8)
    await expect(page.getByText('8')).toBeVisible({ timeout: 10000 });
  });

  test('report shows individual entries', async ({ page }) => {
    await page.goto('/reports');
    await expect(page.getByRole('heading', { name: 'Reports' })).toBeVisible();

    // Select client
    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: 'Report Client' }).first().click();

    // Wait for entries to appear in the report table
    await expect(page.getByText('Report test work 1').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Report test work 2').first()).toBeVisible();
  });
});
