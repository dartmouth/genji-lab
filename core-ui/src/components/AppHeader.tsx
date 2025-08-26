import React from "react";
import { useAuth } from "@hooks/useAuthContext";
import { SimpleSearchBar } from "@/features/search";
import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";
import "../features/documentView/styles/AuthStyles.css";

const AppHeader: React.FC = () => {
  const { user, isAuthenticated, logout, login, isLoading, error } = useAuth();
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const [showLoginForm, setShowLoginForm] = React.useState(false);
  const [showRegisterForm, setShowRegisterForm] = React.useState(false);

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  const handleCasLogin = () => {
    login(); // Call without parameters for CAS authentication
  };

  const handleBasicAuthClick = () => {
    setShowLoginForm(true);
  };

  const handleLoginFormCancel = () => {
    setShowLoginForm(false);
  };

  const handleRegisterClick = () => {
    setShowRegisterForm(true);
  };

  const handleRegisterFormCancel = () => {
    setShowRegisterForm(false);
  };

  const handleSwitchToLogin = () => {
    setShowRegisterForm(false);
    setShowLoginForm(true);
  };

  const handleSwitchToRegister = () => {
    setShowLoginForm(false);
    setShowRegisterForm(true);
  };

  return (
    <header className="app-header">
      <div className="header-left">
        <h1 className="app-title">The Tale of Genji</h1>
      </div>
      <SimpleSearchBar></SimpleSearchBar>
      <div className="header-right">
        {isAuthenticated && user ? (
          // Authenticated user - show avatar and dropdown
          <div className="user-avatar-container">
            <div className="user-avatar" onClick={toggleDropdown}>
              <span>{`${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase()}</span>
            </div>
            {dropdownOpen && (
              <div className="dropdown-menu">
                <div className="user-info">
                  {`Welcome, ${user.first_name} ${user.last_name}`}
                </div>
                {user?.roles && user.roles.includes('admin') ?
                (<button className="admin-button" onClick={() =>
                   window.location.href = "/admin"}
                >
                  Administration
                </button>):(
                  <div></div>
                  )}
                <br/><br/>
                <button className="logout-button" onClick={() => {
                  toggleDropdown()
                  logout()
                  }}>
                  Logout
                </button>
              </div>
            )}
          </div>
        ) : (
          // Anonymous user - show auth buttons
          <div className="auth-controls">
            <button 
              onClick={handleCasLogin}
              className="login-button cas-login"
              disabled={isLoading}
            >
              {isLoading ? 'Authenticating...' : 'Login with Dartmouth SSO'}
            </button>
            <button 
              onClick={handleBasicAuthClick}
              className="login-button basic-login"
              disabled={isLoading}
            >
              Login
            </button>
            <button 
              onClick={handleRegisterClick}
              className="login-button register-button"
              disabled={isLoading}
            >
              Register
            </button>
            {error && <div className="auth-error">{error}</div>}
          </div>
          
        )}
      </div>
      {showLoginForm && (
        <LoginForm 
          onCancel={handleLoginFormCancel} 
          onSwitchToRegister={handleSwitchToRegister} 
        />
      )}
      {showRegisterForm && (
        <RegisterForm 
          onCancel={handleRegisterFormCancel}
          onSwitchToLogin={handleSwitchToLogin}
        />
      )}
    </header>
  );
};

export default AppHeader;