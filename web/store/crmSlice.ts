import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '@/lib/api';
import { asArray, paginationMeta, paginationQuery, type PaginationParams } from '@/lib/pagination';

export interface Lead {
  id: string;
  name: string;
  contact?: string | null;
  estimatedCents: number;
  stage: string;
  notes?: string | null;
  createdAt: string;
}

export const fetchLeads = createAsyncThunk('crm/fetch', async (params?: PaginationParams) => {
  const data = (await api('GET', `/leads${paginationQuery(params)}`)).data;
  return { items: asArray<Lead>(data), meta: paginationMeta(data) };
});

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
  pagination: { total: number; page: number; totalPages: number };
}
const initialState: CrmState = { leads: [], pagination: { total: 0, page: 1, totalPages: 1 } };

const crmSlice = createSlice({
  name: 'crm',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(fetchLeads.fulfilled, (s, a) => {
      s.leads = a.payload.items;
      if (a.payload.meta) s.pagination = a.payload.meta;
    });
  },
});

export default crmSlice.reducer;
