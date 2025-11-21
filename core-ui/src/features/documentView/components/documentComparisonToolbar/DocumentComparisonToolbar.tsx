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
  return (
    <Box
      className="document-viewer-header"
      sx={{
        position: "sticky",
        top: 0,
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
        }}
      >
        <Button
          onClick={handleBackToDocuments}
          startIcon={<span>←</span>}
          variant="outlined"
          size="small"
          sx={{ flexShrink: 0 }}
        >
          Back to Documents
        </Button>

        <Divider orientation="vertical" flexItem />

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
                color="primary"
                size="small"
              />
            }
            label="Show Intertext Links"
            sx={{ margin: 0, flexShrink: 0 }}
          />
        </Tooltip>

        <Divider orientation="vertical" flexItem />

        {/* Document Chips - Always Visible */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            flex: 1,
            minWidth: 0,
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
                  {index === 0 && (
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
              color={index === 0 ? "primary" : "default"}
              variant={index === 0 ? "filled" : "outlined"}
              sx={{
                maxWidth: "250px",
                "& .MuiChip-label": {
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
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

          {/* Link Documents Button - Only when 2 docs */}
          {viewedDocuments.length === 2 && (
            <Tooltip title="Create links between passages in these documents">
              <Button
                onClick={() => setIsLinkingModeActive(true)}
                variant={isLinkingModeActive ? "contained" : "outlined"}
                size="small"
                startIcon={<LinkIcon />}
                sx={{ flexShrink: 0 }}
              >
                {isLinkingModeActive
                  ? "Linking Active"
                  : "Create Intertext Link"}
              </Button>
            </Tooltip>
          )}
        </Box>

        {/* Help Icon */}
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
          <FormControl size="small" sx={{ minWidth: 200 }}>
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
            sx={{ minWidth: 300, flex: 1 }}
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
          }}
        >
          <LinkIcon fontSize="small" />
          <span>
            💡 <strong>Linking Mode Active:</strong> Select text in one
            document, then select text in the other document to create a link.
            Right-click linked text to navigate.
          </span>
          <Button
            size="small"
            onClick={() => setIsLinkingModeActive(false)}
            sx={{ marginLeft: "auto", color: "inherit" }}
          >
            Exit Linking Mode
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default DocumentComparisonToolbar;
