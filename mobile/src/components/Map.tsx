import React, { useEffect, useState } from "react";
import {
  View,
  ActivityIndicator,
  Text,
  StyleSheet,
  Platform,
} from "react-native";
import MapView, {
  Marker,
  Polyline,
  Region,
  PROVIDER_GOOGLE,
  PROVIDER_DEFAULT,
} from "react-native-maps";
import type { Location } from "../types/locations";
import {
  getStops,
  getNearbyTrips,
  type Stop,
  type Plan,
  type PlanSegment,
} from "../services/api";

// NYC coordinates (centered around Manhattan)
const NYC_CENTER: Region = {
  latitude: 40.7128,
  longitude: -74.006,
  latitudeDelta: 0.1,
  longitudeDelta: 0.1,
};

const DEFAULT_ZOOM = 0.05;

interface MapProps {
  userLocation: { latitude: number; longitude: number } | null;
  selectedLocation: Location | null;
  selectedRoute: Plan | null;
}

interface RouteSegment {
  points: Array<{ latitude: number; longitude: number }>;
  color: string;
  isDashed: boolean;
}

export default function Map({
  userLocation,
  selectedLocation,
  selectedRoute,
}: MapProps) {
  const [stops, setStops] = useState<Stop[]>([]);
  const [routeSegments, setRouteSegments] = useState<RouteSegment[]>([]);
  const [nearestStop, setNearestStop] = useState<Stop | null>(null);
  const [region, setRegion] = useState<Region>(NYC_CENTER);

  // Fetch stops from API on mount
  useEffect(() => {
    const fetchStops = async () => {
      try {
        const stopsData = await getStops();
        setStops(stopsData);
      } catch (error) {
        console.error("Error fetching stops:", error);
      }
    };
    fetchStops();
  }, []);

  // Find nearest bus stop when user location changes
  useEffect(() => {
    if (userLocation && stops.length > 0) {
      const findNearest = async () => {
        try {
          const nearbyTrips = await getNearbyTrips(
            userLocation.latitude,
            userLocation.longitude,
            1000
          );
          if (nearbyTrips.length > 0) {
            const nearestStopId = nearbyTrips[0].nearby_stop_id;
            const stop = stops.find((s) => s.stop_id === nearestStopId);
            if (stop) {
              setNearestStop(stop);
            }
          }
        } catch (error) {
          console.error("Error finding nearest stop:", error);
        }
      };
      findNearest();
    }
  }, [userLocation, stops]);

  // Convert plan segments to route segments for display
  const convertPlanToSegments = (plan: Plan): RouteSegment[] => {
    return plan.segments.map((segment: PlanSegment) => {
      const points = [
        { latitude: segment.from_lat, longitude: segment.from_lon },
        { latitude: segment.to_lat, longitude: segment.to_lon },
      ];

      // Walking segments are gray and dashed, transit segments are colored and solid
      const color = segment.type === "walk" ? "#6b7280" : "#3b82f6";
      const isDashed = segment.type === "walk";

      return { points, color, isDashed };
    });
  };

  // Display route when a specific route is selected
  useEffect(() => {
    if (selectedRoute) {
      const segments = convertPlanToSegments(selectedRoute);
      setRouteSegments(segments);

      // Fit map to show entire route
      const allPoints = segments.flatMap(
        (segment: RouteSegment) => segment.points
      );
      const lats = allPoints.map(
        (p: { latitude: number; longitude: number }) => p.latitude
      );
      const lngs = allPoints.map(
        (p: { latitude: number; longitude: number }) => p.longitude
      );

      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);

      setRegion({
        latitude: (minLat + maxLat) / 2,
        longitude: (minLng + maxLng) / 2,
        latitudeDelta: Math.max((maxLat - minLat) * 1.5, 0.01),
        longitudeDelta: Math.max((maxLng - minLng) * 1.5, 0.01),
      });
    } else if (selectedLocation) {
      // Center on selected location (but don't show route yet)
      setRegion({
        latitude: selectedLocation.lat,
        longitude: selectedLocation.lng,
        latitudeDelta: DEFAULT_ZOOM,
        longitudeDelta: DEFAULT_ZOOM,
      });
      setRouteSegments([]);
    } else if (userLocation) {
      // Center on user location
      setRegion({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: DEFAULT_ZOOM,
        longitudeDelta: DEFAULT_ZOOM,
      });
      setRouteSegments([]);
    } else {
      setRouteSegments([]);
    }
  }, [userLocation, selectedLocation, selectedRoute]);

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        provider={
          Platform.OS === "android" ? PROVIDER_GOOGLE : PROVIDER_DEFAULT
        }
        region={region}
        onRegionChangeComplete={setRegion}
        showsUserLocation={false} // We'll use custom marker
        showsMyLocationButton={false}
        minZoomLevel={10}
        maxZoomLevel={18}
      >
        {/* Bus stop markers */}
        {stops.map((stop) => {
          const isNearest = nearestStop?.stop_id === stop.stop_id;
          return (
            <Marker
              key={stop.stop_id}
              coordinate={{ latitude: stop.lat, longitude: stop.lon }}
              pinColor={isNearest ? "#10b981" : "#f59e0b"}
              title={stop.stop_name}
              description={isNearest ? "Nearest Stop" : stop.stop_description}
            />
          );
        })}

        {/* User location marker */}
        {userLocation && (
          <Marker
            coordinate={userLocation}
            pinColor="#3b82f6"
            title="Your Location"
          />
        )}

        {/* Selected destination marker */}
        {selectedLocation && (
          <Marker
            coordinate={{
              latitude: selectedLocation.lat,
              longitude: selectedLocation.lng,
            }}
            pinColor="#ef4444"
            title={selectedLocation.name}
          />
        )}

        {/* Route segments: walking and transit */}
        {routeSegments.map((segment, index) => (
          <Polyline
            key={index}
            coordinates={segment.points}
            strokeColor={segment.color}
            strokeWidth={segment.isDashed ? 4 : 5}
            lineDashPattern={segment.isDashed ? [5, 5] : undefined}
          />
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    position: "absolute",
    bottom: 80,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  loadingBox: {
    backgroundColor: "white",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: "#374151",
  },
});
