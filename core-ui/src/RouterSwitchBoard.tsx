import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import {
  CollectionsView,
  DocumentsView,
  DocumentContentView,
} from "@documentGallery/DocumentViewerContainer";
import { SearchResultsApp } from "@features/search";
import { AdminPanel } from "./features/admin";
import { JoinClassroomPage } from "./features/admin/components";
import { LinkViewPage } from "@features/linkView";
import LandingPage from "./components/LandingPage";
import GetStartedPage from "./components/GetStartedPage";
import DocumentElementViewer from "./features/canonicalLink/documentElementView";
import AboutPage from "./components/AboutPage";
import IntertextLinksGallery from "./features/linkView/IntertextLinksGallery";
import ProtectedRoute from "./components/ProtectedRoute";

// Main Routes component
const RouterSwitchBoard: React.FC = () => {
  return (
    <Routes>
      {/* Public routes - no authentication required */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/get-started" element={<GetStartedPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/collections" element={<CollectionsView />} />
      <Route path="/collections/:collectionId" element={<DocumentsView />} />
      <Route
        path="/collections/:collectionId/documents/:documentId"
        element={<DocumentContentView />}
      />
      <Route path="/intertext-links" element={<IntertextLinksGallery />} />
      <Route path="/search" element={<SearchResultsApp />} />
      <Route path="/links/:annotationId" element={<LinkViewPage />} />
      <Route path="/element" element={<DocumentElementViewer />} />

      {/* Protected routes - authentication required */}
      <Route
        path="/join-classroom"
        element={
          <ProtectedRoute>
            <JoinClassroomPage />
          </ProtectedRoute>
        }
      />

      {/* Admin-only routes - requires admin or instructor role */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute requiredRoles={["admin", "instructor"]}>
            <AdminPanel />
          </ProtectedRoute>
        }
      />

      {/* Catch-all route - redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default RouterSwitchBoard;
