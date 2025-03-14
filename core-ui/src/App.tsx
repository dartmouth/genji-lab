import React from "react";
import DocumentContentPanel from "./components/DocumentContentPanel";
import { AuthProvider } from "./components/AuthContext";
import { useAuth } from "./hooks/useAuthContext";
import "./App.css";
import ErrorBoundary from "./components/ErrorBoundary";

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
      <div className="header-right">
        <div className="user-avatar-container">
          <div className="user-avatar" onClick={toggleDropdown}>
            <span>{initials}</span>
          </div>
          {dropdownOpen && (
            <div className="dropdown-menu">
              <div className="user-info">
                {user.first_name} {user.last_name}
              </div>
              <button className="logout-button" onClick={logout}>
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

// Main app component
const AppContent: React.FC = () => {
  return (
    <div className="main">
      <AppHeader />
      <div className="app">
        <ErrorBoundary>
        <DocumentContentPanel documentID={1} />
        </ErrorBoundary>
        
      </div>
    </div>
  );
};

// Root component with the provider
const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;