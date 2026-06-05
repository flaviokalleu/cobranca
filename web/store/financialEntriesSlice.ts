import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '@/lib/api';

export interface FinancialEntry {
  id: string;
  tipo: string;
  valorCents: number;
  descricao: string;
  pagadorNome?: string | null;
  recebedorNome?: string | null;
  dataTransacao?: string | null;
  horaTransacao?: string | null;
  recorrencia: string;
  confianca: string;
  createdAt: string;
  lead?: { id: string; name: string; whatsapp?: string | null } | null;
}

interface State {
  entries: FinancialEntry[];
  loading: boolean;
}

const initialState: State = { entries: [], loading: false };

const asArray = <T>(data: unknown): T[] => (Array.isArray(data) ? (data as T[]) : []);

export const fetchFinancialEntries = createAsyncThunk('financialEntries/fetch', async () =>
  asArray<FinancialEntry>((await api('GET', '/financial-entries')).data),
);

const slice = createSlice({
  name: 'financialEntries',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchFinancialEntries.pending, (s) => { s.loading = true; })
      .addCase(fetchFinancialEntries.fulfilled, (s, a) => { s.loading = false; s.entries = a.payload; })
      .addCase(fetchFinancialEntries.rejected, (s) => { s.loading = false; });
  },
});

export default slice.reducer;
