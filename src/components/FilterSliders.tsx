import React, { useState, useEffect } from 'react';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import { API_BASE_URL } from '../config/api';

interface FilterSlidersProps {
    onFiltersChange: (filters: RestaurantFilters) => void;
    initialFilters?: RestaurantFilters; // Add prop for initial filter values
}

export interface RestaurantFilters {
    priceLevel: number[]; // ENHANCED: Array of price levels (1-4) for multi-selection
    category: 'any' | 'restaurant' | 'fast_food' | 'cafe' | 'bar';
    maxDistance: number; // in km
    minRating: number; // minimum rating 1.0-5.0
    maxRating: number; // maximum rating 1.0-5.0
}

const FilterSliders: React.FC<FilterSlidersProps> = ({ onFiltersChange, initialFilters }) => {
    const [filters, setFilters] = useState<RestaurantFilters>(
        initialFilters || {
            priceLevel: [2], // Default to [$$] instead of single value
            category: 'any',
            maxDistance: 5,
            minRating: 4.0,
            maxRating: 5.0
        }
    );

    // Update filters when initialFilters prop changes
    useEffect(() => {
        if (initialFilters) {
            setFilters(initialFilters);
        }
    }, [initialFilters]);

    const updateFilters = (newFilters: Partial<RestaurantFilters>) => {
        const updated = { ...filters, ...newFilters };
        
        // COMPREHENSIVE FILTER CHANGE LOGGING WITH TIMESTAMPS
        const timestamp = new Date().toLocaleTimeString();
        
        // Handle multiple filter changes (like rating range)
        const changedFilters = Object.keys(newFilters);
        const filterChangeDetails = changedFilters.map(key => {
            const oldValue = filters[key as keyof RestaurantFilters];
            const newValue = newFilters[key as keyof RestaurantFilters];
            return { key, oldValue, newValue };
        });
        
        console.log(`\n🎯 ===== FILTER CHANGE [${timestamp}] =====`);
        console.log(`🎯 Changed Filters: ${changedFilters.join(', ')}`);
        filterChangeDetails.forEach(change => {
            console.log(`🎯 ${change.key}: ${change.oldValue} → ${change.newValue}`);
        });
        console.log(`🎯 Complete State:`, updated);
        console.log(`🎯 Filter Details:`);
        console.log(`   💰 Price: [${updated.priceLevel.join(', ')}] (${updated.priceLevel.map(p => '$'.repeat(p)).join(', ')})`);
        console.log(`   🏷️  Category: ${updated.category}`);
        console.log(`   📍 Distance: ${updated.maxDistance}km`);
        console.log(`   ⭐ Rating: ${updated.minRating.toFixed(1)}-${updated.maxRating.toFixed(1)}`);
        console.log(`🎯 Triggering: onFiltersChange() → InputBar`);
        console.log(`🎯 AUTO-SAVING preferences to backend...`);
        console.log(`🎯 =====================================\n`);
        
        // Update local state FIRST
        setFilters(updated);
        
        // Send to parent component (which will send to backend)
        onFiltersChange(updated);
        
        // AUTOMATIC SAVE: Send each changed filter to backend for real-time logging AND auto-save
        filterChangeDetails.forEach(change => {
            sendFilterChangeToBackend(change.key, change.oldValue, change.newValue, updated, timestamp);
        });
    };

    // Function to send filter changes to backend in real-time
    const sendFilterChangeToBackend = async (changeType: string, oldValue: any, newValue: any, fullFilters: RestaurantFilters, timestamp: string) => {
        try {
            // Send real-time logging first
            const logResponse = await fetch(`${API_BASE_URL}/api/log-filter-change`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    changeType,
                    oldValue,
                    newValue,
                    fullFilters,
                    timestamp
                })
            });
            
            if (!logResponse.ok) {
                console.warn(`⚠️ Filter logging failed: ${logResponse.status}`);
            }
            
            // AUTOMATIC SAVE: Save preferences to backend
            const saveResponse = await fetch(`${API_BASE_URL}/api/save-preferences`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include', // Include session cookies for authentication
                body: JSON.stringify({
                    filters: fullFilters,
                    saveType: 'auto_save',
                    changeType: changeType,
                    timestamp: timestamp
                })
            });
            
            if (saveResponse.ok) {
                const saveData = await saveResponse.json();
                console.log(`💾 ✅ AUTO-SAVED preferences to backend for filter change: ${changeType}`);
                console.log(`💾 User type: ${saveData.userType}, Save status: ${saveData.saved ? 'SUCCESS' : 'FAILED'}`);
            } else {
                console.warn(`⚠️ Auto-save failed: ${saveResponse.status} - ${saveResponse.statusText}`);
                if (saveResponse.status === 404) {
                    console.warn(`⚠️ Save preferences endpoint not found. Server may need to be restarted with new endpoints.`);
                }
            }
            
        } catch (error) {
            console.error('❌ Failed to send filter change to backend:', error);
            console.warn('⚠️ This might indicate the server needs to be restarted with the new endpoints.');
        }
    };

    const priceLabels = {
        1: '$',
        2: '$$', 
        3: '$$$',
        4: '$$$$'
    };

    const categoryLabels = {
        any: 'Any Type',
        restaurant: 'Restaurant',
        fast_food: 'Fast Food',
        cafe: 'Café',
        bar: 'Bar'
    };

    const handleRatingChange = (value: number | number[]) => {
        if (Array.isArray(value)) {
            updateFilters({ 
                minRating: value[0],
                maxRating: value[1]
            });
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            {/* Minimal Header */}
            <div className="flex items-center gap-2 mb-4">
                <svg className="w-5 h-5 text-foodle-red" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
                </svg>
                <h3 className="text-lg font-semibold text-foodle-dark">Filters</h3>
            </div>

            {/* Compact Grid Layout - Better responsive design */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
                
                {/* Price Level - Pill Buttons in single row */}
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-foodle-dark">
                        💰 Price
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                        {Object.entries(priceLabels).map(([level, label]) => (
                            <button
                                key={level}
                                onClick={() => {
                                    const newPriceLevel = parseInt(level);
                                    console.log(`\n🎯 ===== PRICE BUTTON CLICKED [${new Date().toLocaleTimeString()}] =====`);
                                    console.log(`🎯 Clicked Price Button: ${label} (level ${newPriceLevel})`);
                                    console.log(`🎯 Previous Price Levels: [${filters.priceLevel.join(', ')}] (${filters.priceLevel.map(p => '$'.repeat(p)).join(', ')})`);
                                    
                                    // ENHANCED: Multi-selection logic
                                    let newPriceLevels: number[];
                                    if (filters.priceLevel.includes(newPriceLevel)) {
                                        // Remove if already selected (but keep at least one)
                                        newPriceLevels = filters.priceLevel.length > 1 
                                            ? filters.priceLevel.filter(p => p !== newPriceLevel)
                                            : [newPriceLevel]; // Keep the current one if it's the only one
                                        console.log(`🎯 DESELECTING: Removed level ${newPriceLevel}, new array: [${newPriceLevels.join(', ')}]`);
                                    } else {
                                        // Add to selection
                                        newPriceLevels = [...filters.priceLevel, newPriceLevel].sort((a, b) => a - b);
                                        console.log(`🎯 SELECTING: Added level ${newPriceLevel}, new array: [${newPriceLevels.join(', ')}]`);
                                    }
                                    
                                    console.log(`🎯 Final Price Levels: [${newPriceLevels.join(', ')}] (${newPriceLevels.map(p => '$'.repeat(p)).join(', ')})`);
                                    console.log(`🎯 Triggering updateFilters({ priceLevel: [${newPriceLevels.join(', ')}] })`);
                                    console.log(`🎯 ===================================================\n`);
                                    updateFilters({ priceLevel: newPriceLevels });
                                }}
                                className={`px-1 py-2 rounded-full text-sm font-medium transition-all duration-200 text-center flex items-center justify-center min-h-[36px] ${
                                    filters.priceLevel.includes(parseInt(level))
                                        ? 'bg-foodle-red text-white shadow-md' 
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-foodle-red'
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Category - Minimal Dropdown */}
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-foodle-dark">
                        🏷️ Type
                    </label>
                    <div className="relative">
                        <select
                            value={filters.category}
                            onChange={(e) => updateFilters({ category: e.target.value as RestaurantFilters['category'] })}
                            className="foodle-select w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-foodle-red focus:border-foodle-red transition-all duration-200 hover:border-gray-400 cursor-pointer font-medium text-foodle-dark appearance-none pr-8"
                        >
                            {Object.entries(categoryLabels).map(([value, label]) => (
                                <option key={value} value={value} className="py-2 px-3 text-foodle-dark font-medium bg-white">
                                    {label}
                                </option>
                            ))}
                        </select>
                        {/* Custom dropdown arrow */}
                        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                            <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Distance - Minimal Slider */}
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-foodle-dark">
                        📍 Distance: <span className="text-foodle-red">{filters.maxDistance}km</span>
                    </label>
                    <div className="px-1 py-1">
                        <Slider
                            min={0.5}
                            max={5}
                            step={0.5}
                            value={filters.maxDistance}
                            onChange={(value) => updateFilters({ maxDistance: value as number })}
                            trackStyle={{ 
                                backgroundColor: '#EF4444', 
                                height: 6,
                                borderRadius: 3
                            }}
                            handleStyle={{
                                borderColor: '#EF4444',
                                height: 16,
                                width: 16,
                                backgroundColor: '#EF4444',
                                boxShadow: '0 2px 6px rgba(239, 68, 68, 0.3)',
                                border: '2px solid white',
                                marginTop: -5
                            }}
                            railStyle={{ 
                                backgroundColor: '#e5e7eb', 
                                height: 6,
                                borderRadius: 3
                            }}
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>0.5km</span>
                            <span>5km</span>
                        </div>
                    </div>
                </div>

                {/* Rating Range - Minimal Dual Slider */}
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-foodle-dark">
                        ⭐ Rating: <span className="text-foodle-red">{filters.minRating.toFixed(1)}-{filters.maxRating.toFixed(1)}</span>
                    </label>
                    <div className="px-1 py-1">
                        <Slider
                            range
                            min={1.0}
                            max={5.0}
                            step={0.1}
                            value={[filters.minRating, filters.maxRating]}
                            onChange={handleRatingChange}
                            trackStyle={[{ 
                                backgroundColor: '#EF4444', 
                                height: 6,
                                borderRadius: 3
                            }]}
                            handleStyle={[
                                {
                                    borderColor: '#EF4444',
                                    height: 16,
                                    width: 16,
                                    backgroundColor: '#EF4444',
                                    boxShadow: '0 2px 6px rgba(239, 68, 68, 0.3)',
                                    border: '2px solid white',
                                    marginTop: -5
                                },
                                {
                                    borderColor: '#EF4444',
                                    height: 16,
                                    width: 16,
                                    backgroundColor: '#EF4444',
                                    boxShadow: '0 2px 6px rgba(239, 68, 68, 0.3)',
                                    border: '2px solid white',
                                    marginTop: -5
                                }
                            ]}
                            railStyle={{ 
                                backgroundColor: '#e5e7eb', 
                                height: 6,
                                borderRadius: 3
                            }}
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>1.0⭐</span>
                            <span>5.0⭐</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Minimal Active Filters Summary */}
            <div className="mt-4 pt-3 border-t border-gray-200">
                <div className="flex flex-wrap gap-2 items-center justify-between">
                    <div className="flex flex-wrap gap-2 items-center">
                        <span className="text-sm text-gray-600 mr-2">Active:</span>
                        {filters.priceLevel.map(level => (
                            <span key={level} className="px-2 py-1 bg-foodle-red text-white rounded-full text-xs font-medium">
                                {priceLabels[level as keyof typeof priceLabels]}
                            </span>
                        ))}
                        {filters.category !== 'any' && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                                {categoryLabels[filters.category]}
                            </span>
                        )}
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                            ≤{filters.maxDistance}km
                        </span>
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                            ⭐{filters.minRating.toFixed(1)}-{filters.maxRating.toFixed(1)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FilterSliders;
