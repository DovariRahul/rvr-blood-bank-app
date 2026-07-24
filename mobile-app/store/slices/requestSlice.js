import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import requestService from '../../services/request.service';

export const fetchRequests = createAsyncThunk('requests/fetchAll', async (params, { rejectWithValue }) => {
  try {
    const res = await requestService.getRequests(params);
    return res.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Failed to fetch requests');
  }
});

export const createBloodRequest = createAsyncThunk('requests/create', async (data, { rejectWithValue }) => {
  try {
    const res = await requestService.createRequest(data);
    return res.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Failed to create request');
  }
});

const requestSlice = createSlice({
  name: 'requests',
  initialState: {
    requests: [],
    currentRequest: null,
    pagination: null,
    isLoading: false,
    error: null,
  },
  reducers: {
    clearRequestError: (state) => { state.error = null; },
    setCurrentRequest: (state, action) => { state.currentRequest = action.payload; },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchRequests.pending, (state) => { state.isLoading = true; });
    builder.addCase(fetchRequests.fulfilled, (state, action) => {
      state.isLoading = false;
      state.requests = action.payload.requests;
      state.pagination = action.payload.pagination;
    });
    builder.addCase(fetchRequests.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload;
    });

    builder.addCase(createBloodRequest.pending, (state) => { state.isLoading = true; });
    builder.addCase(createBloodRequest.fulfilled, (state) => { state.isLoading = false; });
    builder.addCase(createBloodRequest.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload;
    });
  },
});

export const { clearRequestError, setCurrentRequest } = requestSlice.actions;
export default requestSlice.reducer;
