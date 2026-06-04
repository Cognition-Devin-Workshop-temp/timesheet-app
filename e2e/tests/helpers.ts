import { Page, expect } from '@playwright/test';

export async function login(page: Page, email = 'test@example.com') {
  await page.goto('/login');
  await page.getByLabel('Email Address').fill(email);
  await page.getByRole('button', { name: 'Log In' }).click();
  await page.waitForURL('**/dashboard');
}

export async function createClient(
  page: Page,
  name: string,
  opts: { description?: string; department?: string; email?: string } = {}
) {
  await page.goto('/clients');
  await page.getByRole('button', { name: 'Add Client' }).click();
  await page.getByLabel('Client Name').fill(name);
  if (opts.department) await page.getByLabel('Department').fill(opts.department);
  if (opts.email) await page.getByLabel('Email').fill(opts.email);
  if (opts.description) await page.getByLabel('Description').fill(opts.description);
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByText(name)).toBeVisible();
}

/** Select a client in the MUI Select inside the work entry dialog */
export async function selectClient(page: Page, clientName: string) {
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('combobox').click();
  await page.getByRole('option', { name: clientName }).click();
}

export async function deleteAllClients(page: Page) {
  await page.goto('/clients');
  const clearBtn = page.getByRole('button', { name: 'Clear All' });
  if (await clearBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    page.on('dialog', (dialog) => dialog.accept());
    await clearBtn.click();
    await expect(page.getByText('No clients found')).toBeVisible({ timeout: 10000 });
  }
}

export function uniqueName(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}
