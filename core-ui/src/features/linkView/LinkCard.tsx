// src/features/linkView/LinkCard.tsx

import React, { useMemo } from "react";
import { Card, CardContent, Typography, IconButton, Box } from "@mui/material";
import PushPinIcon from "@mui/icons-material/PushPin";
import PushPinOutlinedIcon from "@mui/icons-material/PushPinOutlined";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import CollectionsBookmarkIcon from "@mui/icons-material/CollectionsBookmark";
import { TextTarget } from "@documentView/types";
import { useAppSelector } from "@store/hooks";
import { selectAllLoadedElements } from "@store/selector/combinedSelectors";
import { selectAllDocuments } from "@store/slice/documentSlice";
import { selectAllDocumentCollections } from "@store/slice/documentCollectionSlice";
import {
  resolveTargetGroupMetadata,
  type ResolvedTargetMetadata,
} from "./linkTargetUtils";

interface LinkCardProps {
  target: TextTarget | TextTarget[];
  isPinned: boolean;
  onTogglePin: (targetId: string) => void;
  showPinButton?: boolean;
}

export const LinkCard: React.FC<LinkCardProps> = ({
  target,
  isPinned,
  onTogglePin,
  showPinButton = true,
}) => {
  // Get data from Redux
  const allElements = useAppSelector(selectAllLoadedElements);
  const allDocuments = useAppSelector(selectAllDocuments);
  const allCollections = useAppSelector(selectAllDocumentCollections);

  // Normalize to array for consistent handling (memoized to avoid dependency issues)
  const targets = useMemo(() => {
    return Array.isArray(target) ? target : [target];
  }, [target]);

  // Use the first target's ID for pinning (or generate a composite ID)
  const cardId = targets[0]?.id ? String(targets[0].id) : undefined;

  // Resolve metadata for all targets in this group
  const groupMetadata = useMemo(() => {
    return resolveTargetGroupMetadata(
      targets,
      allElements,
      allDocuments,
      allCollections
    );
  }, [targets, allElements, allDocuments, allCollections]);

  const {
    resolvedTargets: unsortedTargets,
    isSameDocument,
    isSameCollection,
    commonDocumentTitle,
    commonCollectionTitle,
  } = groupMetadata;

  // Sort resolved targets by element ID to display in document order
  const resolvedTargets = useMemo(() => {
    return [...unsortedTargets].sort((a, b) => {
      // Sort by element ID (paragraph order in document)
      if (a.elementId === null) return 1;
      if (b.elementId === null) return -1;
      return a.elementId - b.elementId;
    });
  }, [unsortedTargets]);

  const handlePinClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (cardId) {
      onTogglePin(cardId);
    }
  };

  return (
    <Card
      sx={{
        mb: 2,
        position: "relative",
        transition: "all 0.2s ease-in-out",
        "&:hover": {
          boxShadow: 4,
        },
        border: isPinned ? "2px solid" : "1px solid",
        borderColor: isPinned ? "primary.main" : "divider",
      }}
    >
      <CardContent>
        {/* Header with collection/document info and pin button */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            mb: 2,
          }}
        >
          <Box sx={{ flex: 1 }}>
            {/* Collection title - show once if all targets are from same collection */}
            {isSameCollection &&
              commonCollectionTitle &&
              commonCollectionTitle !== "Unknown Collection" && (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    mb: 0.5,
                  }}
                >
                  <CollectionsBookmarkIcon fontSize="small" color="action" />
                  <Typography variant="caption" color="text.secondary">
                    {commonCollectionTitle}
                  </Typography>
                </Box>
              )}

            {/* Document title - show once if all targets are from same document */}
            {isSameDocument &&
              commonDocumentTitle &&
              commonDocumentTitle !== "Unknown Document" && (
                <Box
                  sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}
                >
                  <MenuBookIcon fontSize="small" color="primary" />
                  <Typography
                    variant="subtitle1"
                    fontWeight="medium"
                    color="primary.main"
                  >
                    {commonDocumentTitle}
                  </Typography>
                </Box>
              )}
          </Box>

          {/* Pin button */}
          {showPinButton && cardId && (
            <IconButton
              onClick={handlePinClick}
              size="small"
              color={isPinned ? "primary" : "default"}
              aria-label={isPinned ? "Unpin target" : "Pin target"}
              sx={{
                ml: 1,
                flexShrink: 0,
                "&:hover": {
                  backgroundColor: isPinned ? "primary.light" : "action.hover",
                },
              }}
            >
              {isPinned ? <PushPinIcon /> : <PushPinOutlinedIcon />}
            </IconButton>
          )}
        </Box>

        {/* Display each target's text */}
        <Box sx={{ mt: 2 }}>
          {resolvedTargets.map(
            (resolved: ResolvedTargetMetadata, index: number) => {
              return (
                <React.Fragment key={targets[index]?.id || index}>
                  {index > 0 && <Box sx={{ my: 2 }} />}
                  <Box>
                    {/* Quoted text */}
                    <Typography
                      variant="body1"
                      component="blockquote"
                      sx={{
                        fontStyle: "italic",
                        color: "text.primary",
                        lineHeight: 1.6,
                        pl: 2,
                        borderLeft: "3px solid",
                        borderColor: "primary.light",
                        position: "relative",
                      }}
                    >
                      {resolved.quotedText}
                    </Typography>
                  </Box>
                </React.Fragment>
              );
            }
          )}
        </Box>
      </CardContent>
    </Card>
  );
};
