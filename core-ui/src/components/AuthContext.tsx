import React, { ReactNode } from 'react';
import { useCasAuth } from '@hooks/useCasAuth';
import { AuthContext } from '../contexts/contextDefinition';

// Provider component - only export components from this file
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  
  // Configure the CAS authentication with your environment settings
  const auth = useCasAuth({
    casServerUrl: 'login.dartmouth.edu',
    serviceUrl: window.location.origin,
    sessionExpirationHours: 168, // One week (matching the backend TTL)
    localStorageKey: 'cas_auth_data'
  });
  
  // The components themselves will handle what requires authentication
  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
};