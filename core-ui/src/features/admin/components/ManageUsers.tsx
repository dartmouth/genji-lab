import React, { useState, useEffect } from 'react';
import { Tabs, Tab, Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip } from '@mui/material';
import { styled } from '@mui/material/styles';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { fetchUsers, selectAllUsers, selectUsersStatus, selectUsersError, User } from '../../../store/slice/usersSlice';

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
      id={`manage-subtabpanel-${index}`}
      aria-labelledby={`manage-subtab-${index}`}
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
    id: `manage-subtab-${index}`,
    'aria-controls': `manage-subtabpanel-${index}`,
  };
}

// Styled components
const StyledForm = styled('form')(({ theme }) => ({
  '& .form-group': {
    marginBottom: theme.spacing(2),
    display: 'flex',
    flexDirection: 'column',
  },
  '& label': {
    marginBottom: theme.spacing(0.5),
  },
  '& input, & select': {
    padding: theme.spacing(1),
    borderRadius: theme.shape.borderRadius,
    border: `1px solid ${theme.palette.divider}`,
  },
  '& .MuiFormControl-root': {
    marginBottom: theme.spacing(2),
  },
  '& button': {
    marginTop: theme.spacing(2),
    padding: theme.spacing(1, 2),
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    border: 'none',
    borderRadius: theme.shape.borderRadius,
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: theme.palette.primary.dark,
    },
    '&:disabled': {
      opacity: 0.5,
      cursor: 'not-allowed',
      backgroundColor: theme.palette.action.disabled,
    },
  },
  '& .delete-button': {
    backgroundColor: theme.palette.error.main,
    '&:hover': {
      backgroundColor: theme.palette.error.dark,
    },
  },
}));

// User interface based on the API response - using the same interface from the slice

const ManageUsers: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<number>(0);
  const dispatch = useAppDispatch();
  
  // Use Redux selectors instead of local state
  const users = useAppSelector(selectAllUsers);
  const loading = useAppSelector(selectUsersStatus) === 'loading';
  const error = useAppSelector(selectUsersError);

  // Fetch users when Update Roles tab is selected
  useEffect(() => {
    if (activeSubTab === 1) {
      dispatch(fetchUsers());
    }
  }, [activeSubTab, dispatch]);

  const handleSubTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveSubTab(newValue);
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Manage Users
      </Typography>
      
      <Box sx={{ display: 'flex', flexGrow: 1 }}>
        {/* Sub-tabs for different user management functions */}
        <Box sx={{ borderRight: 1, borderColor: 'divider', minWidth: '200px' }}>
          <Tabs 
            orientation="vertical"
            value={activeSubTab} 
            onChange={handleSubTabChange} 
            aria-label="User management tabs"
            sx={{
              '& .MuiTab-root': {
                alignItems: 'flex-start',
                textAlign: 'left',
                paddingLeft: 2
              }
            }}
          >
            <Tab label="Overview" {...a11yPropsSubTab(0)} />
            <Tab label="Update Roles" {...a11yPropsSubTab(1)} />
          </Tabs>
        </Box>

        {/* Tab content area */}
        <Box sx={{ flexGrow: 1 }}>
          {/* Overview Tab */}
          <SubTabPanel value={activeSubTab} index={0}>
            <Typography variant="h5" component="h2" gutterBottom>
              User Management Overview
            </Typography>
            <div>
              <p>Features for managing users.</p>
            </div>
          </SubTabPanel>

          {/* Update Roles Tab */}
          <SubTabPanel value={activeSubTab} index={1}>
            <Typography variant="h5" component="h2" gutterBottom>
              Update User Roles
            </Typography>
            
            {error && (
              <Box sx={{ mb: 2, p: 2, bgcolor: 'error.light', color: 'error.contrastText', borderRadius: 1 }}>
                {error}
              </Box>
            )}
            
            {loading ? (
              <Typography>Loading users...</Typography>
            ) : (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Name</strong></TableCell>
                      <TableCell><strong>Email</strong></TableCell>
                      <TableCell><strong>Current Roles</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {users.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} align="center">
                          No users found
                        </TableCell>
                      </TableRow>
                    ) : (
                      users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            {user.last_name}, {user.first_name}
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            {user.roles && user.roles.length > 0 ? (
                              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                {user.roles.map((role) => (
                                  <Chip 
                                    key={role.id} 
                                    label={role.name} 
                                    size="small" 
                                    variant="outlined"
                                  />
                                ))}
                              </Box>
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                No roles assigned
                              </Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </SubTabPanel>
        </Box>
      </Box>
    </Box>
  );
};

export default ManageUsers;
