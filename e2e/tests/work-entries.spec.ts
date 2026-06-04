import { test, expect } from '@playwright/test';
import { login, createClient, uniqueName } from './helpers';

test.describe('Work Entries CRUD', () => {
  let clientName: string;

  test.beforeEach(async ({ page }) => {
    await login(page);
    page.on('dialog', (dialog) => dialog.accept());

    // Create a client for work entries
    clientName = uniqueName('WEClient');
    await createClient(page, clientName, { department: 'QA' });
  });

  test('should create a work entry', async ({ page }) => {
    await page.goto('/work-entries');

    await page.getByRole('button', { name: 'Add Work Entry' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Select client
    await page.getByLabel('Client').click();
    await page.getByRole('option', { name: clientName }).click();

    // Fill hours
    await page.getByLabel('Hours').fill('4');

    // Fill description
    await page.getByLabel('Description').fill('E2E test work entry');

    await page.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();

    await expect(page.getByText(clientName)).toBeVisible();
    await expect(page.getByText('4 hours')).toBeVisible();
  });

  test('should edit a work entry', async ({ page }) => {
    // Create entry first
    await page.goto('/work-entries');
    await page.getByRole('button', { name: 'Add Work Entry' }).click();
    await page.getByLabel('Client').click();
    await page.getByRole('option', { name: clientName }).click();
    await page.getByLabel('Hours').fill('3');
    await page.getByLabel('Description').fill('Before edit');
    await page.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(page.getByText('3 hours')).toBeVisible();

    // Edit it
    const row = page.getByRole('row').filter({ hasText: clientName });
    await row.getByRole('button').filter({ has: page.locator('[data-testid="EditIcon"]') }).click();

    await expect(page.getByText('Edit Work Entry')).toBeVisible();
    await page.getByLabel('Hours').fill('6');
    await page.getByRole('button', { name: 'Update' }).click();

    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(page.getByText('6 hours')).toBeVisible();
  });

  test('should delete a work entry', async ({ page }) => {
    // Create entry first
    await page.goto('/work-entries');
    await page.getByRole('button', { name: 'Add Work Entry' }).click();
    await page.getByLabel('Client').click();
    await page.getByRole('option', { name: clientName }).click();
    await page.getByLabel('Hours').fill('2');
    await page.getByLabel('Description').fill('To be deleted');
    await page.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(page.getByText('2 hours')).toBeVisible();

    // Delete it
    const row = page.getByRole('row').filter({ hasText: clientName });
    await row.getByRole('button').filter({ has: page.locator('[data-testid="DeleteIcon"]') }).click();

    await expect(page.getByText('To be deleted')).toBeHidden();
  });
});
