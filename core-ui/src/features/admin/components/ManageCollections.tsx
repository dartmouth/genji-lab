import React, { useState, useEffect } from "react";
import { Tabs, Tab, Box, Typography, styled, FormControl, 
  InputLabel, Select, MenuItem, Snackbar, Alert, 
  Dialog, DialogActions, DialogContent, DialogContentText, 
  DialogTitle, Button, LinearProgress, TextField,
  Table, TableBody, TableCell, TableContainer, TableHead, 
  TableRow, Paper, TablePagination, TableSortLabel,
  Chip, Grid, Divider, Skeleton,
  Modal, IconButton } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { createDocumentCollection, updateDocumentCollection, useAppDispatch } from '@store';
import { useAuth } from "@hooks/useAuthContext.ts";
import { useAppSelector } from "@store/hooks";
import { 
  selectAllDocumentCollections,
  fetchDocumentCollections,
} from "@store";

// TabPanel for the sub-tabs
interface SubTabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

// Helper function to display user name
const getUserDisplayName = (user: any) => {
  if (user.first_name || user.last_name) {
    return `${user.first_name || ''} ${user.last_name || ''}`.trim();
  }
  return 'Unknown User';
};

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
      {value === index && (
        <Box sx={{ p: 2 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yPropsSubTab(index: number) {
  return {
    id: `manage-subtab-${index}`,
    'aria-controls': `manage-subtabpanel-${index}`,
  };
}

// Styled components
const StyledForm = styled('form')(({ theme }) => ({
  '& .form-group': {
    marginBottom: theme.spacing(2),
    display: 'flex',
    flexDirection: 'column',
  },
  '& label': {
    marginBottom: theme.spacing(0.5),
  },
  '& input, & select': {
    padding: theme.spacing(1),
    borderRadius: theme.shape.borderRadius,
    border: `1px solid ${theme.palette.divider}`,
  },
  '& .MuiFormControl-root': {
    marginBottom: theme.spacing(2),
  },
  '& button': {
    marginTop: theme.spacing(2),
    padding: theme.spacing(1, 2),
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    border: 'none',
    borderRadius: theme.shape.borderRadius,
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: theme.palette.primary.dark,
    },
    '&:disabled': {
      opacity: 0.5,
      cursor: 'not-allowed',
      backgroundColor: theme.palette.action.disabled,
    },
  },
  '& .delete-button': {
    backgroundColor: theme.palette.error.main,
    '&:hover': {
      backgroundColor: theme.palette.error.dark,
    },
  },
}));

// Modal style
const modalStyle = {
  position: 'absolute' as 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: { xs: '90%', sm: 800, md: 1000 },
  maxHeight: '90vh',
  bgcolor: 'background.paper',
  border: '2px solid #000',
  borderRadius: 2,
  boxShadow: 24,
  p: 4,
  overflow: 'auto'
};

const ManageCollections: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<number>(0);
  const dispatch = useAppDispatch();

  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({ open: false, message: '', severity: 'info' });
  
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    requiresNameConfirmation?: boolean;
    expectedName?: string;
  }>({ open: false, title: '', message: '', onConfirm: () => {}, requiresNameConfirmation: false, expectedName: '' });
 
  const showNotification = (message: string, severity: 'success' | 'error' | 'info' | 'warning') => {
    setNotification({ open: true, message, severity });
  };

  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  const handleCloseConfirmDialog = () => {
    setConfirmDialog({ ...confirmDialog, open: false });
    setConfirmationText('');
  };

  const handleConfirmationTextChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmationText(event.target.value);
  };

  const isConfirmationValid = () => {
    if (!confirmDialog.requiresNameConfirmation) return true;
    return confirmationText === confirmDialog.expectedName;
  };


  const documentCollections = useAppSelector(selectAllDocumentCollections) as Array<{
    id: number;
    title: string;
    description?: string;
    created_by?: {
      id: number;
      username: string;
    };
    modified_by?: {
      id: number;
      username: string;
    };
  }>;

  //fetch collections with user info
  useEffect(() => {
    dispatch(fetchDocumentCollections({ includeUsers: true }));
  }, [dispatch]);

  const [selectedCollection, setSelectedCollection] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isLoadingStats, setIsLoadingStats] = useState<boolean>(false);
  
  // Rename-specific state
  const [renameNewName, setRenameNewName] = useState<string>('');
  const [isRenaming, setIsRenaming] = useState<boolean>(false);
  const [renameSelectedCollection, setRenameSelectedCollection] = useState<string>('');
  
  // Update visibility-specific state
  const [updateVisibilitySelectedCollection, setUpdateVisibilitySelectedCollection] = useState<string>('');
  const [updateVisibilityNewVisibility, setUpdateVisibilityNewVisibility] = useState<string>('');
  const [isUpdatingVisibility, setIsUpdatingVisibility] = useState<boolean>(false);
  const [isLoadingVisibilityCollection, setIsLoadingVisibilityCollection] = useState<boolean>(false);
  const [updateVisibilityCollectionDetails, setUpdateVisibilityCollectionDetails] = useState<{
    title: string;
    visibility: string;
    description?: string;
  } | null>(null);
  
  const [collectionStats, setCollectionStats] = useState<{
    document_count: number;
    element_count: number;
    scholarly_annotation_count: number;
    comment_count: number;
    title: string;
    description?: string;
    visibility: string;
    created: string;
    modified: string;
  } | null>(null);
  const [confirmationText, setConfirmationText] = useState<string>('');
  const [deleteProgress, setDeleteProgress] = useState<number>(0);
  const [showProgress, setShowProgress] = useState<boolean>(false);

  // Overview tab state
  const [overviewPage, setOverviewPage] = useState<number>(0);
  const [overviewRowsPerPage, setOverviewRowsPerPage] = useState<number>(10);
  const [overviewSortOrder, setOverviewSortOrder] = useState<'modified' | 'title'>('modified');
  const [overviewSortDirection, setOverviewSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedOverviewCollection, setSelectedOverviewCollection] = useState<number | null>(null);
  const [overviewCollectionDetails, setOverviewCollectionDetails] = useState<{
    id: number;
    title: string;
    description?: string;
    visibility: string;
    language: string;
    text_direction: string;
    created: string;
    modified: string;
    created_by?: { id: number; username: string };
    modified_by?: { id: number; username: string };
    document_count: number;
    element_count: number;
    scholarly_annotation_count: number;
    comment_count: number;
  } | null>(null);
  const [isLoadingOverviewDetails, setIsLoadingOverviewDetails] = useState<boolean>(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState<boolean>(false);

  const handleCollectionSelect = async (event: any) => {
    const collectionId = event.target.value;
    setSelectedCollection(collectionId);
    setCollectionStats(null);
    setConfirmationText('');
    
    if (collectionId) {
      setIsLoadingStats(true);
      try {
        const response = await fetch(`/api/v1/collections/${collectionId}`);
        if (response.ok) {
          const stats = await response.json();
          setCollectionStats({
            document_count: stats.document_count || 0,
            element_count: stats.element_count || 0,
            scholarly_annotation_count: stats.scholarly_annotation_count || 0,
            comment_count: stats.comment_count || 0,
            title: stats.title,
            description: stats.description,
            visibility: stats.visibility,
            created: stats.created,
            modified: stats.modified
          });
        } else {
          showNotification('Failed to fetch collection statistics', 'error');
        }
      } catch (error) {
        console.error('Failed to fetch collection statistics:', error);
        showNotification('Error fetching collection statistics', 'error');
      } finally {
        setIsLoadingStats(false);
      }
    }
  };

  const handleSubTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveSubTab(newValue);
    
    // Reset form states when changing tabs
    if (newValue === 3) {
      // Reset rename form when entering rename tab
      setRenameSelectedCollection('');
      setRenameNewName('');
    }
  };

  const initiateDeleteCollection = () => {
    if (!selectedCollection || !collectionStats) {
      showNotification('Please select a collection first', 'error');
      return;
    }
    
    const message = `Are you sure you want to delete the collection "${collectionStats.title}"?

This will permanently delete:
• ${collectionStats.document_count} documents
• ${collectionStats.element_count} paragraphs
• ${collectionStats.scholarly_annotation_count} scholarly annotations
• ${collectionStats.comment_count} comments

This action cannot be undone.

To confirm, please type the collection name exactly as shown:
"${collectionStats.title}"`;

    setConfirmDialog({
      open: true,
      title: 'Confirm Collection Deletion',
      message,
      onConfirm: handleDeleteCollection,
      requiresNameConfirmation: true,
      expectedName: collectionStats.title
    });
  };

  const handleDeleteCollection = async () => {
    if (!selectedCollection || !collectionStats) return;
    
    setConfirmDialog({ ...confirmDialog, open: false });
    setIsDeleting(true);
    setShowProgress(true);
    setDeleteProgress(0);
    
    try {
      setDeleteProgress(20);
      
      const response = await fetch(`/api/v1/collections/${selectedCollection}?force=true`, {
        method: 'DELETE',
      });
      
      setDeleteProgress(70);
      
      if (response.ok) {
        setDeleteProgress(90);
        
        // Refresh the collections list after successful deletion
        dispatch(fetchDocumentCollections({ includeUsers: true }));
        refreshOverviewData();
        setSelectedCollection('');
        setCollectionStats(null);
        setConfirmationText('');
        
        setDeleteProgress(100);
        
        showNotification(`Collection "${collectionStats.title}" deleted successfully`, 'success');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to delete collection');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      showNotification(`Failed to delete collection: ${errorMessage}`, 'error');
    } finally {
      setIsDeleting(false);
      setTimeout(() => {
        setShowProgress(false);
        setDeleteProgress(0);
      }, 1000);
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
    title: '',
    visibility: 'public',
    text_direction: 'ltr',
    language: 'en'
  });
  const [submitted, setSubmitted] = useState<boolean>(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      title: formData.title,
      visibility: formData.visibility,
      text_direction: formData.text_direction,
      language: formData.language,
      hierarchy: {chapter:1, paragraph:2},
      collection_metadata: {},
      created_by_id: user?.id || 1,
    }
    dispatch(createDocumentCollection(payload));
    setSubmitted(true);
    
    // Refresh overview data after creation
    setTimeout(() => {
      refreshOverviewData();
    }, 1000);
  };

  // Rename functionality handlers
  const handleRenameCollectionSelect = (event: any) => {
    const collectionId = event.target.value;
    setRenameSelectedCollection(collectionId);
    
    // Pre-fill the new name field with current collection title
    if (collectionId) {
      const selectedCollection = documentCollections.find(c => c.id === parseInt(collectionId));
      setRenameNewName(selectedCollection?.title || '');
    } else {
      setRenameNewName('');
    }
  };

  const handleRenameNewNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRenameNewName(event.target.value);
  };

  const handleRenameCollection = async () => {
    if (!renameSelectedCollection || !renameNewName.trim()) {
      showNotification('Please select a collection and enter a new name', 'error');
      return;
    }

    const selectedCollection = documentCollections.find(c => c.id === parseInt(renameSelectedCollection));
    if (!selectedCollection) {
      showNotification('Selected collection not found', 'error');
      return;
    }

    if (renameNewName.trim() === selectedCollection.title) {
      showNotification('New name must be different from current name', 'error');
      return;
    }

    // Check if name already exists
    const nameExists = documentCollections.some(c => 
      c.title.toLowerCase() === renameNewName.trim().toLowerCase() && 
      c.id !== parseInt(renameSelectedCollection)
    );
    
    if (nameExists) {
      showNotification('A collection with this name already exists', 'error');
      return;
    }

    setIsRenaming(true);
    
    try {
      await dispatch(updateDocumentCollection({
        id: parseInt(renameSelectedCollection),
        updates: {
          title: renameNewName.trim(),
          modified_by_id: user?.id || 1
        }
      })).unwrap();
      
      // Refresh collections to show updated data
      dispatch(fetchDocumentCollections({ includeUsers: true }));
      refreshOverviewData();
      
      showNotification(
        `Collection renamed from "${selectedCollection.title}" to "${renameNewName.trim()}"`, 
        'success'
      );
      
      // Reset form
      setRenameSelectedCollection('');
      setRenameNewName('');
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      showNotification(`Failed to rename collection: ${errorMessage}`, 'error');
    } finally {
      setIsRenaming(false);
    }
  };

  const isRenameFormValid = () => {
    return renameSelectedCollection && 
           renameNewName.trim() && 
           renameNewName.trim().length > 0;
  };

  // Update visibility functionality handlers
  const handleUpdateVisibilityCollectionSelect = async (event: any) => {
    const collectionId = event.target.value;
    setUpdateVisibilitySelectedCollection(collectionId);
    setUpdateVisibilityNewVisibility('');
    setUpdateVisibilityCollectionDetails(null);
    
    if (collectionId) {
      setIsLoadingVisibilityCollection(true);
      try {
        const response = await fetch(`/api/v1/collections/${collectionId}`);
        if (response.ok) {
          const collectionData = await response.json();
          setUpdateVisibilityCollectionDetails({
            title: collectionData.title,
            visibility: collectionData.visibility,
            description: collectionData.description
          });
          setUpdateVisibilityNewVisibility(collectionData.visibility);
        } else {
          showNotification('Failed to fetch collection details', 'error');
        }
      } catch (error) {
        console.error('Failed to fetch collection details:', error);
        showNotification('Error fetching collection details', 'error');
      } finally {
        setIsLoadingVisibilityCollection(false);
      }
    }
  };

  const handleUpdateVisibilityNewVisibilityChange = (event: any) => {
    setUpdateVisibilityNewVisibility(event.target.value);
  };

  const handleUpdateCollectionVisibility = async () => {
    if (!updateVisibilitySelectedCollection || !updateVisibilityNewVisibility) {
      showNotification('Please select a collection and visibility option', 'error');
      return;
    }

    if (!updateVisibilityCollectionDetails) {
      showNotification('Collection details not loaded', 'error');
      return;
    }

    if (updateVisibilityNewVisibility === updateVisibilityCollectionDetails.visibility) {
      showNotification('New visibility must be different from current visibility', 'error');
      return;
    }

    setIsUpdatingVisibility(true);
    
    try {
      await dispatch(updateDocumentCollection({
        id: parseInt(updateVisibilitySelectedCollection),
        updates: {
          visibility: updateVisibilityNewVisibility,
          modified_by_id: user?.id || 1
        }
      })).unwrap();
      
      // Refresh collections to show updated data
      dispatch(fetchDocumentCollections({ includeUsers: true }));
      refreshOverviewData();
      
      // Update the local collection details to reflect the change
      setUpdateVisibilityCollectionDetails({
        ...updateVisibilityCollectionDetails,
        visibility: updateVisibilityNewVisibility
      });
      
      showNotification(
        `Collection visibility updated from "${updateVisibilityCollectionDetails.visibility}" to "${updateVisibilityNewVisibility}" for collection "${updateVisibilityCollectionDetails.title}"`, 
        'success'
      );
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      showNotification(`Failed to update collection visibility: ${errorMessage}`, 'error');
    } finally {
      setIsUpdatingVisibility(false);
    }
  };

  const isUpdateVisibilityFormValid = () => {
    return updateVisibilitySelectedCollection && 
           updateVisibilityNewVisibility && 
           updateVisibilityCollectionDetails &&
           updateVisibilityNewVisibility !== updateVisibilityCollectionDetails.visibility;
  };

  // Overview tab handlers
  const handleOverviewCollectionSelect = async (collectionId: number) => {
    setSelectedOverviewCollection(collectionId);
    setOverviewCollectionDetails(null);
    setDetailsModalOpen(true);
    setIsLoadingOverviewDetails(true);
    
    try {
      const response = await fetch(`/api/v1/collections/${collectionId}`);
      if (response.ok) {
        const details = await response.json();
        console.log('Collection details response:', details); // Debug logging
        setOverviewCollectionDetails(details);
      } else {
        showNotification('Failed to fetch collection details', 'error');
        setDetailsModalOpen(false);
      }
    } catch (error) {
      console.error('Failed to fetch collection details:', error);
      showNotification('Failed to fetch collection details', 'error');
      setDetailsModalOpen(false);
    } finally {
      setIsLoadingOverviewDetails(false);
    }
  };

  const handleCloseDetailsModal = () => {
    setDetailsModalOpen(false);
    setSelectedOverviewCollection(null);
    setOverviewCollectionDetails(null);
  };

  const handleOverviewSortChange = (newSortOrder: 'modified' | 'title') => {
    if (overviewSortOrder === newSortOrder) {
      // Toggle direction if same column
      setOverviewSortDirection(overviewSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, set appropriate default direction
      setOverviewSortOrder(newSortOrder);
      setOverviewSortDirection(newSortOrder === 'modified' ? 'desc' : 'asc');
    }
  };

  const handleOverviewPageChange = (_event: unknown, newPage: number) => {
    setOverviewPage(newPage);
  };

  const handleOverviewRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setOverviewRowsPerPage(parseInt(event.target.value, 10));
    setOverviewPage(0);
  };

  // Refresh overview data when other tabs make changes
  const refreshOverviewData = () => {
    dispatch(fetchDocumentCollections({ includeUsers: true }));
    if (selectedOverviewCollection && detailsModalOpen) {
      handleOverviewCollectionSelect(selectedOverviewCollection);
    }
  };

  // Sort and paginate collections for overview
  const sortedCollections = React.useMemo(() => {
    const sorted = [...documentCollections].sort((a, b) => {
      if (overviewSortOrder === 'title') {
        const result = a.title.localeCompare(b.title);
        return overviewSortDirection === 'asc' ? result : -result;
      } else {
        // Sort by modified date - we'll use ID as proxy since we don't have modified date in basic list
        // In a real implementation, you might want to fetch this data or sort by ID
        const result = a.id - b.id; // Newer IDs are likely more recent
        return overviewSortDirection === 'asc' ? result : -result;
      }
    });
    return sorted;
  }, [documentCollections, overviewSortOrder, overviewSortDirection]);

  const paginatedCollections = React.useMemo(() => {
    const startIndex = overviewPage * overviewRowsPerPage;
    return sortedCollections.slice(startIndex, startIndex + overviewRowsPerPage);
  }, [sortedCollections, overviewPage, overviewRowsPerPage]);

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Manage Document Collections
      </Typography>
      
      <Box sx={{ display: 'flex', height: 'auto' }}>
        {/* Sub-tabs for Manage Collections */}
        <Tabs
          orientation="vertical"
          variant="scrollable"
          value={activeSubTab}
          onChange={handleSubTabChange}
          aria-label="Manage collections sub-tabs"
          sx={{ 
            borderRight: 1, 
            borderColor: 'divider',
            minWidth: '180px',
            '& .MuiTab-root': {
              alignItems: 'flex-start',
              textAlign: 'left',
              paddingLeft: 2
            }
          }}
        >
          <Tab label="Overview" {...a11yPropsSubTab(0)} />
          <Tab label="Add" {...a11yPropsSubTab(1)} />
          <Tab label="Delete" {...a11yPropsSubTab(2)} />
          <Tab label="Rename" {...a11yPropsSubTab(3)} />
          <Tab label="Update Visibility" {...a11yPropsSubTab(4)} />
        </Tabs>
        
        {/* Sub-tab content */}
        <SubTabPanel value={activeSubTab} index={0}>
          <Typography variant="h5" gutterBottom>
            Document Collection Overview
          </Typography>
          
          {/* Collections Table */}
          <TableContainer component={Paper} sx={{ mb: 3 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>
                    <TableSortLabel
                      active={overviewSortOrder === 'title'}
                      direction={overviewSortOrder === 'title' ? overviewSortDirection : 'asc'}
                      onClick={() => handleOverviewSortChange('title')}
                    >
                      Title
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>Created By</TableCell>
                  <TableCell>Visibility</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedCollections.map((collection) => (
                  <TableRow
                    key={collection.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>{collection.title}</TableCell>
                    <TableCell>
                      {collection.created_by ? (
                        <Typography variant="body2">
                          {getUserDisplayName(collection.created_by)}
                        </Typography>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          Unknown
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={(collection as any).visibility || 'Unknown'}
                        size="small"
                        color={(collection as any).visibility === 'public' ? 'success' : (collection as any).visibility === 'private' ? 'error' : 'default'}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Button 
                        size="small" 
                        variant="outlined"
                        onClick={() => handleOverviewCollectionSelect(collection.id)}
                      >
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {paginatedCollections.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      <Typography variant="body2" color="text.secondary">
                        No collections found
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          <TablePagination
            component="div"
            count={sortedCollections.length}
            page={overviewPage}
            onPageChange={handleOverviewPageChange}
            rowsPerPage={overviewRowsPerPage}
            onRowsPerPageChange={handleOverviewRowsPerPageChange}
            rowsPerPageOptions={[5, 10, 25, 50]}
          />

          {/* Instructions */}
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Click "View Details" on any collection to see comprehensive information including statistics and metadata
            </Typography>
          </Box>

          {/* Collection Details Modal */}
          <Modal
            open={detailsModalOpen}
            onClose={handleCloseDetailsModal}
            aria-labelledby="collection-details-modal"
            aria-describedby="collection-details-description"
          >
            <Box sx={modalStyle}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h5" component="h2">
                  Collection Details
                </Typography>
                <IconButton onClick={handleCloseDetailsModal} size="small">
                  <CloseIcon />
                </IconButton>
              </Box>
              
              {isLoadingOverviewDetails ? (
                <Box>
                  <Skeleton variant="text" width="60%" height={32} />
                  <Skeleton variant="text" width="40%" height={24} />
                  <Skeleton variant="rectangular" width="100%" height={200} sx={{ mt: 2 }} />
                </Box>
              ) : overviewCollectionDetails ? (
                <Grid container spacing={3}>
                  {/* Basic Information */}
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      Basic Information
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">Title</Typography>
                      <Typography variant="body1" fontWeight="medium">{overviewCollectionDetails.title}</Typography>
                    </Box>
                    {overviewCollectionDetails.description && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary">Description</Typography>
                        <Typography variant="body1">{overviewCollectionDetails.description}</Typography>
                      </Box>
                    )}
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">Visibility</Typography>
                      <Chip 
                        label={overviewCollectionDetails.visibility} 
                        size="small"
                        color={overviewCollectionDetails.visibility === 'public' ? 'success' : 'default'}
                        sx={{ mt: 0.5 }}
                      />
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">Language</Typography>
                      <Typography variant="body1">{overviewCollectionDetails.language}</Typography>
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">Text Direction</Typography>
                      <Typography variant="body1">{overviewCollectionDetails.text_direction}</Typography>
                    </Box>
                  </Grid>

                  {/* Statistics */}
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      Statistics
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Box sx={{ p: 2, bgcolor: 'primary.50', borderRadius: 1, textAlign: 'center' }}>
                          <Typography variant="h4" color="primary.main" fontWeight="bold">
                            {overviewCollectionDetails.document_count}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">Documents</Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6}>
                        <Box sx={{ p: 2, bgcolor: 'secondary.50', borderRadius: 1, textAlign: 'center' }}>
                          <Typography variant="h4" color="secondary.main" fontWeight="bold">
                            {overviewCollectionDetails.element_count}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">Paragraphs</Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6}>
                        <Box sx={{ p: 2, bgcolor: 'success.50', borderRadius: 1, textAlign: 'center' }}>
                          <Typography variant="h4" color="success.main" fontWeight="bold">
                            {overviewCollectionDetails.scholarly_annotation_count}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">Scholarly Annotations</Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6}>
                        <Box sx={{ p: 2, bgcolor: 'warning.50', borderRadius: 1, textAlign: 'center' }}>
                          <Typography variant="h4" color="warning.main" fontWeight="bold">
                            {overviewCollectionDetails.comment_count}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">Comments</Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </Grid>

                  {/* Metadata */}
                  <Grid item xs={12}>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      Metadata
                    </Typography>
                    <Grid container spacing={3}>
                      <Grid item xs={12} sm={6}>
                        <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                          <Typography variant="body2" color="text.secondary" gutterBottom>Created</Typography>
                          <Typography variant="body1" fontWeight="medium">
                            {new Date(overviewCollectionDetails.created).toLocaleDateString()} at{' '}
                            {new Date(overviewCollectionDetails.created).toLocaleTimeString()}
                          </Typography>
                          {overviewCollectionDetails.created_by ? (
                            <Typography variant="body2" color="text.secondary">
                              by {getUserDisplayName(overviewCollectionDetails.created_by)}
                            </Typography>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              by Unknown User
                            </Typography>
                          )}
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                          <Typography variant="body2" color="text.secondary" gutterBottom>Last Modified</Typography>
                          <Typography variant="body1" fontWeight="medium">
                            {new Date(overviewCollectionDetails.modified).toLocaleDateString()} at{' '}
                            {new Date(overviewCollectionDetails.modified).toLocaleTimeString()}
                          </Typography>
                          {overviewCollectionDetails.modified_by ? (
                            <Typography variant="body2" color="text.secondary">
                              by {getUserDisplayName(overviewCollectionDetails.modified_by)}
                            </Typography>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              by Unknown User
                            </Typography>
                          )}
                        </Box>
                      </Grid>
                    </Grid>
                  </Grid>
                </Grid>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Failed to load collection details
                </Typography>
              )}
            </Box>
          </Modal>
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
                <p><strong>Title:</strong> {formData.title}</p>
                <p><strong>Visibility:</strong> {formData.visibility}</p>
                <p><strong>Text Direction:</strong> {formData.text_direction}</p>
                <p><strong>Language:</strong> {formData.language}</p>
                <p><strong>User:</strong> {user?.first_name} {user?.last_name}</p>
            </div>
            )}
        </SubTabPanel>

        <SubTabPanel value={activeSubTab} index={2}>
          <Typography variant="h5" gutterBottom>
            Delete Document Collection
          </Typography>
          <div>
            <p>Select a document collection to delete. <strong>Warning:</strong> This will permanently delete all documents, content, and annotations in the collection.</p>
            <p style={{ color: 'red', fontWeight: 'bold' }}>⚠️ This action cannot be undone!</p>
            
            <StyledForm>
              <FormControl fullWidth sx={{ maxWidth: '400px' }}>
                <InputLabel id="delete-collection-label">Select a collection</InputLabel>
                <Select
                  labelId="delete-collection-label"
                  id="delete-collection-select"
                  value={selectedCollection}
                  label="Select a collection"
                  onChange={handleCollectionSelect}
                  disabled={isDeleting}
                >
                  <MenuItem value="">
                    <em>-- Select a collection --</em>
                  </MenuItem>
                  {documentCollections.map((collection) => (
                    <MenuItem key={collection.id} value={collection.id.toString()}>
                      {collection.title}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </StyledForm>

            {isLoadingStats && (
              <Box sx={{ width: '100%', mt: 2 }}>
                <LinearProgress />
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Loading collection statistics...
                </Typography>
              </Box>
            )}

            {collectionStats && (
              <Box sx={{ mt: 2, p: 2, backgroundColor: '#fff3cd', border: '1px solid #ffeaa7', borderRadius: '4px' }}>
                <Typography variant="h6" gutterBottom>
                  Collection Details:
                </Typography>
                <Typography variant="body2"><strong>Name:</strong> {collectionStats.title}</Typography>
                {collectionStats.description && (
                  <Typography variant="body2"><strong>Description:</strong> {collectionStats.description}</Typography>
                )}
                <Typography variant="body2"><strong>Visibility:</strong> {collectionStats.visibility}</Typography>
                <Typography variant="body2"><strong>Created:</strong> {new Date(collectionStats.created).toLocaleDateString()}</Typography>
                <Typography variant="body2"><strong>Modified:</strong> {new Date(collectionStats.modified).toLocaleDateString()}</Typography>
                
                <Typography variant="h6" sx={{ mt: 2 }} gutterBottom>
                  Content to be deleted:
                </Typography>
                <Typography variant="body2" sx={{ color: 'error.main' }}>
                  • {collectionStats.document_count} documents
                </Typography>
                <Typography variant="body2" sx={{ color: 'error.main' }}>
                  • {collectionStats.element_count} paragraphs
                </Typography>
                <Typography variant="body2" sx={{ color: 'error.main' }}>
                  • {collectionStats.scholarly_annotation_count} scholarly annotations
                </Typography>
                <Typography variant="body2" sx={{ color: 'error.main' }}>
                  • {collectionStats.comment_count} comments
                </Typography>
              </Box>
            )}

            {showProgress && (
              <Box sx={{ width: '100%', mt: 2 }}>
                <LinearProgress variant="determinate" value={deleteProgress} />
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Deleting collection... {deleteProgress}%
                </Typography>
              </Box>
            )}

            <Button
              variant="contained"
              color="error"
              onClick={initiateDeleteCollection}
              disabled={!selectedCollection || isDeleting || !collectionStats}
              sx={{ marginTop: 2 }}
            >
              {isDeleting ? 'Deleting...' : 'Delete Collection'}
            </Button>
          </div>
        </SubTabPanel>
        
        <SubTabPanel value={activeSubTab} index={3}>
          <Typography variant="h5" gutterBottom>
            Rename Document Collection
          </Typography>
          <div>
            <p>Select a document collection to rename:</p>
            <StyledForm>
              <FormControl fullWidth sx={{ maxWidth: '400px' }}>
                <InputLabel id="rename-collection-label">Select a collection</InputLabel>
                <Select
                  labelId="rename-collection-label"
                  id="rename-collection-select"
                  value={renameSelectedCollection}
                  label="Select a collection"
                  onChange={handleRenameCollectionSelect}
                  disabled={isRenaming}
                >
                  <MenuItem value="">
                    <em>-- Select a collection --</em>
                  </MenuItem>
                  {documentCollections.map((collection) => (
                    <MenuItem key={collection.id} value={collection.id.toString()}>
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
                  value={renameNewName}
                  onChange={handleRenameNewNameChange}
                  disabled={isRenaming}
                  maxLength={200}
                />
              </div>
              
              <Button
                variant="contained"
                color="primary"
                onClick={handleRenameCollection}
                disabled={!isRenameFormValid() || isRenaming}
                sx={{ marginTop: 2 }}
              >
                {isRenaming ? 'Renaming...' : 'Rename Collection'}
              </Button>
            </StyledForm>
          </div>
        </SubTabPanel>

        <SubTabPanel value={activeSubTab} index={4}>
          <Typography variant="h5" gutterBottom>
            Update Collection Visibility
          </Typography>
          <div>
            <p>Select a collection to update its visibility setting:</p>
            <StyledForm>
              <FormControl fullWidth sx={{ maxWidth: '400px' }}>
                <InputLabel id="update-visibility-collection-label">Select a collection</InputLabel>
                <Select
                  labelId="update-visibility-collection-label"
                  id="update-visibility-collection-select"
                  value={updateVisibilitySelectedCollection}
                  label="Select a collection"
                  onChange={handleUpdateVisibilityCollectionSelect}
                  disabled={isUpdatingVisibility}
                >
                  <MenuItem value="">
                    <em>-- Select a collection --</em>
                  </MenuItem>
                  {documentCollections.map((collection) => (
                    <MenuItem key={collection.id} value={collection.id.toString()}>
                      {collection.title}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {isLoadingVisibilityCollection && (
                <Box sx={{ width: '100%', mt: 2 }}>
                  <LinearProgress />
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Loading collection details...
                  </Typography>
                </Box>
              )}

              {updateVisibilityCollectionDetails && (
                <Box sx={{ mt: 2, p: 2, backgroundColor: '#e3f2fd', border: '1px solid #bbdefb', borderRadius: '4px' }}>
                  <Typography variant="h6" gutterBottom>
                    Collection Details:
                  </Typography>
                  <Typography variant="body2"><strong>Name:</strong> {updateVisibilityCollectionDetails.title}</Typography>
                  {updateVisibilityCollectionDetails.description && (
                    <Typography variant="body2"><strong>Description:</strong> {updateVisibilityCollectionDetails.description}</Typography>
                  )}
                  <Typography variant="body2"><strong>Current Visibility:</strong> {updateVisibilityCollectionDetails.visibility}</Typography>
                </Box>
              )}
              
              {updateVisibilityCollectionDetails && (
                <div className="form-group" style={{ marginTop: '16px' }}>
                  <FormControl fullWidth sx={{ maxWidth: '400px' }}>
                    <InputLabel id="update-visibility-new-visibility-label">New Visibility</InputLabel>
                    <Select
                      labelId="update-visibility-new-visibility-label"
                      id="update-visibility-new-visibility-select"
                      value={updateVisibilityNewVisibility}
                      label="New Visibility"
                      onChange={handleUpdateVisibilityNewVisibilityChange}
                      disabled={isUpdatingVisibility}
                    >
                      <MenuItem value="public">Public</MenuItem>
                      <MenuItem value="private">Private</MenuItem>
                      <MenuItem value="restricted">Restricted</MenuItem>
                    </Select>
                  </FormControl>
                </div>
              )}
              
              <Button
                variant="contained"
                color="primary"
                onClick={handleUpdateCollectionVisibility}
                disabled={!isUpdateVisibilityFormValid() || isUpdatingVisibility}
                sx={{ marginTop: 2 }}
              >
                {isUpdatingVisibility ? 'Updating...' : 'Update Visibility'}
              </Button>
            </StyledForm>
          </div>
        </SubTabPanel>

        {/* Notification Snackbar */}
        <Snackbar 
          open={notification.open} 
          autoHideDuration={6000} 
          onClose={handleCloseNotification}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert 
            onClose={handleCloseNotification} 
            severity={notification.severity} 
            sx={{ width: '100%' }}
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
          maxWidth="md"
          fullWidth
        >
          <DialogTitle id="alert-dialog-title" sx={{ color: 'error.main' }}>
            {confirmDialog.title}
          </DialogTitle>
          <DialogContent>
            <DialogContentText id="alert-dialog-description" sx={{ marginBottom: 2, whiteSpace: 'pre-line' }}>
              {confirmDialog.message}
            </DialogContentText>
            
            {confirmDialog.requiresNameConfirmation && (
              <TextField
                autoFocus
                margin="dense"
                label="Type collection name to confirm"
                type="text"
                fullWidth
                variant="outlined"
                value={confirmationText}
                onChange={handleConfirmationTextChange}
                error={confirmationText !== '' && !isConfirmationValid()}
                helperText={confirmationText !== '' && !isConfirmationValid() ? 'Collection name must match exactly' : ''}
                sx={{ mt: 2 }}
              />
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseConfirmDialog}>Cancel</Button>
            <Button 
              onClick={confirmDialog.onConfirm} 
              color="error" 
              variant="contained" 
              disabled={confirmDialog.requiresNameConfirmation && !isConfirmationValid()}
              autoFocus={!confirmDialog.requiresNameConfirmation}
            >
              {confirmDialog.requiresNameConfirmation ? 'DELETE COLLECTION' : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
};

export default ManageCollections;