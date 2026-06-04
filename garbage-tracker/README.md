# Garbage Tracker

A standalone web application for tracking and reporting garbage/waste locations in your area. Users can report garbage spots, view them on an interactive map, and track cleanup progress.

## Features

- **Report Garbage**: Submit reports with GPS location, description, severity level, and optional photo
- **Interactive Map**: View all reported garbage locations on a Leaflet.js map with color-coded status markers
- **Status Tracking**: Track reports through stages: Reported → In Progress → Cleaned
- **Dashboard**: View summary statistics including total reports, active issues, and cleanup progress
- **Filtering**: Filter reports by status and severity
- **Photo Upload**: Attach photos to reports for visual verification
- **Geolocation**: Auto-detect user location for easy reporting
- **Responsive**: Works on desktop and mobile devices

## Tech Stack

- **Backend**: Node.js + Express.js
- **Database**: SQLite (via better-sqlite3)
- **Frontend**: Vanilla HTML/CSS/JavaScript
- **Maps**: Leaflet.js + OpenStreetMap
- **Styling**: Custom CSS with responsive design
- **File Uploads**: Multer

## Getting Started

### Prerequisites

- Node.js 18+ installed

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd garbage-tracker

# Install dependencies
npm install

# Start the server
npm start
```

The app will be available at `http://localhost:3000`.

### Environment Variables

Create a `.env` file (optional):

```
PORT=3000
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reports` | List all reports (supports `?status=` and `?severity=` filters) |
| GET | `/api/reports/:id` | Get a single report with status history |
| POST | `/api/reports` | Create a new garbage report (multipart/form-data) |
| PATCH | `/api/reports/:id/status` | Update report status |
| DELETE | `/api/reports/:id` | Delete a report |
| GET | `/api/stats` | Get dashboard statistics |

### Creating a Report

```bash
curl -X POST http://localhost:3000/api/reports \
  -F "latitude=28.6139" \
  -F "longitude=77.2090" \
  -F "description=Large garbage pile near park entrance" \
  -F "severity=high" \
  -F "address=Connaught Place, New Delhi" \
  -F "reporter_name=John" \
  -F "photo=@garbage_photo.jpg"
```

### Updating Status

```bash
curl -X PATCH http://localhost:3000/api/reports/1/status \
  -H "Content-Type: application/json" \
  -d '{"status": "in_progress", "notes": "Cleanup crew dispatched"}'
```

## Project Structure

```
garbage-tracker/
├── server.js          # Express server entry point
├── db.js              # SQLite database setup
├── routes/
│   ├── reports.js     # Reports CRUD API
│   └── stats.js       # Statistics API
├── public/
│   ├── index.html     # Frontend HTML
│   ├── styles.css     # Styling
│   └── app.js         # Frontend JavaScript
├── uploads/           # Uploaded photos (gitignored)
├── data/              # SQLite database (gitignored)
└── package.json
```

## License

ISC
