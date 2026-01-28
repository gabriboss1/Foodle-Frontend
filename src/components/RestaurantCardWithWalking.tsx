import React, { useState } from 'react';
import WalkingMap from './WalkingMap';
import WalkingButton from './WalkingButton';

interface Restaurant {
  name: string;
  address: string;
  rating: number;
  priceLevel: string;
  location: {
    lat: number;
    lng: number;
  };
  placeId: string;
  types: string[];
  distance: number;
  distanceText: string;
  walkingTime?: {
    duration: string;
    durationValue: number;
    walkingDistance: string;
    walkingDistanceValue: number;
  };
}

interface RestaurantCardWithWalkingProps {
  restaurant: Restaurant;
  userLocation: {
    lat: number;
    lng: number;
  };
}

const RestaurantCardWithWalking: React.FC<RestaurantCardWithWalkingProps> = ({ 
  restaurant, 
  userLocation 
}) => {
  const [showWalkingMap, setShowWalkingMap] = useState(false);

  const handleOpenMap = () => {
    setShowWalkingMap(true);
  };

  const handleCloseMap = () => {
    setShowWalkingMap(false);
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <svg key={i} className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      );
    }

    if (hasHalfStar) {
      stars.push(
        <svg key="half" className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
          <defs>
            <linearGradient id="half">
              <stop offset="50%" stopColor="currentColor" />
              <stop offset="50%" stopColor="transparent" />
            </linearGradient>
          </defs>
          <path fill="url(#half)" d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      );
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <svg key={`empty-${i}`} className="w-4 h-4 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      );
    }

    return stars;
  };

  const getPriceLevelDisplay = (priceLevel: string) => {
    if (priceLevel === 'N/A') return 'Price not available';
    const level = parseInt(priceLevel);
    return '$'.repeat(level) + '·'.repeat(4 - level);
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100">
        {/* Restaurant Header */}
        <div className="p-6">
          <div className="flex justify-between items-start mb-3">
            <h3 className="text-xl font-bold text-gray-900 line-clamp-2">
              {restaurant.name}
            </h3>
            <div className="flex items-center space-x-1 ml-3">
              {renderStars(restaurant.rating)}
              <span className="text-sm text-gray-600 ml-1">
                {restaurant.rating}
              </span>
            </div>
          </div>

          {/* Address and Info */}
          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
            {restaurant.address}
          </p>

          {/* Distance and Walking Time */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4 text-sm">
              <span className="text-gray-700 font-medium">
                📍 {restaurant.distanceText}
              </span>
              {restaurant.walkingTime && (
                <span className="text-foodle-red font-medium">
                  🚶 {restaurant.walkingTime.duration}
                </span>
              )}
              <span className="text-gray-500">
                {getPriceLevelDisplay(restaurant.priceLevel)}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            {/* Walking Directions Button */}
            <WalkingButton
              restaurant={restaurant}
              userLocation={userLocation}
              onClick={handleOpenMap}
              variant="primary"
              showWalkingTime={false}
            />

            {/* View Details Button */}
            <button className="flex-1 bg-gray-100 text-gray-700 hover:bg-gray-200 py-3 px-4 rounded-lg transition-colors font-medium">
              View Details
            </button>
          </div>

          {/* Restaurant Types */}
          <div className="mt-4 flex flex-wrap gap-2">
            {restaurant.types.slice(0, 3).map((type, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
              >
                {type.replace('_', ' ').toUpperCase()}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Walking Map Modal */}
      {showWalkingMap && (
        <WalkingMap
          restaurant={restaurant}
          userLocation={userLocation}
          onClose={handleCloseMap}
        />
      )}
    </>
  );
};

export default RestaurantCardWithWalking;
