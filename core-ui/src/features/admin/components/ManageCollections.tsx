import React, { useState } from 'react';
import { Tabs, Tab, Box, Typography, styled } from '@mui/material';
import { createDocumentCollection, useAppDispatch } from '@store';
import { useAuth } from "@hooks/useAuthContext.ts";

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
  },
}));

const ManageCollections: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<number>(0);

  const handleSubTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveSubTab(newValue);
  };

interface FormData {
  title: string;
  visibility: string;
  text_direction: string;
  language: string;
}
  const dispatch = useAppDispatch();
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
  };

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
          <Tab label="Create Document Collection" {...a11yPropsSubTab(1)} />
          <Tab label="Delete Document Collection" {...a11yPropsSubTab(2)} />
          <Tab label="Rename Document Collection" {...a11yPropsSubTab(3)} />
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
            Create Document Collection
            </Typography>
            <div>
            <p>Complete the form to create your new Document Collection.</p>
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

            <button type="submit">Submit</button>
            </StyledForm>

            {submitted && (
            <div className="submitted-data">
                <h2>A new Document Collection has been created:</h2>
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
            <p>Select a document collection to delete:</p>
            {/* Add your delete collection UI here */}
            {/* For example: */}
            <select style={{ padding: '8px', width: '100%', maxWidth: '300px' }}>
              <option value="">-- Select a collection --</option>
              <option value="1">Collection 1</option>
              <option value="2">Collection 2</option>
            </select>
            <div style={{ marginTop: '16px' }}>
              <button style={{ padding: '8px 16px', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '4px' }}>
                Delete Document Collection
              </button>
            </div>
          </div>
        </SubTabPanel>
        
        <SubTabPanel value={activeSubTab} index={3}>
          <Typography variant="h5" gutterBottom>
            Rename Document Collection
          </Typography>
          <div>
            <p>Select a document collection to rename:</p>
            {/* Add your rename collection UI here */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '400px' }}>
              <select style={{ padding: '8px' }}>
                <option value="">-- Select a collection --</option>
                <option value="1">Collection 1</option>
                <option value="2">Collection 2</option>
              </select>
              <div>
                <label htmlFor="new-name" style={{ display: 'block', marginBottom: '8px' }}>New Name:</label>
                <input 
                  type="text" 
                  id="new-name" 
                  style={{ padding: '8px', width: '100%' }} 
                  placeholder="Enter new collection name"
                />
              </div>
              <div>
                <button style={{ padding: '8px 16px', backgroundColor: '#2196f3', color: 'white', border: 'none', borderRadius: '4px' }}>
                  Rename Document Collection
                </button>
              </div>
            </div>
          </div>
        </SubTabPanel>
      </Box>
    </Box>
  );
};

export default ManageCollections;