import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import authService from '../../services/auth.service';
import Config from '../../constants/config';

// ── Async Thunks ──

export const loginUser = createAsyncThunk('auth/login', async (credentials, { rejectWithValue }) => {
  try {
    const res = await authService.login(credentials);
    return res.data;
  } catch (error) {
    const errData = error.response?.data;
    if (errData?.errors && Array.isArray(errData.errors)) {
      const msg = errData.errors.map(e => e.message).join('\n');
      return rejectWithValue(msg);
    }
    if (!error.response) {
      return rejectWithValue(`Network Error: Cannot connect to backend API at ${Config.API_BASE_URL}. Ensure your server is running. (${error.message})`);
    }
    return rejectWithValue(errData?.message || 'Login failed');
  }
});

export const registerUser = createAsyncThunk('auth/register', async (userData, { rejectWithValue }) => {
  try {
    const res = await authService.register(userData);
    return res.data;
  } catch (error) {
    const errData = error.response?.data;
    if (errData?.errors && Array.isArray(errData.errors)) {
      const msg = errData.errors.map(e => e.message).join('\n');
      return rejectWithValue(msg);
    }
    if (!error.response) {
      return rejectWithValue(`Network Error: Cannot connect to backend API at ${Config.API_BASE_URL}. Ensure your server is running. (${error.message})`);
    }
    return rejectWithValue(errData?.message || 'Registration failed');
  }
});

export const fetchCurrentUser = createAsyncThunk('auth/fetchCurrentUser', async (_, { rejectWithValue }) => {
  try {
    const res = await authService.getMe();
    return res.data;
  } catch (error) {
    if (!error.response) {
      return rejectWithValue(`Network Error: Cannot connect to backend API at ${Config.API_BASE_URL}. (${error.message})`);
    }
    return rejectWithValue(error.response?.data?.message || 'Failed to fetch user');
  }
});

export const logoutUser = createAsyncThunk('auth/logout', async () => {
  await authService.logout();
});

// ── Slice ──

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    donorProfile: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    toastMessage: null,
    toastType: 'success',
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setUser: (state, action) => {
      state.user = action.payload;
      state.isAuthenticated = true;
    },
    setToastMessage: (state, action) => {
      if (typeof action.payload === 'string') {
        state.toastMessage = action.payload;
        state.toastType = 'success';
      } else {
        state.toastMessage = action.payload?.message || null;
        state.toastType = action.payload?.type || 'success';
      }
    },
    clearToastMessage: (state) => {
      state.toastMessage = null;
    },
  },
  extraReducers: (builder) => {
    // Login
    builder.addCase(loginUser.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(loginUser.fulfilled, (state, action) => {
      state.isLoading = false;
      state.user = action.payload?.data?.user || action.payload?.user;
      state.isAuthenticated = true;
      state.toastMessage = `Welcome, ${state.user?.fullName || 'User'}!`;
      state.toastType = 'success';
    });
    builder.addCase(loginUser.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload;
    });

    // Register
    builder.addCase(registerUser.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(registerUser.fulfilled, (state, action) => {
      state.isLoading = false;
      state.user = action.payload?.data?.user || action.payload?.user;
      state.isAuthenticated = true;
      state.toastMessage = `Welcome, ${state.user?.fullName || 'User'}!`;
      state.toastType = 'success';
    });
    builder.addCase(registerUser.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload;
    });

    // Fetch current user
    builder.addCase(fetchCurrentUser.fulfilled, (state, action) => {
      state.user = action.payload?.data?.user || action.payload?.user;
      state.donorProfile = action.payload?.data?.donor_profile || action.payload?.donorProfile;
      state.isAuthenticated = true;
    });
    builder.addCase(fetchCurrentUser.rejected, (state) => {
      state.user = null;
      state.isAuthenticated = false;
    });

    // Logout
    builder.addCase(logoutUser.fulfilled, (state) => {
      const username = state.user?.fullName || 'User';
      state.user = null;
      state.donorProfile = null;
      state.isAuthenticated = false;
      state.toastMessage = `${username} logged out.`;
      state.toastType = 'error';
    });
  },
});

export const { clearError, setUser, setToastMessage, clearToastMessage } = authSlice.actions;
export default authSlice.reducer;
