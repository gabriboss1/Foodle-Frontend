import React from 'react';

const FindRestaurantsButton: React.FC = () => {
    const handleFindRestaurants = () => {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser.');
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                console.log('Frontend coordinates:', latitude, longitude); // Debug log
                fetch('/api/nearby-restaurants', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ latitude, longitude })
                })
                .then(res => res.json())
                .then(data => {
                    console.log('Nearby restaurants:', data);
                })
                .catch(err => {
                    console.error('Error fetching restaurants:', err);
                });
            },
            (error) => {
                alert('Unable to retrieve your location.');
            }
        );
    };

    return (
        <div className="flex justify-center my-4">
            <button 
                onClick={handleFindRestaurants} 
                className="bg-foodle-red text-white px-4 py-2 rounded shadow hover:bg-red-600 transition"
            >
                Find Nearby Restaurants
            </button>
        </div>
    );
};

export default FindRestaurantsButton;