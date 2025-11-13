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
Genji Lab is a customizable digital workspace designed to facilitate research on and teaching of The Tale of Genji. It is an interactive application that, as it develops, will enable users to access any passage from the original text alongside commentary, annotations, translations in various languages, and versions of that passage in different media: picture scrolls, picture books, decorative screens, woodblock prints, literary parodies, drama, films, anime, and manga. The aim of Genji Lab is to provide scholars, students, and readers worldwide with access to a large, robust archive on Murasaki Shikibu’s masterpiece. 
        </Typography>

        <Divider sx={{ my: 4 }} />

        {/* Acknowledgments Section */}
        <Typography variant="h5" component="h2" gutterBottom>
          Acknowledgments
        </Typography>
        
        <Typography variant="body1" color="text.secondary" paragraph>
          The development of Genji Lab was made possible by a generous gift from Patricia Washburn, in whose memory this site is dedicated. Matt Rogers, Amanda Emerson, and Tim Meehan are the engineers who designed and built this application, and I am grateful for the creativity, energy, and dedication to this project. I’m also grateful to Keith Vincent and Christopher Ellars and to my students [names to follow] for their expertise, design suggestion, and assistance in setting up the initial version of this application.
        </Typography>
      </Paper>
    </Box>
  );
};

export default AboutPage;