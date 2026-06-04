import { test, expect } from '@playwright/test';
import { login, createClient, uniqueName } from './helpers';

test.describe('Multiple Sessions', () => {
  test('should persist session after page reload', async ({ page }) => {
    await login(page, 'session-persist@example.com');
    await expect(page.getByText('session-persist@example.com')).toBeVisible();

    // Reload the page — session should persist via localStorage
    await page.reload();
    await page.waitForURL('**/dashboard');
    await expect(page.getByText('session-persist@example.com')).toBeVisible();
  });

  test('should persist session across navigation', async ({ page }) => {
    await login(page, 'session-nav@example.com');

    // Navigate through all pages and verify session stays active
    for (const path of ['/clients', '/work-entries', '/reports', '/dashboard']) {
      await page.goto(path);
      await expect(page.getByText('session-nav@example.com')).toBeVisible();
    }
  });

  test('should clear session on logout and redirect to login', async ({ page }) => {
    await login(page, 'logout-test@example.com');
    await expect(page.getByText('logout-test@example.com')).toBeVisible();

    // Click Logout
    await page.getByRole('button', { name: 'Logout' }).click();
    await page.waitForURL('**/login');

    // Should be on login page
    await expect(page.getByText('Time Tracker')).toBeVisible();
    await expect(page.getByLabel('Email Address')).toBeVisible();
  });

  test('should not access protected pages after logout', async ({ page }) => {
    await login(page, 'protected-test@example.com');
    await page.getByRole('button', { name: 'Logout' }).click();
    await page.waitForURL('**/login');

    // Try accessing a protected page directly
    await page.goto('/clients');

    // Should redirect back to login
    await expect(page.getByText('Time Tracker')).toBeVisible({ timeout: 10000 });
    await expect(page.getByLabel('Email Address')).toBeVisible();
  });

  test('should allow re-login after logout', async ({ page }) => {
    // Login as user1
    await login(page, 'relogin-1@example.com');
    await expect(page.getByText('relogin-1@example.com')).toBeVisible();

    // Logout
    await page.getByRole('button', { name: 'Logout' }).click();
    await page.waitForURL('**/login');

    // Login as user2
    await login(page, 'relogin-2@example.com');
    await expect(page.getByText('relogin-2@example.com')).toBeVisible();

    // Should NOT see user1's email
    await expect(page.getByText('relogin-1@example.com')).toBeHidden();
  });

  test('should maintain data context after switching users', async ({ page }) => {
    // User 1 creates a client
    await login(page, 'switch-user1@example.com');
    const clientName1 = uniqueName('SwitchUser1');
    await createClient(page, clientName1);
    await page.goto('/clients');
    await expect(page.getByText(clientName1)).toBeVisible();

    // Logout and login as user 2
    await page.getByRole('button', { name: 'Logout' }).click();
    await page.waitForURL('**/login');
    await login(page, 'switch-user2@example.com');

    // User 2 creates a different client
    const clientName2 = uniqueName('SwitchUser2');
    await createClient(page, clientName2);
    await page.goto('/clients');

    // User 2 should see own client but not user 1's
    await expect(page.getByText(clientName2)).toBeVisible();
    await expect(page.getByText(clientName1)).toBeHidden({ timeout: 3000 });

    // Switch back to user 1
    await page.getByRole('button', { name: 'Logout' }).click();
    await page.waitForURL('**/login');
    await login(page, 'switch-user1@example.com');
    await page.goto('/clients');

    // User 1 should see own client but not user 2's
    await expect(page.getByText(clientName1)).toBeVisible();
    await expect(page.getByText(clientName2)).toBeHidden({ timeout: 3000 });
  });

  test('concurrent browser contexts should maintain separate sessions', async ({ browser }) => {
    // Create two isolated browser contexts (like incognito windows)
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    try {
      // Login with different users in each context
      await login(pageA, 'concurrent-a@example.com');
      await login(pageB, 'concurrent-b@example.com');

      // Verify each context has its own session
      await expect(pageA.getByText('concurrent-a@example.com')).toBeVisible();
      await expect(pageB.getByText('concurrent-b@example.com')).toBeVisible();

      // User A creates a client
      const clientA = uniqueName('ConcurrentA');
      await createClient(pageA, clientA);

      // User B creates a different client
      const clientB = uniqueName('ConcurrentB');
      await createClient(pageB, clientB);

      // Verify isolation: A sees only own client
      await pageA.goto('/clients');
      await expect(pageA.getByText(clientA)).toBeVisible();
      await expect(pageA.getByText(clientB)).toBeHidden({ timeout: 3000 });

      // Verify isolation: B sees only own client
      await pageB.goto('/clients');
      await expect(pageB.getByText(clientB)).toBeVisible();
      await expect(pageB.getByText(clientA)).toBeHidden({ timeout: 3000 });
    } finally {
      await contextA.close();
      await contextB.close();
    }
  });
});
