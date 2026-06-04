# Employee Time Tracking Application

A full-stack web application for tracking and reporting employee hourly work across different clients.

## ⚠️ Important Notes

### Data Persistence
**This application uses SQLite in-memory database as specified in requirements.**
- ⚠️ **All data is lost when the backend server restarts**
- Suitable for development and testing
- For production use, modify `backend/src/database/init.js` to use file-based SQLite instead of `:memory:`

### Authentication
- Email-only authentication with JWT tokens
- No password required - assumes trusted internal network
- Anyone with a valid email can create an account and log in
- Consider integrating with company SSO for production use

## Features

- ✅ User authentication (email-based with JWT tokens)
- ✅ Add, edit, and delete clients
- ✅ Add, edit, and delete hourly work entries for each client
- ✅ View hourly reports for each client
- ✅ Export hourly reports to CSV or PDF

## Tech Stack

### Frontend
- **React** with TypeScript
- **Vite** for build tooling
- **Material UI** for components
- **React Query** for server state management
- **React Router** for navigation
- **Axios** for API calls

### Backend
- **Node.js** with Express
- **SQLite** in-memory database
- **JWT** for authentication
- **Joi** for validation
- **PDFKit** for PDF generation
- **csv-writer** for CSV export

## Project Structure

```
.
├── .github/
│   └── workflows/
│       └── ci.yml                # CI/CD pipeline (lint, test, build, Docker)
├── backend/
│   ├── src/
│   │   ├── __tests__/            # Jest test suites (161 tests)
│   │   ├── database/
│   │   │   └── init.js           # Database initialization
│   │   ├── middleware/
│   │   │   ├── auth.js           # JWT authentication
│   │   │   └── errorHandler.js   # Error handling
│   │   ├── routes/
│   │   │   ├── auth.js           # Authentication endpoints
│   │   │   ├── clients.js        # Client CRUD
│   │   │   ├── workEntries.js    # Work entry CRUD
│   │   │   └── reports.js        # Reporting & export
│   │   ├── validation/
│   │   │   └── schemas.js        # Joi validation schemas
│   │   └── server.js             # Express server
│   ├── eslint.config.mjs         # ESLint config (Node/CommonJS + Jest)
│   ├── package.json
│   └── DEPLOYMENT.md             # Production deployment guide
│
├── docker/
│   ├── Dockerfile                # Multi-stage production Docker build
│   └── overrides/                # Production file overrides
│
└── frontend/
    ├── src/
    │   ├── api/
    │   │   └── client.ts         # API client with JWT
    │   ├── components/
    │   │   └── Layout.tsx        # Main layout
    │   ├── contexts/
    │   │   └── AuthContext.tsx    # Auth state management
    │   ├── pages/
    │   │   ├── LoginPage.tsx     # Login page
    │   │   ├── DashboardPage.tsx # Dashboard
    │   │   ├── ClientsPage.tsx   # Client management
    │   │   ├── WorkEntriesPage.tsx # Work entry management
    │   │   └── ReportsPage.tsx   # Reports & exports
    │   ├── types/
    │   │   └── api.ts            # TypeScript interfaces
    │   └── App.tsx               # Main app component
    ├── eslint.config.js          # ESLint config (React/TypeScript)
    └── package.json
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
JWT_SECRET=your-secure-secret-key-change-this
```

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

3. Create environment file:
```bash
cp .env.example .env
```

4. Update `.env`:
```bash
VITE_API_URL=http://localhost:3001
```

5. Start the development server:
```bash
npm run dev
```

Frontend will be running at `http://localhost:5173`

## Usage

1. Open `http://localhost:5173` in your browser
2. Enter any email address to log in (no password required)
3. Start adding clients and tracking work hours
4. View reports and export data as CSV or PDF

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with email, returns JWT token
- `GET /api/auth/me` - Get current user info (requires auth)

### Clients
- `GET /api/clients` - Get all clients
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

## Security Features

- JWT-based authentication with 24-hour token expiration
- Rate limiting on authentication endpoints (5 attempts per 15 minutes)
- CORS protection
- Helmet security headers
- Input validation with Joi schemas
- SQL injection protection with parameterized queries

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

### Test Coverage

The backend has comprehensive test coverage with **161 tests** across 8 test suites:

| File | Statements | Branches | Functions | Lines |
|------|------------|----------|-----------|-------|
| **Overall** | **90.16%** | **93.82%** | **92.18%** | **90.35%** |
| database/init.js | 100% | 100% | 100% | 100% |
| middleware/auth.js | 100% | 100% | 100% | 100% |
| middleware/errorHandler.js | 100% | 100% | 100% | 100% |
| routes/auth.js | 100% | 100% | 100% | 100% |
| routes/clients.js | 97.89% | 100% | 100% | 97.89% |
| routes/workEntries.js | 98.41% | 100% | 100% | 98.41% |
| routes/reports.js | 64.15% | 69.44% | 68.75% | 64.42% |
| validation/schemas.js | 100% | 100% | 100% | 100% |

Coverage thresholds are configured in `jest.config.js`:
- Statements: 60%
- Branches: 60%
- Functions: 65%
- Lines: 60%

## CI/CD Pipeline

The project includes a GitHub Actions CI/CD pipeline (`.github/workflows/ci.yml`) that runs on every pull request to `main` and on pushes to `main`.

### Pipeline Overview

| Job | Node Versions | Steps |
|-----|---------------|-------|
| **Backend** | 18, 20 | Install → Lint (ESLint) → Test w/ coverage → Build check → Security audit → Upload coverage artifact |
| **Frontend** | 18, 20 | Install → Lint (ESLint) → Build production bundle → Security audit |
| **Docker** | — | Build & push Docker image to GHCR (runs after backend + frontend pass) |

### Triggers

- **Pull requests** to `main` — runs all jobs; Docker image is built but **not** pushed
- **Push** to `main` — runs all jobs; Docker image is built **and pushed** to GitHub Container Registry

### Matrix Strategy

Both backend and frontend jobs run on **Node 18** and **Node 20** to ensure compatibility across supported versions.

### Docker Build & Push

- Uses the existing multi-stage `docker/Dockerfile`
- Pushes to `ghcr.io/<owner>/timesheet-app` on merge to `main`
- Image tags: commit SHA, branch name, PR number
- Docker layer caching via GitHub Actions cache

### Test Coverage Artifact

Backend test coverage reports are uploaded as a build artifact (`backend-coverage`) on the Node 20 run, retained for 14 days. Download from the workflow run's **Artifacts** section in the GitHub Actions UI.

### Linting

- **Backend**: ESLint with `@eslint/js` recommended rules, configured for Node.js/CommonJS with Jest test globals (`eslint.config.mjs`)
- **Frontend**: ESLint with TypeScript and React plugins (`eslint.config.js`)

Run linting locally:
```bash
cd backend && npm run lint
cd frontend && npm run lint
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
- [ ] Set strong `JWT_SECRET` in environment variables
- [ ] Configure proper `FRONTEND_URL` for CORS
- [ ] Consider switching to file-based SQLite for data persistence
- [ ] Set up HTTPS/SSL certificates
- [ ] Configure proper logging and monitoring
- [ ] Set up automated backups (if using persistent storage)
- [ ] Review and adjust rate limiting settings
- [ ] Consider integrating with company SSO

## Known Limitations

1. **In-memory database** - All data is lost on server restart
2. **Email-only auth** - No password protection, assumes trusted network
3. **No user roles** - All users have equal access to all data
4. **Single-server architecture** - Not designed for horizontal scaling
5. **No real-time updates** - Changes require page refresh

## Future Enhancements

- Persistent database storage
- User roles and permissions
- Multi-tenancy support
- Real-time updates with WebSockets
- Advanced reporting and analytics
- Email notifications
- Mobile app
- Integration with calendar systems

## License

MIT

## Support

For issues or questions, please contact your system administrator.
