import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { CollectionsView, DocumentsView, DocumentContentView } from "@documentGallery/DocumentViewerContainer";
import { SearchResultsApp } from '@features/search'
import { AdminPanel } from "./features/admin";
import { JoinClassroomPage } from "./features/admin/components";
import { useAuth } from "@/hooks/useAuthContext";
import { LinkViewPage} from '@features/linkView'
import LandingPage from "./components/LandingPage";
import GetStartedPage from "./components/GetStartedPage";
import AboutPage from "./components/AboutPage";

// Main Routes component
const RouterSwitchBoard: React.FC = () => {
  
  const { user } = useAuth();
  // console.log("isadmin", user?.roles?.includes('admin'))
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} /> {/* Replace CollectionsView */}
      <Route path="/collections" element={<CollectionsView />} /> {/* Move collections here */}
      <Route path="/get-started" element={<GetStartedPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/join-classroom" element={<JoinClassroomPage />} />
      {user?.roles && (user.roles.includes('admin') || user.roles.includes('instructor')) ? (<Route path="/admin" element={<AdminPanel /> } />):(<Route path="/admin" element={<CollectionsView />}/>)}
      <Route path="/collections/:collectionId" element={<DocumentsView />} />
      <Route path="/collections/:collectionId/documents/:documentId" element={<DocumentContentView />} />
      <Route path="*" element={<Navigate to="/" replace />} />
      <Route path="/collections/:collectionId" element={<DocumentsView />} />
      <Route path="/search" element={<SearchResultsApp />} />
      <Route path="/links/:annotationId" element={<LinkViewPage />} />
    </Routes>
  );
};

export default RouterSwitchBoard;

