import React, { useState } from 'react';
import { API_BASE_URL } from '../config/api';
import DirectionsModal from './DirectionsModal';

interface AIRecommendationProps {
    onFindRestaurants?: () => void;
}

interface Restaurant {
    name: string;
    address: string;
    rating?: number;
    reviewCount?: number;
    cuisine?: string;
    diningStyle?: string;
    distance?: string;
    websiteLink?: string;
    walkingTime?: string;
    walkingDistance?: string;
    directions?: any[];
    photos?: Array<{
        url: string;
        width: number;
        height: number;
        attributions: string[];
    }>;
    // Add coordinates for directions
    latitude?: number;
    longitude?: number;
    placeId?: string;
}

interface AIRecommendationResponse {
    restaurant: Restaurant;
}

const AIRecommendation: React.FC<AIRecommendationProps> = ({ onFindRestaurants }) => {
    const [recommendation, setRecommendation] = useState<Restaurant | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showDirections, setShowDirections] = useState(false);
    const [userLocation, setUserLocation] = useState<{latitude: number; longitude: number} | null>(null);

    const getAIRecommendation = async () => {
        setIsLoading(true);
        setRecommendation(null);
        
        try {
            console.log('🤖 Starting AI recommendation process...');
            
            // Try to use stored location first (highest priority)
            try {
                const profileResponse = await fetch(`${API_BASE_URL}/api/user/profile`, {
                    method: 'GET',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                    }
                });
                
                if (profileResponse.ok) {
                    const profileData = await profileResponse.json();
                    
                    if (profileData.lastKnownLocation && 
                        profileData.lastKnownLocation.latitude && 
                        profileData.lastKnownLocation.longitude) {
                        
                        // Check if stored location is recent enough (within 24 hours)
                        const locationAge = Date.now() - new Date(profileData.lastKnownLocation.timestamp).getTime();
                        const hoursOld = locationAge / (1000 * 60 * 60);
                        
                        if (hoursOld <= 24) {
                            console.log(`✅ Using stored location (${hoursOld.toFixed(1)}h old) for recommendation`);
                            await makeRecommendationRequest();
                            return;
                        } else {
                            console.log(`⏰ Stored location is too old (${hoursOld.toFixed(1)}h), trying current location`);
                        }
                    }
                }
            } catch (profileError) {
                console.log('⚠️ Could not get profile data, trying current location');
            }
            
            // Try current location (second priority)
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    async (position) => {
                        console.log('📍 Got current location for recommendation');
                        await makeRecommendationRequest();
                    },
                    async (error) => {
                        console.log('❌ GPS failed for recommendation:', error.message);
                        
                        // Only show QR code as last resort if we have the callback
                        if (onFindRestaurants) {
                            console.log('📱 Showing QR code as last resort');
                            setIsLoading(false);
                            onFindRestaurants();
                        } else {
                            setIsLoading(false);
                            alert('Location access is required for restaurant recommendations. Please enable location access.');
                        }
                    },
                    {
                        enableHighAccuracy: false,
                        timeout: 8000,
                        maximumAge: 60000
                    }
                );
            } else {
                // No geolocation support - show QR code as fallback
                if (onFindRestaurants) {
                    console.log('� No geolocation support, showing QR code');
                    setIsLoading(false);
                    onFindRestaurants();
                } else {
                    setIsLoading(false);
                    alert('Geolocation is not supported by this browser.');
                }
            }
        } catch (error) {
            console.error('❌ Error in recommendation process:', error);
            setIsLoading(false);
        }
    };

    const makeRecommendationRequest = async () => {
        try {
            console.log('🤖 Making AI recommendation request...');
            
            // First, try to get user's stored location from their profile
            let userLocation = null;
            
            try {
                const profileResponse = await fetch(`${API_BASE_URL}/api/user/profile`, {
                    method: 'GET',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                    }
                });
                
                if (profileResponse.ok) {
                    const profileData = await profileResponse.json();
                    console.log('📊 Profile data for recommendation:', profileData);
                    
                    if (profileData.lastKnownLocation && 
                        profileData.lastKnownLocation.latitude && 
                        profileData.lastKnownLocation.longitude) {
                        userLocation = {
                            latitude: profileData.lastKnownLocation.latitude,
                            longitude: profileData.lastKnownLocation.longitude
                        };
                        console.log('📍 Using stored location for recommendation:', userLocation);
                    }
                }
            } catch (profileError) {
                console.log('⚠️ Could not get profile data:', profileError);
            }
            
            // If no stored location, try to get current location
            if (!userLocation) {
                console.log('📍 No stored location, trying to get current GPS location...');
                
                if (navigator.geolocation) {
                    try {
                        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                            navigator.geolocation.getCurrentPosition(resolve, reject, {
                                enableHighAccuracy: false,
                                timeout: 8000,
                                maximumAge: 60000
                            });
                        });
                        
                        userLocation = {
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude
                        };
                        console.log('📍 Using current GPS location for recommendation:', userLocation);
                    } catch (geoError) {
                        console.log('❌ Could not get current location:', geoError);
                    }
                }
            }
            
            // If still no location, show error instead of QR code
            if (!userLocation) {
                console.log('❌ No location available for recommendation');
                throw new Error('Location is required for restaurant recommendations. Please enable location access or scan the QR code with your phone.');
            }
            
            console.log('🤖 Making recommendation request with location:', userLocation);
            
            const response = await fetch(`${API_BASE_URL}/api/recommend-restaurant`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    location: userLocation,
                    userPreferences: 'general food preferences',
                    priceRange: '$$',
                    moodOrOccasion: 'casual dining'
                })
            });

            console.log('🤖 Recommendation response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Recommendation error response:', errorText);
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const data: AIRecommendationResponse = await response.json();
            console.log('✅ AI Recommendation data received:', data);
            console.log('🍽️ Restaurant rating:', data.restaurant?.rating);
            console.log('🍽️ Restaurant reviewCount:', data.restaurant?.reviewCount);
            
            // Store user location for directions
            setUserLocation(userLocation);
            setRecommendation(data.restaurant);
            
        } catch (err) {
            console.error('❌ Error getting AI recommendation:', err);
            
            // Provide more specific error messages
            let errorMessage = 'Unknown error';
            if (err instanceof Error) {
                if (err.message.includes('Failed to fetch')) {
                    errorMessage = `Cannot connect to server at ${API_BASE_URL}. Make sure backend is running on port 5000.`;
                } else if (err.message.includes('NetworkError')) {
                    errorMessage = `Network error: ${err.message}`;
                } else {
                    errorMessage = err.message;
                }
            }
            
            // Show error message to user instead of silently failing
            alert(`Failed to get restaurant recommendation: ${errorMessage}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-4">
            <button
                onClick={getAIRecommendation}
                disabled={isLoading}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                    isLoading
                        ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                        : 'bg-foodle-red text-white hover:bg-red-600'
                }`}
            >
                {isLoading ? 'Getting Recommendation...' : 'Get Restaurant Recommendation'}
            </button>

            {recommendation && (
                <div className="mt-4">
                    <p className="text-lg font-semibold">{recommendation.name}</p>
                    <p className="text-gray-600">{recommendation.address}</p>
                    <p className="text-gray-500 text-sm">
                        {recommendation.rating 
                            ? `${recommendation.rating} stars` 
                            : 'No rating available'}
                        {recommendation.reviewCount 
                            ? ` (${recommendation.reviewCount} reviews)` 
                            : ' (No reviews available)'}
                        {recommendation.distance && ` • ${recommendation.distance}`}
                        {recommendation.walkingTime && ` • 🚶 ${recommendation.walkingTime}`}
                    </p>
                    {(recommendation.cuisine || recommendation.diningStyle) && (
                        <p className="text-gray-600 text-sm">
                            {recommendation.cuisine || 'Unknown'} • {recommendation.diningStyle || 'Unknown'}
                        </p>
                    )}
                    {recommendation.websiteLink && (
                        <div className="mt-3">
                            <a 
                                href={recommendation.websiteLink} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors mr-3"
                            >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                                {recommendation.websiteLink.includes('google.com/maps') ? 'View on Google Maps' : 'Visit Website'}
                            </a>
                            
                            {recommendation.walkingTime && (
                                <button
                                    onClick={() => setShowDirections(true)}
                                    className="inline-flex items-center px-4 py-2 bg-foodle-red text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-colors"
                                >
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    Show Walking Directions ({recommendation.walkingTime})
                                </button>
                            )}
                        </div>
                    )}
                    
                    {recommendation.photos && recommendation.photos.length > 0 && (
                        <div className="mt-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Photos</h4>
                            <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                                {recommendation.photos.map((photo, index) => (
                                    <div 
                                        key={index} 
                                        className="flex-shrink-0 w-32 h-24 rounded-lg overflow-hidden shadow-sm border border-gray-200"
                                    >
                                        <img 
                                            src={photo.url} 
                                            alt={`${recommendation.name} photo ${index + 1}`}
                                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-200 cursor-pointer"
                                            onClick={() => window.open(photo.url, '_blank')}
                                            onError={(e) => {
                                                // Hide broken images
                                                const target = e.target as HTMLImageElement;
                                                target.style.display = 'none';
                                            }}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Directions Modal */}
            {showDirections && recommendation && userLocation && (
                <DirectionsModal
                    isOpen={showDirections}
                    onClose={() => setShowDirections(false)}
                    destination={{
                        name: recommendation.name,
                        address: recommendation.address,
                        latitude: recommendation.latitude || 0,
                        longitude: recommendation.longitude || 0,
                    }}
                    origin={userLocation}
                    walkingTime={recommendation.walkingTime}
                    walkingDistance={recommendation.walkingDistance}
                />
            )}
        </div>
    );
};

export default AIRecommendation;
