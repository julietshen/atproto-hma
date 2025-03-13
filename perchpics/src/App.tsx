import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import atProtoService from './services/atproto';

// Pages
import Login from './pages/Login';
import Home from './pages/Home';
import Profile from './pages/Profile';
import Upload from './pages/Upload';

// Components
import Navbar from './components/Navbar';

/**
 * Main App Component
 * 
 * Handles routing and authentication state for the entire application.
 * Uses React Router for navigation and conditional rendering based on auth state.
 */
function App() {
  // Track if the user is logged in
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  // Track loading state while checking authentication
  const [isLoading, setIsLoading] = useState<boolean>(true);
  // Track any initialization errors
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log("App initializing...");
    
    try {
      // Check if user is already logged in when the app loads
      // This uses the AT Protocol service to verify session status
      console.log("Checking login status...");
      const loggedIn = atProtoService.isLoggedIn();
      console.log("Login status:", loggedIn);
      setIsLoggedIn(loggedIn);
    } catch (err) {
      console.error("Error checking login status:", err);
      setError("Error initializing: " + (err instanceof Error ? err.message : String(err)));
      // Default to not logged in when there's an error
      setIsLoggedIn(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Show loading indicator while checking authentication
  if (isLoading) {
    return <div className="loading">Loading PerchPics...</div>;
  }

  // Show error message if initialization failed
  if (error) {
    return (
      <div className="error-container">
        <h2>Application Error</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  return (
    <Router>
      {/* Only show the navbar when the user is logged in */}
      {isLoggedIn && <Navbar />}
      <div className="container">
        <Routes>
          {/* Login Route - Redirect to home if already logged in */}
          <Route 
            path="/login" 
            element={isLoggedIn ? <Navigate to="/" /> : <Login />} 
          />
          
          {/* Home Route - Protected, requires authentication */}
          <Route 
            path="/" 
            element={isLoggedIn ? <Home /> : <Navigate to="/login" />} 
          />
          
          {/* Profile Route - Protected, requires authentication */}
          <Route 
            path="/profile" 
            element={isLoggedIn ? <Profile /> : <Navigate to="/login" />} 
          />
          
          {/* Upload Route - Protected, requires authentication */}
          <Route 
            path="/upload" 
            element={isLoggedIn ? <Upload /> : <Navigate to="/login" />} 
          />
          
          {/* Catch-all route - Redirect to home */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App; 