export interface AuthUser {
  id: number;
  first_name: string;
  last_name: string;
  username: string;
  email?: string;
  user_metadata?: Record<string, string | number | object>;
  roles?: Array<string>;
  ttl: string;
  groups: Array<{ name: string; id: number }>;
  is_active: boolean;
  [key: string]: unknown;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  expiresAt?: number;
}

export interface RegisterData {
  first_name: string;
  last_name: string;
  email: string;
  username: string;
  password: string;
}

export interface AuthCoreConfig {
  localStorageKey: string;
  sessionExpirationHours: number;
}