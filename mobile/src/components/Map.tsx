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
import { BUS_STOPS } from "../types/locations";
import type { RouteSegment } from "../utils/routes";
import { generateShuttleRoute, findNearestBusStop } from "../utils/routes";

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
}

export default function Map({ userLocation, selectedLocation }: MapProps) {
  const [routeSegments, setRouteSegments] = useState<RouteSegment[]>([]);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [nearestStop, setNearestStop] = useState<(typeof BUS_STOPS)[0] | null>(
    null
  );
  const [region, setRegion] = useState<Region>(NYC_CENTER);

  // Find nearest bus stop when user location changes
  useEffect(() => {
    if (userLocation) {
      const stop = findNearestBusStop([
        userLocation.latitude,
        userLocation.longitude,
      ]);
      setNearestStop(stop);
    }
  }, [userLocation]);

  // Fetch route when user location or selected destination changes
  useEffect(() => {
    if (userLocation && selectedLocation) {
      setIsLoadingRoute(true);
      generateShuttleRoute(
        [userLocation.latitude, userLocation.longitude],
        selectedLocation
      )
        .then((segments) => {
          setRouteSegments(segments);
          setIsLoadingRoute(false);

          // Fit map to show entire route
          if (segments.length > 0) {
            const allPoints = segments.flatMap((segment) => segment.points);
            const lats = allPoints.map((p) => p[0]);
            const lngs = allPoints.map((p) => p[1]);

            const minLat = Math.min(...lats);
            const maxLat = Math.max(...lats);
            const minLng = Math.min(...lngs);
            const maxLng = Math.max(...lngs);

            setRegion({
              latitude: (minLat + maxLat) / 2,
              longitude: (minLng + maxLng) / 2,
              latitudeDelta: (maxLat - minLat) * 1.5,
              longitudeDelta: (maxLng - minLng) * 1.5,
            });
          }
        })
        .catch((error) => {
          console.error("Error loading route:", error);
          setIsLoadingRoute(false);
          setRouteSegments([]);
        });
    } else if (selectedLocation) {
      // Center on selected location
      setRegion({
        latitude: selectedLocation.lat,
        longitude: selectedLocation.lng,
        latitudeDelta: DEFAULT_ZOOM,
        longitudeDelta: DEFAULT_ZOOM,
      });
    } else if (userLocation) {
      // Center on user location
      setRegion({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: DEFAULT_ZOOM,
        longitudeDelta: DEFAULT_ZOOM,
      });
    } else {
      setRouteSegments([]);
    }
  }, [userLocation, selectedLocation]);

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
        {BUS_STOPS.map((stop) => {
          const isNearest = nearestStop?.id === stop.id;
          return (
            <Marker
              key={stop.id}
              coordinate={{ latitude: stop.lat, longitude: stop.lng }}
              pinColor={isNearest ? "#10b981" : "#f59e0b"}
              title={stop.name}
              description={isNearest ? "Nearest Stop" : undefined}
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

        {/* Route segments: walking to bus stop and shuttle to destination */}
        {routeSegments.map((segment, index) => (
          <Polyline
            key={index}
            coordinates={segment.points.map(([lat, lng]) => ({
              latitude: lat,
              longitude: lng,
            }))}
            strokeColor={segment.color}
            strokeWidth={index === 0 ? 4 : 5}
            lineDashPattern={index === 0 ? [5, 5] : [10, 5]}
          />
        ))}
      </MapView>

      {/* Loading indicator for route */}
      {isLoadingRoute && userLocation && selectedLocation && (
        <View style={styles.loadingContainer}>
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#3b82f6" />
            <Text style={styles.loadingText}>Loading route...</Text>
          </View>
        </View>
      )}
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
