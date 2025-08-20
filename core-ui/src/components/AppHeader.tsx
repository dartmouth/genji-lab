import React, { useEffect } from "react";
import { useAuth } from "@hooks/useAuthContext";
import { useAppDispatch, useAppSelector } from "@store/hooks";
import { fetchSiteSettings } from "@store/slice/siteSettingsSlice";

const AppHeader: React.FC = () => {
  const { user, isAuthenticated, logout, login, isLoading, error } = useAuth();
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  
  const dispatch = useAppDispatch();
  const { settings } = useAppSelector((state) => state.siteSettings);

  // Load site settings on component mount
  useEffect(() => {
    dispatch(fetchSiteSettings());
  }, [dispatch]);

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  // For now, use default title since DB connection isn't ready
  const siteTitle = settings?.site_title || 'Site Title';

  return (
    <header className="app-header">
      <div className="header-left">
        <h1 className="app-title">{siteTitle}</h1>
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