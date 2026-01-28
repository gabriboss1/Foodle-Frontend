import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { apiCall, API_ENDPOINTS, buildApiUrl } from '../config/api';

const SignIn: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const location = useLocation();
    const { setIsAuthenticated } = useAuth();
    const { showToast } = useToast();

    // Check for OAuth errors in URL params
    useEffect(() => {
        const urlParams = new URLSearchParams(location.search);
        const oauthError = urlParams.get('error');
        
        if (oauthError === 'oauth_failed') {
            showToast('Google sign-in failed. Please try again.', 'error');
            // Clean up the URL
            navigate('/signin', { replace: true });
        } else if (oauthError === 'oauth_callback_error') {
            showToast('Google sign-in callback error. Please try again.', 'error');
            // Clean up the URL
            navigate('/signin', { replace: true });
        }
    }, [location.search, navigate, showToast]);

    const handleSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Simple validation
        if (!email || !password) {
            showToast('Please fill in all fields.', 'error');
            return;
        }
        if (password.length < 6) {
            showToast('Password must be at least 6 characters.', 'error');
            return;
        }

        try {
            const response = await apiCall(API_ENDPOINTS.LOGIN, {
                method: 'POST',
                body: JSON.stringify({ email, password }),
            });

            const result = await response.json();
            
            if (response.ok) {
                showToast('Login successful!', 'success');
                setIsAuthenticated(true);
                setTimeout(() => navigate('/home'), 1200);
            } else {
                showToast(result.message || 'Login failed.', 'error');
            }
        } catch (err) {
            showToast('Network error. Please try again.', 'error');
        }
    };

    const handleGoogleSignIn = () => {
        window.location.href = buildApiUrl(API_ENDPOINTS.GOOGLE_AUTH);
    };

    return (
        <div className="bg-gradient-to-br from-red-50 via-orange-50 to-red-100 font-sans min-h-screen">

            {/* Top navigation with logo */}
            <nav className="fixed top-0 left-0 right-0 z-50 p-6">
                <div className="flex items-center">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-8 text-foodle-red">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 60" fill="currentColor">
                                <rect x="0" y="0" width="64" height="6" rx="3" fill="#EF4444"/>
                                <path d="M54.5,8.2H9.5C4.3,8.2,0,12.5,0,17.7v0c0,5.3,4.3,9.5,9.5,9.5h45.1c5.3,0,9.5-4.3,9.5-9.5v0
                                    C64,12.5,59.7,8.2,54.5,8.2z M5.1,17.7c0-2.4,2-4.4,4.4-4.4h45.1c2.4,0,4.4,2,4.4,4.4c0,2.4-2,4.4-4.4,4.4H9.5
                                    C7.1,22.1,5.1,20.1,5.1,17.7z"/>
                                <rect x="0" y="32" width="64" height="6" rx="3" fill="#EF4444"/>
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold text-foodle-dark tracking-tight">Foodle</h1>
                    </div>
                </div>
            </nav>

            {/* Background decoration */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-10 left-10 w-72 h-72 bg-foodle-red/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-10 right-10 w-96 h-96 bg-orange-300/20 rounded-full blur-3xl"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-red-200/30 rounded-full blur-2xl"></div>
            </div>

            <div className="relative flex justify-center px-4 pt-14 pb-14 min-h-screen">
                <div className="w-full max-w-md mx-auto">
                    {/* Glass morphism card */}
                    <div className="glass-card rounded-3xl p-8 shadow-2xl">
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold text-foodle-dark mb-2">Welcome back</h2>
                            <p className="text-gray-600 text-sm">Sign in to discover your next meal</p>
                        </div>

                        <form onSubmit={handleSignIn} className="space-y-5">
                            <div className="space-y-2">
                                <label htmlFor="email" className="text-sm font-medium text-gray-700">Email</label>
                                <input 
                                    type="email" 
                                    name="email" 
                                    id="email" 
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-3.5 border border-gray-200 rounded-xl text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-foodle-red/50 focus:border-foodle-red transition-all duration-200 bg-white/50" 
                                    placeholder="Enter your email" 
                                    required 
                                />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="password" className="text-sm font-medium text-gray-700">Password</label>
                                <input 
                                    type="password" 
                                    name="password" 
                                    id="password" 
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-3.5 border border-gray-200 rounded-xl text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-foodle-red/50 focus:border-foodle-red transition-all duration-200 bg-white/50" 
                                    placeholder="Enter your password" 
                                    required 
                                />
                            </div>

                            <div className="pt-4">
                                <button 
                                    type="submit" 
                                    className="w-full bg-gradient-to-r from-foodle-red to-red-500 text-white font-semibold py-3.5 px-4 rounded-xl hover:from-red-500 hover:to-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-foodle-red transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                                >
                                    Sign In
                                </button>
                            </div>
                        </form>

                        {/* Divider */}
                        <div className="flex items-center my-6">
                            <div className="flex-1 border-t border-gray-200"></div>
                            <span className="px-4 text-sm text-gray-500">or</span>
                            <div className="flex-1 border-t border-gray-200"></div>
                        </div>

                        {/* Social login */}
                        <button
                            type="button"
                            onClick={handleGoogleSignIn}
                            className="w-full flex items-center justify-center space-x-3 py-3.5 px-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all duration-200 bg-white/50 mb-4"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"></path>
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"></path>
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"></path>
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"></path>
                            </svg>
                            <span className="text-gray-700 font-medium">Continue with Google</span>
                        </button>

                        <div className="text-center mt-6 space-y-3">
                            <p className="text-sm text-gray-600">
                                Don't have an account? 
                                <span 
                                    className="font-semibold text-foodle-red hover:underline cursor-pointer ml-1" 
                                    onClick={() => navigate('/signup')}
                                >
                                    Create one
                                </span>
                            </p>
                            <p className="text-sm text-gray-600">
                                <span className="hover:underline cursor-pointer hover:text-foodle-red transition-colors">
                                    Forgot your password?
                                </span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SignIn;