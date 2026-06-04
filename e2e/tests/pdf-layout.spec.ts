import { test, expect } from '@playwright/test';
import { login, createClient, selectClient, uniqueName, fetchAndParsePdf } from './helpers';

test.describe('PDF Layout Validation', () => {
  let clientName: string;
  let clientId: number;

  test.beforeEach(async ({ page }) => {
    await login(page);
    page.on('dialog', (dialog) => dialog.accept());

    clientName = uniqueName('PDFLayout');
    await createClient(page, clientName, { department: 'Finance' });

    // Get client ID
    const resp = await page.request.get('http://localhost:3001/api/clients', {
      headers: { 'x-user-email': 'test@example.com' },
    });
    const body = await resp.json();
    clientId = body.clients.find((c: { name: string }) => c.name === clientName).id;

    // Create 3 entries with distinct hours and descriptions
    await page.goto('/work-entries');
    for (const [hours, desc] of [
      ['2', 'Morning standup'],
      ['4', 'Feature development'],
      ['1.5', 'Code review'],
    ]) {
      await page.getByRole('button', { name: 'Add Work Entry' }).click();
      await selectClient(page, clientName);
      await page.getByLabel('Hours').fill(hours);
      await page.getByLabel('Description').fill(desc);
      await page.getByRole('button', { name: 'Create' }).click();
      await expect(page.getByRole('dialog')).toBeHidden();
    }
  });

  test('should have correct layout, content, metadata, and headers', async ({ page }) => {
    const pdf = await fetchAndParsePdf(
      page,
      `http://localhost:3001/api/reports/export/pdf/${clientId}`
    );

    // --- Content validation ---

    // Title with client name (PDFKit may wrap long names across lines)
    expect(pdf.text).toContain('Time Report for');
    expect(pdf.text).toContain(clientName);

    // Total hours = 2 + 4 + 1.5 = 7.50
    expect(pdf.text).toContain('Total Hours: 7.50');

    // Total entries = 3
    expect(pdf.text).toContain('Total Entries: 3');

    // Table headers
    expect(pdf.text).toContain('Date');
    expect(pdf.text).toContain('Hours');
    expect(pdf.text).toContain('Description');

    // All 3 entry descriptions
    expect(pdf.text).toContain('Morning standup');
    expect(pdf.text).toContain('Feature development');
    expect(pdf.text).toContain('Code review');

    // Hours for each entry
    expect(pdf.text).toContain('1.5');

    // Generation timestamp
    expect(pdf.text).toContain('Generated:');

    // --- Metadata ---

    // PDFKit metadata
    expect(pdf.info?.Creator).toBe('PDFKit');
    expect(pdf.info?.Producer).toBe('PDFKit');

    // Should be exactly 1 page for 3 entries
    expect(pdf.numpages).toBe(1);

    // --- Response headers ---

    expect(pdf.headers['content-type']).toContain('application/pdf');
    expect(pdf.headers['content-disposition']).toContain('attachment');
    expect(pdf.headers['content-disposition']).toContain('.pdf');
  });
});
