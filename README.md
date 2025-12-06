# NYU Shuttle App

A complete mobile and web application for NYU shuttle transit, including route planning, real-time arrivals, and interactive maps.

## Project Structure

```
nyu-shuttle-app/
├── app/              # Next.js web application
├── mobile/           # React Native mobile app (Expo)
├── backend/          # Backend API and database
│   ├── api/         # Express.js REST API
│   └── db/          # PostgreSQL database setup
└── README.md        # This file
```

## Quick Start

### 1. Backend Setup (Database & API)

See [backend/README.md](./backend/README.md) for detailed instructions.

**Quick setup:**

```bash
# 1. Install PostgreSQL with PostGIS
# 2. Create database
createdb nyu_transit
psql nyu_transit -c "CREATE EXTENSION postgis;"

# 3. Set up database schema
cd backend/db
cp .env.example .env
# Edit .env with your credentials
psql -U postgres -d nyu_transit -f schema.sql
npm install
npm run upload-schedule

# 4. Start API server
cd ../api
cp .env.example .env
# Edit .env with your credentials
npm install
npm run dev
```

### 2. Web App Setup

```bash
cd app
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 3. Mobile App Setup

```bash
cd mobile
npm install
npm start
```

Scan the QR code with Expo Go app on your phone, or press `i` for iOS simulator / `a` for Android emulator.

## Features

### Web App (Next.js)

- Interactive map with Leaflet
- Location search
- Route visualization
- Real-time location tracking

### Mobile App (React Native)

- Native maps (Apple Maps / Google Maps)
- Location services
- Route planning
- Native UI components

### Backend API

- RESTful API for routes, stops, trips
- Route planning algorithm
- Real-time arrival information
- PostgreSQL with PostGIS for geospatial queries

## API Endpoints

The backend API runs on `http://localhost:3000` (default)

- `GET /v1/routes` - Get all shuttle routes
- `GET /v1/stops` - Get all stops
- `GET /v1/stops/:stop_id/next_arrivals` - Get next arrivals
- `GET /v1/plan` - Plan route between locations
- `GET /v1/trips/nearby` - Find nearby trips

See [backend/api/api_design.md](./backend/api/api_design.md) for complete documentation.

## Technologies

### Frontend

- **Web**: Next.js 16, React 19, TypeScript, Tailwind CSS, Leaflet
- **Mobile**: React Native, Expo, TypeScript, react-native-maps, NativeWind

### Backend

- **API**: Express.js, TypeScript, PostgreSQL
- **Database**: PostgreSQL 12+, PostGIS extension

## Development

### Running Everything

1. **Start Database** (if not running as service)

   ```bash
   brew services start postgresql@14  # macOS
   ```

2. **Start API Server**

   ```bash
   cd backend/api
   npm run dev
   ```

3. **Start Web App** (in new terminal)

   ```bash
   cd app
   npm run dev
   ```

4. **Start Mobile App** (in new terminal)
   ```bash
   cd mobile
   npm start
   ```

## Environment Variables

### Backend API

Create `backend/api/.env`:

```
PGHOST=localhost
PGPORT=5432
PGDATABASE=nyu_transit
PGUSER=postgres
PGPASSWORD=your_password
PORT=3000
```

### Backend Database

Create `backend/db/.env`:

```
PGHOST=localhost
PGPORT=5432
PGDATABASE=nyu_transit
PGUSER=postgres
PGPASSWORD=your_password
```

## Production Deployment

### Backend

- Deploy API to a cloud service (Heroku, Railway, AWS, etc.)
- Use managed PostgreSQL with PostGIS (AWS RDS, Heroku Postgres, etc.)

### Web App

- Deploy to Vercel (recommended for Next.js)
- Or any Node.js hosting service

### Mobile App

- Build with Expo EAS Build
- Submit to App Store / Google Play Store

## License

ISC
