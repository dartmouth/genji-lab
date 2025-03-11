import React, { useState, useEffect } from "react";
import DocumentContentPanel from "./components/DocumentContentPanel";
import Auth from "./components/Auth";
import { Annotation } from "./types/annotation";
import "./App.css";

interface User {
  id: number;
  first_name: string;
  last_name: string;
}

// Function to get a cookie value
const getCookie = (name: string) => {
  const cookies = document.cookie.split("; ");
  for (const cookie of cookies) {
    const [key, value] = cookie.split("=");
    if (key === name) {
      return decodeURIComponent(value);
    }
  }
  return null;
};

// Function to decode JWT manually (Base64 decoding)
const decodeJWT = (token: string): User | null => {
  try {
    return JSON.parse(atob(token)); // Decode base64 token
  } catch (error) {
    console.error("Error decoding JWT:", error);
    return null;
  }
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const jwt = getCookie("token");
    if (jwt) {
      const decodedUser = decodeJWT(jwt);
      if (decodedUser) {
        setUser(decodedUser);
      }
    }
  }, []);

  // Logout function to clear JWT cookie
  const handleLogout = () => {
    document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/";
    setUser(null);
  };

  // Sample annotations
  const sampleAnnotations: Annotation[] = [
    {
      "@context": "http://www.w3.org/ns/anno.jsonld",
      "id": "anno1",
      "type": "Annotation",
      "creator": "User 1",
      "created": "2023-04-05T12:00:00Z",
      "modified": "2023-04-05T12:00:00Z",
      "generator": "App",
      "generated": "2023-04-05T12:00:00Z",
      "motivation": "commenting",
      "body": {
        "id": "body1",
        "type": "TextualBody",
        "value": "This is an interesting passage about the Emperor.",
        "format": "text/plain",
        "language": "en"
      },
      "target": [
        {
          "id": "target1",
          "type": "Text",
          "source": "P1",
          "selector": {
            "type": "TextQuoteSelector",
            "value": "woman of rather undistinguished lineage",
            "refinedBy": {
              "type": "TextPositionSelector",
              "start": 35,
              "end": 68
            }
          }
        }
      ]
    },
    {
      "@context": "http://www.w3.org/ns/anno.jsonld",
      "id": "anno2",
      "type": "Annotation",
      "creator": "User 2",
      "created": "2023-04-06T14:30:00Z",
      "modified": "2023-04-06T14:30:00Z",
      "generator": "App",
      "generated": "2023-04-06T14:30:00Z",
      "motivation": "commenting",
      "body": {
        "id": "body2",
        "type": "TextualBody",
        "value": "The Emperor's emotions are clearly described here.",
        "format": "text/plain",
        "language": "en"
      },
      "target": [
        {
          "id": "target2",
          "type": "Text",
          "source": "P2",
          "selector": {
            "type": "TextQuoteSelector",
            "value": "His Majesty could see",
            "refinedBy": {
              "type": "TextPositionSelector",
              "start": 0,
              "end": 21
            }
          }
        }
      ]
    }
  ];

  return (
    <div className="app">
      {/* Show Auth if no user is logged in */}
      {!user && <Auth onLogin={setUser} />}

      {/* Display user info & Logout button */}
      {user && (
        <header className="app-header">
          <p className="user-greeting">Hello, {user.first_name} {user.last_name}!</p>
          <button onClick={handleLogout}>Logout</button>
        </header>
      )}

      {/* Main content */}
      <DocumentContentPanel documentID="DOC1" annotations={sampleAnnotations} />
    </div>
  );
};

export default App;