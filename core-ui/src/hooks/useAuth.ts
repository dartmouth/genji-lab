import { useState, useEffect, useCallback } from 'react';

interface AuthUser {
  id: number;
  first_name: string;
  last_name: string;
  netid?: string;
  username?: string;
  email?: string;
  user_metadata?: Record<string, string|number>;
  roles?: Array<string>;
  ttl: string;
  [key: string]: unknown;
}

interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  expiresAt?: number;
}

interface UseAuthReturn extends AuthState {
  login: (username?: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
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
const DEFAULT_STORAGE_KEY = 'auth_data';

export const useAuth = (config: AuthConfig = {}): UseAuthReturn => {
  const {
    casServerUrl,
    serviceUrl,
    localStorageKey = DEFAULT_STORAGE_KEY,
    sessionExpirationHours = DEFAULT_EXPIRATION_HOURS,
  } = config;

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
  });

  // Basic auth login
  const basicAuthLogin = useCallback(async (username: string, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
        credentials: 'include', // Important for session cookies
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Login failed');
      }

      const userData = await response.json();
      
      // Convert username-based response to match expected user format
      const user: AuthUser = {
        ...userData,
        netid: userData.username, // Map username to netid for compatibility
      };

      // Set auth state with expiration
      const expiresAt = Date.now() + (sessionExpirationHours * 60 * 60 * 1000);
      setAuthState({
        isAuthenticated: true,
        user,
        expiresAt,
      });
    } catch (e) {
      console.error('Basic auth login error:', e);
      setError(e instanceof Error ? e.message : 'Login failed');
      setAuthState({ isAuthenticated: false, user: null });
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, [sessionExpirationHours]);

  // CAS auth login
  const casAuthLogin = useCallback(() => {
    if (!casServerUrl || !serviceUrl) {
      setError('CAS configuration not provided');
      return Promise.reject(new Error('CAS configuration not provided'));
    }

    let casUrl = casServerUrl;
    if (!casUrl.startsWith('http://') && !casUrl.startsWith('https://')) {
      casUrl = `https://${casUrl}`;
    }
    
    const loginUrl = `${casUrl}/cas/login?service=${serviceUrl}`;
    window.location.href = loginUrl;
    return Promise.resolve();
  }, [casServerUrl, serviceUrl]);

  // Check current session status
  const checkSession = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/auth/me', {
        credentials: 'include',
      });

      if (response.ok) {
        const userData = await response.json();
        const user: AuthUser = {
          ...userData,
          netid: userData.username || userData.netid,
        };

        const expiresAt = Date.now() + (sessionExpirationHours * 60 * 60 * 1000);
        setAuthState({
          isAuthenticated: true,
          user,
          expiresAt,
        });
      } else {
        setAuthState({ isAuthenticated: false, user: null });
      }
    } catch (e) {
      console.error('Session check error:', e);
      setAuthState({ isAuthenticated: false, user: null });
    }
  }, [sessionExpirationHours]);

  // Extract and validate CAS ticket from URL
  const checkForTicket = useCallback(async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const ticket = urlParams.get('ticket');
    
    if (ticket && casServerUrl && serviceUrl) {
      setIsLoading(true);
      setError(null);
      
      try {
        // Remove ticket from URL
        urlParams.delete('ticket');
        const newUrl = window.location.pathname + 
          (urlParams.toString() ? '?' + urlParams.toString() : '');
        window.history.replaceState({}, document.title, newUrl);
        
        // Validate ticket with backend
        const response = await fetch('/api/v1/validate-cas-ticket', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ticket, service: serviceUrl }),
          credentials: 'include',
        });
        
        if (!response.ok) {
          throw new Error('Failed to validate CAS ticket');
        }
        
        const userData = await response.json();
        const user: AuthUser = {
          ...userData,
          netid: userData.netid || userData.username,
        };
        
        const expiresAt = Date.now() + (sessionExpirationHours * 60 * 60 * 1000);
        setAuthState({
          isAuthenticated: true,
          user,
          expiresAt,
        });
      } catch (e) {
        console.error('CAS ticket validation error:', e);
        setError(e instanceof Error ? e.message : 'Authentication failed');
        setAuthState({ isAuthenticated: false, user: null });
      } finally {
        setIsLoading(false);
      }
    }
  }, [casServerUrl, serviceUrl, sessionExpirationHours]);

  // Main login function - supports both basic auth and CAS
  const login = useCallback(async (username?: string, password?: string) => {
    if (username && password) {
      return basicAuthLogin(username, password);
    } else {
      return casAuthLogin();
    }
  }, [basicAuthLogin, casAuthLogin]);

  // Logout function
  const logout = useCallback(async () => {
    setIsLoading(true);
    
    try {
      // Call backend logout endpoint
      await fetch('/api/v1/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (e) {
      console.error('Logout error:', e);
    }

    // Clear local auth state
    setAuthState({ isAuthenticated: false, user: null });
    
    // If using CAS, redirect to CAS logout
    if (casServerUrl && serviceUrl) {
      const logoutUrl = `${casServerUrl}/logout?service=${encodeURIComponent(serviceUrl)}`;
      window.location.href = logoutUrl;
    }
    
    setIsLoading(false);
  }, [casServerUrl, serviceUrl]);

  // Load auth state from localStorage
  useEffect(() => {
    const storedData = localStorage.getItem(localStorageKey);
    if (storedData) {
      try {
        const parsedData: AuthState = JSON.parse(storedData);
        
        // Check if session is expired
        if (parsedData.expiresAt && parsedData.expiresAt > Date.now()) {
          setAuthState(parsedData);
        } else {
          localStorage.removeItem(localStorageKey);
        }
      } catch (e) {
        console.error('Failed to parse auth data from localStorage', e);
        localStorage.removeItem(localStorageKey);
      }
    }
    
    // Check for CAS ticket in URL
    checkForTicket().then(() => {
      // If no ticket was processed, check current session
      if (!new URLSearchParams(window.location.search).get('ticket')) {
        checkSession().finally(() => setIsLoading(false));
      }
    });
  }, [checkForTicket, checkSession, localStorageKey]);

  // Save auth state to localStorage whenever it changes
  useEffect(() => {
    if (authState.isAuthenticated) {
      localStorage.setItem(localStorageKey, JSON.stringify(authState));
    } else {
      localStorage.removeItem(localStorageKey);
    }
  }, [authState, localStorageKey]);

  return {
    ...authState,
    login,
    logout,
    isLoading,
    error,
  };
};