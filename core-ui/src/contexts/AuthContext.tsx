// AuthContext.tsx
import React, { ReactNode } from 'react';
import { useIAM } from '../hooks/useIAM';
import { AuthContext } from './contextDefinition';

// Provider component - only export components from this file
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const auth = useIAM();
  
  return (
    <AuthContext.Provider value={auth}>
      {auth.renderUserSelection()}
      {children}
    </AuthContext.Provider>
  );
};