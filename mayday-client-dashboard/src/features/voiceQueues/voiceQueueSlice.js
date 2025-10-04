import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import apiClient from "../../api/apiClient.js";

// Create Voice Queue
export const createVoiceQueue = createAsyncThunk(
  "voiceQueue/createVoiceQueue",
  async (queueData, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(
        "/users/voice_queue/create",
        queueData
      );
      return {
        voiceQueue: response.data.voiceQueue,
        message: response.data.message,
      };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to create voice queue!"
      );
    }
  }
);

// Read Voice Queue
export const fetchVoiceQueues = createAsyncThunk(
  "voiceQueue/fetchVoiceQueues",
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get("/users/voice_queue/read");
      // console.log(response, "Response in Voice Queue Slice>>>>>>>>.");
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Couldn't fetch voice queues!"
      );
    }
  }
);

// Update Voice Queue
export const updateVoiceQueueDetails = createAsyncThunk(
  "voiceQueue/updateVoiceQueueDetails",
  async (queueData, { rejectWithValue }) => {
    try {
      const { id } = queueData;
      const response = await apiClient.put(
        `/users/voice_queue/update/${id}`,
        queueData
      );
      return {
        voiceQueue: response.data.voiceQueue,
        message: response.data.message,
      };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Couldn't update voice queue!"
      );
    }
  }
);

// Delete Voice Queue
export const deleteVoiceQueue = createAsyncThunk(
  "voiceQueue/deleteVoiceQueue",
  async (id, { rejectWithValue }) => {
    try {
      const response = await apiClient.delete(
        `/users/voice_queue/delete/${id}`
      );
      return {
        id: response.data.id,
        message: response.data.message,
      };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to delete voice queue!"
      );
    }
  }
);

// Add Queue Members
export const addQueueMembers = createAsyncThunk(
  "voiceQueue/addQueueMembers",
  async ({ queueId, memberData }, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(
        `/users/voice_queue/members_add/${queueId}`,
        memberData
      );
      return {
        queueId,
        message: response.data.message,
        members: response.data.members,
      };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to add queue members!"
      );
    }
  }
);

// Remove Queue Member
export const removeQueueMember = createAsyncThunk(
  "voiceQueue/removeQueueMember",
  async ({ queueId, Interface }, { rejectWithValue }) => {
    try {
      const response = await apiClient.delete(
        `/users/voice_queue/members_remove/${queueId}`,
        { data: { Interface } }
      );
      return {
        queueId,
        interface: Interface,
        message: response.data.message,
      };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to remove queue member!"
      );
    }
  }
);

// Get Queue Members
export const getQueueMembers = createAsyncThunk(
  "voiceQueue/getQueueMembers",
  async (queueId, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(
        `/users/voice_queue/${queueId}/members`
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch queue members!"
      );
    }
  }
);

// Initial State
const initialState = {
  voiceQueues: [],
  loading: false,
  error: null,
  queueMembers: {},
};

const voiceQueueSlice = createSlice({
  name: "voiceQueue",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(createVoiceQueue.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createVoiceQueue.fulfilled, (state, action) => {
        state.loading = false;
        state.voiceQueues.push(action.payload.voiceQueue);
      })
      .addCase(createVoiceQueue.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchVoiceQueues.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchVoiceQueues.fulfilled, (state, action) => {
        state.loading = false;
        state.voiceQueues = action.payload;
      })
      .addCase(fetchVoiceQueues.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        // state.error = action.error.message;
      })
      .addCase(updateVoiceQueueDetails.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateVoiceQueueDetails.fulfilled, (state, action) => {
        const updatedQueue = action.payload.voiceQueue;
        const existingIndex = state.voiceQueues.findIndex(
          (queue) => queue.id === updatedQueue.id
        );
        if (existingIndex !== -1) {
          state.voiceQueues[existingIndex] = updatedQueue;
        }
        state.loading = false;
      })
      .addCase(updateVoiceQueueDetails.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(deleteVoiceQueue.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteVoiceQueue.fulfilled, (state, action) => {
        // const queueIndex = state.voiceQueues.findIndex(
        //   (queue) => queue.id === Number(action.payload)
        // );
        // if (queueIndex !== -1) {
        //   state.voiceQueues.splice(queueIndex, 1);
        // }
        // state.loading = false;
        const { id } = action.payload;
        state.voiceQueues = state.voiceQueues.filter(
          (queue) => queue.id !== Number(id)
        );
        state.loading = false;
      })
      .addCase(deleteVoiceQueue.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(addQueueMembers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addQueueMembers.fulfilled, (state, action) => {
        // console.log(action.payload, "Payload in Voice Queue Slice>>>");
        const { queueId, members } = action.payload;

        // Initialize the array if it doesn't exist
        if (!state.queueMembers[queueId]) {
          state.queueMembers[queueId] = [];
        }

        // Ensure members is an array before spreading
        const newMembers = Array.isArray(members) ? members : [];

        // Update the queue members in state
        // Update the queue members
        state.queueMembers[queueId] = [
          ...state.queueMembers[queueId],
          ...newMembers,
        ];
        state.loading = false;
      })
      .addCase(addQueueMembers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Get Queue Members reducers
      .addCase(getQueueMembers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getQueueMembers.fulfilled, (state, action) => {
        const { queueId, members } = action.payload;
        state.queueMembers[queueId] = members;
        state.loading = false;
      })
      .addCase(getQueueMembers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Remove Queue Member reducers
      .addCase(removeQueueMember.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(removeQueueMember.fulfilled, (state, action) => {
        const { queueId, interface: memberInterface } = action.payload;
        if (state.queueMembers[queueId]) {
          state.queueMembers[queueId] = state.queueMembers[queueId].filter(
            (member) => member.interface !== memberInterface
          );
        }
        state.loading = false;
      })
      .addCase(removeQueueMember.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default voiceQueueSlice.reducer;
