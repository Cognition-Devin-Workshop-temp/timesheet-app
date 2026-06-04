import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('Client Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/clients');
    await expect(page.getByRole('heading', { name: 'Clients' })).toBeVisible();
  });

  test('should create a new client', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Client' }).click();
    await expect(page.getByText('Add New Client')).toBeVisible();

    await page.getByLabel('Client Name').fill('Acme Corp');
    await page.getByLabel('Description').fill('Test client description');
    await page.getByLabel('Department').fill('Engineering');
    await page.getByLabel('Email').fill('acme@example.com');
    await page.getByRole('button', { name: 'Create' }).click();

    await expect(page.getByRole('cell', { name: 'Acme Corp' })).toBeVisible({ timeout: 5000 });
  });

  test('should edit an existing client', async ({ page }) => {
    // First create a client
    await page.getByRole('button', { name: 'Add Client' }).click();
    await page.getByLabel('Client Name').fill('Edit Me Corp');
    await page.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByRole('cell', { name: 'Edit Me Corp' })).toBeVisible({ timeout: 5000 });

    // Click edit button on the row
    const row = page.getByRole('row').filter({ hasText: 'Edit Me Corp' });
    await row.getByRole('button').first().click();

    await expect(page.getByText('Edit Client')).toBeVisible();
    await page.getByLabel('Client Name').clear();
    await page.getByLabel('Client Name').fill('Renamed Corp');
    await page.getByRole('button', { name: 'Update' }).click();

    await expect(page.getByRole('cell', { name: 'Renamed Corp' })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('cell', { name: 'Edit Me Corp' })).not.toBeVisible();
  });

  test('should delete a client', async ({ page }) => {
    // Create a client to delete
    await page.getByRole('button', { name: 'Add Client' }).click();
    await page.getByLabel('Client Name').fill('Delete Me Corp');
    await page.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByRole('cell', { name: 'Delete Me Corp' })).toBeVisible({ timeout: 5000 });

    // Accept the confirm dialog before clicking delete
    page.on('dialog', (dialog) => dialog.accept());

    const row = page.getByRole('row').filter({ hasText: 'Delete Me Corp' });
    // Delete button is the second icon button (after edit)
    await row.getByRole('button').nth(1).click();

    await expect(page.getByRole('cell', { name: 'Delete Me Corp' })).not.toBeVisible({ timeout: 5000 });
  });
});
