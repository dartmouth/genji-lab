// ManageDocuments/index.tsx

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Snackbar,
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Button,
} from "@mui/material";
import { useAppDispatch, useAppSelector } from "@store/hooks";
import {
  fetchDocumentCollections,
  fetchAllDocuments,
  selectAllDocumentCollections,
  selectAllDocuments,
} from "@store";
import { useNotification } from "@admin/components/ManageCollections/hooks";
import { useDeleteConfirmation } from "./hooks";


// Tab Components
import { OverviewTab } from "./components/OverviewTab";
import { ImportWordTab } from "./components/ImportWordTab";
import { DeleteDocumentsTab } from "./components/DeleteDocumentsTab";
import { DeleteContentTab } from "./components/DeleteContentTab";
import { RenameDocumentTab } from "./components/RenameDocumentTab";
import { UpdateDescriptionTab } from "./components/UpdateDescriptionTab";

// Types
import { DocumentToDelete } from "./types";

interface SubTabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function SubTabPanel(props: SubTabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`manage-subtabpanel-${index}`}
      aria-labelledby={`manage-subtab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
    </div>
  );
}

function a11yPropsSubTab(index: number) {
  return {
    id: `manage-subtab-${index}`,
    "aria-controls": `manage-subtabpanel-${index}`,
  };
}

/**
 * Callback type for initiating delete confirmation from child components
 */
export interface DeleteConfirmationRequest {
  title: string;
  message: string;
  documentsToDelete: DocumentToDelete[];
  onConfirm: () => void;
}

const ManageDocuments: React.FC = () => {
  const dispatch = useAppDispatch();
  const [activeSubTab, setActiveSubTab] = useState<number>(0);

  // Redux data
  const documentCollections = useAppSelector(selectAllDocumentCollections);
  const documents = useAppSelector(selectAllDocuments);

  // Notification hook (shared)
  const { notification, showNotification, hideNotification } = useNotification();

  // Delete confirmation hook
  const {
    deleteConfirmDialog,
    showDeleteConfirmation,
    hideDeleteConfirmation,
    resetDeleteConfirmation,
  } = useDeleteConfirmation();

  // Store the onConfirm callback separately (not in state)
  const [deleteConfirmCallback, setDeleteConfirmCallback] = useState<(() => void) | null>(null);

  // Fetch initial data
  useEffect(() => {
    dispatch(fetchDocumentCollections({ includeUsers: false }));
    dispatch(fetchAllDocuments());
  }, [dispatch]);

  // Tab change handler with reset logic
  const handleSubTabChange = (
    _event: React.SyntheticEvent,
    newValue: number
  ) => {
    setActiveSubTab(newValue);
    // Reset delete confirmation when switching tabs
    resetDeleteConfirmation();
    setDeleteConfirmCallback(null);
  };

  // Handler for child components to request delete confirmation
  const handleDeleteConfirmationRequest = (request: DeleteConfirmationRequest) => {
    showDeleteConfirmation({
      title: request.title,
      message: request.message,
      documentsToDelete: request.documentsToDelete,
    });
    // Store callback as a function that returns the callback
    // This avoids React setState treating it as an updater function
    setDeleteConfirmCallback(() => request.onConfirm);
  };

  // Handle confirm button click in dialog
  const handleConfirmDelete = () => {
    if (deleteConfirmCallback) {
      deleteConfirmCallback();
    }
    hideDeleteConfirmation();
    setDeleteConfirmCallback(null);
  };

  // Handle cancel/close dialog
  const handleCancelDelete = () => {
    hideDeleteConfirmation();
    setDeleteConfirmCallback(null);
  };

  // Determine delete button text based on dialog context
  const getDeleteButtonText = () => {
    if (deleteConfirmDialog.title === "Confirm Document Content Deletion") {
      return "DELETE DOCUMENT CONTENT";
    }
    return `Delete ${deleteConfirmDialog.documentsToDelete.length} Document(s)`;
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Manage Documents
      </Typography>

      <Box sx={{ display: "flex", height: "auto" }}>
        {/* Sub-tabs for Manage Documents */}
        <Tabs
          orientation="vertical"
          variant="scrollable"
          value={activeSubTab}
          onChange={handleSubTabChange}
          aria-label="Manage documents sub-tabs"
          sx={{
            borderRight: 1,
            borderColor: "divider",
            minWidth: "180px",
            "& .MuiTab-root": {
              alignItems: "flex-start",
              textAlign: "left",
              paddingLeft: 2,
            },
          }}
        >
          <Tab label="Overview" {...a11yPropsSubTab(0)} />
          <Tab label="Import Word Document" {...a11yPropsSubTab(1)} />
          <Tab label="Delete" {...a11yPropsSubTab(2)} />
          <Tab label="Delete Document Content" {...a11yPropsSubTab(3)} />
          <Tab label="Rename" {...a11yPropsSubTab(4)} />
          <Tab label="Update Description" {...a11yPropsSubTab(5)} />
        </Tabs>

        {/* Tab content */}
        <Box sx={{ flexGrow: 1 }}>
          <SubTabPanel value={activeSubTab} index={0}>
            <OverviewTab />
          </SubTabPanel>

          <SubTabPanel value={activeSubTab} index={1}>
            <ImportWordTab
              documentCollections={documentCollections}
              documents={documents}
              showNotification={showNotification}
            />
          </SubTabPanel>

          <SubTabPanel value={activeSubTab} index={2}>
            <DeleteDocumentsTab
              documentCollections={documentCollections}
              showNotification={showNotification}
              requestDeleteConfirmation={handleDeleteConfirmationRequest}
            />
          </SubTabPanel>

          <SubTabPanel value={activeSubTab} index={3}>
            <DeleteContentTab
              documentCollections={documentCollections}
              documents={documents}
              showNotification={showNotification}
              requestDeleteConfirmation={handleDeleteConfirmationRequest}
            />
          </SubTabPanel>

          <SubTabPanel value={activeSubTab} index={4}>
            <RenameDocumentTab
              documentCollections={documentCollections}
              showNotification={showNotification}
            />
          </SubTabPanel>

          <SubTabPanel value={activeSubTab} index={5}>
            <UpdateDescriptionTab
              documentCollections={documentCollections}
              showNotification={showNotification}
            />
          </SubTabPanel>
        </Box>
      </Box>

      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={hideNotification}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={hideNotification}
          severity={notification.severity}
          sx={{ width: "100%" }}
        >
          {notification.message}
        </Alert>
      </Snackbar>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmDialog.open}
        onClose={handleCancelDelete}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
        maxWidth="md"
        fullWidth
      >
        <DialogTitle id="delete-dialog-title" sx={{ color: "error.main" }}>
          {deleteConfirmDialog.title}
        </DialogTitle>
        <DialogContent>
          <DialogContentText
            id="delete-dialog-description"
            sx={{ marginBottom: 2, whiteSpace: "pre-line" }}
          >
            {deleteConfirmDialog.message}
          </DialogContentText>

          {/* Document list for non-content deletion */}
          {deleteConfirmDialog.title !== "Confirm Document Content Deletion" &&
            deleteConfirmDialog.documentsToDelete.length > 0 && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Documents to be deleted:
                </Typography>
                <Box
                  sx={{
                    maxHeight: "200px",
                    overflowY: "auto",
                    backgroundColor: "#f5f5f5",
                    padding: "10px",
                    borderRadius: "4px",
                    border: "1px solid #ddd",
                  }}
                >
                  {deleteConfirmDialog.documentsToDelete.map((doc, index) => {
                    const annotationText = [];
                    if (doc.scholarly_annotation_count && doc.scholarly_annotation_count > 0) {
                      annotationText.push(
                        `${doc.scholarly_annotation_count} scholarly annotation${
                          doc.scholarly_annotation_count !== 1 ? "s" : ""
                        }`
                      );
                    }
                    if (doc.comment_count && doc.comment_count > 0) {
                      annotationText.push(
                        `${doc.comment_count} comment${doc.comment_count !== 1 ? "s" : ""}`
                      );
                    }
                    const annotationSuffix =
                      annotationText.length > 0 ? ` (${annotationText.join(", ")})` : "";

                    return (
                      <Typography key={doc.id} variant="body2" sx={{ marginBottom: 0.5 }}>
                        {index + 1}. {doc.title}
                        {annotationSuffix}
                      </Typography>
                    );
                  })}
                </Box>
              </Box>
            )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDelete}>Cancel</Button>
          <Button
            onClick={handleConfirmDelete}
            color="error"
            variant="contained"
            autoFocus
          >
            {getDeleteButtonText()}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ManageDocuments;