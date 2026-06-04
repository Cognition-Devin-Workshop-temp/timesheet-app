// Mock sqlite3 globally to avoid native module loading issues in tests
jest.mock('sqlite3', () => {
  const mockDatabase = {
    serialize: jest.fn((callback) => callback()),
    run: jest.fn((query, paramsOrCallback, callback) => {
      const cb = typeof paramsOrCallback === 'function' ? paramsOrCallback : callback;
      if (typeof cb === 'function') cb(null);
    }),
    get: jest.fn(),
    all: jest.fn(),
    close: jest.fn((callback) => callback && callback(null))
  };

  return {
    verbose: jest.fn(() => ({
      Database: jest.fn((path, callback) => {
        if (callback) callback(null);
        return mockDatabase;
      })
    }))
  };
});

// Set test environment variables
process.env.JWT_SECRET = 'test-jwt-secret-that-is-at-least-32-characters-long';
process.env.DATABASE_PATH = ':memory:';
process.env.NODE_ENV = 'test';
