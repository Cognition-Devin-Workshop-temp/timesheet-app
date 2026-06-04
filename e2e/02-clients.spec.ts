import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('Client Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/clients');
    await expect(page.getByRole('heading', { name: 'Clients' })).toBeVisible();
  });

  test('create a new client', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Client' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.getByLabel('Client Name').fill('Acme Corporation');
    await page.getByLabel('Description').fill('A test client for E2E testing');
    await page.getByLabel('Department').fill('Engineering');
    await page.getByLabel('Email').fill('acme@example.com');
    await page.getByRole('dialog').getByRole('button', { name: 'Create' }).click();

    // Verify dialog closes and client appears in the table
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('cell', { name: 'Acme Corporation' })).toBeVisible({ timeout: 5000 });
  });

  test('edit an existing client', async ({ page }) => {
    // First create a client
    await page.getByRole('button', { name: 'Add Client' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByLabel('Client Name').fill('Edit Target Inc');
    await page.getByRole('dialog').getByRole('button', { name: 'Create' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('cell', { name: 'Edit Target Inc' })).toBeVisible({ timeout: 5000 });

    // Click edit button in that row
    const row = page.getByRole('row', { name: /Edit Target Inc/ });
    await row.getByRole('button').first().click();

    // Dialog should open with "Edit Client" title
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Edit Client')).toBeVisible();

    // Modify the name
    const nameInput = page.getByLabel('Client Name');
    await nameInput.clear();
    await nameInput.fill('Edited Client Name');
    await page.getByRole('dialog').getByRole('button', { name: 'Update' }).click();

    // Verify updated name appears
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('cell', { name: 'Edited Client Name' })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('cell', { name: 'Edit Target Inc' })).not.toBeVisible();
  });

  test('delete a client', async ({ page }) => {
    // Create a client to delete
    await page.getByRole('button', { name: 'Add Client' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByLabel('Client Name').fill('Delete Me Client');
    await page.getByRole('dialog').getByRole('button', { name: 'Create' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('cell', { name: 'Delete Me Client' })).toBeVisible({ timeout: 5000 });

    // Click delete button (second icon button in the row) and confirm
    page.on('dialog', (dialog) => dialog.accept());
    const row = page.getByRole('row', { name: /Delete Me Client/ });
    await row.getByRole('button').nth(1).click();

    // Verify client is removed
    await expect(page.getByRole('cell', { name: 'Delete Me Client' })).not.toBeVisible({ timeout: 5000 });
  });
});
