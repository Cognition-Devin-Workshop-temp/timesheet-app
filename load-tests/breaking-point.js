/**
 * Breaking-Point Test
 *
 * Progressively increases concurrency beyond expected capacity to find the
 * point at which the application starts returning errors or latency spikes
 * above acceptable levels.
 *
 * Stages:
 *   1 -> 50 -> 100 -> 200 -> 300 -> 400 -> 500 VUs
 *
 * Abort condition: >30 % error rate (via abortOnFail threshold).
 */

import { check, sleep } from 'k6';
import { Trend, Counter, Rate } from 'k6/metrics';
import {
  login,
  createClient,
  createWorkEntry,
  listWorkEntries,
  getClientReport,
} from './helpers.js';

// ── Custom metrics ──────────────────────────────────────────────────────────
const loginDuration = new Trend('login_duration', true);
const createEntryDuration = new Trend('create_entry_duration', true);
const reportDuration = new Trend('report_duration', true);
const errors = new Counter('business_errors');
const errorRate = new Rate('error_rate');

// ── Options ─────────────────────────────────────────────────────────────────
export const options = {
  stages: [
    { duration: '30s', target: 50 },
    { duration: '1m',  target: 50 },   // hold
    { duration: '30s', target: 100 },
    { duration: '1m',  target: 100 },  // hold
    { duration: '30s', target: 200 },
    { duration: '1m',  target: 200 },  // hold
    { duration: '30s', target: 300 },
    { duration: '1m',  target: 300 },  // hold
    { duration: '30s', target: 400 },
    { duration: '1m',  target: 400 },  // hold
    { duration: '30s', target: 500 },
    { duration: '1m',  target: 500 },  // hold
    { duration: '30s', target: 0 },    // ramp down
  ],
  thresholds: {
    error_rate: [
      {
        threshold: 'rate<0.30',
        abortOnFail: true,
        delayAbortEval: '30s',
      },
    ],
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
  const vuEmail = `break-vu${__VU}-iter${__ITER}@example.com`;

  // 1. Login
  const { res: loginRes } = login(vuEmail);
  loginDuration.add(loginRes.timings.duration);
  const loginOk = check(loginRes, {
    'login 2xx': (r) => r.status >= 200 && r.status < 300,
  });
  if (!loginOk) {
    errors.add(1);
    errorRate.add(true);
    sleep(0.5);
    return;
  }
  errorRate.add(false);

  // 2. Create client
  const clientRes = createClient(vuEmail, {
    name: `Break-VU${__VU}-${__ITER}`,
  });
  const clientOk = check(clientRes, {
    'client 201': (r) => r.status === 201,
  });
  if (!clientOk) {
    errors.add(1);
    errorRate.add(true);
    sleep(0.5);
    return;
  }
  errorRate.add(false);

  const clientId = JSON.parse(clientRes.body).client.id;

  // 3. Create a work entry
  const entryRes = createWorkEntry(vuEmail, {
    clientId,
    hours: parseFloat((Math.random() * 8 + 0.5).toFixed(2)),
    description: `Breaking point entry VU${__VU}`,
    date: randomDate(),
  });
  createEntryDuration.add(entryRes.timings.duration);
  const entryOk = check(entryRes, {
    'entry 201': (r) => r.status === 201,
  });
  if (!entryOk) {
    errors.add(1);
    errorRate.add(true);
  } else {
    errorRate.add(false);
  }

  // 4. List entries
  const listRes = listWorkEntries(vuEmail, clientId);
  check(listRes, { 'list 200': (r) => r.status === 200 });

  // 5. View report
  const reportRes = getClientReport(vuEmail, clientId);
  reportDuration.add(reportRes.timings.duration);
  const reportOk = check(reportRes, {
    'report 200': (r) => r.status === 200,
  });
  if (!reportOk) {
    errors.add(1);
    errorRate.add(true);
  } else {
    errorRate.add(false);
  }

  sleep(0.3);
}
