import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { api } from '@/lib/http-client';

export interface PersonalAccount {
  id: string;
  name: string;
  type: string;
  balanceCents: number;
  active?: boolean;
}

export interface PersonalCard {
  id: string;
  name: string;
  limitCents: number;
  closingDay?: number | null;
  dueDay?: number | null;
}

export interface PersonalTransaction {
  id: string;
  accountId?: string | null;
  cardId?: string | null;
  type: string;
  amountCents: number;
  description: string;
  category: string;
  subcategory?: string | null;
  occurredAt: string;
  source: string;
  confidence: number;
}

export interface SpendingLimit {
  id: string;
  category: string;
  limitCents: number;
  usedCents?: number;
  percentUsed?: number;
  alertThresholdPercent: number;
  period?: string;
  active?: boolean;
}

export interface InvestmentGoal {
  id: string;
  name: string;
  targetCents: number;
  currentCents: number;
  percentDone?: number;
  dueDate?: string | null;
  notes?: string | null;
}

export interface PersonalFinanceSummary {
  month: {
    incomeCents: number;
    expenseCents: number;
    resultCents: number;
  };
  byCategory: Array<{ category: string; amountCents: number }>;
  limits: SpendingLimit[];
  goals: InvestmentGoal[];
  accounts: PersonalAccount[];
  cards: PersonalCard[];
}

const arr = <T>(data: unknown): T[] => (Array.isArray(data) ? (data as T[]) : []);

export const fetchPersonalFinance = createAsyncThunk('personalFinance/fetchAll', async () => {
  const [summary, transactions, limits, goals, accounts, cards] = await Promise.all([
    api<PersonalFinanceSummary>('GET', '/personal-finance/summary'),
    api('GET', '/personal-finance/transactions'),
    api('GET', '/personal-finance/limits'),
    api('GET', '/personal-finance/goals'),
    api('GET', '/personal-finance/accounts'),
    api('GET', '/personal-finance/cards'),
  ]);
  return {
    summary: summary.data,
    transactions: arr<PersonalTransaction>(transactions.data),
    limits: arr<SpendingLimit>(limits.data),
    goals: arr<InvestmentGoal>(goals.data),
    accounts: arr<PersonalAccount>(accounts.data),
    cards: arr<PersonalCard>(cards.data),
  };
});

export const ingestFinanceMessage = createAsyncThunk(
  'personalFinance/ingest',
  async (message: string, { dispatch, rejectWithValue }) => {
    const { status, data } = await api<{ reply?: string }>('POST', '/personal-finance/ingest', {
      message,
      source: 'WHATSAPP_TEXT',
    });
    if (status >= 300) return rejectWithValue('Nao consegui registrar essa mensagem.');
    await dispatch(fetchPersonalFinance());
    return data.reply ?? 'Registro criado.';
  },
);

export const createPersonalAccount = createAsyncThunk(
  'personalFinance/account',
  async (
    body: { name: string; type?: string; balanceCents?: number },
    { dispatch, rejectWithValue },
  ) => {
    const { status } = await api('POST', '/personal-finance/accounts', body);
    if (status >= 300) return rejectWithValue('Erro ao criar conta.');
    await dispatch(fetchPersonalFinance());
    return true;
  },
);

export const createPersonalCard = createAsyncThunk(
  'personalFinance/card',
  async (
    body: { name: string; limitCents: number; closingDay?: number; dueDay?: number },
    { dispatch, rejectWithValue },
  ) => {
    const { status } = await api('POST', '/personal-finance/cards', body);
    if (status >= 300) return rejectWithValue('Erro ao criar cartao.');
    await dispatch(fetchPersonalFinance());
    return true;
  },
);

export const createSpendingLimit = createAsyncThunk(
  'personalFinance/limit',
  async (
    body: { category: string; limitCents: number; alertThresholdPercent?: number },
    { dispatch, rejectWithValue },
  ) => {
    const { status } = await api('POST', '/personal-finance/limits', body);
    if (status >= 300) return rejectWithValue('Erro ao criar limite.');
    await dispatch(fetchPersonalFinance());
    return true;
  },
);

export const createInvestmentGoal = createAsyncThunk(
  'personalFinance/goal',
  async (
    body: { name: string; targetCents: number; currentCents?: number },
    { dispatch, rejectWithValue },
  ) => {
    const { status } = await api('POST', '/personal-finance/goals', body);
    if (status >= 300) return rejectWithValue('Erro ao criar meta.');
    await dispatch(fetchPersonalFinance());
    return true;
  },
);

export const updatePersonalAccount = createAsyncThunk(
  'personalFinance/updateAccount',
  async (
    body: { id: string; name?: string; type?: string; balanceCents?: number; active?: boolean },
    { dispatch, rejectWithValue },
  ) => {
    const { id, ...payload } = body;
    const { status } = await api('PATCH', `/personal-finance/accounts/${id}`, payload);
    if (status >= 300) return rejectWithValue('Erro ao atualizar conta.');
    await dispatch(fetchPersonalFinance());
    return true;
  },
);

export const deletePersonalAccount = createAsyncThunk(
  'personalFinance/deleteAccount',
  async (id: string, { dispatch, rejectWithValue }) => {
    const { status } = await api('DELETE', `/personal-finance/accounts/${id}`);
    if (status >= 300) return rejectWithValue('Erro ao excluir conta.');
    await dispatch(fetchPersonalFinance());
    return true;
  },
);

export const updatePersonalCard = createAsyncThunk(
  'personalFinance/updateCard',
  async (
    body: {
      id: string;
      name?: string;
      limitCents?: number;
      closingDay?: number | null;
      dueDay?: number | null;
      active?: boolean;
    },
    { dispatch, rejectWithValue },
  ) => {
    const { id, ...payload } = body;
    const { status } = await api('PATCH', `/personal-finance/cards/${id}`, payload);
    if (status >= 300) return rejectWithValue('Erro ao atualizar cartao.');
    await dispatch(fetchPersonalFinance());
    return true;
  },
);

export const deletePersonalCard = createAsyncThunk(
  'personalFinance/deleteCard',
  async (id: string, { dispatch, rejectWithValue }) => {
    const { status } = await api('DELETE', `/personal-finance/cards/${id}`);
    if (status >= 300) return rejectWithValue('Erro ao excluir cartao.');
    await dispatch(fetchPersonalFinance());
    return true;
  },
);

export const updatePersonalTransaction = createAsyncThunk(
  'personalFinance/updateTransaction',
  async (
    body: {
      id: string;
      accountId?: string | null;
      cardId?: string | null;
      type?: string;
      amountCents?: number;
      description?: string;
      category?: string;
      subcategory?: string | null;
      occurredAt?: string;
      source?: string;
      rawInput?: string | null;
      attachmentUrl?: string | null;
    },
    { dispatch, rejectWithValue },
  ) => {
    const { id, ...payload } = body;
    const { status } = await api('PATCH', `/personal-finance/transactions/${id}`, payload);
    if (status >= 300) return rejectWithValue('Erro ao atualizar transacao.');
    await dispatch(fetchPersonalFinance());
    return true;
  },
);

export const deletePersonalTransaction = createAsyncThunk(
  'personalFinance/deleteTransaction',
  async (id: string, { dispatch, rejectWithValue }) => {
    const { status } = await api('DELETE', `/personal-finance/transactions/${id}`);
    if (status >= 300) return rejectWithValue('Erro ao excluir transacao.');
    await dispatch(fetchPersonalFinance());
    return true;
  },
);

export const updateSpendingLimit = createAsyncThunk(
  'personalFinance/updateLimit',
  async (
    body: {
      id: string;
      category?: string;
      period?: string;
      limitCents?: number;
      alertThresholdPercent?: number;
      active?: boolean;
    },
    { dispatch, rejectWithValue },
  ) => {
    const { id, ...payload } = body;
    const { status } = await api('PATCH', `/personal-finance/limits/${id}`, payload);
    if (status >= 300) return rejectWithValue('Erro ao atualizar limite.');
    await dispatch(fetchPersonalFinance());
    return true;
  },
);

export const deleteSpendingLimit = createAsyncThunk(
  'personalFinance/deleteLimit',
  async (id: string, { dispatch, rejectWithValue }) => {
    const { status } = await api('DELETE', `/personal-finance/limits/${id}`);
    if (status >= 300) return rejectWithValue('Erro ao excluir limite.');
    await dispatch(fetchPersonalFinance());
    return true;
  },
);

export const updateInvestmentGoal = createAsyncThunk(
  'personalFinance/updateGoal',
  async (
    body: {
      id: string;
      name?: string;
      targetCents?: number;
      currentCents?: number;
      dueDate?: string | null;
      notes?: string | null;
    },
    { dispatch, rejectWithValue },
  ) => {
    const { id, ...payload } = body;
    const { status } = await api('PATCH', `/personal-finance/goals/${id}`, payload);
    if (status >= 300) return rejectWithValue('Erro ao atualizar meta.');
    await dispatch(fetchPersonalFinance());
    return true;
  },
);

export const deleteInvestmentGoal = createAsyncThunk(
  'personalFinance/deleteGoal',
  async (id: string, { dispatch, rejectWithValue }) => {
    const { status } = await api('DELETE', `/personal-finance/goals/${id}`);
    if (status >= 300) return rejectWithValue('Erro ao excluir meta.');
    await dispatch(fetchPersonalFinance());
    return true;
  },
);

interface PersonalFinanceState {
  summary: PersonalFinanceSummary | null;
  transactions: PersonalTransaction[];
  limits: SpendingLimit[];
  goals: InvestmentGoal[];
  accounts: PersonalAccount[];
  cards: PersonalCard[];
  lastReply: string | null;
  error: string | null;
}

const initialState: PersonalFinanceState = {
  summary: null,
  transactions: [],
  limits: [],
  goals: [],
  accounts: [],
  cards: [],
  lastReply: null,
  error: null,
};

const personalFinanceSlice = createSlice({
  name: 'personalFinance',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPersonalFinance.fulfilled, (state, action) => {
        state.summary = action.payload.summary;
        state.transactions = action.payload.transactions;
        state.limits = action.payload.summary?.limits ?? action.payload.limits;
        state.goals = action.payload.summary?.goals ?? action.payload.goals;
        state.accounts = action.payload.accounts;
        state.cards = action.payload.cards;
      })
      .addCase(ingestFinanceMessage.fulfilled, (state, action) => {
        state.lastReply = action.payload;
      })
      .addMatcher(
        (action) =>
          action.type.startsWith('personalFinance/') && action.type.endsWith('/rejected'),
        (state, action: { payload?: unknown }) => {
          state.error =
            typeof action.payload === 'string' ? action.payload : 'Erro em financas pessoais.';
        },
      );
  },
});

export default personalFinanceSlice.reducer;
