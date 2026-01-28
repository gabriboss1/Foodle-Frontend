import React, { useState, useEffect, useMemo, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import DirectionsModal from '../components/DirectionsModal';
import { useToast } from '../components/Toast';
import { apiCall, API_ENDPOINTS, API_BASE_URL } from '../config/api';

interface RestaurantData {
    name: string;
    address: string;
    rating: number | string;
    reviewCount: number;
    priceLevel: string;
    walkingTime?: string | { duration: string; durationValue: number; distance: string; distanceValue: number; steps: any[] };
    placeId: string;
    location: {
        lat: number;
        lng: number;
    };
    website?: string;
    phoneNumber?: string;
    distance: number;
    photos?: Array<{
        url: string;
        width: number;
        height: number;
        attributions: string[];
    }>;
    cuisine?: string;
}

interface PreviousMeal {
    recommendationText: string;
    restaurantName: string;
    restaurantId: string;
    userQuery: string;
    timestamp: string;
    filters: any;
    restaurant?: RestaurantData;
}

const PreviousMeals: React.FC = () => {
    const [previousMeals, setPreviousMeals] = useState<PreviousMeal[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
    const [currentWalkingTimes, setCurrentWalkingTimes] = useState<{ [key: string]: string }>({});
    const [showDirections, setShowDirections] = useState(false);
    const [selectedRestaurant, setSelectedRestaurant] = useState<RestaurantData | null>(null);
    const [userLocation, setUserLocation] = useState<{latitude: number; longitude: number} | null>(null);
    
    const { showToast } = useToast();
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        fetchPreviousMeals();
    }, []);

    // Calculate walking times when meals are available
    useEffect(() => {
        if (previousMeals.length > 0) {
            console.log('🚶 Previous meals loaded, calculating walking times...');
            calculateCurrentWalkingTimes();
        }
    }, [previousMeals.length]);

    // Debounce search query to prevent rapid re-renders
    useEffect(() => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }
        
        searchTimeoutRef.current = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, 150);
        
        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, [searchQuery]);

    const calculateCurrentWalkingTimes = async (mealsToProcess?: PreviousMeal[]) => {
        // Use passed meals or current state
        const mealsData = mealsToProcess || previousMeals;
        
        console.log('🚶 === WALKING TIME CALCULATION START ===');
        console.log(`🚶 Total previous meals to process: ${mealsData.length}`);
        console.log('🚶 Meals data:', mealsData);
        
        if (mealsData.length === 0) {
            console.log('⚠️ No meals to process - aborting walking time calculation');
            return;
        }
        
        const walkingTimes: { [key: string]: string } = {};
        
        // Try to get current location
        let userLocation: { latitude: number; longitude: number } | null = null;
        
        try {
            // Try stored location first
            console.log('📍 Attempting to get stored location...');
            const profileResponse = await apiCall(API_ENDPOINTS.USER_PROFILE);
            const profileData = await profileResponse.json();
            console.log('📍 Profile data received:', profileData);
            
            if (profileData.lastKnownLocation && 
                profileData.lastKnownLocation.latitude && 
                profileData.lastKnownLocation.longitude) {
                
                userLocation = {
                    latitude: profileData.lastKnownLocation.latitude,
                    longitude: profileData.lastKnownLocation.longitude
                };
                console.log('✅ Using stored location for walking times:', userLocation);
            } else {
                console.log('⚠️ No valid stored location found in profile');
            }
        } catch (error) {
            console.log('❌ Could not get stored location:', error);
        }
        
        // If no stored location, try current GPS
        if (!userLocation) {
            console.log('📍 No stored location, attempting GPS...');
            try {
                const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, {
                        enableHighAccuracy: false,
                        timeout: 10000,
                        maximumAge: 60000
                    });
                });
                
                userLocation = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                };
                console.log('✅ GPS location obtained:', userLocation);
            } catch (error) {
                console.log('❌ GPS location failed:', error);
                console.log('🚶 === WALKING TIME CALCULATION ABORTED (NO LOCATION) ===');
                return; // Exit if no location available
            }
        }
        
        console.log(`🚶 Processing walking times for ${mealsData.length} restaurants from location:`, userLocation);
        
        // Calculate walking times for each restaurant
        for (let i = 0; i < mealsData.length; i++) {
            const meal = mealsData[i];
            const restaurant = meal.restaurant;
            const restaurantName = restaurant?.name || meal.restaurantName;
            
            console.log(`🏪 Processing restaurant ${i + 1}/${mealsData.length}: ${restaurantName}`);
            console.log(`🏪 Restaurant location:`, restaurant?.location);
            
            if (restaurant?.location && restaurant.location.lat && restaurant.location.lng) {
                try {
                    console.log(`🚀 Making walking time API call for ${restaurantName}...`);
                    const response = await fetch(`${API_BASE_URL}/api/walking-time`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            origin: userLocation,
                            destination: restaurant.location,
                            restaurantName: restaurantName
                        })
                    });
                    
                    console.log(`📡 API response status for ${restaurantName}:`, response.status);
                    
                    if (response.ok) {
                        const data = await response.json();
                        console.log(`📡 API response data for ${restaurantName}:`, data);
                        
                        if (data.walkingTime) {
                            walkingTimes[restaurantName] = data.walkingTime;
                            console.log(`✅ Walking time stored for ${restaurantName}: ${data.walkingTime}`);
                        } else {
                            console.log(`⚠️ No walkingTime in response for ${restaurantName}`);
                        }
                    } else {
                        const errorText = await response.text();
                        console.log(`❌ API error for ${restaurantName}: ${response.status} - ${errorText}`);
                    }
                } catch (error) {
                    console.log(`❌ Network error for ${restaurantName}:`, error);
                }
            } else {
                console.log(`⚠️ Invalid or missing location data for ${restaurantName}`);
                console.log(`⚠️ Location object:`, restaurant?.location);
            }
            
            // Small delay to avoid overwhelming the API
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        console.log('🚶 === FINAL WALKING TIMES SUMMARY ===');
        console.log('🚶 Walking times calculated:', walkingTimes);
        console.log('🚶 Total successful calculations:', Object.keys(walkingTimes).length);
        setCurrentWalkingTimes(walkingTimes);
        
        // Set user location state for directions modal
        if (userLocation) {
            setUserLocation(userLocation);
            console.log('✅ User location set for directions modal');
        }
        
        console.log('🚶 === WALKING TIME CALCULATION COMPLETE ===');
    };

    const fetchPreviousMeals = async () => {
        try {
            setLoading(true);
            const response = await apiCall(API_ENDPOINTS.USER_PROFILE);
            const data = await response.json();
            
            console.log('📊 Previous meals data received:', data.previousMeals);
            const rawMeals = data.previousMeals || [];
            
            setPreviousMeals(rawMeals);
            
            // Calculate walking times with the actual meals data
            if (rawMeals.length > 0) {
                console.log('🚶 Triggering walking time calculation with meals:', rawMeals);
                setTimeout(() => calculateCurrentWalkingTimes(rawMeals), 500);
            } else {
                console.log('⚠️ No meals found to calculate walking times for');
            }
        } catch (error) {
            console.error('❌ Failed to fetch previous meals:', error);
            showToast('Failed to load previous meals', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleGetDirections = (restaurant: RestaurantData) => {
        setSelectedRestaurant(restaurant);
        setShowDirections(true);
    };

    const handleRemoveMeal = async (index: number) => {
        try {
            const response = await apiCall(`/api/user/previous-meals/${index}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                showToast('✅ Meal removed successfully', 'success');
                fetchPreviousMeals(); // Refresh the list
            } else {
                const errorData = await response.json();
                showToast(`❌ Error: ${errorData.message || 'Could not remove meal'}`, 'error');
            }
        } catch (error) {
            console.error('❌ Error removing previous meal:', error);
            showToast('❌ Error removing meal. Please check your connection.', 'error');
        }
    };

    // SIMPLE SEARCH - Just filter the meals directly
    const filteredMeals = useMemo(() => {
        if (!debouncedSearchQuery.trim()) {
            return previousMeals;
        }
        
        const searchTerm = debouncedSearchQuery.toLowerCase();
        return previousMeals.filter(meal => {
            const restaurantName = (meal.restaurant?.name || meal.restaurantName || '').toLowerCase();
            const address = (meal.restaurant?.address || '').toLowerCase();
            
            return restaurantName.includes(searchTerm) || address.includes(searchTerm);
        });
    }, [previousMeals, debouncedSearchQuery]);

    // Group meals by date - simple grouping
    const groupedMeals = useMemo(() => {
        const groups: { [key: string]: PreviousMeal[] } = {};
        
        filteredMeals.forEach(meal => {
            const date = new Date(meal.timestamp).toDateString();
            if (!groups[date]) {
                groups[date] = [];
            }
            groups[date].push(meal);
        });

        // Sort groups by date (most recent first)
        return Object.keys(groups)
            .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
            .reduce((acc, date) => {
                acc[date] = groups[date].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                return acc;
            }, {} as { [key: string]: PreviousMeal[] });
    }, [filteredMeals]);

    // Format date for display
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return "Today";
        } else if (date.toDateString() === yesterday.toDateString()) {
            return "Yesterday";
        } else {
            return date.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
        }
    };

    // Photos component with Google API fresh photo fetching  
    // Global photo cache - persists across re-renders and searches
    const photoCache = useRef<{ [placeId: string]: string[] }>({});

    const PhotosWithGoogleAPI: React.FC<{ 
        restaurant: RestaurantData | undefined; 
        restaurantName: string; 
    }> = React.memo(({ restaurant, restaurantName }) => {
        // Initialize state from cache immediately - NO BLINK!
        const [freshPhotos, setFreshPhotos] = useState<string[]>(() => {
            if (restaurant?.placeId && photoCache.current[restaurant.placeId]) {
                return photoCache.current[restaurant.placeId];
            }
            return [];
        });
        
        const [photosLoading, setPhotosLoading] = useState(() => {
            // If we have cache, no loading state needed
            return !(restaurant?.placeId && photoCache.current[restaurant.placeId]);
        });

        useEffect(() => {
            const fetchFreshPhotos = async () => {
                if (!restaurant?.placeId) {
                    setPhotosLoading(false);
                    return;
                }
                
                // Check cache first - instant load!
                if (photoCache.current[restaurant.placeId]) {
                    // Already set in useState initializer, just ensure loading is false
                    setPhotosLoading(false);
                    return;
                }
                
                try {
                    const response = await fetch(`${API_BASE_URL}/api/refresh-photos`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ placeId: restaurant.placeId })
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        // Filter photos to only show food-related ones
                        const foodPhotos = data.photos || [];
                        
                        // Cache the photos for instant future loads
                        photoCache.current[restaurant.placeId] = foodPhotos;
                        setFreshPhotos(foodPhotos);
                    }
                } catch (error) {
                    // Silently handle photo errors to reduce console spam
                } finally {
                    setPhotosLoading(false);
                }
            };
            
            fetchFreshPhotos();
        }, [restaurant?.placeId]); // Only depend on placeId, not restaurantName
        
        if (photosLoading) {
            return (
                <div className="mt-4">
                    <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex-shrink-0 w-40 h-32 bg-gray-200 rounded-lg animate-pulse"></div>
                        ))}
                    </div>
                </div>
            );
        }
        
        if (!freshPhotos || freshPhotos.length === 0) {
            return null;
        }

        return (
            <div className="mt-4">
                <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar max-w-full">
                    {freshPhotos.map((photoUrl, index) => (
                        <div 
                            key={index} 
                            className="flex-shrink-0 w-48 h-36 rounded-lg overflow-hidden shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
                            onClick={() => window.open(photoUrl, '_blank')}
                        >
                            <img 
                                src={photoUrl} 
                                alt={`${restaurantName} ${index + 1}`}
                                className="w-full h-full object-cover hover:scale-105 transition-transform duration-200 cursor-pointer"
                                loading="lazy"
                                onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjRjdGOUZBIi8+CjxjaXJjbGUgY3g9IjIwMCIgY3k9IjEyMCIgcj0iMzAiIGZpbGw9IiNEMUQ1REIiLz4KPHBhdGggZD0ibTE3NSAxNjVoNTBsLTEwLTEwaC0xNWwtMTUgMTB6IiBmaWxsPSIjRDFENURCIi8+Cjx0ZXh0IHg9IjIwMCIgeT0iMjEwIiBmb250LWZhbWlseT0ic3lzdGVtLXVpLCAtYXBwbGUtc3lzdGVtLCBCbGlua01hY1N5c3RlbUZvbnQiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiNBQkIxQkEiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkltYWdlIFVuYXZhaWxhYmxlPC90ZXh0Pgo8L3N2Zz4K';
                                }}
                            />
                        </div>
                    ))}
                </div>
            </div>
        );
    });

    // Create restaurant card component
    const RestaurantCard: React.FC<{ meal: PreviousMeal; index: number }> = React.memo(({ meal, index }) => {
        const restaurant = meal.restaurant;

        return (
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                        <h3 className="text-2xl font-bold text-foodle-dark underline decoration-2 underline-offset-4">
                            {restaurant?.name || meal.restaurantName}
                        </h3>
                        <p className="text-gray-600 mt-1">{restaurant?.address || 'Address not available'}</p>
                        <div className="flex items-center space-x-2 mt-3 text-base text-gray-500">
                            {restaurant?.rating ? (
                                <>
                                    <span className="font-semibold text-gray-700">{restaurant.rating}</span>
                                    <i className="fa-solid fa-star text-yellow-400"></i>
                                    <span>({restaurant.reviewCount || 0} reviews)</span>
                                    <span className="text-gray-300">•</span>
                                    <span>{restaurant.priceLevel}</span>
                                </>
                            ) : (
                                <span>No rating available</span>
                            )}
                        </div>
                    </div>
                    {/* Walking time display */}
                    <div className="flex items-center space-x-2 ml-4">
                        {currentWalkingTimes[restaurant?.name || meal.restaurantName] && (
                            <div className="bg-green-100 text-green-800 text-sm font-medium px-3 py-2 rounded-full flex items-center">
                                {currentWalkingTimes[restaurant?.name || meal.restaurantName]}
                            </div>
                        )}
                    </div>
                </div>

                {/* WORKING GOOGLE PHOTOS - Fresh API fetch */}
                <PhotosWithGoogleAPI 
                    restaurant={restaurant}
                    restaurantName={meal.restaurantName}
                />

                {/* Bottom action buttons */}
                <div className="flex justify-between items-center">
                    <div className="flex space-x-3">
                        {restaurant?.website && (
                            <a 
                                href={restaurant.website} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-sm font-medium text-foodle-dark bg-gray-100 hover:bg-gray-200 px-5 py-2.5 rounded-lg transition-colors inline-flex items-center"
                            >
                                <i className="fa-solid fa-external-link mr-2"></i>
                                {restaurant.website.includes('google.com/maps') ? 'View Website' : 'Visit Website'}
                            </a>
                        )}
                        
                        {restaurant?.location && (
                            <button
                                onClick={() => {
                                    // Create a proper RestaurantData object for directions
                                    const restaurantData: RestaurantData = {
                                        name: restaurant.name || meal.restaurantName,
                                        address: restaurant.address || '',
                                        location: restaurant.location,
                                        rating: restaurant.rating || 0,
                                        reviewCount: restaurant.reviewCount || 0,
                                        priceLevel: restaurant.priceLevel || '',
                                        placeId: restaurant.placeId || '',
                                        distance: 0, // We don't have this data from previous meals
                                        website: restaurant.website || '',
                                        phoneNumber: restaurant.phoneNumber || ''
                                    };
                                    handleGetDirections(restaurantData);
                                }}
                                className="text-sm font-medium text-foodle-dark bg-gray-100 hover:bg-gray-200 px-5 py-2.5 rounded-lg transition-colors"
                            >
                                <i className="fa-solid fa-map-location-dot mr-2"></i>Get Directions
                            </button>
                        )}
                    </div>
                    
                    <button 
                        onClick={() => handleRemoveMeal(index)}
                        className="inline-flex items-center px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-colors"
                        title="Remove this meal"
                    >
                        <i className="fa-solid fa-trash mr-2"></i>
                        Remove
                    </button>
                </div>
            </div>
        );
    });

    return (
        <div className="relative flex h-screen overflow-hidden bg-foodle-bg font-sans">
            {/* Sidebar */}
            <Sidebar />

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Search Bar - Clean design with content cutoff */}
                <div className="sticky top-0 z-10 bg-foodle-bg border-b border-gray-200">
                    <div className="p-6">
                        <div className="max-w-4xl mx-auto">
                            <div className="relative flex items-center bg-white border border-gray-300 rounded-2xl shadow-sm overflow-hidden">
                                <input
                                    type="text"
                                    placeholder="Search restaurants..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="flex-1 px-6 py-4 text-lg bg-transparent border-0 focus:outline-none focus:ring-2 focus:ring-foodle-red/20 placeholder-gray-500 text-gray-800"
                                />
                                <div className="absolute right-6 flex items-center pointer-events-none">
                                    <i className="fa-solid fa-search text-gray-400"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto">
                    <div className="max-w-4xl mx-auto p-6">
                        {loading ? (
                            <div className="flex justify-center items-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foodle-red"></div>
                            </div>
                        ) : Object.keys(groupedMeals).length === 0 ? (
                            <div className="text-center py-12">
                                <div className="text-6xl mb-4">🍽️</div>
                                <h2 className="text-2xl font-semibold text-gray-800 mb-2">No previous meals found</h2>
                                <p className="text-gray-600">
                                    {searchQuery ? 'No meals match your search.' : 'Start exploring restaurants to see your meal history here.'}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-8">
                                {Object.entries(groupedMeals).map(([date, meals]) => (
                                    <div key={date} className="space-y-6">
                                        <div className="bg-foodle-bg py-4 mb-4">
                                            <h2 className="text-xl font-bold text-gray-800 border-b border-gray-300 pb-2">
                                                {formatDate(date)}
                                            </h2>
                                        </div>

                                        {/* Restaurant Cards for this date */}
                                        <div className="space-y-4">
                                            {meals.map((meal: PreviousMeal, mealIndex: number) => {
                                                // Simple stable key to prevent React errors
                                                const simpleKey = `meal-${mealIndex}-${meal.restaurantName.replace(/\s/g, '')}`;
                                                
                                                return (
                                                    <RestaurantCard 
                                                        key={simpleKey}
                                                        meal={meal} 
                                                        index={mealIndex}
                                                    />
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Directions Modal */}
            {showDirections && selectedRestaurant && userLocation && (
                <DirectionsModal
                    isOpen={showDirections}
                    onClose={() => setShowDirections(false)}
                    destination={{
                        name: selectedRestaurant.name,
                        address: selectedRestaurant.address,
                        latitude: selectedRestaurant.location?.lat || 0,
                        longitude: selectedRestaurant.location?.lng || 0,
                    }}
                    origin={userLocation}
                    walkingTime={typeof selectedRestaurant.walkingTime === 'string' ? 
                        selectedRestaurant.walkingTime : 
                        selectedRestaurant.walkingTime?.duration}
                />
            )}
        </div>
    );
};

export default PreviousMeals;
