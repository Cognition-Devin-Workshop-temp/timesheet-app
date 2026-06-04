import { type Page, expect } from '@playwright/test';

export const TEST_EMAIL = 'e2e-test@example.com';

export async function login(page: Page, email = TEST_EMAIL) {
  await page.goto('/login');
  await page.getByLabel('Email Address').fill(email);
  await page.getByRole('button', { name: 'Log In' }).click();
  await page.waitForURL('**/dashboard');
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
}

export async function createClient(
  page: Page,
  data: { name: string; department?: string; email?: string; description?: string }
) {
  await page.goto('/clients');
  await page.getByRole('button', { name: 'Add Client' }).click();

  const dialog = page.getByRole('dialog', { name: 'Add New Client' });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Client Name').fill(data.name);
  if (data.department) await dialog.getByLabel('Department').fill(data.department);
  if (data.email) await dialog.getByLabel('Email').fill(data.email);
  if (data.description) await dialog.getByLabel('Description').fill(data.description);

  const responsePromise = page.waitForResponse(
    (r) => r.url().includes('/api/clients') && r.request().method() === 'POST'
  );
  await dialog.getByRole('button', { name: 'Create' }).click();
  await responsePromise;
  await expect(page.getByRole('cell', { name: data.name })).toBeVisible();
}

export async function createWorkEntry(
  page: Page,
  data: { clientName: string; hours: string; description?: string }
) {
  await page.goto('/work-entries');
  await page.getByRole('button', { name: 'Add Work Entry' }).click();

  const dialog = page.getByRole('dialog', { name: 'Add New Work Entry' });
  await expect(dialog).toBeVisible();

  // MUI Select for Client — accessible as unnamed combobox in the dialog
  await dialog.getByRole('combobox').click();
  await page.getByRole('option', { name: data.clientName }).click();

  await dialog.getByRole('spinbutton', { name: 'Hours' }).fill(data.hours);

  if (data.description) {
    await dialog.getByRole('textbox', { name: 'Description' }).fill(data.description);
  }

  const responsePromise = page.waitForResponse(
    (r) => r.url().includes('/api/work-entries') && r.request().method() === 'POST'
  );
  await dialog.getByRole('button', { name: 'Create' }).click();
  await responsePromise;
}
