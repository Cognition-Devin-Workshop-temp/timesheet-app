import { type Page, expect } from '@playwright/test';

/**
 * Log in with the given email (passwordless auth).
 * Navigates to /login, fills the email field, clicks "Log In", and waits for /dashboard.
 */
export async function login(page: Page, email: string): Promise<void> {
  await page.goto('/login');
  await page.locator('#email').fill(email);
  await page.getByRole('button', { name: 'Log In' }).click();
  await page.waitForURL('**/dashboard', { timeout: 10_000 });
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
}

/**
 * Create a client via the Clients page UI.
 */
export async function createClient(
  page: Page,
  opts: { name: string; description?: string; department?: string; email?: string },
): Promise<void> {
  await page.goto('/clients');
  await expect(page.getByRole('heading', { name: 'Clients' })).toBeVisible({ timeout: 10_000 });
  await page.getByRole('button', { name: 'Add Client' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();

  await page.getByLabel('Client Name').fill(opts.name);

  if (opts.department) {
    await page.getByLabel('Department').fill(opts.department);
  }
  if (opts.email) {
    await page.getByLabel('Email').fill(opts.email);
  }
  if (opts.description) {
    await page.getByLabel('Description').fill(opts.description);
  }

  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page.getByRole('dialog')).toBeHidden({ timeout: 10_000 });
  await expect(page.getByText(opts.name).first()).toBeVisible();
}

/**
 * Click the MUI Select for "Client" inside a dialog and pick an option.
 */
async function selectClient(page: Page, clientName: string): Promise<void> {
  // MUI Select renders as a div with role="combobox" inside the dialog
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('combobox').click();
  await page.getByRole('option', { name: clientName }).click();
}

/**
 * Create a work entry via the Work Entries page UI.
 */
export async function createWorkEntry(
  page: Page,
  opts: { clientName: string; hours: number; description?: string; date?: string },
): Promise<void> {
  await page.goto('/work-entries');
  await expect(page.getByRole('heading', { name: 'Work Entries' })).toBeVisible({ timeout: 10_000 });
  await page.getByRole('button', { name: 'Add Work Entry' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();

  await selectClient(page, opts.clientName);

  await page.getByLabel('Hours').fill(String(opts.hours));

  if (opts.description) {
    await page.getByLabel('Description').fill(opts.description);
  }

  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page.getByRole('dialog')).toBeHidden({ timeout: 10_000 });
}

/**
 * Generate a unique email for test isolation.
 */
export function uniqueEmail(): string {
  return `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}
