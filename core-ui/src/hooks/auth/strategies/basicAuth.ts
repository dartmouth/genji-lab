import { useState, useCallback } from "react";
import axios, { AxiosInstance } from "axios";
import { AuthUser, AuthState, RegisterData } from "../core/types";
import { BasicAuthStrategy } from "./types";

const api: AxiosInstance = axios.create({
  baseURL: "/api/v1",
  timeout: 10000,
});

interface UseBasicAuthConfig {
  setAuthState: (state: AuthState) => void;
  setIsLoading: (loading: boolean) => void;
  sessionExpirationHours: number;
}

export const useBasicAuth = (config: UseBasicAuthConfig): BasicAuthStrategy => {
  const { setAuthState, setIsLoading, sessionExpirationHours } = config;

  const [error, setError] = useState<string | null>(null);

  // Basic auth login
  const login = useCallback(
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
    [sessionExpirationHours, setAuthState, setIsLoading]
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
    [sessionExpirationHours, setAuthState, setIsLoading]
  );

  return {
    name: "basic",
    login,
    register,
    error,
    setError,
  };
};