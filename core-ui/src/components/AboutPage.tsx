import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Divider
} from '@mui/material';

const AboutPage: React.FC = () => {
  return (
    <Box sx={{ p: 4, maxWidth: 900, mx: 'auto' }}>
      {/* <Typography variant="h4" component="h1" gutterBottom>
        About
      </Typography> */}

      <Paper elevation={2} sx={{ mt: 3, p: 4 }}>
        {/* About the Project Section */}
        <Typography variant="h5" component="h2" gutterBottom>
          About the Project
        </Typography>
        
        <Typography variant="body1" color="text.secondary" paragraph>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod 
          tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, 
          quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. 
          Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore 
          eu fugiat nulla pariatur.
        </Typography>

        <Typography variant="body1" color="text.secondary" paragraph>
          Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia 
          deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus 
          error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, 
          eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae 
          dicta sunt explicabo.
        </Typography>

        <Divider sx={{ my: 4 }} />

        {/* Acknowledgments Section */}
        <Typography variant="h5" component="h2" gutterBottom>
          Acknowledgments
        </Typography>
        
        <Typography variant="body1" color="text.secondary" paragraph>
          Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, 
          sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. 
          Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, 
          adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et 
          dolore magnam aliquam quaerat voluptatem.
        </Typography>

        <Typography variant="body1" color="text.secondary">
          Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit 
          laboriosam, nisi ut aliquid ex ea commodi consequatur. Quis autem vel eum iure 
          reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, 
          vel illum qui dolorem eum fugiat quo voluptas nulla pariatur.
        </Typography>
      </Paper>
    </Box>
  );
};

export default AboutPage;