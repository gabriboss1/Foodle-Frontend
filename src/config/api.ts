// API Configuration
const getApiBaseUrl = (): string => {
    // In development, use the backend server
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:5000'; // Backend runs on 5000
    }
    // In production, adjust this to your deployed backend URL
    return 'https://your-backend-domain.com';
};

export const API_BASE_URL = getApiBaseUrl();

// API endpoints
export const API_ENDPOINTS = {
    // Authentication
    LOGIN: '/api/login',
    REGISTER: '/api/register',
    LOGOUT: '/api/logout',
    GOOGLE_AUTH: '/auth/google',
    
    // User Profile
    USER_PROFILE: '/api/user/profile',
    USER_PREFERENCES: '/api/user/preferences',
    PROFILE_IMAGE: '/api/user/profile-image',
    
    // Chat & AI
    MESSAGE: '/api/message',
    SEARCH: '/api/search',
    
    // Restaurants
    NEARBY_RESTAURANTS: '/api/nearby-restaurants',
    
    // Mobile GPS Location
    GENERATE_LOCATION_QR: '/api/generate-location-qr',
    
    // Health
    HEALTH: '/api/health'
};

// Helper function to build full API URLs
export const buildApiUrl = (endpoint: string): string => {
    return `${API_BASE_URL}${endpoint}`;
};

// Default fetch options with credentials
export const defaultFetchOptions: RequestInit = {
    credentials: 'include',
    headers: {
        'Content-Type': 'application/json',
    },
};

// API helper function
export const apiCall = async (
    endpoint: string, 
    options: RequestInit = {}
): Promise<Response> => {
    const url = buildApiUrl(endpoint);
    
    // Don't set Content-Type for FormData, let browser handle it
    const isFormData = options.body instanceof FormData;
    
    const finalOptions = {
        ...defaultFetchOptions,
        ...options,
        headers: {
            ...(isFormData ? {} : defaultFetchOptions.headers),
            ...options.headers,
        },
    };
    
    return fetch(url, finalOptions);
};
