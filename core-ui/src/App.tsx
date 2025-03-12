import React from "react";
import DocumentContentPanel from "./components/DocumentContentPanel";
import { AuthProvider } from "./contexts/AuthContext";
import { useAuth } from "./hooks/useAuthContext";
import "./App.css";

// Create a header component that uses the auth context
const AppHeader: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();

  if (!isAuthenticated || !user) return null;

  return (
    <header className="app-header">
      <p className="user-greeting">
        Hello, {user.first_name} {user.last_name}!
      </p>
      <button onClick={logout}>Logout</button>
    </header>
  );
};

// Main app component
const AppContent: React.FC = () => {
  return (
    <>
      <AppHeader />
      <div className="app">
        <DocumentContentPanel documentID={1} />
      </div>
    </>
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