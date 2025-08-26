import React, { useState, useEffect } from "react";
import { useAuth } from "@hooks/useAuthContext";
import "./LoginForm.css";

interface LoginFormProps {
  onCancel: () => void;
  onSwitchToRegister: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onCancel, onSwitchToRegister }) => {
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
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Login failed");
    }
  };

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

          {(formError || error) && (
            <div className="login-error">
              {formError || error}
            </div>
          )}

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