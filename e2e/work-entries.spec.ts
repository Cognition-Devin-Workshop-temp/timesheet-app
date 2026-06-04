import { test, expect } from '@playwright/test';
import { login, createClient, createWorkEntry, uniqueEmail } from './helpers';

test.describe('Work entry lifecycle', () => {
  const clientName = 'WE Test Client';

  test.beforeEach(async ({ page }) => {
    await login(page, uniqueEmail());
    await createClient(page, { name: clientName });
  });

  test('create work entry', async ({ page }) => {
    await createWorkEntry(page, {
      clientName,
      hours: 8,
      description: 'Development work',
    });
    await expect(page.getByText(clientName)).toBeVisible();
    await expect(page.getByText('8 hours')).toBeVisible();
  });

  test('edit work entry hours', async ({ page }) => {
    await createWorkEntry(page, {
      clientName,
      hours: 8,
      description: 'Initial entry',
    });
    await expect(page.getByText('8 hours')).toBeVisible();

    // Click edit on the row
    const row = page.getByRole('row').filter({ hasText: clientName });
    await row.getByRole('button').filter({ has: page.locator('[data-testid="EditIcon"]') }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByLabel('Hours').fill('4');
    await page.getByRole('button', { name: 'Update' }).click();
    await expect(page.getByRole('dialog')).toBeHidden({ timeout: 10_000 });
    await expect(page.getByText('4 hours')).toBeVisible();
  });

  test('delete work entry', async ({ page }) => {
    await createWorkEntry(page, {
      clientName,
      hours: 3,
      description: 'To be deleted',
    });
    await expect(page.getByText('3 hours')).toBeVisible();

    // Handle window.confirm
    page.on('dialog', (dialog) => dialog.accept());
    const row = page.getByRole('row').filter({ hasText: clientName });
    await row.getByRole('button').filter({ has: page.locator('[data-testid="DeleteIcon"]') }).click();

    await expect(page.getByText('3 hours')).toBeHidden({ timeout: 10_000 });
  });

  test('verify entry appears with correct details', async ({ page }) => {
    await createWorkEntry(page, {
      clientName,
      hours: 6,
      description: 'Detailed entry',
    });
    const row = page.getByRole('row').filter({ hasText: clientName });
    await expect(row.getByText('6 hours')).toBeVisible();
    await expect(row.getByText('Detailed entry')).toBeVisible();
  });
});
