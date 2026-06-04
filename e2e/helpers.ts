import { type Page, expect } from '@playwright/test';

/** Log in by filling the email field and clicking Log In. */
export async function login(page: Page, email = 'test@example.com') {
  await page.goto('/login');
  await page.getByLabel('Email Address').fill(email);
  await page.getByRole('button', { name: 'Log In' }).click();
  // Wait until redirected to dashboard
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
}

/** Navigate to a section using the sidebar list item buttons. */
export async function navigateTo(page: Page, section: 'Dashboard' | 'Clients' | 'Work Entries' | 'Reports') {
  // The sidebar uses MUI ListItemButton with ListItemText
  await page.getByRole('button', { name: section, exact: true }).click();
  await page.waitForTimeout(500);
}

/** Reset app state by deleting all clients (which cascades to work entries). */
export async function resetAppState(page: Page) {
  await navigateTo(page, 'Clients');
  await page.waitForTimeout(500);

  const clearBtn = page.getByRole('button', { name: 'Clear All' });
  if (await clearBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    page.once('dialog', (dialog) => dialog.accept());
    await clearBtn.click();
    await expect(page.getByText('No clients found')).toBeVisible({ timeout: 5000 });
  }
}

/** Create a client via the UI dialog. Returns when the dialog closes. */
export async function createClient(
  page: Page,
  data: { name: string; department?: string; email?: string; description?: string },
) {
  await navigateTo(page, 'Clients');
  await page.getByRole('button', { name: 'Add Client' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();

  await page.getByLabel('Client Name').fill(data.name);
  if (data.department) await page.getByLabel('Department').fill(data.department);
  if (data.email) await page.getByLabel('Email').fill(data.email);
  if (data.description) await page.getByLabel('Description').fill(data.description);

  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });
}

/** Create a work entry via the UI dialog. Client must already exist. */
export async function createWorkEntry(
  page: Page,
  data: { clientName: string; hours: string; description?: string },
) {
  await navigateTo(page, 'Work Entries');
  await page.getByRole('button', { name: 'Add Work Entry' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();

  // Select client from the MUI Select dropdown — no role="combobox" in this MUI version
  await page.locator('.MuiSelect-select').click();
  await page.getByRole('option', { name: data.clientName }).click();

  await page.getByLabel('Hours').fill(data.hours);

  if (data.description) {
    await page.getByLabel('Description').fill(data.description);
  }

  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });
}
