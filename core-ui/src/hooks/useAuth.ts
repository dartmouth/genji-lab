
import { useEffect, useCallback } from "react";
import { useAuthCore } from "./auth/core/useAuthCore";
import { useBasicAuth } from "./auth/strategies/basicAuth";
import { useCASAuth } from "./auth/strategies/casAuth";
import { RegisterData } from "./auth/core/types";
import { AuthUser } from "@/contexts/contextDefinition";

interface UseAuthReturn {
  isAuthenticated: boolean;
  user: AuthUser | null;
  expiresAt?: number;
  login: (username?: string, password?: string) => Promise<void> | void;
  loginBasic: (username: string, password: string) => Promise<void>;
  loginCAS?: () => void;
  logout: () => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

interface AuthConfig {
  casServerUrl?: string;
  serviceUrl?: string;
  localStorageKey?: string;
  sessionExpirationHours?: number;
}

const DEFAULT_EXPIRATION_HOURS = 24;
const DEFAULT_STORAGE_KEY = "auth_data";

export const useAuth = (config: AuthConfig = {}): UseAuthReturn => {
  const {
    casServerUrl,
    serviceUrl,
    localStorageKey = DEFAULT_STORAGE_KEY,
    sessionExpirationHours = DEFAULT_EXPIRATION_HOURS,
  } = config;

  // Initialize core auth functionality
  const core = useAuthCore({
    localStorageKey,
    sessionExpirationHours,
  });

  // Initialize basic auth strategy
  const basicAuth = useBasicAuth({
    setAuthState: core.setAuthState,
    setIsLoading: core.setIsLoading,
    sessionExpirationHours,
  });

  // Conditionally initialize CAS auth strategy
const casAuth = useCASAuth({
  casServerUrl: casServerUrl || '',
  serviceUrl: serviceUrl || '',
  setAuthState: core.setAuthState,
  setIsLoading: core.setIsLoading,
  sessionExpirationHours,
  enabled: !!(casServerUrl && serviceUrl), // Add enabled flag
});

  // Backward compatible login function
  const login = useCallback(
    async (username?: string, password?: string) => {
      if (username && password) {
        return basicAuth.login(username, password);
      } else if (casAuth) {
        return casAuth.login();
      } else {
        throw new Error("CAS authentication not configured");
      }
    },
    [basicAuth, casAuth]
  );

  // Automatic CAS ticket checking on mount
  useEffect(() => {
    if (casServerUrl && serviceUrl) {
      casAuth.checkForTicket().then(() => {
        if (!new URLSearchParams(window.location.search).get("ticket")) {
          core.checkSession().finally(() => core.setIsLoading(false));
        }
      });
    } else {
      core.checkSession().finally(() => core.setIsLoading(false));
    }
    
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Aggregate errors from core and strategies
  const aggregatedError =
    basicAuth.error || casAuth?.error || null;

  return {
    ...core.authState,
    login,
    loginBasic: basicAuth.login,
    loginCAS: casAuth?.login,
    logout: core.logout,
    register: basicAuth.register,
    isLoading: core.isLoading,
    error: aggregatedError,
  };
};