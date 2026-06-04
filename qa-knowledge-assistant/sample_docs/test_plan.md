# Time Tracking Application — Test Plan

## TC-001: Login with valid email
- **Type**: Positive
- **Steps**: POST /auth/login with valid email
- **Expected**: 200 OK, JWT token returned

## TC-002: Login with invalid email format
- **Type**: Negative
- **Steps**: POST /auth/login with "not-an-email"
- **Expected**: 400 Bad Request, validation error

## TC-003: Access protected endpoint without token
- **Type**: Negative
- **Steps**: GET /clients without Authorization header
- **Expected**: 401 Unauthorized

## TC-004: Create client with all required fields
- **Type**: Positive
- **Steps**: POST /clients with name, department, email
- **Expected**: 201 Created, client object returned

## TC-005: Create client with missing name
- **Type**: Negative
- **Steps**: POST /clients with only department and email
- **Expected**: 400 Bad Request, validation error for name

## TC-006: Delete client cascades to work entries
- **Type**: Integration
- **Steps**: Create client, add work entries, delete client, verify entries gone
- **Expected**: Client and all associated work entries deleted

## TC-007: Create work entry with valid data
- **Type**: Positive
- **Steps**: POST /work-entries with valid client_id, date, hours, description
- **Expected**: 201 Created, work entry object returned

## TC-008: Create work entry with future date
- **Type**: Negative
- **Steps**: POST /work-entries with date = tomorrow
- **Expected**: 400 Bad Request, validation error

## TC-009: Export CSV report
- **Type**: Positive
- **Steps**: GET /reports/export/csv/:clientId for client with entries
- **Expected**: 200 OK, CSV file with correct headers and data

## TC-010: Dashboard shows correct statistics
- **Type**: Integration
- **Steps**: Add multiple clients and entries, verify dashboard counters
- **Expected**: Total hours, entries, and clients match actual data
