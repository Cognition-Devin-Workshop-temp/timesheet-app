import { test, expect } from '@playwright/test';
import { login, navigateTo } from './helpers';

test.describe('Client Management', () => {
  test.beforeEach(async ({ page, request }) => {
    // Reset DB for test isolation
    await request.post('http://localhost:3001/api/test/reset');
    await login(page, 'client-test@example.com');
    await navigateTo(page, 'Clients');
  });

  test('should show empty state when no clients exist', async ({ page }) => {
    await expect(page.getByText('No clients found')).toBeVisible();
  });

  test('should create a new client', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Client' }).click();
    await expect(page.getByText('Add New Client')).toBeVisible();

    await page.getByLabel('Client Name').fill('Acme Corp');
    await page.getByLabel('Department').fill('Engineering');
    await page.getByLabel('Email').fill('acme@corp.com');
    await page.getByLabel('Description').fill('Top-tier client');

    await page.getByRole('button', { name: 'Create' }).click();

    // Dialog should close and client should appear in table
    await expect(page.getByRole('dialog')).toBeHidden({ timeout: 10000 });
    await expect(page.getByText('Acme Corp')).toBeVisible();
    await expect(page.getByText('Engineering')).toBeVisible();
    await expect(page.getByText('acme@corp.com')).toBeVisible();
    await expect(page.getByText('Top-tier client')).toBeVisible();
  });

  test('should edit an existing client', async ({ page }) => {
    // Create a client first
    await page.getByRole('button', { name: 'Add Client' }).click();
    await page.getByLabel('Client Name').fill('Edit Me Corp');
    await page.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByRole('dialog')).toBeHidden({ timeout: 10000 });
    await expect(page.getByText('Edit Me Corp')).toBeVisible();

    // Click edit (first button in the row)
    const row = page.getByRole('row').filter({ hasText: 'Edit Me Corp' });
    await row.getByRole('button').first().click();

    // Edit dialog should open with existing data
    await expect(page.getByText('Edit Client')).toBeVisible();
    await page.getByLabel('Client Name').clear();
    await page.getByLabel('Client Name').fill('Updated Corp');
    await page.getByLabel('Department').fill('Sales');

    await page.getByRole('button', { name: 'Update' }).click();
    await expect(page.getByRole('dialog')).toBeHidden({ timeout: 10000 });

    // Verify the update
    await expect(page.getByText('Updated Corp')).toBeVisible();
    await expect(page.getByText('Sales')).toBeVisible();
    await expect(page.getByText('Edit Me Corp')).toBeHidden();
  });

  test('should delete a client', async ({ page }) => {
    // Create a client first
    await page.getByRole('button', { name: 'Add Client' }).click();
    await page.getByLabel('Client Name').fill('Delete Me Corp');
    await page.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByRole('dialog')).toBeHidden({ timeout: 10000 });
    await expect(page.getByText('Delete Me Corp')).toBeVisible();

    // Handle the confirm dialog
    page.on('dialog', (dialog) => dialog.accept());

    // Click delete (second button in the row)
    const row = page.getByRole('row').filter({ hasText: 'Delete Me Corp' });
    await row.getByRole('button').nth(1).click();

    // Client should be removed
    await expect(page.getByText('Delete Me Corp')).toBeHidden({ timeout: 10000 });
  });

  test('should cancel client creation dialog', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Client' }).click();
    await page.getByLabel('Client Name').fill('Should Not Exist');
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(page.getByText('Should Not Exist')).toBeHidden();
  });
});
