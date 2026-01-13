// src/features/linkView/PinnedTargetsPanel.tsx

import React, { useMemo } from "react";
import {
  Box,
  Paper,
  Typography,
  Divider,
  IconButton,
  Stack,
  Chip,
} from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import CollectionsBookmarkIcon from "@mui/icons-material/CollectionsBookmark";
import { TextTarget } from "@documentView/types";
import { useAppSelector } from "@store/hooks";
import { selectAllLoadedElements } from "@store/selector/combinedSelectors";
import { selectAllDocuments } from "@store/slice/documentSlice";
import { selectAllDocumentCollections } from "@store/slice/documentCollectionSlice";
import { LinkCard } from "./LinkCard";
import { resolveTargetGroupMetadata } from "./linkTargetUtils";

// Type for a target group (single or array)
type TargetGroup = TextTarget | TextTarget[];

interface PinnedTargetsPanelProps {
  pinnedTargets: TargetGroup[];
  onTogglePin: (targetId: string) => void;
  isOpen: boolean;
  onTogglePanel: () => void;
  annotationId?: string;
  onDeleteSuccess?: () => void;
}

export const PinnedTargetsPanel: React.FC<PinnedTargetsPanelProps> = ({
  pinnedTargets,
  onTogglePin,
  isOpen,
  onTogglePanel,
  annotationId,
  onDeleteSuccess,
}) => {
  // Get data from Redux
  const allElements = useAppSelector(selectAllLoadedElements);
  const allDocuments = useAppSelector(selectAllDocuments);
  const allCollections = useAppSelector(selectAllDocumentCollections);

  const hasPinnedTargets = pinnedTargets.length > 0;

  // Helper to get the ID of a target group
  const getGroupId = (group: TargetGroup): string | undefined => {
    const firstTarget = Array.isArray(group) ? group[0] : group;
    return firstTarget?.id ? String(firstTarget.id) : undefined;
  };

  // Calculate summary statistics for pinned targets
  const pinnedSummary = useMemo(() => {
    if (pinnedTargets.length === 0) {
      return null;
    }

    const collectionTitles = new Set<string>();
    const documentTitles = new Set<string>();
    let totalTargets = 0;

    pinnedTargets.forEach((group) => {
      const targets = Array.isArray(group) ? group : [group];
      totalTargets += targets.length;

      const metadata = resolveTargetGroupMetadata(
        targets,
        allElements,
        allDocuments,
        allCollections
      );

      metadata.resolvedTargets.forEach((resolved) => {
        if (
          resolved.documentCollectionTitle &&
          resolved.documentCollectionTitle !== "Unknown Collection"
        ) {
          collectionTitles.add(resolved.documentCollectionTitle);
        }
        if (
          resolved.documentTitle &&
          resolved.documentTitle !== "Unknown Document"
        ) {
          documentTitles.add(resolved.documentTitle);
        }
      });
    });

    const collectionsList = Array.from(collectionTitles);
    const documentsList = Array.from(documentTitles);

    return {
      totalGroups: pinnedTargets.length,
      totalTargets,
      collectionCount: collectionTitles.size,
      collections: collectionsList,
      documentCount: documentTitles.size,
      documents: documentsList,
    };
  }, [pinnedTargets, allElements, allDocuments, allCollections]);

  if (!hasPinnedTargets) {
    return null;
  }

  return (
    <Box
      sx={{
        position: "relative",
        width: isOpen ? "40%" : "40px",
        minWidth: isOpen ? "300px" : "40px",
        maxWidth: isOpen ? "500px" : "40px",
        transition: "width 0.3s ease-in-out, min-width 0.3s ease-in-out",
        mr: isOpen ? 2 : 0,
        height: "100%",
        flexShrink: 0,
      }}
    >
      {/* Toggle Button */}
      <IconButton
        onClick={onTogglePanel}
        size="small"
        sx={{
          position: "absolute",
          top: 8,
          right: isOpen ? 8 : -32,
          zIndex: 10,
          backgroundColor: "background.paper",
          boxShadow: 2,
          "&:hover": {
            backgroundColor: "action.hover",
          },
        }}
      >
        {isOpen ? <ChevronLeftIcon /> : <ChevronRightIcon />}
      </IconButton>

      {/* Panel Content */}
      {isOpen && pinnedSummary && (
        <Paper
          elevation={3}
          sx={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Header - Fixed */}
          <Box sx={{ p: 2, pb: 1, flexShrink: 0 }}>
            {/* Summary Statistics */}
            <Stack spacing={1} sx={{ mb: 1 }}>
              {/* Collection info */}
              {pinnedSummary.collectionCount > 0 && (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                    flexWrap: "wrap",
                  }}
                >
                  <CollectionsBookmarkIcon
                    fontSize="small"
                    color="action"
                    sx={{ fontSize: "0.875rem" }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {pinnedSummary.collectionCount}{" "}
                    {pinnedSummary.collectionCount === 1
                      ? "collection"
                      : "collections"}
                    :
                  </Typography>
                  {pinnedSummary.collections.slice(0, 2).map((col, idx) => (
                    <Chip
                      key={idx}
                      label={col}
                      size="small"
                      variant="outlined"
                      sx={{ height: "20px", fontSize: "0.7rem" }}
                    />
                  ))}
                  {pinnedSummary.collections.length > 2 && (
                    <Typography variant="caption" color="text.secondary">
                      +{pinnedSummary.collections.length - 2} more
                    </Typography>
                  )}
                </Box>
              )}

              {/* Document info */}
              {pinnedSummary.documentCount > 0 && (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                    flexWrap: "wrap",
                  }}
                >
                  <MenuBookIcon
                    fontSize="small"
                    color="primary"
                    sx={{ fontSize: "0.875rem" }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {pinnedSummary.documentCount}{" "}
                    {pinnedSummary.documentCount === 1
                      ? "document"
                      : "documents"}
                    :
                  </Typography>
                  {pinnedSummary.documents.slice(0, 2).map((doc, idx) => (
                    <Chip
                      key={idx}
                      label={doc}
                      size="small"
                      variant="outlined"
                      sx={{ height: "20px", fontSize: "0.7rem" }}
                    />
                  ))}
                  {pinnedSummary.documents.length > 2 && (
                    <Typography variant="caption" color="text.secondary">
                      +{pinnedSummary.documents.length - 2} more
                    </Typography>
                  )}
                </Box>
              )}
            </Stack>
          </Box>

          <Divider sx={{ flexShrink: 0 }} />

          {/* Scrollable Content */}
          <Box
            sx={{
              flex: 1,
              overflowY: "auto",
              overflowX: "hidden",
              p: 2,
              minHeight: 0,
              "&::-webkit-scrollbar": {
                width: "8px",
              },
              "&::-webkit-scrollbar-track": {
                backgroundColor: "background.default",
              },
              "&::-webkit-scrollbar-thumb": {
                backgroundColor: "primary.main",
                borderRadius: "4px",
                "&:hover": {
                  backgroundColor: "primary.dark",
                },
              },
            }}
          >
            {pinnedTargets.map((group, index) => {
              const groupId = getGroupId(group);
              return (
                <LinkCard
                  key={groupId || `pinned-${index}`}
                  target={group}
                  isPinned={true}
                  onTogglePin={onTogglePin}
                  showPinButton={true}
                  annotationId={annotationId}
                  onDeleteSuccess={onDeleteSuccess}
                />
              );
            })}
          </Box>
        </Paper>
      )}
    </Box>
  );
};
