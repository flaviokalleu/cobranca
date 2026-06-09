import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { api } from '@/lib/http-client';

export interface AiAnswer {
  intent: string;
  answer: string;
  generatedAt: string;
}

export const fetchAiSuggestions = createAsyncThunk('ai/suggestions', async () => {
  const { data } = await api<string[]>('GET', '/ai/suggestions');
  return Array.isArray(data) ? data : [];
});

export const askAi = createAsyncThunk(
  'ai/ask',
  async (question: string, { rejectWithValue }) => {
    const { status, data } = await api<AiAnswer>('POST', '/ai/ask', { question });
    if (status >= 300) return rejectWithValue('Nao foi possivel consultar o assistente.');
    return data;
  },
);

interface AiState {
  suggestions: string[];
  history: AiAnswer[];
  loading: boolean;
  error: string | null;
}

const initialState: AiState = {
  suggestions: [],
  history: [],
  loading: false,
  error: null,
};

const aiSlice = createSlice({
  name: 'ai',
  initialState,
  reducers: {
    editHistoryEntry(
      state,
      action: PayloadAction<{ generatedAt: string; answer: string }>,
    ) {
      const item = state.history.find(
        (entry) => entry.generatedAt === action.payload.generatedAt,
      );
      if (item) item.answer = action.payload.answer;
    },
    deleteHistoryEntry(state, action: PayloadAction<string>) {
      state.history = state.history.filter(
        (entry) => entry.generatedAt !== action.payload,
      );
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAiSuggestions.fulfilled, (state, action) => {
        state.suggestions = action.payload;
      })
      .addCase(askAi.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(askAi.fulfilled, (state, action) => {
        state.loading = false;
        state.history.unshift(action.payload);
      })
      .addCase(askAi.rejected, (state, action) => {
        state.loading = false;
        state.error = typeof action.payload === 'string' ? action.payload : 'Erro no assistente.';
      });
  },
});

export const { editHistoryEntry, deleteHistoryEntry } = aiSlice.actions;
export default aiSlice.reducer;
