// authContextDefinition.ts
import { createContext } from 'react';

// Define the shape of our auth context
export interface AuthContextType {
  // User information
  user: {
    id: number;
    first_name: string;
    last_name: string;
    netid?: string;
    username?: string;
    email?: string;
    user_metadata?: Record<string, string|number>;
    roles?: Array<string>,
    groups: Array<{name: string; id: number}>,
    ttl: string; // ISO format timestamp for expiration
    [key: string]: unknown;
  } | null;
  
  // Authentication state
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Authentication actions
  // FIXME both cas auth and basic auth should return the same types, get rid of the 'or void'
  login: (username?: string, password?: string) => Promise<void>|void;
  logout: () => Promise<void>|void;
  register?: (userData: RegisterData) => Promise<void>;
}

// Registration data interface
export interface RegisterData {
  first_name: string;
  last_name: string;
  email: string;
  username: string;
  password: string;
}

// Create the context with a default value
export const AuthContext = createContext<AuthContextType | undefined>(undefined);