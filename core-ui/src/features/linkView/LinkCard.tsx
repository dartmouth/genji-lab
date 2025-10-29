// src/components/LinkView/LinkCard.tsx

import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  IconButton,
  Box,
  Chip,
  Divider,
} from '@mui/material';
import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import { TextTarget } from '@documentView/types';

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
  // Normalize to array for consistent handling
  const targets = Array.isArray(target) ? target : [target];
  
  // Use the first target's ID for pinning (or generate a composite ID)
  const cardId = targets[0]?.id ? String(targets[0].id) : undefined;

  // Extract document element ID from source URI
  const getDocumentElementId = (source: string): string => {
    // Try multiple patterns to match different URI formats
    // Pattern 1: /DocumentElement/{ID}
    let match = source.match(/\/DocumentElement\/(\d+)/i);
    if (match) return match[1];
    
    // Pattern 2: DocumentElement/{ID} (without leading slash)
    match = source.match(/DocumentElement\/(\d+)/i);
    if (match) return match[1];
    
    // Pattern 3: Just the ID if source is a simple number/string
    match = source.match(/(\d+)/);
    if (match) return match[1];
    
    // If no pattern matches, return the full source for debugging
    console.warn('Unable to parse document element ID from source:', source);
    return source;
  };

  const handlePinClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (cardId) {
      onTogglePin(cardId);
    }
  };

  // Get unique document element IDs if there are multiple targets
  const documentElementIds = Array.from(
    new Set(targets.map(t => getDocumentElementId(t.source)))
  );

  const isMultiTarget = targets.length > 1;

  return (
    <Card
      sx={{
        mb: 2,
        position: 'relative',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          boxShadow: 4,
        },
        border: isPinned ? '2px solid' : '1px solid',
        borderColor: isPinned ? 'primary.main' : 'divider',
      }}
    >
      <CardContent>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            mb: 1,
          }}
        >
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {documentElementIds.map((elemId, idx) => (
              <Chip
                key={idx}
                label={`Element ${elemId}`}
                size="small"
                variant="outlined"
              />
            ))}
            {isMultiTarget && (
              <Chip
                label={`${targets.length} targets`}
                size="small"
                color="primary"
                variant="outlined"
              />
            )}
          </Box>
          {showPinButton && cardId && (
            <IconButton
              onClick={handlePinClick}
              size="small"
              color={isPinned ? 'primary' : 'default'}
              aria-label={isPinned ? 'Unpin target' : 'Pin target'}
              sx={{
                '&:hover': {
                  backgroundColor: isPinned ? 'primary.light' : 'action.hover',
                },
              }}
            >
              {isPinned ? <PushPinIcon /> : <PushPinOutlinedIcon />}
            </IconButton>
          )}
        </Box>

        {/* Display each target's text on its own line */}
        <Box sx={{ mt: 2 }}>
          {targets.map((tgt, index) => {
            const quotedText = tgt.selector?.value || 'No text available';
            
            return (
              <React.Fragment key={tgt.id || index}>
                {index > 0 && (
                  <Divider sx={{ my: 2 }} />
                )}
                <Box>
                  <Typography
                    variant="body1"
                    component="blockquote"
                    sx={{
                      fontStyle: 'italic',
                      color: 'text.primary',
                      lineHeight: 1.6,
                      mb: 1,
                      pl: 2,
                      borderLeft: '3px solid',
                      borderColor: 'primary.light',
                      position: 'relative',
                    }}
                  >
                    {quotedText}
                  </Typography>

                  {tgt.selector?.refined_by && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: 'block', pl: 2 }}
                    >
                      Position: {tgt.selector.refined_by.start} - {tgt.selector.refined_by.end}
                    </Typography>
                  )}
                </Box>
              </React.Fragment>
            );
          })}
        </Box>
      </CardContent>
    </Card>
  );
};