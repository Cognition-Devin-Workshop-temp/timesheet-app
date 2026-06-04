import http from 'k6/http';

export const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';

/**
 * Login (or register) a virtual user by email.
 * Returns the email string to use as the x-user-email header.
 */
export function login(email) {
  const res = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ email }),
    { headers: { 'Content-Type': 'application/json' }, tags: { name: 'login' } }
  );
  return { res, email };
}

/**
 * Standard auth headers for a logged-in user.
 */
export function authHeaders(email) {
  return {
    'Content-Type': 'application/json',
    'x-user-email': email,
  };
}

/**
 * Create a client for a given user.
 */
export function createClient(email, payload) {
  return http.post(
    `${BASE_URL}/api/clients`,
    JSON.stringify(payload),
    { headers: authHeaders(email), tags: { name: 'create_client' } }
  );
}

/**
 * List all clients for a given user.
 */
export function listClients(email) {
  return http.get(`${BASE_URL}/api/clients`, {
    headers: authHeaders(email),
    tags: { name: 'list_clients' },
  });
}

/**
 * Create a work entry for a given user and client.
 */
export function createWorkEntry(email, payload) {
  return http.post(
    `${BASE_URL}/api/work-entries`,
    JSON.stringify(payload),
    { headers: authHeaders(email), tags: { name: 'create_work_entry' } }
  );
}

/**
 * List work entries, optionally filtered by clientId.
 */
export function listWorkEntries(email, clientId) {
  const url = clientId
    ? `${BASE_URL}/api/work-entries?clientId=${clientId}`
    : `${BASE_URL}/api/work-entries`;
  return http.get(url, {
    headers: authHeaders(email),
    tags: { name: 'list_work_entries' },
  });
}

/**
 * Get the hourly report for a client.
 */
export function getClientReport(email, clientId) {
  return http.get(`${BASE_URL}/api/reports/client/${clientId}`, {
    headers: authHeaders(email),
    tags: { name: 'get_report' },
  });
}

/**
 * Health check endpoint (no auth required).
 */
export function healthCheck() {
  return http.get(`${BASE_URL}/health`, {
    tags: { name: 'health_check' },
  });
}
