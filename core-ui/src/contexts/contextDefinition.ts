// authContextDefinition.ts
import { createContext } from 'react';

// Define the shape of our auth context
export interface AuthContextType {
  user: {
    id: number;
    first_name: string;
    last_name: string;
    [key: string]: unknown;
  } | null;
  isAuthenticated: boolean;
  logout: () => void;
  renderUserSelection: () => React.ReactNode;
}

// Create the context with a default value
export const AuthContext = createContext<AuthContextType | undefined>(undefined);