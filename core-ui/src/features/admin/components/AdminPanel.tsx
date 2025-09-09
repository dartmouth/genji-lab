import React, { useState } from 'react';
import { Tabs, Tab, Box, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ManageCollections from './ManageCollections';
import ManageDocuments from './ManageDocuments';
import ManageUsers from './ManageUsers';
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
          <Tab label="Site Settings" {...a11yProps(4)} />
        </Tabs>
        {/* Tab content area */}
        <TabPanel value={activeTab} index={0}>
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
                onClick={() => setActiveTab(1)}
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
                onClick={() => setActiveTab(2)}
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
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
              gap: 2,
              mt: 2 
            }}>
              {[
                { 
                  title: 'Document Collections', 
                  description: 'Create and manage collections',
                  icon: '📚',
                  tabIndex: 1,
                  color: 'primary'
                },
                { 
                  title: 'Documents', 
                  description: 'Import, delete, and organize',
                  icon: '📄',
                  tabIndex: 2,
                  color: 'success'
                },
                { 
                  title: 'Users', 
                  description: 'Manage user accounts',
                  icon: '👥',
                  tabIndex: 3,
                  color: 'warning'
                },
                { 
                  title: 'Site Settings', 
                  description: 'Configure system settings',
                  icon: '⚙️',
                  tabIndex: 4,
                  color: 'info'
                }
              ].map((tool, index) => (
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
                  onClick={() => setActiveTab(tool.tabIndex)}
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

          {/* Tips Section */}
          <Box
            sx={{
              p: 3,
              backgroundColor: 'grey.50',
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'grey.200'
            }}
          >
            <Typography variant="h6" component="h3" gutterBottom sx={{ color: 'warning.main' }}>
              💡 Pro Tips
            </Typography>
            <Box component="ul" sx={{ pl: 2, m: 0 }}>
              <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                <strong>Batch operations:</strong> Select multiple documents for bulk delete operations
              </Typography>
              <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                <strong>Document titles:</strong> Use descriptive names when importing Word documents
              </Typography>
              <Typography component="li" variant="body2">
                <strong>Collections:</strong> Organize documents by topic, course, or project for easier management
              </Typography>
            </Box>
          </Box>
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

        <TabPanel value={activeTab} index={4}>
          <SiteSettings />
        </TabPanel>
      </Box>
    </Box>
  );
};

export default AdminPanel;