import React, { useState, useEffect } from "react";
import {
  Tabs,
  Tab,
  Box,
  Typography,
  styled,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Button,
} from "@mui/material";
import { createDocumentCollection, useAppDispatch } from "@store";
import { useAuth } from "@hooks/useAuthContext.ts";
import { useAppSelector } from "@store/hooks";
import { selectAllDocumentCollections, fetchDocumentCollections } from "@store";

// TabPanel for the sub-tabs
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

// Styled components
const StyledForm = styled("form")(({ theme }) => ({
  "& .form-group": {
    marginBottom: theme.spacing(2),
    display: "flex",
    flexDirection: "column",
  },
  "& label": {
    marginBottom: theme.spacing(0.5),
  },
  "& input, & select": {
    padding: theme.spacing(1),
    borderRadius: theme.shape.borderRadius,
    border: `1px solid ${theme.palette.divider}`,
  },
  "& .MuiFormControl-root": {
    marginBottom: theme.spacing(2),
  },
  "& button": {
    marginTop: theme.spacing(2),
    padding: theme.spacing(1, 2),
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    border: "none",
    borderRadius: theme.shape.borderRadius,
    cursor: "pointer",
    "&:hover": {
      backgroundColor: theme.palette.primary.dark,
    },
    "&:disabled": {
      opacity: 0.5,
      cursor: "not-allowed",
      backgroundColor: theme.palette.action.disabled,
    },
  },
  "& .delete-button": {
    backgroundColor: theme.palette.error.main,
    "&:hover": {
      backgroundColor: theme.palette.error.dark,
    },
  },
}));

const ManageCollections: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<number>(0);
  const dispatch = useAppDispatch();

  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info" | "warning";
  }>({ open: false, message: "", severity: "info" });

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ open: false, title: "", message: "", onConfirm: () => {} });

  const showNotification = (
    message: string,
    severity: "success" | "error" | "info" | "warning"
  ) => {
    setNotification({ open: true, message, severity });
  };

  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  const handleCloseConfirmDialog = () => {
    setConfirmDialog({ ...confirmDialog, open: false });
  };

  const documentCollections = useAppSelector(
    selectAllDocumentCollections
  ) as Array<{
    id: number;
    title: string;
    description?: string;
  }>;

  //fetch collections
  useEffect(() => {
    dispatch(fetchDocumentCollections());
  }, [dispatch]);

  const [selectedCollection, setSelectedCollection] = useState<string>("");
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const handleCollectionSelect = (event: any) => {
    setSelectedCollection(event.target.value);
  };

  const handleSubTabChange = (
    _event: React.SyntheticEvent,
    newValue: number
  ) => {
    setActiveSubTab(newValue);
  };

  const initiateDeleteCollection = () => {
    if (!selectedCollection) return;

    setConfirmDialog({
      open: true,
      title: "Confirm Deletion",
      message:
        "Are you sure you want to delete this collection? This action cannot be undone.",
      onConfirm: handleDeleteCollection,
    });
  };

  const handleDeleteCollection = async () => {
    if (!selectedCollection) return;

    setConfirmDialog({ ...confirmDialog, open: false });
    setIsDeleting(true);

    try {
      const response = await fetch(
        `/api/v1/collections/${selectedCollection}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        // Refresh the collections list after successful deletion
        dispatch(fetchDocumentCollections());
        setSelectedCollection("");
        showNotification("Collection deleted successfully", "success");
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to delete collection");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      showNotification(`Failed to delete collection: ${errorMessage}`, "error");
    } finally {
      setIsDeleting(false);
    }
  };

  interface FormData {
    title: string;
    visibility: string;
    text_direction: string;
    language: string;
  }
  const { user } = useAuth();
  const [formData, setFormData] = useState<FormData>({
    title: "",
    visibility: "public",
    text_direction: "ltr",
    language: "en",
  });
  const [submitted, setSubmitted] = useState<boolean>(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      title: formData.title,
      visibility: formData.visibility,
      text_direction: formData.text_direction,
      language: formData.language,
      hierarchy: { chapter: 1, paragraph: 2 },
      collection_metadata: {},
      created_by_id: user?.id || 1,
    };
    dispatch(createDocumentCollection(payload));
    setSubmitted(true);
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Manage Document Collections
      </Typography>

      <Box sx={{ display: "flex", height: "auto" }}>
        {/* Sub-tabs for Manage Collections */}
        <Tabs
          orientation="vertical"
          variant="scrollable"
          value={activeSubTab}
          onChange={handleSubTabChange}
          aria-label="Manage collections sub-tabs"
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
          <Tab label="Add" {...a11yPropsSubTab(1)} />
          <Tab label="Delete" {...a11yPropsSubTab(2)} />
          <Tab label="Rename" {...a11yPropsSubTab(3)} />
        </Tabs>

        {/* Sub-tab content */}
        <SubTabPanel value={activeSubTab} index={0}>
          <Typography variant="h5" gutterBottom>
            Document Collection Overview
          </Typography>
          <div>
            <p>Features for managing document collections.</p>
          </div>
        </SubTabPanel>

        <SubTabPanel value={activeSubTab} index={1}>
          <Typography variant="h5" gutterBottom>
            Add Document Collection
          </Typography>
          <div>
            <p>Complete this form to add your new Document Collection.</p>
          </div>
          <StyledForm onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="title">Title: </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="visibility">Visibility: </label>
              <select
                id="visibility"
                name="visibility"
                value={formData.visibility}
                onChange={handleChange}
              >
                <option value="public">Public</option>
                <option value="private">Private</option>
                <option value="restricted">Restricted</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="text_direction">Text Direction: </label>
              <select
                id="text_direction"
                name="text_direction"
                value={formData.text_direction}
                onChange={handleChange}
              >
                <option value="ltr">Left to Right (LTR)</option>
                <option value="rtl">Right to Left (RTL)</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="language">Language: </label>
              <select
                id="language"
                name="language"
                value={formData.language}
                onChange={handleChange}
              >
                <option value="en">English</option>
                <option value="ja">Japanese</option>
                <option value="fr">French</option>
                <option value="es">Spanish</option>
                <option value="de">German</option>
              </select>
            </div>

            <button type="submit">Add</button>
          </StyledForm>

          {submitted && (
            <div className="submitted-data">
              <h2>A new Document Collection has been added:</h2>
              <p>
                <strong>Title:</strong> {formData.title}
              </p>
              <p>
                <strong>Visibility:</strong> {formData.visibility}
              </p>
              <p>
                <strong>Text Direction:</strong> {formData.text_direction}
              </p>
              <p>
                <strong>Language:</strong> {formData.language}
              </p>
              <p>
                <strong>User:</strong> {user?.first_name} {user?.last_name}
              </p>
            </div>
          )}
        </SubTabPanel>

        <SubTabPanel value={activeSubTab} index={2}>
          <Typography variant="h5" gutterBottom>
            Delete Document Collection
          </Typography>
          <div>
            <p>Select a document collection to delete:</p>
            <StyledForm>
              <FormControl fullWidth sx={{ maxWidth: "300px" }}>
                <InputLabel id="delete-collection-label">
                  Select a collection
                </InputLabel>
                <Select
                  labelId="delete-collection-label"
                  id="delete-collection-select"
                  value={selectedCollection}
                  label="Select a collection"
                  onChange={handleCollectionSelect}
                >
                  <MenuItem value="">
                    <em>-- Select a collection --</em>
                  </MenuItem>
                  {documentCollections.map((collection) => (
                    <MenuItem
                      key={collection.id}
                      value={collection.id.toString()}
                    >
                      {collection.title}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <button
                type="button"
                className="delete-button"
                disabled={!selectedCollection || isDeleting}
                onClick={initiateDeleteCollection}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </StyledForm>
          </div>
        </SubTabPanel>

        <SubTabPanel value={activeSubTab} index={3}>
          <Typography variant="h5" gutterBottom>
            Rename Document Collection
          </Typography>
          <div>
            <p>Select a document collection to rename:</p>
            <StyledForm>
              <FormControl fullWidth sx={{ maxWidth: "400px" }}>
                <InputLabel id="rename-collection-label">
                  Select a collection
                </InputLabel>
                <Select
                  labelId="rename-collection-label"
                  id="rename-collection-select"
                  value={selectedCollection}
                  label="Select a collection"
                  onChange={handleCollectionSelect}
                >
                  <MenuItem value="">
                    <em>-- Select a collection --</em>
                  </MenuItem>
                  {documentCollections.map((collection) => (
                    <MenuItem
                      key={collection.id}
                      value={collection.id.toString()}
                    >
                      {collection.title}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <div className="form-group">
                <label htmlFor="new-name">New Name:</label>
                <input
                  type="text"
                  id="new-name"
                  name="new-name"
                  placeholder="Enter new collection name"
                />
              </div>

              <button type="button">Rename</button>
            </StyledForm>
          </div>
        </SubTabPanel>

        {/* Notification Snackbar */}
        <Snackbar
          open={notification.open}
          autoHideDuration={6000}
          onClose={handleCloseNotification}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert
            onClose={handleCloseNotification}
            severity={notification.severity}
            sx={{ width: "100%" }}
          >
            {notification.message}
          </Alert>
        </Snackbar>

        {/* Confirmation Dialog */}
        <Dialog
          open={confirmDialog.open}
          onClose={handleCloseConfirmDialog}
          aria-labelledby="alert-dialog-title"
          aria-describedby="alert-dialog-description"
        >
          <DialogTitle id="alert-dialog-title">
            {confirmDialog.title}
          </DialogTitle>
          <DialogContent>
            <DialogContentText id="alert-dialog-description">
              {confirmDialog.message}
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseConfirmDialog}>Cancel</Button>
            <Button onClick={confirmDialog.onConfirm} color="error" autoFocus>
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
};

export default ManageCollections;
