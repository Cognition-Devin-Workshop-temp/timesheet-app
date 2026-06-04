import { test, expect } from '@playwright/test';
import { login, createClient, uniqueName } from './helpers';

test.describe('Edge cases', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    page.on('dialog', (dialog) => dialog.accept());
  });

  test('should show error when creating client with empty name', async ({ page }) => {
    await page.goto('/clients');
    await page.getByRole('button', { name: 'Add Client' }).click();

    // Leave name empty, fill optional fields
    await page.getByLabel('Department').fill('Test Dept');

    await page.getByRole('button', { name: 'Create' }).click();

    // The frontend requires "Client Name" (required attribute), or it shows a
    // custom error "Client name is required" via handleSubmit
    await expect(
      page.getByText(/client name is required/i)
        .or(page.getByLabel('Client Name').locator('..').locator('..').getByText(/required/i))
    ).toBeVisible({ timeout: 5000 });
  });

  test('should handle special characters in client name', async ({ page }) => {
    const specialName = `O'Brien & Associates <test> ${Date.now()}`;
    await page.goto('/clients');
    await page.getByRole('button', { name: 'Add Client' }).click();
    await page.getByLabel('Client Name').fill(specialName);
    await page.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();

    // Verify it renders correctly (HTML entities will be decoded)
    await expect(page.getByText(specialName)).toBeVisible();
  });

  test('should handle very long client name (>255 chars rejected by backend)', async ({ page }) => {
    const longName = 'A'.repeat(300);
    await page.goto('/clients');
    await page.getByRole('button', { name: 'Add Client' }).click();
    await page.getByLabel('Client Name').fill(longName);
    await page.getByRole('button', { name: 'Create' }).click();

    // Backend schema validates name max 255 chars, should show error
    await expect(page.getByRole('alert').filter({ hasText: /error|validation/i })).toBeVisible({ timeout: 10000 });
  });

  test('should reject work entry with 0 hours', async ({ page }) => {
    const clientName = uniqueName('ZeroHoursClient');
    await createClient(page, clientName);

    await page.goto('/work-entries');
    await page.getByRole('button', { name: 'Add Work Entry' }).click();
    await page.getByLabel('Client').click();
    await page.getByRole('option', { name: clientName }).click();
    await page.getByLabel('Hours').fill('0');
    await page.getByLabel('Description').fill('Zero hours test');
    await page.getByRole('button', { name: 'Create' }).click();

    // Frontend validation: "Hours must be between 0 and 24" or backend: positive required
    await expect(
      page.getByText(/hours must be/i).or(page.getByRole('alert'))
    ).toBeVisible({ timeout: 5000 });
  });

  test('should reject work entry with negative hours', async ({ page }) => {
    const clientName = uniqueName('NegHoursClient');
    await createClient(page, clientName);

    await page.goto('/work-entries');
    await page.getByRole('button', { name: 'Add Work Entry' }).click();
    await page.getByLabel('Client').click();
    await page.getByRole('option', { name: clientName }).click();
    await page.getByLabel('Hours').fill('-5');
    await page.getByLabel('Description').fill('Negative hours test');
    await page.getByRole('button', { name: 'Create' }).click();

    await expect(
      page.getByText(/hours must be/i).or(page.getByRole('alert'))
    ).toBeVisible({ timeout: 5000 });
  });

  test('should reject work entry with >24 hours', async ({ page }) => {
    const clientName = uniqueName('Over24Client');
    await createClient(page, clientName);

    await page.goto('/work-entries');
    await page.getByRole('button', { name: 'Add Work Entry' }).click();
    await page.getByLabel('Client').click();
    await page.getByRole('option', { name: clientName }).click();
    await page.getByLabel('Hours').fill('25');
    await page.getByLabel('Description').fill('Over 24 hours test');
    await page.getByRole('button', { name: 'Create' }).click();

    await expect(
      page.getByText(/hours must be/i).or(page.getByRole('alert'))
    ).toBeVisible({ timeout: 5000 });
  });
});
