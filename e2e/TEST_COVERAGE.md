# E2E Test Coverage Document

**Application:** Timesheet App (React + Node.js/Express)  
**Test Framework:** Playwright (Chromium)  
**Test Runner:** `npx playwright test --reporter=list`  
**Total Tests:** 31  
**Status:** All Passing  
**Last Run:** June 2026 — 1.5m total execution time  

---

## Test Execution Summary

| Test Suite         | File                         | Tests | Passed | Failed |
|--------------------|------------------------------|-------|--------|--------|
| Login Flow         | `login.spec.ts`              | 3     | 3      | 0      |
| Client CRUD        | `clients.spec.ts`            | 3     | 3      | 0      |
| Work Entries CRUD  | `work-entries.spec.ts`       | 3     | 3      | 0      |
| Reports            | `reports.spec.ts`            | 1     | 1      | 0      |
| Edge Cases         | `edge-cases.spec.ts`         | 6     | 6      | 0      |
| CSV & PDF Export   | `exports.spec.ts`            | 2     | 2      | 0      |
| PDF Layout         | `pdf-layout.spec.ts`         | 1     | 1      | 0      |
| Multi-User         | `multi-user.spec.ts`         | 5     | 5      | 0      |
| Sessions           | `sessions.spec.ts`           | 7     | 7      | 0      |
| **Total**          |                              | **31**| **31** | **0**  |

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

### 6. CSV & PDF Export (`exports.spec.ts`)

| # | Test Name | What It Covers | Pages | API Endpoints | Assertions |
|---|-----------|---------------|-------|---------------|------------|
| 17 | Download CSV and validate content | CSV file download via UI + content validation via API | `/reports` | `GET /api/reports/export/csv/:clientId` | - "Export as CSV" button triggers download<br>- Filename contains `.csv`<br>- CSV header contains Date, Hours, Description<br>- 3+ lines (header + 2 data rows)<br>- Data rows contain hours (3, 5) and descriptions ("Design review", "Implementation") |
| 18 | Download PDF and validate content | PDF file download via UI + parsed text validation | `/reports` | `GET /api/reports/export/pdf/:clientId` | - "Export as PDF" button triggers download<br>- Filename contains `.pdf`<br>- PDF starts with `%PDF-` magic bytes<br>- File size > 500 bytes<br>- PDF ends with `%%EOF` marker<br>- Parsed text contains client name, "Total Hours", "8.00", entry descriptions |

**Frontend components covered:** `ReportsPage.tsx` (export icon buttons, blob download logic)  
**Backend routes covered:** `GET /api/reports/export/csv/:clientId`, `GET /api/reports/export/pdf/:clientId`  
**Validation approach:** UI download event (filename, trigger) + direct API call (content validation)  
**Dependencies:** `pdf-parse` (dev) for PDF text extraction  
**Prerequisite:** Each test creates 1 client + 2 work entries (3h "Design review" + 5h "Implementation")

---

### 7. PDF Layout Validation (`pdf-layout.spec.ts`)

| # | Test Name | What It Covers | Pages | API Endpoints | Assertions |
|---|-----------|---------------|-------|---------------|------------|
| 19 | Correct layout, content, metadata, and headers | Full PDF structure validation via parsed text | `/work-entries`, `/clients` | `GET /api/reports/export/pdf/:clientId` | - Title: "Time Report for" + client name<br>- Total Hours: 7.50 (2+4+1.5)<br>- Total Entries: 3<br>- Table headers: Date, Hours, Description<br>- All 3 entry descriptions present<br>- "Generated:" timestamp present<br>- PDFKit Creator/Producer metadata<br>- Exactly 1 page<br>- `Content-Type: application/pdf`<br>- `Content-Disposition: attachment; *.pdf` |

**Backend routes covered:** `GET /api/reports/export/pdf/:clientId`  
**Validation approach:** `fetchAndParsePdf()` helper with retry (3 attempts, increasing backoff) to handle transient PDF stream corruption under concurrent load  
**Prerequisite:** 1 client + 3 work entries (2h "Morning standup", 4h "Feature development", 1.5h "Code review")

---

### 8. Multi-User Data Isolation (`multi-user.spec.ts`)

| # | Test Name | What It Covers | Pages | API Endpoints | Assertions |
|---|-----------|---------------|-------|---------------|------------|
| 20 | User A clients not visible to User B | UI-level client isolation via login/logout | `/clients`, `/login` | `GET /api/clients` | - User A creates client → visible<br>- Logout + login as B → client hidden |
| 21 | User B clients not visible to User A | Reverse direction isolation | `/clients`, `/login` | `GET /api/clients` | - User B creates client → visible<br>- Switch to User A → client hidden |
| 22 | Work entries isolated per user (API) | API-level work entry isolation | — | `POST /api/clients`, `POST /api/work-entries`, `GET /api/clients`, `GET /api/work-entries` | - User A creates client+entry<br>- User B sees 0 matching clients/entries |
| 23 | Reports only show authenticated user's data | Report endpoint returns 404 for other user's client | — | `POST /api/clients`, `POST /api/work-entries`, `GET /api/reports/client/:id` | - User A report: totalHours=10<br>- User B: 404 for User A's client |
| 24 | Cannot delete another user's client | Cross-user deletion blocked | — | `POST /api/clients`, `DELETE /api/clients/:id`, `GET /api/clients/:id` | - User B DELETE → 404<br>- User A GET → 200 (still exists) |

**Security coverage:** Verifies `WHERE user_email = ?` clause in all SQL queries  
**Auth mechanism tested:** `x-user-email` header-based per-user isolation

---

### 9. Multiple Sessions (`sessions.spec.ts`)

| # | Test Name | What It Covers | Pages | API Endpoints | Assertions |
|---|-----------|---------------|-------|---------------|------------|
| 25 | Session persists after page reload | localStorage-based session persistence | `/login` → `/dashboard` | `POST /api/auth/login`, `GET /api/auth/me` | - Login, reload → still on dashboard<br>- Email still visible in app bar |
| 26 | Session persists across navigation | Session maintained through page navigation | `/clients`, `/work-entries`, `/reports`, `/dashboard` | — | - Navigate all 4 pages → email visible on each |
| 27 | Logout clears session and redirects | Logout flow via Logout button | `/dashboard` → `/login` | — | - Click Logout → redirected to /login<br>- "Time Tracker" heading visible<br>- Email input visible |
| 28 | Protected pages redirect after logout | Auth guard on protected routes | `/clients` | — | - After logout, navigate to /clients<br>- Redirected to /login |
| 29 | Re-login after logout | Sequential login as different users | `/login` → `/dashboard` | `POST /api/auth/login` | - Login as user1 → logout → login as user2<br>- user2 email visible, user1 hidden |
| 30 | Data context after user switching | Full user switch preserves isolation | `/clients`, `/login` | `POST /api/clients`, `GET /api/clients` | - User1 creates client → switch to User2<br>- User2 sees own client, not User1's<br>- Switch back → User1 sees own client |
| 31 | Concurrent browser contexts | Parallel sessions in isolated contexts | `/clients`, `/login` | `POST /api/clients`, `GET /api/clients` | - Two browser contexts with different users<br>- Each creates a client<br>- Neither sees the other's client |

**Frontend components covered:** `AuthContext.tsx` (login/logout/localStorage), `Layout.tsx` (Logout button, email display)  
**Browser features tested:** localStorage persistence, page reload, browser context isolation

---

## Page Coverage Matrix

| Page               | Component File              | Covered By                                  |
|--------------------|-----------------------------|---------------------------------------------|
| Login              | `LoginPage.tsx`             | `login.spec.ts` (3), `multi-user.spec.ts` (2), `sessions.spec.ts` (7) |
| Dashboard          | `DashboardPage.tsx`         | Visited via login redirect (all suites)      |
| Clients            | `ClientsPage.tsx`           | `clients.spec.ts` (3), `edge-cases.spec.ts` (3), `multi-user.spec.ts` (3), `sessions.spec.ts` (2) |
| Work Entries       | `WorkEntriesPage.tsx`       | `work-entries.spec.ts` (3), `edge-cases.spec.ts` (3), `pdf-layout.spec.ts` (1) |
| Reports            | `ReportsPage.tsx`           | `reports.spec.ts` (1), `exports.spec.ts` (2) |
| Layout / Nav       | `Layout.tsx`                | Navigation used in all suites, `sessions.spec.ts` (logout) |

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
| `GET`    | `/api/reports/export/csv/:id`     | `exports.spec.ts`                 | Content headers, data rows, hours, descriptions |
| `GET`    | `/api/reports/export/pdf/:id`     | `exports.spec.ts`, `pdf-layout.spec.ts`  | Magic bytes, text, layout, metadata, headers |

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
| MUI Tooltip/IconButton | "Export as CSV" and "Export as PDF" download buttons  |
| Navigation          | Sidebar menu items, AppBar with user email           |
| Browser dialog      | `window.confirm()` for delete operations             |
| File downloads      | Browser download events for CSV and PDF files         |

---

## Shared Test Helpers (`helpers.ts`)

| Helper Function     | Description                                          | Used By |
|---------------------|------------------------------------------------------|---------|
| `login(page, email)` | Navigates to `/login`, fills email, submits, waits for `/dashboard` | All test suites (beforeEach) |
| `createClient(page, name, opts)` | Creates a client via UI with optional department/email/description | Most test suites including `multi-user.spec.ts`, `sessions.spec.ts`, `pdf-layout.spec.ts` |
| `selectClient(page, clientName)` | Opens MUI combobox in dialog and selects a client by name | `work-entries.spec.ts`, `reports.spec.ts`, `edge-cases.spec.ts`, `exports.spec.ts`, `pdf-layout.spec.ts` |
| `uniqueName(prefix)` | Generates unique names with timestamp + random suffix | All test suites |
| `fetchAndParsePdf(page, url, email)` | Fetches PDF via API with retry (3 attempts, backoff) and parses with pdf-parse | `exports.spec.ts`, `pdf-layout.spec.ts` |
| `deleteAllClients(page)` | Bulk delete utility (available but not actively used) | — |

---

## Known Gaps / Not Covered

| Area                              | Reason                                                |
|-----------------------------------|-------------------------------------------------------|

| Dashboard page content            | Page is visited (login redirect) but no specific widget assertions |

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
