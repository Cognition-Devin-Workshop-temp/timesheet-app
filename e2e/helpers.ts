import { type Page, expect } from '@playwright/test';

/**
 * Login helper — fills the email field on the login page and submits.
 * Waits until the Dashboard page is visible.
 */
export async function login(page: Page, email = 'test@example.com') {
  await page.goto('/login');
  await page.getByLabel('Email Address').fill(email);
  await page.getByRole('button', { name: 'Log In' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 10000 });
}

/**
 * Navigate to a section via the sidebar.
 */
export async function navigateTo(page: Page, name: 'Dashboard' | 'Clients' | 'Work Entries' | 'Reports') {
  // Sidebar uses MUI ListItemButton which renders as role="button"
  // Use the sidebar nav to find the correct button (avoid matching AppBar)
  await page.locator('nav').getByRole('button', { name }).click();
  await page.waitForLoadState('networkidle');
}

/**
 * Create a client through the UI.
 * Returns the name used (for assertions).
 */
export async function createClient(
  page: Page,
  data: { name: string; department?: string; email?: string; description?: string },
) {
  await navigateTo(page, 'Clients');
  await page.getByRole('button', { name: 'Add Client' }).click();
  await page.getByLabel('Client Name').fill(data.name);
  if (data.department) await page.getByLabel('Department').fill(data.department);
  if (data.email) await page.getByLabel('Email').fill(data.email);
  if (data.description) await page.getByLabel('Description').fill(data.description);
  await page.getByRole('button', { name: 'Create' }).click();
  // Wait for dialog to close
  await expect(page.getByRole('dialog')).toBeHidden({ timeout: 10000 });
  return data.name;
}

/**
 * Create a work entry through the UI.
 */
export async function createWorkEntry(
  page: Page,
  data: { clientName: string; hours: string; description?: string; date?: string },
) {
  await navigateTo(page, 'Work Entries');
  await page.getByRole('button', { name: 'Add Work Entry' }).click();

  // Select client from MUI Select dropdown
  await page.getByRole('combobox', { name: /client/i }).click();
  await page.getByRole('option', { name: data.clientName }).click();

  // Fill hours
  await page.getByLabel('Hours').fill(data.hours);

  // Fill description if provided
  if (data.description) {
    await page.getByLabel('Description').fill(data.description);
  }

  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page.getByRole('dialog')).toBeHidden({ timeout: 10000 });
}
