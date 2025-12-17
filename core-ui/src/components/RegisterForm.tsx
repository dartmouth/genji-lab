import React, { useState, useEffect } from "react";
import { useAuth } from "@hooks/useAuthContext";
import { RegisterData } from "../contexts/contextDefinition";
import "./RegisterForm.css";

interface RegisterFormProps {
  onCancel: () => void;
  onSwitchToLogin: () => void;
}

interface RegisterFormData extends RegisterData {
  confirmPassword: string;
}

// Map error codes and messages to user-friendly text
const getFriendlyErrorMessage = (error: string | null): string => {
  if (!error) return "";

  // Check for specific error patterns
  if (
    error.includes("400") ||
    error.toLowerCase().includes("already registered")
  ) {
    return "This email is already registered. Please use a different email or try logging in.";
  }
  if (
    error.toLowerCase().includes("username already taken") ||
    (error.toLowerCase().includes("username") &&
      error.toLowerCase().includes("exists"))
  ) {
    return "This username is already taken. Please choose a different username.";
  }
  if (error.includes("409") || error.toLowerCase().includes("conflict")) {
    return "This email or username is already registered. Please try logging in instead.";
  }
  if (error.includes("422") || error.toLowerCase().includes("validation")) {
    return "Please check that all fields meet the requirements.";
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
  if (error.toLowerCase().includes("password")) {
    return "Password does not meet requirements. Must be 8+ characters with uppercase, lowercase, and number.";
  }
  if (error.toLowerCase().includes("email")) {
    return "Please enter a valid email address.";
  }

  // If it's already a friendly message, return it
  if (!error.match(/\d{3}/) && error.length < 150) {
    return error;
  }

  // Generic fallback
  return "Registration failed. Please check your information and try again.";
};

const RegisterForm: React.FC<RegisterFormProps> = ({
  onCancel,
  onSwitchToLogin,
}) => {
  const { isAuthenticated, register, error: authError } = useAuth();
  const [formData, setFormData] = useState<RegisterFormData>({
    first_name: "",
    last_name: "",
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  // Close form when authentication succeeds
  useEffect(() => {
    if (isAuthenticated) {
      onCancel();
    }
  }, [isAuthenticated, onCancel]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.first_name.trim()) {
      errors.first_name = "First name is required";
    }

    if (!formData.last_name.trim()) {
      errors.last_name = "Last name is required";
    }

    if (!formData.email.trim()) {
      errors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = "Email is invalid";
    }

    if (!formData.username.trim()) {
      errors.username = "Username is required";
    } else if (formData.username.length < 3) {
      errors.username = "Username must be at least 3 characters";
    } else if (!/^[a-zA-Z0-9._-]+$/.test(formData.username)) {
      errors.username =
        "Username can only contain letters, numbers, periods, underscores, and hyphens";
    }

    if (!formData.password) {
      errors.password = "Password is required";
    } else if (formData.password.length < 8) {
      errors.password = "Password must be at least 8 characters";
    } else if (!/(?=.*[a-z])/.test(formData.password)) {
      errors.password = "Password must contain at least one lowercase letter";
    } else if (!/(?=.*[A-Z])/.test(formData.password)) {
      errors.password = "Password must contain at least one uppercase letter";
    } else if (!/(?=.*\d)/.test(formData.password)) {
      errors.password = "Password must contain at least one number";
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setValidationErrors({});

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      if (register === undefined) {
        return;
      }

      await register({
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        username: formData.username,
        password: formData.password,
      });

      // Registration successful, user will be automatically logged in
      // The useEffect will close the form when isAuthenticated becomes true
    } catch (err) {
      console.error("Registration error:", err);
      // Error will be shown via authError
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear validation error when user starts typing
    if (validationErrors[name]) {
      setValidationErrors((prev) => ({ ...prev, [name]: "" }));
    }

    // Clear server error when user starts typing
    if (error || authError) {
      setError(null);
    }
  };

  // Get the friendly error message
  const displayError = error || getFriendlyErrorMessage(authError);

  return (
    <div className="register-form-overlay">
      <div className="register-form-container">
        <form onSubmit={handleSubmit} className="register-form">
          <h3>Create Account</h3>

          <div className="form-row">
            <div className="form-field half-width">
              <label htmlFor="first_name">First Name:</label>
              <input
                id="first_name"
                name="first_name"
                type="text"
                value={formData.first_name}
                onChange={handleInputChange}
                disabled={isLoading}
                className={validationErrors.first_name ? "error" : ""}
              />
              {validationErrors.first_name && (
                <div className="field-error">{validationErrors.first_name}</div>
              )}
            </div>

            <div className="form-field half-width">
              <label htmlFor="last_name">Last Name:</label>
              <input
                id="last_name"
                name="last_name"
                type="text"
                value={formData.last_name}
                onChange={handleInputChange}
                disabled={isLoading}
                className={validationErrors.last_name ? "error" : ""}
              />
              {validationErrors.last_name && (
                <div className="field-error">{validationErrors.last_name}</div>
              )}
            </div>
          </div>

          <div className="form-field">
            <label htmlFor="email">Email:</label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              disabled={isLoading}
              autoComplete="email"
              className={validationErrors.email ? "error" : ""}
            />
            {validationErrors.email && (
              <div className="field-error">{validationErrors.email}</div>
            )}
          </div>

          <div className="form-field">
            <label htmlFor="username">Username:</label>
            <input
              id="username"
              name="username"
              type="text"
              value={formData.username}
              onChange={handleInputChange}
              disabled={isLoading}
              autoComplete="username"
              className={validationErrors.username ? "error" : ""}
            />
            {validationErrors.username && (
              <div className="field-error">{validationErrors.username}</div>
            )}
          </div>

          <div className="form-field">
            <label htmlFor="password">Password:</label>
            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleInputChange}
              disabled={isLoading}
              autoComplete="new-password"
              className={validationErrors.password ? "error" : ""}
            />
            {validationErrors.password && (
              <div className="field-error">{validationErrors.password}</div>
            )}
          </div>

          <div className="form-field">
            <label htmlFor="confirmPassword">Confirm Password:</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              disabled={isLoading}
              autoComplete="new-password"
              className={validationErrors.confirmPassword ? "error" : ""}
            />
            {validationErrors.confirmPassword && (
              <div className="field-error">
                {validationErrors.confirmPassword}
              </div>
            )}
          </div>

          {displayError && <div className="register-error">{displayError}</div>}

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
              {isLoading ? "Creating Account..." : "Create Account"}
            </button>
          </div>

          <div className="form-footer">
            <p>
              Already have an account?{" "}
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="link-button"
                disabled={isLoading}
              >
                Sign in
              </button>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterForm;
