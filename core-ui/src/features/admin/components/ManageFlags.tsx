import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, IconButton, Alert, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Tabs, Tab
} from '@mui/material';
import { FlagOutlined, DeleteOutline, Visibility } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
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
    document_id: number;
    document_collection_id: number;
    created: string;
  } | null;
}

// TabPanel for the sub-tabs
interface SubTabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function SubTabPanel(props: SubTabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`manage-flags-subtabpanel-${index}`}
      aria-labelledby={`manage-flags-subtab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 2 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yPropsSubTab(index: number) {
  return {
    id: `manage-flags-subtab-${index}`,
    'aria-controls': `manage-flags-subtabpanel-${index}`,
  };
}

const ManageFlags: React.FC = () => {
  const navigate = useNavigate();
  const [flags, setFlags] = useState<Flag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFlag, setSelectedFlag] = useState<Flag | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'unflag' | 'remove' | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<number>(() => {
    // Check for subtab URL parameter
    const searchParams = new URLSearchParams(window.location.search);
    const subtabParam = searchParams.get('subtab');
    return subtabParam ? parseInt(subtabParam, 10) : 0;
  });

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

  const handleSubTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveSubTab(newValue);
  };

  const handleViewInDocument = (flag: Flag) => {
    if (flag.flagged_annotation?.document_collection_id && flag.flagged_annotation?.document_id) {
      navigate(
        `/collections/${flag.flagged_annotation.document_collection_id}/documents/${flag.flagged_annotation.document_id}?annotationId=${flag.flagged_annotation.id}`
      );
    }
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Manage Flags
      </Typography>
      
      <Box sx={{ display: 'flex', flexGrow: 1 }}>
        {/* Sub-tabs for different flag management views */}
        <Box sx={{ borderRight: 1, borderColor: 'divider', minWidth: '200px' }}>
          <Tabs 
            orientation="vertical"
            value={activeSubTab} 
            onChange={handleSubTabChange} 
            aria-label="Flag management tabs"
            sx={{
              '& .MuiTab-root': {
                alignItems: 'flex-start',
                textAlign: 'left',
                paddingLeft: 2
              }
            }}
          >
            <Tab label="Overview" {...a11yPropsSubTab(0)} />
            <Tab label="Flagged Content" {...a11yPropsSubTab(1)} />
          </Tabs>
        </Box>

        {/* Tab content area */}
        <Box sx={{ flexGrow: 1 }}>
          {/* Overview Tab */}
          <SubTabPanel value={activeSubTab} index={0}>
            <Typography variant="h5" component="h2" gutterBottom>
              Flag Management Overview
            </Typography>
            
            <Typography variant="body1" paragraph>
              The Manage Flags feature allows administrators to review and moderate content that has been flagged by users as inappropriate or requiring attention.
            </Typography>

            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
              How It Works
            </Typography>
            <Box component="ul" sx={{ pl: 2 }}>
              <Typography component="li" variant="body2" paragraph>
                <strong>Viewing Flags:</strong> All flagged comments are displayed in a table showing the comment content, author, who flagged it, when it was flagged, and the reason for flagging.
              </Typography>
              <Typography component="li" variant="body2" paragraph>
                <strong>Unflag (Green Icon):</strong> Removes the flag while keeping the original comment visible. Use this when the flag was inappropriate or the issue has been resolved.
              </Typography>
              <Typography component="li" variant="body2" paragraph>
                <strong>Remove Comment (Red Icon):</strong> Permanently deletes both the comment and all associated flags. This action cannot be undone.
              </Typography>
              <Typography component="li" variant="body2" paragraph>
                <strong>Multiple Flags:</strong> If a comment has been flagged by multiple users, removing the comment will delete all flags associated with it.
              </Typography>
            </Box>

            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
              Flag Badge
            </Typography>
            <Typography variant="body2" paragraph>
              A red flag badge appears on your avatar in the header when there are pending flags. Click it to navigate directly to this page.
            </Typography>
          </SubTabPanel>

          {/* Flagged Content Tab */}
          <SubTabPanel value={activeSubTab} index={1}>
            <Typography variant="h5" component="h2" gutterBottom>
              Flagged Content
            </Typography>
            
            <Typography variant="body1" sx={{ mb: 3 }}>
              Review and take action on flagged comments below.
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : flags.length === 0 ? (
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
                            onClick={() => handleViewInDocument(flag)}
                            title="View in document"
                            color="primary"
                            disabled={!flag.flagged_annotation?.document_id || !flag.flagged_annotation?.document_collection_id}
                          >
                            <Visibility fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleActionClick(flag, 'unflag')}
                            title="Unflag (keep comment)"
                            sx={{ color: '#00693e' }}
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
          </SubTabPanel>
        </Box>
      </Box>

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
