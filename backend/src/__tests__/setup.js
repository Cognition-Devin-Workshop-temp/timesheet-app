// Mock logger globally to keep test output clean
jest.mock('../lib/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  fatal: jest.fn(),
  debug: jest.fn(),
  trace: jest.fn(),
  child: jest.fn().mockReturnThis()
}));

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
