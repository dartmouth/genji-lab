import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@hooks/useAuthContext";

import { useAppDispatch, useAppSelector } from "@store/hooks";
import { fetchSiteSettings, getCacheBuster } from "@store/slice/siteSettingsSlice";
import { SimpleSearchBar } from "@/features/search";
import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";
import "../features/documentView/styles/AuthStyles.css";


const AppHeader: React.FC = () => {
  const { user, isAuthenticated, logout, login, isLoading, error } = useAuth();
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const navigate = useNavigate();
  
  const dispatch = useAppDispatch();
  const { settings } = useAppSelector((state) => state.siteSettings);

  // Load site settings on component mount
  useEffect(() => {
    dispatch(fetchSiteSettings());
  }, [dispatch]);

  // Update CSS when settings change
  useEffect(() => {
    const logoEnabled = settings?.site_logo_enabled || false;
    const headerElement = document.querySelector('.app-header') as HTMLElement;
    
    if (headerElement) {
      if (logoEnabled) {
        // Get cache buster and update logo URL
        dispatch(getCacheBuster()).then((result) => {
          if (getCacheBuster.fulfilled.match(result)) {
            const timestamp = result.payload;
            headerElement.classList.add('has-logo');
            // Update the CSS to use cache buster
            const style = document.createElement('style');
            style.textContent = `
              .app-header.has-logo::before {
                background: url("/api/v1/site-settings/logo?t=${timestamp}") no-repeat center !important;
                background-size: 100% 100% !important;
              }
            `;
            // Remove old cache buster styles
            const oldStyles = document.querySelectorAll('style[data-logo-cache]');
            oldStyles.forEach(s => s.remove());
            style.setAttribute('data-logo-cache', 'true');
            document.head.appendChild(style);
          }
        });
      } else {
        headerElement.classList.remove('has-logo');
        // Remove cache buster styles
        const oldStyles = document.querySelectorAll('style[data-logo-cache]');
        oldStyles.forEach(s => s.remove());
      }
    }
  }, [settings?.site_logo_enabled, dispatch]);

  const [showLoginForm, setShowLoginForm] = React.useState(false);
  const [showRegisterForm, setShowRegisterForm] = React.useState(false);


  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };


  // Site title
  const { isLoading: settingsLoading } = useAppSelector((state) => state.siteSettings);
  const siteTitle = settings?.site_title || '';

  const handleCasLogin = () => {
    login(); // Call without parameters for CAS authentication
  };

  const handleTitleClick = () => {
    navigate('/');
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
        <h1 className="app-title clickable" onClick={handleTitleClick}>
          {settingsLoading ? '\u00A0' : (siteTitle || 'Genji')}
        </h1>
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
                {user?.groups && user.groups.length > 0 ? (
                  <div>
                    <div>Classroom</div>
                <select 
                  className="group-selector"
                  defaultValue={user.groups[0].id}
                  onChange={(e) => {
                    // Handle group selection
                    console.log('Selected group ID:', e.target.value);
                  }}
                >
                  {user.groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
                </div>
              ) : (
                <div>No groups</div>)}
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