# Project Summary: Employee Time Tracking Application

## Project Status: COMPLETE (Security Hardened)

A full-stack web application for tracking employee hourly work across different clients, with comprehensive security features including password-based authentication, CSRF protection, role-based access control, and account lockout.

---

## Requirements Met

All original requirements plus security hardening have been implemented:

- **Password-based authentication** - bcrypt hashing (12 salt rounds) with JWT tokens
- **User registration** - Email + password with validation (8+ chars, uppercase, lowercase, number)
- **CSRF protection** - Double-submit cookie pattern via csrf-csrf
- **Role-based access control** - Admin and user roles with middleware enforcement
- **Account lockout** - 5 failed attempts triggers 15-minute lockout
- **Client management** - Full CRUD operations (Create, Read, Update, Delete)
- **Work entry management** - Track hourly work with date, hours, and descriptions
- **Reporting** - View detailed reports for each client
- **Export functionality** - Export reports to CSV and PDF formats
- **File-based SQLite** - Persistent data storage across server restarts

---

## Architecture Overview

### Frontend (React 19 + TypeScript + Material UI)
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Library**: Material UI for professional, responsive design
- **State Management**: React Query for server state, Context API for auth
- **Routing**: React Router v6 for navigation
- **HTTP Client**: Axios with JWT and CSRF token interceptors

**Key Pages:**
- Login/Register Page - Password-based authentication with tabs
- Dashboard - Overview with statistics and recent entries
- Clients Page - Manage client list with add/edit/delete
- Work Entries Page - Track time with date picker and client selection
- Reports Page - View and export client reports

### Backend (Node.js + Express)
- **Runtime**: Node.js with Express framework
- **Database**: SQLite file-based (persistent via `./data/timesheet.db`)
- **Authentication**: JWT tokens with 8-hour expiration, issuer/audience claims
- **Password Hashing**: bcryptjs with 12 salt rounds
- **CSRF**: csrf-csrf double-submit cookie pattern
- **Validation**: Joi schemas for all input including password strength
- **Security**: CORS, Helmet with CSP, Rate Limiting, Account Lockout
- **Export**: PDFKit for PDF, csv-writer for CSV

**API Structure:**
- `/api/auth/*` - Authentication endpoints (login, register, me)
- `/api/csrf-token` - CSRF token endpoint
- `/api/clients/*` - Client CRUD operations (role-aware)
- `/api/work-entries/*` - Work entry management
- `/api/reports/*` - Reporting and export

---

## Security Features

1. **Password Authentication**
   - bcryptjs hashing with 12 salt rounds
   - Password validation: min 8 chars, uppercase, lowercase, number
   - Secure password comparison

2. **JWT Configuration**
   - 8-hour token expiration
   - Issuer and audience claims for validation
   - 32+ character secret required in production
   - Bearer token in Authorization header

3. **CSRF Protection**
   - Double-submit cookie pattern (csrf-csrf)
   - Token required for all POST/PUT/DELETE requests
   - httpOnly cookie with sameSite strict

4. **Account Lockout**
   - 5 failed login attempts trigger lockout
   - 15-minute lockout duration
   - Tracked in database (failed_login_attempts, locked_until)

5. **Rate Limiting**
   - Auth endpoints: 5 attempts per 15 minutes per IP
   - General endpoints: 100 requests per 15 minutes per IP

6. **Role-Based Access Control**
   - `user` role: manage own clients and work entries
   - `admin` role: manage all clients across all users
   - Authorize middleware for role checking

7. **Input Validation & Security Headers**
   - Joi schemas validate all user input
   - SQL injection protection via parameterized queries
   - Helmet with Content Security Policy
   - CORS configuration for trusted origins

---

## Project Structure

```
.
├── backend/
│   ├── src/
│   │   ├── database/init.js          # SQLite setup (file-based)
│   │   ├── middleware/
│   │   │   ├── auth.js               # JWT authentication
│   │   │   ├── authorize.js          # Role-based access control
│   │   │   └── errorHandler.js       # Error handling (incl. CSRF)
│   │   ├── routes/
│   │   │   ├── auth.js               # Login/register/lockout
│   │   │   ├── clients.js            # Client CRUD (role-aware)
│   │   │   ├── workEntries.js        # Time tracking
│   │   │   └── reports.js            # Reports & export
│   │   ├── validation/schemas.js     # Input validation
│   │   └── server.js                 # Express app
│   ├── data/                         # SQLite database (gitignored)
│   ├── package.json
│   ├── DEPLOYMENT.md                 # Production guide
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── api/client.ts             # API client (JWT + CSRF)
│   │   ├── components/Layout.tsx      # Main layout
│   │   ├── contexts/
│   │   │   ├── AuthContext.tsx        # Auth state
│   │   │   └── AuthContextValue.ts   # Auth context types
│   │   ├── pages/                    # All page components
│   │   ├── types/api.ts              # TypeScript types
│   │   └── App.tsx                   # Root component
│   ├── package.json
│   └── .env.example
│
├── docker/                           # Docker configuration
└── README.md                         # Complete documentation
```

---

## How to Run

### Quick Start (Development)

**Terminal 1 - Backend:**
```bash
cd backend
npm install
cp .env.example .env
npm run dev
# Server runs on http://localhost:3001
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm install
npm run dev
# App runs on http://localhost:5173
```

**Access the app:**
Open http://localhost:5173, register with email and password, then log in.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | Yes (prod) | JWT signing secret (32+ chars in production) |
| `CSRF_SECRET` | Yes (prod) | CSRF token secret |
| `DATABASE_PATH` | No | SQLite database path (default: `./data/timesheet.db`) |
| `PORT` | No | Server port (default: 3001) |
| `NODE_ENV` | No | Environment (development/production) |
| `FRONTEND_URL` | No | Frontend URL for CORS (default: `http://localhost:5173`) |

---

## Testing

192 tests across 9 test suites covering:
- Database initialization and schema
- Authentication (login, register, account lockout)
- JWT middleware (token validation, expiry, issuer/audience)
- Authorization middleware (role-based access)
- Client CRUD operations
- Work entry CRUD operations
- Report generation and export
- Input validation schemas (including password rules)
- Error handling (including CSRF errors)

```bash
cd backend
npm test                    # Run all tests
npm run test:coverage       # Run tests with coverage
```

---

## User Interface Features

- **Responsive Design** - Works on desktop, tablet, and mobile
- **Material Design** - Professional, modern UI components
- **Login/Register Tabs** - Easy account creation
- **Password Validation** - Real-time feedback on password requirements
- **Error Handling** - Clear error messages for auth failures and lockouts
- **Intuitive Navigation** - Sidebar navigation with icons

---

## Known Limitations

1. **SQLite** - Not suitable for high-concurrency production workloads
2. **Single-server architecture** - Not designed for horizontal scaling
3. **No real-time updates** - Changes require page refresh

## License

MIT
