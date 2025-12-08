import React from "react";
import {
  Box,
  Button,
  Chip,
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  Tooltip,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  Add as AddIcon,
  Close as CloseIcon,
  CompareArrows as CompareIcon,
  Link as LinkIcon,
} from "@mui/icons-material";
import HighlightingHelpIcon from "@/features/documentView/components/highlightedContent/HighlightingHelpIcon";
import ViewToggleButton from "./ViewToggleButton";

interface DocumentInfo {
  id: number;
  collectionId: number;
  title: string;
}

interface DocumentCollectionInfo {
  id: number;
  title: string;
  description?: string;
}

interface DocumentComparisonToolbarProps {
  // View state
  viewMode: "reading" | "annotations";
  showLinkedTextHighlights: boolean;
  viewedDocuments: DocumentInfo[];
  showDocumentSelector: boolean;
  isLinkingModeActive: boolean;
  isLoadingDocuments: boolean;

  // Collection and document data
  selectedCollectionId: number;
  comparisonDocumentId: number | null;
  documentCollections: DocumentCollectionInfo[];
  availableDocuments: Array<{ id: number; title: string }>;

  // Handlers
  handleBackToDocuments: () => void;
  handleViewModeChange: (mode: "reading" | "annotations") => void;
  setShowLinkedTextHighlights: (show: boolean) => void;
  handleRemoveDocument: (docId: number) => void;
  setShowDocumentSelector: (show: boolean) => void;
  setIsLinkingModeActive: (active: boolean) => void;
  handleCollectionChange: (collectionId: number) => void;
  handleAddComparisonDocument: (docId: number) => void;
}

const DocumentComparisonToolbar: React.FC<DocumentComparisonToolbarProps> = ({
  viewMode,
  showLinkedTextHighlights,
  viewedDocuments,
  showDocumentSelector,
  isLinkingModeActive,
  isLoadingDocuments,
  selectedCollectionId,
  comparisonDocumentId,
  documentCollections,
  availableDocuments,
  handleBackToDocuments,
  handleViewModeChange,
  setShowLinkedTextHighlights,
  handleRemoveDocument,
  setShowDocumentSelector,
  setIsLinkingModeActive,
  handleCollectionChange,
  handleAddComparisonDocument,
}) => {
  const theme = useTheme();
  // Responsive breakpoints
  const isExtraSmall = useMediaQuery(theme.breakpoints.down("sm")); // < 600px
  const isSmall = useMediaQuery(theme.breakpoints.down("md")); // < 900px
  const isMedium = useMediaQuery(theme.breakpoints.down("lg")); // < 1200px

  return (
    <Box
      className="document-viewer-header"
      sx={{
        position: "sticky",
        top: "60px",
        zIndex: 1100,
        backgroundColor: "background.paper",
        borderBottom: "1px solid",
        borderColor: "divider",
        boxShadow: 1,
      }}
    >
      {/* Main Toolbar Row */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          padding: 2,
          flexWrap: "wrap",
          rowGap: 1.5, // Gap between rows when wrapped
        }}
      >
        {/* Navigation Group - always stays together */}
        <Box
          sx={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}
        >
          <Tooltip title="Back to Documents">
            <Button
              onClick={handleBackToDocuments}
              startIcon={<span>←</span>}
              variant="outlined"
              size="small"
              sx={{
                minWidth: isExtraSmall ? "40px" : "auto",
                color: "#2C656B",
                borderColor: "#2C656B",
              }}
            >
              {!isExtraSmall && "Back to Documents"}
            </Button>
          </Tooltip>

          {!isExtraSmall && <Divider orientation="vertical" flexItem />}
        </Box>

        {/* View Controls Group - stays together */}
        <Box
          sx={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}
        >
          {/* View Mode Toggle */}
          <ViewToggleButton
            viewModeChange={handleViewModeChange}
            viewMode={viewMode}
          />

          {/* Show Links Toggle */}
          <Tooltip title="Highlight linked text between documents">
            <FormControlLabel
              control={
                <Switch
                  checked={showLinkedTextHighlights}
                  onChange={(event) =>
                    setShowLinkedTextHighlights(event.target.checked)
                  }
                  sx={{
                    "& .MuiSwitch-switchBase.Mui-checked": {
                      color: "#2C656B",
                      "&:hover": {
                        backgroundColor: "rgba(44, 101, 107, 0.08)",
                      },
                    },
                    "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                      backgroundColor: "#2C656B",
                    },
                  }}
                  size="small"
                />
              }
              label={
                isExtraSmall
                  ? "Links"
                  : isSmall
                  ? "Show Links"
                  : "Show Intertext Links"
              }
              sx={{ margin: 0 }}
            />
          </Tooltip>

          {!isExtraSmall && <Divider orientation="vertical" flexItem />}
        </Box>

        {/* Document Management Group - wraps as a unit */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            flex: 1,
            minWidth: isSmall ? "100%" : "300px", // Force wrap on small screens
          }}
        >
          <Tooltip title="Documents currently open for viewing">
            <CompareIcon sx={{ color: "text.secondary", flexShrink: 0 }} />
          </Tooltip>

          {viewedDocuments.map((doc, index) => (
            <Chip
              key={doc.id}
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <span>{doc.title}</span>
                  {index === 0 && !isSmall && (
                    <span style={{ fontSize: "10px", opacity: 0.7 }}>
                      (primary)
                    </span>
                  )}
                </Box>
              }
              onDelete={
                index === 0 ? undefined : () => handleRemoveDocument(doc.id)
              }
              deleteIcon={<CloseIcon />}
              variant={index === 0 ? "filled" : "outlined"}
              sx={{
                maxWidth: isExtraSmall ? "150px" : isSmall ? "200px" : "250px",
                backgroundColor: index === 0 ? "#2C656B" : "#FE6100",
                color: "#fff", // Set text color to white for better contrast
                "& .MuiChip-label": {
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                },
                // Optional: style the delete icon color
                "& .MuiChip-deleteIcon": {
                  color: "rgba(255, 255, 255, 0.7)",
                  "&:hover": {
                    color: "#fff",
                  },
                },
              }}
            />
          ))}

          {/* Add Document Button */}
          {viewedDocuments.length < 2 && (
            <Tooltip title="Add a document for side-by-side comparison">
              <IconButton
                size="small"
                onClick={() => setShowDocumentSelector(!showDocumentSelector)}
                color={showDocumentSelector ? "primary" : "default"}
                sx={{
                  border: "1px dashed",
                  borderColor: "divider",
                  flexShrink: 0,
                }}
              >
                <AddIcon />
              </IconButton>
            </Tooltip>
          )}

          {/* Link Documents Button - Show in both single and multi-document views */}
          {viewedDocuments.length >= 1 && (
            <Tooltip
              title={
                viewedDocuments.length === 1
                  ? "Create links between passages in this document or start a partial link"
                  : "Create links between passages in these documents"
              }
            >
              {isSmall ? (
                // Icon-only button for small screens
                <IconButton
                  onClick={() => setIsLinkingModeActive(true)}
                  color={isLinkingModeActive ? "primary" : "default"}
                  size="small"
                  sx={{
                    flexShrink: 0,
                    ...(isLinkingModeActive && {
                      backgroundColor: "primary.main",
                      color: "white",
                      "&:hover": {
                        backgroundColor: "primary.dark",
                      },
                    }),
                  }}
                >
                  <LinkIcon />
                </IconButton>
              ) : (
                // Full button for larger screens
                <Button
                  onClick={() => setIsLinkingModeActive(true)}
                  variant={isLinkingModeActive ? "contained" : "outlined"}
                  size="small"
                  startIcon={<LinkIcon />}
                  sx={{
                    flexShrink: 0,
                    color: "#2C656B",
                    borderColor: "#2C656B",
                  }}
                >
                  {isMedium ? "Link" : "Create Intertext Link"}
                </Button>
              )}
            </Tooltip>
          )}
        </Box>

        {/* Help Icon - stays at end */}
        <Tooltip title="Learn about document comparison and annotation features">
          <Box sx={{ flexShrink: 0 }}>
            <HighlightingHelpIcon />
          </Box>
        </Tooltip>
      </Box>

      {/* Document Selector Dropdown - Conditional */}
      {showDocumentSelector && viewedDocuments.length < 2 && (
        <Box
          sx={{
            padding: 2,
            paddingTop: 0,
            borderTop: "1px solid",
            borderColor: "divider",
            backgroundColor: "grey.50",
            display: "flex",
            gap: 2,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <FormControl
            size="small"
            sx={{
              minWidth: isExtraSmall ? 120 : 200,
              maxWidth: isSmall ? 180 : 250,
            }}
          >
            <InputLabel>Collection</InputLabel>
            <Select
              value={selectedCollectionId}
              onChange={(e) => handleCollectionChange(Number(e.target.value))}
              label="Collection"
            >
              {documentCollections.map((collection) => (
                <MenuItem key={collection.id} value={collection.id}>
                  {collection.title}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl
            size="small"
            sx={{
              minWidth: isExtraSmall ? 150 : isSmall ? 200 : 300,
              flex: isExtraSmall ? "1 1 100%" : 1,
              maxWidth: isSmall ? "100%" : 400,
            }}
            disabled={isLoadingDocuments || availableDocuments.length === 0}
          >
            <InputLabel>Document</InputLabel>
            <Select
              value={comparisonDocumentId || ""}
              onChange={(e) => {
                const selectedId = Number(e.target.value);
                if (selectedId) {
                  handleAddComparisonDocument(selectedId);
                }
              }}
              label="Document"
            >
              {isLoadingDocuments ? (
                <MenuItem value="">Loading...</MenuItem>
              ) : (
                [
                  <MenuItem key="placeholder" value="">
                    {availableDocuments.length === 0
                      ? "No other documents available"
                      : "Select a document"}
                  </MenuItem>,
                  ...availableDocuments.map((doc) => (
                    <MenuItem key={doc.id} value={doc.id}>
                      {doc.title || `Document ${doc.id}`}
                    </MenuItem>
                  )),
                ]
              )}
            </Select>
          </FormControl>

          <Button
            size="small"
            onClick={() => setShowDocumentSelector(false)}
            variant="text"
            sx={{ flexShrink: 0 }}
          >
            Cancel
          </Button>
        </Box>
      )}

      {/* Linking Mode Hint */}
      {isLinkingModeActive && (
        <Box
          sx={{
            padding: 1.5,
            backgroundColor: "info.light",
            color: "info.contrastText",
            display: "flex",
            alignItems: "center",
            gap: 1,
            fontSize: "0.875rem",
            flexWrap: isExtraSmall ? "wrap" : "nowrap",
          }}
        >
          <LinkIcon fontSize="small" />
          <span>
            {isExtraSmall ? (
              <>
                💡 <strong>Linking Mode:</strong> Select text to create links
              </>
            ) : isSmall ? (
              <>
                💡 <strong>Linking Mode:</strong> Select text to link passages.
                Save with one or two selections.
              </>
            ) : (
              <>
                💡 <strong>Linking Mode Active:</strong> Select text to create a
                link. You can link text within the same document, between
                documents, or save a partial link with just one selection to
                complete later. Right-click linked text to navigate.
              </>
            )}
          </span>
          <Button
            size="small"
            onClick={() => setIsLinkingModeActive(false)}
            sx={{ marginLeft: "auto", color: "inherit", flexShrink: 0 }}
          >
            {isExtraSmall ? "Exit" : "Exit Linking Mode"}
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default DocumentComparisonToolbar;
