# Employee Time Tracking Application

A full-stack web application for tracking and reporting employee hourly work across different clients.

## Features

- Password-based authentication with bcrypt hashing and JWT tokens
- User registration and login with account lockout protection
- Role-based access control (admin/user)
- CSRF protection via double-submit cookie pattern
- Add, edit, and delete clients
- Add, edit, and delete hourly work entries for each client
- View hourly reports for each client
- Export hourly reports to CSV or PDF

## Tech Stack

### Frontend
- **React 19** with TypeScript
- **Vite** for build tooling
- **Material UI** for components
- **React Query** for server state management
- **React Router** for navigation
- **Axios** for API calls (with CSRF token handling)

### Backend
- **Node.js** with Express
- **SQLite** file-based database (persistent)
- **JWT** for authentication (issuer/audience claims, 8h expiry)
- **bcryptjs** for password hashing (12 salt rounds)
- **csrf-csrf** for CSRF protection
- **Joi** for input validation
- **Helmet** with Content Security Policy
- **PDFKit** for PDF generation
- **csv-writer** for CSV export

## Project Structure

```
.
├── backend/
│   ├── src/
│   │   ├── database/
│   │   │   └── init.js           # Database initialization (file-based SQLite)
│   │   ├── middleware/
│   │   │   ├── auth.js           # JWT authentication (Bearer token)
│   │   │   ├── authorize.js      # Role-based access control
│   │   │   └── errorHandler.js   # Error handling (incl. CSRF errors)
│   │   ├── routes/
│   │   │   ├── auth.js           # Login, register, account lockout
│   │   │   ├── clients.js        # Client CRUD (role-aware)
│   │   │   ├── workEntries.js    # Work entry CRUD
│   │   │   └── reports.js        # Reporting & export
│   │   ├── validation/
│   │   │   └── schemas.js        # Joi validation (incl. password rules)
│   │   └── server.js             # Express server (CSRF, Helmet CSP, rate limiting)
│   ├── data/                     # SQLite database directory (gitignored)
│   ├── package.json
│   └── DEPLOYMENT.md             # Production deployment guide
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── client.ts         # API client (JWT + CSRF)
│   │   ├── components/
│   │   │   └── Layout.tsx        # Main layout
│   │   ├── contexts/
│   │   │   ├── AuthContext.tsx    # Auth state management
│   │   │   └── AuthContextValue.ts # Auth context types
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx     # Login/Register with password
│   │   │   ├── DashboardPage.tsx # Dashboard
│   │   │   ├── ClientsPage.tsx   # Client management
│   │   │   ├── WorkEntriesPage.tsx # Work entry management
│   │   │   └── ReportsPage.tsx   # Reports & exports
│   │   ├── types/
│   │   │   └── api.ts            # TypeScript interfaces
│   │   └── App.tsx               # Main app component
│   └── package.json
│
└── docker/                       # Docker configuration
```

## Getting Started

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Update `.env` with your configuration:
```bash
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-min-32-chars
CSRF_SECRET=your-csrf-secret-change-in-production
DATABASE_PATH=./data/timesheet.db
```

> **Important:** In production, `JWT_SECRET` must be at least 32 characters. The server will refuse to start without a valid secret in production mode.

5. Start the development server:
```bash
npm run dev
```

Backend will be running at `http://localhost:3001`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

Frontend will be running at `http://localhost:5173`

## Usage

1. Open `http://localhost:5173` in your browser
2. Click the "Register" tab to create a new account with email and password
3. Log in with your credentials
4. Start adding clients and tracking work hours
5. View reports and export data as CSV or PDF

### Password Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register with email & password, returns JWT token
- `POST /api/auth/login` - Login with email & password, returns JWT token
- `GET /api/auth/me` - Get current user info (requires auth)

### CSRF
- `GET /api/csrf-token` - Get CSRF token (required before POST/PUT/DELETE)

### Clients
- `GET /api/clients` - Get all clients (admin sees all, users see own)
- `POST /api/clients` - Create new client
- `GET /api/clients/:id` - Get specific client
- `PUT /api/clients/:id` - Update client
- `DELETE /api/clients/:id` - Delete client

### Work Entries
- `GET /api/work-entries` - Get all work entries (optional ?clientId filter)
- `POST /api/work-entries` - Create new work entry
- `GET /api/work-entries/:id` - Get specific work entry
- `PUT /api/work-entries/:id` - Update work entry
- `DELETE /api/work-entries/:id` - Delete work entry

### Reports
- `GET /api/reports/client/:clientId` - Get hourly report for client
- `GET /api/reports/export/csv/:clientId` - Export report as CSV
- `GET /api/reports/export/pdf/:clientId` - Export report as PDF

All authenticated endpoints require `Authorization: Bearer <token>` header.
All state-changing endpoints require `x-csrf-token` header.

## Security Features

- **Password hashing** with bcryptjs (12 salt rounds)
- **JWT authentication** with 8-hour token expiration, issuer/audience claims
- **CSRF protection** via double-submit cookie pattern (csrf-csrf)
- **Account lockout** after 5 failed login attempts (15-minute lockout)
- **Rate limiting** on auth endpoints (5 attempts per 15 minutes)
- **General rate limiting** (100 requests per 15 minutes)
- **Role-based access control** (admin/user roles)
- **Content Security Policy** via Helmet
- **CORS protection** with configured origins
- **Input validation** with Joi schemas
- **SQL injection protection** with parameterized queries
- **File-based SQLite** for persistent data storage

## User Roles

| Role | Permissions |
|------|------------|
| `user` (default) | Manage own clients and work entries |
| `admin` | Manage all clients and work entries across all users |

## Development

### Backend Development
```bash
cd backend
npm run dev  # Starts with nodemon for auto-reload
```

### Frontend Development
```bash
cd frontend
npm run dev  # Starts Vite dev server with HMR
```

### Running Tests

**Backend:**
```bash
cd backend
npm test                    # Run all tests
npm run test:coverage       # Run tests with coverage report
npm run test:watch          # Run tests in watch mode
```

### Building for Production

**Backend:**
```bash
cd backend
npm start  # Production mode
```

**Frontend:**
```bash
cd frontend
npm run build  # Creates optimized production build in dist/
npm run preview  # Preview production build
```

## Production Deployment

See `backend/DEPLOYMENT.md` for detailed production deployment instructions.

### Quick Production Checklist
- [ ] Set strong `JWT_SECRET` (32+ characters) in environment variables
- [ ] Set strong `CSRF_SECRET` in environment variables
- [ ] Configure proper `FRONTEND_URL` for CORS
- [ ] Set `NODE_ENV=production`
- [ ] Set up HTTPS/SSL certificates
- [ ] Configure proper logging and monitoring
- [ ] Set up automated database backups
- [ ] Review and adjust rate limiting settings

## Known Limitations

1. **Single-server architecture** - Not designed for horizontal scaling
2. **No real-time updates** - Changes require page refresh
3. **SQLite** - Not suitable for high-concurrency production workloads

## License

MIT

## Support

For issues or questions, please contact your system administrator.
