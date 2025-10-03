import React, { useState, useEffect } from 'react';
import { 
  Tabs, Tab, Box, Typography, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Paper, Chip, Button, 
  CircularProgress, Alert, Tooltip 
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { fetchUsers, selectFilteredUsers, selectUsersStatus, selectUsersError, updateUserRoles } from '../../../store/slice/usersSlice';
import { fetchRoles, selectAllRoles, selectRolesStatus, selectRolesError } from '../../../store/slice/rolesSlice';
import { useAuth } from '../../../hooks/useAuthContext';
import UserSearchBar from './UserSearchBar';

// Utility function to format role names for display
const formatRoleName = (roleName: string): string => {
  return roleName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
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
const RoleChip = styled(Chip, {
  shouldForwardProp: (prop) => prop !== 'assigned',
})<{ assigned?: boolean }>(({ theme, assigned }) => ({
  margin: theme.spacing(0.25),
  cursor: 'pointer',
  ...(assigned ? {
    backgroundColor: '#00693e',
    color: 'white',
    '&:hover': {
      backgroundColor: '#004d2d',
    },
    '& .MuiChip-deleteIcon': {
      color: 'white',
      '&:hover': {
        color: '#cccccc',
      },
    },
  } : {
    backgroundColor: 'transparent',
    color: '#00693e',
    border: `1px solid #00693e`,
    '&:hover': {
      backgroundColor: '#f0f8f5',
    },
  }),
}));

const SaveButton = styled(Button)(({ theme }) => ({
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

// User interface based on the API response - using the same interface from the slice

const ManageUsers: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<number>(0);
  const [userRoleChanges, setUserRoleChanges] = useState<{ [userId: number]: number[] }>({});
  const [userSavedRoles, setUserSavedRoles] = useState<{ [userId: number]: number[] }>({});
  const [savingUsers, setSavingUsers] = useState<{ [userId: number]: boolean }>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const dispatch = useAppDispatch();
  const { user: currentUser } = useAuth();
  
  // User selectors
  const users = useAppSelector(selectFilteredUsers);
  const usersLoading = useAppSelector(selectUsersStatus) === 'loading';
  const usersError = useAppSelector(selectUsersError);
  
  // Role selectors
  const roles = useAppSelector(selectAllRoles);
  const rolesLoading = useAppSelector(selectRolesStatus) === 'loading';
  const rolesError = useAppSelector(selectRolesError);

  // Fetch users and roles when Update Roles tab is selected
  useEffect(() => {
    if (activeSubTab === 1) {
      dispatch(fetchUsers());
      dispatch(fetchRoles());
    }
  }, [activeSubTab, dispatch]);

  // Initialize user role changes when users change
  useEffect(() => {
    const initialChanges: { [userId: number]: number[] } = {};
    users.forEach(user => {
      initialChanges[user.id] = user.roles?.map(role => role.id) || [];
    });
    
    setUserRoleChanges(prevChanges => {
      // Only update if we don't have any existing changes or if it's the first load
      if (Object.keys(prevChanges).length === 0) {
        // Also initialize the saved roles state
        setUserSavedRoles(initialChanges);
        return initialChanges;
      }
      // Otherwise, keep existing changes but add any new users
      const updated = { ...prevChanges };
      users.forEach(user => {
        if (!(user.id in updated)) {
          updated[user.id] = user.roles?.map(role => role.id) || [];
        }
      });
      return updated;
    });
  }, [users]);

  const handleRoleToggle = (userId: number, roleId: number) => {
    // Find the role being toggled
    const role = roles.find(r => r.id === roleId);
    
    // Prevent users from removing their own admin role
    if (currentUser && 
        currentUser.id === userId && 
        role?.name === 'admin' && 
        (userRoleChanges[userId] || []).includes(roleId)) {
      // Show a brief alert or just prevent the action
      return;
    }

    setUserRoleChanges(prev => {
      const currentRoles = prev[userId] || [];
      const hasRole = currentRoles.includes(roleId);
      
      if (hasRole) {
        // Remove role
        return {
          ...prev,
          [userId]: currentRoles.filter(id => id !== roleId)
        };
      } else {
        // Add role
        return {
          ...prev,
          [userId]: [...currentRoles, roleId]
        };
      }
    });
  };

  // Check if removing a role should be disabled (prevent self-lockout)
  const isRoleRemovalDisabled = (userId: number, roleId: number) => {
    const role = roles.find(r => r.id === roleId);
    return (currentUser && 
            currentUser.id === userId && 
            role?.name === 'admin' && 
            (userRoleChanges[userId] || []).includes(roleId));
  };

  const hasChanges = (userId: number) => {
    // Use our saved roles state instead of the Redux store data
    const originalRoles = (userSavedRoles[userId] || []).sort();
    const currentRoles = (userRoleChanges[userId] || []).sort();
    
    return JSON.stringify(originalRoles) !== JSON.stringify(currentRoles);
  };

  const handleSaveUserRoles = async (userId: number) => {
    const roleIds = userRoleChanges[userId] || [];
    const user = users.find(u => u.id === userId);
    
    setSavingUsers(prev => ({ ...prev, [userId]: true }));
    
    try {
      const result = await dispatch(updateUserRoles({ id: userId, roleIds })).unwrap();
      
      // Get the saved roles from the result
      const newRoles = result.roles?.map(role => role.id) || roleIds;
      
      // Update both the current changes and the saved state to match
      setUserRoleChanges(prev => ({
        ...prev,
        [userId]: newRoles
      }));
      
      setUserSavedRoles(prev => ({
        ...prev,
        [userId]: newRoles
      }));
      
      // Show success message
      setSuccessMessage(`Successfully updated roles for ${user?.first_name} ${user?.last_name}`);
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      // Error handling is done by the rejected action
      console.error('Failed to update user roles:', error);
    } finally {
      setSavingUsers(prev => ({ ...prev, [userId]: false }));
    }
  };

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
              <p>Features for managing users including managing roles and permissions.</p>
            </div>
          </SubTabPanel>

          {/* Update Roles Tab */}
          <SubTabPanel value={activeSubTab} index={1}>
            <Typography variant="h5" component="h2" gutterBottom>
              Update User Roles
            </Typography>

            {/* Role Information Panel */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" component="h3" gutterBottom>
                Available Roles
              </Typography>
              {rolesLoading ? (
                <CircularProgress size={20} />
              ) : rolesError ? (
                <Alert severity="error">{rolesError}</Alert>
              ) : (
                <Box sx={{ ml: 2 }}>
                  {roles.map((role) => (
                    <Typography key={role.id} variant="body1" sx={{ mb: 0.5 }}>
                      • <strong>{formatRoleName(role.name)}</strong>: {role.description || 'No description available'}
                    </Typography>
                  ))}
                </Box>
              )}
            </Box>
            
            {/* Success Message */}
            {successMessage && (
              <Alert severity="success" sx={{ mb: 2 }}>
                {successMessage}
              </Alert>
            )}
            
            {/* Error Display */}
            {usersError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {usersError}
              </Alert>
            )}
            
            {/* User Search Bar */}
            <UserSearchBar placeholder="Search users by name..." />
            
            {/* Users Table */}
            {usersLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                <CircularProgress />
                <Typography sx={{ ml: 2 }}>Loading users...</Typography>
              </Box>
            ) : (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Name</strong></TableCell>
                      <TableCell><strong>Roles</strong></TableCell>
                      <TableCell><strong>Actions</strong></TableCell>
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
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                              {roles.map((role) => {
                                const isAssigned = (userRoleChanges[user.id] || []).includes(role.id);
                                const isDisabled = isRoleRemovalDisabled(user.id, role.id);
                                
                                const chip = (
                                  <RoleChip
                                    key={role.id}
                                    label={formatRoleName(role.name)}
                                    assigned={isAssigned}
                                    onClick={() => !isDisabled && handleRoleToggle(user.id, role.id)}
                                    onDelete={isAssigned && !isDisabled ? () => handleRoleToggle(user.id, role.id) : undefined}
                                    deleteIcon={isAssigned ? undefined : undefined}
                                    sx={isDisabled ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
                                  />
                                );

                                // Wrap with tooltip if disabled
                                return isDisabled ? (
                                  <Tooltip key={role.id} title="Cannot remove your own admin role">
                                    <span>{chip}</span>
                                  </Tooltip>
                                ) : chip;
                              })}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <SaveButton
                              size="small"
                              disabled={!hasChanges(user.id) || savingUsers[user.id]}
                              onClick={() => handleSaveUserRoles(user.id)}
                              startIcon={savingUsers[user.id] ? <CircularProgress size={16} /> : undefined}
                            >
                              {savingUsers[user.id] ? 'Saving...' : 'Save'}
                            </SaveButton>
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
