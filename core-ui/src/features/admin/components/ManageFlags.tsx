import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, IconButton, Alert, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, Button
} from '@mui/material';
import { Visibility, FlagOutlined, DeleteOutline } from '@mui/icons-material';
import axios from 'axios';

interface Flag {
  flag_id: number;
  flag_reason: string;
  flagged_by: { id: number; name: string };
  flagged_at: string;
  flagged_annotation: {
    id: number;
    content: string;
    author: { id: number; name: string };
    document_element_id: number;
    created: string;
  } | null;
}

const ManageFlags: React.FC = () => {
  const [flags, setFlags] = useState<Flag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFlag, setSelectedFlag] = useState<Flag | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'unflag' | 'remove' | null>(null);

  useEffect(() => {
    fetchFlags();
  }, []);

  const fetchFlags = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/v1/flags', {
        withCredentials: true,
      });
      
      setFlags(response.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load flags');
    } finally {
      setLoading(false);
    }
  };

  const handleViewClick = (flag: Flag) => {
    setSelectedFlag(flag);
    setViewDialogOpen(true);
  };

  const handleActionClick = (flag: Flag, action: 'unflag' | 'remove') => {
    setSelectedFlag(flag);
    setActionType(action);
    setConfirmDialogOpen(true);
  };

  const handleConfirmAction = async () => {
    if (!selectedFlag || !actionType) return;

    try {
      const endpoint = actionType === 'unflag' ? 'unflag' : 'remove-comment';
      await axios.delete(
        `/api/v1/flags/${selectedFlag.flag_id}/${endpoint}`,
        {
          withCredentials: true,
        }
      );

      await fetchFlags();
      setConfirmDialogOpen(false);
      setSelectedFlag(null);
      setActionType(null);
      
      // Trigger flag count refresh in header
      window.dispatchEvent(new Event('refreshFlagCount'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    }
  };

  const formatDate = (date: string) => {
    const flagDate = new Date(date);
    return flagDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Manage Flags
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {flags.length === 0 ? (
        <Alert severity="info">No flagged content</Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Flagged Comment</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Author</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Flagged By</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Reason</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {flags.map((flag) => (
                <TableRow key={flag.flag_id}>
                  <TableCell>
                    {flag.flagged_annotation?.content?.substring(0, 100) || 'N/A'}
                    {(flag.flagged_annotation?.content?.length || 0) > 100 && '...'}
                  </TableCell>
                  <TableCell>
                    {flag.flagged_annotation?.author?.name || 'Unknown'}
                    {flag.flagged_annotation?.created && (
                      <>
                        <br />
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(flag.flagged_annotation.created)}
                        </Typography>
                      </>
                    )}
                  </TableCell>
                  <TableCell>
                    {flag.flagged_by.name}
                    <br />
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(flag.flagged_at)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {flag.flag_reason.substring(0, 50)}
                    {flag.flag_reason.length > 50 && '...'}
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => handleViewClick(flag)}
                      title="View details"
                    >
                      <Visibility fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleActionClick(flag, 'unflag')}
                      title="Unflag (keep comment)"
                      color="primary"
                    >
                      <FlagOutlined fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleActionClick(flag, 'remove')}
                      title="Remove comment"
                      color="error"
                    >
                      <DeleteOutline fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* View Dialog */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Flag Details</DialogTitle>
        <DialogContent>
          {selectedFlag && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Flagged Content:
              </Typography>
              <Paper sx={{ p: 2, mb: 2, bgcolor: '#f5f5f5' }}>
                <Typography>{selectedFlag.flagged_annotation?.content}</Typography>
                <Typography variant="caption" color="text.secondary">
                  By: {selectedFlag.flagged_annotation?.author?.name} on{' '}
                  {selectedFlag.flagged_annotation?.created && 
                    new Date(selectedFlag.flagged_annotation.created).toLocaleString()}
                </Typography>
              </Paper>

              <Typography variant="subtitle2" gutterBottom>
                Flag Reason:
              </Typography>
              <Paper sx={{ p: 2, bgcolor: '#fff3e0' }}>
                <Typography>{selectedFlag.flag_reason}</Typography>
                <Typography variant="caption" color="text.secondary">
                  Flagged by: {selectedFlag.flagged_by.name} on{' '}
                  {new Date(selectedFlag.flagged_at).toLocaleString()}
                </Typography>
              </Paper>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)}>
        <DialogTitle>
          {actionType === 'unflag' ? 'Unflag Content?' : 'Remove Comment?'}
        </DialogTitle>
        <DialogContent>
          <Typography>
            {actionType === 'unflag'
              ? 'This will remove the flag but keep the original comment visible.'
              : 'This will permanently delete the comment and ALL flags associated with it. This action cannot be undone.'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleConfirmAction}
            variant="contained"
            color={actionType === 'remove' ? 'error' : 'primary'}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ManageFlags;
