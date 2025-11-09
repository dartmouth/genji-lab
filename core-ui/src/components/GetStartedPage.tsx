import React, { useState } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  CheckCircle,
  Help,
  Login,
  Description,
  Create
} from '@mui/icons-material';

// TabPanel component
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`docs-tabpanel-${index}`}
      aria-labelledby={`docs-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `docs-tab-${index}`,
    'aria-controls': `docs-tabpanel-${index}`,
  };
}

const GetStartedPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<number>(0);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <Box sx={{ p: 4, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Documentation
      </Typography>

      <Paper elevation={2} sx={{ mt: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            aria-label="documentation tabs"
            sx={{
              '& .MuiTab-root': {
                minHeight: 64,
                fontSize: '1rem'
              }
            }}
          >
            <Tab 
              label="Overview" 
              icon={<Description />} 
              iconPosition="start"
              {...a11yProps(0)} 
            />
            <Tab 
              label="Quick Start Guide" 
              icon={<CheckCircle />} 
              iconPosition="start"
              {...a11yProps(1)} 
            />
          </Tabs>
        </Box>

        {/* Overview Tab */}
        <TabPanel value={activeTab} index={0}>
          <Typography variant="h5" component="h2" gutterBottom>
            Welcome to Genji
          </Typography>
          
          <Typography variant="body1" color="text.secondary" paragraph>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod 
            tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, 
            quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
          </Typography>

          <Typography variant="body1" color="text.secondary" paragraph>
            Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore 
            eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt 
            in culpa qui officia deserunt mollit anim id est laborum.
          </Typography>

          <Typography variant="body1" color="text.secondary">
            Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium 
            doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore 
            veritatis et quasi architecto beatae vitae dicta sunt explicabo.
          </Typography>
        </TabPanel>

        {/* Quick Start Guide Tab */}
        <TabPanel value={activeTab} index={1}>
          <Typography variant="h4" component="h2" gutterBottom>
            Quick Start Guide
          </Typography>
          
          <Typography variant="body1" color="text.secondary" paragraph>
            This guide provides the fastest path to your first success with Genji. 
            Follow the minimal steps to get started immediately.
          </Typography>

          <Divider sx={{ my: 3 }} />

          {/* Step 1: Log In */}
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Login sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h5" component="h3">
                Step 1: Log In
              </Typography>
            </Box>

            <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Option A: Institutional Login (Dartmouth SSO)
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText primary="1. Go to your Genji URL" />
                </ListItem>
                <ListItem>
                  <ListItemText primary='2. Click "Login with Dartmouth SSO" in the upper right corner' />
                </ListItem>
                <ListItem>
                  <ListItemText primary="3. A general user account will be created for you automatically" />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <CheckCircle sx={{ color: 'success.main', mr: 1, fontSize: 20 }} />
                        <span>4. You're in!</span>
                      </Box>
                    } 
                  />
                </ListItem>
              </List>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Option B: Local Account
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText primary="1. Go to your Genji URL" />
                </ListItem>
                <ListItem>
                  <ListItemText primary='2. Click "Register"' />
                </ListItem>
                <ListItem>
                  <ListItemText primary="3. Fill in: first name, last name, email, username, password, confirm password" />
                </ListItem>
                <ListItem>
                  <ListItemText primary='4. Click "Create Account"' />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <CheckCircle sx={{ color: 'success.main', mr: 1, fontSize: 20 }} />
                        <span>5. Account created!</span>
                      </Box>
                    } 
                  />
                </ListItem>
              </List>
            </Paper>
          </Box>

          {/* Step 2: Open Your First Document */}
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Description sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h5" component="h3">
                Step 2: Open Your First Document
              </Typography>
            </Box>

            <List dense>
              <ListItem>
                <ListItemText primary="1. You'll see document collections" />
              </ListItem>
              <ListItem>
                <ListItemText primary="2. Click on a collection" />
              </ListItem>
              <ListItem>
                <ListItemText primary="3. Click on any document title" />
              </ListItem>
              <ListItem>
                <ListItemText 
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <CheckCircle sx={{ color: 'success.main', mr: 1, fontSize: 20 }} />
                      <span>4. Document opens!</span>
                    </Box>
                  } 
                />
              </ListItem>
            </List>
          </Box>

          {/* Step 3: Create Your First Annotation */}
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Create sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h5" component="h3">
                Step 3: Create Your First Annotation
              </Typography>
            </Box>

            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              1. Select text you want to comment on:
            </Typography>
            <List dense sx={{ ml: 2, mb: 2 }}>
              <ListItem>
                <ListItemText primary="Click and drag your mouse over the text" />
              </ListItem>
              <ListItem>
                <ListItemText primary="The text will highlight" />
              </ListItem>
            </List>

            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              2. Choose annotation type:
            </Typography>
            <List dense sx={{ ml: 2, mb: 2 }}>
              <ListItem>
                <ListItemText primary="Right-click and choose Create Comment or Create Scholarly Annotation (if permitted)" />
              </ListItem>
            </List>

            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              3. Write your comment or annotation:
            </Typography>
            <List dense sx={{ ml: 2, mb: 2 }}>
              <ListItem>
                <ListItemText primary="Type your observation, question, or analysis" />
              </ListItem>
              <ListItem>
                <ListItemText primary="Keep it focused and specific" />
              </ListItem>
            </List>

            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              4. Submit:
            </Typography>
            <List dense sx={{ ml: 2, mb: 2 }}>
              <ListItem>
                <ListItemText primary='Click "Save"' />
              </ListItem>
              <ListItem>
                <ListItemText 
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <CheckCircle sx={{ color: 'success.main', mr: 1, fontSize: 20 }} />
                      <span>Your first annotation is live!</span>
                    </Box>
                  } 
                />
              </ListItem>
            </List>

            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'info.50', borderColor: 'info.main' }}>
              <Typography variant="body2" fontWeight={600} gutterBottom>
                See your annotation:
              </Typography>
              <Typography variant="body2">
                The text you selected will now be highlighted indicating the annotation. 
                Click Show Annotations at the bottom of the screen then hover the cursor 
                over the highlighted annotation to view it.
              </Typography>
            </Paper>
          </Box>

          {/* Success Section */}
          <Paper 
            elevation={0} 
            sx={{ 
              p: 3, 
              bgcolor: 'success.50', 
              border: '2px solid',
              borderColor: 'success.main',
              mb: 4 
            }}
          >
            <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              🎉 Success! What's Next?
            </Typography>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              Common next tasks:
            </Typography>
            <List dense>
              <ListItem>
                <ListItemText primary="View your annotation then click the ⚙️ Settings icon to edit, delete, tag, or add a link" />
              </ListItem>
              <ListItem>
                <ListItemText primary="💬 Reply to an annotation, 👍 upvote it, or 🚩 flag it for review" />
              </ListItem>
              <ListItem>
                <ListItemText primary="Search for specific content using the search bar in the header" />
              </ListItem>
            </List>
          </Paper>

          <Divider sx={{ my: 3 }} />

          {/* Troubleshooting Section */}
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Help sx={{ mr: 1, color: 'warning.main' }} />
              <Typography variant="h5" component="h3">
                🆘 Troubleshooting
              </Typography>
            </Box>

            <Typography variant="h6" gutterBottom>
              Common Issues
            </Typography>

            <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Problem: Can't log in
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText primary="✓ Check username/password are correct" />
                </ListItem>
                <ListItem>
                  <ListItemText primary='✓ Try "Forgot Password" if using local auth' />
                </ListItem>
                <ListItem>
                  <ListItemText primary="✓ Verify account exists and is active" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="✓ Try different browser or incognito mode" />
                </ListItem>
              </List>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Problem: Document won't load
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText primary="✓ Refresh the page" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="✓ Check internet connection" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="✓ Try different browser" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="✓ Contact instructor or admin" />
                </ListItem>
              </List>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Problem: Annotation not saving
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText primary="✓ Check internet connection" />
                </ListItem>
                <ListItem>
                  <ListItemText primary='✓ Make sure you clicked "Save"' />
                </ListItem>
                <ListItem>
                  <ListItemText primary="✓ Try logging out and back in" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="✓ Try different browser" />
                </ListItem>
              </List>
            </Paper>
          </Box>
        </TabPanel>
      </Paper>
    </Box>
  );
};

export default GetStartedPage;