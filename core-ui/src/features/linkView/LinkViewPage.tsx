// src/pages/LinkViewPage.tsx

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import { linkingAnnotations } from '@store';
import { fetchAnnotationById } from '@store/thunk/fetchAnnotationById';
import {
  Box,
  Container,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Paper,
  Pagination,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { TextTarget } from '@documentView/types';
import { LinkCard } from './LinkCard';
import { PinnedTargetsPanel } from './PinnedTargetsPanel';

const TARGETS_PER_PAGE = 10;

// Type for a target group (single or array)
type TargetGroup = TextTarget | TextTarget[];

export const LinkViewPage: React.FC = () => {
  const { annotationId } = useParams<{ annotationId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  // Local state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pinnedTargetIds, setPinnedTargetIds] = useState<Set<string>>(() => {
    // Initialize from URL params immediately to avoid state update during render
    const pinnedParam = searchParams.get('pinned');
    if (pinnedParam) {
      const pinnedIds = pinnedParam.split(',').filter(Boolean);
      return new Set(pinnedIds);
    }
    return new Set();
  });
  const [isPanelOpen, setIsPanelOpen] = useState(true);

  // Get annotation from Redux store
  const annotation = useAppSelector((state) =>
    annotationId
      ? linkingAnnotations.selectors.selectAnnotationById(state, annotationId)
      : undefined
  );

  // Fetch annotation if not in store
  useEffect(() => {
    if (!annotationId) {
      setError('No annotation ID provided');
      return;
    }

    if (!annotation && !loading) {
      setLoading(true);
      setError(null);

      dispatch(fetchAnnotationById(annotationId))
        .unwrap()
        .then((fetchedAnnotation) => {
          // Add to the linking slice
          dispatch(linkingAnnotations.actions.addAnnotation(fetchedAnnotation));
          setLoading(false);
        })
        .catch((err) => {
          setError(err || 'Failed to fetch annotation');
          setLoading(false);
        });
    }
  }, [annotationId, annotation, loading, dispatch]);

  // Process targets - preserve arrays, filter out ObjectTargets
  const targetGroups = useMemo((): TargetGroup[] => {
    if (!annotation?.target) return [];

    return annotation.target
      .map((target): TargetGroup | null => {
        if (Array.isArray(target)) {
          // Filter out non-TextTargets from array
          const textTargets = target.filter(
            (t): t is TextTarget => t.type !== 'Object'
          );
          return textTargets.length > 0 ? textTargets : null;
        } else if (target.type !== 'Object') {
          // Single TextTarget
          return target as TextTarget;
        }
        return null;
      })
      .filter((group): group is TargetGroup => group !== null);
  }, [annotation]);

  // Helper to get the ID of a target group (for pinning)
  const getGroupId = useCallback((group: TargetGroup): string | undefined => {
    const firstTarget = Array.isArray(group) ? group[0] : group;
    return firstTarget?.id ? String(firstTarget.id) : undefined;
  }, []);

  // Separate pinned and unpinned target groups
  const { pinnedGroups, unpinnedGroups } = useMemo(() => {
    const pinned: TargetGroup[] = [];
    const unpinned: TargetGroup[] = [];

    targetGroups.forEach((group) => {
      const groupId = getGroupId(group);
      if (groupId && pinnedTargetIds.has(groupId)) {
        pinned.push(group);
      } else {
        unpinned.push(group);
      }
    });

    return { pinnedGroups: pinned, unpinnedGroups: unpinned };
  }, [targetGroups, pinnedTargetIds, getGroupId]);

  // Count total individual targets for display
  const totalTargetCount = useMemo(() => {
    return targetGroups.reduce((count, group) => {
      return count + (Array.isArray(group) ? group.length : 1);
    }, 0);
  }, [targetGroups]);

  // Pagination logic
  const totalPages = Math.ceil(unpinnedGroups.length / TARGETS_PER_PAGE);
  const startIndex = (currentPage - 1) * TARGETS_PER_PAGE;
  const endIndex = startIndex + TARGETS_PER_PAGE;
  const paginatedGroups = unpinnedGroups.slice(startIndex, endIndex);

  // Handle page change
  const handlePageChange = useCallback((_event: React.ChangeEvent<unknown>, page: number) => {
    setCurrentPage(page);
    // Scroll to top of the scrollable container instead of window
    const scrollContainer = document.getElementById('unpinned-content-scroll');
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  // Handle pin toggle - wrapped in useCallback to prevent recreating on each render
  const handleTogglePin = useCallback((targetId: string) => {
    setPinnedTargetIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(targetId)) {
        newSet.delete(targetId);
      } else {
        newSet.add(targetId);
      }

      // Update URL params in a separate effect-like manner
      // This schedules the update for after render completes
      setTimeout(() => {
        if (newSet.size > 0) {
          setSearchParams({ pinned: Array.from(newSet).join(',') });
        } else {
          setSearchParams({});
        }
      }, 0);

      return newSet;
    });

    // Reset to page 1 when pinning/unpinning to avoid confusion
    setCurrentPage(1);
  }, [setSearchParams]);

  // Handle back navigation
  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  // Loading state
  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Loading annotation...
        </Typography>
      </Container>
    );
  }

  // Error state
  if (error || !annotation) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || 'Annotation not found'}
        </Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
          variant="outlined"
        >
          Go Back
        </Button>
      </Container>
    );
  }

  const linkName = annotation.body?.value || 'Unnamed Link';

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
          sx={{ mb: 2 }}
        >
          Back
        </Button>
        <Typography variant="h3" component="h1" gutterBottom>
          {linkName}
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          {totalTargetCount} {totalTargetCount === 1 ? 'target' : 'targets'}
          {' '}in {targetGroups.length} {targetGroups.length === 1 ? 'group' : 'groups'}
          {pinnedGroups.length > 0 && ` (${pinnedGroups.length} pinned)`}
        </Typography>
      </Box>

      {/* Main Content Area */}
      <Box 
        sx={{ 
          display: 'flex', 
          gap: 2, 
          alignItems: 'stretch',
          height: 'calc(100vh - 250px)', // Adjust based on header height
          minHeight: '600px',
        }}
      >
        {/* Pinned Targets Panel */}
        <PinnedTargetsPanel
          pinnedTargets={pinnedGroups}
          onTogglePin={handleTogglePin}
          isOpen={isPanelOpen}
          onTogglePanel={() => setIsPanelOpen(!isPanelOpen)}
        />

        {/* Main Targets List - Now Scrollable */}
        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <Paper 
            sx={{ 
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              overflow: 'hidden',
            }}
          >
            {/* Pagination Top - Fixed */}
            {totalPages > 1 && (
              <Box sx={{ mb: 2, flexShrink: 0 }}>
                <Pagination
                  count={totalPages}
                  page={currentPage}
                  onChange={handlePageChange}
                  color="primary"
                  size="large"
                  showFirstButton
                  showLastButton
                  sx={{ display: 'flex', justifyContent: 'center' }}
                />
              </Box>
            )}

            {/* Scrollable Content Area */}
            <Box
              id="unpinned-content-scroll"
              sx={{
                flex: 1,
                overflowY: 'auto',
                overflowX: 'hidden',
                pr: 1,
                '&::-webkit-scrollbar': {
                  width: '10px',
                },
                '&::-webkit-scrollbar-track': {
                  backgroundColor: 'background.default',
                  borderRadius: '5px',
                },
                '&::-webkit-scrollbar-thumb': {
                  backgroundColor: 'primary.main',
                  borderRadius: '5px',
                  '&:hover': {
                    backgroundColor: 'primary.dark',
                  },
                },
              }}
            >
              {/* Target Cards */}
              {paginatedGroups.length > 0 ? (
                <>
                  {paginatedGroups.map((group, index) => {
                    const groupId = getGroupId(group);
                    return (
                      <LinkCard
                        key={groupId || `group-${index}`}
                        target={group}
                        isPinned={false}
                        onTogglePin={handleTogglePin}
                      />
                    );
                  })}
                </>
              ) : (
                <Alert severity="info">
                  {unpinnedGroups.length === 0 && pinnedGroups.length > 0
                    ? 'All target groups are pinned'
                    : 'No targets available'}
                </Alert>
              )}
            </Box>

            {/* Pagination Bottom - Fixed */}
            {totalPages > 1 && (
              <Box sx={{ mt: 2, flexShrink: 0 }}>
                <Pagination
                  count={totalPages}
                  page={currentPage}
                  onChange={handlePageChange}
                  color="primary"
                  size="large"
                  showFirstButton
                  showLastButton
                  sx={{ display: 'flex', justifyContent: 'center' }}
                />
              </Box>
            )}

            {/* Page Info - Fixed */}
            {unpinnedGroups.length > 0 && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', textAlign: 'center', mt: 1, flexShrink: 0 }}
              >
                Showing {startIndex + 1}-{Math.min(endIndex, unpinnedGroups.length)} of{' '}
                {unpinnedGroups.length} unpinned {unpinnedGroups.length === 1 ? 'group' : 'groups'}
              </Typography>
            )}
          </Paper>
        </Box>
      </Box>
    </Container>
  );
};