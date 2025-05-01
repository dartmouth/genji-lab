import React, { useState } from 'react';
import { createDocumentCollection, useAppDispatch } from '@store';
import { useAuth } from "@hooks/useAuthContext.ts";
import { Tabs, Tab, Box, Typography, styled } from '@mui/material';

// Define TabPanel props interface
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

// TabPanel component to display tab content
function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`vertical-tabpanel-${index}`}
      aria-labelledby={`vertical-tab-${index}`}
      {...other}
      style={{ width: '100%' }}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

// Helper function for accessibility
function a11yProps(index: number) {
  return {
    id: `vertical-tab-${index}`,
    'aria-controls': `vertical-tabpanel-${index}`,
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

interface AdminPanelProps {}

interface FormData {
  title: string;
  visibility: string;
  text_direction: string;
  language: string;
}

const AdminPanel: React.FC<AdminPanelProps> = () => {
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const [formData, setFormData] = useState<FormData>({
    title: '',
    visibility: 'public',
    text_direction: 'ltr',
    language: 'en'
  });
  const [submitted, setSubmitted] = useState<boolean>(false);
  
  // State to manage which tab is active
  const [activeTab, setActiveTab] = useState<number>(0);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
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
    <Box
      sx={{
        flexGrow: 1,
        bgcolor: 'background.paper',
        display: 'flex',
        height: 'auto',
        minHeight: '500px',
      }}
    >
      {/* Vertical Tabs on the left */}
      <Tabs
        orientation="vertical"
        variant="scrollable"
        value={activeTab}
        onChange={handleTabChange}
        aria-label="Admin panel vertical tabs"
        sx={{ 
          borderRight: 1, 
          borderColor: 'divider',
          minWidth: '200px',
          '& .MuiTab-root': {
            alignItems: 'flex-start',
            textAlign: 'left',
            paddingLeft: 2
          }
        }}
      >
        <Tab label="Administration Overview" {...a11yProps(0)} />
        <Tab label="Create Document Collection" {...a11yProps(1)} />
        <Tab label="Manage Document Collections" {...a11yProps(2)} />
        <Tab label="Settings" {...a11yProps(3)} />
      </Tabs>
      
      {/* Tab content area */}
      <TabPanel value={activeTab} index={0}>
        <Typography variant="h4" component="h1" gutterBottom>
          Administration Overview
        </Typography>
        <div>
          <p>Use the tabs on the left to Create and Manage Document Collections as well as change basic Settings.</p>
        </div>
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        <Typography variant="h4" component="h1" gutterBottom>
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
      </TabPanel>
      
      <TabPanel value={activeTab} index={2}>
        <Typography variant="h4" component="h1" gutterBottom>
          Manage Document Collections
        </Typography>
        <div>
          <p>Coming soon - Remove Document Collection</p>
          {/* Add your management UI here */}
        </div>
      </TabPanel>
      
      <TabPanel value={activeTab} index={3}>
        <Typography variant="h4" component="h1" gutterBottom>
          Settings
        </Typography>
        <div>
          <p>Where Administrators go to configure the application's settings.</p>
          {/* Add settings UI here */}
        </div>
      </TabPanel>
    </Box>
  );
};

export default AdminPanel;