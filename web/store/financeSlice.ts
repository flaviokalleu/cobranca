import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '@/lib/api';
import { asArray } from '@/lib/pagination';

export interface Payable {
  id: string;
  description: string;
  amountCents: number;
  dueDate: string;
  status: string;
  paidAt?: string | null;
  supplierId?: string | null;
  category?: string | null;
  recurrence?: string | null;
}
export interface CashflowRow {
  id: string;
  sourceId: string;
  sourceType: 'RECEIVABLE' | 'PAYABLE';
  date: string;
  description: string;
  category?: string | null;
  recurrence?: string | null;
  status: string;
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
export interface DashboardKpis {
  pendingReceivablesCents: number;
  receivedCents: number;
  pendingPayablesCents: number;
  paidExpensesCents: number;
  whatsappIncomeCents: number;
  whatsappExpenseCents: number;
  totalIncomeCents: number;
  totalExpenseCents: number;
  balanceCents: number;
  projectedBalanceCents: number;
  collectionRate: number;
  overdueCharges: number;
  dsoDays: number;
  defaultRate: number;
  openTasks: number;
  leadCount: number;
  customerCount: number;
  whatsappCount: number;
  chart: Array<{ key: string; label: string; incomeCents: number; expenseCents: number }>;
}

export const fetchPayables = createAsyncThunk('finance/fetchPayables', async () =>
  asArray<Payable>((await api('GET', '/payables')).data),
);
export const fetchCashflow = createAsyncThunk(
  'finance/fetchCashflow',
  async (period?: { from?: string; to?: string }) => {
    const params = new URLSearchParams();
    if (period?.from) params.set('from', period.from);
    if (period?.to) params.set('to', period.to);
    const qs = params.toString();
    const { data } = await api<Cashflow>('GET', `/finance/cashflow${qs ? `?${qs}` : ''}`);
    return data;
  },
);
export const fetchSummary = createAsyncThunk(
  'finance/fetchSummary',
  async (period?: { from?: string; to?: string }) => {
    const params = new URLSearchParams();
    if (period?.from) params.set('from', period.from);
    if (period?.to) params.set('to', period.to);
    const qs = params.toString();
    const { data } = await api<FinanceSummary>('GET', `/finance/summary${qs ? `?${qs}` : ''}`);
    return data;
  },
);
export const fetchDashboardKpis = createAsyncThunk(
  'finance/fetchDashboardKpis',
  async (period?: { from?: string; to?: string }) => {
    const params = new URLSearchParams();
    if (period?.from) params.set('from', period.from);
    if (period?.to) params.set('to', period.to);
    const qs = params.toString();
    const { data } = await api<DashboardKpis>('GET', `/finance/kpis${qs ? `?${qs}` : ''}`);
    return data;
  },
);

export const createPayable = createAsyncThunk(
  'finance/createPayable',
  async (
    body: {
      description: string;
      amountCents: number;
      dueDate: string;
      supplierId?: string;
      category?: string;
      recurrence?: string;
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
      recurrence?: string | null;
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
  dashboardKpis: DashboardKpis | null;
}
const initialState: FinanceState = {
  payables: [],
  cashflow: { balanceCents: 0, rows: [] },
  summary: null,
  dashboardKpis: null,
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
      })
      .addCase(fetchDashboardKpis.fulfilled, (s, a) => {
        s.dashboardKpis = a.payload;
      });
  },
});

export default financeSlice.reducer;
