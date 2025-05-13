import React, { useState } from 'react';
import { Tabs, Tab, Box, Typography } from '@mui/material';
import ManageCollections from './ManageCollections'; 

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

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
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
        <Tab label="Overview" {...a11yProps(0)} />
        <Tab label="Manage Document Collections" {...a11yProps(1)} />
        <Tab label="Application Settings" {...a11yProps(2)} />
      </Tabs>
      
      {/* Tab content area */}
      <TabPanel value={activeTab} index={0}>
        <Typography variant="h4" component="h1" gutterBottom>
          Administration Overview
        </Typography>
        <div>
          <p>Here you can Manage Document Collections and change Application Settings.</p>
        </div>
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        <ManageCollections />
      </TabPanel>
      
      <TabPanel value={activeTab} index={2}>
        <Typography variant="h4" component="h1" gutterBottom>
          Application Settings
        </Typography>
        <div>
          <p>Configure your application settings here.</p>
        </div>
      </TabPanel>
    </Box>
  );
};

export default AdminPanel;