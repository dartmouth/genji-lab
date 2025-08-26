import React, { ReactNode } from 'react';
import { useAuth } from '@hooks/useAuth';
import { AuthContext } from '../contexts/contextDefinition';

// Provider component - only export components from this file
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  
  // Configure authentication with support for both CAS and basic auth
  const auth = useAuth({
    casServerUrl: 'login.dartmouth.edu',
    serviceUrl: window.location.origin,
    sessionExpirationHours: 168, // One week (matching the backend TTL)
    localStorageKey: 'auth_data'
  });
  
  // The components themselves will handle what requires authentication
  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
};