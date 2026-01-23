import React, { useEffect } from "react";
import { Pagination, Typography, Box, Chip } from "@mui/material";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchDocumentsByCollection,
  fetchDocumentCollections,
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

const ITEMS_PER_PAGE = 6;

const DocumentGallery: React.FC<DocumentGalleryProps> = ({
  collectionId,
  onDocumentSelect,
  onBackToCollections,
}) => {
  const dispatch = useAppDispatch();

  const documents = useAppSelector(selectCollectionDocuments);
  const status = useAppSelector(selectDocumentsStatus);
  const error = useAppSelector(selectDocumentsError);
  const selectedCollectionId = useAppSelector(selectSelectedCollectionId);
  const collections = useAppSelector(selectAllDocumentCollections);

  const effectiveCollectionId =
    collectionId !== undefined ? collectionId : selectedCollectionId;

  const currentCollection = collections.find(
    (c) => c.id === effectiveCollectionId
  );

  // Fetch collections if not loaded (for page refresh scenarios)
  useEffect(() => {
    if (collections.length === 0) {
      dispatch(fetchDocumentCollections({ includeUsers: false }));
    }
  }, [collections.length, dispatch]);

  // Fetch documents when collection ID changes
  useEffect(() => {
    if (effectiveCollectionId) {
      dispatch(fetchDocumentsByCollection(effectiveCollectionId));
    }
  }, [effectiveCollectionId, dispatch]);

  const sortedDocuments = React.useMemo(() => {
    return [...documents].sort((a, b) => a.id - b.id);
  }, [documents]);

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

  // Extract metadata
  const metadata = currentCollection?.collection_metadata || {};
  const synopsis =
    typeof metadata.synopsis === "string" ? metadata.synopsis : "";
  const timeline =
    typeof metadata.timeline === "string" ? metadata.timeline : "";
  const characterList = Array.isArray(metadata.character_list)
    ? metadata.character_list
    : [];
  const backgroundImage =
    metadata.background_image &&
    typeof metadata.background_image === "object" &&
    "img_base64" in metadata.background_image
      ? metadata.background_image.img_base64.startsWith("data:")
        ? metadata.background_image.img_base64
        : `data:${metadata.background_image.mime_type};base64,${metadata.background_image.img_base64}`
      : null;

  if (!effectiveCollectionId) {
    return <div>No collection selected.</div>;
  }

  if (status === "loading" || collections.length === 0) {
    return <div>Loading...</div>;
  }

  if (status === "failed") {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="document-gallery-wrapper">
      {/* Page background image with low opacity */}
      {backgroundImage && (
        <div
          className="page-background-image"
          style={{
            backgroundImage: `url(${backgroundImage})`,
          }}
        />
      )}

      <div className="collection-container">
        {onBackToCollections && (
          <button onClick={handleBackClick} className="back-button">
            ← Back to Collections
          </button>
        )}

        {currentCollection && (
          <div className="collection-header">
            <h1 className="collection-heading">{currentCollection.title}</h1>

            {/* Collection Metadata Display */}
            <div className="collection-metadata-section">
              {synopsis && (
                <p className="collection-synopsis-full">{synopsis}</p>
              )}

              <div className="metadata-details">
                {timeline && (
                  <div className="metadata-item">
                    <span className="metadata-label">Timeline:</span>{" "}
                    <span className="metadata-value">{timeline}</span>
                  </div>
                )}

                {characterList.length > 0 && (
                  <div className="metadata-item">
                    <span className="metadata-label">Characters:</span>
                    <div className="character-chips">
                      {characterList.map((character, idx) => (
                        <Chip
                          key={idx}
                          label={character}
                          size="small"
                          className="character-chip"
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
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
    </div>
  );
};

export default DocumentGallery;
