# Employee Time Tracking Application — Requirements Specification

## REQ-001: User Authentication
The system shall provide email-based authentication using JWT tokens.
- Users log in with email only (no password required)
- JWT tokens expire after 24 hours
- All API endpoints except login require valid authentication
- Assumes trusted internal network

## REQ-002: Client Management
Users shall be able to create, read, update, and delete client records.
- Each client has: name, department, email
- Client names must be unique per user
- Deleting a client cascades to delete all associated work entries
- Users can only see their own clients

## REQ-003: Work Entry Management
Users shall be able to log hourly work entries against clients.
- Each work entry has: client, date, hours, description
- Hours must be between 0.25 and 24
- Date must not be in the future
- Description is required and limited to 500 characters
- Users can only see their own work entries

## REQ-004: Dashboard
The system shall display a dashboard with summary statistics.
- Total hours worked (all time)
- Total number of work entries
- Number of active clients
- Data updates in real-time when entries change

## REQ-005: Reporting & Export
Users shall be able to generate and export client-specific reports.
- View hourly report for each client
- Export report as CSV with columns: Date, Hours, Description
- Export report as PDF with formatted table
- Reports show all entries for the selected client

## REQ-006: Data Isolation
All user data must be isolated per user.
- Users cannot see or modify other users' data
- Data filtering happens at the SQL query level using user_email
- No admin role or cross-user access is provided

## REQ-007: API Design
- All endpoints prefixed with /api
- JSON request/response format
- Joi validation on all input
- Rate limiting: 100 requests per 15 minutes per IP
- Helmet security headers enabled
