import React from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemText,
  Button,
  Paper,
  CircularProgress
} from '@mui/material';
import { Person } from '@mui/icons-material';
import { useAppSelector } from '../../../store/hooks';
import { 
  selectFilteredUsers,
  selectUsersStatus,
  User 
} from '../../../store/slice/usersSlice';
import UserSearchBar from './UserSearchBar';

interface UserSearchWithResultsProps {
  placeholder?: string;
  existingUserIds?: number[];
  onUserAdd: (user: User) => void;
  addingUserId?: number; // ID of user currently being added (for loading state)
}

const UserSearchWithResults: React.FC<UserSearchWithResultsProps> = ({
  placeholder = "Search users by name...",
  existingUserIds = [],
  onUserAdd,
  addingUserId
}) => {
  const filteredUsers = useAppSelector(selectFilteredUsers);
  const usersStatus = useAppSelector(selectUsersStatus);

  // Filter out users who are already in the classroom
  const availableUsers = filteredUsers.filter(user => 
    !existingUserIds.includes(user.id)
  );

  const isLoading = usersStatus === 'loading';

  return (
    <Box>
      <UserSearchBar 
        placeholder={placeholder}
        onSearchChange={() => {}} // No need to track search term here
      />
      
      {/* Search Results - Only show if we have results and not loading */}
      {!isLoading && availableUsers.length > 0 && (
        <Paper variant="outlined" sx={{ mt: 2, maxHeight: 300, overflow: 'auto' }}>
          <List dense>
            {availableUsers.map((user) => (
              <ListItem
                key={user.id}
                divider
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                  <Person color="action" sx={{ mr: 1 }} />
                  <ListItemText
                    primary={`${user.first_name} ${user.last_name}`}
                    secondary={user.email}
                  />
                </Box>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => onUserAdd(user)}
                  disabled={addingUserId === user.id}
                  sx={{
                    borderColor: '#2C656B',
                    color: '#2C656B',
                    '&:hover': {
                      borderColor: '#004d2d',
                      backgroundColor: '#f0f8f5',
                    },
                    minWidth: 80
                  }}
                >
                  {addingUserId === user.id ? (
                    <CircularProgress size={16} />
                  ) : (
                    'Add'
                  )}
                </Button>
              </ListItem>
            ))}
          </List>
        </Paper>
      )}
    </Box>
  );
};

export default UserSearchWithResults;