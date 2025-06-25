import React, { useState, useEffect } from "react";
import { Tabs, Tab, Box, Typography, styled, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { createDocument, useAppDispatch } from '@store';
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

  // Fetch documents when collection is selected for word upload
  const handleWordUploadCollectionSelect = (event: any) => {
    const collectionId = parseInt(event.target.value);
    const selectedCollection = documentCollections.find(c => c.id === collectionId);
    
    setSelectedWordUploadCollection(event.target.value);
    setSelectedDocument(''); // Reset document selection
    setWordUploadFormData(prevData => ({
      ...prevData,
      document_collection_id: collectionId || undefined,
      document_id: undefined // Reset document selection
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
        setUploadSuccess(`Successfully uploaded! Created ${result.elements_created} elements from ${result.paragraph_count} paragraphs.`);
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
          <Tab label="Rename" {...a11yPropsSubTab(4)} />
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
                        {/* Assuming you have a selector to get collections */}
                        {documentCollections.map((collection) => (
                            <MenuItem key={collection.id} value={collection.id}>
                                {collection.title}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </div>

            <button type="submit">Add</button>
            </StyledForm>

            {submitted && (
            <div className="submitted-data">
                <h2>A new document has been added: </h2>
                <p><strong>Title:</strong> {formData.title}</p>
                <p><strong>Description:</strong> {formData.description}</p>
                <p><strong>Collection:</strong> {selectedCollection ? documentCollections.find(c => c.id === parseInt(selectedCollection))?.title : 'None'}</p>
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
            Delete Document
          </Typography>
          <div>
            <p>Select a document to delete:</p>
          </div>
        </SubTabPanel>
        
        <SubTabPanel value={activeSubTab} index={4}>
          <Typography variant="h5" gutterBottom>
            Rename Document
          </Typography>
          <div>
            <p>Select a document to rename:</p>
          </div>
        </SubTabPanel>
      </Box>
    </Box>
  );
};

export default ManageDocuments;