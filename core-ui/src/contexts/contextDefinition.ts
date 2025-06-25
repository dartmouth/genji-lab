// authContextDefinition.ts
import { createContext } from 'react';

// Define the shape of our auth context
export interface AuthContextType {
  // User information
  user: {
    id: number;
    first_name: string;
    last_name: string;
    netid: string;
    email?: string;
    user_metadata?: Record<string, string|number>;
    roles?: Array<string>,
    ttl: string; // ISO format timestamp for expiration
    [key: string]: unknown;
  } | null;
  
  // Authentication state
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Authentication actions
  login: () => void;
  logout: () => void;
}

// Create the context with a default value
export const AuthContext = createContext<AuthContextType | undefined>(undefined);