import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { api } from '@/lib/http-client';

export interface OpenFinanceConnection {
  id: string;
  connector: string;
  status: string;
  lastSyncAt: string | null;
  accounts: { id: string; name: string; type: string; subtype: string; balanceCents: number }[];
}

export interface OpenFinanceSummary {
  totalBalanceCents: number;
  totalCreditCents: number;
  connections: number;
  accounts: number;
  lastSyncAt: string | null;
}

export const fetchOpenFinanceSummary = createAsyncThunk(
  'openFinance/summary',
  async (_, { rejectWithValue }) => {
    const { status, data } = await api<OpenFinanceSummary>('GET', '/open-finance/summary');
    if (status >= 300) return rejectWithValue('Erro ao carregar Open Finance');
    return data;
  },
);

export const fetchOpenFinanceConnections = createAsyncThunk(
  'openFinance/connections',
  async (_, { rejectWithValue }) => {
    const { status, data } = await api<OpenFinanceConnection[]>('GET', '/open-finance/connections');
    if (status >= 300) return rejectWithValue('Erro ao carregar conexões');
    return Array.isArray(data) ? data : [];
  },
);

export const createConnectToken = createAsyncThunk(
  'openFinance/connectToken',
  async (itemId: string | undefined, { rejectWithValue }) => {
    const { status, data } = await api<{ accessToken: string }>(
      'POST', '/open-finance/connect-token',
      itemId ? { itemId } : {},
    );
    if (status >= 300) return rejectWithValue('Erro ao criar token');
    return (data as { accessToken: string }).accessToken;
  },
);

export const deleteOpenFinanceConnection = createAsyncThunk(
  'openFinance/deleteConnection',
  async (id: string, { dispatch, rejectWithValue }) => {
    const { status } = await api('DELETE', `/open-finance/connections/${id}`);
    if (status >= 300) return rejectWithValue('Erro ao remover banco');
    await dispatch(fetchOpenFinanceConnections());
    return id;
  },
);

interface OpenFinanceState {
  summary: OpenFinanceSummary | null;
  connections: OpenFinanceConnection[];
  loading: boolean;
}

const init: OpenFinanceState = { summary: null, connections: [], loading: false };

const slice = createSlice({
  name: 'openFinance',
  initialState: init,
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchOpenFinanceSummary.fulfilled, (s, a) => { s.summary = a.payload; });
    b.addCase(fetchOpenFinanceConnections.pending,   (s) => { s.loading = true; });
    b.addCase(fetchOpenFinanceConnections.fulfilled, (s, a) => { s.connections = a.payload; s.loading = false; });
    b.addCase(fetchOpenFinanceConnections.rejected,  (s) => { s.loading = false; });
  },
});

export default slice.reducer;
