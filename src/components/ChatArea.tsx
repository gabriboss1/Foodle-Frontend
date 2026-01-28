import React, { useEffect, useRef, useState } from 'react';

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
    photos?: string[];
}

interface Message {
    text: string;
    type: 'user' | 'ai';
    id: string;
    restaurant?: RestaurantData;
    messageType?: 'message' | 'restaurant';
    recommendationId?: string; // Track which recommendation this belongs to
    fullRecommendationText?: string; // Complete AI recommendation text for saving
}

interface ChatAreaProps {
    messages: Message[];
    isLoading: boolean;
    onRegenerate: (userMessage: string, aiMessageId: string) => Promise<void>;
    onGetDirections?: (restaurant: RestaurantData) => void;
    onConfirmChoice?: (recommendationText: string, restaurant: RestaurantData | undefined, userQuery: string, restaurantData?: RestaurantData) => Promise<void>;
}

const ChatArea: React.FC<ChatAreaProps> = ({ messages, isLoading, onRegenerate, onGetDirections, onConfirmChoice }) => {
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when messages change or loading state changes
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    // Helper function to find the user query that led to a specific AI message
    const findUserQueryForMessage = (aiMessageIndex: number): string => {
        // Look backwards from the AI message to find the most recent user message
        for (let i = aiMessageIndex - 1; i >= 0; i--) {
            if (messages[i].type === 'user') {
                return messages[i].text;
            }
        }
        return 'No query found';
    };

    // Handle confirm choice action
    const handleConfirmChoice = async (message: Message, restaurant: RestaurantData | undefined, messageIndex: number) => {
        if (onConfirmChoice) {
            const userQuery = findUserQueryForMessage(messageIndex);
            // Use fullRecommendationText for restaurant recommendations, fallback to text for regular messages
            const recommendationText = message.fullRecommendationText || message.text;
            console.log('🔄 Using recommendation text for saving:', recommendationText);
            console.log('🔄 Passing restaurant data:', restaurant);
            await onConfirmChoice(recommendationText, restaurant, userQuery, restaurant);
        }
    };

    const createUserBubble = (text: string, messageId: string) => {
        return (
            <div className="w-full max-w-4xl mb-3 flex justify-end">
                <div className="flex items-start space-x-4 justify-end w-full">
                    <div className="bg-foodle-red text-white rounded-2xl px-5 py-3 max-w-md ml-auto morph-up">
                        <p className="text-base">{text}</p>
                    </div>
                </div>
            </div>
        );
    };

    const createAIBubble = (message: Message, messageIndex: number, userMessage?: string) => {
        const { text, restaurant, id: messageId } = message;
        
        // If we have restaurant data, render restaurant card instead of text
        if (restaurant) {
            console.log('🐛 Restaurant data in ChatArea:', restaurant);
            console.log('🐛 walkingTime type:', typeof restaurant.walkingTime);
            console.log('🐛 walkingTime value:', restaurant.walkingTime);
            console.log('📸 Photos data:', {
                hasPhotos: !!restaurant.photos,
                photosLength: restaurant.photos?.length || 0,
                photos: restaurant.photos
            });
            
            return (
                <div className="w-full max-w-4xl mb-6" key={messageId}>
                    <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0 w-10 h-10 bg-foodle-red rounded-full flex items-center justify-center">
                            <svg className="w-6 h-5 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 50" fill="currentColor">
                                <path d="M54.5,14.2H9.5C4.3,14.2,0,18.5,0,23.7v0c0,5.3,4.3,9.5,9.5,9.5h45.1c5.3,0,9.5-4.3,9.5-9.5v0 C64,18.5,59.7,14.2,54.5,14.2z M5.1,23.7c0-2.4,2-4.4,4.4-4.4h45.1c2.4,0,4.4,2,4.4,4.4c0,2.4-2,4.4-4.4,4.4H9.5 C7.1,28.1,5.1,26.1,5.1,23.7z"></path>
                                <path d="M58.9,0H5.1C2.3,0,0,2.3,0,5.1v0C0,8,2.3,10.3,5.1,10.3h53.8c2.8,0,5.1-2.3,5.1-5.1v0C64,2.3,61.7,0,58.9,0z"></path>
                            </svg>
                        </div>
                        <div className="flex-1 max-w-3xl bg-foodle-card rounded-2xl p-6 border border-gray-200 shadow-sm">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-2xl font-bold text-foodle-dark underline decoration-2 underline-offset-4">{restaurant.name}</h3>
                                    <p className="text-foodle-secondary-text mt-1 text-lg">{restaurant.address}</p>
                                    <div className="flex items-center space-x-2 mt-3 text-base text-gray-500">
                                        <span className="font-semibold text-gray-700">{restaurant.rating}</span>
                                        <i className="fa-solid fa-star text-yellow-400"></i>
                                        <span>({restaurant.reviewCount} reviews)</span>
                                        <span className="text-gray-300">•</span>
                                        <span>{restaurant.priceLevel}</span>
                                    </div>
                                </div>
                                <div className="bg-green-100 text-green-800 text-sm font-medium px-3 py-2 rounded-full">
                                    {typeof restaurant.walkingTime === 'string' 
                                        ? restaurant.walkingTime 
                                        : restaurant.walkingTime?.duration || 'N/A'} away
                                </div>
                            </div>

                            <div className="relative mb-5">
                                <div className="flex space-x-4 overflow-x-auto pb-4 no-scrollbar snap-x snap-mandatory">
                                    {restaurant.photos && restaurant.photos.length > 0 ? (
                                        restaurant.photos.slice(0, 3).map((photo: string, index: number) => (
                                            <div key={index} className="snap-start flex-shrink-0 w-80 h-56 rounded-xl overflow-hidden">
                                                <img className="w-full h-full object-cover" src={photo} alt={`${restaurant.name} photo ${index + 1}`} />
                                            </div>
                                        ))
                                    ) : (
                                        // Fallback to restaurant-themed images if no photos available
                                        <>
                                            <div className="snap-start flex-shrink-0 w-80 h-56 rounded-xl overflow-hidden">
                                                <img className="w-full h-full object-cover" src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500&h=300&fit=crop&crop=center" alt="Restaurant interior" />
                                            </div>
                                            <div className="snap-start flex-shrink-0 w-80 h-56 rounded-xl overflow-hidden">
                                                <img className="w-full h-full object-cover" src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=500&h=300&fit=crop&crop=center" alt="Delicious food" />
                                            </div>
                                            <div className="snap-start flex-shrink-0 w-80 h-56 rounded-xl overflow-hidden">
                                                <img className="w-full h-full object-cover" src="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=500&h=300&fit=crop&crop=center" alt="Restaurant ambiance" />
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                            
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    {restaurant.website ? (
                                        <a
                                            href={restaurant.website}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-sm font-medium text-foodle-dark bg-gray-100 hover:bg-gray-200 px-5 py-2.5 rounded-lg transition-colors inline-flex items-center"
                                        >
                                            <i className="fa-solid fa-external-link mr-2"></i>View Website
                                        </a>
                                    ) : (
                                        <button 
                                            disabled
                                            className="text-sm font-medium text-gray-400 bg-gray-100 px-5 py-2.5 rounded-lg cursor-not-allowed"
                                        >
                                            No Website
                                        </button>
                                    )}
                                    <button 
                                        onClick={() => onGetDirections && onGetDirections(restaurant)}
                                        className="text-sm font-medium text-foodle-dark bg-gray-100 hover:bg-gray-200 px-5 py-2.5 rounded-lg transition-colors"
                                    >
                                        <i className="fa-solid fa-map-location-dot mr-2"></i>Get Directions
                                    </button>
                                </div>
                                <div className="flex items-center space-x-3">
                                    {userMessage && (
                                        <button 
                                            onClick={() => onRegenerate(userMessage, messageId)}
                                            className="text-sm font-semibold text-foodle-dark bg-white border border-gray-300 hover:bg-gray-50 px-5 py-2.5 rounded-lg transition-colors"
                                        >
                                            Generate Another
                                        </button>
                                    )}
                                    <button 
                                        onClick={() => handleConfirmChoice(message, restaurant, messageIndex)}
                                        className="text-sm font-semibold text-white bg-foodle-red hover:bg-red-500 px-6 py-2.5 rounded-lg transition-colors"
                                    >
                                        Confirm Choice
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        // Regular text message
        return (
            <div className="w-full max-w-4xl mb-6" key={messageId}>
                <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-foodle-red rounded-full flex items-center justify-center">
                        <svg className="w-6 h-5 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 50" fill="currentColor">
                            <path d="M54.5,14.2H9.5C4.3,14.2,0,18.5,0,23.7v0c0,5.3,4.3,9.5,9.5,9.5h45.1c5.3,0,9.5-4.3,9.5-9.5v0 C64,18.5,59.7,14.2,54.5,14.2z M5.1,23.7c0-2.4,2-4.4,4.4-4.4h45.1c2.4,0,4.4,2,4.4,4.4c0,2.4-2,4.4-4.4,4.4H9.5 C7.1,28.1,5.1,26.1,5.1,23.7z"></path>
                            <path d="M58.9,0H5.1C2.3,0,0,2.3,0,5.1v0C0,8,2.3,10.3,5.1,10.3h53.8c2.8,0,5.1-2.3,5.1-5.1v0C64,2.3,61.7,0,58.9,0z"></path>
                        </svg>
                    </div>
                    <div className="flex-1 max-w-3xl bg-foodle-card rounded-2xl p-6 border border-gray-200 shadow-sm morph-up">
                        <div className="mb-4">
                            <p className="text-base text-foodle-dark">{text}</p>
                        </div>
                        {text !== "Thinking..." && userMessage && (
                            <div className="flex items-center space-x-3">
                                <button 
                                    onClick={() => onRegenerate(userMessage, messageId)}
                                    className="text-sm font-semibold text-foodle-dark bg-white border border-gray-300 hover:bg-gray-50 px-5 py-2.5 rounded-lg transition-colors"
                                >
                                    Generate Another
                                </button>
                                <button 
                                    onClick={() => handleConfirmChoice(message, undefined, messageIndex)}
                                    className="text-sm font-semibold text-white bg-foodle-red hover:bg-red-500 px-6 py-2.5 rounded-lg transition-colors"
                                >
                                    Confirm Choice
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    // Find the user message that corresponds to each AI message
    const getUserMessageForAI = (aiIndex: number): string => {
        // Find the most recent user message before this AI message
        const messagesUpToAI = messages.slice(0, aiIndex);
        for (let i = messagesUpToAI.length - 1; i >= 0; i--) {
            if (messagesUpToAI[i].type === 'user') {
                return messagesUpToAI[i].text;
            }
        }
        return '';
    };

    return (
        <div className="flex-1 flex flex-col items-center p-6 overflow-y-auto">
            <div className="w-full max-w-4xl space-y-4">
                {messages.map((msg, index) => (
                    <div key={msg.id}>
                        {msg.type === 'user' 
                            ? createUserBubble(msg.text, msg.id)
                            : createAIBubble(msg, index, getUserMessageForAI(index))
                        }
                    </div>
                ))}
                {/* Auto-scroll anchor */}
                <div ref={chatEndRef} />
            </div>
        </div>
    );
};

export default ChatArea;