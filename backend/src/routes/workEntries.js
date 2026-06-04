const express = require('express');
const { getDatabase } = require('../database/init');
const { authenticateUser } = require('../middleware/auth');
const { workEntrySchema, updateWorkEntrySchema } = require('../validation/schemas');

const router = express.Router();

// All routes require authentication
router.use(authenticateUser);

// Get all work entries for authenticated user (with optional client filter)
router.get('/', (req, res) => {
  const { clientId } = req.query;
  const db = getDatabase();
  
  let query = `
    SELECT we.id, we.client_id, we.hours, we.description, we.date, 
           we.created_at, we.updated_at, c.name as client_name
    FROM work_entries we
    JOIN clients c ON we.client_id = c.id
    WHERE we.user_email = ?
  `;
  
  const params = [req.userEmail];
  
  if (clientId) {
    const clientIdNum = parseInt(clientId);
    if (isNaN(clientIdNum)) {
      return res.status(400).json({ error: 'Invalid client ID' });
    }
    query += ' AND we.client_id = ?';
    params.push(clientIdNum);
  }
  
  query += ' ORDER BY we.date DESC, we.created_at DESC';
  
  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    
    res.json({ workEntries: rows });
  });
});

// Get effort summary for a specific client
router.get('/effort-summary/:clientId', (req, res) => {
  const clientId = parseInt(req.params.clientId);

  if (isNaN(clientId)) {
    return res.status(400).json({ error: 'Invalid client ID' });
  }

  const db = getDatabase();

  db.get(
    'SELECT id, name, available_efforts FROM clients WHERE id = ? AND user_email = ?',
    [clientId, req.userEmail],
    (err, client) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      if (!client) {
        return res.status(404).json({ error: 'Client not found' });
      }

      db.get(
        'SELECT COALESCE(SUM(hours), 0) as total_hours FROM work_entries WHERE client_id = ? AND user_email = ?',
        [clientId, req.userEmail],
        (err, result) => {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Internal server error' });
          }

          const usedHours = parseFloat(result.total_hours);
          const availableEfforts = client.available_efforts;
          const remainingHours = availableEfforts != null ? availableEfforts - usedHours : null;

          res.json({
            clientId: client.id,
            clientName: client.name,
            availableEfforts,
            usedHours,
            remainingHours
          });
        }
      );
    }
  );
});

// Get specific work entry
router.get('/:id', (req, res) => {
  const workEntryId = parseInt(req.params.id);
  
  if (isNaN(workEntryId)) {
    return res.status(400).json({ error: 'Invalid work entry ID' });
  }
  
  const db = getDatabase();
  
  db.get(
    `SELECT we.id, we.client_id, we.hours, we.description, we.date, 
            we.created_at, we.updated_at, c.name as client_name
     FROM work_entries we
     JOIN clients c ON we.client_id = c.id
     WHERE we.id = ? AND we.user_email = ?`,
    [workEntryId, req.userEmail],
    (err, row) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      
      if (!row) {
        return res.status(404).json({ error: 'Work entry not found' });
      }
      
      res.json({ workEntry: row });
    }
  );
});

// Create new work entry
router.post('/', (req, res, next) => {
  try {
    const { error, value } = workEntrySchema.validate(req.body);
    if (error) {
      return next(error);
    }

    const { clientId, hours, description, date } = value;
    const db = getDatabase();

    // Verify client exists and belongs to user
    db.get(
      'SELECT id, available_efforts FROM clients WHERE id = ? AND user_email = ?',
      [clientId, req.userEmail],
      (err, row) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Internal server error' });
        }

        if (!row) {
          return res.status(400).json({ error: 'Client not found or does not belong to user' });
        }

        const availableEfforts = row.available_efforts;

        // If available_efforts is set, validate total hours
        if (availableEfforts != null) {
          db.get(
            'SELECT COALESCE(SUM(hours), 0) as total_hours FROM work_entries WHERE client_id = ? AND user_email = ?',
            [clientId, req.userEmail],
            (err, result) => {
              if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Internal server error' });
              }

              const currentTotal = parseFloat(result.total_hours);
              const remaining = availableEfforts - currentTotal;

              if (hours > remaining) {
                return res.status(400).json({
                  error: `Hours exceed available efforts. Available: ${availableEfforts} hrs, Used: ${currentTotal} hrs, Remaining: ${remaining.toFixed(2)} hrs, Requested: ${hours} hrs`
                });
              }

              insertWorkEntry();
            }
          );
        } else {
          insertWorkEntry();
        }

        function insertWorkEntry() {
          // Create work entry
          db.run(
            'INSERT INTO work_entries (client_id, user_email, hours, description, date) VALUES (?, ?, ?, ?, ?)',
            [clientId, req.userEmail, hours, description || null, date],
            function(err) {
              if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Failed to create work entry' });
              }

              // Return the created work entry with client name
              db.get(
                `SELECT we.id, we.client_id, we.hours, we.description, we.date, 
                        we.created_at, we.updated_at, c.name as client_name
                 FROM work_entries we
                 JOIN clients c ON we.client_id = c.id
                 WHERE we.id = ?`,
                [this.lastID],
                (err, row) => {
                  if (err) {
                    console.error('Database error:', err);
                    return res.status(500).json({ error: 'Work entry created but failed to retrieve' });
                  }

                  res.status(201).json({
                    message: 'Work entry created successfully',
                    workEntry: row
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

// Update work entry
router.put('/:id', (req, res, next) => {
  try {
    const workEntryId = parseInt(req.params.id);
    
    if (isNaN(workEntryId)) {
      return res.status(400).json({ error: 'Invalid work entry ID' });
    }

    const { error, value } = updateWorkEntrySchema.validate(req.body);
    if (error) {
      return next(error);
    }

    const db = getDatabase();

    // Check if work entry exists and belongs to user
    db.get(
      'SELECT we.id, we.hours, we.client_id FROM work_entries we WHERE we.id = ? AND we.user_email = ?',
      [workEntryId, req.userEmail],
      (err, row) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Internal server error' });
        }

        if (!row) {
          return res.status(404).json({ error: 'Work entry not found' });
        }

        const existingEntry = row;

        // If clientId is being updated, verify it belongs to user
        if (value.clientId) {
          db.get(
            'SELECT id, available_efforts FROM clients WHERE id = ? AND user_email = ?',
            [value.clientId, req.userEmail],
            (err, clientRow) => {
              if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Internal server error' });
              }

              if (!clientRow) {
                return res.status(400).json({ error: 'Client not found or does not belong to user' });
              }

              validateEffortsAndUpdate(clientRow);
            }
          );
        } else {
          // Hours may be changing on the same client — need to validate
          if (value.hours !== undefined) {
            db.get(
              'SELECT id, available_efforts FROM clients WHERE id = ? AND user_email = ?',
              [existingEntry.client_id, req.userEmail],
              (err, clientRow) => {
                if (err) {
                  console.error('Database error:', err);
                  return res.status(500).json({ error: 'Internal server error' });
                }

                validateEffortsAndUpdate(clientRow || {});
              }
            );
          } else {
            performUpdate();
          }
        }

        function validateEffortsAndUpdate(clientRow) {
          const availableEfforts = clientRow.available_efforts;
          const targetClientId = value.clientId || existingEntry.client_id;
          const newHours = value.hours !== undefined ? value.hours : existingEntry.hours;

          if (availableEfforts != null) {
            db.get(
              'SELECT COALESCE(SUM(hours), 0) as total_hours FROM work_entries WHERE client_id = ? AND user_email = ? AND id != ?',
              [targetClientId, req.userEmail, workEntryId],
              (err, result) => {
                if (err) {
                  console.error('Database error:', err);
                  return res.status(500).json({ error: 'Internal server error' });
                }

                const otherTotal = parseFloat(result.total_hours);
                const remaining = availableEfforts - otherTotal;

                if (newHours > remaining) {
                  return res.status(400).json({
                    error: `Hours exceed available efforts. Available: ${availableEfforts} hrs, Used by other entries: ${otherTotal} hrs, Remaining: ${remaining.toFixed(2)} hrs, Requested: ${newHours} hrs`
                  });
                }

                performUpdate();
              }
            );
          } else {
            performUpdate();
          }
        }

        function performUpdate() {
          // Build update query dynamically
          const updates = [];
          const values = [];

          if (value.clientId !== undefined) {
            updates.push('client_id = ?');
            values.push(value.clientId);
          }

          if (value.hours !== undefined) {
            updates.push('hours = ?');
            values.push(value.hours);
          }

          if (value.description !== undefined) {
            updates.push('description = ?');
            values.push(value.description || null);
          }

          if (value.date !== undefined) {
            updates.push('date = ?');
            values.push(value.date);
          }

          updates.push('updated_at = CURRENT_TIMESTAMP');
          values.push(workEntryId, req.userEmail);

          const query = `UPDATE work_entries SET ${updates.join(', ')} WHERE id = ? AND user_email = ?`;

          db.run(query, values, function(err) {
            if (err) {
              console.error('Database error:', err);
              return res.status(500).json({ error: 'Failed to update work entry' });
            }

            // Return updated work entry with client name
            db.get(
              `SELECT we.id, we.client_id, we.hours, we.description, we.date, 
                      we.created_at, we.updated_at, c.name as client_name
               FROM work_entries we
               JOIN clients c ON we.client_id = c.id
               WHERE we.id = ?`,
              [workEntryId],
              (err, row) => {
                if (err) {
                  console.error('Database error:', err);
                  return res.status(500).json({ error: 'Work entry updated but failed to retrieve' });
                }

                res.json({
                  message: 'Work entry updated successfully',
                  workEntry: row
                });
              }
            );
          });
        }
      }
    );
  } catch (error) {
    next(error);
  }
});

// Delete work entry
router.delete('/:id', (req, res) => {
  const workEntryId = parseInt(req.params.id);
  
  if (isNaN(workEntryId)) {
    return res.status(400).json({ error: 'Invalid work entry ID' });
  }
  
  const db = getDatabase();
  
  // Check if work entry exists and belongs to user
  db.get(
    'SELECT id FROM work_entries WHERE id = ? AND user_email = ?',
    [workEntryId, req.userEmail],
    (err, row) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      
      if (!row) {
        return res.status(404).json({ error: 'Work entry not found' });
      }
      
      // Delete work entry
      db.run(
        'DELETE FROM work_entries WHERE id = ? AND user_email = ?',
        [workEntryId, req.userEmail],
        function(err) {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Failed to delete work entry' });
          }
          
          res.json({ message: 'Work entry deleted successfully' });
        }
      );
    }
  );
});

module.exports = router;
