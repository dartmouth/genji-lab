import React, { useEffect } from "react";
import { Pagination, Typography, Box } from "@mui/material";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchDocumentsByCollection,
  selectCollectionDocuments,
  selectDocumentsStatus,
  selectDocumentsError,
  selectSelectedCollectionId,
  selectAllDocumentCollections,
} from "@/store/slice";
import { usePagination } from "@/hooks/usePagination";
import "../styles/CollectionGalleryStyles.css";

interface DocumentGalleryProps {
  collectionId?: number | null;
  onDocumentSelect?: (documentId: number) => void;
  onBackToCollections?: () => void;
}

const ITEMS_PER_PAGE = 6; // 2 rows × 3 columns

const DocumentGallery: React.FC<DocumentGalleryProps> = ({
  collectionId,
  onDocumentSelect,
  onBackToCollections,
}) => {
  const dispatch = useAppDispatch();

  // Select data using the selectors from the slice
  const documents = useAppSelector(selectCollectionDocuments);
  const status = useAppSelector(selectDocumentsStatus);
  const error = useAppSelector(selectDocumentsError);
  const selectedCollectionId = useAppSelector(selectSelectedCollectionId);
  const collections = useAppSelector(selectAllDocumentCollections);

  // Determine which collection ID to use (from props or redux)
  const effectiveCollectionId =
    collectionId !== undefined ? collectionId : selectedCollectionId;

  // Find the current collection to display its details
  const currentCollection = collections.find(
    (c) => c.id === effectiveCollectionId
  );

  // Fetch documents when collection ID changes
  useEffect(() => {
    if (effectiveCollectionId) {
      dispatch(fetchDocumentsByCollection(effectiveCollectionId));
    }
  }, [effectiveCollectionId, dispatch]);

  // Sort documents by ID before pagination
  const sortedDocuments = React.useMemo(() => {
    return [...documents].sort((a, b) => a.id - b.id);
  }, [documents]);

  // Use pagination hook with sorted documents
  const {
    currentPage,
    totalPages,
    paginatedItems: paginatedDocuments,
    startIndex,
    handlePageChange,
  } = usePagination({
    items: sortedDocuments,
    itemsPerPage: ITEMS_PER_PAGE,
  });

  const handleDocumentClick = (documentId: number) => {
    if (onDocumentSelect) {
      onDocumentSelect(documentId);
    }
  };

  const handleBackClick = () => {
    if (onBackToCollections) {
      onBackToCollections();
    }
  };

  // Handle different states
  if (!effectiveCollectionId) {
    return <div>No collection selected.</div>;
  }

  if (status === "loading") {
    return <div>Loading documents...</div>;
  }

  if (status === "failed") {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="collection-container">
      {onBackToCollections && (
        <button onClick={handleBackClick} className="back-button">
          ← Back to Collections
        </button>
      )}

      {currentCollection && (
        <div className="collection-header">
          <h1 className="collection-heading">{currentCollection.title}</h1>
          <p className="collection-description">
            {currentCollection.description}
          </p>
        </div>
      )}

      <h2 className="documents-heading">Documents</h2>

      {documents.length === 0 ? (
        <div className="empty-state">
          No documents found in this collection.
        </div>
      ) : (
        <>
          <div className="collection-grid">
            {paginatedDocuments.map((document) => (
              <div
                key={document.id}
                className="collection-card"
                onClick={() => handleDocumentClick(document.id)}
                style={{ cursor: "pointer" }}
              >
                <div className="card-content">
                  <h2 className="collection-title">{document.title}</h2>
                  <p className="collection-description">
                    {document.description}
                  </p>
                  <div className="document-metadata"></div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <Box className="pagination-container">
              <Pagination
                count={totalPages}
                page={currentPage}
                onChange={handlePageChange}
                color="primary"
                size="large"
                showFirstButton
                showLastButton
                siblingCount={1}
                boundaryCount={1}
              />
              <Typography variant="caption" className="pagination-info">
                Showing {startIndex + 1}-
                {Math.min(startIndex + ITEMS_PER_PAGE, documents.length)} of{" "}
                {documents.length} documents
              </Typography>
            </Box>
          )}
        </>
      )}
    </div>
  );
};

export default DocumentGallery;
