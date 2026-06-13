import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '@/lib/http-client';

export interface FinancialCategory {
  id: string;
  name: string;
  type: 'INCOME' | 'EXPENSE';
  color: string;
  isDefault: boolean;
}

interface CategoriesState {
  items: FinancialCategory[];
  seeded: boolean;
}

const initialState: CategoriesState = { items: [], seeded: false };

export const fetchCategories = createAsyncThunk('categories/fetch', async () => {
  const { data } = await api<FinancialCategory[]>('GET', '/categories');
  return Array.isArray(data) ? data : [];
});

export const seedCategories = createAsyncThunk(
  'categories/seed',
  async (_, { dispatch }) => {
    await api('POST', '/categories/seed');
    await dispatch(fetchCategories());
  },
);

export const createCategory = createAsyncThunk(
  'categories/create',
  async (body: { name: string; type: string; color: string }, { dispatch, rejectWithValue }) => {
    const { status } = await api('POST', '/categories', body);
    if (status >= 300) return rejectWithValue('Erro ao criar categoria.');
    await dispatch(fetchCategories());
    return true;
  },
);

export const updateCategory = createAsyncThunk(
  'categories/update',
  async (body: { id: string; name?: string; color?: string }, { dispatch, rejectWithValue }) => {
    const { id, ...data } = body;
    const { status } = await api('PATCH', `/categories/${id}`, data);
    if (status >= 300) return rejectWithValue('Erro ao atualizar categoria.');
    await dispatch(fetchCategories());
    return true;
  },
);

export const deleteCategory = createAsyncThunk(
  'categories/delete',
  async (id: string, { dispatch, rejectWithValue }) => {
    const { status } = await api('DELETE', `/categories/${id}`);
    if (status >= 300) return rejectWithValue('Erro ao excluir categoria.');
    await dispatch(fetchCategories());
    return true;
  },
);

const categoriesSlice = createSlice({
  name: 'categories',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(fetchCategories.fulfilled, (state, action) => {
      state.items = action.payload;
      state.seeded = true;
    });
  },
});

export default categoriesSlice.reducer;
