import { test, expect } from '@playwright/test';
import { login, navigateTo, resetAppState, createClient } from './helpers';

test.describe('Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await resetAppState(page);
  });

  test('submit empty client name shows validation error', async ({ page }) => {
    await navigateTo(page, 'Clients');
    await page.getByRole('button', { name: 'Add Client' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Leave name empty and click Create
    const nameField = page.getByLabel('Client Name');
    await nameField.fill('');
    await page.getByRole('button', { name: 'Create' }).click();

    // Dialog should remain open (form did not submit due to HTML required or app validation)
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('special characters in client name are handled', async ({ page }) => {
    const specialName = 'Acme <"Corp"> & Partners\'s';
    await createClient(page, { name: specialName });
    await expect(page.getByRole('cell', { name: specialName })).toBeVisible();
  });

  test('very long text in client description is accepted', async ({ page }) => {
    const longDesc = 'A'.repeat(500);
    await createClient(page, { name: 'LongDescClient', description: longDesc });
    await expect(page.getByRole('cell', { name: 'LongDescClient' })).toBeVisible();
    // Description should contain the long text
    const descCell = page.getByRole('cell').filter({ hasText: longDesc.substring(0, 50) });
    await expect(descCell).toBeVisible();
  });

  test('work entry with zero hours is rejected', async ({ page }) => {
    await createClient(page, { name: 'ZeroHoursClient' });

    await navigateTo(page, 'Work Entries');
    await page.getByRole('button', { name: 'Add Work Entry' }).click();

    await page.locator('.MuiSelect-select').click();
    await page.getByRole('option', { name: 'ZeroHoursClient' }).click();

    await page.getByLabel('Hours').fill('0');
    await page.getByRole('button', { name: 'Create' }).click();

    // Browser native validation blocks submit (min=0.01), dialog stays open
    await page.waitForTimeout(500);
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('work entry with hours exceeding 24 is rejected', async ({ page }) => {
    await createClient(page, { name: 'Over24Client' });

    await navigateTo(page, 'Work Entries');
    await page.getByRole('button', { name: 'Add Work Entry' }).click();

    await page.locator('.MuiSelect-select').click();
    await page.getByRole('option', { name: 'Over24Client' }).click();

    await page.getByLabel('Hours').fill('25');
    await page.getByRole('button', { name: 'Create' }).click();

    // Browser native validation blocks submit (max=24), dialog stays open
    await page.waitForTimeout(500);
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('work entry without selecting client shows validation error', async ({ page }) => {
    await createClient(page, { name: 'Placeholder' });

    await navigateTo(page, 'Work Entries');
    await page.getByRole('button', { name: 'Add Work Entry' }).click();

    // Fill hours but don't select a client
    await page.getByLabel('Hours').fill('2');
    await page.getByRole('button', { name: 'Create' }).click();

    // Should show "Please select a client"
    await expect(page.getByText(/select a client/i)).toBeVisible({ timeout: 3000 });
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('special characters in work entry description', async ({ page }) => {
    await createClient(page, { name: 'SpecialDescClient' });

    await navigateTo(page, 'Work Entries');
    await page.getByRole('button', { name: 'Add Work Entry' }).click();

    await page.locator('.MuiSelect-select').click();
    await page.getByRole('option', { name: 'SpecialDescClient' }).click();

    await page.getByLabel('Hours').fill('1');
    const specialDesc = 'Task with <html> tags & "quotes" and \'apostrophes\'';
    await page.getByLabel('Description').fill(specialDesc);

    await page.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });

    // Verify the entry appears with special characters
    await expect(page.getByRole('cell', { name: specialDesc })).toBeVisible();
  });
});
