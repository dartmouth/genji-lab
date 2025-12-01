// src/components/DocumentElementViewer.tsx

import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Chip,
  Stack,
  Divider,
  Alert,
} from '@mui/material';
import {
  Description as DescriptionIcon,
  CalendarToday as CalendarIcon,
  Tag as TagIcon,
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchSingleDocumentElement,
  selectElementById,
  selectElementStatusById,
  selectElementErrorById,
} from '@/store/slice/documentElementsSlice';
import type { DocumentElementWithMetadata } from '@/types';

const DocumentElementViewer: React.FC = () => {
  const [searchParams] = useSearchParams();
  const elementIdParam = searchParams.get('element_id');
  const elementId = elementIdParam ? parseInt(elementIdParam, 10) : null;

  const dispatch = useAppDispatch();

  // Selectors using the typed hooks [2]
  const element = useAppSelector((state) => 
    selectElementById(state, elementId)
  );
  const status = useAppSelector((state) => 
    selectElementStatusById(state, elementId)
  );
  const error = useAppSelector((state) => 
    selectElementErrorById(state, elementId)
  );

  const [copySuccess, setCopySuccess] = React.useState(false);

  const handleCopyUrl = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url)
      .then(() => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      })
      .catch((err) => {
        console.error('Failed to copy URL:', err);
      });
  };
  useEffect(() => {
    if (!elementId) return;

    // Check if element already exists in Redux store [1]
    if (!element && status === 'idle') {
      // Fetch from API if not in store
      dispatch(fetchSingleDocumentElement(elementId));
    }
  }, [elementId, element, status, dispatch]);

  // Loading state
  if (status === 'loading') {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <CircularProgress />
      </Box>
    );
  }

  // Error state
  if (status === 'failed' || error) {
    return (
      <Box p={3}>
        <Alert severity="error">
          Failed to load document element: {error || 'Unknown error'}
        </Alert>
      </Box>
    );
  }

  // No element ID provided
  if (!elementId) {
    return (
      <Box p={3}>
        <Alert severity="warning">
          No element_id provided in URL parameters
        </Alert>
      </Box>
    );
  }

  // Element not found
  if (!element && status === 'succeeded') {
    return (
      <Box p={3}>
        <Alert severity="info">
          Element with ID {elementId} not found
        </Alert>
      </Box>
    );
  }

  // Element not loaded yet
  if (!element) {
    return null;
  }

  return (
    <Box p={3}>
      <Card elevation={3}>
        {/* Document Metadata Section */}
        <Box
          sx={{
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            p: 2,
          }}
        >
          <Typography variant="h5" gutterBottom>
            {element.document.title}
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            {element.document.description}
          </Typography>
        </Box>

        <CardContent>
          {/* Metadata Chips */}
          <Stack
            direction="row"
            spacing={1}
            flexWrap="wrap"
            gap={1}
            mb={3}
          >
            <Chip
              icon={<TagIcon />}
              label={`Element #${element.hierarchy.element_order}`}
              size="small"
              variant="outlined"
            />
            <Chip
              icon={<DescriptionIcon />}
              label={`Document ID: ${element.document.id}`}
              size="small"
              variant="outlined"
            />
            <Chip
              icon={<CalendarIcon />}
              label={`Created: ${new Date(element.created).toLocaleDateString()}`}
              size="small"
              variant="outlined"
            />
            {element.created !== element.modified && (
              <Chip
                icon={<CalendarIcon />}
                label={`Modified: ${new Date(element.modified).toLocaleDateString()}`}
                size="small"
                variant="outlined"
                color="secondary"
              />
            )}
            <Chip
              label={copySuccess ? "Copied!" : "Copy URL"}
              size="small"
              variant="filled"
              color={copySuccess ? "success" : "primary"}
              onClick={handleCopyUrl}
              sx={{ cursor: 'pointer' }}
            />
          </Stack>

          <Divider sx={{ mb: 3 }} />

          {/* Content Section - Emphasized */}
          <Box
            sx={{
              p: 3,
              bgcolor: 'grey.50',
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'grey.300',
            }}
          >
            <Typography
              variant="h6"
              color="text.secondary"
              gutterBottom
              sx={{ fontSize: '0.875rem', fontWeight: 600 }}
            >
              CONTENT
            </Typography>
            <FormattedText element={element} />
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

// Helper component to render formatted text respecting the API formatting [3]
const FormattedText: React.FC<{ element: DocumentElementWithMetadata }> = ({
  element,
}) => {
  const { text, formatting } = element.content;
  const textStyles = formatting.text_styles;

  // Apply base formatting from the API
  const baseStyle: React.CSSProperties = {
    textAlign: formatting.alignment || 'left',
    paddingLeft: formatting.left_indent ? `${formatting.left_indent}px` : undefined,
    paddingRight: formatting.right_indent ? `${formatting.right_indent}px` : undefined,
    textIndent: formatting.first_line_indent
      ? `${formatting.first_line_indent}px`
      : undefined,
    fontWeight: textStyles?.is_bold ? 'bold' : 'normal',
    fontStyle: textStyles?.is_italic ? 'italic' : 'normal',
    textDecoration: textStyles?.is_underlined ? 'underline' : 'none',
  };

  // If there are detailed text styles with ranges, apply them
  if (textStyles?.formatting && textStyles.formatting.length > 0) {
    // This is a simplified version - you might want more sophisticated rendering
    // for overlapping styles in production
    return (
      <Typography
        variant="body1"
        component="div"
        sx={{
          ...baseStyle,
          lineHeight: 1.8,
          whiteSpace: 'pre-wrap',
        }}
      >
        {text}
      </Typography>
    );
  }

  return (
    <Typography
      variant="body1"
      sx={{
        ...baseStyle,
        lineHeight: 1.8,
        whiteSpace: 'pre-wrap',
      }}
    >
      {text}
    </Typography>
  );
};

export default DocumentElementViewer;