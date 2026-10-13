import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "../index";
import axios, { AxiosInstance } from "axios";
import { createSelector } from "@reduxjs/toolkit";

// API client setup
const api: AxiosInstance = axios.create({
  baseURL: "/api/v1",
  timeout: 10000,
});

// Types based on the API responses from groups.py
export interface ClassroomMember {
  id: number;
  username: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  joined_at?: string;
}

export interface Classroom {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  created_by_id: number;
  member_count: number;
  start_date: string; // Date will be serialized as ISO string
  end_date: string; // Date will be serialized as ISO string
}

export interface ClassroomWithMembers {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  created_by_id: number;
  members: ClassroomMember[];
  start_date?: string; // Date will be serialized as ISO string
  end_date?: string; // Date will be serialized as ISO string
}

export interface ClassroomCreate {
  name: string;
  description?: string;
  start_date: string; // Date will be serialized as ISO string
  end_date: string; // Date will be serialized as ISO string
}

interface ClassroomState {
  classrooms: Classroom[];
  currentClassroom: ClassroomWithMembers | null;
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
  publicFetchStatus: "idle" | "loading" | "succeeded" | "failed";
  publicFetchError: string | null;
  createStatus: "idle" | "loading" | "succeeded" | "failed";
  createError: string | null;
}

// Initial state
const initialState: ClassroomState = {
  classrooms: [],
  currentClassroom: null,
  status: "idle",
  error: null,
  publicFetchStatus: "idle",
  publicFetchError: null,
  createStatus: "idle",
  createError: null,
};

// Async thunks
export const fetchClassrooms = createAsyncThunk(
  "classrooms/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/groups/");

      if (response.status !== 200) {
        return rejectWithValue(
          `Failed to fetch classrooms: ${response.statusText}`
        );
      }

      const classrooms: Classroom[] = response.data;
      return classrooms;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
);

export const fetchClassroomById = createAsyncThunk(
  "classrooms/fetchById",
  async (classroomId: number, { rejectWithValue }) => {
    try {
      const response = await api.get(`/groups/${classroomId}`);

      if (response.status !== 200) {
        return rejectWithValue(
          `Failed to fetch classroom: ${response.statusText}`
        );
      }

      const classroom: ClassroomWithMembers = response.data;
      return classroom;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
);

export const fetchClassroomByIdPublic = createAsyncThunk(
  "classrooms/fetchByIdPublic",
  async (classroomId: number, { rejectWithValue }) => {
    try {
      const response = await api.get(`/groups/${classroomId}/public`);

      if (response.status !== 200) {
        return rejectWithValue(
          `Failed to fetch classroom: ${response.statusText}`
        );
      }

      const classroom: Classroom = response.data;
      return classroom;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
);

export const createClassroom = createAsyncThunk(
  "classrooms/create",
  async (classroomData: ClassroomCreate, { rejectWithValue }) => {
    try {
      const response = await api.post("/groups/", classroomData);

      if (response.status !== 201) {
        return rejectWithValue(
          `Failed to create classroom: ${response.statusText}`
        );
      }

      const classroom: Classroom = response.data;
      return classroom;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
);

export const addUserToClassroom = createAsyncThunk(
  "classrooms/addUser",
  async (
    { classroomId, userId }: { classroomId: number; userId: number },
    { rejectWithValue }
  ) => {
    try {
      const response = await api.post(
        `/groups/${classroomId}/members/${userId}`
      );

      if (response.status !== 201) {
        return rejectWithValue(
          `Failed to add user to classroom: ${response.statusText}`
        );
      }

      return { classroomId, userId, message: response.data.message };
    } catch (error: unknown) {
      // Extract the specific error message from the response
      if (axios.isAxiosError(error) && error.response?.data?.detail) {
        return rejectWithValue(error.response.data.detail);
      }
      return rejectWithValue(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
);

export const removeUserFromClassroom = createAsyncThunk(
  "classrooms/removeUser",
  async (
    { classroomId, userId }: { classroomId: number; userId: number },
    { rejectWithValue }
  ) => {
    try {
      const response = await api.delete(
        `/groups/${classroomId}/members/${userId}`
      );

      if (response.status !== 204) {
        return rejectWithValue(
          `Failed to remove user from classroom: ${response.statusText}`
        );
      }

      return { classroomId, userId };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
);

export const deleteClassroom = createAsyncThunk(
  "classrooms/delete",
  async (classroomId: number, { rejectWithValue }) => {
    try {
      const response = await api.delete(`/groups/${classroomId}`);

      if (response.status !== 204) {
        return rejectWithValue(
          `Failed to delete classroom: ${response.statusText}`
        );
      }

      return classroomId;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
);

// Slice
const classroomsSlice = createSlice({
  name: "classrooms",
  initialState,
  reducers: {
    clearClassrooms: (state) => {
      state.classrooms = [];
      state.currentClassroom = null;
      state.status = "idle";
      state.publicFetchStatus = "idle";
      state.publicFetchError = null;
    },
    clearError: (state) => {
      state.error = null;
      state.createError = null;
    },
    clearCreateStatus: (state) => {
      state.createStatus = "idle";
      state.createError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch classrooms
      .addCase(fetchClassrooms.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(
        fetchClassrooms.fulfilled,
        (state, action: PayloadAction<Classroom[]>) => {
          state.status = "succeeded";
          // Sort classrooms alphabetically by name
          const sortedClassrooms = action.payload.sort((a, b) =>
            a.name.localeCompare(b.name)
          );
          state.classrooms = sortedClassrooms;
        }
      )
      .addCase(fetchClassrooms.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload as string;
      })
      // Fetch classroom by ID
      .addCase(fetchClassroomById.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(
        fetchClassroomById.fulfilled,
        (state, action: PayloadAction<ClassroomWithMembers>) => {
          state.status = "succeeded";
          state.currentClassroom = action.payload;
        }
      )
      .addCase(fetchClassroomById.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload as string;
      })
      // Fetch classroom by ID (public)
      .addCase(fetchClassroomByIdPublic.pending, (state) => {
        state.publicFetchStatus = "loading";
        state.publicFetchError = null;
        state.currentClassroom = null; // Clear any stale classroom data
      })
      .addCase(
        fetchClassroomByIdPublic.fulfilled,
        (state, action: PayloadAction<Classroom>) => {
          state.publicFetchStatus = "succeeded";
          // Convert Classroom to ClassroomWithMembers for compatibility
          state.currentClassroom = {
            ...action.payload,
            members: [], // Public endpoint doesn't return members
          };
        }
      )
      .addCase(fetchClassroomByIdPublic.rejected, (state, action) => {
        state.publicFetchStatus = "failed";
        state.publicFetchError = action.payload as string;
        state.currentClassroom = null; // Clear classroom data on error
      })
      // Create classroom
      .addCase(createClassroom.pending, (state) => {
        state.createStatus = "loading";
        state.createError = null;
      })
      .addCase(
        createClassroom.fulfilled,
        (state, action: PayloadAction<Classroom>) => {
          state.createStatus = "succeeded";
          // Add new classroom to the list and re-sort
          state.classrooms = [...state.classrooms, action.payload].sort(
            (a, b) => a.name.localeCompare(b.name)
          );
        }
      )
      .addCase(createClassroom.rejected, (state, action) => {
        state.createStatus = "failed";
        state.createError = action.payload as string;
      })
      // Delete classroom
      .addCase(
        deleteClassroom.fulfilled,
        (state, action: PayloadAction<number>) => {
          state.status = "succeeded";
          state.classrooms = state.classrooms.filter(
            (c) => c.id !== action.payload
          );
          // Clear current classroom if it was deleted
          if (state.currentClassroom?.id === action.payload) {
            state.currentClassroom = null;
          }
        }
      )
      // Add user to classroom
      .addCase(addUserToClassroom.fulfilled, (state) => {
        // Could update member count here if needed
        state.status = "succeeded";
      })
      // Remove user from classroom
      .addCase(removeUserFromClassroom.fulfilled, (state) => {
        // Could update member count here if needed
        state.status = "succeeded";
      });
  },
});

// Export actions
export const { clearClassrooms, clearError, clearCreateStatus } =
  classroomsSlice.actions;

// Export selectors
export const selectAllClassrooms = (state: RootState) =>
  state.classrooms.classrooms;
export const selectCurrentClassroom = (state: RootState) =>
  state.classrooms.currentClassroom;
export const selectClassroomsStatus = (state: RootState) =>
  state.classrooms.status;
export const selectClassroomsError = (state: RootState) =>
  state.classrooms.error;
export const selectPublicFetchStatus = (state: RootState) =>
  state.classrooms.publicFetchStatus;
export const selectPublicFetchError = (state: RootState) =>
  state.classrooms.publicFetchError;
export const selectCreateClassroomStatus = (state: RootState) =>
  state.classrooms.createStatus;
export const selectCreateClassroomError = (state: RootState) =>
  state.classrooms.createError;
export const selectClassroomById = (state: RootState, classroomId: number) =>
  state.classrooms.classrooms.find((classroom) => classroom.id === classroomId);

export const selectCurrentClassroomMemberIds = createSelector(
  [selectCurrentClassroom],
  (classroom) => classroom?.members?.map((m) => m.id) || []
);

// Role-based selectors
export const selectClassroomsForUser = (
  state: RootState,
  userId: number,
  userRoles: string[]
) => {
  const classrooms = state.classrooms.classrooms;

  // Admins can see all classrooms
  if (userRoles.includes("admin")) {
    return classrooms;
  }

  // Instructors can only see classrooms they created
  if (userRoles.includes("instructor")) {
    return classrooms.filter((classroom) => classroom.created_by_id === userId);
  }

  // Other roles see no classrooms
  return [];
};

export default classroomsSlice.reducer;
