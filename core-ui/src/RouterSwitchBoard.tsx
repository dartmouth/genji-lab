import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { CollectionsView, DocumentsView, DocumentContentView } from "@documentGallery/DocumentViewerContainer";
import { AdminPanel } from "./features/admin";
import { useAuth } from "@/hooks/useAuthContext";



// Main Routes component
const RouterSwitchBoard: React.FC = () => {
  
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/" element={<CollectionsView />} />
      <Route path="/admin" element={user?.roles && user.roles.includes('admin') ? <AdminPanel /> : <Navigate to="/" replace />} />
      <Route path="/collections/:collectionId" element={<DocumentsView />} />
      <Route path="/collections/:collectionId/documents/:documentId" element={<DocumentContentView />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default RouterSwitchBoard;

