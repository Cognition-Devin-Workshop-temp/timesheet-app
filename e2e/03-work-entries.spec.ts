import { test, expect } from '@playwright/test';
import { login, navigateTo, resetAppState, createClient, createWorkEntry } from './helpers';

test.describe('Work Entry Lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await resetAppState(page);
    await createClient(page, { name: 'TestClient' });
  });

  test('create a work entry and verify it appears in the list', async ({ page }) => {
    await createWorkEntry(page, {
      clientName: 'TestClient',
      hours: '4',
      description: 'Initial task',
    });

    await expect(page.getByRole('cell', { name: 'TestClient' })).toBeVisible();
    await expect(page.getByText('4 hours')).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Initial task' })).toBeVisible();
  });

  test('edit hours on an existing work entry', async ({ page }) => {
    await createWorkEntry(page, {
      clientName: 'TestClient',
      hours: '3',
      description: 'Editable entry',
    });
    await expect(page.getByText('3 hours')).toBeVisible();

    // Click edit
    const row = page.getByRole('row').filter({ hasText: 'Editable entry' });
    await row.getByRole('button').filter({ has: page.locator('[data-testid="EditIcon"]') }).click();

    // Update hours
    await expect(page.getByRole('dialog')).toBeVisible();
    const hoursField = page.getByLabel('Hours');
    await hoursField.clear();
    await hoursField.fill('7.5');
    await page.getByRole('button', { name: 'Update' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });

    // Verify updated hours
    await expect(page.getByText('7.5 hours')).toBeVisible();
    await expect(page.getByText('3 hours')).not.toBeVisible();
  });

  test('delete a work entry', async ({ page }) => {
    await createWorkEntry(page, {
      clientName: 'TestClient',
      hours: '2',
      description: 'Delete me',
    });
    await expect(page.getByRole('cell', { name: 'Delete me' })).toBeVisible();

    const row = page.getByRole('row').filter({ hasText: 'Delete me' });
    page.once('dialog', (dialog) => dialog.accept());
    await row.getByRole('button').filter({ has: page.locator('[data-testid="DeleteIcon"]') }).click();

    await expect(page.getByRole('cell', { name: 'Delete me' })).not.toBeVisible({ timeout: 5000 });
  });

  test('shows prompt to create a client when none exist', async ({ page }) => {
    await resetAppState(page);
    await navigateTo(page, 'Work Entries');
    await expect(page.getByText('You need to create at least one client')).toBeVisible();
  });
});
