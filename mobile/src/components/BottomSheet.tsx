import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Modal,
  PanResponder,
  Animated,
  Dimensions,
  ScrollView,
} from "react-native";
import {
  getNearbyTrips,
  getStops,
  planRoute,
  type Trip,
  type Stop,
  type Plan,
} from "../services/api";
import type { Location } from "../types/locations";

interface BottomSheetProps {
  userLocation: { latitude: number; longitude: number } | null;
  selectedLocation: Location | null;
  onLocationSelect: (location: Location | null) => void;
  onRouteSelect: (plan: Plan) => void;
}

interface RouteItem {
  routeShortName: string;
  routeLongName: string;
  address: string;
  minutes: number;
  trip: Trip;
}

// Preset locations
const PRESET_LOCATIONS: Location[] = [
  {
    id: "tandon",
    name: "Tandon School of Engineering",
    lat: 40.6943,
    lng: -73.9867,
  },
  {
    id: "bobst",
    name: "Bobst Library",
    lat: 40.7296,
    lng: -73.9962,
  },
  {
    id: "washington-square",
    name: "Washington Square Park",
    lat: 40.7309,
    lng: -73.9972,
  },
];

interface RouteOption {
  plan: Plan;
  routeLetter: string;
  departureTime: string;
  minutesUntilDeparture: number;
  totalDuration: number;
}

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const COLLAPSED_HEIGHT = 60; // Height when collapsed (just the button)
const EXPANDED_HEIGHT = SCREEN_HEIGHT * 0.9; // Height when expanded
const DETAILED_ROUTE_HEIGHT = SCREEN_HEIGHT * 0.5; // Height when showing detailed route (50% of screen)
const MIN_SWIPE_DISTANCE = 50; // Minimum distance to trigger snap

export default function BottomSheet({
  userLocation,
  selectedLocation,
  onLocationSelect,
  onRouteSelect,
}: BottomSheetProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [nearbyRoutes, setNearbyRoutes] = useState<RouteItem[]>([]);
  const [isLoadingRoutes, setIsLoadingRoutes] = useState(false);
  const [stops, setStops] = useState<Stop[]>([]);
  const [filteredStops, setFilteredStops] = useState<Stop[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [routeOptions, setRouteOptions] = useState<RouteOption[]>([]);
  const [isLoadingRouteOptions, setIsLoadingRouteOptions] = useState(false);
  const [walkingTime, setWalkingTime] = useState<number | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [selectedRouteOption, setSelectedRouteOption] =
    useState<RouteOption | null>(null);

  // Animated value for bottom sheet position (only translateY, height is fixed)
  const translateY = useRef(new Animated.Value(0)).current;
  const currentTranslateY = useRef(0);

  // Fetch stops on mount
  useEffect(() => {
    const fetchStops = async () => {
      try {
        const stopsData = await getStops();
        setStops(stopsData);
        setFilteredStops(stopsData);
      } catch (error) {
        console.error("Error fetching stops:", error);
      }
    };
    fetchStops();
  }, []);

  // Filter stops based on search query
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredStops(stops);
      // Show search results when focused even if query is empty (to show presets)
      if (isSearchFocused) {
        setShowSearchResults(true);
      } else {
        setShowSearchResults(false);
      }
    } else {
      const filtered = stops.filter((stop) =>
        stop.stop_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredStops(filtered);
      setShowSearchResults(true);
    }
  }, [searchQuery, stops, isSearchFocused]);

  // Calculate walking time (Haversine distance * average walking speed)
  const calculateWalkingTime = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371e3; // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = R * c; // Distance in meters
    const walkingSpeedMetersPerMinute = 80; // ~5 km/h = ~80 m/min
    return Math.round(distance / walkingSpeedMetersPerMinute);
  };

  // Fetch route options when a location is selected
  useEffect(() => {
    if (userLocation && selectedLocation) {
      const fetchRouteOptions = async () => {
        setIsLoadingRouteOptions(true);
        try {
          const plans = await planRoute(
            userLocation.latitude,
            userLocation.longitude,
            selectedLocation.lat,
            selectedLocation.lng
          );

          // Calculate walking time
          const walkTime = calculateWalkingTime(
            userLocation.latitude,
            userLocation.longitude,
            selectedLocation.lat,
            selectedLocation.lng
          );
          setWalkingTime(walkTime);

          // Filter plans to only include those with at least one transit segment
          const plansWithTransit = plans.filter((plan) =>
            plan.segments.some((segment) => segment.type === "transit")
          );

          // Convert plans to route options
          const now = new Date();
          const options: RouteOption[] = plansWithTransit
            .slice(0, 3)
            .map((plan, index) => {
              // Parse departure time (format: HH:MM:SS or HH:MM)
              const departureTimeStr = plan.departure_time;
              const timeParts = departureTimeStr.split(":");
              const hours = parseInt(timeParts[0], 10);
              const minutes = parseInt(timeParts[1] || "0", 10);
              const seconds = parseInt(timeParts[2] || "0", 10);

              // Create departure date for today
              const departureDate = new Date(now);
              departureDate.setHours(hours, minutes, seconds, 0);

              // If departure time is in the past, assume it's for tomorrow
              if (departureDate.getTime() < now.getTime()) {
                departureDate.setDate(departureDate.getDate() + 1);
              }

              // Calculate difference
              const finalDiffMs = departureDate.getTime() - now.getTime();
              const minutesUntilDeparture = Math.max(
                0,
                Math.round(finalDiffMs / (1000 * 60))
              );

              // Format departure time
              const hours12 = departureDate.getHours() % 12 || 12;
              const ampm = departureDate.getHours() >= 12 ? "PM" : "AM";
              const departureTime = `${hours12}:${String(
                departureDate.getMinutes()
              ).padStart(2, "0")} ${ampm}`;

              // Calculate totalDuration from segments if plan.estimated_duration_minutes is missing or 0
              let totalDuration = plan.estimated_duration_minutes || 0;
              if (
                totalDuration === 0 &&
                plan.segments &&
                plan.segments.length > 0
              ) {
                // Sum up all segment durations
                totalDuration = plan.segments.reduce(
                  (sum, segment) => sum + (segment.duration_minutes || 0),
                  0
                );
              }
              // Ensure totalDuration is never negative or zero (at least 1 minute)
              totalDuration = Math.max(1, totalDuration);

              return {
                plan,
                routeLetter: String.fromCharCode(65 + index), // A, B, C
                departureTime,
                minutesUntilDeparture,
                totalDuration,
              };
            });

          setRouteOptions(options);
        } catch (error) {
          console.error("Error fetching route options:", error);
          setRouteOptions([]);
        } finally {
          setIsLoadingRouteOptions(false);
        }
      };

      fetchRouteOptions();
    } else {
      setRouteOptions([]);
      setWalkingTime(null);
    }
  }, [userLocation, selectedLocation]);

  // Fetch nearby routes when user location is available (only when no destination selected)
  useEffect(() => {
    if (userLocation && !selectedLocation) {
      const fetchNearbyRoutes = async () => {
        setIsLoadingRoutes(true);
        try {
          const trips = await getNearbyTrips(
            userLocation.latitude,
            userLocation.longitude,
            1000
          );

          // Group trips by route and get the earliest one for each route
          const routeMap = new Map<string, Trip>();
          trips.forEach((trip) => {
            const key = trip.route_short_name;
            if (!routeMap.has(key)) {
              routeMap.set(key, trip);
            } else {
              const existing = routeMap.get(key)!;
              if (
                trip.nearby_stop_arrival_time <
                existing.nearby_stop_arrival_time
              ) {
                routeMap.set(key, trip);
              }
            }
          });

          // Convert to RouteItem format
          const routes: RouteItem[] = Array.from(routeMap.values())
            .map((trip) => {
              const stop = stops.find((s) => s.stop_id === trip.nearby_stop_id);
              const address = stop?.stop_name || "Unknown Stop";

              // Calculate minutes until arrival
              const arrivalTime = trip.nearby_stop_arrival_time;
              const now = new Date();
              const [hours, minutes, seconds] = arrivalTime
                .split(":")
                .map(Number);
              const arrivalDate = new Date(now);
              arrivalDate.setHours(hours, minutes || 0, seconds || 0, 0);

              // If arrival time is earlier than now, assume it's tomorrow
              if (arrivalDate < now) {
                arrivalDate.setDate(arrivalDate.getDate() + 1);
              }

              const diffMs = arrivalDate.getTime() - now.getTime();
              const diffMins = Math.max(0, Math.round(diffMs / (1000 * 60)));

              return {
                routeShortName: trip.route_short_name,
                routeLongName: trip.route_long_name,
                address,
                minutes: diffMins,
                trip,
              };
            })
            .sort((a, b) => a.minutes - b.minutes)
            .slice(0, 3); // Show top 3 routes

          setNearbyRoutes(routes);
        } catch (error) {
          console.error("Error fetching nearby routes:", error);
        } finally {
          setIsLoadingRoutes(false);
        }
      };

      fetchNearbyRoutes();
    } else {
      setNearbyRoutes([]);
    }
  }, [userLocation, stops, selectedLocation]);

  const handleRoutePress = (route: RouteItem) => {
    const stop = stops.find((s) => s.stop_id === route.trip.nearby_stop_id);
    if (stop) {
      const location: Location = {
        id: stop.stop_id.toString(),
        name: stop.stop_name,
        lat: stop.lat,
        lng: stop.lon,
      };
      onLocationSelect(location);
      Keyboard.dismiss();
    }
  };

  const handleStopSelect = (stop: Stop) => {
    // Clear search and close search first
    setShowSearchResults(false);
    setIsSearchFocused(false);
    setSearchQuery("");
    // Then select the location (this will trigger route options to load)
    const location: Location = {
      id: stop.stop_id.toString(),
      name: stop.stop_name,
      lat: stop.lat,
      lng: stop.lon,
    };
    onLocationSelect(location);
    Keyboard.dismiss();
  };

  const handlePresetSelect = (preset: Location) => {
    // Clear search query and close search first
    setShowSearchResults(false);
    setIsSearchFocused(false);
    setSearchQuery("");
    // Then select the location (this will trigger route options to load)
    onLocationSelect(preset);
    Keyboard.dismiss();
  };

  const handleRouteOptionSelect = (option: RouteOption) => {
    setSelectedRouteOption(option);
    onRouteSelect(option.plan); // Also update the map
  };

  const handleBackToRoutes = () => {
    setSelectedRouteOption(null);
  };

  const formatTime = (timeString: string): string => {
    const [hours, minutes] = timeString.split(":").map(Number);
    const date = new Date();
    date.setHours(hours, minutes || 0, 0, 0);
    const hours12 = date.getHours() % 12 || 12;
    const ampm = date.getHours() >= 12 ? "PM" : "AM";
    return `${hours12}:${String(date.getMinutes()).padStart(2, "0")} ${ampm}`;
  };

  const calculateArrivalTime = (
    departureTime: string,
    durationMinutes: number
  ): string => {
    const [hours, minutes] = departureTime.split(":").map(Number);
    const date = new Date();
    date.setHours(hours, minutes || 0, 0, 0);
    date.setMinutes(date.getMinutes() + durationMinutes);
    const hours12 = date.getHours() % 12 || 12;
    const ampm = date.getHours() >= 12 ? "PM" : "AM";
    return `${hours12}:${String(date.getMinutes()).padStart(2, "0")} ${ampm}`;
  };

  const handleClearDestination = () => {
    onLocationSelect(null);
    setSearchQuery("");
  };

  const expandSheet = () => {
    setIsCollapsed(false);
    currentTranslateY.current = 0;
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  };

  const collapseSheet = () => {
    setIsCollapsed(true);
    currentTranslateY.current = EXPANDED_HEIGHT - COLLAPSED_HEIGHT;
    Animated.spring(translateY, {
      toValue: EXPANDED_HEIGHT - COLLAPSED_HEIGHT,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  };

  // Pan responder for swipe gestures
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to vertical swipes
        return Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderGrant: () => {
        translateY.setOffset(currentTranslateY.current);
        translateY.setValue(0);
      },
      onPanResponderMove: (_, gestureState) => {
        const newValue = gestureState.dy;
        // Limit the movement range
        const maxTranslate = EXPANDED_HEIGHT - COLLAPSED_HEIGHT;
        const minTranslate = 0;
        const constrainedValue = Math.max(
          minTranslate,
          Math.min(maxTranslate, newValue)
        );
        translateY.setValue(constrainedValue);
      },
      onPanResponderRelease: (_, gestureState) => {
        translateY.flattenOffset();
        const swipeDistance = gestureState.dy;
        const swipeVelocity = gestureState.vy;

        // Update current position
        currentTranslateY.current += swipeDistance;
        const maxTranslate = EXPANDED_HEIGHT - COLLAPSED_HEIGHT;
        currentTranslateY.current = Math.max(
          0,
          Math.min(maxTranslate, currentTranslateY.current)
        );

        // Determine if we should snap based on distance or velocity
        if (
          Math.abs(swipeDistance) > MIN_SWIPE_DISTANCE ||
          Math.abs(swipeVelocity) > 0.5
        ) {
          if (swipeDistance > 0 || swipeVelocity > 0) {
            // Swiping down - collapse
            collapseSheet();
          } else {
            // Swiping up - expand
            expandSheet();
          }
        } else {
          // Snap to nearest position based on current position
          const midPoint = (EXPANDED_HEIGHT - COLLAPSED_HEIGHT) / 2;
          if (currentTranslateY.current > midPoint) {
            collapseSheet();
          } else {
            expandSheet();
          }
        }
      },
    })
  ).current;

  const handleSearchFocus = () => {
    // Only open modal if not already focused (prevents double-trigger)
    if (!isSearchFocused) {
      setIsSearchFocused(true);
      setShowSearchResults(true);
    }
  };

  const handleCloseSearch = () => {
    setSearchQuery("");
    setIsSearchFocused(false);
    setShowSearchResults(false);
    Keyboard.dismiss();
  };

  const getRouteColor = (_routeName: string): string => {
    // Purple color for route icons
    return "#8b5cf6";
  };

  const renderContent = () => {
    return (
      <View style={styles.contentWrapper}>
        {/* Search Bar - Hide when showing detailed route */}
        {!selectedRouteOption && (
          <View style={styles.searchContainer}>
            <View style={styles.searchIcon}>
              <Text style={styles.searchIconText}>🔍</Text>
            </View>
            <TextInput
              style={styles.searchInput}
              placeholder="Where to?"
              placeholderTextColor="#9ca3af"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={handleSearchFocus}
              returnKeyType="search"
              autoFocus={isSearchFocused}
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
            {isSearchFocused && (
              <TouchableOpacity
                onPress={handleCloseSearch}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Search Results */}
        {isSearchFocused && showSearchResults && (
          <View style={styles.searchResults}>
            {searchQuery.trim() === "" ? (
              // Show preset locations when search is empty but focused
              <View>
                {PRESET_LOCATIONS.map((preset) => (
                  <TouchableOpacity
                    key={preset.id}
                    style={styles.searchResultItem}
                    onPress={() => handlePresetSelect(preset)}
                  >
                    <Text style={styles.searchResultText}>{preset.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : filteredStops.length > 0 ? (
              <FlatList
                data={filteredStops}
                keyExtractor={(item) => item.stop_id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.searchResultItem}
                    onPress={() => handleStopSelect(item)}
                  >
                    <Text style={styles.searchResultText}>
                      {item.stop_name}
                    </Text>
                  </TouchableOpacity>
                )}
                style={styles.searchResultsList}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled={true}
              />
            ) : (
              <View style={styles.noResultsContainer}>
                <Text style={styles.noResultsText}>No stops found</Text>
              </View>
            )}
          </View>
        )}

        {/* Destination Display - Show when location is selected but not in detailed route view */}
        {!isSearchFocused &&
          !showSearchResults &&
          selectedLocation &&
          !selectedRouteOption && (
            <View style={styles.destinationContainer}>
              <View style={styles.destinationInput}>
                <Text style={styles.destinationIcon}>📍</Text>
                <Text style={styles.destinationText} numberOfLines={1}>
                  {selectedLocation.name}
                </Text>
                <TouchableOpacity
                  onPress={handleClearDestination}
                  style={styles.clearButton}
                >
                  <Text style={styles.clearButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

        {/* Detailed Route View - Show when a route is selected */}
        {!isSearchFocused &&
          !showSearchResults &&
          selectedLocation &&
          selectedRouteOption && (
            <ScrollView
              style={styles.detailedRouteScrollView}
              contentContainerStyle={styles.detailedRouteContainer}
              showsVerticalScrollIndicator={true}
            >
              {/* Arrival info with back button on the right */}
              <View style={styles.arrivalHeader}>
                <View style={styles.arrivalInfo}>
                  <Text style={styles.arrivalTime}>
                    Arrive at{" "}
                    {calculateArrivalTime(
                      selectedRouteOption.plan.departure_time,
                      selectedRouteOption.totalDuration
                    )}
                  </Text>
                  <Text style={styles.arrivalDetails}>
                    {selectedRouteOption.totalDuration} min · Go in{" "}
                    {selectedRouteOption.minutesUntilDeparture} mins
                  </Text>
                </View>
                {/* Back button */}
                <TouchableOpacity
                  onPress={handleBackToRoutes}
                  style={styles.backButtonRight}
                >
                  <Text style={styles.backButtonText}>← Back</Text>
                </TouchableOpacity>
              </View>

              {/* Timeline with route letter */}
              <View style={styles.routeTimelineBar}>
                <View style={styles.routeTimelineDots}>
                  {Array.from({ length: 20 }).map((_, i) => (
                    <View key={i} style={styles.routeTimelineDot} />
                  ))}
                </View>
                <View style={styles.routeTimelineLetter}>
                  <Text style={styles.routeTimelineLetterText}>
                    {selectedRouteOption.routeLetter}
                  </Text>
                </View>
              </View>

              {/* Route segments */}
              <View style={styles.routeSegmentsContainer}>
                {selectedRouteOption.plan.segments.map((segment, segIndex) => {
                  const isTransit = segment.type === "transit";
                  const isFirstSegment = segIndex === 0;
                  const isLastSegment =
                    segIndex === selectedRouteOption.plan.segments.length - 1;
                  const prevSegment =
                    segIndex > 0
                      ? selectedRouteOption.plan.segments[segIndex - 1]
                      : null;
                  const nextSegment =
                    segIndex < selectedRouteOption.plan.segments.length - 1
                      ? selectedRouteOption.plan.segments[segIndex + 1]
                      : null;

                  if (isTransit) {
                    const fromStop = stops.find(
                      (s) => s.stop_id === segment.from_stop_id
                    );
                    const toStop = stops.find(
                      (s) => s.stop_id === segment.to_stop_id
                    );
                    return (
                      <View key={segIndex} style={styles.transitSegment}>
                        <View style={styles.transitLine}>
                          {prevSegment && prevSegment.type === "walk" && (
                            <View style={styles.transitLineTop} />
                          )}
                          {fromStop && (
                            <View style={styles.transitLineMiddle} />
                          )}
                          {toStop && <View style={styles.transitLineMiddle} />}
                          {nextSegment && nextSegment.type === "walk" && (
                            <View style={styles.transitLineBottom} />
                          )}
                        </View>
                        <View style={styles.transitStops}>
                          {fromStop && (
                            <View style={styles.transitStop}>
                              <Text style={styles.transitStopName}>
                                {fromStop.stop_name}
                              </Text>
                              <Text style={styles.transitStopTime}>
                                {segment.departure_time
                                  ? formatTime(segment.departure_time)
                                  : ""}
                              </Text>
                            </View>
                          )}
                          {fromStop &&
                            toStop &&
                            fromStop.stop_id !== toStop.stop_id && (
                              <Text style={styles.transitStopNote}>
                                1 stop before...
                              </Text>
                            )}
                          {toStop && (
                            <View style={styles.transitStop}>
                              <Text style={styles.transitStopName}>
                                {toStop.stop_name}
                              </Text>
                              <Text style={styles.transitStopTime}>
                                {segment.arrival_time
                                  ? formatTime(segment.arrival_time)
                                  : ""}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    );
                  } else {
                    // Walking segment
                    return (
                      <View key={segIndex} style={styles.walkingSegment}>
                        <View style={styles.walkingLineContainer}>
                          {Array.from({ length: 8 }).map((_, i) => (
                            <View key={i} style={styles.walkingLineDot} />
                          ))}
                        </View>
                        <View style={styles.walkingContent}>
                          <View style={styles.walkingInfo}>
                            <Text style={styles.walkingIcon}>🚶</Text>
                            <Text style={styles.walkingTime}>
                              {segment.duration_minutes} minutes
                            </Text>
                          </View>
                          {(isFirstSegment || isLastSegment) && (
                            <View style={styles.locationInfo}>
                              <Text style={styles.locationLabel}>
                                {isFirstSegment ? "Origin" : "Destination"}
                              </Text>
                              <Text style={styles.locationAddress}>
                                {isFirstSegment
                                  ? userLocation
                                    ? "Current location"
                                    : "Origin"
                                  : selectedLocation.name}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    );
                  }
                })}
              </View>

              {/* Other Options Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>OTHER OPTIONS</Text>
                {selectedLocation && walkingTime !== null && (
                  <TouchableOpacity style={styles.walkOption}>
                    <Text style={styles.walkOptionText}>Walk</Text>
                    <View style={styles.walkOptionLine}>
                      {Array.from({ length: 20 }).map((_, i) => {
                        return <View key={i} style={styles.walkDot} />;
                      })}
                    </View>
                    <Text style={styles.walkOptionTime}>{walkingTime} min</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.optionItem}>
                  <View style={styles.optionIcon}>
                    <Text style={styles.optionIconText}>🚗</Text>
                  </View>
                  <View style={styles.optionInfo}>
                    <Text style={styles.optionName}>NYU Safe Ride</Text>
                    <Text style={styles.optionDescription}>
                      Available until 7 AM
                    </Text>
                  </View>
                  <Text style={styles.externalLink}>↗</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}

        {/* Route Options - Show when location is selected but no route selected */}
        {!isSearchFocused &&
          !showSearchResults &&
          selectedLocation &&
          !selectedRouteOption &&
          (isLoadingRouteOptions ? (
            <View style={styles.section}>
              <ActivityIndicator
                size="small"
                color="#8b5cf6"
                style={styles.loader}
              />
            </View>
          ) : routeOptions.length > 0 ? (
            <View style={styles.section}>
              {routeOptions.map((option, index) => {
                // Calculate segment proportions
                // Use totalDuration from the option (already calculated with fallback)
                const totalDuration = option.totalDuration;
                const segments = option.plan.segments;

                return (
                  <TouchableOpacity
                    key={index}
                    style={styles.routeOptionContainer}
                    onPress={() => handleRouteOptionSelect(option)}
                  >
                    <View style={styles.routeOptionTimeline}>
                      {(() => {
                        // Calculate minimum widths to ensure even spacing
                        const MIN_TRANSIT_WIDTH_PERCENT = 15; // Minimum 15% for transit segments
                        const MIN_WALK_WIDTH_PERCENT = 8; // Minimum 8% for walk segments

                        // Step 1: Calculate true proportional widths based on duration
                        // Guard against division by zero
                        const safeTotalDuration =
                          totalDuration > 0 ? totalDuration : 1;
                        const trueProportionalWidths = segments.map(
                          (segment) => {
                            const isTransit = segment.type === "transit";
                            const baseWidth =
                              (segment.duration_minutes / safeTotalDuration) *
                              100;
                            return {
                              width: baseWidth,
                              isTransit,
                              duration: segment.duration_minutes,
                            };
                          }
                        );

                        // Step 2: Find the smallest transit segment
                        const transitSegments = trueProportionalWidths.filter(
                          (seg) => seg.isTransit
                        );
                        const smallestTransitWidth =
                          transitSegments.length > 0
                            ? Math.min(
                                ...transitSegments.map((seg) => seg.width)
                              )
                            : MIN_TRANSIT_WIDTH_PERCENT;

                        // Step 3: If smallest transit is below minimum, scale up ALL segments proportionally
                        let scaleFactor = 1;
                        if (smallestTransitWidth < MIN_TRANSIT_WIDTH_PERCENT) {
                          // Calculate scale factor to make smallest transit reach minimum
                          scaleFactor =
                            MIN_TRANSIT_WIDTH_PERCENT / smallestTransitWidth;
                        }

                        // Step 4: Apply scale factor to all segments (maintains visual proportionality)
                        const scaledWidths = trueProportionalWidths.map(
                          (seg) => ({
                            ...seg,
                            width: seg.width * scaleFactor,
                          })
                        );

                        // Step 5: Apply minimums to walk segments (but transit is already at minimum or above)
                        const adjustedWidths = scaledWidths.map((seg) => {
                          if (!seg.isTransit) {
                            // For walk segments, ensure minimum
                            return {
                              ...seg,
                              width: Math.max(
                                seg.width,
                                MIN_WALK_WIDTH_PERCENT
                              ),
                            };
                          }
                          // Transit segments are already at minimum or above
                          return seg;
                        });

                        // Step 6: If total exceeds 100%, scale down proportionally (maintains ratios)
                        const totalWidth = adjustedWidths.reduce(
                          (sum, seg) => sum + seg.width,
                          0
                        );

                        let finalWidths = adjustedWidths;
                        if (totalWidth > 100) {
                          const finalScaleFactor = 100 / totalWidth;
                          finalWidths = adjustedWidths.map((seg) => ({
                            ...seg,
                            width: seg.width * finalScaleFactor,
                          }));
                        }

                        return segments.map((segment, segIndex) => {
                          const isTransit = segment.type === "transit";
                          const isFirstTransit =
                            isTransit &&
                            segments
                              .slice(0, segIndex)
                              .every((s) => s.type === "walk");
                          const finalWidth = finalWidths[segIndex].width;

                          return (
                            <View
                              key={segIndex}
                              style={[
                                isTransit
                                  ? styles.routeOptionTransitSegment
                                  : styles.routeOptionWalkSegment,
                                {
                                  flex: finalWidth, // Use flex instead of width percentage
                                  marginLeft: segIndex === 0 ? 0 : 1, // No margin on first segment, minimal on others
                                  marginRight:
                                    segIndex < segments.length - 1 ? 1 : 0, // Minimal spacing between segments
                                },
                              ]}
                            >
                              {isTransit && isFirstTransit && (
                                <View style={styles.routeOptionLetter}>
                                  <Text style={styles.routeOptionLetterText}>
                                    {option.routeLetter}
                                  </Text>
                                </View>
                              )}
                              {!isTransit && (
                                <View style={styles.routeOptionWalkDots}>
                                  {Array.from({
                                    length: Math.max(
                                      4,
                                      Math.floor(Math.max(0, finalWidth) / 3)
                                    ),
                                  }).map((_, i) => (
                                    <View
                                      key={i}
                                      style={styles.routeOptionWalkDot}
                                    />
                                  ))}
                                </View>
                              )}
                            </View>
                          );
                        });
                      })()}
                    </View>
                    <View style={styles.routeOptionInfo}>
                      <Text style={styles.routeOptionDeparture}>
                        Go in {option.minutesUntilDeparture} mins
                      </Text>
                      <Text style={styles.routeOptionDuration}>
                        {option.totalDuration} min
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View />
          ))}

        {/* Nearby Routes Section - Only show when not searching and no destination */}
        {!isSearchFocused && !showSearchResults && !selectedLocation && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>NEARBY ROUTES</Text>
            {isLoadingRoutes ? (
              <ActivityIndicator
                size="small"
                color="#8b5cf6"
                style={styles.loader}
              />
            ) : nearbyRoutes.length > 0 ? (
              <View style={styles.routesList}>
                {nearbyRoutes.map((route, index) => (
                  <TouchableOpacity
                    key={`${route.routeShortName}-${index}`}
                    style={styles.routeItem}
                    onPress={() => handleRoutePress(route)}
                  >
                    <View
                      style={[
                        styles.routeIcon,
                        {
                          backgroundColor: getRouteColor(route.routeShortName),
                        },
                      ]}
                    >
                      <Text style={styles.routeIconText}>
                        {route.routeShortName}
                      </Text>
                    </View>
                    <View style={styles.routeInfo}>
                      <Text style={styles.routeName}>
                        {route.routeLongName}
                      </Text>
                      <Text style={styles.routeAddress}>{route.address}</Text>
                    </View>
                    <View style={styles.routeTime}>
                      <Text style={styles.routeTimeNumber}>
                        {route.minutes}
                      </Text>
                      <Text style={styles.routeTimeLabel}>mins</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <Text style={styles.noRoutesText}>No nearby routes found</Text>
            )}
          </View>
        )}

        {/* Other Options Section - Only show when not searching and not in detailed route view */}
        {!isSearchFocused && !showSearchResults && !selectedRouteOption && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>OTHER OPTIONS</Text>
            {selectedLocation && walkingTime !== null && (
              <TouchableOpacity style={styles.walkOption}>
                <Text style={styles.walkOptionText}>Walk</Text>
                <View style={styles.walkOptionLine}>
                  {Array.from({ length: 33 }).map((_, i) => {
                    return <View key={i} style={styles.walkDot} />;
                  })}
                </View>
                <Text style={styles.walkOptionTime}>{walkingTime} min</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.optionItem}>
              <View style={styles.optionIcon}>
                <Text style={styles.optionIconText}>🚗</Text>
              </View>
              <View style={styles.optionInfo}>
                <Text style={styles.optionName}>NYU Safe Ride</Text>
                <Text style={styles.optionDescription}>
                  Available until 7 AM
                </Text>
              </View>
              <Text style={styles.externalLink}>↗</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (isSearchFocused) {
    return (
      <Modal
        visible={isSearchFocused}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCloseSearch}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={handleCloseSearch}
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalContent}
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
          >
            <View style={styles.modalInnerContent}>
              <View style={styles.modalContentWrapper}>{renderContent()}</View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    );
  }

  // Collapsed button view - always show at bottom when collapsed
  if (isCollapsed) {
    return (
      <View style={styles.collapsedContainer}>
        <TouchableOpacity
          style={styles.collapsedButton}
          onPress={() => {
            console.log("Collapsed button pressed");
            expandSheet();
          }}
          activeOpacity={0.8}
        >
          <View style={styles.collapsedHandle} />
          <View style={styles.collapsedButtonContent}>
            <Text style={styles.collapsedButtonIcon}>↑</Text>
            <Text style={styles.collapsedButtonText}>Tap to view routes</Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  }

  // Expanded bottom sheet with swipe gesture
  // Use smaller height when showing detailed route view
  const sheetHeight = selectedRouteOption
    ? DETAILED_ROUTE_HEIGHT
    : EXPANDED_HEIGHT;

  return (
    <Animated.View
      style={[
        styles.animatedContainer,
        {
          height: sheetHeight,
          transform: [{ translateY }],
        },
      ]}
    >
      {/* Drag handle */}
      <View style={styles.dragHandle} {...panResponder.panHandlers}>
        <View style={styles.dragHandleBar} />
      </View>
      <View style={styles.container}>{renderContent()}</View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalOverlay: {
    flex: 1,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalInnerContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
    minHeight: 300,
  },
  modalContentWrapper: {
    flex: 1,
    backgroundColor: "white",
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  animatedContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
    overflow: "hidden",
  },
  container: {
    flex: 1,
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  collapsedContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: COLLAPSED_HEIGHT,
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 25,
    zIndex: 1000,
  },
  collapsedButton: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "white",
  },
  collapsedHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#9ca3af",
    borderRadius: 2,
    marginBottom: 10,
  },
  collapsedButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  collapsedButtonIcon: {
    fontSize: 20,
    color: "#8b5cf6",
    fontWeight: "bold",
  },
  collapsedButtonText: {
    fontSize: 16,
    color: "#111827",
    fontWeight: "600",
  },
  dragHandle: {
    width: "100%",
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  dragHandleBar: {
    width: 40,
    height: 4,
    backgroundColor: "#d1d5db",
    borderRadius: 2,
  },
  contentWrapper: {
    flex: 1,
  },
  modalContentWrapper: {
    flex: 1,
  },
  expandedContainer: {
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 32,
    height: "85%",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 24,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchIconText: {
    fontSize: 18,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#111827",
    paddingRight: 8,
  },
  closeButton: {
    padding: 8,
    marginLeft: 8,
  },
  closeButtonText: {
    fontSize: 18,
    color: "#6b7280",
    fontWeight: "300",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6b7280",
    letterSpacing: 0.5,
    marginBottom: 12,
    textTransform: "uppercase",
  },
  loader: {
    padding: 20,
  },
  routesList: {
    gap: 12,
  },
  routeItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  routeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#8b5cf6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  routeIconText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  routeInfo: {
    flex: 1,
  },
  routeName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  routeAddress: {
    fontSize: 14,
    color: "#6b7280",
  },
  routeTime: {
    alignItems: "flex-end",
  },
  routeTimeNumber: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
    lineHeight: 24,
  },
  routeTimeLabel: {
    fontSize: 12,
    color: "#6b7280",
  },
  noRoutesText: {
    fontSize: 14,
    color: "#9ca3af",
    fontStyle: "italic",
    paddingVertical: 12,
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
    borderWidth: 2,
    borderColor: "#8b5cf6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  optionIconText: {
    fontSize: 18,
  },
  optionInfo: {
    flex: 1,
  },
  optionName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 14,
    color: "#6b7280",
  },
  externalLink: {
    fontSize: 18,
    color: "#9ca3af",
    marginLeft: 8,
  },
  searchResults: {
    marginTop: 8,
    marginBottom: 16,
    flex: 1,
    maxHeight: 500,
    backgroundColor: "white",
  },
  searchResultsList: {
    flex: 1,
  },
  noResultsContainer: {
    padding: 20,
    alignItems: "center",
  },
  noResultsText: {
    fontSize: 14,
    color: "#9ca3af",
    fontStyle: "italic",
  },
  searchResultItem: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e7eb",
  },
  searchResultText: {
    fontSize: 16,
    color: "#111827",
    fontWeight: "400",
  },
  destinationContainer: {
    marginBottom: 16,
  },
  destinationInput: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  destinationIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  destinationText: {
    flex: 1,
    fontSize: 16,
    color: "#111827",
    fontWeight: "500",
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  clearButtonText: {
    fontSize: 16,
    color: "#6b7280",
    fontWeight: "300",
  },
  routeOptionContainer: {
    marginBottom: 16,
    width: "100%", // Ensure full width
  },
  routeOptionTimeline: {
    flexDirection: "row",
    alignItems: "center",
    height: 40,
    marginBottom: 8,
    width: "100%", // Ensure full width but respect container margins
    paddingLeft: 0, // No padding on left - start at edge
    paddingRight: 0, // No padding on right - end at edge
    overflow: "hidden", // Prevent overflow
  },
  routeOptionTransitSegment: {
    backgroundColor: "#8b5cf6",
    height: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    borderRadius: 150, // Very rounded corners
    minWidth: 0, // Allow flex to shrink below content size
  },
  routeOptionWalkSegment: {
    backgroundColor: "transparent",
    height: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    minWidth: 0, // Allow flex to shrink below content size
  },
  routeOptionLetter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    left: 8,
  },
  routeOptionLetterText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#8b5cf6",
  },
  routeOptionWalkDots: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    width: "100%",
    paddingHorizontal: 4,
  },
  routeOptionWalkDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#9ca3af",
  },
  routeOptionInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 0, // Remove horizontal padding to respect margins
    marginTop: 4,
  },
  routeOptionDeparture: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "500",
  },
  routeOptionDuration: {
    fontSize: 16,
    color: "#111827",
    fontWeight: "600",
  },
  walkOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    marginBottom: 12,
  },
  walkOptionText: {
    fontSize: 16,
    color: "#111827",
    fontWeight: "500",
    marginRight: 12,
  },
  walkOptionLine: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginRight: 12,
  },
  walkDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#9ca3af",
  },
  walkOptionTime: {
    fontSize: 16,
    color: "#111827",
    fontWeight: "600",
  },
  // Detailed Route View Styles
  detailedRouteScrollView: {
    flex: 1,
  },
  detailedRouteContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  arrivalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  arrivalInfo: {
    flex: 1,
  },
  backButton: {
    paddingVertical: 8,
    marginBottom: 16,
  },
  backButtonRight: {
    paddingVertical: 8,
    paddingLeft: 16,
    alignSelf: "flex-start",
  },
  backButtonText: {
    fontSize: 16,
    color: "#8b5cf6",
    fontWeight: "600",
  },
  arrivalTime: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 4,
  },
  arrivalDetails: {
    fontSize: 16,
    color: "#111827",
  },
  routeTimelineBar: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    position: "relative",
    height: 40,
  },
  routeTimelineDots: {
    flexDirection: "row",
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
  },
  routeTimelineDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#d1d5db",
  },
  routeTimelineLetter: {
    position: "absolute",
    left: "50%",
    marginLeft: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#8b5cf6",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  routeTimelineLetterText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
  },
  routeSegmentsContainer: {
    marginTop: 8,
  },
  transitSegment: {
    flexDirection: "row",
    marginBottom: 16,
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    padding: 12,
  },
  transitLine: {
    width: 20,
    marginRight: 16,
    alignItems: "center",
    justifyContent: "flex-start",
    minHeight: 60,
  },
  transitLineTop: {
    width: 4,
    height: 12,
    backgroundColor: "#8b5cf6",
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
    marginBottom: 4,
  },
  transitLineMiddle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#8b5cf6",
    marginVertical: 6,
  },
  transitLineBottom: {
    width: 4,
    height: 12,
    backgroundColor: "#8b5cf6",
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
    marginTop: 4,
  },
  transitStops: {
    flex: 1,
  },
  transitStop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  transitStopName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    flex: 1,
  },
  transitStopTime: {
    fontSize: 16,
    color: "#111827",
  },
  transitStopNote: {
    fontSize: 14,
    color: "#6b7280",
    fontStyle: "italic",
    marginBottom: 8,
  },
  walkingSegment: {
    flexDirection: "row",
    marginBottom: 16,
    alignItems: "flex-start",
  },
  walkingLineContainer: {
    width: 2,
    marginRight: 16,
    alignItems: "center",
    justifyContent: "flex-start",
    minHeight: 40,
  },
  walkingLineDot: {
    width: 2,
    height: 4,
    backgroundColor: "#d1d5db",
    marginBottom: 2,
  },
  walkingContent: {
    flex: 1,
  },
  walkingInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  walkingIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  walkingTime: {
    fontSize: 16,
    color: "#111827",
  },
  locationInfo: {
    marginTop: 4,
  },
  locationLabel: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 4,
  },
  locationAddress: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
});
