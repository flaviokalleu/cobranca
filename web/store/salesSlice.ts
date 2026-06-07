import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '@/lib/api';
import { asArray } from '@/lib/pagination';

export interface SalesOrder {
  id: string;
  number: number;
  customerId: string;
  status: string;
  totalCents: number;
  chargeId?: string | null;
  createdAt: string;
  items?: SalesOrderItem[];
}

export interface SalesOrderItem {
  id: string;
  productId: string;
  qty: number;
  unitPriceCents: number;
  totalCents: number;
}

export const fetchSales = createAsyncThunk('sales/fetchSales', async () =>
  asArray<SalesOrder>((await api('GET', '/sales')).data),
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

export const updateSale = createAsyncThunk(
  'sales/updateSale',
  async (
    body: { id: string; customerId?: string; items?: { productId: string; qty: number }[] },
    { dispatch, rejectWithValue },
  ) => {
    const { id, ...payload } = body;
    const { status } = await api('PATCH', `/sales/${id}`, payload);
    if (status >= 300) return rejectWithValue('Erro ao atualizar pedido.');
    await dispatch(fetchSales());
    return true;
  },
);

export const deleteSale = createAsyncThunk(
  'sales/deleteSale',
  async (id: string, { dispatch, rejectWithValue }) => {
    const { status } = await api('DELETE', `/sales/${id}`);
    if (status >= 300) return rejectWithValue('Erro ao excluir pedido.');
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
