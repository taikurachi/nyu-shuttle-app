'use client';

import { useState, useRef, useEffect } from 'react';
import { NYU_LOCATIONS, type Location } from '../types/locations';

interface SearchBarProps {
  onLocationSelect: (location: Location | null) => void;
}

export default function SearchBar({ onLocationSelect }: SearchBarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [filteredLocations, setFilteredLocations] = useState<Location[]>(NYU_LOCATIONS);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Filter locations based on search query
    if (searchQuery.trim() === '') {
      setFilteredLocations(NYU_LOCATIONS);
    } else {
      const filtered = NYU_LOCATIONS.filter((location) =>
        location.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredLocations(filtered);
    }
  }, [searchQuery]);

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLocationClick = (location: Location) => {
    setSearchQuery(location.name);
    setIsOpen(false);
    onLocationSelect(location);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setIsOpen(true);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleClear = () => {
    setSearchQuery('');
    setIsOpen(false);
    onLocationSelect(null);
  };

  return (
    <div ref={searchRef} className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] w-full max-w-md px-4">
      <div className="relative">
        <div className="flex items-center bg-white rounded-lg shadow-lg border border-gray-200">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Where to?"
              value={searchQuery}
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              className="w-full px-4 py-3 text-gray-900 placeholder-gray-500 focus:outline-none rounded-l-lg"
            />
          </div>
          {searchQuery && (
            <button
              onClick={handleClear}
              className="px-3 py-3 text-gray-400 hover:text-gray-600 focus:outline-none"
              aria-label="Clear search"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>

        {/* Dropdown results */}
        {isOpen && filteredLocations.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-60 overflow-y-auto">
            {filteredLocations.map((location) => (
              <button
                key={location.id}
                onClick={() => handleLocationClick(location)}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none transition-colors first:rounded-t-lg last:rounded-b-lg"
              >
                <div className="font-medium text-gray-900">{location.name}</div>
              </button>
            ))}
          </div>
        )}

        {isOpen && searchQuery && filteredLocations.length === 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 p-4">
            <p className="text-gray-500 text-center">No locations found</p>
          </div>
        )}
      </div>
    </div>
  );
}

