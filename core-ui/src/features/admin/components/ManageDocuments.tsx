import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, Tab, Box, Typography, styled, FormControl, InputLabel, Select, MenuItem, 
  Snackbar, Alert, Dialog, DialogActions, DialogContent, DialogContentText, 
  DialogTitle, Button, Checkbox, FormControlLabel } from '@mui/material';
import { updateDocument, useAppDispatch } from '@store';
import { useAuth } from "@hooks/useAuthContext.ts";
import { useAppSelector } from "@store/hooks";
import { 
  selectAllDocumentCollections,
  fetchDocumentCollections,
  selectAllDocuments,
  fetchDocumentsByCollection,
  fetchAllDocuments,
} from "@store";

import axios, {AxiosInstance} from "axios";
const api: AxiosInstance = axios.create({
    baseURL: '/api/v1',
    timeout: 10000,
  });

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
  const navigate = useNavigate();
  const documentCollections = useAppSelector(selectAllDocumentCollections);
  const documents = useAppSelector(selectAllDocuments);
  const fileInputRef = useRef<HTMLInputElement>(null);

  //fetch collections and all documents
  useEffect(() => {
    dispatch(fetchDocumentCollections({includeUsers: false}));
    dispatch(fetchAllDocuments());
  }, [dispatch]);
  
  const handleSubTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveSubTab(newValue);
    
    // Reset form states when changing tabs
    if (newValue === 1) {
      // Reset import word form when entering import word tab
      setImportWordFormData({
        document_collection_id: undefined,
        title: '',
        description: '',
        file: null
      });
      setSelectedImportWordCollection('');
      setImportWordError('');
      setImportWordSuccess('');
      setImportWordSubmitted(false);
      setImportedDocumentData(null);
    }
    if (newValue === 4) {
      // Reset rename form when entering rename tab
      setRenameSelectedCollection('');
      setRenameSelectedDocument('');
      setRenameNewName('');
      setRenameDocuments([]);
    }
    if (newValue === 5) {
      // Reset update description form when entering update description tab
      setUpdateDescriptionSelectedCollection('');
      setUpdateDescriptionSelectedDocument('');
      setUpdateDescriptionNewDescription('');
      setUpdateDescriptionDocuments([]);
    }
  };

  const { user } = useAuth();

  // Import Word Document form state
  interface ImportWordFormData {
    document_collection_id: number | undefined;
    title: string;
    description: string;
    file: File | null;
  }

  const [importWordFormData, setImportWordFormData] = useState<ImportWordFormData>({
    document_collection_id: undefined,
    title: '',
    description: '',
    file: null
  });
  
  const [importWordSubmitted, setImportWordSubmitted] = useState<boolean>(false);
  const [importWordLoading, setImportWordLoading] = useState<boolean>(false);
  const [selectedImportWordCollection, setSelectedImportWordCollection] = useState<string>('');
  const [importWordError, setImportWordError] = useState<string>('');
  const [importWordSuccess, setImportWordSuccess] = useState<string>('');
  const [importWordTitleError, setImportWordTitleError] = useState<string>('');
  const [importedDocumentData, setImportedDocumentData] = useState<{
    id: number;
    title: string;
    collection_id: number;
    collection_name: string;
    elements_created: number;
  } | null>(null);

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

  // Update description-specific state
  const [updateDescriptionSelectedCollection, setUpdateDescriptionSelectedCollection] = useState<string>('');
  const [updateDescriptionSelectedDocument, setUpdateDescriptionSelectedDocument] = useState<string>('');
  const [updateDescriptionNewDescription, setUpdateDescriptionNewDescription] = useState<string>('');
  const [isUpdatingDescription, setIsUpdatingDescription] = useState<boolean>(false);
  const [isLoadingUpdateDescriptionDocuments, setIsLoadingUpdateDescriptionDocuments] = useState<boolean>(false);
  const [updateDescriptionDocuments, setUpdateDescriptionDocuments] = useState<Array<{
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
  const handleImportWordCollectionSelect = (event: any) => {
    const collectionId = parseInt(event.target.value);
    
    setSelectedImportWordCollection(event.target.value);
    setImportWordFormData(prevData => ({
      ...prevData,
      document_collection_id: collectionId || undefined
    }));

    // Clear previous error and recheck for duplicates with current title
    setImportWordTitleError('');
    
    if (importWordFormData.title.trim() && collectionId) {
      const documentsInCollection = documents.filter(doc => 
        doc.document_collection_id === collectionId
      );
      
      const nameExists = documentsInCollection.some(doc => 
        doc.title.toLowerCase() === importWordFormData.title.trim().toLowerCase()
      );
      
      if (nameExists) {
        setImportWordTitleError('A document with this title already exists in the selected collection');
      }
    }
  };

  const handleImportWordTitleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = event.target.value;
    
    setImportWordFormData(prevData => ({
      ...prevData,
      title: newTitle
    }));

    // Clear previous error immediately
    setImportWordTitleError('');

    // Debounce validation check
    if (newTitle.trim() && importWordFormData.document_collection_id) {
      setTimeout(() => {
        // Only validate if the value hasn't changed since this timeout was set
        setImportWordFormData((currentData) => {
          if (currentData.title === newTitle && newTitle.trim() && currentData.document_collection_id) {
            const documentsInCollection = documents.filter(doc => 
              doc.document_collection_id === currentData.document_collection_id
            );
            
            const nameExists = documentsInCollection.some(doc => 
              doc.title.toLowerCase() === newTitle.trim().toLowerCase()
            );
            
            if (nameExists) {
              setImportWordTitleError('A document with this title already exists in the selected collection');
            }
          }
          return currentData;
        });
      }, 300); // 300ms debounce
    }
  };

  const handleImportWordDescriptionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setImportWordFormData(prevData => ({
      ...prevData,
      description: event.target.value
    }));
  };

  const handleImportWordFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setImportWordFormData(prevData => ({
      ...prevData,
      file: file
    }));
  };

  const handleImportWordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double submission
    if (importWordLoading) {
      return;
    }
    
    setImportWordError('');
    setImportWordSuccess('');
    
    // Check for real-time validation error
    if (importWordTitleError) {
      setImportWordError(importWordTitleError);
      return;
    }
    
    if (!importWordFormData.document_collection_id || !importWordFormData.title.trim() || !importWordFormData.file) {
      setImportWordError('Please select a collection, enter a title, and select a file');
      return;
    }

    if (!importWordFormData.file.name.endsWith('.docx')) {
      setImportWordError('Please select a .docx file');
      return;
    }

    // Check for duplicate document name within the same collection (case-insensitive)
    const documentsInCollection = documents.filter(d => 
      d.document_collection_id === importWordFormData.document_collection_id
    );
    
    const nameExists = documentsInCollection.some(d => 
      d.title.toLowerCase() === importWordFormData.title.trim().toLowerCase()
    );
    
    if (nameExists) {
      setImportWordError('Document name already exists in this collection');
      return;
    }

    setImportWordLoading(true);
    
    // Clear form immediately to prevent re-submission with same data
    const submittedData = { ...importWordFormData };
    setImportWordFormData({
      document_collection_id: undefined,
      title: '',
      description: '',
      file: null
    });
    setSelectedImportWordCollection('');
    setImportWordTitleError('');
    
    // Clear the file input field
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    try {
      const formData = new FormData();
      formData.append('file', submittedData.file!);
      
      const selectedCollection = documentCollections.find(c => c.id === submittedData.document_collection_id);
      
      const response = await api.post(
        `/documents/import-word-doc?document_collection_id=${submittedData.document_collection_id}&title=${encodeURIComponent(submittedData.title)}&description=${encodeURIComponent(submittedData.description)}`, 
        formData
      );

      const result = response.data;
      setImportWordSuccess(`Document "${submittedData.title}" created and imported successfully! Created ${result.import_results.elements_created} paragraphs.`);
      setImportWordSubmitted(true);
      
      // Store the imported document data for display
      setImportedDocumentData({
        id: result.document.id,
        title: result.document.title,
        collection_id: submittedData.document_collection_id!,
        collection_name: selectedCollection?.title || 'Unknown Collection',
        elements_created: result.import_results.elements_created
      });
      
    } catch (error: any) {
      // If import fails, restore the form data so user doesn't lose their work
      setImportWordFormData(submittedData);
      setSelectedImportWordCollection(submittedData.document_collection_id?.toString() || '');
      setImportWordError(`Import failed: ${error.response?.data?.detail || error.message || 'Unknown error'}`);
    } finally {
      // Add a minimum delay to prevent rapid re-submission
      setTimeout(() => {
        setImportWordLoading(false);
      }, 1000);
    }
  };

  // View document handler
  const handleViewDocument = () => {
    if (importedDocumentData) {
      navigate(`/collections/${importedDocumentData.collection_id}/documents/${importedDocumentData.id}`);
    }
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
        const response = await api.get(`/documents/collection/${collectionId}/with-stats`);
        const documentsData = response.data;
        setDocumentsWithStats(documentsData);
      } catch (error: any) {
        const errorMessage = error.response?.data?.detail || error.message || 'Error fetching document statistics';
        showNotification(errorMessage, 'error');
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
        response = await api.delete(`/collections/${collectionId}/documents`);
        console.log(`Delete status is ${response.status}`)
      } else {
        // Delete selected documents
        const documentIds = selectedDocuments;
        response = await api.delete('/documents/bulk-delete', {
          data: { document_ids: documentIds }

        });
        console.log(`Delete status is ${response.status}`)
      }

      // Refresh the documents list after successful deletion
      if (selectedDeleteCollection) {
        const collectionId = parseInt(selectedDeleteCollection);
        try {
          const refreshResponse = await api.get(`/documents/collection/${collectionId}/with-stats`);
          const documentsData = refreshResponse.data;
          setDocumentsWithStats(documentsData);
        } catch (refreshError) {
          console.error('Failed to refresh documents list:', refreshError);
        }
      }
      setSelectedDocuments([]);
      setDeleteAllInCollection(false);
      showNotification('Documents deleted successfully', 'success');
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message || 'An unknown error occurred';
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
        const response = await api.get(`/elements/document/${documentId}/stats`);
        const stats = response.data;
        setContentDeleteStats({
          element_count: stats.element_count,
          annotation_count: stats.annotation_count
        });
      } catch (error: any) {
        console.error('Failed to fetch document content stats:', error);
        const errorMessage = error.response?.data?.detail || error.message || 'Failed to fetch document statistics';
        showNotification(errorMessage, 'error');
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
      const response = await api.delete(`/elements/document/${documentId}/all-elements?force=true`);
      console.log(`Delete status is ${response.status}`)
      const selectedDoc = documents.find(d => d.id === documentId);
      const selectedCollection = documentCollections.find(c => c.id === parseInt(selectedContentDeleteCollection));
      
      // Reset form
      setSelectedContentDeleteDocument('');
      setContentDeleteStats(null);
      
      showNotification(
        `Successfully deleted all content from document '${selectedDoc?.title}' in collection '${selectedCollection?.title}'`, 
        'success'
      );
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message || 'An unknown error occurred';
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

  // Update description functionality handlers
  const handleUpdateDescriptionCollectionSelect = async (event: any) => {
    const collectionId = event.target.value;
    setUpdateDescriptionSelectedCollection(collectionId);
    setUpdateDescriptionSelectedDocument('');
    setUpdateDescriptionNewDescription('');
    setUpdateDescriptionDocuments([]);
    
    if (collectionId) {
      setIsLoadingUpdateDescriptionDocuments(true);
      try {
        // Fetch documents for the selected collection
        const result = await dispatch(fetchDocumentsByCollection(parseInt(collectionId))).unwrap();
        // Use the documents from the result
        setUpdateDescriptionDocuments(result.documents);
      } catch (error) {
        console.error('Failed to fetch documents for collection:', error);
        showNotification('Failed to load documents for selected collection', 'error');
      } finally {
        setIsLoadingUpdateDescriptionDocuments(false);
      }
    }
  };

  const handleUpdateDescriptionDocumentSelect = (event: any) => {
    const documentId = event.target.value;
    setUpdateDescriptionSelectedDocument(documentId);
    
    // Pre-fill the description field with current document description
    if (documentId) {
      const selectedDoc = updateDescriptionDocuments.find(d => d.id === parseInt(documentId));
      setUpdateDescriptionNewDescription(selectedDoc?.description || '');
    } else {
      setUpdateDescriptionNewDescription('');
    }
  };

  const handleUpdateDescriptionNewDescriptionChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setUpdateDescriptionNewDescription(event.target.value);
  };

  const handleUpdateDocumentDescription = async () => {
    if (!updateDescriptionSelectedDocument) {
      showNotification('Please select a document', 'error');
      return;
    }

    const selectedDocument = updateDescriptionDocuments.find(d => d.id === parseInt(updateDescriptionSelectedDocument));
    if (!selectedDocument) {
      showNotification('Selected document not found', 'error');
      return;
    }

    if (updateDescriptionNewDescription.trim() === selectedDocument.description) {
      showNotification('Description must be different from current description', 'error');
      return;
    }

    setIsUpdatingDescription(true);
    
    try {
      await dispatch(updateDocument({
        id: parseInt(updateDescriptionSelectedDocument),
        updates: {
          description: updateDescriptionNewDescription.trim()
        }
      })).unwrap();
      
      // Refresh documents to show updated data
      if (updateDescriptionSelectedCollection) {
        const result = await dispatch(fetchDocumentsByCollection(parseInt(updateDescriptionSelectedCollection))).unwrap();
        setUpdateDescriptionDocuments(result.documents);
        
        // Update the description in the form to reflect the change
        const updatedDoc = result.documents.find(d => d.id === parseInt(updateDescriptionSelectedDocument));
        setUpdateDescriptionNewDescription(updatedDoc?.description || '');
      }
      
      showNotification(
        `Document description updated successfully`, 
        'success'
      );
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      showNotification(`Failed to update document description: ${errorMessage}`, 'error');
    } finally {
      setIsUpdatingDescription(false);
    }
  };

  const isUpdateDescriptionFormValid = () => {
    return updateDescriptionSelectedCollection && 
           updateDescriptionSelectedDocument && 
           updateDescriptionNewDescription.trim() !== undefined;
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
          <Tab label="Import Word Document" {...a11yPropsSubTab(1)} />
          <Tab label="Delete" {...a11yPropsSubTab(2)} />
          <Tab label="Delete Document Content" {...a11yPropsSubTab(3)} />
          <Tab label="Rename" {...a11yPropsSubTab(4)} />
          <Tab label="Update Description" {...a11yPropsSubTab(5)} />
        </Tabs>
        
        {/* Sub-tab content */}
        <SubTabPanel value={activeSubTab} index={0}>
          <Typography variant="h5" gutterBottom>
            Documents Overview
          </Typography>
          <div>
            <p>Features for managing documents:</p>
            <ul>
              <li><strong>Import Word Document:</strong> Create a new document and import Word content</li>
              <li><strong>Delete:</strong> Remove documents and their content permanently</li>
              <li><strong>Delete Document Content:</strong> Remove all content from a document while keeping the document itself</li>
              <li><strong>Rename:</strong> Change document titles</li>
              <li><strong>Update Description:</strong> Modify document descriptions</li>
            </ul>
          </div>
        </SubTabPanel>

        <SubTabPanel value={activeSubTab} index={1}>
          <Typography variant="h5" gutterBottom>
            Import Word Document
          </Typography>
          <div>
            <p>Create a new document and import Word document (.docx) content.</p>
          </div>
          <StyledForm onSubmit={handleImportWordSubmit}>
            <FormControl fullWidth sx={{ maxWidth: '400px' }}>
              <InputLabel id="import-word-collection-select-label">Select a collection</InputLabel>
              <Select
                labelId="import-word-collection-select-label"
                id="import-word-collection-select"
                value={selectedImportWordCollection}
                label="Select a collection"
                onChange={handleImportWordCollectionSelect}
                name="document_collection_id"
                disabled={importWordLoading}
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

            <div className="form-group">
              <label htmlFor="import-word-title">Document Title: </label>
              <input
                type="text"
                id="import-word-title"
                name="title"
                value={importWordFormData.title}
                onChange={handleImportWordTitleChange}
                disabled={importWordLoading}
                required
                placeholder="Enter document title"
                maxLength={200}
                style={{
                  borderColor: importWordTitleError ? 'red' : undefined,
                  opacity: importWordLoading ? 0.6 : 1
                }}
              />
              {importWordTitleError && (
                <div style={{ color: 'red', fontSize: '14px', marginTop: '4px' }}>
                  {importWordTitleError}
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="import-word-description">Description (optional): </label>
              <input
                type="text"
                id="import-word-description"
                name="description"
                value={importWordFormData.description}
                onChange={handleImportWordDescriptionChange}
                disabled={importWordLoading}
                placeholder="Enter document description"
                maxLength={1000}
                style={{ opacity: importWordLoading ? 0.6 : 1 }}
              />
            </div>

            <div className="form-group">
              <label htmlFor="import-word-file">Word Document (.docx): </label>
              <input
                type="file"
                id="import-word-file"
                name="file"
                accept=".docx"
                onChange={handleImportWordFileSelect}
                disabled={importWordLoading}
                required
                ref={fileInputRef}
                style={{ opacity: importWordLoading ? 0.6 : 1 }}
              />
            </div>

            {importWordError && (
              <div style={{ color: 'red', marginBottom: '16px' }}>
                {importWordError}
              </div>
            )}

            {importWordSuccess && (
              <div style={{ color: 'green', marginBottom: '16px' }}>
                {importWordSuccess}
              </div>
            )}

            <button type="submit" disabled={importWordLoading || !!importWordTitleError}>
              {importWordLoading ? 'Importing...' : 'Import Word Document'}
            </button>
          </StyledForm>

          {importWordSubmitted && importWordSuccess && importedDocumentData && (
            <div className="submitted-data">
              <h2>Word document imported successfully!</h2>
              <p><strong>Document ID:</strong> {importedDocumentData.id}</p>
              <p><strong>Title:</strong> {importedDocumentData.title}</p>
              <p><strong>Collection:</strong> {importedDocumentData.collection_name}</p>
              <p><strong>Paragraphs Created:</strong> {importedDocumentData.elements_created}</p>
              <p><strong>User:</strong> {user?.first_name} {user?.last_name}</p>
              
              <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleViewDocument}
                  sx={{
                    backgroundColor: 'success.main',
                    '&:hover': {
                      backgroundColor: 'success.dark',
                    },
                    fontWeight: 'bold'
                  }}
                >
                  📄 View Document
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setImportWordSubmitted(false);
                    setImportWordSuccess('');
                    setImportedDocumentData(null);
                    setImportWordError('');
                  }}
                >
                  Import Another Document
                </Button>
              </Box>
            </div>
          )}
        </SubTabPanel>

        <SubTabPanel value={activeSubTab} index={2}>
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
                    <em>Select a collection</em>
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
        
        <SubTabPanel value={activeSubTab} index={3}>
          <Typography variant="h5" gutterBottom>
            Delete Document Content
          </Typography>
          <div>
            <p>Select a document to delete all of its content. The document itself will remain but all content and annotations will be permanently deleted.</p>
            <p style={{ color: 'red', fontWeight: 'bold' }}>⚠️ Warning: This action cannot be undone!</p>
          </div>
          <StyledForm>
            <FormControl fullWidth sx={{ maxWidth: '400px' }}>
              <InputLabel id="content-delete-collection-select-label">Select a collection</InputLabel>
              <Select
                labelId="content-delete-collection-select-label"
                id="content-delete-collection-select"
                value={selectedContentDeleteCollection}
                label="Select a collection"
                onChange={handleContentDeleteCollectionSelect}
                name="content_delete_collection_id"
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

            {selectedContentDeleteCollection && (
              <FormControl fullWidth sx={{ maxWidth: '400px' }}>
                <InputLabel id="content-delete-document-select-label">Document</InputLabel>
                <Select
                  labelId="content-delete-document-select-label"
                  id="content-delete-document-select"
                  value={selectedContentDeleteDocument}
                  label="Document"
                  onChange={handleContentDeleteDocumentSelect}
                  name="content_delete_document_id"
                >
                  <MenuItem value="">
                    <em>Select a document</em>
                  </MenuItem>
                  {documentsInSelectedCollection.map((document) => (
                    <MenuItem key={document.id} value={document.id}>
                      {document.title}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {contentDeleteStats && (
              <div style={{ marginTop: '16px', padding: '16px', backgroundColor: '#fff3cd', border: '1px solid #ffeaa7', borderRadius: '4px' }}>
                <Typography variant="h6" gutterBottom>Content to be deleted:</Typography>
                <Typography variant="body2">• {contentDeleteStats.element_count} paragraphs</Typography>
                <Typography variant="body2">• {contentDeleteStats.annotation_count} annotations</Typography>
              </div>
            )}

            <Box sx={{ mt: 2 }}>
              <button 
                type="button" 
                onClick={initiateContentDelete}
                disabled={!selectedContentDeleteDocument || isDeletingContent}
                className="delete-button"
              >
                {isDeletingContent ? 'Deleting Content...' : 'Delete Document Content'}
              </button>
            </Box>

            {selectedContentDeleteCollection && documentsInSelectedCollection.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ marginTop: 2 }}>
                No documents found in this collection.
              </Typography>
            )}
          </StyledForm>
        </SubTabPanel>
        
        <SubTabPanel value={activeSubTab} index={4}>
          <Typography variant="h5" gutterBottom>
            Rename Document
          </Typography>
          <div>
            <p>Select a document to rename:</p>
          </div>
          <StyledForm>
            <FormControl fullWidth sx={{ maxWidth: '400px' }}>
              <InputLabel id="rename-collection-select-label">Select a collection</InputLabel>
              <Select
                labelId="rename-collection-select-label"
                id="rename-collection-select"
                value={renameSelectedCollection}
                label="Select a collection"
                onChange={handleRenameCollectionSelect}
                name="rename_collection_id"
                disabled={isRenaming}
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

            <FormControl fullWidth sx={{ maxWidth: '400px' }}>
              <InputLabel id="rename-document-select-label">Document</InputLabel>
              <Select
                labelId="rename-document-select-label"
                id="rename-document-select"
                value={renameSelectedDocument}
                label="Document"
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

        <SubTabPanel value={activeSubTab} index={5}>
          <Typography variant="h5" gutterBottom>
            Update Document Description
          </Typography>
          <div>
            <p>Select a document to update its description:</p>
          </div>
          <StyledForm>
            <FormControl fullWidth sx={{ maxWidth: '400px' }}>
              <InputLabel id="update-description-collection-select-label">Select a collection</InputLabel>
              <Select
                labelId="update-description-collection-select-label"
                id="update-description-collection-select"
                value={updateDescriptionSelectedCollection}
                label="Select a collection"
                onChange={handleUpdateDescriptionCollectionSelect}
                name="update_description_collection_id"
                disabled={isUpdatingDescription}
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

            <FormControl fullWidth sx={{ maxWidth: '400px' }}>
              <InputLabel id="update-description-document-select-label">Document</InputLabel>
              <Select
                labelId="update-description-document-select-label"
                id="update-description-document-select"
                value={updateDescriptionSelectedDocument}
                label="Document"
                onChange={handleUpdateDescriptionDocumentSelect}
                name="update_description_document_id"
                disabled={!updateDescriptionSelectedCollection || isUpdatingDescription || isLoadingUpdateDescriptionDocuments}
              >
                <MenuItem value="">
                  <em>{isLoadingUpdateDescriptionDocuments ? 'Loading documents...' : 'Select a document'}</em>
                </MenuItem>
                {updateDescriptionDocuments.map((document) => (
                  <MenuItem key={document.id} value={document.id}>
                    {document.title}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <div className="form-group">
              <label htmlFor="update-description-new-description">Description: </label>
              <textarea
                id="update-description-new-description"
                name="update_description_new_description"
                value={updateDescriptionNewDescription}
                onChange={handleUpdateDescriptionNewDescriptionChange}
                disabled={isUpdatingDescription}
                maxLength={1000}
                placeholder="Enter document description"
                rows={4}
                style={{ 
                  width: '100%', 
                  maxWidth: '600px',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #ccc',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            <Button
              variant="contained"
              onClick={handleUpdateDocumentDescription}
              disabled={isUpdatingDescription || !isUpdateDescriptionFormValid()}
              sx={{ marginTop: 2 }}
            >
              {isUpdatingDescription ? 'Updating...' : 'Update Description'}
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