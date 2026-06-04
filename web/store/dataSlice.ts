import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '@/lib/api';

export interface Customer {
  id: string;
  name: string;
  document?: string | null;
  phone: string;
  whatsapp?: string | null;
  email?: string | null;
  city?: string | null;
  profession?: string | null;
  incomeCents?: number | null;
}
export interface Charge {
  id: string;
  amountCents: number;
  description: string;
  dueDate: string;
  status: string;
  paidAt?: string | null;
}
export interface User {
  id: string;
  email: string;
  role: string;
  createdAt?: string;
}
export interface AuditEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  actor: string;
  createdAt: string;
}
export interface Settings {
  pixKey: string;
  merchantName: string;
  merchantCity: string;
}

interface DataState {
  customers: Customer[];
  charges: Charge[];
  users: User[];
  audit: AuditEntry[];
  settings: Settings | null;
  pix: { id: string; code: string } | null;
  error: string | null;
}

const initialState: DataState = {
  customers: [],
  charges: [],
  users: [],
  audit: [],
  settings: null,
  pix: null,
  error: null,
};

const asArray = <T>(data: unknown): T[] => (Array.isArray(data) ? (data as T[]) : []);

export const fetchCustomers = createAsyncThunk('data/fetchCustomers', async () =>
  asArray<Customer>((await api('GET', '/customers')).data),
);
export const fetchCharges = createAsyncThunk('data/fetchCharges', async () =>
  asArray<Charge>((await api('GET', '/charges')).data),
);
export const fetchUsers = createAsyncThunk('data/fetchUsers', async () =>
  asArray<User>((await api('GET', '/users')).data),
);
export const fetchAudit = createAsyncThunk('data/fetchAudit', async () =>
  asArray<AuditEntry>((await api('GET', '/audit')).data),
);
export const fetchSettings = createAsyncThunk('data/fetchSettings', async () => {
  const { data } = await api<Settings>('GET', '/settings');
  return data;
});

export const createCustomer = createAsyncThunk(
  'data/createCustomer',
  async (
    body: {
      name: string;
      document?: string;
      phone: string;
      whatsapp?: string;
      email?: string;
      city?: string;
      profession?: string;
      incomeCents?: number;
    },
    { dispatch, rejectWithValue },
  ) => {
    const { status } = await api('POST', '/customers', body);
    if (status >= 300) return rejectWithValue('Erro ao criar cliente (telefone: 10-15 dígitos).');
    await dispatch(fetchCustomers());
    return true;
  },
);

export const updateCustomer = createAsyncThunk(
  'data/updateCustomer',
  async (
    body: {
      id: string;
      name?: string;
      document?: string;
      phone?: string;
      whatsapp?: string;
      email?: string;
      city?: string;
      profession?: string;
      incomeCents?: number;
    },
    { dispatch, rejectWithValue },
  ) => {
    const { id, ...data } = body;
    const { status } = await api('PATCH', `/customers/${id}`, data);
    if (status >= 300) return rejectWithValue('Erro ao atualizar cliente.');
    await dispatch(fetchCustomers());
    return true;
  },
);

export const deleteCustomer = createAsyncThunk(
  'data/deleteCustomer',
  async (id: string, { dispatch, rejectWithValue }) => {
    const { status } = await api('DELETE', `/customers/${id}`);
    if (status >= 300) return rejectWithValue('Erro ao excluir cliente.');
    await dispatch(fetchCustomers());
    return true;
  },
);

export const createCharge = createAsyncThunk(
  'data/createCharge',
  async (
    body: { customerId: string; amountCents: number; description: string; dueDate: string },
    { dispatch, rejectWithValue },
  ) => {
    const { status } = await api('POST', '/charges', body);
    if (status >= 300) return rejectWithValue('Erro ao criar cobrança (escolha cliente e data válida).');
    await dispatch(fetchCharges());
    return true;
  },
);

export const payCharge = createAsyncThunk(
  'data/payCharge',
  async (id: string, { dispatch, rejectWithValue }) => {
    const { status } = await api('POST', `/charges/${id}/pay`);
    if (status === 403) return rejectWithValue('Apenas ADMIN pode dar baixa.');
    if (status >= 300) return rejectWithValue('Erro ao registrar pagamento.');
    await dispatch(fetchCharges());
    return true;
  },
);

export const updateCharge = createAsyncThunk(
  'data/updateCharge',
  async (
    body: { id: string; description?: string; dueDate?: string },
    { dispatch, rejectWithValue },
  ) => {
    const { id, ...data } = body;
    const { status } = await api('PATCH', `/charges/${id}`, data);
    if (status >= 300) return rejectWithValue('Erro ao editar cobrança.');
    await dispatch(fetchCharges());
    return true;
  },
);

export const deleteCharge = createAsyncThunk(
  'data/deleteCharge',
  async (id: string, { dispatch, rejectWithValue }) => {
    const { status } = await api('DELETE', `/charges/${id}`);
    if (status === 403) return rejectWithValue('Apenas ADMIN/FINANCE pode excluir.');
    if (status >= 300) return rejectWithValue('Erro ao excluir cobrança.');
    await dispatch(fetchCharges());
    return true;
  },
);

export const createUser = createAsyncThunk(
  'data/createUser',
  async (
    body: { email: string; password: string; role: string },
    { dispatch, rejectWithValue },
  ) => {
    const { status } = await api('POST', '/users', body);
    if (status >= 300) return rejectWithValue('Erro ao criar usuário (e-mail já existe?).');
    await dispatch(fetchUsers());
    return true;
  },
);

export const saveSettings = createAsyncThunk(
  'data/saveSettings',
  async (body: Settings, { rejectWithValue }) => {
    const { status, data } = await api<Settings>('PUT', '/settings', body);
    if (status >= 300) return rejectWithValue('Erro ao salvar configurações.');
    return data;
  },
);

export const fetchPix = createAsyncThunk('data/fetchPix', async (id: string) => {
  const { data } = await api<{ pixCopyPaste: string }>('GET', `/charges/${id}/pix`);
  return { id, code: data.pixCopyPaste };
});

const dataSlice = createSlice({
  name: 'data',
  initialState,
  reducers: {
    clearPix(state) {
      state.pix = null;
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCustomers.fulfilled, (s, a) => {
        s.customers = a.payload;
      })
      .addCase(fetchCharges.fulfilled, (s, a) => {
        s.charges = a.payload;
      })
      .addCase(fetchUsers.fulfilled, (s, a) => {
        s.users = a.payload;
      })
      .addCase(fetchAudit.fulfilled, (s, a) => {
        s.audit = a.payload;
      })
      .addCase(fetchSettings.fulfilled, (s, a) => {
        s.settings = a.payload;
      })
      .addCase(saveSettings.fulfilled, (s, a) => {
        s.settings = a.payload;
      })
      .addCase(fetchPix.fulfilled, (s, a) => {
        s.pix = a.payload;
      })
      .addMatcher(
        (a) => a.type.startsWith('data/') && a.type.endsWith('/rejected'),
        (s, a: { payload?: unknown }) => {
          s.error = typeof a.payload === 'string' ? a.payload : 'Erro inesperado.';
        },
      );
  },
});

export const { clearPix, clearError } = dataSlice.actions;
export default dataSlice.reducer;
