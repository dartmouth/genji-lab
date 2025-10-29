import React, { useState, useEffect } from 'react';
import { Tabs, Tab, Box, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuthContext';
import ManageCollections from './ManageCollections';
import ManageDocuments from './ManageDocuments';
import ManageUsers from './ManageUsers';
import ManageClassrooms from './ManageClassrooms';
import ManageFlags from './ManageFlags';
import SiteSettings from './SiteSettings';
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
  const { user } = useAuth();
  
  // Get tab from URL params
  const [searchParams] = React.useState(() => new URLSearchParams(window.location.search));

  // Check user roles
  const userRoles = user?.roles || [];

  // Define which tabs should be visible based on role
  const availableTabs = [
    { label: "Overview", component: "overview", roles: ['admin'] }, // Admin only
    { label: "Manage Document Collections", component: "collections", roles: ['admin'] }, // Admin only
    { label: "Manage Documents", component: "documents", roles: ['admin'] }, // Admin only
    { label: "Manage Users", component: "users", roles: ['admin'] }, // Admin only
    { label: "Manage Classrooms", component: "classrooms", roles: ['admin', 'instructor'] },
    { label: "Manage Flags", component: "flags", roles: ['admin'] }, // Admin only
    { label: "Site Settings", component: "settings", roles: ['admin'] } // Admin only
  ];

  // Filter tabs based on user roles
  const visibleTabs = availableTabs.filter(tab => 
    tab.roles.some(role => userRoles.includes(role))
  );

  // Helper function to get tab index by component name
  const getTabIndex = (componentName: string) => {
    return visibleTabs.findIndex(tab => tab.component === componentName);
  };

  // Set initial tab based on URL parameter
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      const tabIndex = getTabIndex(tabParam);
      if (tabIndex !== -1) {
        setActiveTab(tabIndex);
      }
    }
  }, [searchParams]);

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
          {visibleTabs.map((tab, index) => (
            <Tab key={tab.component} label={tab.label} {...a11yProps(index)} />
          ))}
        </Tabs>
        {/* Tab content area - Dynamic content based on visible tabs */}
        {visibleTabs.map((tab, index) => (
          <TabPanel key={tab.component} value={activeTab} index={index}>
            {tab.component === 'overview' && (
              <>
                <Typography variant="h4" component="h1" gutterBottom>
                  Administration Overview
                </Typography>
                
                {/* Quick Start Guide */}
                <Box sx={{ mb: 4 }}>
                  <Typography variant="h5" component="h2" gutterBottom sx={{ color: 'primary.main' }}>
                    🚀 Quick Start Guide
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                    Get started with document management in just a few steps:
                  </Typography>
                  
                  {/* Interactive Step Cards */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {/* Step 1 */}
                    <Box
                      sx={{
                        p: 3,
                        border: '2px solid',
                        borderColor: 'primary.light',
                        borderRadius: 2,
                        backgroundColor: 'primary.50',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          borderColor: 'primary.main',
                          backgroundColor: 'primary.100',
                          transform: 'translateY(-2px)',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                        }
                      }}
                      onClick={() => {
                        const tabIndex = getTabIndex('collections');
                        if (tabIndex !== -1) setActiveTab(tabIndex);
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box
                          sx={{
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            backgroundColor: 'primary.main',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.25rem',
                            fontWeight: 'bold'
                          }}
                        >
                          1
                        </Box>
                        <Box>
                          <Typography variant="h6" component="h3" sx={{ mb: 0.5 }}>
                            📁 Create Document Collection
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Start by creating a new document collection to organize your documents
                          </Typography>
                        </Box>
                        <Box sx={{ ml: 'auto' }}>
                          <Typography variant="body2" sx={{ color: 'primary.main', fontWeight: 'medium' }}>
                            Click to go →
                          </Typography>
                        </Box>
                      </Box>
                    </Box>

                    {/* Step 2 */}
                    <Box
                      sx={{
                        p: 3,
                        border: '2px solid',
                        borderColor: 'success.light',
                        borderRadius: 2,
                        backgroundColor: 'success.50',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          borderColor: 'success.main',
                          backgroundColor: 'success.100',
                          transform: 'translateY(-2px)',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                        }
                      }}
                      onClick={() => {
                        const tabIndex = getTabIndex('documents');
                        if (tabIndex !== -1) setActiveTab(tabIndex);
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box
                          sx={{
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            backgroundColor: 'success.main',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.25rem',
                            fontWeight: 'bold'
                          }}
                        >
                          2
                        </Box>
                        <Box>
                          <Typography variant="h6" component="h3" sx={{ mb: 0.5 }}>
                            📄 Import Word Document
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Upload your .docx files to create documents with content automatically
                          </Typography>
                        </Box>
                        <Box sx={{ ml: 'auto' }}>
                          <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 'medium' }}>
                            Click to go →
                          </Typography>
                        </Box>
                      </Box>
                    </Box>

                    {/* Step 3 */}
                    <Box
                      sx={{
                        p: 3,
                        border: '2px solid',
                        borderColor: 'info.light',
                        borderRadius: 2,
                        backgroundColor: 'info.50',
                        cursor: 'default'
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box
                          sx={{
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            backgroundColor: 'info.main',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.25rem',
                            fontWeight: 'bold'
                          }}
                        >
                          3
                        </Box>
                        <Box>
                          <Typography variant="h6" component="h3" sx={{ mb: 0.5 }}>
                            🎉 Start Annotating!
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Your documents are ready for users to view and annotate
                          </Typography>
                        </Box>
                        <Box sx={{ ml: 'auto' }}>
                          <Typography variant="body2" sx={{ color: 'info.main', fontWeight: 'medium' }}>
                            You're done! ✨
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                </Box>

                {/* Admin Tools Grid */}
                <Box sx={{ mb: 4 }}>
                  <Typography variant="h5" component="h2" gutterBottom sx={{ color: 'primary.main' }}>
                    🛠️ Admin Tools
                  </Typography>
                  <Box sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(3, 1fr)', 
                    gap: 2,
                    mt: 2 
                  }}>
                    {[
                      { 
                        title: 'Document Collections', 
                        description: 'Create and manage collections',
                        icon: '📚',
                        component: 'collections',
                        color: 'primary'
                      },
                      { 
                        title: 'Documents', 
                        description: 'Import, delete, and organize',
                        icon: '📄',
                        component: 'documents',
                        color: 'success'
                      },
                      { 
                        title: 'Users', 
                        description: 'Manage user accounts',
                        icon: '👥',
                        component: 'users',
                        color: 'warning'
                      },
                      { 
                        title: 'Classrooms', 
                        description: 'Manage classrooms and students',
                        icon: '🏫',
                        component: 'classrooms',
                        color: 'secondary'
                      },
                      { 
                        title: 'Flags', 
                        description: 'Review and moderate flagged content',
                        icon: '🚩',
                        component: 'flags',
                        color: 'error'
                      },
                      { 
                        title: 'Site Settings', 
                        description: 'Configure system settings',
                        icon: '⚙️',
                        component: 'settings',
                        color: 'info'
                      }
                    ]
                    .filter(tool => {
                      // Only show tools for tabs that are visible to this user
                      const tabIndex = getTabIndex(tool.component);
                      return tabIndex !== -1;
                    })
                    .map((tool, index) => (
                      <Box
                        key={index}
                        sx={{
                          p: 2,
                          border: '1px solid',
                          borderColor: 'grey.300',
                          borderRadius: 2,
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            borderColor: `${tool.color}.main`,
                            backgroundColor: `${tool.color}.50`,
                            transform: 'translateY(-2px)',
                            boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                          }
                        }}
                        onClick={() => {
                          const tabIndex = getTabIndex(tool.component);
                          if (tabIndex !== -1) setActiveTab(tabIndex);
                        }}
                      >
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h4" component="div" sx={{ mb: 1 }}>
                            {tool.icon}
                          </Typography>
                          <Typography variant="h6" component="h3" sx={{ mb: 0.5 }}>
                            {tool.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {tool.description}
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </Box>
              </>
            )}
            {tab.component === 'collections' && <ManageCollections />}
            {tab.component === 'documents' && <ManageDocuments />}
            {tab.component === 'users' && <ManageUsers />}
            {tab.component === 'classrooms' && <ManageClassrooms />}
            {tab.component === 'flags' && <ManageFlags />}
            {tab.component === 'settings' && <SiteSettings />}
          </TabPanel>
        ))}
      </Box>
    </Box>
  );
};

export default AdminPanel;