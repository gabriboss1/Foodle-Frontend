import React, { useState } from 'react';

interface Restaurant {
    name: string;
    address: string;
    rating: number | null;
    priceLevel: number | null;
    distance: string;
    types: string[];
    placeId: string;
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
}

interface AIRecommendationResponse {
    restaurant: Restaurant;
    totalNearby: number;
    availableCount: number;
    shownCount: number;
}

const AIRecommendation: React.FC = () => {
    const [recommendation, setRecommendation] = useState<Restaurant | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string>('');

    const getAIRecommendation = async () => {
        setIsLoading(true);
        setError('');
        setRecommendation(null);
        
        try {
            console.log('🤖 Making request to /api/recommend-restaurant');
            
            const response = await fetch('/api/recommend-restaurant', {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            console.log('🤖 Response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Error response:', errorText);
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const data: AIRecommendationResponse = await response.json();
            console.log('✅ AI Recommendation data received:', data);
            
            setRecommendation(data.restaurant);
            
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
            setError(errorMessage);
            console.error('❌ Error getting AI recommendation:', err);
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

            {error && (
                <div className="mt-4 p-4 bg-red-100 border border-red-300 rounded-lg">
                    <p className="text-red-700">Error: {error}</p>
                </div>
            )}

            {recommendation && (
                <div className="mt-4 p-6 bg-white border border-gray-200 rounded-lg shadow-md">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {recommendation.name}
                    </h3>
                    <p className="text-gray-700 mb-3">
                        {recommendation.address}
                    </p>
                    
                    <div className="flex flex-wrap gap-2 text-sm">
                        {recommendation.rating && (
                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                {recommendation.rating}★
                            </span>
                        )}
                        
                        {recommendation.priceLevel && (
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
                                {'$'.repeat(recommendation.priceLevel)}
                            </span>
                        )}
                        
                        <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded">
                            {recommendation.distance}
                        </span>
                        
                        {recommendation.walkingTime && (
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
                                🚶 {recommendation.walkingTime}
                            </span>
                        )}
                    </div>
                    
                    {recommendation.websiteLink && (
                        <div className="mt-4">
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
                            
                            {recommendation.walkingTime && recommendation.directions && (
                                <button
                                    onClick={() => {
                                        // Open Google Maps with walking directions
                                        const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(recommendation.address)}&travelmode=walking`;
                                        window.open(mapsUrl, '_blank');
                                    }}
                                    className="inline-flex items-center px-4 py-2 bg-foodle-red text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-colors"
                                >
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    Walking Directions ({recommendation.walkingTime})
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
        </div>
    );
};

export default AIRecommendation;
