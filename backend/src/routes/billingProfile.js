const express = require('express');
const { getDatabase } = require('../database/init');
const { authenticateUser } = require('../middleware/auth');
const { billingProfileSchema } = require('../validation/schemas');

const router = express.Router();

router.use(authenticateUser);

// Get billing profile for authenticated user
router.get('/', (req, res) => {
  const db = getDatabase();

  db.get(
    'SELECT * FROM user_billing_profiles WHERE user_email = ?',
    [req.userEmail],
    (err, row) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      if (!row) {
        return res.json({
          profile: {
            userEmail: req.userEmail,
            companyName: '',
            billingAddress: '',
            phone: '',
            defaultPaymentTermsDays: 30,
            defaultTaxRate: 0,
            defaultCurrency: 'USD',
            invoicePrefix: 'INV',
            nextInvoiceSeq: 1
          }
        });
      }

      res.json({
        profile: {
          userEmail: row.user_email,
          companyName: row.company_name || '',
          billingAddress: row.billing_address || '',
          phone: row.phone || '',
          defaultPaymentTermsDays: row.default_payment_terms_days,
          defaultTaxRate: row.default_tax_rate,
          defaultCurrency: row.default_currency || 'USD',
          invoicePrefix: row.invoice_prefix || 'INV',
          nextInvoiceSeq: row.next_invoice_seq
        }
      });
    }
  );
});

// Create or update billing profile
router.put('/', (req, res, next) => {
  try {
    const { error, value } = billingProfileSchema.validate(req.body);
    if (error) {
      return next(error);
    }

    const db = getDatabase();

    db.get(
      'SELECT user_email FROM user_billing_profiles WHERE user_email = ?',
      [req.userEmail],
      (err, existing) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Internal server error' });
        }

        if (existing) {
          const updates = [];
          const values = [];

          if (value.companyName !== undefined) {
            updates.push('company_name = ?');
            values.push(value.companyName || null);
          }
          if (value.billingAddress !== undefined) {
            updates.push('billing_address = ?');
            values.push(value.billingAddress || null);
          }
          if (value.phone !== undefined) {
            updates.push('phone = ?');
            values.push(value.phone || null);
          }
          if (value.defaultPaymentTermsDays !== undefined) {
            updates.push('default_payment_terms_days = ?');
            values.push(value.defaultPaymentTermsDays);
          }
          if (value.defaultTaxRate !== undefined) {
            updates.push('default_tax_rate = ?');
            values.push(value.defaultTaxRate);
          }
          if (value.defaultCurrency !== undefined) {
            updates.push('default_currency = ?');
            values.push(value.defaultCurrency || 'USD');
          }
          if (value.invoicePrefix !== undefined) {
            updates.push('invoice_prefix = ?');
            values.push(value.invoicePrefix);
          }

          if (updates.length === 0) {
            return res.json({ message: 'No changes to apply' });
          }

          values.push(req.userEmail);
          const query = `UPDATE user_billing_profiles SET ${updates.join(', ')} WHERE user_email = ?`;

          db.run(query, values, function (err) {
            if (err) {
              console.error('Database error:', err);
              return res.status(500).json({ error: 'Failed to update billing profile' });
            }

            db.get(
              'SELECT * FROM user_billing_profiles WHERE user_email = ?',
              [req.userEmail],
              (err, row) => {
                if (err) {
                  console.error('Database error:', err);
                  return res.status(500).json({ error: 'Profile updated but failed to retrieve' });
                }
                res.json({
                  message: 'Billing profile updated successfully',
                  profile: {
                    userEmail: row.user_email,
                    companyName: row.company_name || '',
                    billingAddress: row.billing_address || '',
                    phone: row.phone || '',
                    defaultPaymentTermsDays: row.default_payment_terms_days,
                    defaultTaxRate: row.default_tax_rate,
                    defaultCurrency: row.default_currency || 'USD',
                    invoicePrefix: row.invoice_prefix || 'INV',
                    nextInvoiceSeq: row.next_invoice_seq
                  }
                });
              }
            );
          });
        } else {
          db.run(
            `INSERT INTO user_billing_profiles 
             (user_email, company_name, billing_address, phone, default_payment_terms_days, default_tax_rate, default_currency, invoice_prefix)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              req.userEmail,
              value.companyName || null,
              value.billingAddress || null,
              value.phone || null,
              value.defaultPaymentTermsDays || 30,
              value.defaultTaxRate || 0,
              value.defaultCurrency || 'USD',
              value.invoicePrefix || 'INV'
            ],
            function (err) {
              if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Failed to create billing profile' });
              }

              db.get(
                'SELECT * FROM user_billing_profiles WHERE user_email = ?',
                [req.userEmail],
                (err, row) => {
                  if (err) {
                    console.error('Database error:', err);
                    return res.status(500).json({ error: 'Profile created but failed to retrieve' });
                  }
                  res.status(201).json({
                    message: 'Billing profile created successfully',
                    profile: {
                      userEmail: row.user_email,
                      companyName: row.company_name || '',
                      billingAddress: row.billing_address || '',
                      phone: row.phone || '',
                      defaultPaymentTermsDays: row.default_payment_terms_days,
                      defaultTaxRate: row.default_tax_rate,
                      defaultCurrency: row.default_currency || 'USD',
                      invoicePrefix: row.invoice_prefix || 'INV',
                      nextInvoiceSeq: row.next_invoice_seq
                    }
                  });
                }
              );
            }
          );
        }
      }
    );
  } catch (error) {
    next(error);
  }
});

module.exports = router;
