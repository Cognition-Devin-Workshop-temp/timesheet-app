/**
 * Baseline Workflow Test
 *
 * Simulates 50 concurrent users performing typical workflows:
 *   1. Login (register/authenticate)
 *   2. Create a client
 *   3. Create several work entries for that client
 *   4. List work entries
 *   5. View the hourly report for the client
 *
 * Metrics collected: p95 latency, error rate, throughput (req/s).
 */

import { check, sleep } from 'k6';
import { Trend, Counter, Rate } from 'k6/metrics';
import {
  login,
  createClient,
  createWorkEntry,
  listWorkEntries,
  listClients,
  getClientReport,
  healthCheck,
} from './helpers.js';

// ── Custom metrics ──────────────────────────────────────────────────────────
const loginDuration = new Trend('login_duration', true);
const createClientDuration = new Trend('create_client_duration', true);
const createEntryDuration = new Trend('create_entry_duration', true);
const listEntriesDuration = new Trend('list_entries_duration', true);
const reportDuration = new Trend('report_duration', true);
const errors = new Counter('business_errors');
const errorRate = new Rate('error_rate');

// ── Options ─────────────────────────────────────────────────────────────────
export const options = {
  scenarios: {
    typical_workflow: {
      executor: 'constant-vus',
      vus: 50,
      duration: '2m',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<2000'],   // p95 < 2 s
    error_rate: ['rate<0.05'],            // < 5 % errors
    http_req_failed: ['rate<0.05'],
  },
};

// ── Helpers ─────────────────────────────────────────────────────────────────
function randomDate() {
  const start = new Date(2025, 0, 1);
  const end = new Date(2025, 11, 31);
  const d = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return d.toISOString().split('T')[0];
}

// ── Main VU function ────────────────────────────────────────────────────────
export default function () {
  const vuEmail = `loadtest-vu${__VU}-iter${__ITER}@example.com`;

  // 1. Health check
  const hc = healthCheck();
  check(hc, { 'health OK': (r) => r.status === 200 });

  // 2. Login
  const { res: loginRes } = login(vuEmail);
  loginDuration.add(loginRes.timings.duration);
  const loginOk = check(loginRes, {
    'login status 200 or 201': (r) => r.status === 200 || r.status === 201,
  });
  if (!loginOk) {
    errors.add(1);
    errorRate.add(true);
    return;            // skip rest of workflow if login fails
  }
  errorRate.add(false);

  sleep(0.3);

  // 3. Create a client
  const clientPayload = {
    name: `Client-VU${__VU}-${__ITER}`,
    description: 'Load test client',
    department: 'Engineering',
    email: `client-${__VU}@test.com`,
  };
  const clientRes = createClient(vuEmail, clientPayload);
  createClientDuration.add(clientRes.timings.duration);
  const clientOk = check(clientRes, {
    'client created 201': (r) => r.status === 201,
  });
  if (!clientOk) {
    errors.add(1);
    errorRate.add(true);
    return;
  }
  errorRate.add(false);

  const clientId = JSON.parse(clientRes.body).client.id;

  sleep(0.3);

  // 4. Create 3 work entries
  for (let i = 0; i < 3; i++) {
    const entryPayload = {
      clientId,
      hours: parseFloat((Math.random() * 8 + 0.5).toFixed(2)),
      description: `Work entry ${i + 1} from VU${__VU}`,
      date: randomDate(),
    };
    const entryRes = createWorkEntry(vuEmail, entryPayload);
    createEntryDuration.add(entryRes.timings.duration);
    const entryOk = check(entryRes, {
      'work entry created 201': (r) => r.status === 201,
    });
    if (!entryOk) {
      errors.add(1);
      errorRate.add(true);
    } else {
      errorRate.add(false);
    }
    sleep(0.1);
  }

  // 5. List work entries
  const listRes = listWorkEntries(vuEmail, clientId);
  listEntriesDuration.add(listRes.timings.duration);
  check(listRes, { 'list entries 200': (r) => r.status === 200 });

  sleep(0.2);

  // 6. List all clients
  const clientsRes = listClients(vuEmail);
  check(clientsRes, { 'list clients 200': (r) => r.status === 200 });

  sleep(0.2);

  // 7. View hourly report
  const reportRes = getClientReport(vuEmail, clientId);
  reportDuration.add(reportRes.timings.duration);
  check(reportRes, { 'report 200': (r) => r.status === 200 });

  sleep(1); // think time between iterations
}
