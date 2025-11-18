'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Rectangle, useMap, Marker, Popup, Polyline } from 'react-leaflet';
import type { Location } from '../types/locations';
import { BUS_STOPS } from '../types/locations';
import type { RoutePoint, RouteSegment } from '../utils/routes';
import { generateShuttleRoute, findNearestBusStop } from '../utils/routes';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in Next.js
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  });
}

// NYC coordinates (centered around Manhattan)
const NYC_CENTER: [number, number] = [40.7128, -74.0060];
const DEFAULT_ZOOM = 12;

// NYC bounds (approximate) - restricts panning
// North: Bronx, South: Brooklyn/Staten Island, East: Queens, West: Hudson River
const NYC_BOUNDS: [[number, number], [number, number]] = [
  [40.5, -74.05], // Southwest corner
  [40.9, -73.7],  // Northeast corner
];

// Create rectangles to dim areas outside NYC
// We'll create 4 rectangles covering north, south, east, and west of NYC
const createDimmingRectangles = () => {
  const [southWest, northEast] = NYC_BOUNDS;
  
  return [
    // North (above NYC)
    [[northEast[0], -180], [90, 180]] as [[number, number], [number, number]],
    // South (below NYC)
    [[-90, -180], [southWest[0], 180]] as [[number, number], [number, number]],
    // East (right of NYC)
    [[southWest[0], northEast[1]], [northEast[0], 180]] as [[number, number], [number, number]],
    // West (left of NYC)
    [[southWest[0], -180], [northEast[0], southWest[1]]] as [[number, number], [number, number]],
  ];
};

// Component to set map bounds on mount
function MapBounds() {
  const map = useMap();
  
  useEffect(() => {
    if (map) {
      map.setMaxBounds(NYC_BOUNDS);
      map.setMinZoom(10); // Prevent zooming out too far
    }
  }, [map]);
  
  return null;
}

// Component to center map on location
function MapCenter({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);
  
  return null;
}

// Component to fit map bounds to show route
function FitRouteBounds({ 
  userLocation, 
  selectedLocation,
  routeSegments
}: { 
  userLocation: [number, number] | null; 
  selectedLocation: Location | null;
  routeSegments: RouteSegment[];
}) {
  const map = useMap();
  
  useEffect(() => {
    if (userLocation && selectedLocation) {
      // Collect all route points from all segments
      const allPoints: RoutePoint[] = [];
      routeSegments.forEach(segment => {
        allPoints.push(...segment.points);
      });
      
      // If we have route points, use them for more accurate bounds
      if (allPoints.length > 0) {
        const bounds = L.latLngBounds(allPoints);
        map.fitBounds(bounds, { padding: [50, 50] });
      } else {
        // Fallback to start and end points
        const bounds = L.latLngBounds([
          [userLocation[0], userLocation[1]],
          [selectedLocation.lat, selectedLocation.lng],
        ]);
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [map, userLocation, selectedLocation, routeSegments]);
  
  return null;
}

interface MapProps {
  userLocation: [number, number] | null;
  selectedLocation: Location | null;
}

export default function Map({ userLocation, selectedLocation }: MapProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [routeSegments, setRouteSegments] = useState<RouteSegment[]>([]);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [nearestStop, setNearestStop] = useState<typeof BUS_STOPS[0] | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Find nearest bus stop when user location changes
  useEffect(() => {
    if (userLocation) {
      const stop = findNearestBusStop(userLocation);
      setNearestStop(stop);
    }
  }, [userLocation]);

  // Fetch route when user location or selected destination changes
  useEffect(() => {
    if (userLocation && selectedLocation) {
      setIsLoadingRoute(true);
      generateShuttleRoute(userLocation, selectedLocation)
        .then((segments) => {
          setRouteSegments(segments);
          setIsLoadingRoute(false);
        })
        .catch((error) => {
          console.error('Error loading route:', error);
          setIsLoadingRoute(false);
          // Fallback to empty route
          setRouteSegments([]);
        });
    } else {
      setRouteSegments([]);
    }
  }, [userLocation, selectedLocation]);

  // Create custom icons for user location and destination
  const createCustomIcon = (color: string) => {
    return L.divIcon({
      className: 'custom-marker',
      html: `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });
  };

  const userLocationIcon = createCustomIcon('#3b82f6'); // Blue for user
  const destinationIcon = createCustomIcon('#ef4444'); // Red for destination
  const busStopIcon = createCustomIcon('#f59e0b'); // Orange for bus stops
  const nearestStopIcon = createCustomIcon('#10b981'); // Green for nearest stop

  // Determine map center - prioritize selected location, then user location, then default
  const mapCenter: [number, number] = selectedLocation
    ? [selectedLocation.lat, selectedLocation.lng]
    : userLocation || NYC_CENTER;

  if (!isMounted) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-100">
        <p className="text-gray-600">Loading map...</p>
      </div>
    );
  }

  return (
    <div className="w-full h-screen">
      <MapContainer
        center={mapCenter}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom={true}
        maxBounds={NYC_BOUNDS}
        minZoom={10}
        className="w-full h-full z-0"
      >
        <MapBounds />
        {userLocation && selectedLocation ? (
          <FitRouteBounds 
            userLocation={userLocation} 
            selectedLocation={selectedLocation}
            routeSegments={routeSegments}
          />
        ) : (selectedLocation || userLocation) && (
          <MapCenter center={mapCenter} zoom={selectedLocation ? 14 : DEFAULT_ZOOM} />
        )}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {/* Dim areas outside NYC with semi-transparent rectangles */}
        {createDimmingRectangles().map((bounds, index) => (
          <Rectangle
            key={index}
            bounds={bounds}
            fillColor="#000000"
            fillOpacity={0.4}
            stroke={false}
            interactive={false}
          />
        ))}
        {/* Bus stop markers */}
        {BUS_STOPS.map((stop) => {
          const isNearest = nearestStop?.id === stop.id;
          return (
            <Marker
              key={stop.id}
              position={[stop.lat, stop.lng]}
              icon={isNearest ? nearestStopIcon : busStopIcon}
            >
              <Popup>
                {stop.name}
                {isNearest && ' (Nearest Stop)'}
              </Popup>
            </Marker>
          );
        })}
        {/* User location marker */}
        {userLocation && (
          <Marker position={userLocation} icon={userLocationIcon}>
            <Popup>Your Location</Popup>
          </Marker>
        )}
        {/* Selected destination marker */}
        {selectedLocation && (
          <Marker position={[selectedLocation.lat, selectedLocation.lng]} icon={destinationIcon}>
            <Popup>{selectedLocation.name}</Popup>
          </Marker>
        )}
        {/* Route segments: walking to bus stop and shuttle to destination */}
        {routeSegments.map((segment, index) => (
          <Polyline
            key={index}
            positions={segment.points}
            color={segment.color}
            weight={index === 0 ? 4 : 5} // Thinner line for walking segment
            opacity={0.7}
            dashArray={index === 0 ? "5, 5" : "10, 5"} // Different dash pattern for walking
          />
        ))}
        {/* Loading indicator for route */}
        {isLoadingRoute && userLocation && selectedLocation && (
          <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-[1000] bg-white px-4 py-2 rounded-lg shadow-lg">
            <p className="text-sm text-gray-600">Loading route...</p>
          </div>
        )}
      </MapContainer>
    </div>
  );
}

