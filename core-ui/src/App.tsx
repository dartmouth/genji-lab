import React from "react";
import DocumentContentPanel from "./components/DocumentContentPanel";
import { useIAM } from "./hooks/useIAM";
import { Annotation } from "./types/annotation";
import "./App.css";

const App: React.FC = () => {
  const { user, isAuthenticated, renderUserSelection, logout } = useIAM();

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
      <DocumentContentPanel documentID="DOC1" annotations={sampleAnnotations} />
    </div>
  );
};

export default App;