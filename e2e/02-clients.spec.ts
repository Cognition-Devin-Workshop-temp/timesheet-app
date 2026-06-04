import { test, expect } from '@playwright/test';
import { login, navigateTo, resetAppState, createClient } from './helpers';

test.describe('Client Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await resetAppState(page);
  });

  test('create a new client with all fields', async ({ page }) => {
    await createClient(page, {
      name: 'Acme Corp',
      department: 'Engineering',
      email: 'contact@acme.com',
      description: 'Main engineering client',
    });

    // Verify client appears in the table
    await expect(page.getByRole('cell', { name: 'Acme Corp' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Engineering', exact: true })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'contact@acme.com' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Main engineering client' })).toBeVisible();
  });

  test('create client with name only (minimal fields)', async ({ page }) => {
    await createClient(page, { name: 'MinimalClient' });
    await expect(page.getByRole('cell', { name: 'MinimalClient' })).toBeVisible();
  });

  test('edit an existing client', async ({ page }) => {
    await createClient(page, { name: 'OldName' });
    await expect(page.getByRole('cell', { name: 'OldName' })).toBeVisible();

    // Click edit button on the row
    const row = page.getByRole('row').filter({ hasText: 'OldName' });
    await row.getByRole('button').filter({ has: page.locator('[data-testid="EditIcon"]') }).click();

    // Dialog should open with pre-filled name
    await expect(page.getByRole('dialog')).toBeVisible();
    const nameField = page.getByLabel('Client Name');
    await expect(nameField).toHaveValue('OldName');

    await nameField.clear();
    await nameField.fill('NewName');
    await page.getByRole('button', { name: 'Update' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });

    // Verify the updated name
    await expect(page.getByRole('cell', { name: 'NewName' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'OldName' })).not.toBeVisible();
  });

  test('delete a client', async ({ page }) => {
    await createClient(page, { name: 'ToDelete' });
    await expect(page.getByRole('cell', { name: 'ToDelete' })).toBeVisible();

    // Click delete on the row
    const row = page.getByRole('row').filter({ hasText: 'ToDelete' });
    page.once('dialog', (dialog) => dialog.accept());
    await row.getByRole('button').filter({ has: page.locator('[data-testid="DeleteIcon"]') }).click();

    // Client should be gone
    await expect(page.getByRole('cell', { name: 'ToDelete' })).not.toBeVisible({ timeout: 5000 });
  });

  test('delete all clients using Clear All', async ({ page }) => {
    await createClient(page, { name: 'Client1' });
    await createClient(page, { name: 'Client2' });
    await expect(page.getByRole('cell', { name: 'Client1' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Client2' })).toBeVisible();

    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Clear All' }).click();
    await expect(page.getByText('No clients found')).toBeVisible({ timeout: 5000 });
  });
});
