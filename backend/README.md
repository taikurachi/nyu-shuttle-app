# NYU Transit Backend

Backend API and database for the NYU Shuttle transit system.

## Project Structure

```
backend/
├── api/          # Express.js REST API server
├── db/           # Database setup and scripts
└── README.md     # This file
```

## Prerequisites

- **PostgreSQL 12+** with **PostGIS extension**
- **Node.js 20+** and npm
- PostgreSQL user with database creation privileges

## Setup Instructions

### 1. Install PostgreSQL with PostGIS

#### macOS (using Homebrew)

```bash
brew install postgresql@14 postgis
brew services start postgresql@14
```

#### Ubuntu/Debian

```bash
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib postgis
```

#### Windows

Download and install from [PostgreSQL official website](https://www.postgresql.org/download/windows/)

### 2. Create Database and User

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE nyu_transit;

# Connect to the new database
\c nyu_transit

# Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

# Exit psql
\q
```

### 3. Set Up Database Schema

```bash
cd db

# Copy environment file
cp .env.example .env

# Edit .env with your PostgreSQL credentials
# Then run the schema
psql -U postgres -d nyu_transit -f schema.sql
```

### 4. Install Dependencies

#### API Server

```bash
cd api
npm install
cp .env.example .env
# Edit .env with your database credentials
```

#### Database Scripts

```bash
cd db
npm install
cp .env.example .env
# Edit .env with your database credentials
```

### 5. Upload Schedule Data

```bash
cd db
npm run upload-schedule
```

This will populate the database with routes, stops, trips, and schedules from the CSV files in `db/data/schedules/`.

### 6. Start the API Server

```bash
cd api
npm run dev
```

The API will be available at `http://localhost:3000`

## API Endpoints

See [api/api_design.md](./api/api_design.md) for complete API documentation.

### Quick Reference

- `GET /v1/routes` - Get all routes
- `GET /v1/routes/:route_id` - Get route details
- `GET /v1/stops` - Get all stops
- `GET /v1/stops/:stop_id` - Get stop details
- `GET /v1/stops/:stop_id/next_arrivals` - Get next arrivals at a stop
- `GET /v1/trips/nearby` - Find nearby trips
- `GET /v1/plan` - Plan a route between two locations

## Environment Variables

### API (.env)

- `PGHOST` - PostgreSQL host (default: localhost)
- `PGPORT` - PostgreSQL port (default: 5432)
- `PGDATABASE` - Database name (default: nyu_transit)
- `PGUSER` - PostgreSQL user
- `PGPASSWORD` - PostgreSQL password
- `PORT` - API server port (default: 3000)

### Database (.env)

- `PGHOST` - PostgreSQL host
- `PGPORT` - PostgreSQL port
- `PGDATABASE` - Database name
- `PGUSER` - PostgreSQL user
- `PGPASSWORD` - PostgreSQL password

## Development

### API Server

```bash
cd api
npm run dev    # Start with nodemon (auto-reload)
npm run build  # Build TypeScript
npm start      # Start production server
```

### Database Scripts

```bash
cd db
npm run upload-schedule  # Upload schedule data
npm run clear-trips      # Clear all trip data
```

## Database Schema

The database uses PostgreSQL with PostGIS for geospatial operations:

- **routes** - Shuttle routes (A, B, C, etc.)
- **stops** - Physical bus stop locations (with PostGIS geography)
- **calendar** - Service patterns (which days routes operate)
- **trips** - Individual bus journeys
- **stop_times** - Timing information linking trips to stops

See `db/schema.sql` for the complete schema.

## Troubleshooting

### PostGIS Extension Error

If you get an error about PostGIS not being available:

```bash
# Install PostGIS extension
sudo apt-get install postgis  # Ubuntu/Debian
brew install postgis          # macOS
```

### Connection Refused

- Make sure PostgreSQL is running: `brew services start postgresql@14` (macOS)
- Check your `.env` file has correct credentials
- Verify PostgreSQL is listening on the correct port

### SSL Connection Error

If you're running locally, you may need to disable SSL in the database connection. Edit `api/lib/db.ts` and `db/lib/db.ts` to remove or modify the SSL configuration.
