import React, { useState } from 'react';
import { Tabs, Tab, Box, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ManageCollections from './ManageCollections';
import ManageDocuments from './ManageDocuments';
import ManageUsers from './ManageUsers';
import "../../documentGallery/styles/CollectionGalleryStyles.css";

interface AdminPanelProps {}

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

const AdminPanel: React.FC<AdminPanelProps> = () => {  
  // State to manage which tab is active
  const [activeTab, setActiveTab] = useState<number>(0);
  const navigate = useNavigate();

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleBackToCollections = () => {
    navigate('/');
  };

  return (
    <Box
      sx={{
        flexGrow: 1,
        bgcolor: 'background.paper',
        display: 'flex',
        flexDirection: 'column',
        height: 'auto',
        minHeight: '500px',
      }}
    >
      {/* Back to Collections Button */}
      <Box sx={{ padding: 2, borderBottom: 1, borderColor: 'divider' }}>
        <button 
          onClick={handleBackToCollections}
          className="back-button"
        >
          ← Back to Collections
        </button>
      </Box>
      
      {/* Main content area with tabs */}
      <Box sx={{ display: 'flex', flexGrow: 1 }}>
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
          <Tab label="Overview" {...a11yProps(0)} />
          <Tab label="Manage Document Collections" {...a11yProps(1)} />
          <Tab label="Manage Documents" {...a11yProps(2)} />
          <Tab label="Manage Users" {...a11yProps(3)} />
        </Tabs>
        {/* Tab content area */}
        <TabPanel value={activeTab} index={0}>
          <Typography variant="h4" component="h1" gutterBottom>
            Administration Overview
          </Typography>
          <div>
            <p>Here you can Manage Document Collections, Manage Documents, and Manage Users.</p>
          </div>
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <ManageCollections />
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          <ManageDocuments />
        </TabPanel>

        <TabPanel value={activeTab} index={3}>
          <ManageUsers />
        </TabPanel>
      </Box>
    </Box>
  );
};

export default AdminPanel;