import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '@/lib/api';
import { asArray } from '@/lib/pagination';

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

export const fetchFinancialEntries = createAsyncThunk('financialEntries/fetch', async () =>
  asArray<FinancialEntry>((await api('GET', '/financial-entries')).data),
);

export const updateFinancialEntry = createAsyncThunk(
  'financialEntries/update',
  async (
    { id, ...dto }: { id: string; descricao?: string; tipo?: string; valorCents?: number; recorrencia?: string; dataTransacao?: string; pagadorNome?: string },
    { rejectWithValue },
  ) => {
    const { status, data } = await api('PATCH', `/financial-entries/${id}`, dto);
    if (status >= 400) return rejectWithValue((data as { message?: string })?.message ?? 'Erro ao atualizar');
    return data as FinancialEntry;
  },
);

export const deleteFinancialEntry = createAsyncThunk(
  'financialEntries/delete',
  async (id: string, { rejectWithValue }) => {
    const { status } = await api('DELETE', `/financial-entries/${id}`);
    if (status >= 400) return rejectWithValue('Erro ao excluir lançamento');
    return id;
  },
);

const slice = createSlice({
  name: 'financialEntries',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchFinancialEntries.pending, (s) => { s.loading = true; })
      .addCase(fetchFinancialEntries.fulfilled, (s, a) => { s.loading = false; s.entries = a.payload; })
      .addCase(fetchFinancialEntries.rejected, (s) => { s.loading = false; })
      .addCase(updateFinancialEntry.fulfilled, (s, a) => {
        const idx = s.entries.findIndex((e) => e.id === a.payload.id);
        if (idx !== -1) s.entries[idx] = a.payload;
      })
      .addCase(deleteFinancialEntry.fulfilled, (s, a) => {
        s.entries = s.entries.filter((e) => e.id !== a.payload);
      });
  },
});

export default slice.reducer;
