import { test, expect } from '@playwright/test';

test.describe('Edge Cases', () => {
  test('submit empty client form shows validation error', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email Address').fill('edge-empty@example.com');
    await page.getByRole('button', { name: 'Log In' }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    await page.getByRole('navigation').getByRole('button', { name: 'Clients' }).click();
    await page.getByRole('button', { name: /add client/i }).click();

    const dialog = page.getByRole('dialog');
    const nameInput = dialog.getByLabel('Client Name');
    // Try submitting with empty name - browser native validation prevents submit
    await dialog.getByRole('button', { name: 'Create' }).click();

    // The dialog should still be open (form wasn't submitted)
    await expect(dialog).toBeVisible();

    // Verify the field is marked invalid via native validation
    const isInvalid = await nameInput.evaluate(
      (el: HTMLInputElement) => !el.validity.valid
    );
    expect(isInvalid).toBe(true);
  });

  test('special characters in client name are handled', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email Address').fill('edge-special@example.com');
    await page.getByRole('button', { name: 'Log In' }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    await page.getByRole('navigation').getByRole('button', { name: 'Clients' }).click();
    await page.getByRole('button', { name: /add client/i }).click();

    const dialog = page.getByRole('dialog');
    const specialName = 'O\'Brien & Associates <Corp>';
    await dialog.getByLabel('Client Name').fill(specialName);
    await dialog.getByRole('button', { name: 'Create' }).click();

    await expect(page.getByRole('cell', { name: specialName })).toBeVisible();
  });

  test('very long text in client description is handled', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email Address').fill('edge-long@example.com');
    await page.getByRole('button', { name: 'Log In' }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    await page.getByRole('navigation').getByRole('button', { name: 'Clients' }).click();
    await page.getByRole('button', { name: /add client/i }).click();

    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Client Name').fill('Long Desc Client');
    const longText = 'A'.repeat(500);
    await dialog.getByLabel('Description').fill(longText);
    await dialog.getByRole('button', { name: 'Create' }).click();

    await expect(page.getByRole('cell', { name: 'Long Desc Client' })).toBeVisible();
  });

  test('submit work entry form without selecting client shows error', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email Address').fill('edge-noclient@example.com');
    await page.getByRole('button', { name: 'Log In' }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    // Create a client first
    await page.getByRole('navigation').getByRole('button', { name: 'Clients' }).click();
    await page.getByRole('button', { name: /add client/i }).click();
    const clientDialog = page.getByRole('dialog');
    await clientDialog.getByLabel('Client Name').fill('Edge Case Client');
    await clientDialog.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByRole('cell', { name: 'Edge Case Client' })).toBeVisible();

    await page.getByRole('navigation').getByRole('button', { name: 'Work Entries' }).click();
    await page.getByRole('button', { name: /add work entry/i }).click();

    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Hours').fill('2');
    await dialog.getByRole('button', { name: 'Create' }).click();

    await expect(page.getByText(/select a client|client.*required/i)).toBeVisible();
  });

  test('submit work entry with zero hours shows error', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email Address').fill('edge-zerohrs@example.com');
    await page.getByRole('button', { name: 'Log In' }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    await page.getByRole('navigation').getByRole('button', { name: 'Clients' }).click();
    await page.getByRole('button', { name: /add client/i }).click();
    const clientDialog = page.getByRole('dialog');
    await clientDialog.getByLabel('Client Name').fill('Zero Hours Client');
    await clientDialog.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByRole('cell', { name: 'Zero Hours Client' })).toBeVisible();

    await page.getByRole('navigation').getByRole('button', { name: 'Work Entries' }).click();
    await page.getByRole('button', { name: /add work entry/i }).click();

    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Client').click();
    await page.getByRole('option', { name: 'Zero Hours Client' }).click();
    const hoursInput = dialog.getByLabel('Hours');
    await hoursInput.fill('0');
    await dialog.getByRole('button', { name: 'Create' }).click();

    // Dialog should stay open since native validation (min=0.01) prevents submit
    await expect(dialog).toBeVisible();

    // Verify native validation marks the input as invalid
    const isInvalid = await hoursInput.evaluate(
      (el: HTMLInputElement) => !el.validity.valid
    );
    expect(isInvalid).toBe(true);
  });

  test('special characters in work entry description are handled', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email Address').fill('edge-specialdesc@example.com');
    await page.getByRole('button', { name: 'Log In' }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    await page.getByRole('navigation').getByRole('button', { name: 'Clients' }).click();
    await page.getByRole('button', { name: /add client/i }).click();
    const clientDialog = page.getByRole('dialog');
    await clientDialog.getByLabel('Client Name').fill('Special Desc Client');
    await clientDialog.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByRole('cell', { name: 'Special Desc Client' })).toBeVisible();

    await page.getByRole('navigation').getByRole('button', { name: 'Work Entries' }).click();
    await page.getByRole('button', { name: /add work entry/i }).click();

    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Client').click();
    await page.getByRole('option', { name: 'Special Desc Client' }).click();
    await dialog.getByLabel('Hours').fill('1');
    const specialDesc = 'Worked on <script>alert("xss")</script> & "quotes" fix';
    await dialog.getByLabel('Description').fill(specialDesc);
    await dialog.getByRole('button', { name: 'Create' }).click();

    await expect(page.getByText(specialDesc)).toBeVisible();
  });
});
