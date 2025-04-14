import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { CollectionsView, DocumentsView, DocumentContentView } from "@documentGallery/DocumentViewerContainer";

// Main Routes component
const RouterSwitchBoard: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<CollectionsView />} />
      <Route path="/collections/:collectionId" element={<DocumentsView />} />
      <Route path="/collections/:collectionId/documents/:documentId" element={<DocumentContentView />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default RouterSwitchBoard;