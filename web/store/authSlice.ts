import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '@/lib/api';

export interface AuthState {
  token: string | null;
  role: string | null;
  tenantId: string | null;
  status: 'idle' | 'loading' | 'failed';
  error: string | null;
  hydrated: boolean;
}

function initialState(): AuthState {
  return {
    token: null,
    role: null,
    tenantId: null,
    status: 'idle',
    error: null,
    hydrated: false,
  };
}

interface AuthResponse {
  accessToken?: string;
  role?: string;
  tenantId?: string;
  message?: string;
}
type Credentials = { tenantId: string; email: string; password: string };
type RegisterInput = { companyName: string; email: string; password: string };
type AuthPayload = { token: string; role: string; tenantId: string };

async function callAuth(
  path: '/auth/login' | '/auth/register',
  body: Credentials | RegisterInput,
): Promise<{ ok: true; payload: AuthPayload } | { ok: false; message: string }> {
  const { status, data } = await api<AuthResponse>('POST', path, body);
  if (status >= 300 || !data.accessToken) {
    return { ok: false, message: data.message ?? 'Não foi possível continuar.' };
  }
  return {
    ok: true,
    payload: {
      token: data.accessToken,
      role: data.role ?? '',
      tenantId: data.tenantId ?? '',
    },
  };
}

export const login = createAsyncThunk<AuthPayload, Credentials, { rejectValue: string }>(
  'auth/login',
  async (creds, { rejectWithValue }) => {
    const r = await callAuth('/auth/login', creds);
    return r.ok ? r.payload : rejectWithValue(r.message);
  },
);

export const register = createAsyncThunk<AuthPayload, RegisterInput, { rejectValue: string }>(
  'auth/register',
  async (creds, { rejectWithValue }) => {
    const r = await callAuth('/auth/register', creds);
    return r.ok ? r.payload : rejectWithValue(r.message);
  },
);

function persist(state: AuthState, payload: AuthPayload) {
  state.status = 'idle';
  state.token = payload.token;
  state.role = payload.role;
  state.tenantId = payload.tenantId;
  state.hydrated = true;
  if (typeof window !== 'undefined') {
    localStorage.setItem('token', payload.token);
    localStorage.setItem('role', payload.role);
    localStorage.setItem('tenantId', payload.tenantId);
  }
}

const authSlice = createSlice({
  name: 'auth',
  initialState: initialState(),
  reducers: {
    hydrateFromStorage(state) {
      if (typeof window !== 'undefined') {
        state.token = localStorage.getItem('token');
        state.role = localStorage.getItem('role');
        state.tenantId = localStorage.getItem('tenantId');
      }
      state.hydrated = true;
    },
    logout(state) {
      state.token = null;
      state.role = null;
      state.tenantId = null;
      state.status = 'idle';
      state.error = null;
      state.hydrated = true;
      if (typeof window !== 'undefined') localStorage.clear();
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.fulfilled, (s, a) => persist(s, a.payload))
      .addCase(register.fulfilled, (s, a) => persist(s, a.payload))
      .addMatcher(
        (a) => a.type === login.pending.type || a.type === register.pending.type,
        (s) => {
          s.status = 'loading';
          s.error = null;
        },
      )
      .addMatcher(
        (a) => a.type === login.rejected.type || a.type === register.rejected.type,
        (s, a: { payload?: unknown }) => {
          s.status = 'failed';
          s.error = typeof a.payload === 'string' ? a.payload : 'Erro ao autenticar.';
        },
      );
  },
});

export const { hydrateFromStorage, logout } = authSlice.actions;
export default authSlice.reducer;
