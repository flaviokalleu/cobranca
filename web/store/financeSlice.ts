import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '@/lib/api';

export interface Payable {
  id: string;
  description: string;
  amountCents: number;
  dueDate: string;
  status: string;
  paidAt?: string | null;
  supplierId?: string | null;
  category?: string | null;
}
export interface CashflowRow {
  id: string;
  date: string;
  description: string;
  inCents: number;
  outCents: number;
  balanceCents: number;
}
export interface Cashflow {
  balanceCents: number;
  rows: CashflowRow[];
}
export interface FinanceSummary {
  revenueCents: number;
  expenseCents: number;
  resultCents: number;
  cashCents: number;
  aReceberCents: number;
  aPagarCents: number;
}

const arr = <T>(d: unknown): T[] => (Array.isArray(d) ? (d as T[]) : []);

export const fetchPayables = createAsyncThunk('finance/fetchPayables', async () =>
  arr<Payable>((await api('GET', '/payables')).data),
);
export const fetchCashflow = createAsyncThunk('finance/fetchCashflow', async () => {
  const { data } = await api<Cashflow>('GET', '/finance/cashflow');
  return data;
});
export const fetchSummary = createAsyncThunk('finance/fetchSummary', async () => {
  const { data } = await api<FinanceSummary>('GET', '/finance/summary');
  return data;
});

export const createPayable = createAsyncThunk(
  'finance/createPayable',
  async (
    body: {
      description: string;
      amountCents: number;
      dueDate: string;
      supplierId?: string;
      category?: string;
    },
    { dispatch, rejectWithValue },
  ) => {
    const { status } = await api('POST', '/payables', body);
    if (status >= 300) return rejectWithValue('Erro ao criar conta a pagar.');
    await dispatch(fetchPayables());
    return true;
  },
);

export const payPayable = createAsyncThunk(
  'finance/payPayable',
  async (id: string, { dispatch, rejectWithValue }) => {
    const { status } = await api('POST', `/payables/${id}/pay`);
    if (status === 403) return rejectWithValue('Apenas ADMIN pode pagar.');
    if (status >= 300) return rejectWithValue('Erro ao pagar.');
    await dispatch(fetchPayables());
    return true;
  },
);

export const updatePayable = createAsyncThunk(
  'finance/updatePayable',
  async (
    body: {
      id: string;
      description?: string;
      amountCents?: number;
      dueDate?: string;
      supplierId?: string | null;
      category?: string | null;
    },
    { dispatch, rejectWithValue },
  ) => {
    const { id, ...payload } = body;
    const { status } = await api('PATCH', `/payables/${id}`, payload);
    if (status >= 300) return rejectWithValue('Erro ao atualizar conta a pagar.');
    await Promise.all([dispatch(fetchPayables()), dispatch(fetchCashflow()), dispatch(fetchSummary())]);
    return true;
  },
);

export const deletePayable = createAsyncThunk(
  'finance/deletePayable',
  async (id: string, { dispatch, rejectWithValue }) => {
    const { status } = await api('DELETE', `/payables/${id}`);
    if (status >= 300) return rejectWithValue('Erro ao excluir conta a pagar.');
    await Promise.all([dispatch(fetchPayables()), dispatch(fetchCashflow()), dispatch(fetchSummary())]);
    return true;
  },
);

interface FinanceState {
  payables: Payable[];
  cashflow: Cashflow;
  summary: FinanceSummary | null;
}
const initialState: FinanceState = {
  payables: [],
  cashflow: { balanceCents: 0, rows: [] },
  summary: null,
};

const financeSlice = createSlice({
  name: 'finance',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPayables.fulfilled, (s, a) => {
        s.payables = a.payload;
      })
      .addCase(fetchCashflow.fulfilled, (s, a) => {
        s.cashflow = a.payload;
      })
      .addCase(fetchSummary.fulfilled, (s, a) => {
        s.summary = a.payload;
      });
  },
});

export default financeSlice.reducer;
