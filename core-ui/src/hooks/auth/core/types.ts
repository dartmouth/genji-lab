import type { AuthUser } from "@/contexts/contextDefinition";

export type { AuthUser } from "@/contexts/contextDefinition";

export interface RegisterData {
  first_name: string;
  last_name: string;
  email: string;
  username: string;
  password: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  expiresAt?: number;
}

export interface AuthCoreConfig {
  localStorageKey?: string;
  sessionExpirationHours?: number;
}

export interface SetAuthStateFunction {
  (state: Partial<AuthState>): void;
}

export interface SetIsLoadingFunction {
  (loading: boolean): void;
}
