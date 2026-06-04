import { test, expect } from '@playwright/test';
import { login, createClient, createWorkEntry, uniqueName, selectClientInDropdown } from './helpers';

test.describe('Work Entry Lifecycle', () => {
  let clientName: string;

  test.beforeEach(async ({ page }) => {
    clientName = uniqueName('WE Client');
    await login(page);
    await createClient(page, clientName);
  });

  test('should create a work entry for a client', async ({ page }) => {
    await page.goto('/work-entries');
    await page.getByRole('button', { name: 'Add Work Entry' }).click();

    await selectClientInDropdown(page, clientName);
    await page.getByLabel('Hours').fill('4');
    await page.getByLabel('Description').fill('Working on feature');
    await page.getByRole('button', { name: 'Create' }).click();

    await expect(page.getByText(clientName)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('4 hours')).toBeVisible();
    await expect(page.getByText('Working on feature')).toBeVisible();
  });

  test('should edit hours on a work entry', async ({ page }) => {
    const desc = uniqueName('edit-test');
    await createWorkEntry(page, clientName, '3', desc);

    const row = page.getByRole('row').filter({ hasText: desc });
    await row.getByRole('button').first().click();

    await expect(page.getByText('Edit Work Entry')).toBeVisible();
    await page.getByLabel('Hours').clear();
    await page.getByLabel('Hours').fill('6');
    await page.getByRole('button', { name: 'Update' }).click();

    await expect(page.getByText('6 hours')).toBeVisible({ timeout: 5000 });
  });

  test('should delete a work entry', async ({ page }) => {
    const desc = uniqueName('delete-test');
    await createWorkEntry(page, clientName, '2', desc);

    page.on('dialog', (dialog) => dialog.accept());

    const row = page.getByRole('row').filter({ hasText: desc });
    await row.getByRole('button').nth(1).click();

    await expect(page.getByText(desc)).not.toBeVisible({ timeout: 5000 });
  });
});
