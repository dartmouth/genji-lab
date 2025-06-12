import React, { useState, useEffect } from "react";
import { Tabs, Tab, Box, Typography, styled, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { useAppDispatch, useAppSelector } from '@store';
import { useAuth } from "@hooks/useAuthContext.ts";
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

  const handleSubTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveSubTab(newValue);
  };

  //fetch collections
  useEffect(() => {
    dispatch(fetchDocumentCollections());
  }, [dispatch]);
  
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
  };

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
      description: formData.description,
      document_collection_id: formData.document_collection_id
    }
    dispatch(createDocument(payload));
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
          <Tab label="Delete" {...a11yPropsSubTab(2)} />
          <Tab label="Rename" {...a11yPropsSubTab(3)} />
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
            Delete Document
          </Typography>
          <div>
            <p>Select a document to delete:</p>
          </div>
        </SubTabPanel>
        
        <SubTabPanel value={activeSubTab} index={3}>
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