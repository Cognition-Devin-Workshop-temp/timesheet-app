const express = require('express');
const { getDatabase } = require('../database/init');
const { authenticateUser } = require('../middleware/auth');
const { createInvoiceSchema, updateInvoiceSchema, statusTransitionSchema } = require('../validation/schemas');
const PDFDocument = require('pdfkit');

const router = express.Router();

router.use(authenticateUser);

const VALID_TRANSITIONS = {
  draft: ['sent', 'void'],
  sent: ['paid', 'overdue', 'void'],
  paid: ['void'],
  overdue: ['paid', 'void'],
  void: []
};

function generateInvoiceNumber(prefix, seq) {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  return `${prefix}-${yearMonth}-${String(seq).padStart(4, '0')}`;
}

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

// Get invoice summary stats
router.get('/summary', (req, res) => {
  const db = getDatabase();

  db.all(
    `SELECT status, COUNT(*) as count, COALESCE(SUM(total), 0) as total_amount
     FROM invoices WHERE user_email = ? GROUP BY status`,
    [req.userEmail],
    (err, rows) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      const summary = {
        totalOutstanding: 0,
        outstandingCount: 0,
        totalPaidThisMonth: 0,
        paidCount: 0,
        overdueCount: 0,
        overdueAmount: 0,
        draftCount: 0
      };

      rows.forEach(row => {
        if (row.status === 'sent') {
          summary.totalOutstanding += row.total_amount;
          summary.outstandingCount += row.count;
        } else if (row.status === 'overdue') {
          summary.overdueCount += row.count;
          summary.overdueAmount += row.total_amount;
          summary.totalOutstanding += row.total_amount;
          summary.outstandingCount += row.count;
        } else if (row.status === 'paid') {
          summary.totalPaidThisMonth += row.total_amount;
          summary.paidCount += row.count;
        } else if (row.status === 'draft') {
          summary.draftCount += row.count;
        }
      });

      res.json({ summary });
    }
  );
});

// List invoices
router.get('/', (req, res) => {
  const { status, clientId, from, to, page = 1, limit = 20 } = req.query;
  const db = getDatabase();

  let query = `
    SELECT i.*, c.name as client_name
    FROM invoices i
    JOIN clients c ON i.client_id = c.id
    WHERE i.user_email = ?
  `;
  const params = [req.userEmail];

  if (status) {
    query += ' AND i.status = ?';
    params.push(status);
  }
  if (clientId) {
    query += ' AND i.client_id = ?';
    params.push(parseInt(clientId));
  }
  if (from) {
    query += ' AND i.issue_date >= ?';
    params.push(from);
  }
  if (to) {
    query += ' AND i.issue_date <= ?';
    params.push(to);
  }

  query += ' ORDER BY i.created_at DESC';

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;
  query += ` LIMIT ? OFFSET ?`;
  params.push(limitNum, offset);

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }

    res.json({ invoices: rows });
  });
});

// Get invoice by ID with line items
router.get('/:id', (req, res) => {
  const invoiceId = parseInt(req.params.id);
  if (isNaN(invoiceId)) {
    return res.status(400).json({ error: 'Invalid invoice ID' });
  }

  const db = getDatabase();

  db.get(
    `SELECT i.*, c.name as client_name, c.email as client_email,
            c.billing_address as client_billing_address, c.department as client_department
     FROM invoices i
     JOIN clients c ON i.client_id = c.id
     WHERE i.id = ? AND i.user_email = ?`,
    [invoiceId, req.userEmail],
    (err, invoice) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      db.all(
        'SELECT * FROM invoice_line_items WHERE invoice_id = ? ORDER BY sort_order, id',
        [invoiceId],
        (err, lineItems) => {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Internal server error' });
          }
          res.json({ invoice, lineItems });
        }
      );
    }
  );
});

// Create invoice
router.post('/', (req, res, next) => {
  try {
    const { error, value } = createInvoiceSchema.validate(req.body);
    if (error) {
      return next(error);
    }

    const db = getDatabase();
    const {
      clientId, dateFrom, dateTo, paymentTermsDays,
      taxRate, notes, rateOverride, includeWorkEntryIds, manualLineItems
    } = value;

    // Verify client
    db.get(
      'SELECT id, name, hourly_rate, billing_address FROM clients WHERE id = ? AND user_email = ?',
      [clientId, req.userEmail],
      (err, client) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Internal server error' });
        }
        if (!client) {
          return res.status(400).json({ error: 'Client not found or does not belong to user' });
        }

        // Get billing profile
        db.get(
          'SELECT * FROM user_billing_profiles WHERE user_email = ?',
          [req.userEmail],
          (err, profile) => {
            if (err) {
              console.error('Database error:', err);
              return res.status(500).json({ error: 'Internal server error' });
            }

            const prefix = profile ? profile.invoice_prefix : 'INV';
            const seq = profile ? profile.next_invoice_seq : 1;
            const effectiveTaxRate = taxRate !== undefined ? taxRate : (profile ? profile.default_tax_rate : 0);
            const effectiveTerms = paymentTermsDays !== undefined ? paymentTermsDays : (profile ? profile.default_payment_terms_days : 30);
            const invoiceNumber = generateInvoiceNumber(prefix, seq);
            const issueDate = new Date().toISOString().split('T')[0];
            const dueDate = addDays(issueDate, effectiveTerms);

            const rate = rateOverride || client.hourly_rate;

            // Build work entry query
            let weQuery = `
              SELECT we.id, we.hours, we.description, we.date
              FROM work_entries we
              WHERE we.client_id = ? AND we.user_email = ?
            `;
            const weParams = [clientId, req.userEmail];

            if (includeWorkEntryIds && includeWorkEntryIds.length > 0) {
              weQuery += ` AND we.id IN (${includeWorkEntryIds.map(() => '?').join(',')})`;
              weParams.push(...includeWorkEntryIds);
            } else if (dateFrom || dateTo) {
              if (dateFrom) {
                weQuery += ' AND we.date >= ?';
                weParams.push(dateFrom);
              }
              if (dateTo) {
                weQuery += ' AND we.date <= ?';
                weParams.push(dateTo);
              }
            }

            // Exclude already-invoiced entries
            weQuery += ` AND we.id NOT IN (
              SELECT ili.work_entry_id FROM invoice_line_items ili
              JOIN invoices inv ON ili.invoice_id = inv.id
              WHERE ili.work_entry_id IS NOT NULL AND inv.status != 'void'
            )`;

            weQuery += ' ORDER BY we.date ASC';

            db.all(weQuery, weParams, (err, workEntries) => {
              if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Internal server error' });
              }

              const hasWorkEntries = workEntries.length > 0;
              const hasManualItems = manualLineItems && manualLineItems.length > 0;

              if (!hasWorkEntries && !hasManualItems) {
                return res.status(400).json({ error: 'Invoice must have at least one line item. No uninvoiced work entries found for the given criteria.' });
              }

              if (hasWorkEntries && !rate) {
                return res.status(400).json({ error: 'Set an hourly rate for this client before creating an invoice, or provide a rateOverride.' });
              }

              // Calculate line items
              const lineItems = [];
              let subtotal = 0;

              workEntries.forEach((we, idx) => {
                const amount = parseFloat((we.hours * rate).toFixed(2));
                subtotal += amount;
                lineItems.push({
                  workEntryId: we.id,
                  description: we.description || `Work on ${we.date}`,
                  date: we.date,
                  hours: we.hours,
                  rate: rate,
                  amount: amount,
                  sortOrder: idx
                });
              });

              if (hasManualItems) {
                manualLineItems.forEach((item, idx) => {
                  subtotal += item.amount;
                  lineItems.push({
                    workEntryId: null,
                    description: item.description,
                    date: null,
                    hours: item.hours,
                    rate: item.rate,
                    amount: item.amount,
                    sortOrder: workEntries.length + idx
                  });
                });
              }

              subtotal = parseFloat(subtotal.toFixed(2));
              const taxAmount = parseFloat((subtotal * effectiveTaxRate).toFixed(2));
              const total = parseFloat((subtotal + taxAmount).toFixed(2));

              // Insert invoice
              db.run(
                `INSERT INTO invoices (invoice_number, client_id, user_email, status, issue_date, due_date,
                 payment_terms_days, subtotal, tax_rate, tax_amount, total, notes, from_name, from_address)
                 VALUES (?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  invoiceNumber, clientId, req.userEmail, issueDate, dueDate,
                  effectiveTerms, subtotal, effectiveTaxRate, taxAmount, total,
                  notes || null,
                  profile ? profile.company_name : null,
                  profile ? profile.billing_address : null
                ],
                function (err) {
                  if (err) {
                    console.error('Database error:', err);
                    return res.status(500).json({ error: 'Failed to create invoice' });
                  }

                  const invoiceId = this.lastID;

                  // Insert line items
                  const stmt = db.prepare(
                    `INSERT INTO invoice_line_items (invoice_id, work_entry_id, description, date, hours, rate, amount, sort_order)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
                  );

                  lineItems.forEach(item => {
                    stmt.run([
                      invoiceId, item.workEntryId, item.description, item.date,
                      item.hours, item.rate, item.amount, item.sortOrder
                    ]);
                  });

                  stmt.finalize((err) => {
                    if (err) {
                      console.error('Database error:', err);
                      return res.status(500).json({ error: 'Invoice created but failed to add line items' });
                    }

                    // Update sequence number
                    if (profile) {
                      db.run(
                        'UPDATE user_billing_profiles SET next_invoice_seq = ? WHERE user_email = ?',
                        [seq + 1, req.userEmail]
                      );
                    } else {
                      db.run(
                        `INSERT INTO user_billing_profiles (user_email, next_invoice_seq) VALUES (?, ?)`,
                        [req.userEmail, 2]
                      );
                    }

                    // Return the created invoice
                    db.get(
                      `SELECT i.*, c.name as client_name
                       FROM invoices i JOIN clients c ON i.client_id = c.id
                       WHERE i.id = ?`,
                      [invoiceId],
                      (err, invoice) => {
                        if (err) {
                          console.error('Database error:', err);
                          return res.status(500).json({ error: 'Invoice created but failed to retrieve' });
                        }

                        db.all(
                          'SELECT * FROM invoice_line_items WHERE invoice_id = ? ORDER BY sort_order, id',
                          [invoiceId],
                          (err, items) => {
                            if (err) {
                              console.error('Database error:', err);
                            }
                            res.status(201).json({
                              message: 'Invoice created successfully',
                              invoice,
                              lineItems: items || []
                            });
                          }
                        );
                      }
                    );
                  });
                }
              );
            });
          }
        );
      }
    );
  } catch (error) {
    next(error);
  }
});

// Update draft invoice
router.put('/:id', (req, res, next) => {
  try {
    const invoiceId = parseInt(req.params.id);
    if (isNaN(invoiceId)) {
      return res.status(400).json({ error: 'Invalid invoice ID' });
    }

    const { error, value } = updateInvoiceSchema.validate(req.body);
    if (error) {
      return next(error);
    }

    const db = getDatabase();

    db.get(
      'SELECT id, status FROM invoices WHERE id = ? AND user_email = ?',
      [invoiceId, req.userEmail],
      (err, invoice) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Internal server error' });
        }
        if (!invoice) {
          return res.status(404).json({ error: 'Invoice not found' });
        }
        if (invoice.status !== 'draft') {
          return res.status(400).json({ error: 'Only draft invoices can be edited' });
        }

        const updates = [];
        const vals = [];

        if (value.paymentTermsDays !== undefined) {
          updates.push('payment_terms_days = ?');
          vals.push(value.paymentTermsDays);
        }
        if (value.dueDate !== undefined) {
          updates.push('due_date = ?');
          vals.push(value.dueDate);
        }
        if (value.taxRate !== undefined) {
          updates.push('tax_rate = ?');
          vals.push(value.taxRate);
        }
        if (value.notes !== undefined) {
          updates.push('notes = ?');
          vals.push(value.notes || null);
        }

        const finishUpdate = () => {
          // Recalculate totals from line items
          db.all(
            'SELECT * FROM invoice_line_items WHERE invoice_id = ? ORDER BY sort_order, id',
            [invoiceId],
            (err, items) => {
              if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Internal server error' });
              }

              const subtotal = parseFloat(items.reduce((s, i) => s + i.amount, 0).toFixed(2));

              // Get current tax rate
              db.get('SELECT tax_rate FROM invoices WHERE id = ?', [invoiceId], (err, inv) => {
                if (err) {
                  console.error('Database error:', err);
                  return res.status(500).json({ error: 'Internal server error' });
                }

                const currentTaxRate = value.taxRate !== undefined ? value.taxRate : inv.tax_rate;
                const taxAmount = parseFloat((subtotal * currentTaxRate).toFixed(2));
                const total = parseFloat((subtotal + taxAmount).toFixed(2));

                updates.push('subtotal = ?', 'tax_amount = ?', 'total = ?', 'updated_at = CURRENT_TIMESTAMP');
                vals.push(subtotal, taxAmount, total, invoiceId, req.userEmail);

                const query = `UPDATE invoices SET ${updates.join(', ')} WHERE id = ? AND user_email = ?`;
                db.run(query, vals, function (err) {
                  if (err) {
                    console.error('Database error:', err);
                    return res.status(500).json({ error: 'Failed to update invoice' });
                  }

                  db.get(
                    `SELECT i.*, c.name as client_name
                     FROM invoices i JOIN clients c ON i.client_id = c.id
                     WHERE i.id = ?`,
                    [invoiceId],
                    (err, updatedInvoice) => {
                      if (err) {
                        console.error('Database error:', err);
                        return res.status(500).json({ error: 'Invoice updated but failed to retrieve' });
                      }
                      res.json({
                        message: 'Invoice updated successfully',
                        invoice: updatedInvoice,
                        lineItems: items
                      });
                    }
                  );
                });
              });
            }
          );
        };

        // Handle line items update if provided
        if (value.lineItems) {
          if (value.lineItems.length === 0) {
            return res.status(400).json({ error: 'Invoice must have at least one line item' });
          }

          // Delete existing and re-insert
          db.run('DELETE FROM invoice_line_items WHERE invoice_id = ?', [invoiceId], (err) => {
            if (err) {
              console.error('Database error:', err);
              return res.status(500).json({ error: 'Failed to update line items' });
            }

            const stmt = db.prepare(
              `INSERT INTO invoice_line_items (invoice_id, work_entry_id, description, date, hours, rate, amount, sort_order)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
            );

            value.lineItems.forEach((item, idx) => {
              stmt.run([
                invoiceId, item.workEntryId || null, item.description,
                item.date || null, item.hours, item.rate, item.amount,
                item.sortOrder !== undefined ? item.sortOrder : idx
              ]);
            });

            stmt.finalize((err) => {
              if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Failed to update line items' });
              }
              finishUpdate();
            });
          });
        } else {
          finishUpdate();
        }
      }
    );
  } catch (error) {
    next(error);
  }
});

// Update invoice status
router.patch('/:id/status', (req, res, next) => {
  try {
    const invoiceId = parseInt(req.params.id);
    if (isNaN(invoiceId)) {
      return res.status(400).json({ error: 'Invalid invoice ID' });
    }

    const { error, value } = statusTransitionSchema.validate(req.body);
    if (error) {
      return next(error);
    }

    const db = getDatabase();

    db.get(
      'SELECT id, status FROM invoices WHERE id = ? AND user_email = ?',
      [invoiceId, req.userEmail],
      (err, invoice) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Internal server error' });
        }
        if (!invoice) {
          return res.status(404).json({ error: 'Invoice not found' });
        }

        const allowed = VALID_TRANSITIONS[invoice.status] || [];
        if (!allowed.includes(value.status)) {
          return res.status(400).json({
            error: `Cannot transition from '${invoice.status}' to '${value.status}'. Allowed: ${allowed.join(', ') || 'none'}`
          });
        }

        db.run(
          'UPDATE invoices SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_email = ?',
          [value.status, invoiceId, req.userEmail],
          function (err) {
            if (err) {
              console.error('Database error:', err);
              return res.status(500).json({ error: 'Failed to update invoice status' });
            }

            db.get(
              `SELECT i.*, c.name as client_name
               FROM invoices i JOIN clients c ON i.client_id = c.id
               WHERE i.id = ?`,
              [invoiceId],
              (err, updated) => {
                if (err) {
                  console.error('Database error:', err);
                  return res.status(500).json({ error: 'Status updated but failed to retrieve' });
                }
                res.json({
                  message: `Invoice status updated to '${value.status}'`,
                  invoice: updated
                });
              }
            );
          }
        );
      }
    );
  } catch (error) {
    next(error);
  }
});

// Delete draft invoice
router.delete('/:id', (req, res) => {
  const invoiceId = parseInt(req.params.id);
  if (isNaN(invoiceId)) {
    return res.status(400).json({ error: 'Invalid invoice ID' });
  }

  const db = getDatabase();

  db.get(
    'SELECT id, status FROM invoices WHERE id = ? AND user_email = ?',
    [invoiceId, req.userEmail],
    (err, invoice) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }
      if (invoice.status !== 'draft') {
        return res.status(400).json({ error: 'Only draft invoices can be deleted. Use void instead.' });
      }

      db.run(
        'DELETE FROM invoices WHERE id = ? AND user_email = ?',
        [invoiceId, req.userEmail],
        function (err) {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Failed to delete invoice' });
          }
          res.json({ message: 'Invoice deleted successfully' });
        }
      );
    }
  );
});

// Generate invoice PDF
router.get('/:id/pdf', (req, res) => {
  const invoiceId = parseInt(req.params.id);
  if (isNaN(invoiceId)) {
    return res.status(400).json({ error: 'Invalid invoice ID' });
  }

  const db = getDatabase();

  db.get(
    `SELECT i.*, c.name as client_name, c.email as client_email,
            c.billing_address as client_billing_address
     FROM invoices i
     JOIN clients c ON i.client_id = c.id
     WHERE i.id = ? AND i.user_email = ?`,
    [invoiceId, req.userEmail],
    (err, invoice) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      db.all(
        'SELECT * FROM invoice_line_items WHERE invoice_id = ? ORDER BY sort_order, id',
        [invoiceId],
        (err, lineItems) => {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Internal server error' });
          }

          const doc = new PDFDocument({ margin: 50 });
          const filename = `${invoice.invoice_number.replace(/[^a-zA-Z0-9-]/g, '_')}.pdf`;

          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
          doc.pipe(res);

          // Header
          doc.fontSize(24).text('INVOICE', 50, 50);
          doc.fontSize(10).text(`#${invoice.invoice_number}`, 50, 80);

          // Status badge
          doc.fontSize(10).text(invoice.status.toUpperCase(), 450, 55, { align: 'right' });

          // From section
          doc.fontSize(10).fillColor('#666').text('From:', 50, 110);
          doc.fillColor('#000').fontSize(11);
          if (invoice.from_name) doc.text(invoice.from_name, 50, 125);
          if (invoice.from_address) {
            doc.fontSize(9).text(invoice.from_address, 50, doc.y + 2);
          }

          // To section
          doc.fontSize(10).fillColor('#666').text('To:', 300, 110);
          doc.fillColor('#000').fontSize(11).text(invoice.client_name, 300, 125);
          if (invoice.client_email) {
            doc.fontSize(9).text(invoice.client_email, 300, doc.y + 2);
          }
          if (invoice.client_billing_address) {
            doc.fontSize(9).text(invoice.client_billing_address, 300, doc.y + 2);
          }

          // Dates
          const detailsY = 200;
          doc.fontSize(9).fillColor('#666');
          doc.text('Issue Date:', 50, detailsY);
          doc.text('Due Date:', 200, detailsY);
          doc.text('Payment Terms:', 350, detailsY);
          doc.fillColor('#000').fontSize(10);
          doc.text(invoice.issue_date, 50, detailsY + 14);
          doc.text(invoice.due_date, 200, detailsY + 14);
          doc.text(`Net ${invoice.payment_terms_days}`, 350, detailsY + 14);

          // Line items table
          let tableY = detailsY + 50;

          // Table header
          doc.fontSize(9).fillColor('#666');
          doc.rect(50, tableY - 5, 500, 20).fill('#f5f5f5');
          doc.fillColor('#333');
          doc.text('Date', 55, tableY);
          doc.text('Description', 130, tableY);
          doc.text('Hours', 340, tableY, { width: 50, align: 'right' });
          doc.text('Rate', 400, tableY, { width: 60, align: 'right' });
          doc.text('Amount', 470, tableY, { width: 75, align: 'right' });

          tableY += 25;

          // Table rows
          doc.fillColor('#000').fontSize(9);
          lineItems.forEach((item) => {
            if (tableY > 700) {
              doc.addPage();
              tableY = 50;
            }

            doc.text(item.date || '', 55, tableY, { width: 70 });
            doc.text(item.description, 130, tableY, { width: 205 });
            doc.text(item.hours.toFixed(2), 340, tableY, { width: 50, align: 'right' });
            doc.text(`$${item.rate.toFixed(2)}`, 400, tableY, { width: 60, align: 'right' });
            doc.text(`$${item.amount.toFixed(2)}`, 470, tableY, { width: 75, align: 'right' });

            tableY += 20;
          });

          // Separator
          tableY += 10;
          doc.moveTo(350, tableY).lineTo(545, tableY).stroke();
          tableY += 10;

          // Totals
          doc.fontSize(10);
          doc.text('Subtotal:', 370, tableY, { width: 90, align: 'right' });
          doc.text(`$${invoice.subtotal.toFixed(2)}`, 470, tableY, { width: 75, align: 'right' });
          tableY += 18;

          if (invoice.tax_rate > 0) {
            doc.text(`Tax (${(invoice.tax_rate * 100).toFixed(2)}%):`, 370, tableY, { width: 90, align: 'right' });
            doc.text(`$${invoice.tax_amount.toFixed(2)}`, 470, tableY, { width: 75, align: 'right' });
            tableY += 18;
          }

          doc.fontSize(12).font('Helvetica-Bold');
          doc.text('Total:', 370, tableY, { width: 90, align: 'right' });
          doc.text(`$${invoice.total.toFixed(2)}`, 470, tableY, { width: 75, align: 'right' });
          doc.font('Helvetica');

          // Notes
          if (invoice.notes) {
            tableY += 40;
            if (tableY > 700) {
              doc.addPage();
              tableY = 50;
            }
            doc.fontSize(10).fillColor('#666').text('Notes:', 50, tableY);
            doc.fillColor('#000').fontSize(9).text(invoice.notes, 50, tableY + 15, { width: 500 });
          }

          doc.end();
        }
      );
    }
  );
});

// Get uninvoiced work entries for a client
router.get('/uninvoiced/:clientId', (req, res) => {
  const clientId = parseInt(req.params.clientId);
  if (isNaN(clientId)) {
    return res.status(400).json({ error: 'Invalid client ID' });
  }

  const { dateFrom, dateTo } = req.query;
  const db = getDatabase();

  let query = `
    SELECT we.id, we.hours, we.description, we.date, we.client_id, c.name as client_name
    FROM work_entries we
    JOIN clients c ON we.client_id = c.id
    WHERE we.client_id = ? AND we.user_email = ?
    AND we.id NOT IN (
      SELECT ili.work_entry_id FROM invoice_line_items ili
      JOIN invoices inv ON ili.invoice_id = inv.id
      WHERE ili.work_entry_id IS NOT NULL AND inv.status != 'void'
    )
  `;
  const params = [clientId, req.userEmail];

  if (dateFrom) {
    query += ' AND we.date >= ?';
    params.push(dateFrom);
  }
  if (dateTo) {
    query += ' AND we.date <= ?';
    params.push(dateTo);
  }

  query += ' ORDER BY we.date ASC';

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    res.json({ workEntries: rows });
  });
});

module.exports = router;
