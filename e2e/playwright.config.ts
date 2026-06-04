import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 60000,
  expect: { timeout: 10000 },
  use: {
    baseURL: 'http://localhost:5173',
    video: 'on',
    screenshot: 'on',
    trace: 'on',
  },
  reporter: [['html'], ['list']],
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
});
