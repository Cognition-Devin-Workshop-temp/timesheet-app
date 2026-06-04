import { test, expect } from '@playwright/test';
import { login, createClient, uniqueEmail } from './helpers';

test.describe('Client management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, uniqueEmail());
  });

  test('create a client', async ({ page }) => {
    await createClient(page, { name: 'Acme Corp', description: 'Test client' });
    await expect(page.getByText('Acme Corp')).toBeVisible();
  });

  test('edit a client', async ({ page }) => {
    await createClient(page, { name: 'Acme Corp' });
    // Click the edit icon on the row containing "Acme Corp"
    const row = page.getByRole('row').filter({ hasText: 'Acme Corp' });
    await row.getByRole('button').filter({ has: page.locator('[data-testid="EditIcon"]') }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByLabel('Client Name').fill('Acme Corp Updated');
    await page.getByRole('button', { name: 'Update' }).click();
    await expect(page.getByRole('dialog')).toBeHidden({ timeout: 10_000 });
    await expect(page.getByText('Acme Corp Updated')).toBeVisible();
  });

  test('delete a client', async ({ page }) => {
    await createClient(page, { name: 'Delete Me Corp' });
    await expect(page.getByText('Delete Me Corp')).toBeVisible();

    // Handle the window.confirm dialog
    page.on('dialog', (dialog) => dialog.accept());
    const row = page.getByRole('row').filter({ hasText: 'Delete Me Corp' });
    await row.getByRole('button').filter({ has: page.locator('[data-testid="DeleteIcon"]') }).click();

    await expect(page.getByText('Delete Me Corp')).toBeHidden({ timeout: 10_000 });
  });

  test('create multiple clients', async ({ page }) => {
    await createClient(page, { name: 'Client Alpha' });
    await createClient(page, { name: 'Client Beta' });
    await createClient(page, { name: 'Client Gamma' });

    await expect(page.getByText('Client Alpha')).toBeVisible();
    await expect(page.getByText('Client Beta')).toBeVisible();
    await expect(page.getByText('Client Gamma')).toBeVisible();
  });
});
