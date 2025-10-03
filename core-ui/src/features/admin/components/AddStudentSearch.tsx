import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Button,
  Paper,
  CircularProgress,
  Typography
} from '@mui/material';
import { Search, Clear, Person } from '@mui/icons-material';
import { useAppDispatch } from '../../../store/hooks';
import { searchUsers, User } from '../../../store/slice/usersSlice';

interface AddStudentSearchProps {
  placeholder?: string;
  existingUserIds: number[];
  onUserAdd: (user: User) => void;
  addingUserId?: number;
}

const AddStudentSearch: React.FC<AddStudentSearchProps> = ({
  placeholder = "Search for students by name...",
  existingUserIds,
  onUserAdd,
  addingUserId
}) => {
  const dispatch = useAppDispatch();
  
  // Local state for this component only
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [allSearchResults, setAllSearchResults] = useState<User[]>([]);

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchTerm.trim()) {
        setIsLoading(true);
        setHasSearched(true);
        try {
          // Dispatch search and get the result
          const result = await dispatch(searchUsers(searchTerm.trim())).unwrap();
          // Store all results before filtering
          setAllSearchResults(result);
          // Filter out existing users
          const availableUsers = result.filter(user => 
            !existingUserIds.includes(user.id)
          );
          setSearchResults(availableUsers);
        } catch (error) {
          console.error('Search failed:', error);
          setSearchResults([]);
        } finally {
          setIsLoading(false);
        }
      } else {
        setSearchResults([]);
        setAllSearchResults([]);
        setHasSearched(false);
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, dispatch, existingUserIds]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setSearchResults([]);
    setAllSearchResults([]);
    setHasSearched(false);
  };

  const handleUserAdd = (user: User) => {
    onUserAdd(user);
    
    // Immediately remove the added user from search results
    const filteredResults = searchResults.filter(u => u.id !== user.id);
    setSearchResults(filteredResults);
    
    // If no more results, clear everything to avoid any "no users found" message
    if (filteredResults.length === 0) {
      setSearchTerm('');
      setSearchResults([]);
      setAllSearchResults([]);
      setHasSearched(false);
    }
  };

  return (
    <Box>
      {/* Search Input */}
      <TextField
        fullWidth
        variant="outlined"
        placeholder={placeholder}
        value={searchTerm}
        onChange={handleSearchChange}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search color={isLoading ? "disabled" : "action"} />
            </InputAdornment>
          ),
          endAdornment: searchTerm && (
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
          mb: 2,
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

      {/* Search Results */}
      {(searchResults.length > 0 || (hasSearched && !isLoading && searchTerm.trim())) && (
        <Paper 
          elevation={1} 
          sx={{ 
            maxHeight: 300, 
            overflow: 'auto',
            border: '1px solid',
            borderColor: 'divider'
          }}
        >
          {isLoading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress size={24} />
            </Box>
          ) : searchResults.length > 0 ? (
            <List dense>
              {searchResults.map((user) => (
                <ListItem 
                  key={user.id}
                  sx={{ 
                    borderBottom: '1px solid',
                    borderBottomColor: 'divider',
                    '&:last-child': {
                      borderBottom: 'none'
                    }
                  }}
                >
                  <ListItemText
                    primary={`${user.first_name || ''} ${user.last_name || ''}`.trim() || `User ${user.id}`}
                    secondary={user.email}
                    sx={{ flexGrow: 1 }}
                  />
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<Person />}
                    onClick={() => handleUserAdd(user)}
                    disabled={addingUserId === user.id}
                    sx={{
                      borderColor: '#00693e',
                      color: '#00693e',
                      '&:hover': {
                        borderColor: '#004d2d',
                        backgroundColor: 'rgba(0, 105, 62, 0.04)',
                      },
                    }}
                  >
                    {addingUserId === user.id ? (
                      <>
                        <CircularProgress size={16} sx={{ mr: 1 }} />
                        Adding...
                      </>
                    ) : (
                      'Add'
                    )}
                  </Button>
                </ListItem>
              ))}
            </List>
          ) : hasSearched && searchResults.length === 0 && searchTerm.trim() ? (
            <Box p={3} textAlign="center">
              <Typography variant="body2" color="text.secondary">
                {allSearchResults.length > 0 ? (
                  `All students matching "${searchTerm}" are already in this classroom.`
                ) : (
                  `No students found matching "${searchTerm}"`
                )}
              </Typography>
            </Box>
          ) : null}
        </Paper>
      )}
    </Box>
  );
};

export default AddStudentSearch;