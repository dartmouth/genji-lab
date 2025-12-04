// contextDefinition.ts
import { createContext } from "react";

export interface AuthUser {
  id: number;
  first_name: string;
  last_name: string;
  username: string; // This is netid for CAS users, username for basic auth
  email?: string;
  user_metadata?: Record<string, string | number | object>;
  roles?: Array<string>;
  ttl: string;
  groups: Array<{ name: string; id: number }>;
  is_active: boolean;
  viewed_tutorial: boolean; // ← ADD THIS LINE
  [key: string]: unknown;
}

// Define the shape of our auth context
export interface AuthContextType {
  // User information
  user: AuthUser | null;

  // Authentication state
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Authentication actions
  login: (username?: string, password?: string) => Promise<void> | void;
  loginBasic: (username: string, password: string) => Promise<void>;
  loginCAS?: () => void;
  logout: () => Promise<void>;
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
export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);
