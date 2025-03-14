import React from "react";
import DocumentContentPanel from "./components/DocumentContentPanel";
import { AuthProvider } from "./components/AuthContext";
import AppHeader from "./components/AppHeader";
import ErrorBoundary from "./components/ErrorBoundary";
import "./App.css";

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