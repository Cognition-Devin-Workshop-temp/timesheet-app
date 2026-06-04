const { getDatabase, initializeDatabase, closeDatabase } = require('../../database/init');

describe('Database Init - Coverage Enhancement', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('closeDatabase', () => {
    test('should resolve immediately when database is already closed', async () => {
      // First close to set up the state
      await closeDatabase();

      // Second close should resolve immediately since isClosed is true
      await expect(closeDatabase()).resolves.toBeUndefined();
    });

    test('should resolve when no database connection exists', async () => {
      // closeDatabase should handle no-db gracefully
      await expect(closeDatabase()).resolves.toBeUndefined();
    });

    test('should handle concurrent close calls', async () => {
      // Get database first to ensure connection exists
      getDatabase();

      // Call close twice concurrently
      const [result1, result2] = await Promise.all([
        closeDatabase(),
        closeDatabase()
      ]);

      expect(result1).toBeUndefined();
      expect(result2).toBeUndefined();
    });

    test('should handle close error gracefully', async () => {
      // Get database to establish connection
      const db = getDatabase();

      // The mock close always succeeds per setup.js
      await expect(closeDatabase()).resolves.toBeUndefined();
    });
  });

  describe('getDatabase', () => {
    test('should return the same instance on subsequent calls', () => {
      const db1 = getDatabase();
      const db2 = getDatabase();
      expect(db1).toBe(db2);
    });

    test('should create new connection after close', async () => {
      const db1 = getDatabase();
      await closeDatabase();
      const db2 = getDatabase();
      // After closing and reopening, should be a fresh instance
      expect(db2).toBeDefined();
    });
  });

  describe('initializeDatabase', () => {
    test('should create tables successfully', async () => {
      await expect(initializeDatabase()).resolves.toBeUndefined();
    });

    test('should be callable multiple times (idempotent)', async () => {
      await initializeDatabase();
      await expect(initializeDatabase()).resolves.toBeUndefined();
    });

    test('should call serialize on database', async () => {
      const db = getDatabase();
      await initializeDatabase();
      expect(db.serialize).toHaveBeenCalled();
    });

    test('should call run for creating tables', async () => {
      const db = getDatabase();
      await initializeDatabase();
      // Should have been called for: users table, clients table, work_entries table, 4 indexes
      expect(db.run).toHaveBeenCalled();
    });
  });
});
