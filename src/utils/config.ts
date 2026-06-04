/**
 * Central configuration for the Flipkart test framework.
 * Override any value via environment variables.
 */
export const config = {
  baseURL: process.env.BASE_URL || 'https://www.flipkart.com',

  /** Timeouts (ms) */
  timeouts: {
    navigation: 60_000,
    element: 15_000,
    short: 5_000,
    polling: 1_000,
  },

  /** Credentials – sourced from environment variables for safety */
  credentials: {
    email: process.env.FLIPKART_EMAIL || '',
    password: process.env.FLIPKART_PASSWORD || '',
    phone: process.env.FLIPKART_PHONE || '',
  },

  /** Retry / resilience */
  retries: {
    api: 3,
    navigation: 2,
  },
} as const;
