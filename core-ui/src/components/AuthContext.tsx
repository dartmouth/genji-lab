import React, { ReactNode } from 'react';
import { useCasAuth } from '@hooks/useCasAuth';
import { AuthContext } from '../contexts/contextDefinition';

// Provider component - only export components from this file
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  
  // Configure the CAS authentication with your environment settings
  // console.log('auth it up')
  const auth = useCasAuth({
    casServerUrl: 'login.dartmouth.edu',
    serviceUrl: window.location.origin,
    sessionExpirationHours: 168, // One week (matching the backend TTL)
    localStorageKey: 'cas_auth_data'
  });
  
  // Render login UI if not authenticated
  const renderAuthUI = () => {
    if (!auth.isAuthenticated && !auth.isLoading) {
      return (
        <div className="auth-container">
          <h2>Authentication Required</h2>
          <button 
            onClick={auth.login}
            className="login-button"
            disabled={auth.isLoading}
          >
            {auth.isLoading ? 'Authenticating...' : 'Login with Dartmouth ID'}
          </button>
          {auth.error && <div className="auth-error">{auth.error}</div>}
        </div>
      );
    }
    return null;
  };
  
  return (
    <AuthContext.Provider value={auth}>
      {renderAuthUI()}
      {auth.isAuthenticated && children}
    </AuthContext.Provider>
  );
};