import React, { useState, useEffect, useRef, useCallback } from 'react';
import { flushSync } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import ChatArea from '../components/ChatArea';
import InputBar from '../components/InputBar';
import Sidebar from '../components/Sidebar';
import DirectionsModal from '../components/DirectionsModal';
import { useToast } from '../components/Toast';
import { RestaurantFilters } from '../components/FilterSliders';
import { API_BASE_URL } from '../config/api';

interface RestaurantData {
    name: string;
    address: string;
    rating: number | string;
    reviewCount: number;
    priceLevel: string;
    walkingTime: string | { duration: string; durationValue: number; distance: string; distanceValue: number; steps: any[] };
    placeId: string;
    location: {
        lat: number;
        lng: number;
    };
    website?: string;
    phoneNumber?: string;
    distance: number;
    distanceText: string;
}

interface Message {
    text: string;
    type: 'user' | 'ai';
    id: string;
    restaurant?: RestaurantData;
    messageType?: 'message' | 'restaurant';
    recommendationId?: string; // Track which recommendation this belongs to
    fullRecommendationText?: string; // Store the complete AI recommendation for saving purposes
}

const Home: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const { showToast } = useToast();

    // Mobile GPS QR code states
    const [qrCode, setQrCode] = useState<string>('');
    const [qrToken, setQrToken] = useState<string>('');
    const [hasUserInteracted, setHasUserInteracted] = useState(false);
    const [forceHideQR, setForceHideQR] = useState(false); // Additional flag to force hide QR
    const [mobileLocation, setMobileLocation] = useState<{
        latitude: number;
        longitude: number;
        accuracy: number;
    } | null>(null);

    // Socket state
    const [socket, setSocket] = useState<any>(null);

    // User authentication state
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [currentUserId, setCurrentUserId] = useState<string>('');
    const [userEmail, setUserEmail] = useState<string>('');
    const [userName, setUserName] = useState<string>('');
    const [loadingStage, setLoadingStage] = useState<string>('');

    // Refs to access current state values in socket handlers
    const hasUserInteractedRef = useRef(hasUserInteracted);
    const qrCodeRef = useRef(qrCode);
    const locationUpdateCountRef = useRef(0);
    const processingLocationUpdateRef = useRef(false);

    // Directions modal state
    const [showDirections, setShowDirections] = useState<boolean>(false);
    const [selectedRestaurant, setSelectedRestaurant] = useState<RestaurantData | null>(null);
    const [directionsOrigin, setDirectionsOrigin] = useState<{latitude: number; longitude: number} | null>(null);
    const [directionsDestination, setDirectionsDestination] = useState<{name: string; address: string; latitude: number; longitude: number} | null>(null);

    // Current filters state for persistence across regenerations
    const [currentFilters, setCurrentFilters] = useState<RestaurantFilters | undefined>(undefined);

    // Update refs when state changes
    useEffect(() => {
        hasUserInteractedRef.current = hasUserInteracted;
    }, [hasUserInteracted]);

    useEffect(() => {
        qrCodeRef.current = qrCode;
        console.log('🔍 QR Code state changed:', { qrCode, hasUserInteracted, currentUserId });
    }, [qrCode]);

    // Fetch user profile data from the database
    const fetchUserProfile = async () => {
        try {
            console.log('🔍 Fetching user profile from database...');
            const response = await fetch(`${API_BASE_URL}/api/user/profile`, {
                method: 'GET',
                credentials: 'include', // Include session cookies
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            console.log('📊 Profile response status:', response.status);

            if (response.ok) {
                const userData = await response.json();
                console.log('✅ Authenticated user data:', userData);
                
                // Set the real user data from the database
                setIsAuthenticated(true);
                setCurrentUserId(userData._id || userData.email); // Use MongoDB _id if available, fallback to email
                setUserEmail(userData.email);
                setUserName(`${userData.firstName} ${userData.lastName}`);
                
                console.log('🔍 Using authenticated user:', {
                    id: userData._id || userData.email,
                    email: userData.email,
                    name: `${userData.firstName} ${userData.lastName}`,
                    isAuthenticated: true
                });
            } else if (response.status === 401) {
                console.log('❌ User not authenticated, falling back to prompts');
                setIsAuthenticated(false);
                
                // Fallback to localStorage or prompts
                await initializeFallbackUser();
            } else {
                console.error('Failed to fetch user profile:', response.status);
                setIsAuthenticated(false);
                await initializeFallbackUser();
            }
        } catch (error) {
            console.error('Error fetching user profile:', error);
            setIsAuthenticated(false);
            await initializeFallbackUser();
        }
    };

    // Fallback user initialization for non-authenticated users
    const initializeFallbackUser = async () => {
        // Try to get from localStorage first
        const savedEmail = localStorage.getItem('foodle_user_email');
        const savedName = localStorage.getItem('foodle_user_name');
        
        if (savedEmail && savedName) {
            setCurrentUserId(`fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
            setUserEmail(savedEmail);
            setUserName(savedName);
            console.log('🔍 Using saved fallback user:', { email: savedEmail, name: savedName });
            return;
        }
        
        // For non-authenticated users, use anonymous mode instead of prompting
        // This prevents the email prompt from appearing for location sharing
        const fallbackUserId = `anonymous_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        setCurrentUserId(fallbackUserId);
        setUserEmail(`${fallbackUserId}@example.com`);
        setUserName('Anonymous User');
        
        console.log('🔍 Using anonymous fallback user (no email prompt)');
    };

    // Initialize user data on component mount
    useEffect(() => {
        fetchUserProfile();
    }, []);

    // Auto-generate QR code when user data is loaded (original behavior)
    useEffect(() => {
        if (currentUserId && userEmail && userName && !hasUserInteracted) {
            console.log('🔄 Checking if QR code should be shown...');
            checkIfQRNeeded();
        }
    }, [currentUserId, userEmail, userName]); // Trigger when user data is loaded

    // Check if QR code should be shown based on user's current location vs stored location
    const checkIfQRNeeded = async () => {
        try {
            // First try to get user's current location to compare with stored location
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    async (position) => {
                        const currentLat = position.coords.latitude;
                        const currentLng = position.coords.longitude;
                        const accuracy = position.coords.accuracy;

                        console.log('🔍 Current location:', { currentLat, currentLng, accuracy });

                        // Check with backend if QR should be shown
                        const response = await fetch(`${API_BASE_URL}/api/check-qr-needed`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            credentials: 'include',
                            body: JSON.stringify({
                                latitude: currentLat,
                                longitude: currentLng,
                                accuracy: accuracy
                            })
                        });

                        if (response.ok) {
                            const data = await response.json();
                            console.log('🔍 QR Check result:', data);

                            if (data.showQR) {
                                console.log('📱 QR code needed:', data.reason);
                                generateMobileQR();
                            } else {
                                console.log('📱 QR code not needed:', data.reason, data.distance ? `- User within ${data.threshold}m of stored location` : '');
                            }
                        } else {
                            console.warn('⚠️ QR check failed, checking with backend without GPS coordinates');
                            checkQRWithoutGPS();
                        }
                    },
                    (error) => {
                        console.log('🔍 Could not get current location, checking with backend without GPS:', error.message);
                        // If we can't get current location, ask backend to decide based on stored location
                        checkQRWithoutGPS();
                    },
                    {
                        enableHighAccuracy: false, // Use faster, less accurate location for quick check
                        timeout: 8000, // Increased timeout to 8 seconds for better reliability
                        maximumAge: 60000 // Accept cached location up to 1 minute old
                    }
                );
            } else {
                console.log('🔍 Geolocation not supported, checking with backend without GPS');
                checkQRWithoutGPS();
            }
        } catch (error) {
            console.error('🔍 Error checking QR need:', error);
            checkQRWithoutGPS();
        }
    };

    // Check QR need without GPS coordinates (let backend decide based on stored location age)
    const checkQRWithoutGPS = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/check-qr-needed`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({}) // No coordinates provided
            });

            if (response.ok) {
                const data = await response.json();
                console.log('🔍 QR Check result (no GPS):', data);

                if (data.showQR) {
                    console.log('📱 QR code needed:', data.reason);
                    generateMobileQR();
                } else {
                    console.log('📱 QR code not needed:', data.reason, data.hoursOld ? `- Stored location is ${data.hoursOld}h old` : '');
                }
            } else {
                console.warn('⚠️ QR check failed completely, showing QR as final fallback');
                generateMobileQR();
            }
        } catch (error) {
            console.error('🔍 Error checking QR without GPS:', error);
            console.warn('⚠️ Final fallback: showing QR code');
            generateMobileQR();
        }
    };

    const sendMessage = async (text: string, filters?: RestaurantFilters) => {
        // Hide QR code immediately when user sends a message
        setQrCode('');
        setHasUserInteracted(true);

        // Store current filters for regeneration
        setCurrentFilters(filters);
        
        // COMPREHENSIVE LOGGING: Show what's being sent to backend
        console.log(`\n🌟 ===== HOME.TSX SENDING TO BACKEND =====`);
        console.log(`🌟 Message Text: "${text}"`);
        console.log(`🌟 Filters received from InputBar:`, filters);
        console.log(`🌟 Request body will include:`);
        console.log(`   - message: "${text}"`);
        console.log(`   - preferences.filters:`, filters);
        console.log(`   - location:`, mobileLocation);
        console.log(`🌟 API Endpoint: ${API_BASE_URL}/api/message`);
        console.log(`🌟 ========================================\n`);

        const userMessage: Message = {
            text,
            type: 'user',
            id: Date.now().toString()
        };
        
        setMessages(prev => [...prev, userMessage]);
        setIsLoading(true);

        const aiMessageId = (Date.now() + 1).toString();
        const loadingMessage: Message = {
            text: 'Thinking...',
            type: 'ai',
            id: aiMessageId
        };
        
        setMessages(prev => [...prev, loadingMessage]);

        try {
            const response = await fetch(`${API_BASE_URL}/api/message`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ 
                    message: text,
                    preferences: { filters: filters },
                    location: mobileLocation // Include current location data
                })
            });
            
            const data = await response.json();
            
            // Log debug data to browser console if available
            if (data.debug) {
                console.log('🔍 Foodle Debug Data:', data.debug);
                if (data.debug.rawGoogleApiData) {
                    console.log('📊 Raw Google Places API Data:', data.debug.rawGoogleApiData);
                }
                if (data.debug.userPreferences) {
                    console.log('👤 User Preferences:', data.debug.userPreferences);
                }
                if (data.debug.userMessage) {
                    console.log('💬 User Message:', data.debug.userMessage);
                }
                if (data.debug.totalRestaurantsFound) {
                    console.log('🍽️ Total Restaurants Found:', data.debug.totalRestaurantsFound);
                }
            }
            
            // Check response type and handle accordingly
            if (data.type === 'restaurant' && data.restaurant) {
                console.log(`🌟 ✅ Initial recommendation successful! Recommendation ID: ${data.recommendationId}`);
                console.log(`🌟 AI Response Text: ${data.aiResponse}`);
                
                // Update message with restaurant data and recommendation ID
                setMessages(prev => 
                    prev.map(msg => 
                        msg.id === aiMessageId 
                            ? { 
                                ...msg, 
                                text: '', // Empty text since we're showing restaurant card
                                restaurant: data.restaurant,
                                messageType: 'restaurant',
                                recommendationId: data.recommendationId, // Store the recommendation ID for future regenerations
                                fullRecommendationText: data.aiResponse || `I found a great restaurant for you: ${data.restaurant.name}!` // Store the complete AI recommendation
                            }
                            : msg
                    )
                );
            } else if (data.type === 'no_results') {
                console.log(`🌟 ℹ️ No restaurants found matching filters: ${data.message}`);
                
                // Show the no results message to the user
                setMessages(prev => 
                    prev.map(msg => 
                        msg.id === aiMessageId 
                            ? { 
                                ...msg, 
                                text: data.message, 
                                messageType: 'message',
                                recommendationId: data.recommendationId // Store recommendation ID for context
                            }
                            : msg
                    )
                );
            } else {
                // Regular AI text response
                const aiText = data.aiResponse || "Sorry, I couldn't process your request.";
                setMessages(prev => 
                    prev.map(msg => 
                        msg.id === aiMessageId 
                            ? { 
                                ...msg, 
                                text: aiText, 
                                messageType: 'message',
                                recommendationId: data.recommendationId // Store recommendation ID even for text responses
                            }
                            : msg
                    )
                );
            }
        } catch (error) {
            console.error(`🌟 ❌ Initial recommendation failed:`, error);
            setMessages(prev => 
                prev.map(msg => 
                    msg.id === aiMessageId 
                        ? { 
                            ...msg, 
                            text: "There was an error contacting the AI.", 
                            messageType: 'message'
                        }
                        : msg
                )
            );
        } finally {
            setIsLoading(false);
        }
    };

    // Handle regenerating a message (for "Generate Another" button)
    const handleRegenerate = async (userMessage: string, aiMessageId: string) => {
        // Find the current AI message to get its recommendation ID
        const currentMessage = messages.find(msg => msg.id === aiMessageId);
        const recommendationId = currentMessage?.recommendationId;
        
        console.log(`🔄 ===== REGENERATION REQUEST =====`);
        console.log(`🔄 User Message: "${userMessage}"`);
        console.log(`🔄 AI Message ID: ${aiMessageId}`);
        console.log(`🔄 Recommendation ID: ${recommendationId || 'NEW'}`);
        console.log(`🔄 ===== END REGENERATION REQUEST =====`);
        
        // Update the AI message to show loading
        setMessages(prev => 
            prev.map(msg => 
                msg.id === aiMessageId 
                    ? { ...msg, text: 'Thinking...', restaurant: undefined, messageType: 'message' }
                    : msg
            )
        );
        
        setIsLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/api/message`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ 
                    message: userMessage, // Send the original user message without "Generate another"
                    preferences: { 
                        filters: currentFilters,
                        recommendationId: recommendationId // Include recommendation ID to maintain context
                    }, 
                    location: mobileLocation, // Include current location data
                    generateAnother: true // Add flag to indicate this is a regeneration request
                })
            });
            
            const data = await response.json();
            
            // Log debug data to browser console if available
            if (data.debug) {
                console.log('🔍 Foodle Debug Data (Regenerate):', data.debug);
                if (data.debug.rawGoogleApiData) {
                    console.log('📊 Raw Google Places API Data:', data.debug.rawGoogleApiData);
                }
                if (data.debug.userPreferences) {
                    console.log('👤 User Preferences:', data.debug.userPreferences);
                }
                if (data.debug.userMessage) {
                    console.log('💬 User Message:', data.debug.userMessage);
                }
                if (data.debug.totalRestaurantsFound) {
                    console.log('🍽️ Total Restaurants Found:', data.debug.totalRestaurantsFound);
                }
            }
            
            // Check response type and handle accordingly
            if (data.type === 'restaurant' && data.restaurant) {
                console.log(`🔄 ✅ Regeneration successful! New recommendation ID: ${data.recommendationId}`);
                console.log(`🔄 AI Response Text: ${data.aiResponse}`);
                
                // Update message with restaurant data and recommendation ID
                setMessages(prev => 
                    prev.map(msg => 
                        msg.id === aiMessageId 
                            ? { 
                                ...msg, 
                                text: '', // Empty text since we're showing restaurant card
                                restaurant: data.restaurant,
                                messageType: 'restaurant',
                                recommendationId: data.recommendationId, // Store the recommendation ID for future regenerations
                                fullRecommendationText: data.aiResponse || `I found another great restaurant for you: ${data.restaurant.name}!` // Store the complete AI recommendation
                            }
                            : msg
                    )
                );
            } else if (data.type === 'no_results') {
                console.log(`🔄 ℹ️ No results found for regeneration request. Recommendation ID: ${data.recommendationId}`);
                
                // Update message with no results text
                setMessages(prev => 
                    prev.map(msg => 
                        msg.id === aiMessageId 
                            ? { 
                                ...msg, 
                                text: data.aiResponse || "No restaurants found matching your current filters.",
                                messageType: 'message', 
                                restaurant: undefined,
                                recommendationId: data.recommendationId // Store recommendation ID for tracking
                            }
                            : msg
                    )
                );
            } else {
                // Regular AI text response
                const aiText = data.aiResponse || "Sorry, I couldn't process your request.";
                setMessages(prev => 
                    prev.map(msg => 
                        msg.id === aiMessageId 
                            ? { 
                                ...msg, 
                                text: aiText, 
                                messageType: 'message', 
                                restaurant: undefined,
                                recommendationId: data.recommendationId // Store recommendation ID even for text responses
                            }
                            : msg
                    )
                );
            }
        } catch (error) {
            console.error(`🔄 ❌ Regeneration failed:`, error);
            setMessages(prev => 
                prev.map(msg => 
                    msg.id === aiMessageId 
                        ? { 
                            ...msg, 
                            text: "There was an error contacting the AI.", 
                            messageType: 'message', 
                            restaurant: undefined,
                            recommendationId: recommendationId // Keep the original recommendation ID
                        }
                        : msg
                )
            );
        } finally {
            setIsLoading(false);
        }
    };

    // Handle confirm choice action - save recommendation to user profile
    const handleConfirmChoice = async (recommendationText: string, restaurant: RestaurantData | undefined, userQuery: string, restaurantData?: RestaurantData) => {
        try {
            console.log('💾 ===== SAVING RECOMMENDATION =====');
            console.log('📝 Recommendation Text:', recommendationText);
            console.log('🏪 Restaurant:', restaurant?.name || 'No restaurant data');
            console.log('❓ User Query:', userQuery);
            console.log('🏪 Complete Restaurant Data:', restaurantData);
            
            const response = await fetch(`${API_BASE_URL}/api/save-recommendation`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    recommendationText: recommendationText,
                    restaurantName: restaurant?.name || 'Unknown Restaurant',
                    restaurantId: restaurant?.placeId || null,
                    userQuery: userQuery,
                    filters: currentFilters, // Include current filter settings
                    restaurant: restaurantData || restaurant // Pass complete restaurant data
                })
            });

            if (response.ok) {
                const data = await response.json();
                console.log('💾 ✅ Previous meal saved successfully:', data);
                
                // You could show a success toast notification here
                // For now, just log to console
                console.log(`🎉 Previous meal saved! Total saved: ${data.totalSaved}`);
                
                // Show success toast
                showToast(`Previous meal saved! You now have ${data.totalSaved} meals in your history.`, 'success');
                
            } else {
                const errorData = await response.json();
                console.error('❌ Failed to save previous meal:', errorData);
                showToast('Failed to save previous meal. Please try again.', 'error');
            }
            
        } catch (error) {
            console.error('❌ Error saving previous meal:', error);
            showToast('Error saving previous meal. Please check your connection.', 'error');
        }
    };

    // Handle getting directions to a restaurant
    const handleGetDirections = async (restaurant: RestaurantData) => {
        setSelectedRestaurant(restaurant);
        
        const destination = {
            name: restaurant.name,
            address: restaurant.address,
            latitude: restaurant.location.lat,
            longitude: restaurant.location.lng
        };
        
        try {
            // Get user's stored location from the backend
            const response = await fetch(`${API_BASE_URL}/api/user/profile`, {
                method: 'GET',
                credentials: 'include',
            });
            
            if (response.ok) {
                const userData = await response.json();
                
                // Check if user has a stored location
                if (userData.lastKnownLocation && 
                    userData.lastKnownLocation.latitude && 
                    userData.lastKnownLocation.longitude) {
                    
                    const origin = {
                        latitude: userData.lastKnownLocation.latitude,
                        longitude: userData.lastKnownLocation.longitude
                    };
                    
                    console.log('🗺️ Using stored last known location for directions:', origin);
                    setDirectionsOrigin(origin);
                    setDirectionsDestination(destination);
                    setShowDirections(true);
                    return;
                }
            }
            
            // Fallback: Use mobile location if available
            if (mobileLocation) {
                const origin = {
                    latitude: mobileLocation.latitude,
                    longitude: mobileLocation.longitude
                };
                console.log('🗺️ Using mobile location for directions:', origin);
                setDirectionsOrigin(origin);
                setDirectionsDestination(destination);
                setShowDirections(true);
            } else {
                // Last resort: Show error message
                showToast('No saved location found. Please ensure your location is saved in your profile.', 'error');
            }
        } catch (error) {
            console.error('Error getting user location for directions:', error);
            
            // Fallback: Use mobile location if available
            if (mobileLocation) {
                const origin = {
                    latitude: mobileLocation.latitude,
                    longitude: mobileLocation.longitude
                };
                console.log('🗺️ Using mobile location as fallback for directions:', origin);
                setDirectionsOrigin(origin);
                setDirectionsDestination(destination);
                setShowDirections(true);
            } else {
                showToast('Could not get your location for directions. Please try again.', 'error');
            }
        }
    };

    const findNearbyRestaurants = () => {
        // This function is called by the AIRecommendation component
        // It only shows the QR code when needed - the recommendation logic is handled in AIRecommendation
        console.log('🔍 QR request from recommendation button');
        generateMobileQR();
    };

    const findRestaurantsWithLocation = async (latitude: number, longitude: number, accuracy: number, source: string) => {
        const accuracyText = Math.round(accuracy);
        const locationText = `📍 Location (${source}): ${latitude.toFixed(6)}, ${longitude.toFixed(6)} (±${accuracyText}m accuracy)`;
        
        console.log(locationText);

        // Update user's last known location in database
        try {
            const response = await fetch(`${API_BASE_URL}/api/update-user-location`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    latitude,
                    longitude,
                    accuracy,
                    source
                })
            });

            if (response.ok) {
                const data = await response.json();
                console.log('✅ Location updated in database:', data);
            } else {
                console.warn('⚠️ Failed to update location in database');
            }
        } catch (error) {
            console.error('❌ Error updating location:', error);
        }

        // Here you would typically call your restaurant search API
        // For now, we'll just log a success message
        setTimeout(() => {
            console.log(`🍽️ Found nearby restaurants using ${source} location!`);
        }, 1000);
    };

    const generateMobileQR = async () => {
        // Prevent QR generation if we're currently processing a location update
        if (processingLocationUpdateRef.current) {
            console.log('⏸️ Skipping QR generation - currently processing location update');
            return;
        }
        
        // Ensure user data is loaded before generating QR
        if (!currentUserId || !userEmail || !userName) {
            console.warn('⚠️ Cannot generate QR code: User data not loaded yet');
            console.log('Current state:', { currentUserId, userEmail, userName });
            return;
        }

        setQrCode(''); // Clear any existing QR first
        setHasUserInteracted(false); // Reset interaction state
        setForceHideQR(false); // Reset force hide flag
        
        console.log('🔄 Generating QR code for mobile GPS...');
        console.log('👤 Using user data:', { 
            userId: currentUserId, 
            email: userEmail, 
            name: userName,
            isAuthenticated 
        });

        try {
            const requestBody = {
                userId: currentUserId,
                userEmail: userEmail,
                userName: userName
            };
            
            console.log('� Frontend - Sending QR request with body:', requestBody);
            
            const response = await fetch(`${API_BASE_URL}/api/generate-location-qr`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(requestBody)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP ${response.status}: Failed to generate QR code`);
            }
            
            const data = await response.json();
            console.log('QR Code generated successfully:', data);
            
            // Update currentUserId to match what backend is using for the room
            if (data.userId && data.userId !== currentUserId) {
                console.log('🔍 Updating currentUserId from', currentUserId, 'to', data.userId, 'to match QR session');
                setCurrentUserId(data.userId);
            }
            
            if (data.qrCode) {
                setQrCode(data.qrCode);
                setQrToken(data.token); // Store the QR token for joining location session
                console.log('📱 QR code ready! Scan with your phone for precise GPS.');
                console.log('🔑 QR Token stored:', data.token?.substring(0, 8) + '...');
                
                // Join the location session room if socket is available
                if (socket && data.token) {
                    console.log('🔌 Joining location session room with token:', data.token.substring(0, 8) + '...');
                    socket.emit('join-location-session', data.token);
                }
                
                // Auto-hide QR after 10 minutes (when it expires)
                setTimeout(() => {
                    setQrCode('');
                    setQrToken('');
                    console.log('QR code expired. Generate a new one if needed.');
                }, 10 * 60 * 1000);
            } else {
                console.error('❌ Failed to generate QR code');
            }
        } catch (error: any) {
            console.error('Error generating QR code:', error);
            setQrCode('');
            setQrToken('');
        }
    };

    // Effect to join location session when both socket and QR token are available
    useEffect(() => {
        if (socket && qrToken) {
            console.log('🔌 Socket and QR token both available, joining location session:', qrToken.substring(0, 8) + '...');
            socket.emit('join-location-session', qrToken);
        }
    }, [socket, qrToken]);

    // Socket connection for mobile location updates
    useEffect(() => {
        // Only initialize socket connection after user data is loaded
        if (!currentUserId) {
            console.log('⏳ Waiting for user data to load before connecting socket...');
            return;
        }

        console.log('🔌 Initializing socket connection for user:', currentUserId);
        const newSocket = io(API_BASE_URL, {
            forceNew: true,  // Force a new connection to avoid reuse issues
            transports: ['websocket', 'polling']  // Ensure reliable transport
        });
        setSocket(newSocket);
        
        // Add comprehensive event logging
        const events = ['connect', 'disconnect', 'desktop-location-update', 'hide-qr-code', 'error', 'connect_error', 'location-session-joined'];
        events.forEach(event => {
            newSocket.on(event, (data) => {
                console.log(`🔌 Socket Event: ${event}`, data);
            });
        });

        // Listen for mobile location updates (when desktop receives location from mobile)
        newSocket.on('desktop-location-update', (data) => {
            processingLocationUpdateRef.current = true;
            locationUpdateCountRef.current += 1;
            console.log(`🚨 DESKTOP-LOCATION-UPDATE EVENT RECEIVED #${locationUpdateCountRef.current} 🚨`);
            console.log('📱 Raw event data:', data);
            console.log('📱 Location data:', data?.location);
            console.log('📱 User info:', data?.userInfo);
            console.log('🔍 Current QR state before hiding:', { qrCode: qrCodeRef.current, qrToken, hasUserInteracted: hasUserInteractedRef.current });
            
            // IMMEDIATELY hide QR code - this is the key behavior
            console.log('🔍 HIDING QR CODE IMMEDIATELY');
            
            // Use flushSync to force immediate state updates
            flushSync(() => {
                setQrCode('');
                setQrToken(''); // Also clear the QR token
                setHasUserInteracted(true);
                setForceHideQR(true); // Force hide QR code
            });
            
            // Immediate check
            console.log('🔍 State set immediately after hide commands:', { 
                qrCodeBeingSet: '',
                hasUserInteractedBeingSet: true,
                currentQrCodeRef: qrCodeRef.current
            });
            
            // Force a re-render and confirm state change
            setTimeout(() => {
                console.log('🔍 QR state after hiding (1 second later):', { qrCode: qrCodeRef.current, hasUserInteracted: hasUserInteractedRef.current });
                // Double-check and force hide QR if it's still showing
                if (qrCodeRef.current) {
                    console.log('🚨 QR CODE STILL SHOWING - FORCE HIDING AGAIN');
                    setQrCode('');
                    setQrToken('');
                    setHasUserInteracted(true);
                }
            }, 1000);
            
            // Extract coordinates
            let latitude, longitude, accuracy;
            
            if (data.location && data.location.latitude !== undefined && data.location.longitude !== undefined) {
                latitude = data.location.latitude;
                longitude = data.location.longitude;
                accuracy = data.location.accuracy || 0;
            } else if (data.latitude !== undefined && data.longitude !== undefined) {
                latitude = data.latitude;
                longitude = data.longitude;
                accuracy = data.accuracy || 0;
            } else {
                console.error('❌ Could not extract coordinates from data:', data);
                return;
            }
            
            console.log('✅ Extracted coordinates:', { latitude, longitude, accuracy });
            
            setMobileLocation({
                latitude,
                longitude,
                accuracy
            });
            
            // Automatically find restaurants with this location
            findRestaurantsWithLocation(latitude, longitude, accuracy, 'mobile-gps');
            
            // Clear the processing flag
            setTimeout(() => {
                processingLocationUpdateRef.current = false;
            }, 2000);
        });

        // Listen for explicit hide-qr-code event (additional reliability)
        newSocket.on('hide-qr-code', (data) => {
            console.log('🚨 HIDE-QR-CODE EVENT RECEIVED 🚨');
            console.log('📱 Hide QR data:', data);
            console.log('🔍 Current QR state before hiding:', { qrCode: qrCodeRef.current, qrToken, hasUserInteracted: hasUserInteractedRef.current });
            
            // IMMEDIATELY hide QR code 
            console.log('🔍 HIDING QR CODE FROM HIDE-QR-CODE EVENT');
            
            // Use flushSync to force immediate state updates
            flushSync(() => {
                setQrCode('');
                setQrToken(''); // Also clear the QR token
                setHasUserInteracted(true);
                setForceHideQR(true); // Force hide QR code
            });
            
            // Force a re-render and confirm state change
            setTimeout(() => {
                console.log('🔍 QR state after hiding from hide-qr-code (1 second later):', { qrCode: qrCodeRef.current, hasUserInteracted: hasUserInteractedRef.current });
            }, 1000);
        });

        newSocket.on('connect', () => {
            console.log('🔌 Connected to server');
            console.log('🖥️ Desktop connected - waiting for QR token to join location session');
        });

        newSocket.on('disconnect', () => {
            console.log('🔌 Disconnected from server');
            console.warn('⚠️ Connection lost. QR code sharing may not work.');
        });

        newSocket.on('desktop-joined', (data) => {
            console.log('🖥️ Desktop successfully joined room:', data);
        });

        newSocket.on('desktop-join-error', (error) => {
            console.error('🖥️ Desktop failed to join room:', error);
        });

        return () => {
            newSocket.close();
        };
    }, [currentUserId]); // Include currentUserId so socket reconnects when user changes

    // Clean up mobile location after use
    useEffect(() => {
        if (mobileLocation) {
            // Clear mobile location after 5 minutes to prevent stale data
            const timer = setTimeout(() => {
                setMobileLocation(null);
                console.log('Mobile location data cleared. Generate new QR if needed.');
            }, 5 * 60 * 1000);
            
            return () => clearTimeout(timer);
        }
    }, [mobileLocation]);

    // Handle OAuth success redirect
    useEffect(() => {
        const urlParams = new URLSearchParams(location.search);
        const authSuccess = urlParams.get('auth');
        
        if (authSuccess === 'success') {
            showToast('Successfully signed in with Google!', 'success');
            // Clean up the URL
            navigate('/home', { replace: true });
        }
    }, [location.search, navigate, showToast]);

    return (
        <div className="flex h-screen bg-foodle-bg font-sans">
            <Sidebar />
            <main className="flex-1 flex flex-col h-full overflow-hidden">
                {!currentUserId ? (
                    // Loading state while fetching user data
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                            <div className="w-8 h-8 border-4 border-foodle-red border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-gray-600">Loading your profile...</p>
                        </div>
                    </div>
                ) : (qrCode && !hasUserInteracted && !forceHideQR) ? (
                    // Center QR Code Display (Original Styling)
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center max-w-md mx-auto p-8">
                            <div className="bg-foodle-bg rounded-3xl p-6 shadow-2xl ring-1 ring-black/10">
                                <img 
                                    src={qrCode} 
                                    alt="Scan for precise GPS location" 
                                    className="w-64 h-64 mx-auto rounded-2xl"
                                    style={{ 
                                        imageRendering: 'pixelated',
                                        maxWidth: '100%',
                                        height: 'auto'
                                    }}
                                />
                                
                                <p className="text-gray-600 text-sm mt-3">
                                    Scan with your phone for precise GPS
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    // Normal Chat Interface
                    <div className="flex-1 flex flex-col overflow-hidden">                        
                        <ChatArea 
                            messages={messages}
                            isLoading={isLoading}
                            onRegenerate={handleRegenerate}
                            onGetDirections={handleGetDirections}
                            onConfirmChoice={handleConfirmChoice}
                        />
                    </div>
                )}
                
                <InputBar onSendMessage={sendMessage} />
            </main>

            {/* Directions Modal */}
            {showDirections && selectedRestaurant && directionsOrigin && directionsDestination && (
                <DirectionsModal
                    isOpen={showDirections}
                    onClose={() => {
                        setShowDirections(false);
                        setSelectedRestaurant(null);
                        setDirectionsOrigin(null);
                        setDirectionsDestination(null);
                    }}
                    origin={directionsOrigin}
                    destination={directionsDestination}
                    walkingTime={
                        typeof selectedRestaurant.walkingTime === 'string' 
                            ? selectedRestaurant.walkingTime 
                            : selectedRestaurant.walkingTime?.duration || 'N/A'
                    }
                />
            )}
        </div>
    );
};

export default Home;
