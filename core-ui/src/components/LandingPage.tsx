// core-ui/src/components/LandingPage.tsx

import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@hooks/useAuthContext";
import { TutorialModal } from "./TutorialModal";
import { useTutorial } from "@hooks/useTutorial";
import "./LandingPage.css";

const LandingPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { showTutorial, openTutorial, closeTutorial, completeTutorial } =
    useTutorial();

  // Auto-show tutorial for first-time authenticated users
  useEffect(() => {
    if (isAuthenticated && user && !user.viewed_tutorial) {
      openTutorial();
    }
  }, [isAuthenticated, user, openTutorial]);

  const handleTutorialComplete = async () => {
    if (user) {
      await completeTutorial(user.id);
    }
  };

  return (
    <>
      <div className="landing-container">
        <div className="landing-content">
          <h1 className="landing-title">Genji Lab</h1>

          <nav className="landing-nav">
            <Link to="/collections" className="landing-link">
              Go to Collections
            </Link>

            <Link to="/intertext-links" className="landing-link">
              Browse Intertext Links
            </Link>

            <Link to="/get-started" className="landing-link">
              Get Started
            </Link>

            <Link to="/about" className="landing-link">
              About this Project
            </Link>
          </nav>
        </div>
      </div>

      {/* Tutorial Modal - only for authenticated first-time users */}
      {isAuthenticated && (
        <TutorialModal
          open={showTutorial}
          onClose={closeTutorial}
          onComplete={handleTutorialComplete}
        />
      )}
    </>
  );
};

export default LandingPage;
