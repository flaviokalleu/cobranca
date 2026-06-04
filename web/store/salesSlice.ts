import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '@/lib/api';

export interface SalesOrder {
  id: string;
  number: number;
  customerId: string;
  status: string;
  totalCents: number;
  chargeId?: string | null;
  createdAt: string;
}

const arr = <T>(d: unknown): T[] => (Array.isArray(d) ? (d as T[]) : []);

export const fetchSales = createAsyncThunk('sales/fetchSales', async () =>
  arr<SalesOrder>((await api('GET', '/sales')).data),
);

export const createSale = createAsyncThunk(
  'sales/createSale',
  async (
    body: { customerId: string; items: { productId: string; qty: number }[] },
    { dispatch, rejectWithValue },
  ) => {
    const { status } = await api('POST', '/sales', body);
    if (status >= 300) return rejectWithValue('Erro ao criar pedido.');
    await dispatch(fetchSales());
    return true;
  },
);

export const confirmSale = createAsyncThunk(
  'sales/confirmSale',
  async (id: string, { dispatch, rejectWithValue }) => {
    const { status } = await api('POST', `/sales/${id}/confirm`);
    if (status >= 300) return rejectWithValue('Erro ao confirmar pedido.');
    await dispatch(fetchSales());
    return true;
  },
);

interface SalesState {
  orders: SalesOrder[];
}
const initialState: SalesState = { orders: [] };

const salesSlice = createSlice({
  name: 'sales',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(fetchSales.fulfilled, (s, a) => {
      s.orders = a.payload;
    });
  },
});

export default salesSlice.reducer;
