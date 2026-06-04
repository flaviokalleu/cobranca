import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '@/lib/api';

export interface Lead {
  id: string;
  name: string;
  contact?: string | null;
  estimatedCents: number;
  stage: string;
  notes?: string | null;
  createdAt: string;
}

const arr = <T>(d: unknown): T[] => (Array.isArray(d) ? (d as T[]) : []);

export const fetchLeads = createAsyncThunk('crm/fetch', async () =>
  arr<Lead>((await api('GET', '/leads')).data),
);

export const createLead = createAsyncThunk(
  'crm/create',
  async (
    body: { name: string; contact?: string; estimatedCents?: number },
    { dispatch, rejectWithValue },
  ) => {
    const { status } = await api('POST', '/leads', body);
    if (status >= 300) return rejectWithValue('Erro ao criar lead.');
    await dispatch(fetchLeads());
    return true;
  },
);

export const changeStage = createAsyncThunk(
  'crm/changeStage',
  async (body: { id: string; stage: string }, { dispatch }) => {
    await api('PATCH', `/leads/${body.id}/stage`, { stage: body.stage });
    await dispatch(fetchLeads());
    return true;
  },
);

interface CrmState {
  leads: Lead[];
}
const initialState: CrmState = { leads: [] };

const crmSlice = createSlice({
  name: 'crm',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(fetchLeads.fulfilled, (s, a) => {
      s.leads = a.payload;
    });
  },
});

export default crmSlice.reducer;
