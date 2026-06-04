const express = require('express');
const { getDatabase } = require('../database/init');
const { authenticateUser } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { clientSchema, updateClientSchema } = require('../validation/schemas');

const router = express.Router();

// All routes require authentication
router.use(authenticateUser);

// Get all clients for authenticated user (admin sees all)
router.get('/', (req, res) => {
  const db = getDatabase();
  
  if (req.userRole === 'admin') {
    db.all(
      'SELECT id, name, description, department, email, user_email, created_at, updated_at FROM clients ORDER BY name',
      [],
      (err, rows) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Internal server error' });
        }
        res.json({ clients: rows });
      }
    );
  } else {
    db.all(
      'SELECT id, name, description, department, email, created_at, updated_at FROM clients WHERE user_email = ? ORDER BY name',
      [req.userEmail],
      (err, rows) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Internal server error' });
        }
        res.json({ clients: rows });
      }
    );
  }
});

// Get specific client
router.get('/:id', (req, res) => {
  const clientId = parseInt(req.params.id);
  
  if (isNaN(clientId)) {
    return res.status(400).json({ error: 'Invalid client ID' });
  }
  
  const db = getDatabase();
  
  const query = req.userRole === 'admin'
    ? 'SELECT id, name, description, department, email, user_email, created_at, updated_at FROM clients WHERE id = ?'
    : 'SELECT id, name, description, department, email, created_at, updated_at FROM clients WHERE id = ? AND user_email = ?';
  const params = req.userRole === 'admin' ? [clientId] : [clientId, req.userEmail];

  db.get(query, params, (err, row) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    
    if (!row) {
      return res.status(404).json({ error: 'Client not found' });
    }
    
    res.json({ client: row });
  });
});

// Create new client
router.post('/', (req, res, next) => {
  try {
    const { error, value } = clientSchema.validate(req.body);
    if (error) {
      return next(error);
    }

    const { name, description, department, email } = value;
    const db = getDatabase();

    db.run(
      'INSERT INTO clients (name, description, department, email, user_email) VALUES (?, ?, ?, ?, ?)',
      [name, description || null, department || null, email || null, req.userEmail],
      function(err) {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Failed to create client' });
        }

        db.get(
          'SELECT id, name, description, department, email, created_at, updated_at FROM clients WHERE id = ?',
          [this.lastID],
          (err, row) => {
            if (err) {
              console.error('Database error:', err);
              return res.status(500).json({ error: 'Client created but failed to retrieve' });
            }

            res.status(201).json({ 
              message: 'Client created successfully',
              client: row 
            });
          }
        );
      }
    );
  } catch (error) {
    next(error);
  }
});

// Update client
router.put('/:id', (req, res, next) => {
  try {
    const clientId = parseInt(req.params.id);
    
    if (isNaN(clientId)) {
      return res.status(400).json({ error: 'Invalid client ID' });
    }

    const { error, value } = updateClientSchema.validate(req.body);
    if (error) {
      return next(error);
    }

    const db = getDatabase();

    const checkQuery = req.userRole === 'admin'
      ? 'SELECT id FROM clients WHERE id = ?'
      : 'SELECT id FROM clients WHERE id = ? AND user_email = ?';
    const checkParams = req.userRole === 'admin' ? [clientId] : [clientId, req.userEmail];

    db.get(checkQuery, checkParams, (err, row) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      if (!row) {
        return res.status(404).json({ error: 'Client not found' });
      }

      const updates = [];
      const values = [];

      if (value.name !== undefined) {
        updates.push('name = ?');
        values.push(value.name);
      }
      if (value.description !== undefined) {
        updates.push('description = ?');
        values.push(value.description || null);
      }
      if (value.department !== undefined) {
        updates.push('department = ?');
        values.push(value.department || null);
      }
      if (value.email !== undefined) {
        updates.push('email = ?');
        values.push(value.email || null);
      }

      updates.push('updated_at = CURRENT_TIMESTAMP');

      const updateQuery = req.userRole === 'admin'
        ? `UPDATE clients SET ${updates.join(', ')} WHERE id = ?`
        : `UPDATE clients SET ${updates.join(', ')} WHERE id = ? AND user_email = ?`;
      
      if (req.userRole === 'admin') {
        values.push(clientId);
      } else {
        values.push(clientId, req.userEmail);
      }

      db.run(updateQuery, values, function(err) {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Failed to update client' });
        }

        db.get(
          'SELECT id, name, description, department, email, created_at, updated_at FROM clients WHERE id = ?',
          [clientId],
          (err, row) => {
            if (err) {
              console.error('Database error:', err);
              return res.status(500).json({ error: 'Client updated but failed to retrieve' });
            }

            res.json({
              message: 'Client updated successfully',
              client: row
            });
          }
        );
      });
    });
  } catch (error) {
    next(error);
  }
});

// Delete all clients for authenticated user (admin deletes all)
router.delete('/', (req, res) => {
  const db = getDatabase();

  const query = req.userRole === 'admin'
    ? 'DELETE FROM clients'
    : 'DELETE FROM clients WHERE user_email = ?';
  const params = req.userRole === 'admin' ? [] : [req.userEmail];
  
  db.run(query, params, function(err) {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Failed to delete clients' });
    }
    
    res.json({ 
      message: 'All clients deleted successfully',
      deletedCount: this.changes
    });
  });
});

// Delete client
router.delete('/:id', (req, res) => {
  const clientId = parseInt(req.params.id);
  
  if (isNaN(clientId)) {
    return res.status(400).json({ error: 'Invalid client ID' });
  }
  
  const db = getDatabase();
  
  const checkQuery = req.userRole === 'admin'
    ? 'SELECT id FROM clients WHERE id = ?'
    : 'SELECT id FROM clients WHERE id = ? AND user_email = ?';
  const checkParams = req.userRole === 'admin' ? [clientId] : [clientId, req.userEmail];

  db.get(checkQuery, checkParams, (err, row) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    
    if (!row) {
      return res.status(404).json({ error: 'Client not found' });
    }
    
    const deleteQuery = req.userRole === 'admin'
      ? 'DELETE FROM clients WHERE id = ?'
      : 'DELETE FROM clients WHERE id = ? AND user_email = ?';
    const deleteParams = req.userRole === 'admin' ? [clientId] : [clientId, req.userEmail];

    db.run(deleteQuery, deleteParams, function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Failed to delete client' });
      }
      
      res.json({ message: 'Client deleted successfully' });
    });
  });
});

module.exports = router;
