import { test, expect } from '@playwright/test';

test.describe('Work Entry Lifecycle', () => {
  test('create a work entry for a client and verify it appears in list', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email Address').fill('we-create@example.com');
    await page.getByRole('button', { name: 'Log In' }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    // Create a client first
    await page.getByRole('navigation').getByRole('button', { name: 'Clients' }).click();
    await page.getByRole('button', { name: /add client/i }).click();
    const clientDialog = page.getByRole('dialog');
    await clientDialog.getByLabel('Client Name').fill('WE Create Client');
    await clientDialog.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByRole('cell', { name: 'WE Create Client' })).toBeVisible();

    // Navigate to work entries
    await page.getByRole('navigation').getByRole('button', { name: 'Work Entries' }).click();
    await expect(page).toHaveURL(/\/work-entries/);

    await page.getByRole('button', { name: /add work entry/i }).click();

    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Client').click();
    await page.getByRole('option', { name: 'WE Create Client' }).click();
    await dialog.getByLabel('Hours').fill('4.5');
    await dialog.getByLabel('Description').fill('Implemented new feature');
    await dialog.getByRole('button', { name: 'Create' }).click();

    await expect(page.getByText('WE Create Client')).toBeVisible();
    await expect(page.getByText('4.5 hours')).toBeVisible();
    await expect(page.getByText('Implemented new feature')).toBeVisible();
  });

  test('edit hours on an existing work entry', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email Address').fill('we-edit@example.com');
    await page.getByRole('button', { name: 'Log In' }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    // Create a client
    await page.getByRole('navigation').getByRole('button', { name: 'Clients' }).click();
    await page.getByRole('button', { name: /add client/i }).click();
    const clientDialog = page.getByRole('dialog');
    await clientDialog.getByLabel('Client Name').fill('WE Edit Client');
    await clientDialog.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByRole('cell', { name: 'WE Edit Client' })).toBeVisible();

    // Navigate to work entries and create an entry
    await page.getByRole('navigation').getByRole('button', { name: 'Work Entries' }).click();
    await page.getByRole('button', { name: /add work entry/i }).click();
    const createDialog = page.getByRole('dialog');
    await createDialog.getByLabel('Client').click();
    await page.getByRole('option', { name: 'WE Edit Client' }).click();
    await createDialog.getByLabel('Hours').fill('3');
    await createDialog.getByLabel('Description').fill('Entry to edit');
    await createDialog.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByText('3 hours')).toBeVisible();

    // Edit entry
    const row = page.getByRole('row').filter({ hasText: 'Entry to edit' });
    await row.getByRole('button').filter({ has: page.locator('[data-testid="EditIcon"]') }).click();

    const editDialog = page.getByRole('dialog');
    const hoursField = editDialog.getByLabel('Hours');
    await hoursField.clear();
    await hoursField.fill('6');
    await editDialog.getByRole('button', { name: 'Update' }).click();

    await expect(page.getByText('6 hours')).toBeVisible();
    await expect(page.getByText('3 hours')).not.toBeVisible();
  });

  test('delete a work entry', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email Address').fill('we-delete@example.com');
    await page.getByRole('button', { name: 'Log In' }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    // Create a client
    await page.getByRole('navigation').getByRole('button', { name: 'Clients' }).click();
    await page.getByRole('button', { name: /add client/i }).click();
    const clientDialog = page.getByRole('dialog');
    await clientDialog.getByLabel('Client Name').fill('WE Delete Client');
    await clientDialog.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByRole('cell', { name: 'WE Delete Client' })).toBeVisible();

    // Navigate to work entries and create an entry
    await page.getByRole('navigation').getByRole('button', { name: 'Work Entries' }).click();
    await page.getByRole('button', { name: /add work entry/i }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Client').click();
    await page.getByRole('option', { name: 'WE Delete Client' }).click();
    await dialog.getByLabel('Hours').fill('2');
    await dialog.getByLabel('Description').fill('Entry to delete');
    await dialog.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByText('Entry to delete')).toBeVisible();

    // Delete
    page.on('dialog', d => d.accept());
    const row = page.getByRole('row').filter({ hasText: 'Entry to delete' });
    await row.getByRole('button').filter({ has: page.locator('[data-testid="DeleteIcon"]') }).click();

    await expect(page.getByText('Entry to delete')).not.toBeVisible();
  });
});
