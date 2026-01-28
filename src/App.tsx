import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext } from './contexts/AuthContext';
import { ToastProvider } from './components/Toast';
import { API_BASE_URL } from './config/api';
import Home from './pages/Home';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import Profile from './pages/Profile';
import PreviousMeals from './pages/PreviousMeals';
import Settings from './pages/Settings';

// Protected Route component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const auth = React.useContext(AuthContext);
  return auth?.isAuthenticated ? <>{children}</> : <Navigate to="/signin" replace />;
};

// Public Route component (redirects to home if already authenticated)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const auth = React.useContext(AuthContext);
  return !auth?.isAuthenticated ? <>{children}</> : <Navigate to="/home" replace />;
};

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check authentication status on app load
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/user/profile`, {
          credentials: 'include', // Include cookies
        });
        setIsAuthenticated(response.ok);
      } catch (error) {
        console.log('Not authenticated');
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-foodle-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 text-foodle-red flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 50" fill="currentColor" className="w-12 h-12">
              <line x1="3" y1="6" x2="61" y2="6" stroke="currentColor" strokeWidth="7" strokeLinecap="round"/>
              <path d="M54.5,14.2H9.5C4.3,14.2,0,18.5,0,23.7v0c0,5.3,4.3,9.5,9.5,9.5h45.1c5.3,0,9.5-4.3,9.5-9.5v0 C64,18.5,59.7,14.2,54.5,14.2z M5.1,23.7c0-2.4,2-4.4,4.4-4.4h45.1c2.4,0,4.4,2,4.4,4.4c0,2.4-2,4.4-4.4,4.4H9.5 C7.1,28.1,5.1,26.1,5.1,23.7z" fill="currentColor"/>
              <line x1="3" y1="42" x2="61" y2="42" stroke="currentColor" strokeWidth="7" strokeLinecap="round"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-foodle-dark mb-2">Foodle</h1>
          <div className="text-foodle-secondary-text">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <AuthContext.Provider value={{ isAuthenticated, setIsAuthenticated }}>
        <Router>
          <Routes>
            {/* Default route - redirect based on auth status */}
            <Route 
              path="/" 
              element={
                isAuthenticated ? <Navigate to="/home" replace /> : <Navigate to="/signin" replace />
              } 
            />
            
            {/* Public routes (only accessible when not authenticated) */}
            <Route 
              path="/signin" 
              element={
                <PublicRoute>
                  <SignIn />
                </PublicRoute>
              } 
            />
            <Route 
              path="/signup" 
              element={
                <PublicRoute>
                  <SignUp />
                </PublicRoute>
              } 
            />
            
            {/* Protected routes (only accessible when authenticated) */}
            <Route 
              path="/home" 
              element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/profile" 
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/previous-meals" 
              element={
                <ProtectedRoute>
                  <PreviousMeals />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/settings" 
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              } 
            />
            
            {/* Fallback route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthContext.Provider>
    </ToastProvider>
  );
};

export default App;