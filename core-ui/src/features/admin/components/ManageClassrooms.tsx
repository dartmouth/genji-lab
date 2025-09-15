import React, { useState, useEffect } from 'react';
import { 
  Tabs, Tab, Box, Typography, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Paper, Button, TextField, 
  CircularProgress, Alert 
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { 
  fetchClassrooms, 
  createClassroom,
  selectClassroomsStatus,
  selectClassroomsError,
  selectCreateClassroomStatus,
  selectCreateClassroomError,
  selectClassroomsForUser,
  clearCreateStatus,
  type ClassroomCreate
} from '../../../store/slice/classroomsSlice';
import { useAuth } from '../../../hooks/useAuthContext';

// Utility function to format dates
const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString();
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
  backgroundColor: '#00693e',
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
    description: ''
  });
  
  const dispatch = useAppDispatch();
  const { user: currentUser } = useAuth();
  
  // Selectors
  const classroomsLoading = useAppSelector(selectClassroomsStatus) === 'loading';
  const classroomsError = useAppSelector(selectClassroomsError);
  const createStatus = useAppSelector(selectCreateClassroomStatus);
  const createError = useAppSelector(selectCreateClassroomError);

  // Get user's roles and filter classrooms based on role
  const userRoles = currentUser?.roles || [];
  const userCanManage = userRoles.includes('admin') || userRoles.includes('instructor');
  const filteredClassrooms = useAppSelector(state => 
    selectClassroomsForUser(state, currentUser?.id || 0, userRoles)
  );

  // Fetch classrooms when component mounts or when switching to relevant tabs
  useEffect(() => {
    if (activeSubTab === 2 && userCanManage) { // List Classrooms tab
      dispatch(fetchClassrooms());
    }
  }, [activeSubTab, dispatch, userCanManage]);

  // Handle successful creation and cleanup
  useEffect(() => {
    if (createStatus === 'succeeded') {
      setFormData({ name: '', description: '' });
      dispatch(clearCreateStatus());
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
    
    dispatch(createClassroom({
      name: formData.name.trim(),
      description: formData.description?.trim() || undefined
    }));
  };

  const isCreateFormValid = formData.name.trim().length > 0;

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
            {userCanManage && <Tab label="List Classrooms" {...a11yPropsSubTab(2)} />}
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
                    • <strong>List Classrooms:</strong> View and manage your classrooms
                  </Typography>
                  {userRoles.includes('admin') && (
                    <Typography variant="body1" sx={{ mb: 1 }}>
                      • <strong>Admin View:</strong> As an admin, you can see all classrooms
                    </Typography>
                  )}
                  {userRoles.includes('instructor') && !userRoles.includes('admin') && (
                    <Typography variant="body1" sx={{ mb: 1 }}>
                      • <strong>Instructor View:</strong> You can see and manage only your own classrooms
                    </Typography>
                  )}
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
                  sx={{ mb: 3 }}
                />
                
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

                <CreateButton
                  variant="contained"
                  onClick={handleCreateSubmit}
                  disabled={!isCreateFormValid || createStatus === 'loading'}
                  startIcon={createStatus === 'loading' ? <CircularProgress size={16} /> : undefined}
                  sx={{ mr: 2 }}
                >
                  {createStatus === 'loading' ? 'Creating...' : 'Create Classroom'}
                </CreateButton>

                <Button
                  variant="outlined"
                  onClick={() => setFormData({ name: '', description: '' })}
                  disabled={createStatus === 'loading'}
                >
                  Clear Form
                </Button>
              </Box>
            </SubTabPanel>
          )}

          {/* List Classrooms Tab */}
          {userCanManage && (
            <SubTabPanel value={activeSubTab} index={2}>
              <Typography variant="h5" component="h2" gutterBottom>
                {userRoles.includes('admin') ? 'All Classrooms' : 'My Classrooms'}
              </Typography>
              
              {/* Error Display */}
              {classroomsError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {classroomsError}
                </Alert>
              )}
              
              {/* Classrooms Table */}
              {classroomsLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                  <CircularProgress />
                  <Typography sx={{ ml: 2 }}>Loading classrooms...</Typography>
                </Box>
              ) : (
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Name</strong></TableCell>
                        <TableCell><strong>Description</strong></TableCell>
                        <TableCell><strong>Members</strong></TableCell>
                        <TableCell><strong>Created</strong></TableCell>
                        <TableCell><strong>Actions</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredClassrooms.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} align="center">
                            No classrooms found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredClassrooms.map((classroom) => (
                          <TableRow key={classroom.id}>
                            <TableCell>{classroom.name}</TableCell>
                            <TableCell>{classroom.description || '-'}</TableCell>
                            <TableCell>{classroom.member_count}</TableCell>
                            <TableCell>{formatDate(classroom.created_at)}</TableCell>
                            <TableCell>
                              <Button size="small" variant="outlined">
                                Manage
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </SubTabPanel>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default ManageClassrooms;