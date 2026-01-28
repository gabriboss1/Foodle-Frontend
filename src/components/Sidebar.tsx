import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';
import { apiCall, API_ENDPOINTS } from '../config/api';

const Sidebar: React.FC = () => {
    const { setIsAuthenticated } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { showToast } = useToast();

    const isActive = (path: string) => location.pathname === path;

    const getNavLinkClasses = (path: string) => {
        const baseClasses = "flex items-center space-x-3 font-medium rounded-lg px-4 py-3 transition-colors";
        if (isActive(path)) {
            return `${baseClasses} bg-foodle-red text-white font-semibold`;
        }
        return `${baseClasses} text-foodle-secondary-text hover:bg-red-50 hover:text-foodle-dark`;
    };

    const handleLogout = async () => {
        try {
            await apiCall(API_ENDPOINTS.LOGOUT, {
                method: 'POST'
            });
            // Update authentication state
            setIsAuthenticated(false);
            // Redirect to sign in
            navigate('/signin');
            showToast('Logged out successfully', 'info');
        } catch (err) {
            showToast('Logout failed. Please try again.', 'error');
        }
    };

    return (
        <aside className="relative h-screen w-64 bg-foodle-bg border-r border-gray-200">
            <div className="h-20 flex flex-col justify-between px-4 border-b-0">
                <div className="flex flex-row items-center justify-center space-x-3 flex-1">
                    <div className="w-8 h-6 text-foodle-red flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 50" fill="none" className="w-8 h-8">
                            <line x1="3" y1="6" x2="61" y2="6" stroke="currentColor" strokeWidth="7" strokeLinecap="round"/>
                            <path d="M54.5,14.2H9.5C4.3,14.2,0,18.5,0,23.7v0c0,5.3,4.3,9.5,9.5,9.5h45.1c5.3,0,9.5-4.3,9.5-9.5v0 C64,18.5,59.7,14.2,54.5,14.2z M5.1,23.7c0-2.4,2-4.4,4.4-4.4h45.1c2.4,0,4.4,2,4.4,4.4c0,2.4-2,4.4-4.4,4.4H9.5 C7.1,28.1,5.1,26.1,5.1,23.7z" fill="currentColor"/>
                            <line x1="3" y1="42" x2="61" y2="42" stroke="currentColor" strokeWidth="7" strokeLinecap="round"/>
                        </svg>
                    </div>
                    <h1 className="text-xl font-bold text-foodle-dark text-center">Foodle</h1>
                </div>
            </div>
            {/* Horizontal divider between logo and navigation */}
            <div className="border-t border-gray-200"></div>
            <nav className="p-4">
                <ul className="space-y-2">
                    <li>
                        <Link to="/home" className={getNavLinkClasses('/home')}>
                            <i className="fa-solid fa-house w-5 h-5"></i>
                            <span>Home</span>
                        </Link>
                    </li>
                    <li>
                        <Link to="/previous-meals" className={getNavLinkClasses('/previous-meals')}>
                            <i className="fa-regular fa-bookmark w-5 h-5"></i>
                            <span>Previous Meals</span>
                        </Link>
                    </li>
                    <li>
                        <Link to="/profile" className={getNavLinkClasses('/profile')}>
                            <i className="fa-regular fa-user w-5 h-5"></i>
                            <span>Profile</span>
                        </Link>
                    </li>
                    <li>
                        <Link to="/settings" className={getNavLinkClasses('/settings')}>
                            <i className="fa-solid fa-gear w-5 h-5"></i>
                            <span>Settings</span>
                        </Link>
                    </li>
                </ul>
            </nav>
            <div className="absolute bottom-0 left-0 w-full p-4">
                <button 
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-foodle-red text-white font-semibold rounded-lg hover:bg-red-500 transition-colors text-sm"
                >
                    <i className="fa-solid fa-right-from-bracket"></i>
                    <span>Log out</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;