# Production Deployment Guide

## Security Configuration

### Required Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | **Yes** | Must be at least 32 characters. Server refuses to start without it in production. Generate: `openssl rand -base64 32` |
| `CSRF_SECRET` | **Yes** | Secret for CSRF token generation. Use a strong random value. |
| `NODE_ENV` | **Yes** | Set to `production` |
| `DATABASE_PATH` | No | SQLite database file path (default: `./data/timesheet.db`) |
| `PORT` | No | Server port (default: 3001) |
| `FRONTEND_URL` | **Yes** | Frontend URL for CORS (e.g., `https://your-app.com`) |

### Setup Steps

1. **Copy environment variables:**
```bash
cp .env.example .env
```

2. **Generate strong secrets:**
```bash
# Generate JWT secret (32+ characters required)
JWT_SECRET=$(openssl rand -base64 32)

# Generate CSRF secret
CSRF_SECRET=$(openssl rand -base64 32)
```

3. **Update .env file:**
```bash
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://your-frontend-domain.com
JWT_SECRET=<generated-jwt-secret>
CSRF_SECRET=<generated-csrf-secret>
DATABASE_PATH=./data/timesheet.db
```

4. **Ensure database directory exists:**
```bash
mkdir -p data
```

## Authentication & Security

### Password Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- Passwords hashed with bcryptjs (12 salt rounds)

### JWT Tokens
- 8-hour expiration
- Includes `issuer` (timesheet-app) and `audience` (timesheet-app-users) claims
- Server validates these claims on every request
- **In production, server will not start if JWT_SECRET is missing or < 32 chars**

### CSRF Protection
- Double-submit cookie pattern via csrf-csrf
- All POST/PUT/DELETE requests require `x-csrf-token` header
- Frontend fetches token from `GET /api/csrf-token` before state-changing requests

### Account Lockout
- After 5 failed login attempts, account is locked for 15 minutes
- Lockout status tracked in the database
- Automatically resets after lockout period expires

### Rate Limiting
- Auth routes (login/register): 5 requests per 15 minutes per IP
- General routes: 100 requests per 15 minutes per IP

### User Roles
- `user` (default): Can only manage their own clients and work entries
- `admin`: Can manage all clients across all users

## Deployment Options

### Option 1: PM2 Deployment
```bash
npm install -g pm2
npm install --production
mkdir -p data
pm2 start src/server.js --name "time-tracker-api"
pm2 save
pm2 startup
```

### Option 2: Docker Deployment
```bash
cd docker
docker-compose up -d
```

The Docker configuration:
- Mounts a volume for SQLite database persistence
- Passes required environment variables
- Uses Node.js 20-alpine base image

### Option 3: Systemd Service
Create `/etc/systemd/system/time-tracker.service`:
```ini
[Unit]
Description=Time Tracker API
After=network.target

[Service]
Type=simple
User=nodejs
WorkingDirectory=/path/to/app
ExecStart=/usr/bin/node src/server.js
Restart=always
Environment=NODE_ENV=production
EnvironmentFile=/path/to/app/.env

[Install]
WantedBy=multi-user.target
```

## Security Hardening Checklist

1. **Use HTTPS** - All traffic must be encrypted
2. **Set strong JWT_SECRET** - At least 32 random characters
3. **Set strong CSRF_SECRET** - Different from JWT_SECRET
4. **Configure CORS** - Set `FRONTEND_URL` to your exact frontend domain
5. **Review rate limits** - Adjust based on expected traffic
6. **Monitor auth failures** - Set up alerts for account lockouts
7. **Regular dependency updates** - Run `npm audit` periodically
8. **Database backups** - Back up `data/timesheet.db` regularly
9. **File permissions** - Restrict access to `.env` and database files

## Monitoring & Logging

- Application logs go to console (use PM2/Docker for log management)
- Health check: `GET /health` returns `{ status: 'OK', timestamp: '...' }`
- Monitor `/api/auth/login` for 423 (locked) responses to detect brute force attempts
- Consider structured logging (Winston) for production

## Backup Strategy

Back up the SQLite database file regularly:
```bash
cp data/timesheet.db data/timesheet.db.backup.$(date +%Y%m%d)
```

For automated backups, set up a cron job:
```bash
0 2 * * * cp /path/to/data/timesheet.db /path/to/backups/timesheet.db.$(date +\%Y\%m\%d)
```
