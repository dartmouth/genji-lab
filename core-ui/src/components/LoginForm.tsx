import React, { useState, useEffect } from "react";
import { useAuth } from "@hooks/useAuthContext";
import "./LoginForm.css";

interface LoginFormProps {
  onCancel: () => void;
  onSwitchToRegister: () => void;
}

// Map error codes and messages to user-friendly text
const getFriendlyErrorMessage = (error: string | null): string => {
  if (!error) return "";

  // Check for specific error patterns
  if (
    error.includes("401") ||
    error.toLowerCase().includes("invalid username or password")
  ) {
    return "Invalid username or password. Please try again.";
  }
  if (error.includes("400") || error.toLowerCase().includes("missing")) {
    return "Please fill in all required fields.";
  }
  if (error.includes("403") || error.toLowerCase().includes("inactive")) {
    return "Your account has been disabled. Please contact support.";
  }
  if (error.includes("500") || error.toLowerCase().includes("server error")) {
    return "Server error. Please try again later.";
  }
  if (
    error.toLowerCase().includes("network") ||
    error.toLowerCase().includes("timeout")
  ) {
    return "Network error. Please check your connection and try again.";
  }
  if (error.toLowerCase().includes("password authentication not available")) {
    return "This account uses institutional login. Please use 'Login with Dartmouth SSO' instead.";
  }

  // If it's already a friendly message, return it
  if (!error.match(/\d{3}/) && error.length < 100) {
    return error;
  }

  // Generic fallback
  return "Login failed. Please check your credentials and try again.";
};

const LoginForm: React.FC<LoginFormProps> = ({
  onCancel,
  onSwitchToRegister,
}) => {
  const { login, isLoading, error, isAuthenticated } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // Close form when authentication succeeds
  useEffect(() => {
    if (isAuthenticated) {
      onCancel();
    }
  }, [isAuthenticated, onCancel]);

  // Clear form error when user starts typing
  useEffect(() => {
    if (formError) {
      setFormError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username, password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!username.trim() || !password.trim()) {
      setFormError("Please enter both username and password");
      return;
    }

    try {
      await login(username, password);
      // Login successful, form will be hidden by parent component
    } catch {
      // Error is already set by the auth hook and displayed via error prop
    }
  };

  // Get the friendly error message
  const displayError = formError || getFriendlyErrorMessage(error);

  return (
    <div className="login-form-overlay">
      <div className="login-form-container">
        <form onSubmit={handleSubmit} className="login-form">
          <h3>Login</h3>

          <div className="form-field">
            <label htmlFor="username">Username:</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
              autoComplete="username"
              autoFocus
            />
          </div>

          <div className="form-field">
            <label htmlFor="password">Password:</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              autoComplete="current-password"
            />
          </div>

          {displayError && <div className="login-error">{displayError}</div>}

          <div className="form-actions">
            <button
              type="button"
              onClick={onCancel}
              className="cancel-button"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="submit-button"
              disabled={isLoading}
            >
              {isLoading ? "Logging in..." : "Login"}
            </button>
          </div>

          <div className="form-footer">
            <p>
              Don't have an account?{" "}
              <button
                type="button"
                onClick={onSwitchToRegister}
                className="link-button"
                disabled={isLoading}
              >
                Create one
              </button>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginForm;
