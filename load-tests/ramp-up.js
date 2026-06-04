/**
 * Ramp-Up Test
 *
 * Ramps from 1 to 100 virtual users over 5 minutes to observe how the
 * application behaves under increasing load. After the ramp, holds at 100
 * VUs for 1 minute, then gracefully ramps down.
 *
 * Establishes performance baselines at different concurrency levels.
 */

import { check, sleep } from 'k6';
import { Trend, Counter, Rate } from 'k6/metrics';
import {
  login,
  createClient,
  createWorkEntry,
  listWorkEntries,
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
  stages: [
    { duration: '1m', target: 25 },   // ramp to 25 VUs
    { duration: '1m', target: 50 },   // ramp to 50 VUs
    { duration: '1m', target: 75 },   // ramp to 75 VUs
    { duration: '1m', target: 100 },  // ramp to 100 VUs
    { duration: '1m', target: 100 },  // hold at 100 VUs
    { duration: '30s', target: 0 },   // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'],  // p95 < 3 s during ramp
    error_rate: ['rate<0.10'],           // < 10 % errors acceptable during ramp
    http_req_failed: ['rate<0.10'],
  },
};

// ── Helpers ─────────────────────────────────────────────────────────────────
function randomDate() {
  const start = new Date(2025, 0, 1);
  const end = new Date(2025, 11, 31);
  const d = new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime())
  );
  return d.toISOString().split('T')[0];
}

// ── Main VU function ────────────────────────────────────────────────────────
export default function () {
  const vuEmail = `ramp-vu${__VU}-iter${__ITER}@example.com`;

  // 1. Login
  const { res: loginRes } = login(vuEmail);
  loginDuration.add(loginRes.timings.duration);
  const loginOk = check(loginRes, {
    'login 2xx': (r) => r.status >= 200 && r.status < 300,
  });
  if (!loginOk) {
    errors.add(1);
    errorRate.add(true);
    sleep(1);
    return;
  }
  errorRate.add(false);

  sleep(0.2);

  // 2. Create client
  const clientRes = createClient(vuEmail, {
    name: `Ramp-Client-VU${__VU}-${__ITER}`,
    description: 'Ramp-up test client',
  });
  createClientDuration.add(clientRes.timings.duration);
  const clientOk = check(clientRes, {
    'client created 201': (r) => r.status === 201,
  });
  if (!clientOk) {
    errors.add(1);
    errorRate.add(true);
    sleep(1);
    return;
  }
  errorRate.add(false);

  const clientId = JSON.parse(clientRes.body).client.id;
  sleep(0.2);

  // 3. Create 2 work entries
  for (let i = 0; i < 2; i++) {
    const entryRes = createWorkEntry(vuEmail, {
      clientId,
      hours: parseFloat((Math.random() * 8 + 0.5).toFixed(2)),
      description: `Ramp entry ${i + 1}`,
      date: randomDate(),
    });
    createEntryDuration.add(entryRes.timings.duration);
    const ok = check(entryRes, {
      'entry created 201': (r) => r.status === 201,
    });
    if (!ok) {
      errors.add(1);
      errorRate.add(true);
    } else {
      errorRate.add(false);
    }
    sleep(0.1);
  }

  // 4. List work entries
  const listRes = listWorkEntries(vuEmail, clientId);
  listEntriesDuration.add(listRes.timings.duration);
  check(listRes, { 'list entries 200': (r) => r.status === 200 });

  sleep(0.2);

  // 5. View report
  const reportRes = getClientReport(vuEmail, clientId);
  reportDuration.add(reportRes.timings.duration);
  check(reportRes, { 'report 200': (r) => r.status === 200 });

  sleep(0.5);
}
