# Time Tracking API Documentation

## Base URL
`http://localhost:3001/api`

## Authentication
All endpoints (except POST /auth/login) require:
```
Authorization: Bearer <jwt_token>
```

### POST /auth/login
Login with email address.
- Request: `{ "email": "user@example.com" }`
- Response: `{ "token": "jwt...", "user": { "email": "user@example.com" } }`
- Validation: Email must be valid format

### GET /auth/me
Get current user info.
- Response: `{ "email": "user@example.com" }`
- Requires: Authentication

## Clients

### GET /clients
List all clients for authenticated user.
- Response: Array of client objects
- Filterable by user_email (automatic)

### POST /clients
Create a new client.
- Request: `{ "name": "Acme Corp", "department": "Engineering", "email": "contact@acme.com" }`
- Validation: name (required, 1-100 chars), department (required), email (required, valid format)
- Response: Created client object with id

### GET /clients/:id
Get specific client by ID.
- Response: Client object
- Returns 404 if not found or belongs to different user

### PUT /clients/:id
Update a client.
- Request: Partial client object
- Validation: Same as POST but all fields optional

### DELETE /clients/:id
Delete a client and all associated work entries (cascade).
- Response: `{ "message": "Client deleted successfully" }`
- Returns 404 if not found

## Work Entries

### GET /work-entries
List all work entries. Optional query param: `?clientId=<id>`
- Response: Array of work entry objects with client info

### POST /work-entries
Create a new work entry.
- Request: `{ "client_id": 1, "date": "2025-01-15", "hours": 8, "description": "Feature development" }`
- Validation: client_id (required), date (required, not future), hours (0.25-24), description (required, max 500 chars)

### PUT /work-entries/:id
Update a work entry.
- Request: Partial work entry object

### DELETE /work-entries/:id
Delete a work entry.
- Response: `{ "message": "Work entry deleted successfully" }`

## Reports

### GET /reports/client/:clientId
Get hourly report for a specific client.
- Response: Array of work entries with totals

### GET /reports/export/csv/:clientId
Export client report as CSV file.
- Response: CSV file download (text/csv)
- Columns: Date, Hours, Description

### GET /reports/export/pdf/:clientId
Export client report as PDF file.
- Response: PDF file download (application/pdf)
- Contains formatted table with company branding
