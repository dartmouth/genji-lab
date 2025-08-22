import React from "react";
import { useAuth } from "@hooks/useAuthContext";
import { SimpleSearchBar } from "@/features/search";
import LoginForm from "./LoginForm";
import "../features/documentView/styles/AuthStyles.css";

const AppHeader: React.FC = () => {
  const { user, isAuthenticated, logout, login, isLoading, error } = useAuth();
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const [showLoginForm, setShowLoginForm] = React.useState(false);

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
          // Anonymous user - show login buttons
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
            {error && <div className="auth-error">{error}</div>}
          </div>
          
        )}
      </div>
      {showLoginForm && (
        <LoginForm onCancel={handleLoginFormCancel} />
      )}
    </header>
  );
};

export default AppHeader;