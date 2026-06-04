import { Page, expect } from '@playwright/test';

export const TEST_EMAIL = 'playwright-test@example.com';

export async function login(page: Page, email: string = TEST_EMAIL) {
  await page.goto('/login');
  await page.getByLabel('Email Address').fill(email);
  await page.getByRole('button', { name: 'Log In' }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
}

export async function createClient(
  page: Page,
  name: string,
  opts: { description?: string; department?: string; email?: string } = {}
) {
  await page.goto('/clients');
  // Check if client already exists (from a prior test in this run)
  const existing = page.getByRole('cell', { name }).first();
  if (await existing.isVisible().catch(() => false)) {
    return;
  }

  await page.getByRole('button', { name: 'Add Client' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByLabel('Client Name').fill(name);
  if (opts.description) {
    await page.getByLabel('Description').fill(opts.description);
  }
  if (opts.department) {
    await page.getByLabel('Department').fill(opts.department);
  }
  if (opts.email) {
    await page.getByLabel('Email').fill(opts.email);
  }
  await page.getByRole('dialog').getByRole('button', { name: 'Create' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });
  await expect(page.getByRole('cell', { name }).first()).toBeVisible({ timeout: 5000 });
}
