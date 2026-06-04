import { test, expect } from '@playwright/test';
import { login, createClient } from './helpers';

test.describe('Work Entry Lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    // Ensure we have a client
    await createClient(page, 'Work Entry Client');
    await page.goto('/work-entries');
    await expect(page.getByRole('heading', { name: 'Work Entries' })).toBeVisible();
  });

  test('create a work entry for a client', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Work Entry' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Select client - MUI Select uses combobox role
    await page.getByRole('dialog').getByRole('combobox').click();
    await page.getByRole('option', { name: 'Work Entry Client' }).first().click();

    // Fill hours
    await page.getByRole('spinbutton', { name: 'Hours' }).fill('4.5');

    // Fill description
    await page.getByRole('dialog').getByLabel('Description').fill('Worked on frontend components');

    // Submit
    await page.getByRole('dialog').getByRole('button', { name: 'Create' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });

    // Verify entry appears in list
    await expect(page.getByText('Worked on frontend components')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('4.5 hours')).toBeVisible();
  });

  test('edit hours on an existing work entry', async ({ page }) => {
    // Create an entry
    await page.getByRole('button', { name: 'Add Work Entry' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('dialog').getByRole('combobox').click();
    await page.getByRole('option', { name: 'Work Entry Client' }).first().click();
    await page.getByRole('spinbutton', { name: 'Hours' }).fill('3');
    await page.getByRole('dialog').getByLabel('Description').fill('Edit test entry');
    await page.getByRole('dialog').getByRole('button', { name: 'Create' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Edit test entry')).toBeVisible({ timeout: 5000 });

    // Click edit (first icon button in row)
    const row = page.getByRole('row', { name: /Edit test entry/ });
    await row.getByRole('button').first().click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Change hours
    const hoursInput = page.getByRole('spinbutton', { name: 'Hours' });
    await hoursInput.clear();
    await hoursInput.fill('7');
    await page.getByRole('dialog').getByRole('button', { name: 'Update' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });

    // Verify updated hours
    await expect(page.getByText('7 hours')).toBeVisible({ timeout: 5000 });
  });

  test('delete a work entry', async ({ page }) => {
    // Create entry to delete
    await page.getByRole('button', { name: 'Add Work Entry' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('dialog').getByRole('combobox').click();
    await page.getByRole('option', { name: 'Work Entry Client' }).first().click();
    await page.getByRole('spinbutton', { name: 'Hours' }).fill('2');
    await page.getByRole('dialog').getByLabel('Description').fill('Delete this entry');
    await page.getByRole('dialog').getByRole('button', { name: 'Create' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Delete this entry')).toBeVisible({ timeout: 5000 });

    // Delete with dialog confirmation
    page.on('dialog', (dialog) => dialog.accept());
    const row = page.getByRole('row', { name: /Delete this entry/ });
    await row.getByRole('button').nth(1).click();

    // Verify removed
    await expect(page.getByText('Delete this entry')).not.toBeVisible({ timeout: 5000 });
  });
});
