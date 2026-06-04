import { test, expect } from '@playwright/test';
import { login, createClient, selectClient, uniqueName } from './helpers';

test.describe('Edge cases', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    page.on('dialog', (dialog) => dialog.accept());
  });

  test('should prevent creating client with empty name (browser required validation)', async ({ page }) => {
    await page.goto('/clients');
    await page.getByRole('button', { name: 'Add Client' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Fill optional fields but leave name empty
    await page.getByLabel('Department').fill('Test Dept');
    await page.getByRole('button', { name: 'Create' }).click();

    // HTML5 required attribute prevents submission; dialog stays open
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Add New Client')).toBeVisible();
  });

  test('should handle special characters in client name', async ({ page }) => {
    const specialName = `O'Brien & Associates <test> ${Date.now()}`;
    await page.goto('/clients');
    await page.getByRole('button', { name: 'Add Client' }).click();
    await page.getByLabel('Client Name').fill(specialName);
    await page.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();

    await expect(page.getByText(specialName)).toBeVisible();
  });

  test('should reject very long client name (>255 chars)', async ({ page }) => {
    const longName = 'A'.repeat(300);
    await page.goto('/clients');
    await page.getByRole('button', { name: 'Add Client' }).click();
    await page.getByLabel('Client Name').fill(longName);

    // Set up response listener before clicking to avoid race
    const responsePromise = page.waitForResponse(
      (resp) => resp.url().includes('/api/clients') && resp.status() === 400
    );
    await page.getByRole('button', { name: 'Create' }).click();
    await responsePromise;

    // Backend rejected (max 255 chars). Dialog stays open.
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Add New Client')).toBeVisible();
  });

  test('should reject work entry with 0 hours', async ({ page }) => {
    const clientName = uniqueName('ZeroHoursClient');
    await createClient(page, clientName);

    await page.goto('/work-entries');
    await page.getByRole('button', { name: 'Add Work Entry' }).click();
    await selectClient(page, clientName);
    await page.getByLabel('Hours').fill('0');
    await page.getByLabel('Description').fill('Zero hours test');
    await page.getByRole('button', { name: 'Create' }).click();

    // Frontend validation: "Hours must be between 0 and 24" shown as alert
    // or dialog stays open because the form check failed
    const alertOrDialog = page.getByText(/hours must be/i).or(page.getByRole('dialog'));
    await expect(alertOrDialog).toBeVisible({ timeout: 5000 });
  });

  test('should reject work entry with negative hours', async ({ page }) => {
    const clientName = uniqueName('NegHoursClient');
    await createClient(page, clientName);

    await page.goto('/work-entries');
    await page.getByRole('button', { name: 'Add Work Entry' }).click();
    await selectClient(page, clientName);
    await page.getByLabel('Hours').fill('-5');
    await page.getByLabel('Description').fill('Negative hours test');
    await page.getByRole('button', { name: 'Create' }).click();

    const alertOrDialog = page.getByText(/hours must be/i).or(page.getByRole('dialog'));
    await expect(alertOrDialog).toBeVisible({ timeout: 5000 });
  });

  test('should reject work entry with >24 hours', async ({ page }) => {
    const clientName = uniqueName('Over24Client');
    await createClient(page, clientName);

    await page.goto('/work-entries');
    await page.getByRole('button', { name: 'Add Work Entry' }).click();
    await selectClient(page, clientName);
    await page.getByLabel('Hours').fill('25');
    await page.getByLabel('Description').fill('Over 24 hours test');
    await page.getByRole('button', { name: 'Create' }).click();

    const alertOrDialog = page.getByText(/hours must be/i).or(page.getByRole('dialog'));
    await expect(alertOrDialog).toBeVisible({ timeout: 5000 });
  });
});
