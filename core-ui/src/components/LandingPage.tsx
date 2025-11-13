import React from 'react';
import { Link } from 'react-router-dom';
import './LandingPage.css'; // Optional: for additional custom styles

const LandingPage: React.FC = () => {
  return (
    <div className="landing-container">
      <div className="landing-content">
        <h1 className="landing-title">Genji Lab</h1>
        
        <nav className="landing-nav">
          <Link to="/collections" className="landing-link">
            Go to Collections
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
  );
};

export default LandingPage;