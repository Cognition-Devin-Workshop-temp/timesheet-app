import { type APIRequestContext, type APIResponse } from '@playwright/test';
import { config } from '../utils/config';

/**
 * Lightweight HTTP helper wrapping Playwright's API request context.
 * Useful for pre-test setup (e.g. fetching auth tokens, seeding data).
 */
export class ApiHelper {
  private readonly request: APIRequestContext;

  constructor(request: APIRequestContext) {
    this.request = request;
  }

  async get(endpoint: string, params?: Record<string, string>): Promise<APIResponse> {
    return this.request.get(`${config.baseURL}${endpoint}`, { params });
  }

  async post(endpoint: string, data?: unknown): Promise<APIResponse> {
    return this.request.post(`${config.baseURL}${endpoint}`, {
      data,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async checkSiteHealth(): Promise<boolean> {
    try {
      const response = await this.request.get(config.baseURL);
      return response.ok();
    } catch {
      return false;
    }
  }
}
