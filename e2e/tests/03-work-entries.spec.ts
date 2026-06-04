import { test, expect } from '@playwright/test';
import { login, createClient, createWorkEntry } from './helpers';

test.describe('Work Entry Lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should create a work entry for a client', async ({ page }) => {
    const clientName = `WEClient ${Date.now()}`;
    await createClient(page, { name: clientName, department: 'QA' });

    await createWorkEntry(page, {
      clientName,
      hours: '4',
      description: 'Development work',
    });

    const row = page.getByRole('row').filter({ hasText: clientName });
    await expect(row).toBeVisible();
    await expect(row.getByText('4 hours')).toBeVisible();
    await expect(row.getByText('Development work')).toBeVisible();
  });

  test('should verify work entry appears in list', async ({ page }) => {
    const uniqueClient = `ListClient ${Date.now()}`;
    await createClient(page, { name: uniqueClient });
    await createWorkEntry(page, {
      clientName: uniqueClient,
      hours: '2.5',
      description: 'Review session',
    });

    await page.goto('/work-entries');
    const row = page.getByRole('row').filter({ hasText: uniqueClient });
    await expect(row).toBeVisible();
    await expect(row.getByText('2.5 hours')).toBeVisible();
    await expect(row.getByText('Review session')).toBeVisible();
  });

  test('should edit hours on a work entry', async ({ page }) => {
    const uniqueClient = `EditWE ${Date.now()}`;
    await createClient(page, { name: uniqueClient });
    await createWorkEntry(page, {
      clientName: uniqueClient,
      hours: '3',
      description: 'Initial hours',
    });

    const row = page.getByRole('row').filter({ hasText: uniqueClient });
    await row.getByRole('button').filter({ has: page.locator('[data-testid="EditIcon"]') }).click();

    const dialog = page.getByRole('dialog', { name: 'Edit Work Entry' });
    await expect(dialog).toBeVisible();

    await dialog.getByRole('spinbutton', { name: 'Hours' }).clear();
    await dialog.getByRole('spinbutton', { name: 'Hours' }).fill('7');

    const responsePromise = page.waitForResponse(
      (r) => r.url().includes('/api/work-entries/') && r.request().method() === 'PUT'
    );
    await dialog.getByRole('button', { name: 'Update' }).click();
    await responsePromise;

    await expect(row.getByText('7 hours')).toBeVisible();
  });

  test('should delete a work entry', async ({ page }) => {
    const uniqueClient = `DeleteWE ${Date.now()}`;
    await createClient(page, { name: uniqueClient });
    await createWorkEntry(page, {
      clientName: uniqueClient,
      hours: '1',
      description: 'To be deleted',
    });

    page.on('dialog', (dialog) => dialog.accept());

    const row = page.getByRole('row').filter({ hasText: uniqueClient });
    const responsePromise = page.waitForResponse(
      (r) => r.url().includes('/api/work-entries/') && r.request().method() === 'DELETE'
    );
    await row.getByRole('button').filter({ has: page.locator('[data-testid="DeleteIcon"]') }).click();
    await responsePromise;

    await expect(page.getByRole('row').filter({ hasText: 'To be deleted' })).not.toBeVisible();
  });
});
