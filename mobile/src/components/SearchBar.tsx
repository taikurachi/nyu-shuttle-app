import React, { useState, useEffect } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  Text,
  StyleSheet,
  Keyboard,
  ActivityIndicator,
} from "react-native";
import { getStops, type Stop } from "../services/api";
import type { Location } from "../types/locations";

interface SearchBarProps {
  onLocationSelect: (location: Location | null) => void;
}

export default function SearchBar({ onLocationSelect }: SearchBarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [stops, setStops] = useState<Stop[]>([]);
  const [filteredStops, setFilteredStops] = useState<Stop[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch stops from API on mount
  useEffect(() => {
    const fetchStops = async () => {
      try {
        setIsLoading(true);
        const stopsData = await getStops();
        setStops(stopsData);
        setFilteredStops(stopsData);
      } catch (error) {
        console.error("Error fetching stops:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStops();
  }, []);

  useEffect(() => {
    // Filter stops based on search query
    if (searchQuery.trim() === "") {
      setFilteredStops(stops);
    } else {
      const filtered = stops.filter((stop) =>
        stop.stop_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredStops(filtered);
    }
  }, [searchQuery, stops]);

  const handleLocationClick = (stop: Stop) => {
    setSearchQuery(stop.stop_name);
    setIsOpen(false);
    // Convert Stop to Location format
    const location: Location = {
      id: stop.stop_id.toString(),
      name: stop.stop_name,
      lat: stop.lat,
      lng: stop.lon,
    };
    onLocationSelect(location);
    Keyboard.dismiss();
  };

  const handleInputChange = (text: string) => {
    setSearchQuery(text);
    setIsOpen(true);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleClear = () => {
    setSearchQuery("");
    setIsOpen(false);
    onLocationSelect(null);
    Keyboard.dismiss();
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Where to?"
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={handleInputChange}
            onFocus={handleInputFocus}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
              <Text style={styles.clearButtonText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Dropdown results */}
        {isOpen && isLoading && (
          <View style={styles.dropdown}>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#3b82f6" />
              <Text style={styles.loadingText}>Loading stops...</Text>
            </View>
          </View>
        )}

        {isOpen && !isLoading && filteredStops.length > 0 && (
          <View style={styles.dropdown}>
            <FlatList
              data={filteredStops}
              keyExtractor={(item) => item.stop_id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={() => handleLocationClick(item)}
                >
                  <Text style={styles.dropdownItemText}>{item.stop_name}</Text>
                </TouchableOpacity>
              )}
              style={styles.dropdownList}
              keyboardShouldPersistTaps="handled"
            />
          </View>
        )}

        {isOpen &&
          !isLoading &&
          searchQuery.length > 0 &&
          filteredStops.length === 0 && (
            <View style={styles.dropdown}>
              <View style={styles.noResults}>
                <Text style={styles.noResultsText}>No stops found</Text>
              </View>
            </View>
          )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 40,
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  searchContainer: {
    width: "100%",
    maxWidth: 400,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#111827",
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  clearButtonText: {
    fontSize: 18,
    color: "#9ca3af",
    fontWeight: "300",
  },
  dropdown: {
    marginTop: 4,
    backgroundColor: "white",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    maxHeight: 240,
  },
  dropdownList: {
    maxHeight: 240,
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  dropdownItemText: {
    fontSize: 16,
    color: "#111827",
    fontWeight: "500",
  },
  noResults: {
    padding: 16,
    alignItems: "center",
  },
  noResultsText: {
    fontSize: 14,
    color: "#6b7280",
  },
  loadingContainer: {
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: "#6b7280",
  },
});
