import React, { useState, useEffect, useMemo } from "react";
import { Tabs, Tab, Box, Typography, styled, FormControl, InputLabel, Select, MenuItem, 
  Snackbar, Alert, Dialog, DialogActions, DialogContent, DialogContentText, 
  DialogTitle, Button, Checkbox, FormControlLabel } from '@mui/material';
import { createDocument, updateDocument, useAppDispatch } from '@store';
import { useAuth } from "@hooks/useAuthContext.ts";
import { useAppSelector } from "@store/hooks";
import { 
  selectAllDocumentCollections,
  fetchDocumentCollections,
  selectAllDocuments,
  fetchDocumentsByCollection,
} from "@store";

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

const ManageDocuments: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<number>(0);
  const dispatch = useAppDispatch();
  const documentCollections = useAppSelector(selectAllDocumentCollections);
  const documents = useAppSelector(selectAllDocuments);

  //fetch collections
  useEffect(() => {
    dispatch(fetchDocumentCollections());
  }, [dispatch]);
  
  const handleSubTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveSubTab(newValue);
    
    // Reset form states when changing tabs
    if (newValue === 5) {
      // Reset rename form when entering rename tab
      setRenameSelectedCollection('');
      setRenameSelectedDocument('');
      setRenameNewName('');
      setRenameDocuments([]);
    }
  };

  interface FormData {
    title: string;
    description: string;
    document_collection_id?: number;
  }

  const { user } = useAuth();
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    document_collection_id: undefined
  });
  const [submitted, setSubmitted] = useState<boolean>(false);
  
  const [selectedCollection, setSelectedCollection] = useState<string>('');
  
  // Memoized collection name lookup to prevent unnecessary re-renders
  const selectedCollectionName = useMemo(() => {
    if (!selectedCollection) return 'None';
    return documentCollections.find(c => c.id === parseInt(selectedCollection))?.title || 'None';
  }, [selectedCollection, documentCollections]);
  
  const handleCollectionSelect = (event: any) => {
    setSelectedCollection(event.target.value);
    setFormData(prevData => ({
      ...prevData,
      document_collection_id: parseInt(event.target.value) || undefined
    }));
  };

  // Word document upload form state
  interface WordUploadFormData {
    document_collection_id: number | undefined;
    document_id: number | undefined;
    file: File | null;
  }

  const [wordUploadFormData, setWordUploadFormData] = useState<WordUploadFormData>({
    document_collection_id: undefined,
    document_id: undefined,
    file: null
  });
  
  const [wordUploadSubmitted, setWordUploadSubmitted] = useState<boolean>(false);
  const [wordUploadLoading, setWordUploadLoading] = useState<boolean>(false);
  const [selectedWordUploadCollection, setSelectedWordUploadCollection] = useState<string>('');
  const [selectedDocument, setSelectedDocument] = useState<string>('');
  const [uploadError, setUploadError] = useState<string>('');
  const [uploadSuccess, setUploadSuccess] = useState<string>('');
  const [uploadedCollectionName, setUploadedCollectionName] = useState<string>('');
  const [uploadedDocumentName, setUploadedDocumentName] = useState<string>('');

  // Delete documents state
  const [selectedDeleteCollection, setSelectedDeleteCollection] = useState<string>('');
  const [selectedDocuments, setSelectedDocuments] = useState<number[]>([]);
  const [deleteAllInCollection, setDeleteAllInCollection] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [documentsWithStats, setDocumentsWithStats] = useState<Array<{
    id: number;
    title: string;
    description: string;
    created: string;
    modified: string;
    scholarly_annotation_count: number;
    comment_count: number;
    element_count: number;
    total_annotation_count: number;
  }>>([]);
  
  // Modal state
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    documentsToDelete: Array<{
      id: number, 
      title: string, 
      scholarly_annotation_count?: number, 
      comment_count?: number,
      element_count?: number
    }>;
    onConfirm: () => void;
  }>({ 
    open: false, 
    title: '', 
    message: '', 
    documentsToDelete: [],
    onConfirm: () => {} 
  });

  // Delete document content state
  const [selectedContentDeleteCollection, setSelectedContentDeleteCollection] = useState<string>('');
  const [selectedContentDeleteDocument, setSelectedContentDeleteDocument] = useState<string>('');
  const [isDeletingContent, setIsDeletingContent] = useState<boolean>(false);
  const [contentDeleteStats, setContentDeleteStats] = useState<{
    element_count: number;
    annotation_count: number;
  } | null>(null);

  // Notification state
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({ open: false, message: '', severity: 'info' });

  // Rename-specific state
  const [renameSelectedCollection, setRenameSelectedCollection] = useState<string>('');
  const [renameSelectedDocument, setRenameSelectedDocument] = useState<string>('');
  const [renameNewName, setRenameNewName] = useState<string>('');
  const [isRenaming, setIsRenaming] = useState<boolean>(false);
  const [isLoadingRenameDocuments, setIsLoadingRenameDocuments] = useState<boolean>(false);
  const [renameDocuments, setRenameDocuments] = useState<Array<{
    id: number;
    title: string;
    description: string;
  }>>([]);

  // Memoized documents for content deletion dropdown
  const documentsInSelectedCollection = useMemo(() => {
    if (!selectedContentDeleteCollection) return [];
    return documents.filter(doc => 
      doc.document_collection_id === parseInt(selectedContentDeleteCollection)
    );
  }, [selectedContentDeleteCollection, documents]);

  // Fetch documents when collection is selected for word upload
  const handleWordUploadCollectionSelect = (event: any) => {
    const collectionId = parseInt(event.target.value);
    const selectedCollection = documentCollections.find(c => c.id === collectionId);
    
    setSelectedWordUploadCollection(event.target.value);
    setSelectedDocument('');
    setWordUploadFormData(prevData => ({
      ...prevData,
      document_collection_id: collectionId || undefined,
      document_id: undefined 
    }));
    
    // Store collection name for success message
    setUploadedCollectionName(selectedCollection?.title || '');
    
    if (collectionId) {
      dispatch(fetchDocumentsByCollection(collectionId));
    }
  };

  const handleDocumentSelect = (event: any) => {
    const documentId = parseInt(event.target.value);
    const selectedDoc = documents.find(d => d.id === documentId);
    
    setSelectedDocument(event.target.value);
    setWordUploadFormData(prevData => ({
      ...prevData,
      document_id: documentId || undefined
    }));
    
    // Store document name for success message
    setUploadedDocumentName(selectedDoc?.title || '');
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setWordUploadFormData(prevData => ({
      ...prevData,
      file: file
    }));
  };

  const handleWordUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError('');
    setUploadSuccess('');
    
    if (!wordUploadFormData.document_collection_id || !wordUploadFormData.document_id || !wordUploadFormData.file) {
      setUploadError('Please select a collection, document, and file');
      return;
    }

    if (!wordUploadFormData.file.name.endsWith('.docx')) {
      setUploadError('Please select a .docx file');
      return;
    }

    setWordUploadLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', wordUploadFormData.file);
      
      const response = await fetch(`/api/v1/elements/upload-word-doc?document_collection_id=${wordUploadFormData.document_collection_id}&document_id=${wordUploadFormData.document_id}`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        setUploadSuccess(`Successfully uploaded! Created ${result.elements_created} paragraphs.`);
        setWordUploadSubmitted(true);
        // Reset form
        setWordUploadFormData({
          document_collection_id: undefined,
          document_id: undefined,
          file: null
        });
        setSelectedWordUploadCollection('');
        setSelectedDocument('');
      } else {
        const errorData = await response.json();
        setUploadError(errorData.detail || 'Upload failed');
      }
    } catch (error) {
      setUploadError('Network error occurred during upload');
    } finally {
      setWordUploadLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  const payload: { title: string; description: string; document_collection_id?: number } = {
    title: formData.title,
    description: formData.description,
  };
  if (formData.document_collection_id !== undefined) {
    payload.document_collection_id = formData.document_collection_id;
  }
  
  dispatch(createDocument(payload as any));
  setSubmitted(true);
};

  // Delete functionality handlers
  const handleDeleteCollectionSelect = async (event: any) => {
    const collectionId = parseInt(event.target.value);
    setSelectedDeleteCollection(event.target.value);
    setSelectedDocuments([]); // Reset document selection
    setDeleteAllInCollection(false); // Reset delete all option
    setDocumentsWithStats([]); // Reset documents with stats
    
    if (collectionId) {
      try {
        // Fetch documents with annotation statistics
        const response = await fetch(`/api/v1/documents/collection/${collectionId}/with-stats`);
        if (response.ok) {
          const documentsData = await response.json();
          setDocumentsWithStats(documentsData);
        } else {
          showNotification('Failed to fetch document statistics', 'error');
        }
      } catch (error) {
        showNotification('Error fetching document statistics', 'error');
      }
    }
  };

  const handleDocumentCheckboxChange = (documentId: number) => {
    setSelectedDocuments(prev => {
      if (prev.includes(documentId)) {
        return prev.filter(id => id !== documentId);
      } else {
        return [...prev, documentId];
      }
    });
    // If individual documents are selected, uncheck "delete all"
    setDeleteAllInCollection(false);
  };

  const handleDeleteAllChange = (checked: boolean) => {
    setDeleteAllInCollection(checked);
    if (checked) {
      // If "delete all" is checked, clear individual selections
      setSelectedDocuments([]);
    }
  };

  const showNotification = (message: string, severity: 'success' | 'error' | 'info' | 'warning') => {
    setNotification({ open: true, message, severity });
  };

  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  const handleCloseDeleteConfirmDialog = () => {
    setDeleteConfirmDialog({ ...deleteConfirmDialog, open: false });
  };

  const initiateDelete = () => {
    if (!selectedDeleteCollection) {
      showNotification('Please select a collection first', 'error');
      return;
    }

    let documentsToDelete: Array<{
      id: number; 
      title: string; 
      scholarly_annotation_count: number; 
      comment_count: number;
      element_count: number;
    }> = [];
    let message = '';

    if (deleteAllInCollection) {
      documentsToDelete = documentsWithStats.map(doc => ({ 
        id: doc.id, 
        title: doc.title,
        scholarly_annotation_count: doc.scholarly_annotation_count,
        comment_count: doc.comment_count,
        element_count: doc.element_count
      }));
      message = `Are you sure you want to delete ALL ${documentsToDelete.length} documents in this collection? This action cannot be undone.`;
    } else if (selectedDocuments.length > 0) {
      documentsToDelete = documentsWithStats
        .filter(doc => selectedDocuments.includes(doc.id))
        .map(doc => ({ 
          id: doc.id, 
          title: doc.title,
          scholarly_annotation_count: doc.scholarly_annotation_count,
          comment_count: doc.comment_count,
          element_count: doc.element_count
        }));
      message = `Are you sure you want to delete ${documentsToDelete.length} selected document(s)? This action cannot be undone.`;
    } else {
      showNotification('Please select documents to delete or choose "Delete All"', 'error');
      return;
    }

    setDeleteConfirmDialog({
      open: true,
      title: 'Confirm Document Deletion',
      message,
      documentsToDelete,
      onConfirm: handleConfirmDelete
    });
  };

  const handleConfirmDelete = async () => {
    setDeleteConfirmDialog({ ...deleteConfirmDialog, open: false });
    setIsDeleting(true);

    try {
      const collectionId = parseInt(selectedDeleteCollection);
      let response;

      if (deleteAllInCollection) {
        // Delete all documents in collection
        response = await fetch(`/api/v1/collections/${collectionId}/documents`, {
          method: 'DELETE',
        });
      } else {
        // Delete selected documents
        const documentIds = selectedDocuments;
        response = await fetch('/api/v1/documents/bulk-delete', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ document_ids: documentIds }),
        });
      }

      if (response.ok) {
        // Refresh the documents list after successful deletion
        if (selectedDeleteCollection) {
          const collectionId = parseInt(selectedDeleteCollection);
          try {
            const refreshResponse = await fetch(`/api/v1/documents/collection/${collectionId}/with-stats`);
            if (refreshResponse.ok) {
              const documentsData = await refreshResponse.json();
              setDocumentsWithStats(documentsData);
            }
          } catch (refreshError) {
            console.error('Failed to refresh documents list:', refreshError);
          }
        }
        setSelectedDocuments([]);
        setDeleteAllInCollection(false);
        showNotification('Documents deleted successfully', 'success');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to delete documents');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      showNotification(`Failed to delete documents: ${errorMessage}`, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Delete document content handlers
  const handleContentDeleteCollectionSelect = async (event: any) => {
    const collectionId = parseInt(event.target.value);
    setSelectedContentDeleteCollection(event.target.value);
    setSelectedContentDeleteDocument(''); 
    setContentDeleteStats(null); 
    
    if (collectionId) {
      // Fetch documents for this collection
      dispatch(fetchDocumentsByCollection(collectionId));
    }
  };

  const handleContentDeleteDocumentSelect = async (event: any) => {
    const documentId = parseInt(event.target.value);
    setSelectedContentDeleteDocument(event.target.value);
    setContentDeleteStats(null); 
    
    if (documentId) {
      // Fetch stats for this document
      try {
        const response = await fetch(`/api/v1/elements/document/${documentId}/stats`);
        if (response.ok) {
          const stats = await response.json();
          setContentDeleteStats({
            element_count: stats.element_count,
            annotation_count: stats.annotation_count
          });
        }
      } catch (error) {
        console.error('Failed to fetch document content stats:', error);
        showNotification('Failed to fetch document statistics', 'error');
      }
    }
  };

  const initiateContentDelete = () => {
    if (!selectedContentDeleteDocument || !contentDeleteStats) {
      showNotification('Please select a document first', 'error');
      return;
    }

    const selectedDoc = documents.find(d => d.id === parseInt(selectedContentDeleteDocument));
    const selectedCollection = documentCollections.find(c => c.id === parseInt(selectedContentDeleteCollection));
    
    if (!selectedDoc || !selectedCollection) {
      showNotification('Invalid document or collection selection', 'error');
      return;
    }

    const message = `Are you sure you want to delete ALL CONTENT from "${selectedDoc.title}" in collection "${selectedCollection.title}"?

This will permanently delete:
• ${contentDeleteStats.element_count} paragraphs
• ${contentDeleteStats.annotation_count} annotations

The document itself will remain but will be empty. This action cannot be undone.`;

    setDeleteConfirmDialog({
      open: true,
      title: 'Confirm Document Content Deletion',
      message,
      documentsToDelete: [{
        id: selectedDoc.id,
        title: selectedDoc.title,
        element_count: contentDeleteStats.element_count,
        scholarly_annotation_count: contentDeleteStats.annotation_count,
        comment_count: 0
      }],
      onConfirm: handleConfirmContentDelete
    });
  };

  const handleConfirmContentDelete = async () => {
    if (!selectedContentDeleteDocument) return;

    setIsDeletingContent(true);
    setDeleteConfirmDialog({ ...deleteConfirmDialog, open: false });

    try {
      const documentId = parseInt(selectedContentDeleteDocument);
      const response = await fetch(`/api/v1/elements/document/${documentId}/all-elements?force=true`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const selectedDoc = documents.find(d => d.id === documentId);
        const selectedCollection = documentCollections.find(c => c.id === parseInt(selectedContentDeleteCollection));
        
        // Reset form
        setSelectedContentDeleteDocument('');
        setContentDeleteStats(null);
        
        showNotification(
          `Successfully deleted all content from document '${selectedDoc?.title}' in collection '${selectedCollection?.title}'`, 
          'success'
        );
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to delete document content');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      showNotification(`Failed to delete document content: ${errorMessage}`, 'error');
    } finally {
      setIsDeletingContent(false);
    }
  };

  // Rename functionality handlers
  const handleRenameCollectionSelect = async (event: any) => {
    const collectionId = event.target.value;
    setRenameSelectedCollection(collectionId);
    setRenameSelectedDocument('');
    setRenameNewName('');
    setRenameDocuments([]);
    
    if (collectionId) {
      setIsLoadingRenameDocuments(true);
      try {
        // Fetch documents for the selected collection
        const result = await dispatch(fetchDocumentsByCollection(parseInt(collectionId))).unwrap();
        // Use the documents from the result
        setRenameDocuments(result.documents);
      } catch (error) {
        console.error('Failed to fetch documents for collection:', error);
        showNotification('Failed to load documents for selected collection', 'error');
      } finally {
        setIsLoadingRenameDocuments(false);
      }
    }
  };

  const handleRenameDocumentSelect = (event: any) => {
    const documentId = event.target.value;
    setRenameSelectedDocument(documentId);
    
    // Pre-fill the new name field with current document title
    if (documentId) {
      const selectedDoc = renameDocuments.find(d => d.id === parseInt(documentId));
      setRenameNewName(selectedDoc?.title || '');
    } else {
      setRenameNewName('');
    }
  };

  const handleRenameNewNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRenameNewName(event.target.value);
  };

  const handleRenameDocument = async () => {
    if (!renameSelectedDocument || !renameNewName.trim()) {
      showNotification('Please select a document and enter a new name', 'error');
      return;
    }

    const selectedDocument = renameDocuments.find(d => d.id === parseInt(renameSelectedDocument));
    if (!selectedDocument) {
      showNotification('Selected document not found', 'error');
      return;
    }

    if (renameNewName.trim() === selectedDocument.title) {
      showNotification('New name must be different from current name', 'error');
      return;
    }

    // Check if name already exists in the same collection
    const nameExists = renameDocuments.some(d => 
      d.title.toLowerCase() === renameNewName.trim().toLowerCase() && 
      d.id !== parseInt(renameSelectedDocument)
    );
    
    if (nameExists) {
      showNotification('A document with this name already exists in this collection', 'error');
      return;
    }

    setIsRenaming(true);
    
    try {
      await dispatch(updateDocument({
        id: parseInt(renameSelectedDocument),
        updates: {
          title: renameNewName.trim()
        }
      })).unwrap();
      
      // Refresh documents to show updated data
      if (renameSelectedCollection) {
        const result = await dispatch(fetchDocumentsByCollection(parseInt(renameSelectedCollection))).unwrap();
        setRenameDocuments(result.documents);
      }
      
      showNotification(
        `Document renamed from "${selectedDocument.title}" to "${renameNewName.trim()}"`, 
        'success'
      );
      
      // Reset form
      setRenameSelectedDocument('');
      setRenameNewName('');
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      showNotification(`Failed to rename document: ${errorMessage}`, 'error');
    } finally {
      setIsRenaming(false);
    }
  };

  const isRenameFormValid = () => {
    return renameSelectedCollection && 
           renameSelectedDocument && 
           renameNewName.trim() && 
           renameNewName.trim().length > 0;
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Manage Documents
      </Typography>
      
      <Box sx={{ display: 'flex', height: 'auto' }}>
        {/* Sub-tabs for Manage Documents */}
        <Tabs
          orientation="vertical"
          variant="scrollable"
          value={activeSubTab}
          onChange={handleSubTabChange}
          aria-label="Manage documents sub-tabs"
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
          <Tab label="Add Word Content to Document" {...a11yPropsSubTab(2)} />
          <Tab label="Delete" {...a11yPropsSubTab(3)} />
          <Tab label="Delete Document Content" {...a11yPropsSubTab(4)} />
          <Tab label="Rename" {...a11yPropsSubTab(5)} />
        </Tabs>
        
        {/* Sub-tab content */}
        <SubTabPanel value={activeSubTab} index={0}>
          <Typography variant="h5" gutterBottom>
            Documents Overview
          </Typography>
          <div>
            <p>Features for managing documents.</p>
          </div>
        </SubTabPanel>

        <SubTabPanel value={activeSubTab} index={1}>
            <Typography variant="h5" gutterBottom>
                Add Document
            </Typography>
            <div>
            <p>Complete this form to add your new document.</p>
            </div>
            <StyledForm onSubmit={handleSubmit}>
            <div className="form-group">
                <FormControl fullWidth>
                    <InputLabel id="collection-select-label">Collection</InputLabel>
                    <Select
                        labelId="collection-select-label"
                        id="collection-select"
                        value={selectedCollection}
                        onChange={handleCollectionSelect}
                        name="document_collection_id"
                    >
                        <MenuItem value="">
                            <em>None</em>
                        </MenuItem>
                        {documentCollections.map((collection) => (
                            <MenuItem key={collection.id} value={collection.id}>
                                {collection.title}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </div>
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
                <label htmlFor="description">Description: </label>
                <input
                type="text"
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                />
            </div>

            <button type="submit">Add</button>
            </StyledForm>

            {submitted && (
            <div className="submitted-data">
                <h2>A new document has been added: </h2>
                <p><strong>Title:</strong> {formData.title}</p>
                <p><strong>Description:</strong> {formData.description}</p>
                <p><strong>Collection:</strong> {selectedCollectionName}</p>
                <p><strong>User:</strong> {user?.first_name} {user?.last_name}</p>
            </div>
            )}
        </SubTabPanel>

        <SubTabPanel value={activeSubTab} index={2}>
          <Typography variant="h5" gutterBottom>
            Add Word Content to Document
          </Typography>
          <div>
            <p>Upload Word document (.docx) content to an existing document.</p>
          </div>
          <StyledForm onSubmit={handleWordUploadSubmit}>
            <div className="form-group">
              <FormControl fullWidth>
                <InputLabel id="word-upload-collection-select-label">Document Collection</InputLabel>
                <Select
                  labelId="word-upload-collection-select-label"
                  id="word-upload-collection-select"
                  value={selectedWordUploadCollection}
                  onChange={handleWordUploadCollectionSelect}
                  name="document_collection_id"
                  required
                >
                  <MenuItem value="">
                    <em>Select a collection</em>
                  </MenuItem>
                  {documentCollections.map((collection) => (
                    <MenuItem key={collection.id} value={collection.id}>
                      {collection.title}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </div>

            <div className="form-group">
              <FormControl fullWidth>
                <InputLabel id="document-select-label">Document</InputLabel>
                <Select
                  labelId="document-select-label"
                  id="document-select"
                  value={selectedDocument}
                  onChange={handleDocumentSelect}
                  name="document_id"
                  required
                  disabled={!selectedWordUploadCollection}
                >
                  <MenuItem value="">
                    <em>Select a document</em>
                  </MenuItem>
                  {documents.map((document) => (
                    <MenuItem key={document.id} value={document.id}>
                      {document.title}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </div>

            <div className="form-group">
              <label htmlFor="word-file">Word Document (.docx): </label>
              <input
                type="file"
                id="word-file"
                name="file"
                accept=".docx"
                onChange={handleFileSelect}
                required
              />
            </div>

            {uploadError && (
              <div style={{ color: 'red', marginBottom: '16px' }}>
                {uploadError}
              </div>
            )}

            {uploadSuccess && (
              <div style={{ color: 'green', marginBottom: '16px' }}>
                {uploadSuccess}
              </div>
            )}

            <button type="submit" disabled={wordUploadLoading}>
              {wordUploadLoading ? 'Uploading...' : 'Upload Word Document'}
            </button>
          </StyledForm>

          {wordUploadSubmitted && uploadSuccess && (
            <div className="submitted-data">
              <h2>Word document uploaded successfully!</h2>
              <p><strong>Collection:</strong> {uploadedCollectionName}</p>
              <p><strong>Document:</strong> {uploadedDocumentName}</p>
              <p><strong>User:</strong> {user?.first_name} {user?.last_name}</p>
            </div>
          )}
        </SubTabPanel>

        <SubTabPanel value={activeSubTab} index={3}>
          <Typography variant="h5" gutterBottom>
            Delete Documents
          </Typography>
          <div>
            <p>Select a collection and then choose documents to delete:</p>
            <StyledForm>
              <FormControl fullWidth sx={{ maxWidth: '400px' }}>
                <InputLabel id="delete-collection-label">Select a collection</InputLabel>
                <Select
                  labelId="delete-collection-label"
                  id="delete-collection-select"
                  value={selectedDeleteCollection}
                  label="Select a collection"
                  onChange={handleDeleteCollectionSelect}
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

              {selectedDeleteCollection && documentsWithStats.length > 0 && (
                <div style={{ marginTop: '20px' }}>
                  <Typography variant="h6" gutterBottom>
                    Documents in Collection:
                  </Typography>
                  
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={deleteAllInCollection}
                        onChange={(e) => handleDeleteAllChange(e.target.checked)}
                        color="error"
                      />
                    }
                    label={`Delete ALL documents in this collection (${documentsWithStats.length} total)`}
                    sx={{ marginBottom: 2, '& .MuiFormControlLabel-label': { fontWeight: 'bold', color: 'error.main' } }}
                  />

                  {!deleteAllInCollection && (
                    <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #ddd', padding: '10px', borderRadius: '4px' }}>
                      {documentsWithStats.map((document) => {
                        const annotationText = [];
                        if (document.scholarly_annotation_count > 0) {
                          annotationText.push(`${document.scholarly_annotation_count} scholarly annotation${document.scholarly_annotation_count !== 1 ? 's' : ''}`);
                        }
                        if (document.comment_count > 0) {
                          annotationText.push(`${document.comment_count} comment${document.comment_count !== 1 ? 's' : ''}`);
                        }
                        const annotationSuffix = annotationText.length > 0 ? ` (${annotationText.join(', ')})` : '';
                        
                        return (
                          <FormControlLabel
                            key={document.id}
                            control={
                              <Checkbox
                                checked={selectedDocuments.includes(document.id)}
                                onChange={() => handleDocumentCheckboxChange(document.id)}
                              />
                            }
                            label={`${document.title || `Document ${document.id}`}${annotationSuffix}`}
                            sx={{ display: 'block', marginBottom: 1 }}
                          />
                        );
                      })}
                    </div>
                  )}

                  <Button
                    variant="contained"
                    color="error"
                    onClick={initiateDelete}
                    disabled={isDeleting || (!deleteAllInCollection && selectedDocuments.length === 0)}
                    sx={{ marginTop: 2 }}
                  >
                    {isDeleting ? 'Deleting...' : 'Delete Selected Documents'}
                  </Button>
                </div>
              )}

              {selectedDeleteCollection && documentsWithStats.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ marginTop: 2 }}>
                  No documents found in this collection.
                </Typography>
              )}
            </StyledForm>
          </div>
        </SubTabPanel>
        
        <SubTabPanel value={activeSubTab} index={4}>
          <Typography variant="h5" gutterBottom>
            Delete Document Content
          </Typography>
          <div>
            <p>Select a document to delete all of its content. The document itself will remain but all content and annotations will be permanently deleted.</p>
            <p style={{ color: 'red', fontWeight: 'bold' }}>⚠️ Warning: This action cannot be undone!</p>
          </div>
          <StyledForm>
            <div className="form-group">
              <FormControl fullWidth sx={{ maxWidth: '400px' }}>
                <InputLabel id="content-delete-collection-select-label">Collection</InputLabel>
                <Select
                  labelId="content-delete-collection-select-label"
                  id="content-delete-collection-select"
                  value={selectedContentDeleteCollection}
                  onChange={handleContentDeleteCollectionSelect}
                  name="content_delete_collection_id"
                >
                  <MenuItem value="">
                    <em>Select a collection...</em>
                  </MenuItem>
                  {documentCollections.map((collection) => (
                    <MenuItem key={collection.id} value={collection.id}>
                      {collection.title}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </div>

            {selectedContentDeleteCollection && (
              <div className="form-group">
                <FormControl fullWidth>
                  <InputLabel id="content-delete-document-select-label">Document</InputLabel>
                  <Select
                    labelId="content-delete-document-select-label"
                    id="content-delete-document-select"
                    value={selectedContentDeleteDocument}
                    onChange={handleContentDeleteDocumentSelect}
                    name="content_delete_document_id"
                  >
                    <MenuItem value="">
                      <em>Select a document...</em>
                    </MenuItem>
                    {documentsInSelectedCollection.map((document) => (
                      <MenuItem key={document.id} value={document.id}>
                        {document.title}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </div>
            )}

            {contentDeleteStats && (
              <div style={{ marginTop: '16px', padding: '16px', backgroundColor: '#fff3cd', border: '1px solid #ffeaa7', borderRadius: '4px' }}>
                <Typography variant="h6" gutterBottom>Content to be deleted:</Typography>
                <Typography variant="body2">• {contentDeleteStats.element_count} paragraphs</Typography>
                <Typography variant="body2">• {contentDeleteStats.annotation_count} annotations</Typography>
              </div>
            )}

            <button 
              type="button" 
              onClick={initiateContentDelete}
              disabled={!selectedContentDeleteDocument || isDeletingContent}
              className="delete-button"
            >
              {isDeletingContent ? 'Deleting Content...' : 'Delete Document Content'}
            </button>

            {selectedContentDeleteCollection && documentsInSelectedCollection.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ marginTop: 2 }}>
                No documents found in this collection.
              </Typography>
            )}
          </StyledForm>
        </SubTabPanel>
        
        <SubTabPanel value={activeSubTab} index={5}>
          <Typography variant="h5" gutterBottom>
            Rename Document
          </Typography>
          <div>
            <p>Select a document to rename:</p>
          </div>
          <StyledForm>
            <div className="form-group">
              <FormControl fullWidth>
                <InputLabel id="rename-collection-select-label">Collection</InputLabel>
                <Select
                  labelId="rename-collection-select-label"
                  id="rename-collection-select"
                  value={renameSelectedCollection}
                  onChange={handleRenameCollectionSelect}
                  name="rename_collection_id"
                  disabled={isRenaming}
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {documentCollections.map((collection) => (
                    <MenuItem key={collection.id} value={collection.id}>
                      {collection.title}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </div>

            <div className="form-group">
              <FormControl fullWidth>
                <InputLabel id="rename-document-select-label">Document</InputLabel>
                <Select
                  labelId="rename-document-select-label"
                  id="rename-document-select"
                  value={renameSelectedDocument}
                  onChange={handleRenameDocumentSelect}
                  name="rename_document_id"
                  disabled={!renameSelectedCollection || isRenaming || isLoadingRenameDocuments}
                >
                  <MenuItem value="">
                    <em>{isLoadingRenameDocuments ? 'Loading documents...' : 'Select a document'}</em>
                  </MenuItem>
                  {renameDocuments.map((document) => (
                    <MenuItem key={document.id} value={document.id}>
                      {document.title}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </div>

            <div className="form-group">
              <label htmlFor="rename-new-name">New Name: </label>
              <input
                type="text"
                id="rename-new-name"
                name="rename_new_name"
                value={renameNewName}
                onChange={handleRenameNewNameChange}
                disabled={isRenaming}
                maxLength={200}
                placeholder="Enter new document name"
                required
              />
            </div>

            <Button
              variant="contained"
              onClick={handleRenameDocument}
              disabled={isRenaming || !isRenameFormValid()}
              sx={{ marginTop: 2 }}
            >
              {isRenaming ? 'Renaming...' : 'Rename Document'}
            </Button>
          </StyledForm>
        </SubTabPanel>
      </Box>

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

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmDialog.open}
        onClose={handleCloseDeleteConfirmDialog}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
        maxWidth="md"
        fullWidth
      >
        <DialogTitle id="delete-dialog-title" sx={{ color: 'error.main' }}>
          {deleteConfirmDialog.title}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description" sx={{ marginBottom: 2, whiteSpace: 'pre-line' }}>
            {deleteConfirmDialog.message}
          </DialogContentText>
          
          {deleteConfirmDialog.title !== 'Confirm Document Content Deletion' && deleteConfirmDialog.documentsToDelete.length > 0 && (
            <div>
              <Typography variant="subtitle2" gutterBottom>
                Documents to be deleted:
              </Typography>
              <div style={{ 
                maxHeight: '200px', 
                overflowY: 'auto', 
                backgroundColor: '#f5f5f5', 
                padding: '10px', 
                borderRadius: '4px',
                border: '1px solid #ddd'
              }}>
                {deleteConfirmDialog.documentsToDelete.map((doc, index) => {
                  const annotationText = [];
                  if (doc.scholarly_annotation_count && doc.scholarly_annotation_count > 0) {
                    annotationText.push(`${doc.scholarly_annotation_count} scholarly annotation${doc.scholarly_annotation_count !== 1 ? 's' : ''}`);
                  }
                  if (doc.comment_count && doc.comment_count > 0) {
                    annotationText.push(`${doc.comment_count} comment${doc.comment_count !== 1 ? 's' : ''}`);
                  }
                  const annotationSuffix = annotationText.length > 0 ? ` (${annotationText.join(', ')})` : '';
                  
                  return (
                    <Typography key={doc.id} variant="body2" sx={{ marginBottom: 0.5 }}>
                      {index + 1}. {doc.title}{annotationSuffix}
                    </Typography>
                  );
                })}
              </div>
            </div>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteConfirmDialog}>Cancel</Button>
          <Button onClick={deleteConfirmDialog.onConfirm} color="error" variant="contained" autoFocus>
            {deleteConfirmDialog.title === 'Confirm Document Content Deletion' 
              ? 'DELETE DOCUMENT CONTENT' 
              : `Delete ${deleteConfirmDialog.documentsToDelete.length} Document(s)`}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ManageDocuments;