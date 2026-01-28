import React from 'react';

interface WalkingButtonProps {
  restaurant: {
    name: string;
    location: {
      lat: number;
      lng: number;
    };
    placeId: string;
    walkingTime?: {
      duration: string;
      durationValue: number;
      walkingDistance: string;
      walkingDistanceValue: number;
    };
  };
  userLocation: {
    lat: number;
    lng: number;
  };
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'compact';
  showWalkingTime?: boolean;
}

const WalkingButton: React.FC<WalkingButtonProps> = ({ 
  restaurant, 
  userLocation, 
  onClick, 
  variant = 'primary',
  showWalkingTime = true 
}) => {
  const baseClasses = "flex items-center space-x-2 transition-all duration-200 font-medium rounded-lg";
  
  const variantClasses = {
    primary: "bg-foodle-red text-white hover:bg-red-600 hover:shadow-lg transform hover:-translate-y-0.5 px-4 py-3",
    secondary: "bg-white text-foodle-red border-2 border-foodle-red hover:bg-foodle-red hover:text-white px-4 py-3",
    compact: "bg-gray-100 text-gray-700 hover:bg-gray-200 px-3 py-2 text-sm"
  };

  const iconSize = variant === 'compact' ? 'w-4 h-4' : 'w-5 h-5';

  return (
    <button
      onClick={onClick}
      className={`${baseClasses} ${variantClasses[variant]}`}
      title={`Get walking directions to ${restaurant.name}`}
    >
      {/* Walking icon */}
      <svg 
        className={iconSize} 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
        />
      </svg>
      
      {/* Text content */}
      <span className="flex items-center space-x-1">
        {variant === 'compact' ? (
          <>
            <span>Directions</span>
            {showWalkingTime && restaurant.walkingTime && (
              <span className="text-xs opacity-75">
                ({restaurant.walkingTime.duration})
              </span>
            )}
          </>
        ) : (
          <>
            <span>Walking Directions</span>
            {showWalkingTime && restaurant.walkingTime && (
              <span className={`${variant === 'secondary' ? 'text-foodle-red' : 'text-white'} text-sm opacity-90`}>
                • {restaurant.walkingTime.duration}
              </span>
            )}
          </>
        )}
      </span>
      
      {/* Arrow icon for non-compact variants */}
      {variant !== 'compact' && (
        <svg 
          className={iconSize}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M9 5l7 7-7 7" 
          />
        </svg>
      )}
    </button>
  );
};

export default WalkingButton;
