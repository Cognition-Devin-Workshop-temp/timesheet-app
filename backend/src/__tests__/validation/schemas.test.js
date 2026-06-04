const {
  clientSchema,
  workEntrySchema,
  updateWorkEntrySchema,
  updateClientSchema,
  projectSchema,
  updateProjectSchema,
  emailSchema
} = require('../../validation/schemas');

describe('Validation Schemas', () => {
  describe('clientSchema', () => {
    test('should validate valid client data', () => {
      const validClient = {
        name: 'Test Client',
        description: 'A test client'
      };

      const { error } = clientSchema.validate(validClient);
      expect(error).toBeUndefined();
    });

    test('should allow empty description', () => {
      const client = {
        name: 'Test Client',
        description: ''
      };

      const { error } = clientSchema.validate(client);
      expect(error).toBeUndefined();
    });

    test('should allow missing description', () => {
      const client = {
        name: 'Test Client'
      };

      const { error } = clientSchema.validate(client);
      expect(error).toBeUndefined();
    });

    test('should reject missing name', () => {
      const client = {
        description: 'No name'
      };

      const { error } = clientSchema.validate(client);
      expect(error).toBeDefined();
    });

    test('should reject empty name', () => {
      const client = {
        name: '',
        description: 'Empty name'
      };

      const { error } = clientSchema.validate(client);
      expect(error).toBeDefined();
    });

    test('should reject name longer than 255 characters', () => {
      const client = {
        name: 'a'.repeat(256)
      };

      const { error } = clientSchema.validate(client);
      expect(error).toBeDefined();
    });

    test('should reject description longer than 1000 characters', () => {
      const client = {
        name: 'Test',
        description: 'a'.repeat(1001)
      };

      const { error } = clientSchema.validate(client);
      expect(error).toBeDefined();
    });

    test('should trim whitespace from name', () => {
      const client = {
        name: '  Test Client  '
      };

      const { value } = clientSchema.validate(client);
      expect(value.name).toBe('Test Client');
    });
  });

  describe('workEntrySchema', () => {
    test('should validate valid work entry', () => {
      const validEntry = {
        clientId: 1,
        hours: 5.5,
        description: 'Development work',
        date: '2024-01-15'
      };

      const { error } = workEntrySchema.validate(validEntry);
      expect(error).toBeUndefined();
    });

    test('should allow empty description', () => {
      const entry = {
        clientId: 1,
        hours: 5,
        description: '',
        date: '2024-01-15'
      };

      const { error } = workEntrySchema.validate(entry);
      expect(error).toBeUndefined();
    });

    test('should reject missing clientId', () => {
      const entry = {
        hours: 5,
        date: '2024-01-15'
      };

      const { error } = workEntrySchema.validate(entry);
      expect(error).toBeDefined();
    });

    test('should reject negative clientId', () => {
      const entry = {
        clientId: -1,
        hours: 5,
        date: '2024-01-15'
      };

      const { error } = workEntrySchema.validate(entry);
      expect(error).toBeDefined();
    });

    test('should reject zero clientId', () => {
      const entry = {
        clientId: 0,
        hours: 5,
        date: '2024-01-15'
      };

      const { error } = workEntrySchema.validate(entry);
      expect(error).toBeDefined();
    });

    test('should reject missing hours', () => {
      const entry = {
        clientId: 1,
        date: '2024-01-15'
      };

      const { error } = workEntrySchema.validate(entry);
      expect(error).toBeDefined();
    });

    test('should reject negative hours', () => {
      const entry = {
        clientId: 1,
        hours: -5,
        date: '2024-01-15'
      };

      const { error } = workEntrySchema.validate(entry);
      expect(error).toBeDefined();
    });

    test('should reject hours greater than 24', () => {
      const entry = {
        clientId: 1,
        hours: 25,
        date: '2024-01-15'
      };

      const { error } = workEntrySchema.validate(entry);
      expect(error).toBeDefined();
    });

    test('should accept decimal hours', () => {
      const entry = {
        clientId: 1,
        hours: 7.75,
        date: '2024-01-15'
      };

      const { error } = workEntrySchema.validate(entry);
      expect(error).toBeUndefined();
    });

    test('should reject missing date', () => {
      const entry = {
        clientId: 1,
        hours: 5
      };

      const { error } = workEntrySchema.validate(entry);
      expect(error).toBeDefined();
    });

    test('should reject invalid date format', () => {
      const entry = {
        clientId: 1,
        hours: 5,
        date: '01/15/2024'
      };

      const { error } = workEntrySchema.validate(entry);
      expect(error).toBeDefined();
    });
  });

  describe('updateWorkEntrySchema', () => {
    test('should validate partial update', () => {
      const update = {
        hours: 8
      };

      const { error } = updateWorkEntrySchema.validate(update);
      expect(error).toBeUndefined();
    });

    test('should validate multiple field update', () => {
      const update = {
        hours: 8,
        description: 'Updated description'
      };

      const { error } = updateWorkEntrySchema.validate(update);
      expect(error).toBeUndefined();
    });

    test('should reject empty update', () => {
      const update = {};

      const { error } = updateWorkEntrySchema.validate(update);
      expect(error).toBeDefined();
    });

    test('should validate clientId update', () => {
      const update = {
        clientId: 2
      };

      const { error } = updateWorkEntrySchema.validate(update);
      expect(error).toBeUndefined();
    });

    test('should validate date update', () => {
      const update = {
        date: '2024-02-01'
      };

      const { error } = updateWorkEntrySchema.validate(update);
      expect(error).toBeUndefined();
    });
  });

  describe('updateClientSchema', () => {
    test('should validate name update', () => {
      const update = {
        name: 'Updated Name'
      };

      const { error } = updateClientSchema.validate(update);
      expect(error).toBeUndefined();
    });

    test('should validate description update', () => {
      const update = {
        description: 'Updated description'
      };

      const { error } = updateClientSchema.validate(update);
      expect(error).toBeUndefined();
    });

    test('should reject empty update', () => {
      const update = {};

      const { error } = updateClientSchema.validate(update);
      expect(error).toBeDefined();
    });

    test('should validate both fields update', () => {
      const update = {
        name: 'New Name',
        description: 'New Description'
      };

      const { error } = updateClientSchema.validate(update);
      expect(error).toBeUndefined();
    });
  });

  describe('projectSchema', () => {
    test('should validate valid project data with all fields', () => {
      const validProject = {
        name: 'New Website',
        description: 'Build a new corporate website',
        clientId: 1,
        startDate: '2024-03-01',
        status: 'active'
      };

      const { error } = projectSchema.validate(validProject);
      expect(error).toBeUndefined();
    });

    test('should validate project without optional fields', () => {
      const project = {
        name: 'Minimal Project',
        clientId: 1,
        startDate: '2024-03-01'
      };

      const { error } = projectSchema.validate(project);
      expect(error).toBeUndefined();
    });

    test('should default status to active when not provided', () => {
      const project = {
        name: 'Default Status Project',
        clientId: 1,
        startDate: '2024-03-01'
      };

      const { value } = projectSchema.validate(project);
      expect(value.status).toBe('active');
    });

    test('should allow empty description', () => {
      const project = {
        name: 'Project',
        clientId: 1,
        startDate: '2024-03-01',
        description: ''
      };

      const { error } = projectSchema.validate(project);
      expect(error).toBeUndefined();
    });

    test('should reject missing name', () => {
      const project = {
        clientId: 1,
        startDate: '2024-03-01'
      };

      const { error } = projectSchema.validate(project);
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('name');
    });

    test('should reject empty name', () => {
      const project = {
        name: '',
        clientId: 1,
        startDate: '2024-03-01'
      };

      const { error } = projectSchema.validate(project);
      expect(error).toBeDefined();
    });

    test('should reject name longer than 255 characters', () => {
      const project = {
        name: 'a'.repeat(256),
        clientId: 1,
        startDate: '2024-03-01'
      };

      const { error } = projectSchema.validate(project);
      expect(error).toBeDefined();
    });

    test('should trim whitespace from name', () => {
      const project = {
        name: '  My Project  ',
        clientId: 1,
        startDate: '2024-03-01'
      };

      const { value } = projectSchema.validate(project);
      expect(value.name).toBe('My Project');
    });

    test('should reject description longer than 1000 characters', () => {
      const project = {
        name: 'Test',
        clientId: 1,
        startDate: '2024-03-01',
        description: 'a'.repeat(1001)
      };

      const { error } = projectSchema.validate(project);
      expect(error).toBeDefined();
    });

    test('should reject missing clientId', () => {
      const project = {
        name: 'Test',
        startDate: '2024-03-01'
      };

      const { error } = projectSchema.validate(project);
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('clientId');
    });

    test('should reject negative clientId', () => {
      const project = {
        name: 'Test',
        clientId: -1,
        startDate: '2024-03-01'
      };

      const { error } = projectSchema.validate(project);
      expect(error).toBeDefined();
    });

    test('should reject zero clientId', () => {
      const project = {
        name: 'Test',
        clientId: 0,
        startDate: '2024-03-01'
      };

      const { error } = projectSchema.validate(project);
      expect(error).toBeDefined();
    });

    test('should reject non-integer clientId', () => {
      const project = {
        name: 'Test',
        clientId: 1.5,
        startDate: '2024-03-01'
      };

      const { error } = projectSchema.validate(project);
      expect(error).toBeDefined();
    });

    test('should reject missing startDate', () => {
      const project = {
        name: 'Test',
        clientId: 1
      };

      const { error } = projectSchema.validate(project);
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('startDate');
    });

    test('should reject invalid date format', () => {
      const project = {
        name: 'Test',
        clientId: 1,
        startDate: '03/01/2024'
      };

      const { error } = projectSchema.validate(project);
      expect(error).toBeDefined();
    });

    test('should accept valid ISO date string', () => {
      const project = {
        name: 'Test',
        clientId: 1,
        startDate: '2024-12-31'
      };

      const { error } = projectSchema.validate(project);
      expect(error).toBeUndefined();
    });

    test('should accept status active', () => {
      const project = {
        name: 'Test',
        clientId: 1,
        startDate: '2024-03-01',
        status: 'active'
      };

      const { error } = projectSchema.validate(project);
      expect(error).toBeUndefined();
    });

    test('should accept status completed', () => {
      const project = {
        name: 'Test',
        clientId: 1,
        startDate: '2024-03-01',
        status: 'completed'
      };

      const { error } = projectSchema.validate(project);
      expect(error).toBeUndefined();
    });

    test('should accept status on-hold', () => {
      const project = {
        name: 'Test',
        clientId: 1,
        startDate: '2024-03-01',
        status: 'on-hold'
      };

      const { error } = projectSchema.validate(project);
      expect(error).toBeUndefined();
    });

    test('should reject invalid status value', () => {
      const project = {
        name: 'Test',
        clientId: 1,
        startDate: '2024-03-01',
        status: 'cancelled'
      };

      const { error } = projectSchema.validate(project);
      expect(error).toBeDefined();
    });

    test('should reject numeric status', () => {
      const project = {
        name: 'Test',
        clientId: 1,
        startDate: '2024-03-01',
        status: 123
      };

      const { error } = projectSchema.validate(project);
      expect(error).toBeDefined();
    });
  });

  describe('updateProjectSchema', () => {
    test('should validate name-only update', () => {
      const update = { name: 'Updated Name' };

      const { error } = updateProjectSchema.validate(update);
      expect(error).toBeUndefined();
    });

    test('should validate status-only update', () => {
      const update = { status: 'completed' };

      const { error } = updateProjectSchema.validate(update);
      expect(error).toBeUndefined();
    });

    test('should validate clientId-only update', () => {
      const update = { clientId: 2 };

      const { error } = updateProjectSchema.validate(update);
      expect(error).toBeUndefined();
    });

    test('should validate startDate-only update', () => {
      const update = { startDate: '2024-06-01' };

      const { error } = updateProjectSchema.validate(update);
      expect(error).toBeUndefined();
    });

    test('should validate description-only update', () => {
      const update = { description: 'Updated description' };

      const { error } = updateProjectSchema.validate(update);
      expect(error).toBeUndefined();
    });

    test('should validate multiple field update', () => {
      const update = {
        name: 'New Name',
        status: 'on-hold',
        description: 'Paused for now'
      };

      const { error } = updateProjectSchema.validate(update);
      expect(error).toBeUndefined();
    });

    test('should validate full update with all fields', () => {
      const update = {
        name: 'Renamed',
        description: 'New desc',
        clientId: 3,
        startDate: '2024-07-01',
        status: 'active'
      };

      const { error } = updateProjectSchema.validate(update);
      expect(error).toBeUndefined();
    });

    test('should reject empty update (no fields)', () => {
      const update = {};

      const { error } = updateProjectSchema.validate(update);
      expect(error).toBeDefined();
    });

    test('should reject invalid status in update', () => {
      const update = { status: 'archived' };

      const { error } = updateProjectSchema.validate(update);
      expect(error).toBeDefined();
    });

    test('should reject invalid clientId in update', () => {
      const update = { clientId: -1 };

      const { error } = updateProjectSchema.validate(update);
      expect(error).toBeDefined();
    });

    test('should reject name longer than 255 characters in update', () => {
      const update = { name: 'a'.repeat(256) };

      const { error } = updateProjectSchema.validate(update);
      expect(error).toBeDefined();
    });

    test('should reject invalid date format in update', () => {
      const update = { startDate: 'not-a-date' };

      const { error } = updateProjectSchema.validate(update);
      expect(error).toBeDefined();
    });

    test('should allow empty description in update', () => {
      const update = { description: '' };

      const { error } = updateProjectSchema.validate(update);
      expect(error).toBeUndefined();
    });

    test('should trim whitespace from name in update', () => {
      const update = { name: '  Trimmed Name  ' };

      const { value } = updateProjectSchema.validate(update);
      expect(value.name).toBe('Trimmed Name');
    });
  });

  describe('emailSchema', () => {
    test('should validate valid email', () => {
      const data = {
        email: 'test@example.com'
      };

      const { error } = emailSchema.validate(data);
      expect(error).toBeUndefined();
    });

    test('should reject invalid email', () => {
      const data = {
        email: 'not-an-email'
      };

      const { error } = emailSchema.validate(data);
      expect(error).toBeDefined();
    });

    test('should reject missing email', () => {
      const data = {};

      const { error } = emailSchema.validate(data);
      expect(error).toBeDefined();
    });

    test('should accept email with subdomain', () => {
      const data = {
        email: 'user@mail.example.com'
      };

      const { error } = emailSchema.validate(data);
      expect(error).toBeUndefined();
    });
  });
});
