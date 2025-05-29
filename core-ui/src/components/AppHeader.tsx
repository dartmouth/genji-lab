import React from "react";
import { useAuth } from "../hooks/useAuthContext";

const AppHeader: React.FC = () => {
  const { user, isAuthenticated, logout, login, isLoading, error } = useAuth();
  const [dropdownOpen, setDropdownOpen] = React.useState(false);

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  return (
    <header className="app-header">
      <div className="header-left">
        <h1 className="app-title">The Tale of Genji</h1>
      </div>
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
                <button className="admin-button" onClick={() =>
                   window.open("/admin")}
                >
                  Administration
                </button>
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
          // Anonymous user - show login button
          <div className="auth-controls">
            <button 
              onClick={login}
              className="login-button"
              disabled={isLoading}
            >
              {isLoading ? 'Authenticating...' : 'Login with Dartmouth SSO'}
            </button>
            {error && <div className="auth-error">{error}</div>}
          </div>
        )}
      </div>
    </header>
  );
};

export default AppHeader;