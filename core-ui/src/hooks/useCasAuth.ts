// useCasAuth.ts
import { useState, useEffect, useCallback } from 'react';

interface CasAuthConfig {
  casServerUrl: string;
  serviceUrl: string;
  localStorageKey?: string;
  sessionExpirationHours?: number;
}

interface AuthState {
  isAuthenticated: boolean;
  user: {
    id: number;
    first_name: string;
    last_name: string;
    netid: string;
    email?: string;
    user_metadata?: Record<string, string|number>;
    ttl: string; // ISO format timestamp for expiration
  } | null;
  expiresAt?: number; // Unix timestamp in milliseconds when the session expires
}

interface UseCasAuthReturn extends AuthState {
  login: () => void;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
}

const DEFAULT_EXPIRATION_HOURS = 24;
const DEFAULT_STORAGE_KEY = 'cas_auth_data';

export const useCasAuth = ({
  casServerUrl,
  serviceUrl,
  localStorageKey = DEFAULT_STORAGE_KEY,
  sessionExpirationHours = DEFAULT_EXPIRATION_HOURS,
}: CasAuthConfig): UseCasAuthReturn => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
  });

    // Extract and validate ticket from URL
  const checkForTicket = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    const urlParams = new URLSearchParams(window.location.search);
    const ticket = urlParams.get('ticket');
    
    if (ticket) {
      try {
        // Remove ticket from URL to prevent issues on refresh
        const newUrl = window.location.pathname + 
          (urlParams.toString() ? '?' + urlParams.toString() : '');
        window.history.replaceState({}, document.title, newUrl);
        
        // Validate ticket with your backend
        // This is where you would make an API call to your backend
        // that communicates with the CAS server to validate the ticket
        const response = await fetch('/api/v1/validate-cas-ticket', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ticket, service: serviceUrl }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to validate ticket');
        }
        
        const userData = await response.json();
        
        // Set auth state with expiration
        const expiresAt = Date.now() + (sessionExpirationHours * 60 * 60 * 1000);
        setAuthState({
          isAuthenticated: true,
          user: userData,
          expiresAt,
        });
      } catch (e) {
        console.error('Error validating CAS ticket:', e);
        setError(e instanceof Error ? e.message : 'Unknown error during authentication');
        setAuthState({ isAuthenticated: false, user: null });
      }
    }
    
    setIsLoading(false);
  }, [serviceUrl, sessionExpirationHours]);

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
          // Clear expired session
          localStorage.removeItem(localStorageKey);
        }
      } catch (e) {
        console.error('Failed to parse auth data from localStorage', e);
        localStorage.removeItem(localStorageKey);
      }
    }
    
    // Check for ticket in URL
    checkForTicket();
  }, [checkForTicket, localStorageKey]);

  // Save auth state to localStorage whenever it changes
  useEffect(() => {
    if (authState.isAuthenticated) {
      localStorage.setItem(localStorageKey, JSON.stringify(authState));
    } else {
      localStorage.removeItem(localStorageKey);
    }
  }, [authState, localStorageKey]);



  // Redirect to CAS login
  const login = useCallback(() => {
    // Ensure the CAS server URL is properly formatted as an absolute URL
    let casUrl = casServerUrl;
    
    // If the CAS URL doesn't start with http:// or https://, assume it's a domain
    if (!casUrl.startsWith('http://') && !casUrl.startsWith('https://')) {
        casUrl = `https://${casUrl}`;
    }
    
    // Construct the full login URL
    const loginUrl = `${casUrl}/cas/login?service=${serviceUrl}`;
    window.location.href = loginUrl;
  }, [casServerUrl, serviceUrl]);

  // Handle logout
  const logout = useCallback(() => {
    // Clear local auth state
    setAuthState({ isAuthenticated: false, user: null });
    
    // Redirect to CAS logout
    const logoutUrl = `${casServerUrl}/logout?service=${encodeURIComponent(serviceUrl)}`;
    window.location.href = logoutUrl;
  }, [casServerUrl, serviceUrl]);

  return {
    ...authState,
    login,
    logout,
    isLoading,
    error,
  };
};