import { test, expect } from '@playwright/test';
import { login, createClient } from './helpers';

test.describe('Client Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should create a new client', async ({ page }) => {
    const clientName = `TestClient ${Date.now()}`;
    await createClient(page, {
      name: clientName,
      department: 'Engineering',
      email: 'client@example.com',
      description: 'A test client',
    });

    // Verify client appears in table by checking the row
    const row = page.getByRole('row').filter({ hasText: clientName });
    await expect(row).toBeVisible();
    await expect(row.getByText('Engineering')).toBeVisible();
    await expect(row.getByText('client@example.com')).toBeVisible();
    await expect(row.getByText('A test client')).toBeVisible();
  });

  test('should edit an existing client', async ({ page }) => {
    const clientName = `EditMe ${Date.now()}`;
    await createClient(page, { name: clientName, department: 'Sales' });

    const row = page.getByRole('row').filter({ hasText: clientName });
    await row.getByRole('button').filter({ has: page.locator('[data-testid="EditIcon"]') }).click();

    const dialog = page.getByRole('dialog', { name: 'Edit Client' });
    await expect(dialog).toBeVisible();

    const updatedName = `Updated ${Date.now()}`;
    await dialog.getByLabel('Client Name').clear();
    await dialog.getByLabel('Client Name').fill(updatedName);

    const responsePromise = page.waitForResponse(
      (r) => r.url().includes('/api/clients/') && r.request().method() === 'PUT'
    );
    await dialog.getByRole('button', { name: 'Update' }).click();
    await responsePromise;

    await expect(page.getByRole('row').filter({ hasText: updatedName })).toBeVisible();
  });

  test('should delete a client', async ({ page }) => {
    const clientName = `DeleteMe ${Date.now()}`;
    await createClient(page, { name: clientName });

    page.on('dialog', (dialog) => dialog.accept());

    const row = page.getByRole('row').filter({ hasText: clientName });
    const responsePromise = page.waitForResponse(
      (r) => r.url().includes('/api/clients/') && r.request().method() === 'DELETE'
    );
    await row.getByRole('button').filter({ has: page.locator('[data-testid="DeleteIcon"]') }).click();
    await responsePromise;

    await expect(page.getByRole('row').filter({ hasText: clientName })).not.toBeVisible();
  });

  test('should show empty state when no clients exist', async ({ page }) => {
    await page.goto('/clients');
    await expect(page.getByRole('table')).toBeVisible();
  });
});
