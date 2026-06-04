import { test, expect } from '@playwright/test';
import { login, createClient, uniqueName } from './helpers';

test.describe('Multi-User Data Isolation', () => {
  const userA = 'user-a@example.com';
  const userB = 'user-b@example.com';

  test('User A clients should not be visible to User B', async ({ page }) => {
    // User A creates a client
    await login(page, userA);
    const clientNameA = uniqueName('UserA_Client');
    await createClient(page, clientNameA, { department: 'Team A' });

    // Verify User A sees the client
    await page.goto('/clients');
    await expect(page.getByText(clientNameA)).toBeVisible();

    // Log out User A
    await page.getByRole('button', { name: 'Logout' }).click();
    await page.waitForURL('**/login');

    // Log in as User B
    await login(page, userB);
    await page.goto('/clients');

    // User B should NOT see User A's client
    await expect(page.getByText(clientNameA)).toBeHidden({ timeout: 5000 });
  });

  test('User B clients should not be visible to User A', async ({ page }) => {
    // User B creates a client
    await login(page, userB);
    const clientNameB = uniqueName('UserB_Client');
    await createClient(page, clientNameB, { department: 'Team B' });

    // Verify User B sees it
    await page.goto('/clients');
    await expect(page.getByText(clientNameB)).toBeVisible();

    // Switch to User A
    await page.getByRole('button', { name: 'Logout' }).click();
    await page.waitForURL('**/login');
    await login(page, userA);
    await page.goto('/clients');

    // User A should NOT see User B's client
    await expect(page.getByText(clientNameB)).toBeHidden({ timeout: 5000 });
  });

  test('Work entries should be isolated per user via API', async ({ page }) => {
    // User A creates a client and work entry via API
    const clientNameA = uniqueName('IsoClient_A');
    const createClientResp = await page.request.post('http://localhost:3001/api/clients', {
      headers: { 'x-user-email': userA, 'Content-Type': 'application/json' },
      data: { name: clientNameA },
    });
    expect(createClientResp.status()).toBe(201);
    const clientA = await createClientResp.json();

    await page.request.post('http://localhost:3001/api/work-entries', {
      headers: { 'x-user-email': userA, 'Content-Type': 'application/json' },
      data: {
        clientId: clientA.client.id,
        hours: 5,
        description: 'User A work',
        date: new Date().toISOString().split('T')[0],
      },
    });

    // User B should get empty clients list (no access to User A's data)
    const clientsResp = await page.request.get('http://localhost:3001/api/clients', {
      headers: { 'x-user-email': userB },
    });
    const clientsBody = await clientsResp.json();
    const userBClients = clientsBody.clients.filter(
      (c: { name: string }) => c.name === clientNameA
    );
    expect(userBClients.length).toBe(0);

    // User B should not see User A's work entries
    const entriesResp = await page.request.get('http://localhost:3001/api/work-entries', {
      headers: { 'x-user-email': userB },
    });
    const entriesBody = await entriesResp.json();
    const userBEntries = entriesBody.workEntries.filter(
      (e: { description: string }) => e.description === 'User A work'
    );
    expect(userBEntries.length).toBe(0);
  });

  test('Reports should only show data for the authenticated user', async ({ page }) => {
    // User A creates client + entry
    const clientName = uniqueName('ReportIso');
    const createResp = await page.request.post('http://localhost:3001/api/clients', {
      headers: { 'x-user-email': userA, 'Content-Type': 'application/json' },
      data: { name: clientName },
    });
    const clientData = await createResp.json();

    await page.request.post('http://localhost:3001/api/work-entries', {
      headers: { 'x-user-email': userA, 'Content-Type': 'application/json' },
      data: {
        clientId: clientData.client.id,
        hours: 10,
        description: 'Isolated report entry',
        date: new Date().toISOString().split('T')[0],
      },
    });

    // User A report should show 10 hours
    const reportA = await page.request.get(
      `http://localhost:3001/api/reports/client/${clientData.client.id}`,
      { headers: { 'x-user-email': userA } }
    );
    expect(reportA.status()).toBe(200);
    const reportAData = await reportA.json();
    expect(reportAData.totalHours).toBe(10);

    // User B should get 404 for User A's client report
    const reportB = await page.request.get(
      `http://localhost:3001/api/reports/client/${clientData.client.id}`,
      { headers: { 'x-user-email': userB } }
    );
    expect(reportB.status()).toBe(404);
  });

  test('User cannot delete another user\'s client', async ({ page }) => {
    // User A creates a client
    const clientName = uniqueName('NoDel');
    const createResp = await page.request.post('http://localhost:3001/api/clients', {
      headers: { 'x-user-email': userA, 'Content-Type': 'application/json' },
      data: { name: clientName },
    });
    const clientData = await createResp.json();

    // User B tries to delete User A's client — should get 404
    const deleteResp = await page.request.delete(
      `http://localhost:3001/api/clients/${clientData.client.id}`,
      { headers: { 'x-user-email': userB } }
    );
    expect(deleteResp.status()).toBe(404);

    // Verify the client still exists for User A
    const verifyResp = await page.request.get(
      `http://localhost:3001/api/clients/${clientData.client.id}`,
      { headers: { 'x-user-email': userA } }
    );
    expect(verifyResp.status()).toBe(200);
  });
});
