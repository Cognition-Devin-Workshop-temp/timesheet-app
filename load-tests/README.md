# k6 Load Tests for Timesheet App

## Prerequisites

- [k6](https://k6.io/) installed (`brew install k6` or `sudo apt install k6`)
- Backend running on `http://localhost:3001` (or set `BASE_URL` env var)
- **Important:** Set `RATE_LIMIT_MAX` env var to a high value (e.g., `10000000`) when starting the backend for load testing. The default rate limit (100 req/15 min) will cause all tests to fail immediately. The breaking-point test alone can generate over 1M requests.

## Test Scripts

| Script | Description | VUs | Duration |
|--------|-------------|-----|----------|
| `baseline-workflow.js` | 50 concurrent users performing full CRUD workflows | 50 | 2 min |
| `ramp-up.js` | Gradual ramp from 1 to 100 users over 5 min, hold 1 min | 1-100 | ~5.5 min |
| `breaking-point.js` | Progressive load increase to find failure threshold | 1-500 | ~10 min |

## Running Tests

```bash
# Start the backend with a high rate limit for testing
cd backend && RATE_LIMIT_MAX=10000000 node src/server.js

# In another terminal, run the tests:

# Baseline (50 concurrent users)
k6 run load-tests/baseline-workflow.js

# Ramp-up (1 to 100 users)
k6 run load-tests/ramp-up.js

# Breaking point
k6 run load-tests/breaking-point.js

# Override base URL
k6 run -e BASE_URL=http://staging:3001 load-tests/baseline-workflow.js
```

## Key Metrics

- **http_req_duration (p95):** 95th percentile response time
- **http_req_failed:** Ratio of failed HTTP requests
- **error_rate:** Business-logic error rate (custom)
- **Per-endpoint trends:** `login_duration`, `create_client_duration`, `create_entry_duration`, `list_entries_duration`, `report_duration`

## Thresholds

| Test | p95 Latency | Error Rate |
|------|-------------|------------|
| Baseline | < 2 s | < 5 % |
| Ramp-up | < 3 s | < 10 % |
| Breaking-point | n/a | Aborts at > 30 % |
