import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '@/lib/api';

export interface PurchaseOrder {
  id: string;
  number: number;
  supplierId: string;
  status: string;
  totalCents: number;
  payableId?: string | null;
  createdAt: string;
}

const arr = <T>(d: unknown): T[] => (Array.isArray(d) ? (d as T[]) : []);

export const fetchPurchases = createAsyncThunk('purchases/fetch', async () =>
  arr<PurchaseOrder>((await api('GET', '/purchases')).data),
);

export const createPurchase = createAsyncThunk(
  'purchases/create',
  async (
    body: {
      supplierId: string;
      items: { productId: string; qty: number; unitCostCents?: number }[];
    },
    { dispatch, rejectWithValue },
  ) => {
    const { status } = await api('POST', '/purchases', body);
    if (status >= 300) return rejectWithValue('Erro ao criar pedido de compra.');
    await dispatch(fetchPurchases());
    return true;
  },
);

export const receivePurchase = createAsyncThunk(
  'purchases/receive',
  async (id: string, { dispatch, rejectWithValue }) => {
    const { status } = await api('POST', `/purchases/${id}/receive`);
    if (status >= 300) return rejectWithValue('Erro ao receber compra.');
    await dispatch(fetchPurchases());
    return true;
  },
);

interface PurchaseState {
  orders: PurchaseOrder[];
}
const initialState: PurchaseState = { orders: [] };

const purchaseSlice = createSlice({
  name: 'purchases',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(fetchPurchases.fulfilled, (s, a) => {
      s.orders = a.payload;
    });
  },
});

export default purchaseSlice.reducer;
