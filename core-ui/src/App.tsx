import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./components/AuthContext";
import AppHeader from "./components/AppHeader";
import ErrorBoundary from "./components/ErrorBoundary";
import "./App.css";

import { Provider } from 'react-redux';
import { store } from "./store";
import DocumentViewerContainer from "./features/documentGallery/DocumentViewerContainer";

// Main app component
const AppContent: React.FC = () => {

  return (
    <div className="main">
      <AppHeader />
      <div className="app">
        <ErrorBoundary>
          <Router>
            <Routes>
              <Route path="/*" element={<DocumentViewerContainer />} />
            </Routes>
          </Router>
        </ErrorBoundary>
      </div>
    </div>
  );
};

// Root component with the provider
const App: React.FC = () => {
  return (
    <Provider store={store}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Provider>
  );
};

export default App;