// This file exports any TypeScript types or interfaces used in the application.

export interface User {
    id: string;
    username: string;
    email: string;
}

export interface Message {
    id: string;
    userId: string;
    content: string;
    timestamp: Date;
}

export interface Restaurant {
    id: string;
    name: string;
    location: string;
    rating: number;
    address?: string;
    reviewCount?: number;
    cuisine?: string;
    diningStyle?: string;
    distance?: string;
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