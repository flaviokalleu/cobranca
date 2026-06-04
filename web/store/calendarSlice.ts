import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { api } from '@/lib/api';

export interface CalendarEvent {
  id: string;
  title: string;
  type: string;
  startsAt: string;
  endsAt?: string | null;
  status: string;
  customerId?: string | null;
  notes?: string | null;
}

const arr = <T>(data: unknown): T[] => (Array.isArray(data) ? (data as T[]) : []);

export const fetchEvents = createAsyncThunk('calendar/fetch', async () =>
  arr<CalendarEvent>((await api('GET', '/calendar/events')).data),
);

export const createEvent = createAsyncThunk(
  'calendar/create',
  async (
    body: { title: string; type?: string; startsAt: string; endsAt?: string; customerId?: string; notes?: string },
    { dispatch, rejectWithValue },
  ) => {
    const { status } = await api('POST', '/calendar/events', body);
    if (status >= 300) return rejectWithValue('Erro ao criar evento.');
    await dispatch(fetchEvents());
    return true;
  },
);

export const updateEventStatus = createAsyncThunk(
  'calendar/updateStatus',
  async (body: { id: string; status: string }, { dispatch, rejectWithValue }) => {
    const { status } = await api('PATCH', `/calendar/events/${body.id}/status`, {
      status: body.status,
    });
    if (status >= 300) return rejectWithValue('Erro ao atualizar evento.');
    await dispatch(fetchEvents());
    return true;
  },
);

export const updateEvent = createAsyncThunk(
  'calendar/update',
  async (
    body: {
      id: string;
      title?: string;
      type?: string;
      startsAt?: string;
      endsAt?: string | null;
      status?: string;
      customerId?: string | null;
      notes?: string | null;
    },
    { dispatch, rejectWithValue },
  ) => {
    const { id, ...payload } = body;
    const { status } = await api('PATCH', `/calendar/events/${id}`, payload);
    if (status >= 300) return rejectWithValue('Erro ao atualizar evento.');
    await dispatch(fetchEvents());
    return true;
  },
);

export const deleteEvent = createAsyncThunk(
  'calendar/delete',
  async (id: string, { dispatch, rejectWithValue }) => {
    const { status } = await api('DELETE', `/calendar/events/${id}`);
    if (status >= 300) return rejectWithValue('Erro ao excluir evento.');
    await dispatch(fetchEvents());
    return true;
  },
);

interface CalendarState {
  events: CalendarEvent[];
  error: string | null;
}

const initialState: CalendarState = {
  events: [],
  error: null,
};

const calendarSlice = createSlice({
  name: 'calendar',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchEvents.fulfilled, (state, action) => {
        state.events = action.payload;
      })
      .addMatcher(
        (action) => action.type.startsWith('calendar/') && action.type.endsWith('/rejected'),
        (state, action: { payload?: unknown }) => {
          state.error = typeof action.payload === 'string' ? action.payload : 'Erro no calendario.';
        },
      );
  },
});

export default calendarSlice.reducer;
