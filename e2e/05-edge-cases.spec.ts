import { test, expect } from '@playwright/test';
import { login, createClient, uniqueName, selectClientInDropdown } from './helpers';

test.describe('Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should reject empty client name', async ({ page }) => {
    await page.goto('/clients');
    await expect(page.getByRole('heading', { name: 'Clients' })).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Add Client' }).click();

    // Leave name empty and try to submit
    await page.getByRole('button', { name: 'Create' }).click();

    // Should show a validation error alert
    await expect(page.getByRole('alert').filter({ hasText: /required/i })).toBeVisible({ timeout: 5000 });
  });

  test('should handle special characters in client name', async ({ page }) => {
    await page.goto('/clients');
    await expect(page.getByRole('heading', { name: 'Clients' })).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Add Client' }).click();

    const specialName = "O'Reilly & Partners <Ltd>";
    await page.getByLabel('Client Name').fill(specialName);
    await page.getByRole('button', { name: 'Create' }).click();

    await expect(page.getByRole('cell', { name: specialName })).toBeVisible({ timeout: 5000 });
  });

  test('should handle very long text in description', async ({ page }) => {
    await page.goto('/clients');
    await expect(page.getByRole('heading', { name: 'Clients' })).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Add Client' }).click();

    const name = uniqueName('Long Desc');
    await page.getByLabel('Client Name').fill(name);
    const longText = 'A'.repeat(500);
    await page.getByLabel('Description').fill(longText);
    await page.getByRole('button', { name: 'Create' }).click();

    await expect(page.getByRole('cell', { name }).first()).toBeVisible({ timeout: 5000 });
  });

  test('should reject work entry with zero hours', async ({ page }) => {
    const name = uniqueName('ZeroHrs');
    await createClient(page, name);

    await page.goto('/work-entries');
    await expect(page.getByRole('heading', { name: 'Work Entries' })).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Add Work Entry' }).click();
    await selectClientInDropdown(page, name);
    await page.getByLabel('Hours').fill('0');
    await page.getByRole('button', { name: 'Create' }).click();

    await expect(page.getByText(/must be|invalid|error|between/i)).toBeVisible({ timeout: 5000 });
  });

  test('should reject work entry with hours > 24', async ({ page }) => {
    const name = uniqueName('MaxHrs');
    await createClient(page, name);

    await page.goto('/work-entries');
    await expect(page.getByRole('heading', { name: 'Work Entries' })).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Add Work Entry' }).click();
    await selectClientInDropdown(page, name);
    await page.getByLabel('Hours').fill('25');
    await page.getByRole('button', { name: 'Create' }).click();

    await expect(page.getByText(/must be|invalid|error|between|24/i)).toBeVisible({ timeout: 5000 });
  });

  test('should handle special characters in work entry description', async ({ page }) => {
    const name = uniqueName('SpecDesc');
    await createClient(page, name);

    await page.goto('/work-entries');
    await expect(page.getByRole('heading', { name: 'Work Entries' })).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Add Work Entry' }).click();
    await selectClientInDropdown(page, name);
    await page.getByLabel('Hours').fill('1');
    await page.getByLabel('Description').fill('Testing <script>alert("xss")</script> & "quotes"');
    await page.getByRole('button', { name: 'Create' }).click();

    await expect(page.getByText(name)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('1 hours')).toBeVisible();
  });
});
