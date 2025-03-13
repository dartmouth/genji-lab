import React from "react";
import DocumentContentPanel from "./components/DocumentContentPanel";
import { AuthProvider } from "./components/AuthContext";
import { useAuth } from "./hooks/useAuthContext";
import "./App.css";
import ErrorBoundary from "./components/ErrorBoundary";

const AppHeader: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();

  if (!isAuthenticated || !user) return null;

  // Get initials from first and last name
  const initials = `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase();

  return (
    <header className="app-header">
      <div className="header-right">
        <div className="user-avatar">
          <span>{initials}</span>
        </div>
        <button onClick={logout}>Logout</button>
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