import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../index';
import axios, { AxiosInstance } from 'axios';

// API client setup
const api: AxiosInstance = axios.create({
  baseURL: '/api/v1',
  timeout: 10000,
});

// Types
export interface Role {
  id: number;
  name: string;
  description?: string;
}

export interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  roles?: Role[];
}

interface UserState {
  users: User[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  filteredUsers: User[];
}

interface UserCreate {
  first_name: string;
  last_name: string;
  email: string;
  roles?: number[]; // Array of role IDs
}

interface UserUpdate {
  first_name?: string;
  last_name?: string;
  email?: string;
  roles?: number[]; // Array of role IDs
}

export type { UserCreate, UserUpdate };

// Initial state
const initialState: UserState = {
  users: [],
  status: 'idle',
  error: null,
  filteredUsers: []
};

// Thunks
export const fetchUsers = createAsyncThunk(
  'users/fetchAll',
  async (nameSearch: string | undefined = undefined, { rejectWithValue }) => {
    try {
      const params = nameSearch ? { name_search: nameSearch } : {};
      const response = await api.get('/users/', { params });
      
      if (!(response.status === 200)) {
        return rejectWithValue(`Failed to fetch users: ${response.statusText}`);
      }
      
      const users: User[] = response.data;
      return users;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

export const searchUsers = createAsyncThunk(
  'users/search',
  async (nameSearch: string, { rejectWithValue }) => {
    try {
      const params = nameSearch ? { name_search: nameSearch } : {};
      const response = await api.get('/users/', { params });
      
      if (!(response.status === 200)) {
        return rejectWithValue(`Failed to search users: ${response.statusText}`);
      }
      
      const users: User[] = response.data;
      return users;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

export const createUser = createAsyncThunk(
  'users/create',
  async (newUser: UserCreate, { rejectWithValue }) => {
    try {
      const response = await api.post('/users/', newUser);
      
      if (!(response.status === 201)) {
        return rejectWithValue(`Failed to create user: ${response.statusText}`);
      }
      
      const user: User = response.data;
      return user;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

export const updateUser = createAsyncThunk(
  'users/update',
  async ({ id, updates }: { id: number; updates: UserUpdate }, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/users/${id}`, updates);
      
      if (!(response.status === 200)) {
        return rejectWithValue(`Failed to update user: ${response.statusText}`);
      }
      
      const updatedUser: User = response.data;
      return updatedUser;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

export const updateUserRoles = createAsyncThunk(
  'users/updateRoles',
  async ({ id, roleIds }: { id: number; roleIds: number[] }, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/users/${id}`, { roles: roleIds });
      
      if (!(response.status === 200)) {
        return rejectWithValue(`Failed to update user roles: ${response.statusText}`);
      }
      
      const updatedUser: User = response.data;
      return updatedUser;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

export const deleteUser = createAsyncThunk(
  'users/delete',
  async (id: number, { rejectWithValue }) => {
    try {
      const response = await api.delete(`/users/${id}`);
      
      if (!(response.status === 204)) {
        return rejectWithValue(`Failed to delete user: ${response.statusText}`);
      }
      
      return id;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

// Slice
const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    // Regular reducers go here
    clearUsers: (state) => {
      state.users = [];
      state.filteredUsers = [];
      state.status = 'idle';
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch users
      .addCase(fetchUsers.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action: PayloadAction<User[]>) => {
        state.status = 'succeeded';
        // Sort users alphabetically by last name
        const sortedUsers = action.payload.sort((a, b) => a.last_name.localeCompare(b.last_name));
        state.users = sortedUsers;
        state.filteredUsers = sortedUsers;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      // Search users
      .addCase(searchUsers.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(searchUsers.fulfilled, (state, action: PayloadAction<User[]>) => {
        state.status = 'succeeded';
        const sortedUsers = action.payload.sort((a, b) => a.last_name.localeCompare(b.last_name));
        state.filteredUsers = sortedUsers;
      })
      .addCase(searchUsers.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      // Create user
      .addCase(createUser.fulfilled, (state, action: PayloadAction<User>) => {
        state.status = 'succeeded';
        state.users = [...state.users, action.payload].sort((a, b) => a.last_name.localeCompare(b.last_name));
      })
      // Update user
      .addCase(updateUser.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(updateUser.fulfilled, (state, action: PayloadAction<User>) => {
        state.status = 'succeeded';
        const index = state.users.findIndex(u => u.id === action.payload.id);
        if (index !== -1) {
          state.users[index] = action.payload;
          // Re-sort after update
          state.users.sort((a, b) => a.last_name.localeCompare(b.last_name));
        }
      })
      .addCase(updateUser.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      // Update user roles
      .addCase(updateUserRoles.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(updateUserRoles.fulfilled, (state, action: PayloadAction<User>) => {
        state.status = 'succeeded';
        const index = state.users.findIndex(u => u.id === action.payload.id);
        if (index !== -1) {
          state.users[index] = action.payload;
        }
      })
      .addCase(updateUserRoles.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      // Delete user
      .addCase(deleteUser.fulfilled, (state, action: PayloadAction<number>) => {
        state.status = 'succeeded';
        state.users = state.users.filter(u => u.id !== action.payload);
      });
  }
});

// Export actions
export const { clearUsers, clearError } = usersSlice.actions;

// Export selectors
export const selectAllUsers = (state: RootState) => state.users.users;
export const selectFilteredUsers = (state: RootState) => state.users.filteredUsers;
export const selectUsersStatus = (state: RootState) => state.users.status;
export const selectUsersError = (state: RootState) => state.users.error;
export const selectUserById = (state: RootState, userId: number) => 
  state.users.users.find(user => user.id === userId);

export default usersSlice.reducer;
