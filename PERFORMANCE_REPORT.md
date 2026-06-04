# Performance Report: Timesheet App

## Executive Summary

This report documents the load testing results for the timesheet-app backend API,
covering baseline performance, scalability under ramp-up, and breaking-point analysis.

**Key findings:**
- Baseline (50 VUs): **0% error rate**, p95 latency **13.75 ms**, throughput **190 req/s**
- Ramp-up (1→100 VUs): **0% error rate**, p95 **5.67 ms**, throughput **268 req/s**
- Breaking point: App handled **500 VUs with 0% errors** after fixes (2,122 req/s)
- Two bottlenecks identified and fixed:
  1. Hard-coded rate limiter (100 req/15 min) — made configurable via `RATE_LIMIT_MAX`
  2. SQLite write contention in auth — replaced read-then-write with atomic `INSERT OR IGNORE`, enabled WAL mode and busy_timeout

---

## 1. Test Environment

| Component | Details |
|-----------|---------|
| Backend | Node.js + Express + SQLite (in-memory) |
| Machine | Ubuntu Linux VM (2 CPU, 4 GB RAM) |
| Load tool | k6 v2.0.0 |
| Target | `http://localhost:3001` (local) |

## 2. Methodology

Three test scenarios were executed:

1. **Baseline Workflow** (50 VUs, 2 min) — Simulates 50 concurrent users performing typical workflows: login, create client, create 3 work entries, list entries, view report.
2. **Ramp-Up** (1 → 100 VUs, 5.5 min) — Gradually increases from 1 to 100 users over 5 minutes, holds for 1 minute at peak, then ramps down.
3. **Breaking Point** (1 → 500 VUs, ~10 min) — Progressively increases concurrency to find the failure threshold. Auto-aborts when error rate exceeds 30%.

## 3. Baseline Results (50 Concurrent Users)

| Metric | Value |
|--------|-------|
| p50 latency | 3.85 ms |
| p90 latency | 9.75 ms |
| p95 latency | **13.75 ms** |
| Error rate | **0.00%** |
| Throughput (req/s) | **190** |
| Total requests | 23,211 |
| Failed requests | 0 |
| Iterations completed | 2,579 |

### Per-Endpoint Breakdown

| Endpoint | Avg | p50 | p95 | Max |
|----------|-----|-----|-----|-----|
| Login | 4.27 ms | 2.99 ms | 10.13 ms | 52.02 ms |
| Create Client | 5.26 ms | 4.34 ms | 10.31 ms | 26.53 ms |
| Create Work Entry | 7.69 ms | 5.79 ms | 18.13 ms | 41.19 ms |
| List Work Entries | 4.39 ms | 3.59 ms | 9.49 ms | 20.44 ms |
| View Report | 4.04 ms | 3.52 ms | 8.08 ms | 20.23 ms |

## 4. Ramp-Up Results (1 → 100 Users)

| Metric | Value |
|--------|-------|
| p95 latency | **5.67 ms** |
| Max throughput (req/s) | **268** |
| Error rate | **0.00%** |
| Total requests | 88,536 |
| Iterations completed | 14,756 |

### Per-Endpoint at Peak (100 VUs)

| Endpoint | Avg | p95 |
|----------|-----|-----|
| Login | 2.18 ms | 4.11 ms |
| Create Client | 2.84 ms | 5.45 ms |
| Create Work Entry | 3.56 ms | 6.65 ms |
| List Entries | 2.34 ms | 4.40 ms |
| View Report | 2.77 ms | 5.24 ms |

## 5. Breaking Point Analysis

The test ran from 50 to 500 VUs over 9.5 minutes. **The app survived the full test with 0% errors.**

| Metric | Value |
|--------|-------|
| Max VUs reached | **500** |
| Error rate | **0.00%** |
| Total requests | 1,210,230 |
| Peak throughput | **2,122 req/s** |
| p95 latency at peak | 127.68 ms |
| Iterations completed | 242,046 |

### Latency at Peak (500 VUs)

| Endpoint | Avg | p95 |
|----------|-----|-----|
| Login | 41.89 ms | 96.73 ms |
| Create Work Entry | 73.18 ms | 150.91 ms |
| View Report | 58.64 ms | 133.50 ms |

**Breaking point:** Not reached — the application handled 500 concurrent users with 0% errors. Latency degrades gracefully (p95 goes from ~6 ms at 100 VUs to ~128 ms at 500 VUs) but no failures occur.

## 6. Bottleneck Analysis

### Identified Bottlenecks

#### 1. Hard-coded rate limiter (100 req/15 min)

The Express `rate-limit` middleware was hard-coded to 100 requests per 15-minute window. Under even modest load (50 concurrent users from the same IP), this caused immediate 429 Too Many Requests responses.

**Fix:** Made configurable via `RATE_LIMIT_MAX` environment variable in `backend/src/server.js`:
```js
max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100
```

#### 2. SQLite write contention on login/auth (TOCTOU race)

The login route and auth middleware used a **read-then-write** pattern:
```js
// BEFORE: Two DB calls with a race window
db.get('SELECT ... WHERE email = ?', [email], (err, row) => {
  if (!row) {
    db.run('INSERT INTO users ...', [email], cb);
  }
});
```

Under concurrent load, multiple requests for different users all attempted writes simultaneously. Without WAL mode, SQLite's default journal mode serializes all writes, causing `SQLITE_BUSY` errors. Additionally, no `busy_timeout` was set, so write contention failed immediately rather than retrying.

**Fixes applied (`backend/src/database/init.js` and `backend/src/routes/auth.js`):**
1. Enabled **WAL mode** (`PRAGMA journal_mode = WAL`) for concurrent read/write support
2. Added **busy_timeout** (`PRAGMA busy_timeout = 5000`) so writes retry instead of failing
3. Replaced read-then-write with atomic **`INSERT OR IGNORE`** to eliminate the TOCTOU race

```js
// AFTER: Single atomic operation
db.run('INSERT OR IGNORE INTO users (email) VALUES (?)', [email], cb);
```

### Pre-Fix Performance (for comparison)

Before the SQLite fixes, with the rate limiter properly configured:

| Test | Error Rate | Login Failure Rate | Breaking Point |
|------|-----------|-------------------|----------------|
| Ramp-up (100 VUs) | 4.87% | 17% | N/A |
| Breaking point | 30.37% (aborted) | 64% | ~200 VUs |

## 7. Recommendations

1. **Rate limiter per-environment tuning** — Use `RATE_LIMIT_MAX` for environment-specific rate limits. Production: ~1,000/15 min per IP. Staging/load testing: 10,000,000+.

2. **Consider per-user rate limiting** — The current rate limiter is per-IP. Behind a reverse proxy, all users share one IP. Consider rate limiting by the `x-user-email` header instead.

3. **Database migration path** — SQLite works well for small deployments. For production with >200 concurrent users, consider PostgreSQL or MySQL for true concurrent writes and connection pooling.

4. **Connection pooling** — If migrating to PostgreSQL, use a connection pool (e.g., `pg-pool`) to avoid connection overhead per request.

5. **Caching layer** — For read-heavy endpoints (list entries, reports), add Redis or in-memory caching to reduce DB load.

6. **Monitor latency at scale** — At 500 VUs, p95 latency climbs to ~128 ms. While functional, this may exceed SLA targets. Set alerting thresholds accordingly.

## 8. Before/After Comparison

| Metric | Before Fix | After Fix | Improvement |
|--------|-----------|-----------|-------------|
| Ramp-up error rate | 4.87% | **0.00%** | Eliminated |
| Ramp-up login failures | 17% | **0%** | Eliminated |
| Breaking point threshold | ~200 VUs | **>500 VUs** | **2.5x+ improvement** |
| Max throughput (breaking) | 542 req/s (at failure) | **2,122 req/s** | **3.9x improvement** |
| Breaking point p95 latency | 27.25 ms (at 200 VUs, failing) | 127.68 ms (at 500 VUs, passing) | Handles 2.5x more users |

---

*Generated: 2026-06-04*
