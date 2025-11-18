'use client';

import { useEffect, useState } from 'react';
import Map from './components/Map';
import SearchBar from './components/SearchBar';
import type { Location } from './types/locations';

export default function Home() {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);

  useEffect(() => {
    // Get user's current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation([latitude, longitude]);
          setIsLoadingLocation(false);
        },
        (error) => {
          console.error('Error getting location:', error);
          setLocationError('Unable to get your location. Please enable location permissions.');
          setIsLoadingLocation(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    } else {
      setLocationError('Geolocation is not supported by your browser.');
      setIsLoadingLocation(false);
    }
  }, []);

  const handleLocationSelect = (location: Location | null) => {
    setSelectedLocation(location);
  };

  return (
    <main className="w-full h-screen relative">
      <SearchBar onLocationSelect={handleLocationSelect} />
      <Map userLocation={userLocation} selectedLocation={selectedLocation} />
      {locationError && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-[1000] bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded-lg shadow-lg max-w-md">
          <p className="text-sm">{locationError}</p>
        </div>
      )}
    </main>
  );
}
