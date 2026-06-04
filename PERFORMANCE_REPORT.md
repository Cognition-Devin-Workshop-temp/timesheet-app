# Performance Report: Timesheet App

## Executive Summary

This report documents the load testing results for the timesheet-app backend API,
covering baseline performance, scalability under ramp-up, and breaking-point analysis.

**Key findings:**
- _To be updated after test runs_

---

## 1. Test Environment

| Component | Details |
|-----------|---------|
| Backend | Node.js + Express + SQLite (in-memory) |
| Machine | Ubuntu Linux VM |
| Load tool | k6 v2.0.0 |
| Target | `http://localhost:3001` (local) |

## 2. Methodology

Three test scenarios were executed:

1. **Baseline Workflow** (50 VUs, 2 min) — Simulates 50 concurrent users performing typical workflows: login, create client, create 3 work entries, list entries, view report.
2. **Ramp-Up** (1 → 100 VUs, 5.5 min) — Gradually increases from 1 to 100 users over 5 minutes, holds for 1 minute at peak, then ramps down.
3. **Breaking Point** (1 → 500 VUs, ~10 min) — Progressively increases concurrency to find the failure threshold. Auto-aborts when error rate exceeds 30%.

## 3. Baseline Results (50 Concurrent Users)

_To be updated after test run_

| Metric | Value |
|--------|-------|
| p50 latency | - |
| p90 latency | - |
| p95 latency | - |
| p99 latency | - |
| Error rate | - |
| Throughput (req/s) | - |
| Total requests | - |
| Failed requests | - |

### Per-Endpoint Breakdown

| Endpoint | p50 | p95 | p99 |
|----------|-----|-----|-----|
| Login | - | - | - |
| Create Client | - | - | - |
| Create Work Entry | - | - | - |
| List Work Entries | - | - | - |
| View Report | - | - | - |

## 4. Ramp-Up Results (1 → 100 Users)

_To be updated after test run_

| Metric | Value |
|--------|-------|
| p95 latency at 25 VUs | - |
| p95 latency at 50 VUs | - |
| p95 latency at 100 VUs | - |
| Max throughput (req/s) | - |
| Error rate | - |

## 5. Breaking Point Analysis

_To be updated after test run_

| Concurrency | p95 Latency | Error Rate | Throughput |
|-------------|-------------|------------|------------|
| 50 VUs | - | - | - |
| 100 VUs | - | - | - |
| 200 VUs | - | - | - |
| 300 VUs | - | - | - |
| 400 VUs | - | - | - |
| 500 VUs | - | - | - |

**Breaking point:** _To be determined_

## 6. Bottleneck Analysis

### Identified Bottlenecks

1. **Hard-coded rate limiter (100 req/15 min)** — The Express `rate-limit` middleware was hard-coded to 100 requests per 15-minute window. Under even modest load (50 concurrent users), this causes immediate 429 Too Many Requests responses. **Fixed:** Made configurable via `RATE_LIMIT_MAX` environment variable.

2. _Additional bottlenecks to be identified during testing_

### Root Cause Analysis

_To be updated after test runs_

## 7. Recommendations

1. **Rate Limiter Configuration** — Use `RATE_LIMIT_MAX` env var for environment-specific rate limits. Production should use a sensible default (e.g., 1000/15 min); testing environments should use higher values.

2. _Additional recommendations to be added after analysis_

## 8. Before/After Comparison

_To be populated if bottleneck fixes are applied_

| Metric | Before Fix | After Fix | Improvement |
|--------|-----------|-----------|-------------|
| - | - | - | - |

---

*Generated: _To be updated_*
