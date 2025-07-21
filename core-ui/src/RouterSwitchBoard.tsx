import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { CollectionsView, DocumentsView, DocumentContentView } from "@documentGallery/DocumentViewerContainer";
import { SearchResultsApp } from '@features/search'
import { AdminPanel } from "./features/admin";
import { useAuth } from "@/hooks/useAuthContext";



// Main Routes component
const RouterSwitchBoard: React.FC = () => {
  
  const { user } = useAuth();
  // console.log("isadmin", user?.roles?.includes('admin'))
  return (
    <Routes>
      <Route path="/" element={<CollectionsView />} />
      {user?.roles?.includes('admin') ? (<Route path="/admin" element={<AdminPanel /> } />):(<Route path="/admin" element={<CollectionsView />}/>)}
      <Route path="/collections/:collectionId" element={<DocumentsView />} />
      <Route path="/collections/:collectionId/documents/:documentId" element={<DocumentContentView />} />
      <Route path="*" element={<Navigate to="/" replace />} />
      <Route path="/collections/:collectionId" element={<DocumentsView />} />
      <Route path="/search" element={<SearchResultsApp />} />
    </Routes>
  );
};

export default RouterSwitchBoard;

