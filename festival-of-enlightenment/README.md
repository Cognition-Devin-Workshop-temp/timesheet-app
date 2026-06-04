# Festival of Enlightenment

A web application for managing a spiritual program based on the Bhagavad Gita. Built with Next.js 16, MongoDB, and Tailwind CSS.

## Features

- **Batch Management** — Create and manage program batches
- **Attendee Registration** — Register attendees with name, phone, amount paid, age, location, and notes
- **Saturday Attendance Sheet** — Toggle-based attendance tracking with live stats
- **Calling List (Mobile-Optimized)** — Native `tel:` dialing, clipboard copy, 8-option call status dropdown, quick notes with history, and per-attendee session attendance counter

## Tech Stack

- **Frontend:** Next.js 16 (App Router), React 19, Tailwind CSS v4
- **Backend:** Next.js API Route Handlers
- **Database:** MongoDB with Mongoose ODM
- **Auth:** JWT (via `jose`) stored in HTTP-only cookies. Login-only — no public signup.

## Getting Started

### Prerequisites

- Node.js 20+
- MongoDB running locally (default: `mongodb://127.0.0.1:27017`)

### Setup

```bash
cd festival-of-enlightenment
cp .env.example .env.local
npm install
npm run dev
```

The app will be available at `http://localhost:3000`.

### Default Credentials

- **Username:** `admin`
- **Password:** `admin123`

### Seed Demo Data

```bash
curl -X POST http://localhost:3000/api/seed
```

This creates a sample batch with 5 attendees and 1 session.

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/festival_of_enlightenment` | MongoDB connection string |
| `JWT_SECRET` | `festival-of-enlightenment-secret` | Secret key for JWT signing |
| `ADMIN_USERNAME` | `admin` | Login username |
| `ADMIN_PASSWORD` | `admin123` | Login password |

## Project Structure

```
src/
├── app/
│   ├── api/           # REST API routes
│   │   ├── auth/      # Login/logout/me endpoints
│   │   ├── batches/   # Batch CRUD + nested attendee/session routes
│   │   └── seed/      # Demo data seeder
│   ├── batches/       # Batch detail, attendance, calling pages
│   ├── dashboard/     # Dashboard with batch list
│   └── login/         # Login page
├── components/        # Shared components (Navbar)
├── lib/               # DB connection, auth utilities
└── models/            # Mongoose schemas (Batch, Attendee, Session)
```

## Design

Spiritual saffron/amber and deep meditative blue theme with clean white space. Mobile-optimized for organizers using smartphones during calls and attendance.
