# E2E Test Coverage Document

**Application:** Timesheet App (React + Node.js/Express)  
**Test Framework:** Playwright (Chromium)  
**Test Runner:** `npx playwright test --reporter=list`  
**Total Tests:** 16  
**Status:** All Passing  
**Last Run:** June 2026 — 42.6s total execution time  

---

## Test Execution Summary

| Test Suite         | File                         | Tests | Passed | Failed |
|--------------------|------------------------------|-------|--------|--------|
| Login Flow         | `login.spec.ts`              | 3     | 3      | 0      |
| Client CRUD        | `clients.spec.ts`            | 3     | 3      | 0      |
| Work Entries CRUD  | `work-entries.spec.ts`       | 3     | 3      | 0      |
| Reports            | `reports.spec.ts`            | 1     | 1      | 0      |
| Edge Cases         | `edge-cases.spec.ts`         | 6     | 6      | 0      |
| **Total**          |                              | **16**| **16** | **0**  |

---

## Recording & Artifacts

All tests generate the following artifacts in `e2e/test-results/`:

| Artifact     | Config Setting      | Description                              |
|-------------|---------------------|------------------------------------------|
| Video       | `video: 'on'`       | Full screen recording (`.webm`) per test |
| Screenshot  | `screenshot: 'on'`  | Capture on test completion               |
| Trace       | `trace: 'on'`       | Playwright trace (`.zip`) for debugging  |

HTML report: `npx playwright show-report` (generated in `e2e/playwright-report/`)

---

## Detailed Test Coverage

### 1. Login Flow (`login.spec.ts`)

| # | Test Name | What It Covers | Pages | API Endpoints | Assertions |
|---|-----------|---------------|-------|---------------|------------|
| 1 | Valid login and redirect to dashboard | Successful email-based passwordless login | `/login` → `/dashboard` | `POST /api/auth/login` | - "Time Tracker" heading visible<br>- "Enter your email to log in" subtitle visible<br>- Email input accepts valid email<br>- Redirects to `/dashboard`<br>- User email displayed in app bar |
| 2 | Invalid email format shows error | Backend validation rejects malformed email | `/login` | `POST /api/auth/login` | - Error alert visible with "failed/error/invalid" text |
| 3 | Empty email disables Log In button | Frontend disables submit when email is empty | `/login` | — | - "Log In" button is disabled |

**Frontend components covered:** `LoginPage.tsx`, `AuthContext.tsx`  
**Backend routes covered:** `POST /api/auth/login`, `GET /api/auth/me`  
**Middleware covered:** `auth.js` (email validation)

---

### 2. Client CRUD (`clients.spec.ts`)

| # | Test Name | What It Covers | Pages | API Endpoints | Assertions |
|---|-----------|---------------|-------|---------------|------------|
| 4 | Create a new client | Full create flow via MUI dialog | `/clients` | `POST /api/clients` | - "Add Client" button opens dialog<br>- "Add New Client" dialog title visible<br>- Form fields (name, department, description) fillable<br>- Dialog closes on success<br>- New client row visible in table<br>- Department text visible in row |
| 5 | Edit an existing client | Update client name via edit dialog | `/clients` | `PUT /api/clients/:id` | - Edit icon button opens dialog<br>- "Edit Client" dialog title visible<br>- Name field updated<br>- "Update" button submits<br>- Dialog closes<br>- Updated name visible<br>- Old name hidden |
| 6 | Delete a client | Remove client via delete button + confirm | `/clients` | `DELETE /api/clients/:id` | - Delete icon button triggers `window.confirm()`<br>- Client name removed from list |

**Frontend components covered:** `ClientsPage.tsx` (table, dialog, form, CRUD buttons)  
**Backend routes covered:** `GET /api/clients`, `POST /api/clients`, `PUT /api/clients/:id`, `DELETE /api/clients/:id`  
**Validation covered:** `clientSchema` (Joi — name required), `updateClientSchema`

---

### 3. Work Entries CRUD (`work-entries.spec.ts`)

| # | Test Name | What It Covers | Pages | API Endpoints | Assertions |
|---|-----------|---------------|-------|---------------|------------|
| 7 | Create a work entry | Full create flow with MUI Select + number input | `/work-entries` | `POST /api/work-entries` | - "Add Work Entry" button opens dialog<br>- MUI Select (combobox) selects client<br>- Hours number input filled<br>- Description text area filled<br>- Dialog closes on success<br>- Client name and "4 hours" visible in row |
| 8 | Edit a work entry | Update hours via edit dialog | `/work-entries` | `PUT /api/work-entries/:id` | - Edit icon opens dialog<br>- "Edit Work Entry" title visible<br>- Hours changed from 3 → 6<br>- Dialog closes<br>- "6 hours" visible in row |
| 9 | Delete a work entry | Remove entry via delete + confirm | `/work-entries` | `DELETE /api/work-entries/:id` | - Delete button triggers confirm<br>- Description text removed from list |

**Frontend components covered:** `WorkEntriesPage.tsx` (table, dialog, MUI Select, DatePicker, number input)  
**Backend routes covered:** `GET /api/work-entries`, `POST /api/work-entries`, `PUT /api/work-entries/:id`, `DELETE /api/work-entries/:id`  
**Validation covered:** `workEntrySchema` (Joi — clientId required, hours 0–24)  
**Prerequisite:** Each test creates a fresh client in `beforeEach`

---

### 4. Reports (`reports.spec.ts`)

| # | Test Name | What It Covers | Pages | API Endpoints | Assertions |
|---|-----------|---------------|-------|---------------|------------|
| 10 | Show correct report for a client | Report data accuracy with aggregation | `/reports` | `GET /api/reports/client/:id` | - Client selectable from combobox<br>- "Total Hours" card shows 8.00 (3+5)<br>- "Total Entries" card shows 2<br>- Individual entries (3h, 5h) in table |

**Frontend components covered:** `ReportsPage.tsx` (MUI Select, metric cards, data table)  
**Backend routes covered:** `GET /api/reports/client/:clientId`  
**Prerequisite:** Creates 1 client + 2 work entries (3h, 5h) in `beforeEach`  
**Data integrity verified:** Sum calculation, entry count, individual entry display

---

### 5. Edge Cases (`edge-cases.spec.ts`)

| # | Test Name | What It Covers | Pages | API Endpoints | Assertions |
|---|-----------|---------------|-------|---------------|------------|
| 11 | Empty client name prevented | HTML5 `required` attribute validation | `/clients` | — | - Dialog stays open after clicking Create<br>- "Add New Client" still visible (form not submitted) |
| 12 | Special characters in client name | XSS-safe rendering of `O'Brien & Associates <test>` | `/clients` | `POST /api/clients` | - Client created successfully<br>- Special characters rendered correctly in table |
| 13 | Very long client name (>255 chars) rejected | Backend Joi validation (max 255) | `/clients` | `POST /api/clients` → 400 | - Waits for HTTP 400 response<br>- Dialog stays open (creation failed)<br>- "Add New Client" still visible |
| 14 | Work entry with 0 hours rejected | Hours validation (must be positive) | `/work-entries` | `POST /api/work-entries` | - Error message or dialog stays open |
| 15 | Work entry with negative hours rejected | Hours validation (must be positive) | `/work-entries` | `POST /api/work-entries` | - Error message or dialog stays open |
| 16 | Work entry with >24 hours rejected | Hours validation (max 24) | `/work-entries` | `POST /api/work-entries` | - Error message or dialog stays open |

**Frontend components covered:** `ClientsPage.tsx` (form validation), `WorkEntriesPage.tsx` (hours validation)  
**Backend validation covered:** `clientSchema` (name max 255), `workEntrySchema` (hours > 0, hours ≤ 24)  
**Security covered:** XSS prevention (special characters rendered safely)

---

## Page Coverage Matrix

| Page               | Component File              | Covered By                                  |
|--------------------|-----------------------------|---------------------------------------------|
| Login              | `LoginPage.tsx`             | `login.spec.ts` (3 tests)                   |
| Dashboard          | `DashboardPage.tsx`         | Visited via login redirect (all suites)      |
| Clients            | `ClientsPage.tsx`           | `clients.spec.ts` (3) + `edge-cases.spec.ts` (3) |
| Work Entries       | `WorkEntriesPage.tsx`       | `work-entries.spec.ts` (3) + `edge-cases.spec.ts` (3) |
| Reports            | `ReportsPage.tsx`           | `reports.spec.ts` (1)                        |
| Layout / Nav       | `Layout.tsx`                | Navigation used in all test suites           |

---

## API Endpoint Coverage

| Method   | Endpoint                          | Covered By                        | Validation Tested |
|----------|-----------------------------------|-----------------------------------|--------------------|
| `POST`   | `/api/auth/login`                 | `login.spec.ts`                   | Valid email, invalid email |
| `GET`    | `/api/auth/me`                    | Implicit (session persistence)    | — |
| `GET`    | `/api/clients`                    | `clients.spec.ts`, `work-entries.spec.ts`, `reports.spec.ts` | — |
| `POST`   | `/api/clients`                    | `clients.spec.ts`, `edge-cases.spec.ts` | Name required, max 255 chars, special chars |
| `PUT`    | `/api/clients/:id`                | `clients.spec.ts`                 | Name update |
| `DELETE` | `/api/clients/:id`                | `clients.spec.ts`                 | Confirm dialog |
| `GET`    | `/api/work-entries`               | `work-entries.spec.ts`            | — |
| `POST`   | `/api/work-entries`               | `work-entries.spec.ts`, `edge-cases.spec.ts` | Hours 0, negative, >24 |
| `PUT`    | `/api/work-entries/:id`           | `work-entries.spec.ts`            | Hours update |
| `DELETE` | `/api/work-entries/:id`           | `work-entries.spec.ts`            | Confirm dialog |
| `GET`    | `/api/reports/client/:clientId`   | `reports.spec.ts`                 | Aggregation accuracy |
| `GET`    | `/api/reports/export/csv/:id`     | Not covered                       | — |
| `GET`    | `/api/reports/export/pdf/:id`     | Not covered                       | — |

---

## UI Component Coverage

| Component Type       | Specific Elements Tested                           |
|---------------------|----------------------------------------------------|
| MUI TextField       | Email input, Client Name, Department, Email, Description, Hours |
| MUI Button          | Log In, Add Client, Add Work Entry, Create, Update, Cancel |
| MUI Dialog          | Add/Edit Client, Add/Edit Work Entry                |
| MUI Select (combobox) | Client selection in Work Entries and Reports       |
| MUI Table           | Client list, Work Entries list, Report entries       |
| MUI Alert           | Login error, validation errors                       |
| MUI DatePicker      | Date field in Work Entries (default value used)      |
| MUI IconButton      | Edit (EditIcon), Delete (DeleteIcon) per row         |
| MUI Chip            | Hours display (e.g., "4 hours")                      |
| MUI Card            | Report metric cards (Total Hours, Total Entries)     |
| Navigation          | Sidebar menu items, AppBar with user email           |
| Browser dialog      | `window.confirm()` for delete operations             |

---

## Shared Test Helpers (`helpers.ts`)

| Helper Function     | Description                                          | Used By |
|---------------------|------------------------------------------------------|---------|
| `login(page, email)` | Navigates to `/login`, fills email, submits, waits for `/dashboard` | All test suites (beforeEach) |
| `createClient(page, name, opts)` | Creates a client via UI with optional department/email/description | `work-entries.spec.ts`, `reports.spec.ts`, `edge-cases.spec.ts` |
| `selectClient(page, clientName)` | Opens MUI combobox in dialog and selects a client by name | `work-entries.spec.ts`, `reports.spec.ts`, `edge-cases.spec.ts` |
| `uniqueName(prefix)` | Generates unique names with timestamp + random suffix | All test suites |
| `deleteAllClients(page)` | Bulk delete utility (available but not actively used) | — |

---

## Known Gaps / Not Covered

| Area                              | Reason                                                |
|-----------------------------------|-------------------------------------------------------|
| CSV/PDF export endpoints          | Requires file download validation; browser blob handling |
| Dashboard page content            | Page is visited (login redirect) but no specific widget assertions |
| Multiple user isolation           | All tests use single user `test@example.com`          |
| Concurrent session testing        | Single-browser, sequential execution                  |
| Mobile/responsive layout          | Tests run in default Chromium viewport only            |
| Accessibility (a11y) audit        | No axe or similar audit integrated                    |
| Performance/load testing          | Out of scope for e2e functional tests                 |

---

## Prerequisites to Run Tests

```bash
# 1. Start backend with elevated rate limit
cd backend && RATE_LIMIT_MAX=10000 npm run dev

# 2. Start frontend
cd frontend && npm run dev

# 3. Run e2e tests
cd e2e && npx playwright test --reporter=list

# 4. View HTML report
cd e2e && npx playwright show-report
```

---

## Bug Fixes Applied

| File | Change | Reason |
|------|--------|--------|
| `backend/src/server.js` (line 28) | `max: parseInt(process.env.RATE_LIMIT_MAX, 10) \|\| 100` | Rate limiter was hardcoded to 100 requests/15min, causing test failures. Now configurable via env var. |
