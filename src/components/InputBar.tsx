import React, { useState, useEffect } from 'react';
import FilterSliders, { RestaurantFilters } from './FilterSliders';
import { API_BASE_URL } from '../config/api';

interface InputBarProps {
    onSendMessage: (message: string, filters?: RestaurantFilters) => void;
}

const InputBar: React.FC<InputBarProps> = ({ onSendMessage }) => {
    const [userInput, setUserInput] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [currentFilters, setCurrentFilters] = useState<RestaurantFilters>({
        priceLevel: [2], // Default to [$$] instead of single value
        category: 'any',
        maxDistance: 5,
        minRating: 4.0,
        maxRating: 5.0
    });

    // Log default filters when component mounts and load saved preferences
    useEffect(() => {
        const loadSavedPreferences = async () => {
            try {
                console.log(`\n📥 ===== LOADING SAVED PREFERENCES ON PAGE LOAD =====`);
                
                const response = await fetch(`${API_BASE_URL}/api/get-preferences`, {
                    method: 'GET',
                    credentials: 'include', // Include session cookies for authentication
                });
                
                if (response.ok) {
                    const data = await response.json();
                    console.log(`📥 ✅ LOADED PREFERENCES:`, data);
                    
                    if (data.hasPreferences && data.preferences) {
                        // Update current filters with saved preferences
                        setCurrentFilters(data.preferences);
                        
                        console.log(`📥 📋 RESTORED FILTER STATE:`);
                        console.log(`   💰 Price: [${data.preferences.priceLevel.join(', ')}] (${data.preferences.priceLevel.map((p: number) => '$'.repeat(p)).join(', ')})`);
                        console.log(`   🏷️  Category: ${data.preferences.category}`);
                        console.log(`   📍 Distance: ${data.preferences.maxDistance}km`);
                        console.log(`   ⭐ Rating: ${data.preferences.minRating.toFixed(1)}-${data.preferences.maxRating.toFixed(1)}`);
                        console.log(`📥 User Type: ${data.userType}`);
                        console.log(`📥 ================================================\n`);
                        
                        // Send loaded preferences to backend for logging
                        const timestamp = new Date().toLocaleTimeString();
                        sendDefaultFiltersToBackend(data.preferences, timestamp, 'loaded_saved');
                        return;
                    } else {
                        console.log(`📥 ℹ️ No saved preferences found - using defaults`);
                        console.log(`📥 User Type: ${data.userType}`);
                    }
                } else {
                    console.warn(`⚠️ Failed to load saved preferences: ${response.status} - ${response.statusText}`);
                    if (response.status === 404) {
                        console.warn(`⚠️ Get preferences endpoint not found. Server may need to be restarted with new endpoints.`);
                    }
                }
            } catch (error) {
                console.error('❌ Error loading saved preferences:', error);
            }
            
            // Fallback to default filters (original behavior)
            const timestamp = new Date().toLocaleTimeString();
            console.log(`\n🎯 ===== DEFAULT FILTERS ON PAGE LOAD [${timestamp}] =====`);
            console.log(`🎯 Initial Filter State:`, currentFilters);
            console.log(`🎯 Filter Details:`);
            console.log(`   💰 Price: [${currentFilters.priceLevel.join(', ')}] (${currentFilters.priceLevel.map(p => '$'.repeat(p)).join(', ')})`);
            console.log(`   🏷️  Category: ${currentFilters.category}`);
            console.log(`   📍 Distance: ${currentFilters.maxDistance}km`);
            console.log(`   ⭐ Rating: ${currentFilters.minRating.toFixed(1)}-${currentFilters.maxRating.toFixed(1)}`);
            console.log(`🎯 Ready for user interactions`);
            console.log(`🎯 =====================================\n`);
            
            // Send default filters to backend for logging
            sendDefaultFiltersToBackend(currentFilters, timestamp, 'default');
        };
        
        loadSavedPreferences();
    }, []); // Empty dependency array = runs once on mount

    // Function to send default filters to backend
    const sendDefaultFiltersToBackend = async (filters: RestaurantFilters, timestamp: string, loadType: string = 'default') => {
        try {
            await fetch(`${API_BASE_URL}/api/log-filter-change`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    changeType: loadType === 'loaded_saved' ? 'loaded_saved_preferences' : 'page_load_defaults',
                    oldValue: null,
                    newValue: filters,
                    fullFilters: filters,
                    timestamp
                })
            });
        } catch (error) {
            console.error('❌ Failed to send default filters to backend:', error);
        }
    };

    const sendMessageBubble = () => {
        if (!userInput.trim()) return;
        
        // Log when sending message with filters to backend
        console.log(`\n🚀 ===== SENDING TO BACKEND =====`);
        console.log(`🚀 Message: "${userInput}"`);
        console.log(`🚀 Filters being sent:`, currentFilters);
        console.log(`🚀 Calling onSendMessage() with filters`);
        console.log(`🚀 ==============================\n`);
        
        onSendMessage(userInput, currentFilters);
        setUserInput('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            sendMessageBubble();
        }
    };

    const handleFiltersChange = (filters: RestaurantFilters) => {
        setCurrentFilters(filters);
        
        // Log when filters are updated in InputBar
        console.log(`\n📡 ===== INPUTBAR FILTER UPDATE =====`);
        console.log(`📡 New filters received from FilterSliders:`, filters);
        console.log(`📡 Stored in currentFilters state`);
        console.log(`📡 Will be sent with next message`);
        console.log(`📡 ===================================\n`);
    };

    const hasActiveFilters = !currentFilters.priceLevel.includes(2) || currentFilters.priceLevel.length !== 1 || 
                            currentFilters.category !== 'any' || 
                            currentFilters.maxDistance !== 5 ||
                            currentFilters.minRating !== 4.0 ||
                            currentFilters.maxRating !== 5.0;

    return (
        <div className="border-t border-gray-200 bg-foodle-bg p-6">
            <div className="max-w-4xl mx-auto">
                {/* Filter Toggle */}
                <div className="flex justify-between items-center mb-4">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                            showFilters || hasActiveFilters
                                ? 'bg-foodle-red text-white shadow-md'
                                : 'bg-white text-gray-700 hover:bg-gray-50 shadow-sm'
                        } border border-gray-300`}
                    >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
                        </svg>
                        <span className="font-medium">Filters</span>
                        {hasActiveFilters && (
                            <span className="bg-white text-foodle-red rounded-full px-2 py-0.5 text-xs font-bold">
                                ON
                            </span>
                        )}
                    </button>
                </div>

                {/* Filter Sliders with spacing */}
                {showFilters && (
                    <div className="mb-4">
                        <FilterSliders 
                            onFiltersChange={handleFiltersChange} 
                            initialFilters={currentFilters}
                        />
                    </div>
                )}

                {/* Input Bar */}
                <div className="relative flex items-center bg-white border border-gray-300 rounded-2xl shadow-sm">
                    <input
                        id="user-input"
                        type="text"
                        placeholder="Ask me for restaurant recommendations..."
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="flex-1 px-6 py-4 text-lg bg-transparent border-0 rounded-2xl focus:outline-none focus:ring-0 placeholder-gray-500"
                    />
                    <button
                        id="send-btn"
                        onClick={sendMessageBubble}
                        className="absolute right-3 w-12 h-12 bg-foodle-red hover:bg-red-500 rounded-full flex items-center justify-center transition-colors"
                    >
                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InputBar;