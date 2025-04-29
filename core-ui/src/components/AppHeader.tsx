import React from "react";
import { useAuth } from "../hooks/useAuthContext";

const AppHeader: React.FC = () => {
    const { user, isAuthenticated, logout } = useAuth();
    const [dropdownOpen, setDropdownOpen] = React.useState(false);
  
    if (!isAuthenticated || !user) return null;
  
    // Get initials from first and last name
    const initials = `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase();
  
    const toggleDropdown = () => {
      setDropdownOpen(!dropdownOpen);
    };
  
    return (
      <header className="app-header">
        <div className="header-left">
          <h1 className="app-title">The Tale of Genji</h1>
        </div>
        <div className="header-right">
          <div className="user-avatar-container">
            <div className="user-avatar" onClick={toggleDropdown}>
              <span>{initials}</span>
            </div>
            {dropdownOpen && (
              <div className="dropdown-menu">
                <div className="user-info">
                  {`Welcome, ${user.first_name} ${user.last_name}`}
                </div>
                <div>
                  <a href="/admin" className="admin-link">Admin Panel</a>
                </div>
                <button className="logout-button" onClick={() => {
                  toggleDropdown()
                  logout()
                  }}>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
    );
  };

  export default AppHeader