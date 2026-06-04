import { test, expect } from '@playwright/test';
import { login, createClient, selectClient, uniqueName, fetchAndParsePdf } from './helpers';
import * as fs from 'fs';

test.describe('CSV and PDF Export', () => {
  let clientName: string;
  let clientId: number;

  test.beforeEach(async ({ page }) => {
    await login(page);
    page.on('dialog', (dialog) => dialog.accept());

    clientName = uniqueName('ExportClient');
    await createClient(page, clientName, { department: 'Export Dept' });

    // Capture the client ID from the API so we can call export endpoints directly
    const clientsResponse = await page.request.get('http://localhost:3001/api/clients', {
      headers: { 'x-user-email': 'test@example.com' },
    });
    const clientsBody = await clientsResponse.json();
    const matchedClient = clientsBody.clients.find(
      (c: { name: string }) => c.name === clientName
    );
    clientId = matchedClient.id;

    // Create two work entries for the client
    await page.goto('/work-entries');
    for (const [hours, desc] of [
      ['3', 'Design review'],
      ['5', 'Implementation'],
    ]) {
      await page.getByRole('button', { name: 'Add Work Entry' }).click();
      await selectClient(page, clientName);
      await page.getByLabel('Hours').fill(hours);
      await page.getByLabel('Description').fill(desc);
      await page.getByRole('button', { name: 'Create' }).click();
      await expect(page.getByRole('dialog')).toBeHidden();
    }
  });

  test('should download CSV and validate content', async ({ page }) => {
    await page.goto('/reports');

    // Select the client and wait for report to load
    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: clientName }).click();
    await expect(page.getByText('Total Hours')).toBeVisible();

    // Test 1: Verify browser download works via UI button
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export as CSV' }).click();
    const download = await downloadPromise;
    const filename = download.suggestedFilename();
    expect(filename).toContain('.csv');

    // Test 2: Validate CSV content via direct API call
    const csvResponse = await page.request.get(
      `http://localhost:3001/api/reports/export/csv/${clientId}`,
      { headers: { 'x-user-email': 'test@example.com' } }
    );
    expect(csvResponse.status()).toBe(200);
    const csvContent = await csvResponse.text();

    // Validate CSV headers
    const lines = csvContent.trim().split('\n');
    expect(lines.length).toBeGreaterThanOrEqual(3); // header + 2 data rows

    const header = lines[0];
    expect(header).toContain('Date');
    expect(header).toContain('Hours');
    expect(header).toContain('Description');

    // Validate data rows contain our work entry data
    const dataRows = lines.slice(1).join('\n');
    expect(dataRows).toContain('3');
    expect(dataRows).toContain('5');
    expect(dataRows).toContain('Design review');
    expect(dataRows).toContain('Implementation');
  });

  test('should download PDF and validate content', async ({ page }) => {
    await page.goto('/reports');

    // Select the client and wait for report to load
    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: clientName }).click();
    await expect(page.getByText('Total Hours')).toBeVisible();

    // Test 1: Verify browser download works via UI button
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export as PDF' }).click();
    const download = await downloadPromise;
    const filename = download.suggestedFilename();
    expect(filename).toContain('.pdf');

    // Test 2: Validate PDF content via API with retry
    const pdf = await fetchAndParsePdf(
      page,
      `http://localhost:3001/api/reports/export/pdf/${clientId}`
    );

    // Magic bytes
    const pdfHeader = pdf.buffer.subarray(0, 5).toString('ascii');
    expect(pdfHeader).toBe('%PDF-');
    expect(pdf.buffer.length).toBeGreaterThan(500);

    // EOF marker
    const pdfTail = pdf.buffer.subarray(-128).toString('ascii');
    expect(pdfTail).toContain('%%EOF');

    // Text content
    expect(pdf.text).toContain(clientName);
    expect(pdf.text).toContain('Total Hours');
    expect(pdf.text).toContain('8.00'); // 3 + 5
    expect(pdf.text).toContain('Design review');
    expect(pdf.text).toContain('Implementation');
  });
});
