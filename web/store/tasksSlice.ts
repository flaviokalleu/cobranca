import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '@/lib/http-client';
import { asArray } from '@/lib/pagination';

export interface Task {
  id: string;
  title: string;
  notes?: string | null;
  done: boolean;
  dueDate?: string | null;
  priority: string;
  assignee?: string | null;
  createdAt: string;
}

export const fetchTasks = createAsyncThunk('tasks/fetch', async () =>
  asArray<Task>((await api('GET', '/tasks')).data),
);

export const createTask = createAsyncThunk(
  'tasks/create',
  async (
    body: { title: string; dueDate?: string; priority?: string; notes?: string },
    { dispatch, rejectWithValue },
  ) => {
    const { status } = await api('POST', '/tasks', body);
    if (status >= 300) return rejectWithValue('Erro ao criar tarefa.');
    await dispatch(fetchTasks());
    return true;
  },
);

export const toggleTask = createAsyncThunk(
  'tasks/toggle',
  async (id: string, { dispatch }) => {
    await api('PATCH', `/tasks/${id}/toggle`);
    await dispatch(fetchTasks());
    return true;
  },
);

export const updateTask = createAsyncThunk(
  'tasks/update',
  async (
    body: {
      id: string;
      title?: string;
      dueDate?: string;
      priority?: string;
      notes?: string;
      done?: boolean;
    },
    { dispatch, rejectWithValue },
  ) => {
    const { id, ...payload } = body;
    const { status } = await api('PATCH', `/tasks/${id}`, payload);
    if (status >= 300) return rejectWithValue('Erro ao atualizar tarefa.');
    await dispatch(fetchTasks());
    return true;
  },
);

export const deleteTask = createAsyncThunk(
  'tasks/delete',
  async (id: string, { dispatch, rejectWithValue }) => {
    const { status } = await api('DELETE', `/tasks/${id}`);
    if (status >= 300) return rejectWithValue('Erro ao excluir tarefa.');
    await dispatch(fetchTasks());
    return true;
  },
);

interface TasksState {
  tasks: Task[];
}
const initialState: TasksState = { tasks: [] };

const tasksSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(fetchTasks.fulfilled, (s, a) => {
      s.tasks = a.payload;
    });
  },
});

export default tasksSlice.reducer;
