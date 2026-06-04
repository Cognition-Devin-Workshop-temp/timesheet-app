import { type Page, expect } from '@playwright/test';

export const TEST_EMAIL = 'e2e-test@example.com';

let counter = 0;
export function uniqueName(base: string): string {
  counter++;
  return `${base} ${Date.now()}-${counter}`;
}

export async function login(page: Page, email: string = TEST_EMAIL) {
  await page.goto('/login');
  await expect(page.getByLabel('Email Address')).toBeVisible({ timeout: 10000 });
  await page.getByLabel('Email Address').fill(email);
  await page.getByRole('button', { name: 'Log In' }).click();
  await expect(page).toHaveURL(/\/(dashboard|clients|work-entries|reports)/, { timeout: 15000 });
}

export async function createClient(
  page: Page,
  name: string,
  opts?: { description?: string; department?: string; email?: string }
) {
  await page.goto('/clients');
  await expect(page.getByRole('heading', { name: 'Clients' })).toBeVisible({ timeout: 10000 });
  await page.getByRole('button', { name: 'Add Client' }).click();
  await page.getByLabel('Client Name').fill(name);
  if (opts?.description) await page.getByLabel('Description').fill(opts.description);
  if (opts?.department) await page.getByLabel('Department').fill(opts.department);
  if (opts?.email) await page.getByLabel('Email').fill(opts.email);
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page.getByRole('cell', { name }).first()).toBeVisible({ timeout: 5000 });
}

export async function selectClientInDropdown(page: Page, clientName: string) {
  const formControl = page.locator('.MuiFormControl-root').filter({ hasText: 'Client' });
  await formControl.locator('.MuiSelect-select').click();
  await page.getByRole('option', { name: clientName }).click();
}

export async function createWorkEntry(
  page: Page,
  clientName: string,
  hours: string,
  description?: string
) {
  await page.goto('/work-entries');
  await expect(page.getByRole('heading', { name: 'Work Entries' })).toBeVisible({ timeout: 10000 });
  await page.getByRole('button', { name: 'Add Work Entry' }).click();
  await selectClientInDropdown(page, clientName);
  await page.getByLabel('Hours').fill(hours);
  if (description) await page.getByLabel('Description').fill(description);
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page.getByText(`${hours} hours`).first()).toBeVisible({ timeout: 5000 });
}
