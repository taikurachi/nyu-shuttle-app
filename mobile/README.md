# NYU Shuttle Mobile App

A React Native mobile app built with Expo for finding NYU shuttle routes and stops.

## Features

- 🗺️ Interactive native maps with Google Maps
- 📍 Real-time location tracking
- 🔍 Search for NYU locations
- 🚌 Find nearest bus stops
- 🛣️ Route planning with walking and shuttle segments

## Prerequisites

- Node.js 20+ (recommended)
- npm or yarn
- Expo Go app on your phone (for development)
- Or Xcode (for iOS simulator) / Android Studio (for Android emulator)

## Setup

1. Navigate to the mobile directory:
```bash
cd mobile
```

2. Install dependencies (if not already done):
```bash
npm install
```

## Running the App

### Development

Start the Expo development server:
```bash
npm start
```

Then:
- **On your phone**: Scan the QR code with Expo Go (iOS) or the Expo app (Android)
- **iOS Simulator**: Press `i` in the terminal
- **Android Emulator**: Press `a` in the terminal

### Platform-specific

```bash
# iOS
npm run ios

# Android
npm run android

# Web (limited functionality)
npm run web
```

## Project Structure

```
mobile/
├── src/
│   ├── components/
│   │   ├── Map.tsx          # Native map component
│   │   └── SearchBar.tsx    # Location search component
│   ├── types/
│   │   └── locations.ts      # Location types and data
│   └── utils/
│       └── routes.ts         # Route calculation utilities
├── App.tsx                   # Main app component
├── app.json                  # Expo configuration
└── package.json
```

## Building for Production

### iOS
```bash
eas build --platform ios
```

### Android
```bash
eas build --platform android
```

Note: You'll need to set up an Expo account and configure EAS (Expo Application Services) for production builds.

## Permissions

The app requires location permissions to:
- Show your current location on the map
- Find the nearest bus stop
- Calculate routes

## Technologies

- **Expo** - React Native framework
- **react-native-maps** - Native map components
- **expo-location** - Location services
- **NativeWind** - Tailwind CSS for React Native
- **TypeScript** - Type safety

## API Integration

The app connects to the NYU Transit API:
- **Base URL**: `https://nyu-transit.vercel.app`
- Fetches real-time stops, routes, and trip information
- Uses the `/v1/plan` endpoint for route planning

## Notes

- The app uses Google Maps on Android and Apple Maps on iOS
- Routes are calculated using the backend API (`/v1/plan` endpoint)
- Location data is used to find nearby stops and plan routes
- All data is fetched from the deployed backend API

## Quick Start with iOS Simulator

Since you have Xcode installed:

```bash
cd mobile
npm run ios
```

This will automatically:
1. Start the Expo dev server
2. Open the iOS simulator
3. Build and install the app

See [RUNNING.md](./RUNNING.md) for detailed instructions and troubleshooting.

