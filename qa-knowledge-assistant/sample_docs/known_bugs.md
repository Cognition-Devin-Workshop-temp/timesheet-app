# Known Bugs and Issues

## BUG-001: CSV export fails for clients with special characters in name
- **Severity**: Medium
- **Status**: Open
- **Description**: When a client name contains commas or quotes, the CSV export produces malformed output. The csv-writer library does not properly escape these characters.
- **Steps to Reproduce**: Create client with name `"Acme, Inc."`, add work entries, export CSV
- **Expected**: Properly escaped CSV
- **Actual**: Broken CSV with misaligned columns
- **Workaround**: Avoid special characters in client names

## BUG-002: PDF export creates temporary files that are not cleaned up
- **Severity**: Low
- **Status**: Open
- **Description**: The PDF generation route creates temporary files in the OS temp directory but does not reliably clean them up on error paths.
- **Affected Code**: backend/src/routes/reports.js

## BUG-003: Rate limiter does not reset on successful auth
- **Severity**: Low
- **Status**: Wontfix
- **Description**: The rate limiter counts all requests including successful logins. A user who logs in frequently during development can hit the rate limit.

## BUG-004: In-memory database loses all data on server restart
- **Severity**: Info
- **Status**: By Design
- **Description**: SQLite in-memory database is used as per requirements. All data is lost when the backend server restarts. This is documented behavior for the development environment.
