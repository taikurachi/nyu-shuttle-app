import type { Location, BusStop } from '../types/locations';
import { BUS_STOPS } from '../types/locations';

export type RoutePoint = [number, number]; // [lat, lng]

export interface RouteSegment {
  points: RoutePoint[];
  color: string;
}

/**
 * Calculate distance between two points using Haversine formula
 */
function calculateDistance(
  point1: [number, number],
  point2: [number, number]
): number {
  const [lat1, lng1] = point1;
  const [lat2, lng2] = point2;
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Find the nearest bus stop to a given location
 */
export function findNearestBusStop(userLocation: [number, number]): BusStop {
  let nearestStop = BUS_STOPS[0];
  let minDistance = calculateDistance(userLocation, [
    nearestStop.lat,
    nearestStop.lng,
  ]);

  for (const stop of BUS_STOPS) {
    const distance = calculateDistance(userLocation, [stop.lat, stop.lng]);
    if (distance < minDistance) {
      minDistance = distance;
      nearestStop = stop;
    }
  }

  return nearestStop;
}

/**
 * Fetch actual road-based route from OSRM (Open Source Routing Machine)
 * This uses real road data to generate accurate routes
 */
async function fetchRouteFromOSRM(
  start: [number, number],
  end: [number, number]
): Promise<RoutePoint[]> {
  const [startLat, startLng] = start;
  const [endLat, endLng] = end;

  try {
    // OSRM API format: lng,lat (note: longitude first!)
    // Using OSRM's public demo server
    const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson&alternatives=false`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`OSRM API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      throw new Error('No route found');
    }

    // Extract coordinates from GeoJSON geometry
    // OSRM returns coordinates as [lng, lat], but Leaflet needs [lat, lng]
    const coordinates = data.routes[0].geometry.coordinates;
    return coordinates.map(([lng, lat]: [number, number]) => [lat, lng] as RoutePoint);
  } catch (error) {
    console.error('Error fetching route from OSRM:', error);
    // Fallback to a simple straight line if API fails
    return [
      [startLat, startLng],
      [endLat, endLng],
    ];
  }
}

/**
 * Generate shuttle route from user location to destination via nearest bus stop
 * Returns two route segments: user -> bus stop, bus stop -> destination
 */
export async function generateShuttleRoute(
  userLocation: [number, number],
  destination: Location
): Promise<RouteSegment[]> {
  // Find nearest bus stop
  const nearestStop = findNearestBusStop(userLocation);
  
  // Generate route segments
  const routeColor = getRouteColor(destination.id);
  
  // Segment 1: User location to nearest bus stop (walking route, different color)
  const segment1 = await fetchRouteFromOSRM(userLocation, [nearestStop.lat, nearestStop.lng]);
  
  // Segment 2: Bus stop to destination (shuttle route)
  const segment2 = await fetchRouteFromOSRM([nearestStop.lat, nearestStop.lng], [destination.lat, destination.lng]);
  
  return [
    {
      points: segment1,
      color: '#6b7280', // Gray for walking segment
    },
    {
      points: segment2,
      color: routeColor, // Destination color for shuttle segment
    },
  ];
}

/**
 * Get route color based on destination
 */
export function getRouteColor(destinationId: string): string {
  const colors: Record<string, string> = {
    'bern-dibner': '#8b5cf6', // Purple
    'paulson-center': '#10b981', // Green
    'washington-square': '#f59e0b', // Orange
  };
  return colors[destinationId] || '#3b82f6'; // Default blue
}

