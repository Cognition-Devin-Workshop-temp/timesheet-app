import { test, expect } from '@playwright/test';
import { login, navigateTo } from './helpers';

test.describe('Edge Cases', () => {
  test.beforeEach(async ({ page, request }) => {
    // Reset DB for test isolation
    await request.post('http://localhost:3001/api/test/reset');
    await login(page, 'edge-test@example.com');
  });

  test('should reject empty client name (required field)', async ({ page }) => {
    await navigateTo(page, 'Clients');
    await page.getByRole('button', { name: 'Add Client' }).click();

    // Leave name empty, try to submit
    // The name field is required, so clicking Create with empty name should show validation
    await page.getByRole('button', { name: 'Create' }).click();

    // The dialog should remain open — frontend validation prevents empty name
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('should handle special characters in client name', async ({ page }) => {
    await navigateTo(page, 'Clients');
    await page.getByRole('button', { name: 'Add Client' }).click();

    const specialName = 'O\'Reilly & Sons <"Test"> Corp!@#$%';
    await page.getByLabel('Client Name').fill(specialName);
    await page.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByRole('dialog')).toBeHidden({ timeout: 10000 });

    // Verify the special characters rendered correctly
    await expect(page.getByText(specialName)).toBeVisible();
  });

  test('should handle very long text in description', async ({ page }) => {
    await navigateTo(page, 'Clients');
    await page.getByRole('button', { name: 'Add Client' }).click();

    const longText = 'A'.repeat(500);
    await page.getByLabel('Client Name').fill('Long Desc Client');
    await page.getByLabel('Description').fill(longText);
    await page.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByRole('dialog')).toBeHidden({ timeout: 10000 });

    // The client should be created (description is max 1000 chars so 500 is fine)
    await expect(page.getByText('Long Desc Client')).toBeVisible();
  });

  test('should reject description exceeding max length (1000 chars)', async ({ page }) => {
    await navigateTo(page, 'Clients');
    await page.getByRole('button', { name: 'Add Client' }).click();

    const tooLong = 'B'.repeat(1001);
    await page.getByLabel('Client Name').fill('Too Long Client');
    await page.getByLabel('Description').fill(tooLong);
    await page.getByRole('button', { name: 'Create' }).click();

    // Backend Joi validation rejects > 1000 chars — dialog stays open
    await page.waitForTimeout(2000);
    // Dialog should still be open (creation failed)
    await expect(page.getByRole('dialog')).toBeVisible();
    // Close dialog and verify client was NOT created
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('dialog')).toBeHidden({ timeout: 5000 });
    await expect(page.getByText('Too Long Client')).toBeHidden();
    await expect(page.getByText('No clients found')).toBeVisible();
  });

  test('should require hours for work entry', async ({ page }) => {
    // First create a client
    await navigateTo(page, 'Clients');
    await page.getByRole('button', { name: 'Add Client' }).click();
    await page.getByLabel('Client Name').fill('Hours Test Client');
    await page.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByRole('dialog')).toBeHidden({ timeout: 10000 });

    // Try to create a work entry without hours
    await navigateTo(page, 'Work Entries');
    await page.getByRole('button', { name: 'Add Work Entry' }).click();
    await page.getByRole('combobox', { name: /client/i }).click();
    await page.getByRole('option', { name: 'Hours Test Client' }).click();
    // Leave hours empty — native HTML required prevents submission
    await page.getByRole('button', { name: 'Create' }).click();

    // Dialog stays open due to native form validation
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('should reject hours > 24', async ({ page }) => {
    // Create a client
    await navigateTo(page, 'Clients');
    await page.getByRole('button', { name: 'Add Client' }).click();
    await page.getByLabel('Client Name').fill('Max Hours Client');
    await page.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByRole('dialog')).toBeHidden({ timeout: 10000 });

    // Try to create a work entry with hours > 24
    await navigateTo(page, 'Work Entries');
    await page.getByRole('button', { name: 'Add Work Entry' }).click();
    await page.getByRole('combobox', { name: /client/i }).click();
    await page.getByRole('option', { name: 'Max Hours Client' }).click();
    await page.getByLabel('Hours').fill('25');
    await page.getByRole('button', { name: 'Create' }).click();

    // Native max=24 validation or custom validation prevents submission
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('should handle special characters in work entry description', async ({ page }) => {
    // Create a client
    await navigateTo(page, 'Clients');
    await page.getByRole('button', { name: 'Add Client' }).click();
    await page.getByLabel('Client Name').fill('Special Desc Client');
    await page.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByRole('dialog')).toBeHidden({ timeout: 10000 });

    // Create work entry with special characters
    await navigateTo(page, 'Work Entries');
    await page.getByRole('button', { name: 'Add Work Entry' }).click();
    await page.getByRole('combobox', { name: /client/i }).click();
    await page.getByRole('option', { name: 'Special Desc Client' }).click();
    await page.getByLabel('Hours').fill('1');

    const specialDesc = 'Worked on "feature" with <tags> & symbols!';
    await page.getByLabel('Description').fill(specialDesc);
    await page.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByRole('dialog')).toBeHidden({ timeout: 10000 });

    await expect(page.getByText(specialDesc)).toBeVisible();
  });

  test('should not allow work entry without selecting a client', async ({ page }) => {
    // Create a client first so the page doesn't show the empty prompt
    await navigateTo(page, 'Clients');
    await page.getByRole('button', { name: 'Add Client' }).click();
    await page.getByLabel('Client Name').fill('Dummy Client');
    await page.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByRole('dialog')).toBeHidden({ timeout: 10000 });

    await navigateTo(page, 'Work Entries');
    await page.getByRole('button', { name: 'Add Work Entry' }).click();
    // Don't select a client
    await page.getByLabel('Hours').fill('2');
    await page.getByRole('button', { name: 'Create' }).click();

    // Should show an error about client selection
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/please select a client/i)).toBeVisible();
  });
});
