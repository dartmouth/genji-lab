import React from "react";
import { DocumentContentPanel } from "@documentView";
import { AuthProvider } from "./components/AuthContext";
import AppHeader from "./components/AppHeader";
import ErrorBoundary from "./components/ErrorBoundary";
import "./App.css";

import { SelectionProvider } from './features/documentView/components/SelectionProvider';
import SelectionReduxBridge from './features/documentView//components/SelectionReduxBridge';

import { Provider } from 'react-redux';
import { store } from "./store";

// Main app component
const AppContent: React.FC = () => {
  return (
    <div className="main">
      <AppHeader />
      <div className="app">
        <ErrorBoundary>
          <DocumentContentPanel documentID={1} documentCollectionId={1} />
        </ErrorBoundary>
      </div>
    </div>
  );
};

// Root component with the provider
const App: React.FC = () => {
  return (
    <Provider store = {store}>
      <SelectionProvider>
        <SelectionReduxBridge />
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </SelectionProvider>
    </Provider>
  );
};

export default App;