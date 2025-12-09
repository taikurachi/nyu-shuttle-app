# Technical Implementation - Frontend

## High-Level Description

The frontend is a React Native mobile application built with Expo, providing a native iOS and Android experience for NYU Transit route planning and navigation.

## MOBILE APP FRAMEWORK

**React Native with Expo SDK 54:**

- Cross-platform mobile development (iOS & Android)
- Native performance with JavaScript/TypeScript
- Hot reloading and over-the-air updates
- Native modules integration

**Key Technologies:**

- **React Native Maps** - Native map rendering with Google Maps (Android) and Apple Maps (iOS)
- **Expo Location** - GPS location services and permissions
- **React Native Reanimated** - Smooth animations for gestures and transitions
- **NativeWind** - Tailwind CSS styling for React Native
- **TypeScript** - Type-safe development

## UI COMPONENTS

**1. Map Component (`Map.tsx`):**

- Displays user location, bus stops, and route polylines
- Real-time route visualization with walking (gray dashed) and transit (purple solid) segments
- OSRM integration for accurate road-based route paths
- Custom markers for stops, user location, and destinations
- Automatic map bounds adjustment to fit routes

**2. BottomSheet Component (`BottomSheet.tsx`):**

- Swipeable bottom overlay with expand/collapse gestures
- Search functionality with preset locations and stop filtering
- Route options display with proportional timeline visualization
- Detailed route view with segment breakdown
- PanResponder and Animated API for smooth interactions

**3. ChatBot Component (`ChatBot.tsx`):**

- Floating action button with high z-index overlay
- Modal chat interface with message history
- Integration with `/v1/ai` endpoint for natural language queries
- Automatic route plan generation and visualization
- "View Route Options" button linking to route selection

## API INTEGRATION

**REST API Client (`api.ts`):**

- Centralized API service layer
- Base URL: `https://nyu-transit.vercel.app`
- Type-safe interfaces for all API responses

**Endpoints:**

- `/v1/routes` - Retrieve all transit routes
- `/v1/stops` - Get all bus stops with coordinates
- `/v1/trips/nearby` - Find nearby trips based on location
- `/v1/stops/{stop_id}/next_arrivals` - Get next bus arrivals
- `/v1/plan` - Multi-modal route planning (walk + transit)
- `/v1/ai` - AI-powered natural language route planning
- `/v1/trips/{trip_id}/stops` - Get stops along a specific trip

## KEY FEATURES

**Location Services:**

- Real-time GPS tracking with high accuracy
- Location permissions handling (iOS & Android)
- Nearest stop detection
- User location marker on map

**Route Planning:**

- Multi-modal route calculation (walking + bus)
- Route filtering (bus-only routes)
- Multiple route options with duration and departure times
- Visual timeline with proportional segment widths
- Route path visualization on map using OSRM

**AI Chatbot:**

- Natural language route queries
- Context-aware responses
- Automatic route plan generation
- Direct integration with route options view

**User Experience:**

- Swipeable bottom sheet with snap points
- Keyboard-aware input handling
- Smooth animations and transitions
- Loading states and error handling
- Responsive design for various screen sizes

## STATE MANAGEMENT

**React Hooks:**

- `useState` - Component-level state (locations, routes, UI state)
- `useEffect` - Side effects (API calls, location updates)
- `useRef` - DOM references and animated values
- `useCallback` - Memoized functions for performance

**Global State Flow:**

- App.tsx manages user location and selected route
- Components communicate via props and callbacks
- Route selection updates map visualization in real-time

## STYLING

**NativeWind (Tailwind CSS for React Native):**

- Utility-first CSS approach
- Consistent design system
- Responsive styling
- Custom theme configuration

**StyleSheet API:**

- Platform-specific styles
- Performance-optimized styling
- Dynamic style calculations
