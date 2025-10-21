// src/components/LinkView/PinnedTargetsPanel.tsx

import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Divider,
  IconButton,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { TextTarget } from '@documentView/types';
import { LinkCard } from './LinkCard';

// Type for a target group (single or array)
type TargetGroup = TextTarget | TextTarget[];

interface PinnedTargetsPanelProps {
  pinnedTargets: TargetGroup[];
  onTogglePin: (targetId: string) => void;
  isOpen: boolean;
  onTogglePanel: () => void;
}

export const PinnedTargetsPanel: React.FC<PinnedTargetsPanelProps> = ({
  pinnedTargets,
  onTogglePin,
  isOpen,
  onTogglePanel,
}) => {
  const hasPinnedTargets = pinnedTargets.length > 0;

  // Helper to get the ID of a target group
  const getGroupId = (group: TargetGroup): string | undefined => {
    const firstTarget = Array.isArray(group) ? group[0] : group;
    return firstTarget?.id ? String(firstTarget.id) : undefined;
  };

  if (!hasPinnedTargets) {
    return null;
  }

  return (
    <Box
      sx={{
        position: 'relative',
        width: isOpen ? '40%' : '40px',
        minWidth: isOpen ? '300px' : '40px',
        maxWidth: isOpen ? '500px' : '40px',
        transition: 'width 0.3s ease-in-out, min-width 0.3s ease-in-out',
        mr: isOpen ? 2 : 0,
        height: '100%',
        flexShrink: 0,
      }}
    >
      {/* Toggle Button */}
      <IconButton
        onClick={onTogglePanel}
        size="small"
        sx={{
          position: 'absolute',
          top: 8,
          right: isOpen ? 8 : -32,
          zIndex: 10,
          backgroundColor: 'background.paper',
          boxShadow: 2,
          '&:hover': {
            backgroundColor: 'action.hover',
          },
        }}
      >
        {isOpen ? <ChevronLeftIcon /> : <ChevronRightIcon />}
      </IconButton>

      {/* Panel Content */}
      {isOpen && (
        <Paper
          elevation={3}
          sx={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header - Fixed */}
          <Box sx={{ p: 2, pb: 1, flexShrink: 0 }}>
            <Typography variant="h6" gutterBottom>
              Pinned Targets
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {pinnedTargets.length} {pinnedTargets.length === 1 ? 'group' : 'groups'} pinned
            </Typography>
          </Box>

          <Divider sx={{ flexShrink: 0 }} />

          {/* Scrollable Content */}
          <Box
            sx={{
              flex: 1,
              overflowY: 'auto',
              overflowX: 'hidden',
              p: 2,
              minHeight: 0, // Important: allows flex child to shrink below content size
              '&::-webkit-scrollbar': {
                width: '8px',
              },
              '&::-webkit-scrollbar-track': {
                backgroundColor: 'background.default',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: 'primary.main',
                borderRadius: '4px',
                '&:hover': {
                  backgroundColor: 'primary.dark',
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
                />
              );
            })}
          </Box>
        </Paper>
      )}
    </Box>
  );
};