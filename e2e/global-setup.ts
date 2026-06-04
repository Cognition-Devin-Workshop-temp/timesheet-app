import { request } from '@playwright/test';

export default async function globalSetup() {
  const ctx = await request.newContext({ baseURL: 'http://localhost:3001' });
  await ctx.post('/api/test/reset');
  await ctx.dispose();
}
