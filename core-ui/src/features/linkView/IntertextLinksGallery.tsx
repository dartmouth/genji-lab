// core-ui/src/features/linkView/IntertextLinksGallery.tsx

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "@store/hooks";
import { selectAllLinkingAnnotations } from "@store/selector/combinedSelectors";
import { fetchAllLinkingAnnotations } from "@store/thunk";
import {
  Box,
  Container,
  Typography,
  TextField,
  Card,
  CardContent,
  CardActionArea,
  CircularProgress,
  InputAdornment,
  Chip,
  Alert,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import LinkIcon from "@mui/icons-material/Link";

interface LinkingAnnotation {
  id: string;
  motivation: string;
  body?: {
    value?: string;
    metadata?: {
      description?: string;
    };
  };
  target: Array<{
    source: string;
    selector?: {
      type: string;
      value?: string;
    };
  }>;
  created_at?: string;
  creator?: {
    username?: string;
  };
}

const IntertextLinksGallery: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const allLinkingAnnotations = useAppSelector(
    selectAllLinkingAnnotations
  ) as LinkingAnnotation[];
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAllLinkingAnnotations = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Dispatch the thunk to fetch all linking annotations
        await dispatch(fetchAllLinkingAnnotations()).unwrap();
      } catch (err) {
        const error = err as {
          response?: {
            status?: number;
            statusText?: string;
            data?: { detail?: string };
          };
          message?: string;
        };

        console.error("Failed to load linking annotations:", err);
        console.error("Error details:", {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
        });

        const errorMsg =
          error.response?.data?.detail ||
          error.message ||
          "Failed to load intertext links";
        setError(`Error: ${errorMsg}`);
      } finally {
        setIsLoading(false);
      }
    };

    loadAllLinkingAnnotations();
  }, [dispatch]);

  // Filter annotations based on search query
  const filteredAnnotations = allLinkingAnnotations.filter((annotation) => {
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();

    // Search in title (body.value)
    const title = annotation.body?.value || "";
    if (title.toLowerCase().includes(query)) return true;

    // Search in quoted text
    const quotedTexts = annotation.target
      .map((t) => t.selector?.value || "")
      .join(" ");
    if (quotedTexts.toLowerCase().includes(query)) return true;

    // Search by ID
    if (annotation.id.toString().includes(query)) return true;

    return false;
  });

  const getTitle = (annotation: LinkingAnnotation): string => {
    return annotation.body?.value || `Link #${annotation.id}`;
  };

  const getTargetCount = (annotation: LinkingAnnotation): number => {
    return annotation.target.length;
  };

  const getPreviewText = (annotation: LinkingAnnotation): string => {
    const firstTarget = annotation.target[0];
    if (firstTarget?.selector?.value) {
      const text = firstTarget.selector.value;
      return text.length > 100 ? text.substring(0, 100) + "..." : text;
    }
    return "Click to view linked texts";
  };

  const handleLinkClick = (annotationId: string) => {
    navigate(`/links/${annotationId}`);
  };

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, textAlign: "center" }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ mt: 2 }}>
          Loading intertext links...
        </Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Browse Intertext Links
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Explore connections between passages across different translations of
          The Tale of Genji
        </Typography>

        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search by title, text, or ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ mt: 2 }}
        />
      </Box>

      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          {filteredAnnotations.length} link
          {filteredAnnotations.length !== 1 ? "s" : ""} found
          {searchQuery && ` for "${searchQuery}"`}
        </Typography>
      </Box>

      {filteredAnnotations.length === 0 ? (
        <Card>
          <CardContent>
            <Typography variant="body1" color="text.secondary" align="center">
              {searchQuery
                ? "No links match your search. Try a different query."
                : "No intertext links have been created yet."}
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {filteredAnnotations.map((annotation) => (
            <Card
              key={annotation.id}
              elevation={2}
              sx={{
                transition: "all 0.2s",
                "&:hover": {
                  elevation: 4,
                  transform: "translateY(-2px)",
                },
              }}
            >
              <CardActionArea onClick={() => handleLinkClick(annotation.id)}>
                <CardContent>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      mb: 1,
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <LinkIcon color="primary" />
                      <Typography variant="h6" component="div">
                        {getTitle(annotation)}
                      </Typography>
                    </Box>
                    <Chip
                      label={`${getTargetCount(annotation)} passages`}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </Box>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      fontStyle: "italic",
                      pl: 2,
                      borderLeft: "3px solid",
                      borderColor: "primary.main",
                      mb: 1,
                    }}
                  >
                    "{getPreviewText(annotation)}"
                  </Typography>

                  {annotation.creator?.username && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ mt: 1, display: "block" }}
                    >
                      Created by {annotation.creator.username}
                    </Typography>
                  )}
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Box>
      )}
    </Container>
  );
};

export default IntertextLinksGallery;
