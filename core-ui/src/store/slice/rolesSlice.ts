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

interface RoleState {
  roles: Role[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

// Initial state
const initialState: RoleState = {
  roles: [],
  status: 'idle',
  error: null
};

// Thunks
export const fetchRoles = createAsyncThunk(
  'roles/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/roles/');
      
      if (!(response.status === 200)) {
        return rejectWithValue(`Failed to fetch roles: ${response.statusText}`);
      }
      
      const roles: Role[] = response.data;
      return roles;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

// Slice
const rolesSlice = createSlice({
  name: 'roles',
  initialState,
  reducers: {
    clearRoles: (state) => {
      state.roles = [];
      state.status = 'idle';
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch roles
      .addCase(fetchRoles.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchRoles.fulfilled, (state, action: PayloadAction<Role[]>) => {
        state.status = 'succeeded';
        state.roles = action.payload; // Already sorted by API
      })
      .addCase(fetchRoles.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      });
  }
});

// Export actions
export const { clearRoles, clearError } = rolesSlice.actions;

// Export selectors
export const selectAllRoles = (state: RootState) => state.roles.roles;
export const selectRolesStatus = (state: RootState) => state.roles.status;
export const selectRolesError = (state: RootState) => state.roles.error;
export const selectRoleById = (state: RootState, roleId: number) => 
  state.roles.roles.find(role => role.id === roleId);

export default rolesSlice.reducer;
