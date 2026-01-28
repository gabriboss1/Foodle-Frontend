// Utility functions for handling profile images
import { defaultProfileImage } from '../assets/images';
import { API_BASE_URL } from '../config/api';

export const getProfileImageUrl = (userProfileUrl?: string | null): string => {
  // If user has a profile image URL, use it
  if (userProfileUrl && userProfileUrl !== 'default-profile.png') {
    // If it's a full URL (external image like Google profile photo), use as-is
    if (userProfileUrl.startsWith('http')) {
      return userProfileUrl;
    }
    // If it's a relative path starting with /uploads/, use with backend URL
    if (userProfileUrl.startsWith('/uploads/')) {
      return `${API_BASE_URL}${userProfileUrl}`;
    }
    // If it's just a filename, prepend the uploads directory
    return `${API_BASE_URL}/uploads/${userProfileUrl}`;
  }
  
  // Use default profile image from public folder
  return '/images/default-profile.svg';
};

// Alternative: Use the bundled default image
export const getProfileImageUrlWithFallback = (userProfileUrl?: string | null): string => {
  if (userProfileUrl && userProfileUrl !== 'default-profile.png') {
    if (userProfileUrl.startsWith('http')) {
      return userProfileUrl;
    }
    // If it's a relative path starting with /uploads/, use with backend URL
    if (userProfileUrl.startsWith('/uploads/')) {
      return `${API_BASE_URL}${userProfileUrl}`;
    }
    // If it's just a filename, prepend the uploads directory
    return `${API_BASE_URL}/uploads/${userProfileUrl}`;
  }
  
  // Use the bundled default image
  return defaultProfileImage;
};

// Handle image load errors by falling back to default
export const handleImageError = (event: React.SyntheticEvent<HTMLImageElement>) => {
  const img = event.currentTarget;
  img.src = '/images/default-profile.svg';
};
