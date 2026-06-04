import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { api } from '@/lib/api';

export interface NotificationItem {
  id: string;
  channel: string;
  title: string;
  message: string;
  status: string;
  entityType?: string | null;
  scheduledAt?: string | null;
  sentAt?: string | null;
  createdAt: string;
}

const arr = <T>(data: unknown): T[] => (Array.isArray(data) ? (data as T[]) : []);

export const fetchNotifications = createAsyncThunk('notifications/fetch', async () =>
  arr<NotificationItem>((await api('GET', '/notifications')).data),
);

export const createNotification = createAsyncThunk(
  'notifications/create',
  async (
    body: { channel?: string; title: string; message: string; scheduledAt?: string },
    { dispatch, rejectWithValue },
  ) => {
    const { status } = await api('POST', '/notifications', body);
    if (status >= 300) return rejectWithValue('Erro ao criar notificacao.');
    await dispatch(fetchNotifications());
    return true;
  },
);

export const markNotificationRead = createAsyncThunk(
  'notifications/read',
  async (id: string, { dispatch, rejectWithValue }) => {
    const { status } = await api('PATCH', `/notifications/${id}/read`);
    if (status >= 300) return rejectWithValue('Erro ao marcar notificacao.');
    await dispatch(fetchNotifications());
    return true;
  },
);

interface NotificationsState {
  items: NotificationItem[];
  error: string | null;
}

const initialState: NotificationsState = {
  items: [],
  error: null,
};

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.items = action.payload;
      })
      .addMatcher(
        (action) => action.type.startsWith('notifications/') && action.type.endsWith('/rejected'),
        (state, action: { payload?: unknown }) => {
          state.error =
            typeof action.payload === 'string' ? action.payload : 'Erro em notificacoes.';
        },
      );
  },
});

export default notificationsSlice.reducer;
