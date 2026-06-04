import { test, expect } from '@playwright/test';
import { login, createClient } from './helpers';

test.describe('Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should reject empty client name', async ({ page }) => {
    await page.goto('/clients');
    await page.getByRole('button', { name: 'Add Client' }).click();

    const dialog = page.getByRole('dialog', { name: 'Add New Client' });
    await expect(dialog).toBeVisible();

    // Leave name empty, click Create — browser HTML5 validation prevents submission
    await dialog.getByRole('button', { name: 'Create' }).click();
    // Dialog should still be open (form not submitted)
    await expect(dialog).toBeVisible();

    // Test that whitespace-only name is caught by custom validation
    await dialog.getByLabel('Client Name').fill('   ');
    await dialog.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByText('Client name is required')).toBeVisible();
  });

  test('should reject work entry form with missing client', async ({ page }) => {
    const clientName = `EdgeClient ${Date.now()}`;
    await createClient(page, { name: clientName });

    await page.goto('/work-entries');
    await page.getByRole('button', { name: 'Add Work Entry' }).click();

    const dialog = page.getByRole('dialog', { name: 'Add New Work Entry' });
    await expect(dialog).toBeVisible();

    // Fill hours (to bypass HTML5 required validation) but don't select a client
    await dialog.getByRole('spinbutton', { name: 'Hours' }).fill('1');
    await dialog.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByText('Please select a client')).toBeVisible();
  });

  test('should handle special characters in client name', async ({ page }) => {
    const specialName = `O'Brien & Co. <"Test"> ${Date.now()}`;
    await createClient(page, { name: specialName });
    await expect(page.getByRole('cell', { name: specialName })).toBeVisible();
  });

  test('should handle very long text in description', async ({ page }) => {
    const longDesc = 'A'.repeat(500);
    const clientName = `LongDesc ${Date.now()}`;
    await createClient(page, { name: clientName, description: longDesc });
    await expect(page.getByRole('cell', { name: clientName })).toBeVisible();
  });

  test('should reject hours outside valid range', async ({ page }) => {
    const clientName = `RangeTest ${Date.now()}`;
    await createClient(page, { name: clientName });

    await page.goto('/work-entries');
    await page.getByRole('button', { name: 'Add Work Entry' }).click();

    const dialog = page.getByRole('dialog', { name: 'Add New Work Entry' });
    await expect(dialog).toBeVisible();

    await dialog.getByRole('combobox').click();
    await page.getByRole('option', { name: clientName }).click();

    const hoursInput = dialog.getByRole('spinbutton', { name: 'Hours' });

    // Test 0 hours — below HTML5 min=0.01, browser blocks submission
    await hoursInput.fill('0');
    await dialog.getByRole('button', { name: 'Create' }).click();
    // Dialog stays open because submission was blocked
    await expect(dialog).toBeVisible();

    // Test 25 hours — above HTML5 max=24, browser blocks submission
    await hoursInput.clear();
    await hoursInput.fill('25');
    await dialog.getByRole('button', { name: 'Create' }).click();
    // Dialog stays open because submission was blocked
    await expect(dialog).toBeVisible();

    // Test valid value succeeds
    await hoursInput.clear();
    await hoursInput.fill('4');
    const responsePromise = page.waitForResponse(
      (r) => r.url().includes('/api/work-entries') && r.request().method() === 'POST'
    );
    await dialog.getByRole('button', { name: 'Create' }).click();
    await responsePromise;
    // Dialog should close after successful submission
    await expect(dialog).not.toBeVisible();
  });

  test('should handle special characters in work entry description', async ({ page }) => {
    const clientName = `SpecCharWE ${Date.now()}`;
    await createClient(page, { name: clientName });

    await page.goto('/work-entries');
    await page.getByRole('button', { name: 'Add Work Entry' }).click();

    const dialog = page.getByRole('dialog', { name: 'Add New Work Entry' });
    await expect(dialog).toBeVisible();

    await dialog.getByRole('combobox').click();
    await page.getByRole('option', { name: clientName }).click();
    await dialog.getByRole('spinbutton', { name: 'Hours' }).fill('2');
    await dialog.getByRole('textbox', { name: 'Description' }).fill('<script>alert("xss")</script>');

    const responsePromise = page.waitForResponse(
      (r) => r.url().includes('/api/work-entries') && r.request().method() === 'POST'
    );
    await dialog.getByRole('button', { name: 'Create' }).click();
    await responsePromise;

    // Verify the description is rendered as text, not executed as script
    const row = page.getByRole('row').filter({ hasText: clientName });
    await expect(row.getByText('<script>alert("xss")</script>')).toBeVisible();
  });
});
