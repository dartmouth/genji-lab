import { useState, useEffect, useCallback } from "react";
import axios, { AxiosInstance } from "axios";
import useLocalStorage from "./useLocalStorage";
import { AuthUser } from "@/contexts/contextDefinition";
const api: AxiosInstance = axios.create({
  baseURL: "/api/v1",
  timeout: 10000,
});

interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  expiresAt?: number;
}

interface UseAuthReturn extends AuthState {
  login: (username?: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

interface RegisterData {
  first_name: string;
  last_name: string;
  email: string;
  username: string;
  password: string;
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

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
  });

  const [activeClassroomValue, setActiveClassroomValue] =
    useLocalStorage("active_classroom");

  // Basic auth login
  const basicAuthLogin = useCallback(
    async (username: string, password: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await api.post(
          "/auth/login",
          { username, password },
          {
            withCredentials: true,
          }
        );

        const userData = response.data;

        const user: AuthUser = userData;

        // Set auth state with expiration
        const expiresAt = Date.now() + sessionExpirationHours * 60 * 60 * 1000;
        setAuthState({
          isAuthenticated: true,
          user,
          expiresAt,
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (e: any) {
        console.error("Basic auth login error:", e);
        const errorMessage =
          e.response?.data?.detail || e.message || "Login failed";
        setError(errorMessage);
        setAuthState({ isAuthenticated: false, user: null });
        throw e;
      } finally {
        setIsLoading(false);
      }
    },
    [sessionExpirationHours]
  );

  // CAS auth login
  const casAuthLogin = useCallback(() => {
    if (!casServerUrl || !serviceUrl) {
      setError("CAS configuration not provided");
      return Promise.reject(new Error("CAS configuration not provided"));
    }

    let casUrl = casServerUrl;
    if (!casUrl.startsWith("http://") && !casUrl.startsWith("https://")) {
      casUrl = `https://${casUrl}`;
    }

    const loginUrl = `${casUrl}/cas/login?service=${serviceUrl}`;
    window.location.href = loginUrl;
    return Promise.resolve();
  }, [casServerUrl, serviceUrl]);

  // Check current session status
  const checkSession = useCallback(async () => {
    try {
      const response = await api.get("/auth/me", {
        withCredentials: true,
      });

      const userData = response.data;

      // Backend now returns consistent structure - no mapping needed
      const user: AuthUser = userData;

      const expiresAt = Date.now() + sessionExpirationHours * 60 * 60 * 1000;
      setAuthState({
        isAuthenticated: true,
        user,
        expiresAt,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      console.error("Session check error:", e);
      setAuthState({ isAuthenticated: false, user: null });
    }
  }, [sessionExpirationHours]);

  // Extract and validate CAS ticket from URL
  const checkForTicket = useCallback(async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const ticket = urlParams.get("ticket");

    if (ticket && casServerUrl && serviceUrl) {
      setIsLoading(true);
      setError(null);

      try {
        // Remove ticket from URL
        urlParams.delete("ticket");
        const newUrl =
          window.location.pathname +
          (urlParams.toString() ? "?" + urlParams.toString() : "");
        window.history.replaceState({}, document.title, newUrl);

        // Validate ticket with backend
        const response = await api.post(
          "/validate-cas-ticket",
          { ticket, service: serviceUrl },
          {
            withCredentials: true,
          }
        );

        const userData = response.data;

        // Backend now returns consistent structure - no mapping needed
        const user: AuthUser = userData;

        const expiresAt = Date.now() + sessionExpirationHours * 60 * 60 * 1000;
        setAuthState({
          isAuthenticated: true,
          user,
          expiresAt,
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (e: any) {
        console.error("CAS ticket validation error:", e);
        const errorMessage =
          e.response?.data?.detail || e.message || "Authentication failed";
        setError(errorMessage);
        setAuthState({ isAuthenticated: false, user: null });
      } finally {
        setIsLoading(false);
      }
    }
  }, [casServerUrl, serviceUrl, sessionExpirationHours]);

  // Main login function - supports both basic auth and CAS
  const login = useCallback(
    async (username?: string, password?: string) => {
      if (username && password) {
        return basicAuthLogin(username, password);
      } else {
        return casAuthLogin();
      }
    },
    [basicAuthLogin, casAuthLogin]
  );

  // Register function
  const register = useCallback(
    async (userData: RegisterData) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await api.post("/auth/register", userData, {
          withCredentials: true,
        });

        const userResponse = response.data;

        // Backend now returns consistent structure - no mapping needed
        const user: AuthUser = userResponse;

        // Set auth state with expiration
        const expiresAt = Date.now() + sessionExpirationHours * 60 * 60 * 1000;
        setAuthState({
          isAuthenticated: true,
          user,
          expiresAt,
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (e: any) {
        console.error("Registration error:", e);
        const errorMessage =
          e.response?.data?.detail || e.message || "Registration failed";
        setError(errorMessage);
        setAuthState({ isAuthenticated: false, user: null });
        throw e;
      } finally {
        setIsLoading(false);
      }
    },
    [sessionExpirationHours]
  );

  // Logout function
  const logout = useCallback(async () => {
    setIsLoading(true);

    try {
      // Call backend logout endpoint
      await api.post(
        "/auth/logout",
        {},
        {
          withCredentials: true,
        }
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      console.error("Logout error:", e);
    }

    // Clear local auth state
    setAuthState({ isAuthenticated: false, user: null });

    // If using CAS, redirect to CAS logout
    if (casServerUrl && serviceUrl) {
      const logoutUrl = `${casServerUrl}/cas/logout?service=${encodeURIComponent(
        serviceUrl
      )}`;
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
        console.error("Failed to parse auth data from localStorage", e);
        localStorage.removeItem(localStorageKey);
      }
    }

    // Check for CAS ticket in URL
    checkForTicket().then(() => {
      // If no ticket was processed, check current session
      if (!new URLSearchParams(window.location.search).get("ticket")) {
        checkSession().finally(() => setIsLoading(false));
      }
    });
  }, [checkForTicket, checkSession, localStorageKey]);

  // Save auth state to localStorage and handle active classroom
  useEffect(() => {
    if (authState.isAuthenticated) {
      localStorage.setItem(localStorageKey, JSON.stringify(authState));

      // Handle active classroom selection
      if (authState.user?.groups && authState.user.groups.length > 0) {
        if (!activeClassroomValue) {
          // Set first group as default
          setActiveClassroomValue(
            authState.user.groups[0].id as unknown as string
          );
        } else {
          // Verify current active classroom is still valid for this user
          const userGroupIds = authState.user.groups.map((group) => group.id);
          if (!userGroupIds.includes(Number(activeClassroomValue))) {
            console.log(
              "WARNING: resetting classroom - user no longer has access"
            );
            setActiveClassroomValue(null);
          }
        }
      }
    } else {
      localStorage.removeItem(localStorageKey);
    }
  }, [
    authState,
    localStorageKey,
    activeClassroomValue,
    setActiveClassroomValue,
  ]);

  return {
    ...authState,
    login,
    logout,
    register,
    isLoading,
    error,
  };
};
