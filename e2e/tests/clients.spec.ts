import { test, expect } from '@playwright/test';
import { login, uniqueName } from './helpers';

test.describe('Client CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    // Accept any confirm dialogs (delete confirmations)
    page.on('dialog', (dialog) => dialog.accept());
  });

  test('should create a new client', async ({ page }) => {
    const clientName = uniqueName('TestClient');
    await page.goto('/clients');

    await page.getByRole('button', { name: 'Add Client' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Add New Client')).toBeVisible();

    await page.getByLabel('Client Name').fill(clientName);
    await page.getByLabel('Department').fill('Engineering');
    await page.getByLabel('Description').fill('A test client');
    await page.getByRole('button', { name: 'Create' }).click();

    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(page.getByText(clientName)).toBeVisible();
    await expect(page.getByText('Engineering')).toBeVisible();
  });

  test('should edit an existing client', async ({ page }) => {
    const clientName = uniqueName('EditMe');
    const updatedName = uniqueName('Edited');

    // Create client first
    await page.goto('/clients');
    await page.getByRole('button', { name: 'Add Client' }).click();
    await page.getByLabel('Client Name').fill(clientName);
    await page.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(page.getByText(clientName)).toBeVisible();

    // Click edit button for this client
    const row = page.getByRole('row').filter({ hasText: clientName });
    await row.getByRole('button').filter({ has: page.locator('[data-testid="EditIcon"]') }).click();

    await expect(page.getByText('Edit Client')).toBeVisible();
    await page.getByLabel('Client Name').fill(updatedName);
    await page.getByRole('button', { name: 'Update' }).click();

    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(page.getByText(updatedName)).toBeVisible();
    await expect(page.getByText(clientName)).toBeHidden();
  });

  test('should delete a client', async ({ page }) => {
    const clientName = uniqueName('DeleteMe');

    // Create client first
    await page.goto('/clients');
    await page.getByRole('button', { name: 'Add Client' }).click();
    await page.getByLabel('Client Name').fill(clientName);
    await page.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(page.getByText(clientName)).toBeVisible();

    // Click delete button for this client
    const row = page.getByRole('row').filter({ hasText: clientName });
    await row.getByRole('button').filter({ has: page.locator('[data-testid="DeleteIcon"]') }).click();

    await expect(page.getByText(clientName)).toBeHidden();
  });
});
