import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import * as Location from "expo-location";
import Map from "./src/components/Map";
import BottomSheet from "./src/components/BottomSheet";
import type { Location as LocationType } from "./src/types/locations";
import type { Plan } from "./src/services/api";
import "./global.css";

export default function App() {
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<LocationType | null>(
    null
  );
  const [selectedRoute, setSelectedRoute] = useState<Plan | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);

  useEffect(() => {
    (async () => {
      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationError(
          "Location permission was denied. Please enable location permissions in settings."
        );
        setIsLoadingLocation(false);
        return;
      }

      try {
        // Get current location
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        setIsLoadingLocation(false);
      } catch (error) {
        console.error("Error getting location:", error);
        setLocationError(
          "Unable to get your location. Please check your location settings."
        );
        setIsLoadingLocation(false);
      }
    })();
  }, []);

  const handleLocationSelect = (location: LocationType | null) => {
    setSelectedLocation(location);
    setSelectedRoute(null); // Clear route when location changes
  };

  const handleRouteSelect = (plan: Plan) => {
    setSelectedRoute(plan);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <Map
        userLocation={userLocation}
        selectedLocation={selectedLocation}
        selectedRoute={selectedRoute}
      />
      <BottomSheet
        userLocation={userLocation}
        selectedLocation={selectedLocation}
        onLocationSelect={handleLocationSelect}
        onRouteSelect={handleRouteSelect}
      />
      {locationError && (
        <View style={styles.errorContainer}>
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{locationError}</Text>
          </View>
        </View>
      )}
      {isLoadingLocation && (
        <View style={styles.loadingContainer}>
          <View style={styles.loadingBox}>
            <Text style={styles.loadingText}>Getting your location...</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  errorContainer: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 1000,
  },
  errorBox: {
    backgroundColor: "#fef3c7",
    borderWidth: 1,
    borderColor: "#fbbf24",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  errorText: {
    fontSize: 14,
    color: "#92400e",
    textAlign: "center",
  },
  loadingContainer: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 1000,
  },
  loadingBox: {
    backgroundColor: "white",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  loadingText: {
    fontSize: 14,
    color: "#374151",
  },
});
