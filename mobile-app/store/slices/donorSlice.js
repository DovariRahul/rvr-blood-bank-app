import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import donorService from '../../services/donor.service';

export const fetchDonorProfile = createAsyncThunk('donor/fetchProfile', async (_, { rejectWithValue }) => {
  try {
    const res = await donorService.getMyProfile();
    return res.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Failed to fetch profile');
  }
});

export const updateAvailability = createAsyncThunk('donor/updateAvailability', async ({ donorId, isAvailable }, { rejectWithValue }) => {
  try {
    const res = await donorService.toggleAvailability(donorId, isAvailable);
    return res.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Failed to update availability');
  }
});

const donorSlice = createSlice({
  name: 'donor',
  initialState: {
    profile: null,
    responseHistory: [],
    isLoading: false,
    error: null,
  },
  reducers: {
    clearDonorError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchDonorProfile.pending, (state) => { state.isLoading = true; });
    builder.addCase(fetchDonorProfile.fulfilled, (state, action) => {
      state.isLoading = false;
      state.profile = action.payload.donor;
      state.responseHistory = action.payload.response_history;
    });
    builder.addCase(fetchDonorProfile.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload;
    });

    builder.addCase(updateAvailability.fulfilled, (state, action) => {
      if (state.profile) {
        state.profile.isAvailable = action.payload.is_available;
      }
    });
  },
});

export const { clearDonorError } = donorSlice.actions;
export default donorSlice.reducer;
