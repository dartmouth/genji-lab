import { useState, useEffect, useCallback } from "react";
import axios, { AxiosInstance } from "axios";
import useLocalStorage from "../../useLocalStorage";
import { AuthState, AuthUser, AuthCoreConfig } from "./types";

const api: AxiosInstance = axios.create({
  baseURL: "/api/v1",
  timeout: 10000,
});

interface UseAuthCoreReturn {
  authState: AuthState;
  setAuthState: (state: AuthState) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
}

export const useAuthCore = (config: AuthCoreConfig): UseAuthCoreReturn => {
  const { localStorageKey = "auth_data", sessionExpirationHours = 24 } = config;

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
  });

  const [activeClassroomValue, setActiveClassroomValue] =
    useLocalStorage("active_classroom");

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

  // Logout function - simplified to only clear auth data
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

    setIsLoading(false);
  }, []);

  // Load auth state from localStorage on mount
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
  }, [localStorageKey]);

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
    authState,
    setAuthState,
    isLoading,
    setIsLoading,
    logout,
    checkSession,
  };
};
