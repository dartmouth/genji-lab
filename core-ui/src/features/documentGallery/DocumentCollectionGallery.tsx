import React, { useEffect } from "react";
import { Pagination, Typography, Box } from "@mui/material";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchDocumentCollections,
  selectAllDocumentCollections,
  selectDocumentCollectionsStatus,
  selectDocumentCollectionsError,
  setSelectedCollectionId,
} from "@/store/slice";
import { usePagination } from "@/hooks/usePagination";
import "./styles/CollectionGalleryStyles.css";

interface DocumentCollectionGalleryProps {
  onCollectionSelect?: (collectionId: number) => void;
}

const ITEMS_PER_PAGE = 6; // 2 rows × 3 columns

const DocumentCollectionGallery: React.FC<DocumentCollectionGalleryProps> = ({
  onCollectionSelect,
}) => {
  const dispatch = useAppDispatch();

  // Select data using the selectors from the slice
  const collections = useAppSelector(selectAllDocumentCollections);
  const status = useAppSelector(selectDocumentCollectionsStatus);
  const error = useAppSelector(selectDocumentCollectionsError);

  // Fetch collections when component mounts
  useEffect(() => {
    if (status === "idle") {
      dispatch(fetchDocumentCollections({ includeUsers: false }));
    }
  }, [status, dispatch]);

  // Use pagination hook
  const {
    currentPage,
    totalPages,
    paginatedItems: paginatedCollections,
    startIndex,
    handlePageChange,
  } = usePagination({
    items: collections,
    itemsPerPage: ITEMS_PER_PAGE,
  });

  const handleCollectionClick = (collectionId: number) => {
    dispatch(setSelectedCollectionId(collectionId));
    if (onCollectionSelect) {
      onCollectionSelect(collectionId);
    }
  };

  // Handle different states
  if (status === "loading") {
    return <div>Loading document collections...</div>;
  }

  if (status === "failed") {
    return <div>Error: {error}</div>;
  }

  if (!collections || collections.length === 0) {
    return <div>No document collections found.</div>;
  }

  return (
    <div className="collection-container">
      <h1 className="collection-heading">Document Collections</h1>

      <div className="collection-grid">
        {paginatedCollections.map((collection) => (
          <div
            key={collection.id}
            className="collection-card"
            onClick={() => handleCollectionClick(collection.id)}
            style={{ cursor: "pointer" }}
          >
            <div className="card-content">
              <h2 className="collection-title">{collection.title}</h2>
              <p className="collection-description">{collection.description}</p>
              <div className="collection-metadata">
                <span>Language: {collection.language}</span>
              </div>
              {collection.document_count !== undefined && (
                <div className="document-count-section">
                  <p className="document-count-text">
                    {collection.document_count} document
                    {collection.document_count !== 1 ? "s" : ""}
                  </p>
                </div>
              )}
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
            {Math.min(startIndex + ITEMS_PER_PAGE, collections.length)} of{" "}
            {collections.length} collections
          </Typography>
        </Box>
      )}
    </div>
  );
};

export default DocumentCollectionGallery;
