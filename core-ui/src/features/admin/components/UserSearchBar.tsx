import React, { useState, useEffect } from 'react';
import { 
  TextField, 
  InputAdornment, 
  IconButton, 
  Box, 
  Typography 
} from '@mui/material';
import { Search, Clear } from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { 
  searchUsers, 
  fetchUsers, 
  selectUsersStatus,
  selectFilteredUsers 
} from '../../../store/slice/usersSlice';

interface UserSearchBarProps {
  placeholder?: string;
  onSearchChange?: (searchTerm: string) => void;
}

const UserSearchBar: React.FC<UserSearchBarProps> = ({
  placeholder = "Search users by name...",
  onSearchChange
}) => {
  const dispatch = useAppDispatch();
  const usersStatus = useAppSelector(selectUsersStatus);
  const filteredUsers = useAppSelector(selectFilteredUsers);
  
  // Keep search state completely local - no Redux sync
  const [localSearchTerm, setLocalSearchTerm] = useState('');

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      // If we have a search term, search on the server
      if (localSearchTerm.trim()) {
        dispatch(searchUsers(localSearchTerm.trim()));
      } else {
        // If search is cleared, fetch all users
        dispatch(fetchUsers());
      }
      
      // Call the callback if provided
      if (onSearchChange) {
        onSearchChange(localSearchTerm);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [localSearchTerm, dispatch, onSearchChange]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setLocalSearchTerm(event.target.value);
  };

  const handleClearSearch = () => {
    setLocalSearchTerm('');
  };

  const isLoading = usersStatus === 'loading';

  return (
    <Box sx={{ mb: 3 }}>
      <TextField
        fullWidth
        variant="outlined"
        placeholder={placeholder}
        value={localSearchTerm}
        onChange={handleSearchChange}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search color={isLoading ? "disabled" : "action"} />
            </InputAdornment>
          ),
          endAdornment: localSearchTerm && (
            <InputAdornment position="end">
              <IconButton
                onClick={handleClearSearch}
                edge="end"
                size="small"
              >
                <Clear />
              </IconButton>
            </InputAdornment>
          ),
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            '&:hover fieldset': {
              borderColor: '#00693e',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#00693e',
            },
          },
        }}
      />
      
      {/* Search results count */}
      {localSearchTerm && (
        <Typography 
          variant="caption" 
          color="text.secondary" 
          sx={{ mt: 1, display: 'block' }}
        >
          {isLoading 
            ? 'Searching...' 
            : `${filteredUsers.length} user${filteredUsers.length !== 1 ? 's' : ''} found`
          }
        </Typography>
      )}
    </Box>
  );
};

export default UserSearchBar;
