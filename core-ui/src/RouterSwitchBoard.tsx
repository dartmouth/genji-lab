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
import { useAuth } from "@/hooks/useAuthContext";
import { LinkViewPage } from "@features/linkView";

// Main Routes component
const RouterSwitchBoard: React.FC = () => {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/" element={<CollectionsView />} />
      <Route path="/join-classroom" element={<JoinClassroomPage />} />
      {user?.roles &&
      (user.roles.includes("admin") || user.roles.includes("instructor")) ? (
        <Route path="/admin" element={<AdminPanel />} />
      ) : (
        <Route path="/admin" element={<CollectionsView />} />
      )}
      <Route path="/collections/:collectionId" element={<DocumentsView />} />
      <Route
        path="/collections/:collectionId/documents/:documentId"
        element={<DocumentContentView />}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
      <Route path="/search" element={<SearchResultsApp />} />
      <Route path="/links/:annotationId" element={<LinkViewPage />} />
    </Routes>
  );
};

export default RouterSwitchBoard;
