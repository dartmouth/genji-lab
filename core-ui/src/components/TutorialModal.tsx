import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stepper,
  Step,
  StepLabel,
  Box,
  Typography,
  Paper,
} from "@mui/material";

interface TutorialModalProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const tutorialSteps = [
  {
    title: "Welcome to Genji Lab",
    content: (
      <>
        <Typography paragraph>
          Welcome to the Genji Document Annotation Platform! This tutorial will
          guide you through the key features of the platform.
        </Typography>
        <Typography paragraph>
          This platform allows scholars to read, compare, and annotate
          translations of The Tale of Genji side by side with the original text.
        </Typography>
      </>
    ),
  },
  {
    title: "Document Collections",
    content: (
      <>
        <Typography paragraph>
          <strong>Document Collections</strong> organize related documents
          together. For example, different translations of The Tale of Genji are
          grouped into collections.
        </Typography>
        <Typography paragraph>
          You can browse collections from the homepage and see all available
          documents within each collection.
        </Typography>
        <Typography component="div">
          <ul>
            <li>View collection metadata and descriptions</li>
            <li>See all documents in a collection</li>
            <li>Navigate between related documents</li>
          </ul>
        </Typography>
      </>
    ),
  },
  {
    title: "Documents",
    content: (
      <>
        <Typography paragraph>
          <strong>Documents</strong> are individual texts within a collection.
          You can:
        </Typography>
        <Typography component="div">
          <ul>
            <li>Read documents in a clean, focused interface</li>
            <li>Compare up to 3 documents side-by-side</li>
            <li>
              Navigate through document elements (chapters, sections,
              paragraphs)
            </li>
            <li>Switch between different views and layouts</li>
          </ul>
        </Typography>
        <Typography paragraph>
          The side-by-side comparison feature is particularly useful for
          comparing different translations of the same passage.
        </Typography>
      </>
    ),
  },
  {
    title: "Annotations Overview",
    content: (
      <>
        <Typography paragraph>
          <strong>Annotations</strong> allow you to add notes, comments, and
          analysis to documents. They're a core feature for scholarly work.
        </Typography>
        <Typography paragraph>To create an annotation:</Typography>
        <Typography component="div">
          <ol>
            <li>Select text in a document</li>
            <li>Choose an annotation type from the context menu</li>
            <li>Add your content</li>
            <li>Save the annotation</li>
          </ol>
        </Typography>
        <Typography paragraph>
          Your annotations are saved to your account and can be private or
          shared with classrooms.
        </Typography>
      </>
    ),
  },
  {
    title: "Annotation Types",
    content: (
      <>
        <Typography paragraph>
          There are several types of annotations you can create:
        </Typography>
        <Typography component="div">
          <ul>
            <li>
              <strong>Comments:</strong> Basic notes and observations about the
              text
            </li>
            <li>
              <strong>Scholarly Annotations:</strong> Detailed academic analysis
              with tags and categories
            </li>
            <li>
              <strong>External References:</strong> Links to outside sources
              (articles, websites, etc.)
            </li>
            <li>
              <strong>Linking Annotations:</strong> Connect related passages
              across different documents
            </li>
          </ul>
        </Typography>
        <Typography paragraph>
          Each annotation type serves different scholarly needs and can be
          filtered and searched.
        </Typography>
      </>
    ),
  },
  {
    title: "Highlights & Navigation",
    content: (
      <>
        <Typography paragraph>
          <strong>Highlights</strong> help you visualize and navigate
          annotations:
        </Typography>
        <Typography component="div">
          <ul>
            <li>Annotated text is highlighted in different colors</li>
            <li>Click highlighted text to view its annotations</li>
            <li>Navigate between linked passages across documents</li>
            <li>Synchronized highlighting shows connections</li>
          </ul>
        </Typography>
        <Typography paragraph>
          When viewing linked annotations, the system will automatically scroll
          to and highlight the connected passages, even across different
          documents.
        </Typography>
      </>
    ),
  },
  {
    title: "Getting Started",
    content: (
      <>
        <Typography paragraph>
          You're ready to start exploring! Here are some next steps:
        </Typography>
        <Typography component="div">
          <ul>
            <li>Browse document collections from the homepage</li>
            <li>Try the side-by-side comparison feature</li>
            <li>Create your first annotation</li>
            <li>Explore existing annotations from other scholars</li>
          </ul>
        </Typography>
        <Typography paragraph>
          You can access this tutorial anytime by clicking on your initials in
          the header and selecting "View Tutorial" from the menu.
        </Typography>
        <Typography paragraph>
          <strong>Need help?</strong> Check the "About" page or contact your
          instructor.
        </Typography>
      </>
    ),
  },
];

export const TutorialModal: React.FC<TutorialModalProps> = ({
  open,
  onClose,
  onComplete,
}) => {
  const [activeStep, setActiveStep] = useState(0);

  const handleNext = () => {
    if (activeStep === tutorialSteps.length - 1) {
      onComplete();
    } else {
      setActiveStep((prevStep) => prevStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleSkip = () => {
    onComplete();
  };

  const handleReset = () => {
    setActiveStep(0);
  };

  // Reset to first step when modal closes
  React.useEffect(() => {
    if (!open) {
      handleReset();
    }
  }, [open]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          minHeight: "500px",
        },
      }}
    >
      <DialogTitle>
        <Typography variant="h5" component="span">
          Platform Tutorial
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Stepper activeStep={activeStep} sx={{ mb: 3, mt: 1 }}>
          {tutorialSteps.map((step, index) => (
            <Step key={step.title}>
              <StepLabel>{index + 1}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <Paper
          elevation={0}
          sx={{
            p: 3,
            bgcolor: "grey.50",
            minHeight: "300px",
          }}
        >
          <Typography variant="h6" gutterBottom color="primary">
            {tutorialSteps[activeStep].title}
          </Typography>
          <Box sx={{ mt: 2 }}>{tutorialSteps[activeStep].content}</Box>
        </Paper>

        <Box sx={{ mt: 2, display: "flex", justifyContent: "center", gap: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Step {activeStep + 1} of {tutorialSteps.length}
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, pt: 1 }}>
        <Button onClick={handleSkip} color="inherit">
          Skip Tutorial
        </Button>
        <Box sx={{ flex: "1 1 auto" }} />
        <Button disabled={activeStep === 0} onClick={handleBack}>
          Back
        </Button>
        <Button variant="contained" onClick={handleNext}>
          {activeStep === tutorialSteps.length - 1 ? "Finish" : "Next"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
