import React, { useState, useEffect, useRef } from 'react';

// Extend Window interface to include google
declare global {
  interface Window {
    google: typeof google;
  }
}

interface WalkingStep {
  instruction: string;
  distance: string;
  duration: string;
  startLocation: {
    lat: number;
    lng: number;
  };
  endLocation: {
    lat: number;
    lng: number;
  };
  polyline: string;
}

interface WalkingRoute {
  distance: string;
  duration: string;
  startAddress: string;
  endAddress: string;
  polyline: string;
  bounds: {
    northeast: { lat: number; lng: number };
    southwest: { lat: number; lng: number };
  };
}

interface WalkingDirectionsData {
  route: WalkingRoute;
  steps: WalkingStep[];
  restaurantName: string;
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
}

interface WalkingMapProps {
  restaurant: {
    name: string;
    location: {
      lat: number;
      lng: number;
    };
    placeId: string;
  };
  userLocation: {
    lat: number;
    lng: number;
  };
  onClose: () => void;
}

const WalkingMap: React.FC<WalkingMapProps> = ({ restaurant, userLocation, onClose }) => {
  const [directionsData, setDirectionsData] = useState<WalkingDirectionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSteps, setShowSteps] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const directionsRenderer = useRef<google.maps.DirectionsRenderer | null>(null);

  // Decode polyline function
  const decodePolyline = (encoded: string): google.maps.LatLng[] => {
    const points: google.maps.LatLng[] = [];
    let index = 0;
    const len = encoded.length;
    let lat = 0;
    let lng = 0;

    while (index < len) {
      let b: number;
      let shift = 0;
      let result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
      lng += dlng;

      points.push(new google.maps.LatLng(lat / 1e5, lng / 1e5));
    }

    return points;
  };

  // Fetch walking directions
  useEffect(() => {
    const fetchDirections = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/walking-directions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            originLat: userLocation.lat,
            originLng: userLocation.lng,
            destLat: restaurant.location.lat,
            destLng: restaurant.location.lng,
            restaurantName: restaurant.name
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch walking directions');
        }

        const data: WalkingDirectionsData = await response.json();
        setDirectionsData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchDirections();
  }, [restaurant, userLocation]);

  // Initialize Google Map
  useEffect(() => {
    if (!directionsData || !mapRef.current) return;

    const initMap = () => {
      // Foodle color scheme
      const foodleMapStyles = [
        {
          featureType: 'all',
          elementType: 'geometry.fill',
          stylers: [{ color: '#FFFBF7' }] // foodle-bg
        },
        {
          featureType: 'road',
          elementType: 'geometry.stroke',
          stylers: [{ color: '#EF4444' }, { weight: 1 }] // foodle-red
        },
        {
          featureType: 'road.highway',
          elementType: 'geometry.fill',
          stylers: [{ color: '#FEF2F2' }] // light red
        },
        {
          featureType: 'road.arterial',
          elementType: 'geometry.fill',
          stylers: [{ color: '#FEFDFB' }] // foodle-card
        },
        {
          featureType: 'poi',
          elementType: 'geometry.fill',
          stylers: [{ color: '#F3F4F6' }]
        },
        {
          featureType: 'poi.park',
          elementType: 'geometry.fill',
          stylers: [{ color: '#ECFDF5' }]
        },
        {
          featureType: 'water',
          elementType: 'geometry.fill',
          stylers: [{ color: '#DBEAFE' }]
        },
        {
          featureType: 'transit',
          elementType: 'geometry.fill',
          stylers: [{ color: '#F3F4F6' }]
        }
      ];

      const map = new google.maps.Map(mapRef.current!, {
        zoom: 15,
        center: userLocation,
        styles: foodleMapStyles,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false
      });

      googleMapRef.current = map;

      // Create custom markers
      const startMarker = new google.maps.Marker({
        position: userLocation,
        map,
        title: 'Your Location',
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#3B82F6', // blue
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 2
        }
      });

      const endMarker = new google.maps.Marker({
        position: restaurant.location,
        map,
        title: restaurant.name,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#EF4444', // foodle-red
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 3
        }
      });

      // Draw walking path
      const pathCoordinates = decodePolyline(directionsData.route.polyline);
      
      const walkingPath = new google.maps.Polyline({
        path: pathCoordinates,
        geodesic: true,
        strokeColor: '#EF4444', // foodle-red
        strokeOpacity: 0.8,
        strokeWeight: 4
      });

      walkingPath.setMap(map);

      // Fit map to bounds
      const bounds = new google.maps.LatLngBounds();
      bounds.extend(userLocation);
      bounds.extend(restaurant.location);
      map.fitBounds(bounds);
      
      // Add some padding
      const padding = { top: 50, right: 50, bottom: 50, left: 50 };
      map.fitBounds(bounds, padding);
    };

    // Check if Google Maps is loaded
    if (window.google && window.google.maps) {
      initMap();
    } else {
      // Load Google Maps if not already loaded
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.REACT_APP_GOOGLE_PLACES_API_KEY}&libraries=geometry`;
      script.onload = initMap;
      document.head.appendChild(script);
    }
  }, [directionsData, userLocation, restaurant]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foodle-red mx-auto mb-4"></div>
          <p className="text-gray-600">Loading walking directions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 text-center max-w-md mx-4">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to Load Directions</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={onClose}
            className="bg-foodle-red text-white px-6 py-2 rounded-lg hover:bg-red-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl h-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Walking to {restaurant.name}</h2>
            {directionsData && (
              <p className="text-gray-600">
                {directionsData.route.distance} • {directionsData.route.duration}
              </p>
            )}
          </div>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Map Container */}
        <div className="flex-1 relative">
          <div ref={mapRef} className="w-full h-full" />
          
          {/* Toggle Steps Button */}
          <button
            onClick={() => setShowSteps(!showSteps)}
            className="absolute top-4 left-4 bg-white shadow-lg rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-200 flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span>Directions</span>
          </button>
        </div>

        {/* Step-by-step directions panel */}
        {showSteps && directionsData && (
          <div className="border-t border-gray-200 bg-gray-50 max-h-64 overflow-y-auto">
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Step-by-step directions</h3>
              <div className="space-y-3">
                {directionsData.steps.map((step, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="bg-foodle-red text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-900 text-sm">{step.instruction}</p>
                      <p className="text-gray-500 text-xs mt-1">{step.distance} • {step.duration}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer with action buttons */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex space-x-3">
          <button
            onClick={() => {
              const url = `https://www.google.com/maps/dir/${userLocation.lat},${userLocation.lng}/${restaurant.location.lat},${restaurant.location.lng}`;
              window.open(url, '_blank');
            }}
            className="flex-1 bg-foodle-red text-white py-2 px-4 rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            <span>Open in Google Maps</span>
          </button>
          <button
            onClick={onClose}
            className="bg-gray-200 text-gray-700 py-2 px-6 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default WalkingMap;
