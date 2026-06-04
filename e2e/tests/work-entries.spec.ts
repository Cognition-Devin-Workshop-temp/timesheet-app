import { test, expect } from '@playwright/test';
import { login, createClient, selectClient, uniqueName } from './helpers';

test.describe('Work Entries CRUD', () => {
  let clientName: string;

  test.beforeEach(async ({ page }) => {
    await login(page);
    page.on('dialog', (dialog) => dialog.accept());

    clientName = uniqueName('WEClient');
    await createClient(page, clientName, { department: 'QA' });
  });

  test('should create a work entry', async ({ page }) => {
    await page.goto('/work-entries');

    await page.getByRole('button', { name: 'Add Work Entry' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await selectClient(page, clientName);
    await page.getByLabel('Hours').fill('4');
    await page.getByLabel('Description').fill('E2E test work entry');

    await page.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();

    const row = page.getByRole('row').filter({ hasText: clientName });
    await expect(row).toBeVisible();
    await expect(row.getByText('4 hours')).toBeVisible();
  });

  test('should edit a work entry', async ({ page }) => {
    // Create entry first
    await page.goto('/work-entries');
    await page.getByRole('button', { name: 'Add Work Entry' }).click();
    await selectClient(page, clientName);
    await page.getByLabel('Hours').fill('3');
    await page.getByLabel('Description').fill('Before edit');
    await page.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
    const row = page.getByRole('row').filter({ hasText: clientName });
    await expect(row.getByText('3 hours')).toBeVisible();

    // Edit it
    await row.getByRole('button').filter({ has: page.locator('[data-testid="EditIcon"]') }).click();

    await expect(page.getByText('Edit Work Entry')).toBeVisible();
    await page.getByLabel('Hours').fill('6');
    await page.getByRole('button', { name: 'Update' }).click();

    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(row.getByText('6 hours')).toBeVisible();
  });

  test('should delete a work entry', async ({ page }) => {
    // Create entry first
    await page.goto('/work-entries');
    await page.getByRole('button', { name: 'Add Work Entry' }).click();
    await selectClient(page, clientName);
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
