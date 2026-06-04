import { test, expect } from '@playwright/test';

test.describe('Client Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email Address').fill('client-test@example.com');
    await page.getByRole('button', { name: 'Log In' }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    await page.getByRole('navigation').getByRole('button', { name: 'Clients' }).click();
    await expect(page).toHaveURL(/\/clients/);
  });

  test('create a new client', async ({ page }) => {
    await page.getByRole('button', { name: /add client/i }).click();

    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Client Name').fill('Acme Corp');
    await dialog.getByLabel('Department').fill('Engineering');
    await dialog.getByLabel('Email').fill('acme@example.com');
    await dialog.getByLabel('Description').fill('A test client');
    await dialog.getByRole('button', { name: 'Create' }).click();

    await expect(page.getByRole('cell', { name: 'Acme Corp' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Engineering' })).toBeVisible();
  });

  test('edit an existing client', async ({ page }) => {
    // Create a client first
    await page.getByRole('button', { name: /add client/i }).click();
    const createDialog = page.getByRole('dialog');
    await createDialog.getByLabel('Client Name').fill('Edit Test Corp');
    await createDialog.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByRole('cell', { name: 'Edit Test Corp' })).toBeVisible();

    // Click edit
    const row = page.getByRole('row').filter({ hasText: 'Edit Test Corp' });
    await row.getByRole('button').filter({ has: page.locator('[data-testid="EditIcon"]') }).click();

    // Modify the name
    const editDialog = page.getByRole('dialog');
    const nameField = editDialog.getByLabel('Client Name');
    await nameField.clear();
    await nameField.fill('Edited Corp');
    await editDialog.getByRole('button', { name: 'Update' }).click();

    await expect(page.getByRole('cell', { name: 'Edited Corp' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Edit Test Corp' })).not.toBeVisible();
  });

  test('delete a client', async ({ page }) => {
    // Create a client
    await page.getByRole('button', { name: /add client/i }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Client Name').fill('Delete Me Corp');
    await dialog.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByRole('cell', { name: 'Delete Me Corp' })).toBeVisible();

    // Handle confirm dialog
    page.on('dialog', d => d.accept());

    // Click delete
    const row = page.getByRole('row').filter({ hasText: 'Delete Me Corp' });
    await row.getByRole('button').filter({ has: page.locator('[data-testid="DeleteIcon"]') }).click();

    await expect(page.getByRole('cell', { name: 'Delete Me Corp' })).not.toBeVisible();
  });
});
