import { test, expect } from '@playwright/test';
import { login, createClient } from './helpers';

test.describe('Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test.describe('Empty Form Submissions', () => {
    test('submit empty client form is prevented by validation', async ({ page }) => {
      await page.goto('/clients');
      await page.getByRole('button', { name: 'Add Client' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();

      // Click Create with empty name - HTML5 required prevents submission
      await page.getByRole('dialog').getByRole('button', { name: 'Create' }).click();

      // Dialog should stay open (form not submitted)
      await expect(page.getByRole('dialog')).toBeVisible();
      // Input should be marked as invalid
      const input = page.getByRole('dialog').getByLabel('Client Name');
      await expect(input).toBeVisible();
      const validationMessage = await input.evaluate((el: HTMLInputElement) => el.validationMessage);
      expect(validationMessage).toBeTruthy();
    });

    test('submit work entry without client shows validation error', async ({ page }) => {
      // First ensure a client exists so the form is available
      await createClient(page, 'Edge Client');
      await page.goto('/work-entries');
      await page.getByRole('button', { name: 'Add Work Entry' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();

      // Fill only hours, skip client selection
      await page.getByRole('spinbutton', { name: 'Hours' }).fill('5');
      await page.getByRole('dialog').getByRole('button', { name: 'Create' }).click();

      // Should show error about missing client (frontend validates this before API call)
      await expect(page.getByText(/select.*client|client.*required|please select/i)).toBeVisible({ timeout: 5000 });
    });

    test('submit work entry without hours is prevented by validation', async ({ page }) => {
      // Ensure a client exists
      await createClient(page, 'Edge Client2');
      await page.goto('/work-entries');
      await page.getByRole('button', { name: 'Add Work Entry' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();

      // Select client
      await page.getByRole('dialog').getByRole('combobox').click();
      await page.getByRole('option', { name: 'Edge Client2' }).first().click();

      // Leave hours empty and submit - HTML5 required prevents submission
      await page.getByRole('dialog').getByRole('button', { name: 'Create' }).click();

      // Dialog should stay open (validation prevents submission)
      await expect(page.getByRole('dialog')).toBeVisible();
      const input = page.getByRole('spinbutton', { name: 'Hours' });
      const validationMessage = await input.evaluate((el: HTMLInputElement) => el.validationMessage);
      expect(validationMessage).toBeTruthy();
    });
  });

  test.describe('Special Characters in Names', () => {
    test('create client with special characters', async ({ page }) => {
      await page.goto('/clients');
      await page.getByRole('button', { name: 'Add Client' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();

      const specialName = "O'Brien & Associates <Special>";
      await page.getByLabel('Client Name').fill(specialName);
      await page.getByRole('dialog').getByRole('button', { name: 'Create' }).click();
      await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });

      // Verify the client appears with the special characters preserved
      await expect(page.getByRole('cell', { name: specialName })).toBeVisible({ timeout: 5000 });
    });

    test('create client with unicode characters', async ({ page }) => {
      await page.goto('/clients');
      await page.getByRole('button', { name: 'Add Client' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();

      const unicodeName = 'Unternehmen GmbH & Co. KG';
      await page.getByLabel('Client Name').fill(unicodeName);
      await page.getByRole('dialog').getByRole('button', { name: 'Create' }).click();
      await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });

      await expect(page.getByRole('cell', { name: unicodeName })).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Very Long Text', () => {
    test('create client with very long name (255 chars)', async ({ page }) => {
      await page.goto('/clients');
      await page.getByRole('button', { name: 'Add Client' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();

      const longName = 'A'.repeat(255);
      await page.getByLabel('Client Name').fill(longName);
      await page.getByRole('dialog').getByRole('button', { name: 'Create' }).click();
      await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });

      // Should succeed - 255 is the max allowed length
      await expect(page.getByText(longName)).toBeVisible({ timeout: 5000 });
    });

    test('reject client name exceeding max length (256+ chars)', async ({ page }) => {
      await page.goto('/clients');
      await page.getByRole('button', { name: 'Add Client' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();

      const tooLongName = 'B'.repeat(256);
      await page.getByLabel('Client Name').fill(tooLongName);
      await page.getByRole('dialog').getByRole('button', { name: 'Create' }).click();

      // Wait for the API call to complete and verify dialog stays open (creation rejected)
      await page.waitForTimeout(2000);
      await expect(page.getByRole('dialog')).toBeVisible();

      // Close dialog and verify no client with that name was created
      await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();
      await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 3000 });
      await expect(page.getByText(tooLongName)).not.toBeVisible();
    });

    test('create work entry with very long description (1000 chars)', async ({ page }) => {
      // Ensure client exists
      await createClient(page, 'LongDesc Client');
      await page.goto('/work-entries');
      await page.getByRole('button', { name: 'Add Work Entry' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();

      await page.getByRole('dialog').getByRole('combobox').click();
      await page.getByRole('option', { name: 'LongDesc Client' }).first().click();
      await page.getByRole('spinbutton', { name: 'Hours' }).fill('1');
      await page.getByRole('dialog').getByLabel('Description').fill('X'.repeat(1000));
      await page.getByRole('dialog').getByRole('button', { name: 'Create' }).click();

      // Should succeed - 1000 is the max
      await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });
    });
  });
});
