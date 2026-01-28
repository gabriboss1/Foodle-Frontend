import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from '../components/Sidebar';
import { useToast } from '../components/Toast';
import { apiCall, API_ENDPOINTS, API_BASE_URL } from '../config/api';
import { getProfileImageUrl, handleImageError } from '../utils/profileImage';

const countryOptions = [
  "Australia", "Austria", "Belgium", "Brazil", "Canada", "China", "Denmark", "Finland", "France", 
  "Germany", "Greece", "India", "Ireland", "Italy", "Japan", "Mexico", "Netherlands", "New Zealand", 
  "Norway", "Portugal", "Singapore", "South Korea", "Spain", "Sweden", "Switzerland", "Thailand", 
  "United Kingdom", "United States", "Other"
];

// Function to match Google Places country names to our dropdown options
const matchCountryToDropdown = (googleCountry: string): string => {
  if (!googleCountry) return "Other";
  
  const countryMappings: { [key: string]: string } = {
    "United States of America": "United States",
    "USA": "United States",
    "US": "United States",
    "UK": "United Kingdom",
    "Great Britain": "United Kingdom",
    "England": "United Kingdom",
    "Scotland": "United Kingdom",
    "Wales": "United Kingdom",
    "Northern Ireland": "United Kingdom",
    "Republic of Korea": "South Korea",
    "Korea": "South Korea",
    "People's Republic of China": "China",
    "PRC": "China"
  };
  
  // Check direct mapping first
  if (countryMappings[googleCountry]) {
    return countryMappings[googleCountry];
  }
  
  // Check if the country exists in our options (case-insensitive)
  const exactMatch = countryOptions.find(option => 
    option.toLowerCase() === googleCountry.toLowerCase()
  );
  
  if (exactMatch) {
    return exactMatch;
  }
  
  // Check if any option contains the country name or vice versa
  const partialMatch = countryOptions.find(option => 
    option.toLowerCase().includes(googleCountry.toLowerCase()) ||
    googleCountry.toLowerCase().includes(option.toLowerCase())
  );
  
  return partialMatch || "Other";
};

const dietTypes = [
  "No restrictions", "Vegetarian", "Vegan", "Pescatarian", "Keto", "Gluten-free"
];

const Profile: React.FC = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();

    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [country, setCountry] = useState("Other");
    const [profileImageUrl, setProfileImageUrl] = useState("default-profile.png");
    const [memberSince, setMemberSince] = useState("");
    const [isEditing, setIsEditing] = useState(false);

    const [cuisines, setCuisines] = useState<string[]>([]);
    const [cuisineInput, setCuisineInput] = useState("");
    const [priceRange, setPriceRange] = useState("$$");

    const [dietType, setDietType] = useState("No restrictions");
    const [allergies, setAllergies] = useState<string[]>([]);
    const [allergyInput, setAllergyInput] = useState("");

    const fileInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        // First try to get user profile data
        apiCall(API_ENDPOINTS.USER_PROFILE)
        .then(res => res.json())
        .then(data => {
            console.log('📊 Profile data received:', data);
            
            setFirstName(data.firstName || "");
            setLastName(data.lastName || "");
            setEmail(data.email || "");
            setProfileImageUrl(data.profileImageUrl || "default-profile.png");
            
            if (data.createdAt) {
                const date = new Date(data.createdAt);
                setMemberSince(date.toLocaleDateString(undefined, { year: "numeric", month: "long" }));
            }
            
            // Handle country logic based on your requirements:
            // 1. If there's a country saved in database, use that
            // 2. Otherwise, use the Google Places detected country
            // 3. Otherwise, try to detect country from current location
            
            if (data.country) {
                // Country is saved in database - use it
                console.log('🌍 Using saved country from database:', data.country);
                setCountry(data.country);
            } else if (data.countryGoogle) {
                // Google Places detected a country - use it as default
                console.log('🌍 Using Google Places detected country:', data.countryGoogle);
                const matchedCountry = matchCountryToDropdown(data.countryGoogle);
                setCountry(matchedCountry);
            } else {
                // No country data - try to detect from current location
                console.log('🌍 No country data available - attempting location detection');
                detectCountryFromCurrentLocation();
            }
            
            setCuisines(Array.isArray(data.preferences?.cuisines) ? data.preferences.cuisines : []);
            setPriceRange(data.preferences?.priceRange || "$$");
            setDietType(data.preferences?.dietType || "No restrictions");
            setAllergies(Array.isArray(data.preferences?.allergies) ? data.preferences.allergies : []);
        })
        .catch(error => {
            console.error('❌ Failed to fetch user profile:', error);
            // If profile fetch fails, try to detect country from current location
            detectCountryFromCurrentLocation();
        });
        // eslint-disable-next-line
    }, []);

    // Function to detect country from current browser location
    const detectCountryFromCurrentLocation = () => {
        if (navigator.geolocation) {
            const geoOptions = {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000
            };
            
            console.log('🌍 Requesting current location for country detection...');
            
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    try {
                        const { latitude, longitude } = position.coords;
                        console.log('🌍 Current location:', { latitude, longitude, accuracy: position.coords.accuracy });
                        
                        // Use our backend endpoint to detect country
                        const response = await fetch(`${API_BASE_URL}/api/detect-country`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            credentials: 'include',
                            body: JSON.stringify({ latitude, longitude })
                        });
                        
                        const data = await response.json();
                        
                        if (data.country) {
                            console.log('🌍 Country detected from current location:', data.country);
                            
                            // Map the detected country to our dropdown options
                            const matchedCountry = matchCountryToDropdown(data.country);
                            setCountry(matchedCountry);
                        } else {
                            console.log('🌍 No country detected from current location');
                            setCountry("Other");
                        }
                    } catch (error) {
                        console.error('🌍 Error detecting country from current location:', error);
                        setCountry("Other");
                    }
                },
                (error) => {
                    console.error('🌍 Geolocation error:', error);
                    setCountry("Other");
                },
                geoOptions
            );
        } else {
            console.log('🌍 Geolocation not supported');
            setCountry("Other");
        }
    };

    // --- Handlers ---
    const handleEdit = () => setIsEditing(true);

    const handleSave = async () => {
        setIsEditing(false);
        await apiCall(API_ENDPOINTS.USER_PROFILE, {
        method: "PATCH",
        body: JSON.stringify({
            firstName,
            lastName,
            email,
            country,
            preferences: {
            cuisines,
            priceRange,
            dietType,
            allergies
            }
        })
        });
        showToast("Profile updated!", 'success');
    };

    const handleLogout = async () => {
        await apiCall(API_ENDPOINTS.LOGOUT, { method: "POST" });
        navigate("/signin");
    };

    // --- Cuisine ---
    const addCuisine = () => {
        const value = cuisineInput.trim();
        if (value && !cuisines.includes(value)) {
        const newCuisines = [...cuisines, value];
        setCuisines(newCuisines);
        setCuisineInput("");
        savePreferences({ cuisines: newCuisines });
        }
    };

    const removeCuisine = (idx: number) => {
        const newCuisines = cuisines.filter((_, i) => i !== idx);
        setCuisines(newCuisines);
        savePreferences({ cuisines: newCuisines });
    };

    // --- Allergy ---
    const addAllergy = () => {
        const value = allergyInput.trim();
        if (value && !allergies.includes(value)) {
        const newAllergies = [...allergies, value];
        setAllergies(newAllergies);
        setAllergyInput("");
        savePreferences({ allergies: newAllergies });
        }
    };

    const removeAllergy = (idx: number) => {
        const newAllergies = allergies.filter((_, i) => i !== idx);
        setAllergies(newAllergies);
        savePreferences({ allergies: newAllergies });
    };

    // --- Preferences PATCH helper ---
    const savePreferences = async (prefs: Partial<{ cuisines: string[]; priceRange: string; dietType: string; allergies: string[] }>) => {
        try {
            console.log('🔧 Saving preferences:', prefs);
            
            const response = await apiCall(API_ENDPOINTS.USER_PROFILE, {
                method: "PATCH",
                body: JSON.stringify({
                    preferences: {
                        cuisines,
                        priceRange,
                        dietType,
                        allergies,
                        ...prefs
                    }
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
                throw new Error(errorData.message || `HTTP ${response.status}`);
            }
            
            const data = await response.json();
            console.log('✅ Preferences saved successfully:', data);
            
            // Show success toast
            showToast('Preferences updated successfully!', 'success');
            
        } catch (error) {
            console.error('❌ Error saving preferences:', error);
            showToast(`Failed to save preferences: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        }
    };

    // --- Profile Image ---
    const handleProfileImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type and size
        if (!file.type.startsWith('image/')) {
            showToast('Please select a valid image file.', 'error');
            return;
        }

        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            showToast('Image file size must be less than 5MB.', 'error');
            return;
        }

        try {
            const formData = new FormData();
            formData.append("profileImage", file);
            
            console.log('Uploading profile image:', file.name);
            
            const res = await apiCall(API_ENDPOINTS.PROFILE_IMAGE, {
                method: "POST",
                body: formData,
                headers: {} // Remove Content-Type header to let browser set it for FormData
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || 'Failed to upload image');
            }

            const data = await res.json();
            console.log('Profile image upload response:', data);
            
            if (data.profileImageUrl) {
                setProfileImageUrl(data.profileImageUrl + "?t=" + Date.now());
                console.log('Profile image updated:', data.profileImageUrl);
                showToast('Profile image updated successfully!', 'success');
            } else {
                throw new Error('No profileImageUrl in response');
            }
        } catch (error) {
            console.error('Profile image upload error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            showToast(`Failed to update profile image: ${errorMessage}`, 'error');
        }
    };

  return (
    <div className="relative flex h-screen overflow-hidden bg-foodle-bg font-sans">
      {/* Sidebar */}
        <Sidebar />

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">

            <div id="profile-content" className="flex-1 overflow-y-auto p-6">
                <div className="max-w-4xl mx-auto space-y-8">
                    
                    {/* Profile Picture Section */}
                    <div id="profile-picture-section" className="bg-foodle-card rounded-2xl p-8 border border-gray-200 shadow-sm">
                        <div className="flex flex-col md:flex-row items-center space-y-6 md:space-y-0 md:space-x-8">
                            <div className="relative">
                                <img 
                                    src={getProfileImageUrl(profileImageUrl)} 
                                    alt="Profile Picture" 
                                    className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
                                    onError={handleImageError}
                                />
                                <button 
                                    id="change-picture-btn" 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="absolute bottom-2 right-2 w-10 h-10 bg-foodle-red hover:bg-red-500 rounded-full flex items-center justify-center transition-colors shadow-lg"
                                >
                                    <i className="fa-solid fa-camera text-white text-sm"></i>
                                </button>
                                <input 
                                    ref={fileInputRef}
                                    type="file" 
                                    accept="image/*"
                                    onChange={handleProfileImageChange}
                                    className="hidden"
                                />
                            </div>
                            <div className="text-center md:text-left">
                                <h3 id="profile-fullname" className="text-4xl font-bold text-foodle-dark">{firstName} {lastName}</h3>
                                <div className="flex items-center justify-center md:justify-start space-x-2 mt-3 text-sm text-gray-500">
                                    <i className="fa-solid fa-calendar-days"></i>
                                    <span id="member-since">Member since {memberSince}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Personal Information */}
                    <div id="personal-info-section" className="bg-foodle-card rounded-2xl p-8 border border-gray-200 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <h4 className="text-xl font-bold text-foodle-dark flex items-center">
                                <i className="fa-solid fa-user mr-3 text-foodle-red"></i>
                                Personal Information
                            </h4>
                            <div className="flex space-x-3">
                                <button 
                                    id="edit-personal-btn" 
                                    onClick={handleEdit}
                                    disabled={isEditing}
                                    className="px-4 py-2 text-foodle-red border border-foodle-red rounded-lg hover:bg-red-50 transition-colors text-sm font-medium disabled:opacity-50"
                                >
                                    Edit
                                </button>
                                <button 
                                    id="save-personal-btn" 
                                    onClick={handleSave}
                                    disabled={!isEditing}
                                    className="px-4 py-2 bg-foodle-red text-white rounded-lg hover:bg-red-500 transition-colors text-sm font-medium disabled:opacity-50"
                                >
                                    Save
                                </button>
                            </div>
                        </div>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div id="first-name-field">
                                <label className="block text-sm font-semibold text-foodle-dark mb-2">First Name</label>
                                <input type="text" value={firstName} readOnly={!isEditing} onChange={e => setFirstName(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-foodle-red focus:border-transparent"/>
                            </div>
                            <div id="last-name-field">
                                <label className="block text-sm font-semibold text-foodle-dark mb-2">Last Name</label>
                                <input type="text" value={lastName} readOnly={!isEditing} onChange={e => setLastName(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-foodle-red focus:border-transparent"/>
                            </div>
                            <div id="email-field" className="md:col-span-2">
                                <label className="block text-sm font-semibold text-foodle-dark mb-2">Email Address</label>
                                <div className="flex space-x-3">
                                    <input type="email" value={email} readOnly={!isEditing} onChange={e => setEmail(e.target.value)} className="flex-1 px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"/>
                                </div>
                            </div>
                            <div id="country-field" className="md:col-span-2">
                                <label className="block text-sm font-semibold text-foodle-dark mb-2">Country/Territory</label>
                                <select 
                                    id="country" 
                                    value={country}
                                    onChange={e => setCountry(e.target.value)}
                                    disabled={!isEditing}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-foodle-red focus:border-transparent bg-gray-50 disabled:opacity-50"
                                >
                                    {countryOptions.map(option => (
                                        <option key={option} value={option}>{option}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Food Preferences */}
                    <div id="food-preferences-section" className="bg-foodle-card rounded-2xl p-8 border border-gray-200 shadow-sm">
                        <h4 className="text-xl font-bold text-foodle-dark mb-6 flex items-center">
                            <i className="fa-solid fa-utensils mr-3 text-foodle-red"></i>
                            Food Preferences
                        </h4>
                        <div className="space-y-6">
                            <div id="cuisine-preferences">
                                <label className="block text-sm font-semibold text-foodle-dark mb-3">Favorite Cuisines</label>
                                <div className="flex flex-wrap gap-3 mb-3">
                                    {cuisines.map((cuisine, index) => (
                                        <span key={index} className="bg-foodle-red text-white px-4 py-2 rounded-full text-sm font-medium flex items-center">
                                            {cuisine}
                                            <button 
                                                onClick={() => removeCuisine(index)}
                                                className="ml-2 text-white hover:text-red-200"
                                            >
                                                <i className="fa-solid fa-times text-xs"></i>
                                            </button>
                                        </span>
                                    ))}
                                </div>
                                <div className="flex space-x-2">
                                    <input type="text" placeholder="Add cuisine..." value={cuisineInput} onChange={e => setCuisineInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCuisine(); } }} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-foodle-red focus:border-transparent"/>
                                    <button 
                                        id="add-cuisine-btn" 
                                        onClick={addCuisine}
                                        className="px-4 py-2 bg-foodle-red text-white rounded-lg hover:bg-red-500 transition-colors"
                                    >
                                        <i className="fa-solid fa-plus"></i>
                                    </button>
                                </div>
                            </div>
                            <div id="price-range">
                                <label className="block text-sm font-semibold text-foodle-dark mb-3">Preferred Price Range</label>
                                <div className="flex space-x-4">
                                    <label className="flex items-center">
                                        <input type="radio" name="price" value="$" checked={priceRange === "$"} onChange={() => { setPriceRange("$"); savePreferences({ priceRange: "$" }); }} className="text-foodle-red focus:ring-foodle-red"/>
                                        <span className="ml-2 text-sm">$ (Budget)</span>
                                    </label>
                                    <label className="flex items-center">
                                        <input type="radio" name="price" value="$$" checked={priceRange === "$$"} onChange={() => { setPriceRange("$$"); savePreferences({ priceRange: "$$" }); }} className="text-foodle-red focus:ring-foodle-red"/>
                                        <span className="ml-2 text-sm">$$ (Moderate)</span>
                                    </label>
                                    <label className="flex items-center">
                                        <input type="radio" name="price" value="$$$" checked={priceRange === "$$$"} onChange={() => { setPriceRange("$$$"); savePreferences({ priceRange: "$$$" }); }} className="text-foodle-red focus:ring-foodle-red"/>
                                        <span className="ml-2 text-sm">$$$ (Expensive)</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Dietary Restrictions */}
                    <div id="dietary-section" className="bg-foodle-card rounded-2xl p-8 border border-gray-200 shadow-sm">
                        <h4 className="text-xl font-bold text-foodle-dark mb-6 flex items-center">
                            <i className="fa-solid fa-leaf mr-3 text-foodle-red"></i>
                            Dietary Restrictions &amp; Allergies
                        </h4>
                        <div className="space-y-6">
                            <div id="diet-type">
                                <label className="block text-sm font-semibold text-foodle-dark mb-3">Diet Type</label>
                                <select 
                                    value={dietType}
                                    onChange={e => { setDietType(e.target.value); savePreferences({ dietType: e.target.value }); }}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-foodle-red focus:border-transparent"
                                >
                                    {dietTypes.map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                            </div>
                            <div id="allergies">
                                <label className="block text-sm font-semibold text-foodle-dark mb-3">Allergies</label>
                                <div className="flex flex-wrap gap-3 mb-3">
                                    {allergies.map((allergy, index) => (
                                        <span key={index} className="bg-foodle-red text-white px-4 py-2 rounded-full text-sm font-medium flex items-center">
                                            {allergy}
                                            <button 
                                                onClick={() => removeAllergy(index)}
                                                className="ml-2 text-white hover:text-red-200"
                                            >
                                                <i className="fa-solid fa-times text-xs"></i>
                                            </button>
                                        </span>
                                    ))}
                                </div>
                                <div className="flex space-x-2">
                                    <input type="text" placeholder="Add allergen..." value={allergyInput} onChange={e => setAllergyInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addAllergy(); } }} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-foodle-red focus:border-transparent"/>
                                    <button 
                                        id="add-allergy-btn" 
                                        onClick={addAllergy}
                                        className="px-4 py-2 bg-foodle-red text-white rounded-lg hover:bg-red-500 transition-colors"
                                    >
                                        <i className="fa-solid fa-plus"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div id="profile-actions" className="flex flex-col sm:flex-row justify-between space-y-4 sm:space-y-0 sm:space-x-4">
                        <button id="clear-history-btn" className="flex items-center justify-center space-x-2 bg-gray-100 hover:bg-gray-200 text-foodle-dark font-semibold px-6 py-3 rounded-lg transition-colors">
                            <i className="fa-solid fa-trash-can"></i>
                            <span>Clear History</span>
                        </button>
                    </div>
                </div>
            </div>        

      </main>
    </div>
  );
};

export default Profile;