import React, { useState, useEffect, useMemo } from 'react';
import { 
  Tabs, Tab, Box, Typography, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Paper, Button, TextField, 
  CircularProgress, Alert, IconButton, InputAdornment, Select, MenuItem, FormControl, InputLabel 
} from '@mui/material';
import { ContentCopy, PersonAdd, Link, Delete } from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { 
  fetchClassrooms, 
  createClassroom,
  fetchClassroomById,
  removeUserFromClassroom,
  selectClassroomsStatus,
  selectClassroomsError,
  selectCreateClassroomStatus,
  selectCreateClassroomError,
  selectClassroomsForUser,
  selectCurrentClassroom,
  clearCreateStatus,
  type ClassroomCreate
} from '../../../store/slice/classroomsSlice';
import { User } from '../../../store/slice/usersSlice';
import { useAuth } from '../../../hooks/useAuthContext';
import AddStudentModal from './AddStudentModal';
import RemoveStudentDialog from './RemoveStudentDialog';

// Utility function to format dates
const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString();
};

// Utility function to format dates that are date-only (YYYY-MM-DD format)
const formatDateOnly = (dateString: string): string => {
  return new Date(dateString + 'T00:00:00').toLocaleDateString();
};

// Utility function to check if classroom has ended
const isClassroomEnded = (classroom: any): boolean => {
  if (!classroom?.end_date) return false;
  const now = new Date();
  const endDate = new Date(classroom.end_date + 'T23:59:59');
  return now > endDate;
};

// Utility function to check if join link has expired
const isJoinLinkExpired = (classroom: any): boolean => {
  if (!classroom?.start_date) return false;
  const now = new Date();
  const startDate = new Date(classroom.start_date + 'T00:00:00');
  const expirationDate = new Date(startDate.getTime() + (14 * 24 * 60 * 60 * 1000)); // 14 days after start
  return now > expirationDate;
};

// Utility function to get join link expiration date
const getJoinLinkExpirationDate = (classroom: any): string => {
  if (!classroom?.start_date) return 'N/A';
  const startDate = new Date(classroom.start_date + 'T00:00:00');
  const expirationDate = new Date(startDate.getTime() + (14 * 24 * 60 * 60 * 1000)); // 14 days after start
  return expirationDate.toLocaleDateString();
};

// Utility function to format member names
const formatMemberName = (member: any): string => {
  const nameParts = [];
  if (member.first_name) nameParts.push(member.first_name);
  if (member.last_name) nameParts.push(member.last_name);
  return nameParts.length > 0 ? nameParts.join(' ') : member.username;
};

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
      id={`manage-classroom-subtabpanel-${index}`}
      aria-labelledby={`manage-classroom-subtab-${index}`}
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
    id: `manage-classroom-subtab-${index}`,
    'aria-controls': `manage-classroom-subtabpanel-${index}`,
  };
}

// Styled components
const CreateButton = styled(Button)(({ theme }) => ({
  backgroundColor: '#2C656B',
  color: 'white',
  '&:hover': {
    backgroundColor: '#004d2d',
  },
  '&:disabled': {
    backgroundColor: theme.palette.action.disabled,
    color: theme.palette.action.disabled,
  },
}));

const ManageClassrooms: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<number>(0);
  const [formData, setFormData] = useState<ClassroomCreate>({
    name: '',
    description: '',
    start_date: '', // No default value
    end_date: ''    // No default value
  });
  const [createdClassroomId, setCreatedClassroomId] = useState<number | null>(null);
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>('');
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [isRemoveStudentDialogOpen, setIsRemoveStudentDialogOpen] = useState(false);
  const [studentToRemove, setStudentToRemove] = useState<{ id: number; name: string; email: string } | null>(null);
  const [newlyAddedStudentId, setNewlyAddedStudentId] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  
  const dispatch = useAppDispatch();
  const { user: currentUser } = useAuth();
  
  // Selectors
  const classroomsLoading = useAppSelector(selectClassroomsStatus) === 'loading';
  const classroomsError = useAppSelector(selectClassroomsError);
  const createStatus = useAppSelector(selectCreateClassroomStatus);
  const createError = useAppSelector(selectCreateClassroomError);
  const currentClassroom = useAppSelector(selectCurrentClassroom);

  // Get user's roles and filter classrooms based on role
  const userRoles = currentUser?.roles || [];
  const userCanManage = userRoles.includes('admin') || userRoles.includes('instructor');
  const filteredClassrooms = useAppSelector(state => 
    selectClassroomsForUser(state, currentUser?.id || 0, userRoles)
  );

  // Fetch classrooms when component mounts or when switching to relevant tabs
  useEffect(() => {
    if (activeSubTab === 2 && userCanManage) { // Classroom Admin tab
      dispatch(fetchClassrooms());
    }
  }, [activeSubTab, dispatch, userCanManage]);

  // Handle classroom selection for roster view
  const handleClassroomSelection = (classroomId: string) => {
    setSelectedClassroomId(classroomId);
    if (classroomId) {
      dispatch(fetchClassroomById(parseInt(classroomId)));
    }
  };

  // Handle successful creation and cleanup
  useEffect(() => {
    if (createStatus === 'succeeded') {
      // Don't clear the status immediately so the UI can show the success state
      // The status will be cleared when user creates another classroom
      // Refresh classrooms list if we're on that tab
      if (activeSubTab === 2) {
        dispatch(fetchClassrooms());
      }
    }
  }, [createStatus, activeSubTab, dispatch]);

  const handleSubTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveSubTab(newValue);
  };

  const handleFormChange = (field: keyof ClassroomCreate) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const handleCreateSubmit = async () => {
    if (!formData.name.trim()) {
      return;
    }
    
    // Validate dates
    if (!formData.start_date || !formData.end_date) {
      return;
    }
    
    if (new Date(formData.end_date) <= new Date(formData.start_date)) {
      return;
    }
    
    const result = await dispatch(createClassroom({
      name: formData.name.trim(),
      description: formData.description?.trim() || undefined,
      start_date: formData.start_date,
      end_date: formData.end_date
    }));
    
    // If classroom was created successfully, capture the ID
    if (createClassroom.fulfilled.match(result)) {
      setCreatedClassroomId(result.payload.id);
    }
  };

  const handleCopyJoinLink = async (classroomId: number) => {
    const joinLink = `${window.location.origin}/join-classroom?classroom_id=${classroomId}`;
    try {
      await navigator.clipboard.writeText(joinLink);
      setCopyFeedback('Join link copied to clipboard!');
      setTimeout(() => setCopyFeedback(null), 3000);
    } catch (err) {
      console.error('Failed to copy link:', err);
      setCopyFeedback('Failed to copy link');
      setTimeout(() => setCopyFeedback(null), 3000);
    }
  };

  const handleNewClassroom = () => {
    setFormData({ 
      name: '', 
      description: '',
      start_date: '', // No default value
      end_date: ''    // No default value
    });
    setCreatedClassroomId(null);
    dispatch(clearCreateStatus());
  };

  const handleOpenAddStudentModal = () => {
    setIsAddStudentModalOpen(true);
  };

  const handleCloseAddStudentModal = () => {
    setIsAddStudentModalOpen(false);
  };

  const handleStudentAdded = (user: User) => {
    // Set the newly added student for highlighting
    setNewlyAddedStudentId(user.id);
    
    // Show success message
    setSuccessMessage(`${user.first_name} ${user.last_name} has been added to the classroom!`);
    
    // Refresh the classroom data to show the new student, but delay it
    // to avoid interfering with the modal's closing animation
    setTimeout(() => {
      if (selectedClassroomId) {
        dispatch(fetchClassroomById(parseInt(selectedClassroomId)));
      }
    }, 100);
    
    // Clear highlighting and success message after 3 seconds
    setTimeout(() => {
      setNewlyAddedStudentId(null);
      setSuccessMessage(null);
    }, 3000);
  };

  const handleOpenRemoveDialog = (member: any) => {
    setStudentToRemove({
      id: member.id,
      name: formatMemberName(member),
      email: member.email || ''
    });
    setIsRemoveStudentDialogOpen(true);
  };

  const handleCloseRemoveDialog = () => {
    setIsRemoveStudentDialogOpen(false);
    setStudentToRemove(null);
  };

  const handleConfirmRemove = async () => {
    if (!studentToRemove || !selectedClassroomId) return;

    try {
      await dispatch(removeUserFromClassroom({
        classroomId: parseInt(selectedClassroomId),
        userId: studentToRemove.id
      })).unwrap();

      // Show success message
      setSuccessMessage(`${studentToRemove.name} has been removed from the classroom.`);

      // Refresh classroom data
      setTimeout(() => {
        if (selectedClassroomId) {
          dispatch(fetchClassroomById(parseInt(selectedClassroomId)));
        }
      }, 100);

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error) {
      setSuccessMessage(`Failed to remove student: ${error}`);
      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
    }
  };

  const isCreateFormValid = formData.name.trim().length > 0 && 
                           formData.start_date && 
                           formData.end_date && 
                           new Date(formData.end_date) > new Date(formData.start_date);

  // Memoize existing member IDs to prevent unnecessary re-renders of search component
  const existingMemberIds = useMemo(() => 
    currentClassroom?.members?.map(m => m.id) || [],
    [currentClassroom?.members]
  );

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Manage Classrooms
      </Typography>
      
      <Box sx={{ display: 'flex', flexGrow: 1 }}>
        {/* Sub-tabs for different classroom management functions */}
        <Box sx={{ borderRight: 1, borderColor: 'divider', minWidth: '200px' }}>
          <Tabs 
            orientation="vertical"
            value={activeSubTab} 
            onChange={handleSubTabChange} 
            aria-label="Classroom management tabs"
            sx={{
              '& .MuiTab-root': {
                alignItems: 'flex-start',
                textAlign: 'left',
                paddingLeft: 2
              }
            }}
          >
            <Tab label="Overview" {...a11yPropsSubTab(0)} />
            {userCanManage && <Tab label="Create Classroom" {...a11yPropsSubTab(1)} />}
            {userCanManage && <Tab label="Classroom Admin" {...a11yPropsSubTab(2)} />}
          </Tabs>
        </Box>

        {/* Tab content area */}
        <Box sx={{ flexGrow: 1 }}>
          {/* Overview Tab */}
          <SubTabPanel value={activeSubTab} index={0}>
            <Typography variant="h5" component="h2" gutterBottom>
              Classroom Management Overview
            </Typography>
            
            {userCanManage ? (
              <Box>
                <Typography variant="body1" sx={{ mb: 3 }}>
                  Manage classrooms for organizing students and course content.
                </Typography>
                
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" component="h3" gutterBottom>
                    Available Features
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 1 }}>
                    • <strong>Create Classroom:</strong> Set up new classrooms with names and descriptions
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 1 }}>
                    • <strong>Classroom Admin:</strong> View and manage classrooms
                  </Typography>
                </Box>
              </Box>
            ) : (
              <Alert severity="info">
                You need admin or instructor permissions to manage classrooms.
              </Alert>
            )}
          </SubTabPanel>

          {/* Create Classroom Tab */}
          {userCanManage && (
            <SubTabPanel value={activeSubTab} index={1}>
              <Typography variant="h5" component="h2" gutterBottom>
                Create Classroom
              </Typography>
              
              <Typography variant="body1" sx={{ mb: 3 }}>
                Create a new classroom to organize students and course materials.
              </Typography>

              {/* Create Classroom Form */}
              <Box component="form" sx={{ maxWidth: 500 }}>
                <TextField
                  fullWidth
                  label="Classroom Name"
                  value={formData.name}
                  onChange={handleFormChange('name')}
                  sx={{ mb: 2 }}
                  error={formData.name.trim() === '' && formData.name !== ''}
                  helperText={formData.name.trim() === '' && formData.name !== '' ? 'Classroom name is required' : ''}
                />
                <TextField
                  fullWidth
                  label="Description"
                  value={formData.description}
                  onChange={handleFormChange('description')}
                  multiline
                  rows={3}
                  placeholder="Optional description of the classroom"
                  sx={{ mb: 2 }}
                />
                
                <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                  <TextField
                    label="Start Date"
                    type="date"
                    value={formData.start_date}
                    onChange={handleFormChange('start_date')}
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ 
                      min: '2025-09-17' // Sets the minimum selectable date to today, helps picker open to current month
                    }}
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    label="End Date"
                    type="date"
                    value={formData.end_date}
                    onChange={handleFormChange('end_date')}
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ 
                      min: '2025-09-17' // Sets the minimum selectable date to today, helps picker open to current month
                    }}
                    sx={{ flex: 1 }}
                  />
                </Box>
                
                {createError && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {createError}
                  </Alert>
                )}

                {createStatus === 'succeeded' && (
                  <Alert severity="success" sx={{ mb: 2 }}>
                    Classroom "{formData.name}" created successfully!
                  </Alert>
                )}

                {/* Share with Students Section */}
                {createStatus === 'succeeded' && createdClassroomId && (
                  <Box sx={{ mb: 3, p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
                    <Typography variant="h6" component="h3" gutterBottom>
                      Share with Students
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                      Share this link with students so they can join your classroom. 
                      <strong> Note:</strong> Join links expire 2 weeks after the classroom start date.
                    </Typography>
                    <TextField
                      fullWidth
                      value={`${window.location.origin}/join-classroom?classroom_id=${createdClassroomId}`}
                      InputProps={{
                        readOnly: true,
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => handleCopyJoinLink(createdClassroomId)}
                              edge="end"
                              title="Copy join link"
                            >
                              <ContentCopy />
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                      sx={{ mb: 1 }}
                    />
                  </Box>
                )}

                <CreateButton
                  variant="contained"
                  onClick={createStatus === 'succeeded' ? handleNewClassroom : handleCreateSubmit}
                  disabled={(!isCreateFormValid || createStatus === 'loading') && createStatus !== 'succeeded'}
                  startIcon={createStatus === 'loading' ? <CircularProgress size={16} /> : undefined}
                  sx={{ mr: 2 }}
                >
                  {createStatus === 'loading' ? 'Creating...' : 
                   createStatus === 'succeeded' ? 'Create Another Classroom' : 'Create Classroom'}
                </CreateButton>

                {createStatus !== 'succeeded' && (
                  <Button
                    variant="outlined"
                    onClick={() => setFormData({ 
                      name: '', 
                      description: '',
                      start_date: '', // No default value
                      end_date: ''    // No default value
                    })}
                    disabled={createStatus === 'loading'}
                  >
                    Clear Form
                  </Button>
                )}
              </Box>
            </SubTabPanel>
          )}

          {/* Classroom Admin Tab */}
          {userCanManage && (
            <SubTabPanel value={activeSubTab} index={2}>
              <Typography variant="h5" component="h2" gutterBottom>
                Class Roster
              </Typography>
              
              <Typography variant="body1" sx={{ mb: 3 }}>
                Select a classroom to view its student roster.
              </Typography>

              {/* Error Display */}
              {classroomsError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {classroomsError}
                </Alert>
              )}

              {/* Classroom Selection Dropdown */}
              <Box sx={{ mb: 3, maxWidth: 400 }}>
                <FormControl fullWidth>
                  <InputLabel id="classroom-select-label">Select Classroom</InputLabel>
                  <Select
                    labelId="classroom-select-label"
                    value={selectedClassroomId}
                    label="Select Classroom"
                    onChange={(e) => handleClassroomSelection(e.target.value as string)}
                    disabled={classroomsLoading}
                  >
                    <MenuItem value="">
                      <em>Select a classroom...</em>
                    </MenuItem>
                    {filteredClassrooms.map((classroom) => (
                      <MenuItem key={classroom.id} value={classroom.id.toString()}>
                        {classroom.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              {/* Class Roster Table */}
              {selectedClassroomId && currentClassroom && (
                <>
                  <Typography variant="h6" component="h3" gutterBottom>
                    {currentClassroom.name} ({currentClassroom.start_date ? formatDateOnly(currentClassroom.start_date) : 'N/A'}-{currentClassroom.end_date ? formatDateOnly(currentClassroom.end_date) : 'N/A'})
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Instructor: {(() => {
                      const instructor = currentClassroom.members?.find(m => m.id === currentClassroom.created_by_id);
                      return instructor ? formatMemberName(instructor) : 'Unknown';
                    })()}
                  </Typography>
                  
                  {/* Join Link Section */}
                  <Box sx={{ 
                    mb: 3, 
                    p: 2, 
                    border: '1px solid', 
                    borderColor: isJoinLinkExpired(currentClassroom) ? 'warning.main' : 'primary.main',
                    borderRadius: 2,
                    backgroundColor: isJoinLinkExpired(currentClassroom) ? 'warning.50' : 'primary.50'
                  }}>
                    <Typography variant="h6" component="h4" sx={{ mb: 1, color: isJoinLinkExpired(currentClassroom) ? 'warning.dark' : 'primary.dark' }}>
                      <Link sx={{ verticalAlign: 'middle', mr: 0.5 }} /> Classroom Join Link
                    </Typography>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Typography variant="body2" sx={{ 
                        fontFamily: 'monospace',
                        backgroundColor: 'grey.100',
                        p: 1,
                        borderRadius: 1,
                        flex: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {`${window.location.origin}/join-classroom?classroom_id=${currentClassroom.id}`}
                      </Typography>
                      <IconButton 
                        onClick={() => handleCopyJoinLink(currentClassroom.id)}
                        size="small"
                        title="Copy join link"
                        sx={{ color: isJoinLinkExpired(currentClassroom) ? 'warning.dark' : 'primary.dark' }}
                      >
                        <ContentCopy />
                      </IconButton>
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {isJoinLinkExpired(currentClassroom) ? (
                        <span style={{ color: '#f57c00' }}>
                          <strong>⚠️ Expired:</strong> This join link expired on {getJoinLinkExpirationDate(currentClassroom)}
                        </span>
                      ) : (
                        <span>
                          <strong>Expires:</strong> {getJoinLinkExpirationDate(currentClassroom)} (2 weeks after start date)
                        </span>
                      )}
                    </Typography>
                    
                    <Typography variant="body2" color="text.secondary">
                      💡 <em>Join links expire automatically 2 weeks after start date, but you can always add students using the "Add Student" button below.</em>
                    </Typography>
                    
                    {copyFeedback && (
                      <Alert severity={copyFeedback.includes('Failed') ? 'error' : 'success'} sx={{ mt: 1 }}>
                        {copyFeedback}
                      </Alert>
                    )}
                  </Box>
                  
                  {/* Success Message */}
                  {successMessage && (
                    <Alert severity="success" sx={{ mb: 2 }}>
                      {successMessage}
                    </Alert>
                  )}
                  
                  {/* Add Student Button or End Message */}
                  <Box sx={{ mb: 3 }}>
                    {isClassroomEnded(currentClassroom) ? (
                      <Alert severity="info" sx={{ mb: 2 }}>
                        Students can no longer be added because the class ended on {currentClassroom.end_date ? formatDateOnly(currentClassroom.end_date) : 'N/A'}.
                      </Alert>
                    ) : (
                      <Button
                        variant="contained"
                        startIcon={<PersonAdd />}
                        onClick={handleOpenAddStudentModal}
                        sx={{
                          backgroundColor: '#2C656B',
                          color: 'white',
                          '&:hover': {
                            backgroundColor: '#004d2d',
                          },
                        }}
                      >
                        Add Student
                      </Button>
                    )}
                  </Box>
                  
                  {currentClassroom.members && currentClassroom.members.length > 0 ? (
                    <TableContainer component={Paper} sx={{ mt: 2 }}>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell><strong>Student Name</strong></TableCell>
                            <TableCell><strong>Email</strong></TableCell>
                            <TableCell><strong>Joined Date</strong></TableCell>
                            <TableCell align="right"><strong>Actions</strong></TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {currentClassroom.members
                            .filter((member) => member.id !== currentClassroom.created_by_id)
                            .map((member) => (
                            <TableRow 
                              key={member.id}
                              sx={{
                                backgroundColor: newlyAddedStudentId === member.id ? '#e8f5e8' : 'inherit',
                                transition: 'background-color 0.3s ease'
                              }}
                            >
                              <TableCell>
                                {formatMemberName(member)}
                              </TableCell>
                              <TableCell>
                                {member.email ? (
                                  <a 
                                    href={`mailto:${member.email}`}
                                    style={{ textDecoration: 'none', color: '#2C656B' }}
                                  >
                                    {member.email}
                                  </a>
                                ) : (
                                  '-'
                                )}
                              </TableCell>
                              <TableCell>
                                {member.joined_at ? formatDate(member.joined_at) : '-'}
                              </TableCell>
                              <TableCell align="right">
                                <IconButton
                                  size="small"
                                  onClick={() => handleOpenRemoveDialog(member)}
                                  sx={{ 
                                    color: 'error.main',
                                    '&:hover': {
                                      backgroundColor: 'error.light',
                                      color: 'white'
                                    }
                                  }}
                                  title="Remove student from classroom"
                                >
                                  <Delete fontSize="small" />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      No students have joined this classroom yet.
                    </Alert>
                  )}
                </>
              )}

              {/* Loading State for Classroom Details */}
              {selectedClassroomId && !currentClassroom && (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                  <CircularProgress />
                  <Typography sx={{ ml: 2 }}>Loading classroom roster...</Typography>
                </Box>
              )}
            </SubTabPanel>
          )}
        </Box>
      </Box>
      
      {/* Add Student Modal */}
      {selectedClassroomId && (
        <AddStudentModal
          key={`add-student-modal-${selectedClassroomId}`}
          open={isAddStudentModalOpen}
          onClose={handleCloseAddStudentModal}
          classroomId={parseInt(selectedClassroomId)}
          classroomName={currentClassroom?.name || ''}
          existingMemberIds={existingMemberIds}
          onStudentAdded={handleStudentAdded}
        />
      )}

      {/* Remove Student Dialog */}
      {selectedClassroomId && studentToRemove && (
        <RemoveStudentDialog
          open={isRemoveStudentDialogOpen}
          onClose={handleCloseRemoveDialog}
          onConfirm={handleConfirmRemove}
          studentName={studentToRemove.name}
          studentEmail={studentToRemove.email}
          classroomId={parseInt(selectedClassroomId)}
          studentId={studentToRemove.id}
          classroomName={currentClassroom?.name || ''}
        />
      )}
    </Box>
  );
};

export default ManageClassrooms;