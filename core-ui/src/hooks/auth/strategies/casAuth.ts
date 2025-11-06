import { useState, useCallback } from "react";
import axios, { AxiosInstance } from "axios";
import { AuthUser, AuthState } from "../core/types";
import { CASAuthStrategy } from "./types";

const api: AxiosInstance = axios.create({
  baseURL: "/api/v1",
  timeout: 10000,
});

interface UseCASAuthConfig {
  casServerUrl: string;
  serviceUrl: string;
  setAuthState: (state: AuthState) => void;
  setIsLoading: (loading: boolean) => void;
  sessionExpirationHours: number;
  enabled?: boolean; // Add this
}

export const useCASAuth = (config: UseCASAuthConfig): CASAuthStrategy => {
  const {
    casServerUrl,
    serviceUrl,
    setAuthState,
    setIsLoading,
    sessionExpirationHours,
    enabled = true, // Default to true
  } = config;


  const [error, setError] = useState<string | null>(null);

  // CAS auth login
  const login = useCallback(() => {
    if (!enabled || !casServerUrl || !serviceUrl) {
      setError("CAS configuration not provided");
      return;
    }

    let casUrl = casServerUrl;
    if (!casUrl.startsWith("http://") && !casUrl.startsWith("https://")) {
      casUrl = `https://${casUrl}`;
    }

    const loginUrl = `${casUrl}/cas/login?service=${serviceUrl}`;
    window.location.href = loginUrl;
  }, [casServerUrl, serviceUrl, enabled]);

  // Extract and validate CAS ticket from URL
  const checkForTicket = useCallback(async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const ticket = urlParams.get("ticket");

    if (ticket && casServerUrl && serviceUrl) {
        if (!enabled) return;
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
  }, [casServerUrl, serviceUrl, sessionExpirationHours, setAuthState, setIsLoading, enabled]);

  return {
    name: "cas",
    login,
    checkForTicket,
    error,
    setError,
  };
};