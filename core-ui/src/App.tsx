
import React from "react";
import DocumentContentPanel from "./components/DocumentContentPanel";
import { useIAM } from "./hooks/useIAM";
import { Annotation } from "./types/annotation";
import "./App.css";

const App: React.FC = () => {
  const { user, isAuthenticated, renderUserSelection, logout } = useIAM();

  return (
    <div className="app">
      {/* ✅ Show user selection if no user is logged in */}
      {renderUserSelection()}

      {/* ✅ Show Logout & User Info if authenticated */}
      {isAuthenticated && user && (
        <header className="app-header">
          <p className="user-greeting">
            Hello, {user.first_name} {user.last_name}!
          </p>
          <button onClick={logout}>Logout</button>
        </header>
      )}

      {/* Main content */}
     <DocumentContentPanel documentID={1}/>

    </div>
  );
};

export default App;