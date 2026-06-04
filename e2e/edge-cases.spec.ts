import { test, expect } from '@playwright/test';
import { login, createClient, uniqueEmail } from './helpers';

test.describe('Edge cases', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, uniqueEmail());
  });

  test('submit empty client form shows error', async ({ page }) => {
    await page.goto('/clients');
    await expect(page.getByRole('heading', { name: 'Clients' })).toBeVisible();
    await page.getByRole('button', { name: 'Add Client' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    // Fill with spaces only to bypass HTML5 required but trigger custom validation
    await page.getByLabel('Client Name').fill('   ');
    await page.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByText('Client name is required')).toBeVisible();
  });

  test('special characters in client name', async ({ page }) => {
    const specialName = "O'Brien & Associates <script>alert('xss')</script>";
    await createClient(page, { name: specialName });
    await expect(page.getByText(specialName)).toBeVisible();
  });

  test('very long client name (255 chars)', async ({ page }) => {
    const longName = 'A'.repeat(255);
    await createClient(page, { name: longName });
    await expect(page.getByText(longName)).toBeVisible();
  });

  test('very long description (1000 chars)', async ({ page }) => {
    const longDesc = 'D'.repeat(1000);
    await createClient(page, { name: 'Long Desc Client', description: longDesc });
    await expect(page.getByText('Long Desc Client')).toBeVisible();
  });

  test('submit work entry without selecting client shows error', async ({ page }) => {
    await createClient(page, { name: 'Dummy Client' });
    await page.goto('/work-entries');
    await expect(page.getByRole('heading', { name: 'Work Entries' })).toBeVisible();
    await page.getByRole('button', { name: 'Add Work Entry' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByLabel('Hours').fill('5');
    await page.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByText('Please select a client')).toBeVisible();
  });

  test('submit work entry with 0 hours shows error', async ({ page }) => {
    await createClient(page, { name: 'Zero Hours Client' });
    await page.goto('/work-entries');
    await expect(page.getByRole('heading', { name: 'Work Entries' })).toBeVisible();
    await page.getByRole('button', { name: 'Add Work Entry' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('combobox').click();
    await page.getByRole('option', { name: 'Zero Hours Client' }).click();
    // Use evaluate to set value to 0 bypassing native min constraint
    const hoursInput = page.getByLabel('Hours');
    await hoursInput.fill('0');
    // Remove native min/max to test React validation
    await hoursInput.evaluate((el) => { el.removeAttribute('min'); el.removeAttribute('max'); });
    await hoursInput.fill('0');
    await page.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByText('Hours must be between 0 and 24')).toBeVisible();
  });

  test('submit work entry with hours > 24 shows error', async ({ page }) => {
    await createClient(page, { name: 'Over24 Client' });
    await page.goto('/work-entries');
    await expect(page.getByRole('heading', { name: 'Work Entries' })).toBeVisible();
    await page.getByRole('button', { name: 'Add Work Entry' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('combobox').click();
    await page.getByRole('option', { name: 'Over24 Client' }).click();
    const hoursInput = page.getByLabel('Hours');
    // Remove native min/max to test React validation
    await hoursInput.evaluate((el) => { el.removeAttribute('min'); el.removeAttribute('max'); });
    await hoursInput.fill('25');
    await page.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByText('Hours must be between 0 and 24')).toBeVisible();
  });

  test('special characters in work entry description', async ({ page }) => {
    const specialDesc = "Testing <b>bold</b> & 'quotes' \"double\" <script>alert(1)</script>";
    await createClient(page, { name: 'Special Desc Client' });
    await page.goto('/work-entries');
    await expect(page.getByRole('heading', { name: 'Work Entries' })).toBeVisible();
    await page.getByRole('button', { name: 'Add Work Entry' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('combobox').click();
    await page.getByRole('option', { name: 'Special Desc Client' }).click();
    await page.getByLabel('Hours').fill('2');
    await page.getByLabel('Description').fill(specialDesc);
    await page.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByRole('dialog')).toBeHidden({ timeout: 10_000 });
    await expect(page.getByText(specialDesc)).toBeVisible();
  });
});
