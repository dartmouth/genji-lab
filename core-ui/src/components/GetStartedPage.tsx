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
  Link,
} from '@mui/material';
import {
  CheckCircle,
  Login,
  Description,
  Checklist,
  Create,
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
            <Tab 
              label="Common Tasks" 
              icon={<Checklist />} 
              iconPosition="start"
              {...a11yProps(2)} 
            />
          </Tabs>
        </Box>

        {/* Overview Tab */}
        <TabPanel value={activeTab} index={0}>

          <Typography variant="h4" component="h2" gutterBottom sx={{ mt: 4 }}>
            What is Genji Lab?
          </Typography>

          <Typography variant="body1">
            Genji Lab is a free, open-source platform that enables scholarly analysis and teaching of texts. It brings together tools that have traditionally been scattered across multiple expensive platforms: rich scholarly annotations, community discussion, multimedia references, and the ability to trace conceptual connections across an entire corpus of texts. Whether you're a researcher tracking themes across multiple translations, an instructor leading a classroom through a complex historical text, or a student encountering challenging material for the first time, Genji Lab provides the context and tools to deepen your understanding.
          </Typography>

          <Typography variant="body1">
            Originally developed for <em>The Tale of Genji</em> through the support of Professor Dennis Washburn, Genji Lab is designed to work with any texts—literary, historical, or scholarly primary sources.
          </Typography>

          <Typography variant="h4" component="h2" gutterBottom sx={{ mt: 4 }}>
            Who is Genji Lab for?
          </Typography>

          <Typography variant="body1">
            <strong>Researchers and scholars</strong> use Genji Lab to advance their work by discovering patterns, tracking conceptual links across documents, searching through multiple translations simultaneously, and building a centralized repository of scholarly knowledge.
          </Typography>

          <Typography variant="body1">
            <strong>Instructors</strong> use Genji Lab to create dedicated classroom spaces where students can engage with texts, participate in focused discussions, and benefit from expert context—all without discussions spilling into the public space.
          </Typography>

          <Typography variant="body1">
            <strong>Students and new readers</strong> use Genji Lab to make complex texts accessible. Rich annotations, multimedia context, and curated thematic links help bridge the gap between expert knowledge and first-time readers.
          </Typography>

          <Typography variant="h4" component="h2" gutterBottom sx={{ mt: 4 }}>
            Core Features
          </Typography>

          <Typography variant="h5" component="h3" gutterBottom sx={{ mt: 3 }}>
            Storing and Organizing Texts
          </Typography>

          <Typography variant="body1">
            Import texts from Word documents and organize them into <strong>Document Collections</strong>—thematically linked groups of documents such as different translations of the same work, multiple chapters, or related source materials. Your collections become a centralized scholarly resource.
          </Typography>

          <Typography variant="h5" component="h3" gutterBottom sx={{ mt: 3 }}>
            Exploring Texts
          </Typography>

          <Typography variant="body1">
            Search across all collections with full-text search, or browse through your organized documents. Genji Lab helps you find what you need, whether you're looking for a specific passage or exploring broadly.
          </Typography>

          <Typography variant="h5" component="h3" gutterBottom sx={{ mt: 3 }}>
            Annotating Texts
          </Typography>

          <Typography variant="body1">
            <strong>Scholarly Annotations</strong> are created by Verified Scholars—authoritative notes that provide context and expert knowledge typically available only to specialists in the field.
          </Typography>

          <Typography variant="body1">
            <strong>Comments</strong> are community-driven discussions where users engage in threaded conversations about the text. In classroom contexts, these discussions remain private to the class.
          </Typography>

          <Typography variant="h5" component="h3" gutterBottom sx={{ mt: 3 }}>
            Linking Texts and Resources
          </Typography>

          <Typography variant="body1">
            <strong>External References</strong> embed multimedia context directly into your reading experience—images of places or people mentioned in the text, derivative works, audio, video, or scholarly sources that illuminate the material.
          </Typography>

          <Typography variant="body1">
            <strong>Internal (Conceptual) Links</strong> are one of Genji Lab's most powerful features. These links aggregate conceptually similar passages from across your entire corpus: all references to an important event, a collection of poetry scattered through multiple texts, every mention of a specific character, or the same across different translations. Experienced scholars can aggregate research into a central location, while new readers can follow curated thematic pathways created by experts.
          </Typography>

          <Typography variant="h5" component="h3" gutterBottom sx={{ mt: 3 }}>
            Teaching with Classrooms
          </Typography>

          <Typography variant="body1">
            Instructors can create dedicated classroom spaces with invitation links. Classroom discussions remain private, visible only to class members, creating a focused learning environment while still providing access to all the scholarly context and features of the platform.
          </Typography>
        </TabPanel>

        {/* Quick Start Guide Tab */}
        <TabPanel value={activeTab} index={1}>
          <Typography variant="h4" component="h2" gutterBottom>
            Quick Start Guide
          </Typography>
          
          <Typography variant="body1" color="text.secondary">
            This guide provides the fastest path to get started with the features of Genji-Lab. 
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

              <List dense>
                <ListItem>
                  <ListItemText primary='1. Click "Register" if you do not already have an account. Alternatively, you may log in with other available methods if your site administrator has configured them.' />
                </ListItem>
                <ListItem>
                  <ListItemText primary="2. Fill in: first name, last name, email, username, password, confirm password. Store your password safely." />
                </ListItem>
                <ListItem>
                  <ListItemText primary='3. Click "Create Account"' />
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
                <ListItemText primary="1. From the home page, click on 'Go to Collections'" />
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
        </TabPanel>
        <TabPanel value={activeTab} index={2}>

      {/* Table of Contents */}
      <Box sx={{ mb: 4, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
        <Typography variant="h6" gutterBottom>
          Table of Contents
        </Typography>
        <Box component="ul" sx={{ pl: 2 }}>
          <Typography component="li" variant="body2">
            <Link href="#for-all-users" underline="hover">For All Users</Link>
            <Box component="ul" sx={{ pl: 2 }}>
              <Typography component="li" variant="body2">
                <Link href="#reading-and-exploring" underline="hover">Reading and Exploring Texts</Link>
              </Typography>
              <Typography component="li" variant="body2">
                <Link href="#participating-in-discussions" underline="hover">Participating in Discussions</Link>
              </Typography>
            </Box>
          </Typography>
          <Typography component="li" variant="body2">
            <Link href="#for-verified-scholars" underline="hover">For Verified Scholars</Link>
            <Box component="ul" sx={{ pl: 2 }}>
              <Typography component="li" variant="body2">
                <Link href="#creating-annotations" underline="hover">Creating Scholarly Annotations</Link>
              </Typography>
              <Typography component="li" variant="body2">
                <Link href="#creating-links" underline="hover">Creating Conceptual Links</Link>
              </Typography>
            </Box>
          </Typography>
          <Typography component="li" variant="body2">
            <Link href="#first-visit" underline="hover">Your First Visit</Link>
          </Typography>
        </Box>
      </Box>

      <Typography variant="h4" component="h2" gutterBottom sx={{ mt: 4 }} id="for-all-users">
        For All Users
      </Typography>

      <Typography variant="h5" component="h3" gutterBottom sx={{ mt: 3 }} id="reading-and-exploring">
        Reading and Exploring Texts
      </Typography>

      <Typography variant="h6" component="h4" gutterBottom sx={{ mt: 2 }}>
        Accessing Documents
      </Typography>

      <Box component="ol" sx={{ pl: 2 }}>
        <Typography component="li" variant="body1">
          From the main page, click <strong>'Go to Collections'</strong>
        </Typography>
        <Typography component="li" variant="body1">
          Click on a collection card to open it
        </Typography>
        <Typography component="li" variant="body1">
          Click on a document inside the collection to begin reading
        </Typography>
      </Box>

      <Typography variant="h6" component="h4" gutterBottom sx={{ mt: 2 }}>
        Reading Documents Side by Side
      </Typography>

      <Box component="ol" sx={{ pl: 2 }}>
        <Typography component="li" variant="body1">
          Open a document
        </Typography>
        <Typography component="li" variant="body1">
          Open the <strong>'Document Comparison'</strong> dropdown
        </Typography>
        <Typography component="li" variant="body1">
          Select a second document to display both side by side
        </Typography>
      </Box>

      <Typography variant="h6" component="h4" gutterBottom sx={{ mt: 2 }}>
        Searching for Content
      </Typography>

      <Box component="ul" sx={{ pl: 2 }}>
        <Typography component="li" variant="body1">
          <strong>Basic Search:</strong> Enter text in the search bar. You can use AND and OR operators to refine your search
        </Typography>
        <Typography component="li" variant="body1">
          <strong>Advanced Search:</strong> Click the <strong>'Advanced'</strong> button next to the search bar to access additional search options
        </Typography>
      </Box>

      <Typography variant="h6" component="h4" gutterBottom sx={{ mt: 2 }}>
        Viewing Links and References
      </Typography>

      <Box component="ul" sx={{ pl: 2 }}>
        <Typography component="li" variant="body1">
          <strong>To see Conceptual Links:</strong> Toggle on <strong>'Show Highlights'</strong> to make linked passages visible in the text
        </Typography>
        <Typography component="li" variant="body1">
          <strong>To open a Conceptual Link:</strong> Right-click on a highlighted passage, select <strong>'View Linked Text'</strong>, and choose the desired link from the options. This will open a new view with the passage you clicked on pinned on the left side, and all other linked text displayed in a scrollable list of cards on the right side
        </Typography>
        <Typography component="li" variant="body1">
          <strong>To view External References:</strong> Click on any link icon embedded in the text
        </Typography>
      </Box>

      <Typography variant="h5" component="h3" gutterBottom sx={{ mt: 3 }} id="participating-in-discussions">
        Participating in Discussions
      </Typography>

      <Typography variant="body1">
        <strong>Note:</strong> You must create an account and sign in to create comments. Unauthenticated users can read texts, search, and view existing conversations.
      </Typography>

      <Typography variant="h6" component="h4" gutterBottom sx={{ mt: 2 }}>
        Creating a Comment
      </Typography>

      <Box component="ol" sx={{ pl: 2 }}>
        <Typography component="li" variant="body1">
          Highlight the text you want to comment on
        </Typography>
        <Typography component="li" variant="body1">
          Right-click on the highlighted text
        </Typography>
        <Typography component="li" variant="body1">
          Select <strong>'Create Comment'</strong>
        </Typography>
        <Typography component="li" variant="body1">
          Follow the steps in the pop-up to write and post your comment
        </Typography>
      </Box>

      <Typography variant="h6" component="h4" gutterBottom sx={{ mt: 2 }}>
        Replying to a Comment
      </Typography>

      <Box component="ol" sx={{ pl: 2 }}>
        <Typography component="li" variant="body1">
          Find the comment you want to reply to
        </Typography>
        <Typography component="li" variant="body1">
          Click the <strong>'Reply'</strong> button on the comment card
        </Typography>
        <Typography component="li" variant="body1">
          Write your reply in the thread
        </Typography>
      </Box>

      <Typography variant="h6" component="h4" gutterBottom sx={{ mt: 2 }}>
        Reacting to Comments
      </Typography>

      <Typography variant="body1">
        Each comment card has buttons that allow you to:
      </Typography>

      <Box component="ul" sx={{ pl: 2 }}>
        <Typography component="li" variant="body1">
          <strong>Upvote</strong> the comment
        </Typography>
        <Typography component="li" variant="body1">
          <strong>Flag</strong> the comment for administrative review
        </Typography>
      </Box>

      <Typography variant="h4" component="h2" gutterBottom sx={{ mt: 4 }} id="for-verified-scholars">
        For Verified Scholars
      </Typography>

      <Typography variant="h5" component="h3" gutterBottom sx={{ mt: 3 }} id="creating-annotations">
        Creating Scholarly Annotations
      </Typography>

      <Box component="ol" sx={{ pl: 2 }}>
        <Typography component="li" variant="body1">
          Highlight the text you want to annotate
        </Typography>
        <Typography component="li" variant="body1">
          Right-click on the highlighted text
        </Typography>
        <Typography component="li" variant="body1">
          Select <strong>'Create Scholarly Annotation'</strong>
        </Typography>
        <Typography component="li" variant="body1">
          Follow the steps in the pop-up to write your annotation and save
        </Typography>
      </Box>

      <Typography variant="h5" component="h3" gutterBottom sx={{ mt: 3 }} id="creating-links">
        Creating Conceptual Links Between Documents
      </Typography>

      <Typography variant="h6" component="h4" gutterBottom sx={{ mt: 2 }}>
        Starting a New Link
      </Typography>

      <Box component="ol" sx={{ pl: 2 }}>
        <Typography component="li" variant="body1">
          From the main page, click <strong>'Go to Collections'</strong>
        </Typography>
        <Typography component="li" variant="body1">
          Click on a collection card, then click on a document to open it
        </Typography>
        <Typography component="li" variant="body1">
          Open the <strong>'Document Comparison'</strong> dropdown
        </Typography>
        <Typography component="li" variant="body1">
          Select a second document - it will open beside the first document
        </Typography>
        <Typography component="li" variant="body1">
          Inside the <strong>'Document Comparison'</strong> dropdown, click <strong>'Link Documents'</strong>
        </Typography>
        <Typography component="li" variant="body1">
          Follow the on-screen prompts:
          <Box component="ul" sx={{ pl: 2, mt: 1 }}>
            <Typography component="li" variant="body1">
              Select text from the first document
            </Typography>
            <Typography component="li" variant="body1">
              Select text from the second document
            </Typography>
            <Typography component="li" variant="body1">
              Provide information about the link (e.g., a title)
            </Typography>
            <Typography component="li" variant="body1">
              Save the link
            </Typography>
          </Box>
        </Typography>
      </Box>

      <Typography variant="body1">
        The linked passages will appear as highlights when the <strong>'Show Highlights'</strong> toggle is active.
      </Typography>

      <Typography variant="h6" component="h4" gutterBottom sx={{ mt: 2 }}>
        Adding Text to an Existing Link
      </Typography>

      <Box component="ol" sx={{ pl: 2 }}>
        <Typography component="li" variant="body1">
          Make sure <strong>'Show Highlights'</strong> is toggled on
        </Typography>
        <Typography component="li" variant="body1">
          Highlight the text you want to add to an existing link
        </Typography>
        <Typography component="li" variant="body1">
          Right-click on the highlighted text
        </Typography>
        <Typography component="li" variant="body1">
          Select <strong>'Add Content to Link'</strong>
        </Typography>
        <Typography component="li" variant="body1">
          Follow the steps in the pop-up to complete the addition
        </Typography>
      </Box>

      <Typography variant="h4" component="h2" gutterBottom sx={{ mt: 4 }} id="first-visit">
        Your First Visit
      </Typography>

      <Typography variant="body1">
        If this is your first time using Genji Lab, we recommend:
      </Typography>

      <Box component="ol" sx={{ pl: 2 }}>
        <Typography component="li" variant="body1">
          From the home page, click <strong>'About this Project'</strong> to read the documentation
        </Typography>
        <Typography component="li" variant="body1">
          Browse the collections to get a sense of the available texts
        </Typography>
        <Typography component="li" variant="body1">
          Try opening a document and toggling <strong>'Show Highlights'</strong> to see existing Conceptual Links
        </Typography>
        <Typography component="li" variant="body1">
          Use the search function to explore content across collections
        </Typography>
        <Typography component="li" variant="body1">
          Create an account if you'd like to participate in discussions
        </Typography>
      </Box>
        </TabPanel>
      </Paper>
    </Box>
  );
};

export default GetStartedPage;