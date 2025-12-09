const API_BASE_URL = "https://nyu-transit.vercel.app";

export interface Route {
  route_id: number;
  route_short_name: string;
  route_long_name: string;
  description?: string;
}

export interface Stop {
  stop_id: number;
  stop_name: string;
  stop_description?: string;
  lat: number;
  lon: number;
}

export interface Trip {
  trip_id: number;
  route_id: number;
  route_short_name: string;
  route_long_name: string;
  nearby_stop_id: number;
  nearby_stop_arrival_time: string;
  direction_id: number;
  trip_headsign: string;
}

export interface PlanSegment {
  type: "walk" | "transit";
  from_lat: number;
  from_lon: number;
  to_lat: number;
  to_lon: number;
  duration_minutes: number;
  from_stop_id?: number;
  to_stop_id?: number;
  route_long_name?: string;
  route_short_name?: string;
  trip_id?: number;
  departure_time?: string;
  arrival_time?: string;
}

export interface Plan {
  estimated_duration_minutes: number;
  departure_time: string;
  segments: PlanSegment[];
}

/**
 * Fetch all routes from the API
 */
export async function getRoutes(): Promise<Route[]> {
  const response = await fetch(`${API_BASE_URL}/v1/routes`);
  if (!response.ok) {
    throw new Error(`Failed to fetch routes: ${response.statusText}`);
  }
  const data = await response.json();
  return data.routes || [];
}

/**
 * Fetch all stops from the API
 */
export async function getStops(): Promise<Stop[]> {
  const response = await fetch(`${API_BASE_URL}/v1/stops`);
  if (!response.ok) {
    throw new Error(`Failed to fetch stops: ${response.statusText}`);
  }
  const data = await response.json();
  return data.stops || [];
}

/**
 * Get nearby trips for a location
 */
export async function getNearbyTrips(
  lat: number,
  lon: number,
  maxDistanceMeters: number = 1000,
  timestamp?: string
): Promise<Trip[]> {
  const params = new URLSearchParams({
    lat: lat.toString(),
    lon: lon.toString(),
    max_distance_meters: maxDistanceMeters.toString(),
  });

  if (timestamp) {
    params.append("timestamp", timestamp);
  }

  const response = await fetch(`${API_BASE_URL}/v1/trips/nearby?${params}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch nearby trips: ${response.statusText}`);
  }
  const data = await response.json();
  return data.nearby_trips || [];
}

/**
 * Get next arrivals for a stop
 */
export interface NextArrival {
  route_id: number;
  trip_id: number;
  arrival_time: string;
}

export async function getStopNextArrivals(
  stopId: number,
  options?: {
    limit?: number;
    timestamp?: string;
    routeId?: number;
    directionId?: number;
  }
): Promise<NextArrival[]> {
  const params = new URLSearchParams();

  if (options?.limit) {
    params.append("limit", options.limit.toString());
  }
  if (options?.timestamp) {
    params.append("timestamp", options.timestamp);
  }
  if (options?.routeId) {
    params.append("route_id", options.routeId.toString());
  }
  if (options?.directionId !== undefined) {
    params.append("direction_id", options.directionId.toString());
  }

  const queryString = params.toString();
  const url = `${API_BASE_URL}/v1/stops/${stopId}/next_arrivals${
    queryString ? `?${queryString}` : ""
  }`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch next arrivals: ${response.statusText}`);
  }
  const data = await response.json();
  return data.next_arrivals || [];
}

/**
 * Plan a route between two locations
 */
export async function planRoute(
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number,
  timestamp?: string,
  mode: "departure" | "arrival" = "departure"
): Promise<Plan[]> {
  const params = new URLSearchParams({
    from_lat: fromLat.toString(),
    from_lon: fromLon.toString(),
    to_lat: toLat.toString(),
    to_lon: toLon.toString(),
    mode,
  });

  if (timestamp) {
    params.append("timestamp", timestamp);
  }

  const response = await fetch(`${API_BASE_URL}/v1/plan?${params}`);
  if (!response.ok) {
    throw new Error(`Failed to plan route: ${response.statusText}`);
  }
  const data = await response.json();
  return data.plans || [];
}

/**
 * Get stops for a specific trip (if API supports it)
 */
export async function getTripStops(tripId: number): Promise<Stop[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/v1/trips/${tripId}/stops`);
    if (!response.ok) {
      // If endpoint doesn't exist, return empty array
      return [];
    }
    const data = await response.json();
    return data.stops || [];
  } catch (error) {
    console.warn(`Trip stops endpoint may not be available: ${error}`);
    return [];
  }
}

/**
 * Get stops between two stop IDs for a specific trip
 * Falls back to just the two stops if trip stops endpoint is not available
 */
export async function getStopsBetween(
  tripId: number,
  fromStopId: number,
  toStopId: number,
  allStops: Stop[]
): Promise<Stop[]> {
  try {
    const tripStops = await getTripStops(tripId);

    if (tripStops.length === 0) {
      // Fallback: return just the from and to stops from allStops
      const fromStop = allStops.find((s) => s.stop_id === fromStopId);
      const toStop = allStops.find((s) => s.stop_id === toStopId);
      return [fromStop, toStop].filter(Boolean) as Stop[];
    }

    // Find the indices of from and to stops
    const fromIndex = tripStops.findIndex((s) => s.stop_id === fromStopId);
    const toIndex = tripStops.findIndex((s) => s.stop_id === toStopId);

    if (fromIndex === -1 || toIndex === -1) {
      // If stops not found in trip, return just the endpoints
      const fromStop = allStops.find((s) => s.stop_id === fromStopId);
      const toStop = allStops.find((s) => s.stop_id === toStopId);
      return [fromStop, toStop].filter(Boolean) as Stop[];
    }

    // Return all stops between from and to (inclusive)
    if (fromIndex <= toIndex) {
      return tripStops.slice(fromIndex, toIndex + 1);
    } else {
      // If going backwards, reverse the slice
      return tripStops.slice(toIndex, fromIndex + 1).reverse();
    }
  } catch (error) {
    console.warn("Error getting stops between:", error);
    // Fallback: return just the from and to stops
    const fromStop = allStops.find((s) => s.stop_id === fromStopId);
    const toStop = allStops.find((s) => s.stop_id === toStopId);
    return [fromStop, toStop].filter(Boolean) as Stop[];
  }
}

/**
 * AI Chatbot endpoint
 */
export interface AIResponse {
  text: string;
  plans: Plan[] | null;
}

export async function askAI(
  text: string,
  fromLat: number,
  fromLon: number,
  options?: {
    context?: string[];
    timestamp?: string;
  }
): Promise<AIResponse> {
  const params = new URLSearchParams({
    text,
    from_lat: fromLat.toString(),
    from_lon: fromLon.toString(),
  });

  if (options?.context && options.context.length > 0) {
    // Context should be an array of strings
    // The backend expects it as a query parameter array
    // Only send context if it's not empty
    options.context.forEach((msg) => {
      if (msg && msg.trim()) {
        params.append("context", msg);
      }
    });
  }

  if (options?.timestamp) {
    params.append("timestamp", options.timestamp);
  }

  try {
    const response = await fetch(`${API_BASE_URL}/v1/ai?${params}`);
    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      throw new Error(
        `Failed to get AI response: ${response.status} ${errorText}`
      );
    }
    const data = await response.json();
    return {
      text: data.text || "",
      plans: data.plans || null,
    };
  } catch (error) {
    console.error("Error in askAI:", error);
    throw error;
  }
}
