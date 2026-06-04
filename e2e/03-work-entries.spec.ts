import { test, expect } from '@playwright/test';
import { login, navigateTo, createClient } from './helpers';

test.describe('Work Entry Lifecycle', () => {
  test.beforeEach(async ({ page, request }) => {
    // Reset DB for test isolation
    await request.post('http://localhost:3001/api/test/reset');
    await login(page, 'work-test@example.com');
    // Create a client for work entries
    await createClient(page, { name: 'Work Client' });
  });

  test('should show prompt to create client when none exist on work entries page', async ({ page }) => {
    // Login with a different user who has no clients
    await page.getByRole('button', { name: 'Logout' }).click();
    await login(page, 'no-clients-user@example.com');
    await navigateTo(page, 'Work Entries');
    await expect(page.getByText('You need to create at least one client')).toBeVisible();
  });

  test('should create a work entry for a client', async ({ page }) => {
    await navigateTo(page, 'Work Entries');
    await page.getByRole('button', { name: 'Add Work Entry' }).click();

    // Select client
    await page.getByRole('combobox', { name: /client/i }).click();
    await page.getByRole('option', { name: 'Work Client' }).click();

    // Fill hours
    await page.getByLabel('Hours').fill('4.5');

    // Fill description
    await page.getByLabel('Description').fill('Worked on feature X');

    await page.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByRole('dialog')).toBeHidden({ timeout: 10000 });

    // Verify entry appears in the list
    await expect(page.getByText('Work Client')).toBeVisible();
    await expect(page.getByText('4.5 hours')).toBeVisible();
    await expect(page.getByText('Worked on feature X')).toBeVisible();
  });

  test('should edit work entry hours', async ({ page }) => {
    // Create a work entry first
    await navigateTo(page, 'Work Entries');
    await page.getByRole('button', { name: 'Add Work Entry' }).click();
    await page.getByRole('combobox', { name: /client/i }).click();
    await page.getByRole('option', { name: 'Work Client' }).click();
    await page.getByLabel('Hours').fill('3');
    await page.getByLabel('Description').fill('Initial task');
    await page.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByRole('dialog')).toBeHidden({ timeout: 10000 });
    await expect(page.getByText('3 hours')).toBeVisible();

    // Click edit (first button in the row's action cell)
    const row = page.getByRole('row').filter({ hasText: 'Initial task' });
    await row.getByRole('button').first().click();

    // Update hours
    await expect(page.getByText('Edit Work Entry')).toBeVisible();
    await page.getByLabel('Hours').clear();
    await page.getByLabel('Hours').fill('7');

    await page.getByRole('button', { name: 'Update' }).click();
    await expect(page.getByRole('dialog')).toBeHidden({ timeout: 10000 });

    // Verify updated
    await expect(page.getByText('7 hours')).toBeVisible();
    await expect(page.getByText('3 hours')).toBeHidden();
  });

  test('should delete a work entry', async ({ page }) => {
    // Create a work entry
    await navigateTo(page, 'Work Entries');
    await page.getByRole('button', { name: 'Add Work Entry' }).click();
    await page.getByRole('combobox', { name: /client/i }).click();
    await page.getByRole('option', { name: 'Work Client' }).click();
    await page.getByLabel('Hours').fill('2');
    await page.getByLabel('Description').fill('To be deleted');
    await page.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByRole('dialog')).toBeHidden({ timeout: 10000 });
    await expect(page.getByText('To be deleted')).toBeVisible();

    // Handle confirm dialog
    page.on('dialog', (dialog) => dialog.accept());

    // Delete (second button in the row)
    const row = page.getByRole('row').filter({ hasText: 'To be deleted' });
    await row.getByRole('button').nth(1).click();

    await expect(page.getByText('To be deleted')).toBeHidden({ timeout: 10000 });
  });
});
