import React, { useState, useEffect, useRef } from 'react';

interface DirectionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    destination: {
        name: string;
        address: string;
        latitude: number;
        longitude: number;
    };
    origin: {
        latitude: number;
        longitude: number;
    };
    walkingTime?: string;
    walkingDistance?: string;
}

// Google Maps type declaration
declare global {
    interface Window {
        google: typeof google;
        initMap: () => void;
    }
}

const DirectionsModal: React.FC<DirectionsModalProps> = ({
    isOpen,
    onClose,
    destination,
    origin,
    walkingTime,
    walkingDistance
}) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const [map, setMap] = useState<any>(null);
    const [directionsService, setDirectionsService] = useState<any>(null);
    const [directionsRenderer, setDirectionsRenderer] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [routeInfo, setRouteInfo] = useState<any>(null);

    useEffect(() => {
        if (isOpen) {
            // Reset states when modal opens
            setIsLoading(true);
            setError(null);
            
            // Add a small delay to ensure DOM is ready
            setTimeout(() => {
                if (!window.google) {
                    loadGoogleMapsScript();
                } else {
                    initializeMap();
                }
            }, 100);
        }
    }, [isOpen]);

    const loadGoogleMapsScript = () => {
        const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
        
        if (!apiKey) {
            setError('Google Maps API key is not configured. Please restart your React server.');
            setIsLoading(false);
            return;
        }

        // Check if script is already loaded
        const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
        if (existingScript) {
            if (window.google && window.google.maps) {
                initializeMap();
            } else {
                // Wait for existing script to load
                setTimeout(() => {
                    if (window.google && window.google.maps) {
                        initializeMap();
                    } else {
                        setError('Google Maps script loaded but API not available. Please refresh the page.');
                        setIsLoading(false);
                    }
                }, 2000);
            }
            return;
        }

        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGoogleMaps`;
        script.async = true;
        script.defer = true;
        
        // Create a global callback function
        (window as any).initGoogleMaps = () => {
            delete (window as any).initGoogleMaps; // Clean up
            initializeMap();
        };
        
        script.onerror = () => {
            setError('Failed to load Google Maps. Please check your internet connection and API key.');
            setIsLoading(false);
        };
        
        document.head.appendChild(script);
    };

    const initializeMap = () => {
        if (!mapRef.current) {
            setError('Map container not ready. Please try again.');
            setIsLoading(false);
            return;
        }
        
        if (!window.google || !window.google.maps) {
            setError('Google Maps API not available. Please refresh the page.');
            setIsLoading(false);
            return;
        }

        try {
            // Create map centered between origin and destination
            const bounds = new window.google.maps.LatLngBounds();
            bounds.extend(new window.google.maps.LatLng(origin.latitude, origin.longitude));
            bounds.extend(new window.google.maps.LatLng(destination.latitude, destination.longitude));
            
            const mapInstance = new window.google.maps.Map(mapRef.current, {
                zoom: 15,
                center: bounds.getCenter(),
                // ...existing styles...
                styles: [
                    // Ultra-modern Foodle-themed styling
                    {
                        "featureType": "all",
                        "elementType": "labels.text.fill",
                        "stylers": [{"color": "#2D3748"}] // Darker grey text for better contrast
                    },
                    {
                        "featureType": "all",
                        "elementType": "labels.text.stroke",
                        "stylers": [{"color": "#ffffff"}, {"weight": 3}] // Thicker white outline
                    },
                    {
                        "featureType": "all",
                        "elementType": "geometry.fill",
                        "stylers": [{"color": "#F8FAFC"}] // Slightly cooler light grey background
                    },
                    {
                        "featureType": "road",
                        "elementType": "geometry.fill",
                        "stylers": [{"color": "#ffffff"}] // Pure white roads
                    },
                    {
                        "featureType": "road",
                        "elementType": "geometry.stroke",
                        "stylers": [{"color": "#CBD5E0"}, {"weight": 1.5}] // Slightly thicker grey road borders
                    },
                    {
                        "featureType": "road.highway",
                        "elementType": "geometry.fill",
                        "stylers": [{"color": "#FFF5F5"}] // Very subtle red tint for highways
                    },
                    {
                        "featureType": "road.highway",
                        "elementType": "geometry.stroke",
                        "stylers": [{"color": "#E53E3E"}, {"weight": 2.5}] // Thicker Foodle red highway borders
                    },
                    {
                        "featureType": "road.arterial",
                        "elementType": "geometry.fill",
                        "stylers": [{"color": "#ffffff"}] // White arterial roads
                    },
                    {
                        "featureType": "road.arterial",
                        "elementType": "geometry.stroke",
                        "stylers": [{"color": "#E2E8F0"}, {"weight": 1}] // Light grey arterial borders
                    },
                    {
                        "featureType": "poi",
                        "elementType": "geometry.fill",
                        "stylers": [{"color": "#EDF2F7"}] // Light grey POIs
                    },
                    {
                        "featureType": "poi.business",
                        "elementType": "labels.icon",
                        "stylers": [{"color": "#E53E3E"}] // Foodle red for business icons
                    },
                    {
                        "featureType": "poi.park",
                        "elementType": "geometry.fill",
                        "stylers": [{"color": "#C6F6D5"}] // Fresh green parks
                    },
                    {
                        "featureType": "water",
                        "elementType": "geometry.fill",
                        "stylers": [{"color": "#90CDF4"}] // More vibrant blue water
                    },
                    {
                        "featureType": "transit",
                        "elementType": "geometry.fill",
                        "stylers": [{"color": "#E2E8F0"}] // Light grey transit
                    },
                    {
                        "featureType": "landscape",
                        "elementType": "geometry.fill",
                        "stylers": [{"color": "#F8FAFC"}] // Clean background
                    },
                    {
                        "featureType": "administrative",
                        "elementType": "geometry.stroke",
                        "stylers": [{"color": "#A0AEC0"}, {"weight": 1}] // Slightly darker grey borders
                    },
                    {
                        "featureType": "administrative.locality",
                        "elementType": "labels.text.fill",
                        "stylers": [{"color": "#2D3748"}] // Dark text for localities
                    },
                    {
                        "featureType": "administrative.neighborhood",
                        "elementType": "labels.text.fill",
                        "stylers": [{"color": "#4A5568"}] // Medium grey for neighborhoods
                    }
                ],
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: false,
                zoomControl: true,
                zoomControlOptions: {
                    position: window.google.maps.ControlPosition.RIGHT_BOTTOM
                },
                gestureHandling: 'auto', // Allow zoom without ctrl
                disableDefaultUI: true
            });

            // Create directions service and renderer with custom styling
            const directionsServiceInstance = new window.google.maps.DirectionsService();
            const directionsRendererInstance = new window.google.maps.DirectionsRenderer({
                map: mapInstance,
                suppressMarkers: true, // No markers - just clean route line
                polylineOptions: {
                    strokeColor: '#E53E3E', // Foodle red
                    strokeWeight: 6, // Thicker route line
                    strokeOpacity: 1.0,
                    geodesic: true
                },
                preserveViewport: false
            });

            setMap(mapInstance);
            setDirectionsService(directionsServiceInstance);
            setDirectionsRenderer(directionsRendererInstance);

            // Calculate and display route
            calculateRoute(directionsServiceInstance, directionsRendererInstance, mapInstance);

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setError(`Failed to initialize map: ${errorMessage}`);
            setIsLoading(false);
        }
    };

    const calculateRoute = (service: any, renderer: any, mapInstance: any) => {
        console.log('🗺️ DirectionsModal - Calculating route:');
        console.log('🗺️ Origin (stored location):', origin);
        console.log('🗺️ Destination (restaurant):', destination);
        
        const request = {
            origin: new window.google.maps.LatLng(origin.latitude, origin.longitude),
            destination: new window.google.maps.LatLng(destination.latitude, destination.longitude),
            travelMode: window.google.maps.TravelMode.WALKING,
            unitSystem: window.google.maps.UnitSystem.METRIC,
        };

        service.route(request, (result: any, status: any) => {
            if (status === 'OK') {
                renderer.setDirections(result);
                setRouteInfo(result.routes[0]);
                setIsLoading(false);
                console.log('🗺️ Route calculated successfully');
            } else {
                setError('Failed to calculate directions');
                setIsLoading(false);
                console.error('🗺️ Route calculation failed:', status);
            }
        });
    };

    const openInGoogleMaps = () => {
        const mapsUrl = `https://www.google.com/maps/dir/${origin.latitude},${origin.longitude}/${destination.latitude},${destination.longitude}/@${destination.latitude},${destination.longitude},15z/data=!3m1!4b1!4m2!4m1!3e2`;
        window.open(mapsUrl, '_blank');
    };

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={onClose} // Click outside to close
        >
            <div 
                className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
            >
                {/* Header with close button */}
                <div className="bg-gradient-to-r from-foodle-red to-red-600 text-white p-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold">Walking to {destination.name}</h2>
                        <button
                            onClick={onClose}
                            className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    
                    {/* Route Summary */}
                    <div className="mt-2 flex items-center gap-4 text-red-100 text-sm">
                        {walkingTime && (
                            <div className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>{walkingTime}</span>
                            </div>
                        )}
                        {walkingDistance && (
                            <div className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                </svg>
                                <span>{walkingDistance}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Map Container */}
                <div className="relative">
                    {isLoading && (
                        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-10">
                            <div className="text-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foodle-red mx-auto mb-4"></div>
                                <p className="text-gray-600">Loading directions...</p>
                            </div>
                        </div>
                    )}
                    
                    {error && (
                        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-10">
                            <div className="text-center p-6">
                                <svg className="w-12 h-12 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                </svg>
                                <p className="text-red-600 font-medium">Unable to load map</p>
                                <p className="text-gray-600 text-sm mt-2">Click outside to close</p>
                            </div>
                        </div>
                    )}
                    
                    <div ref={mapRef} className="w-full h-96"></div>
                </div>
            </div>
        </div>
    );
};

export default DirectionsModal;
