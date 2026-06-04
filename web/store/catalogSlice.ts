import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '@/lib/api';

export interface Supplier {
  id: string;
  name: string;
  document?: string | null;
  phone?: string | null;
  email?: string | null;
}
export interface Product {
  id: string;
  sku: string;
  name: string;
  priceCents: number;
  costCents: number;
  stockQty: number;
  unit: string;
}
export interface StockMovement {
  id: string;
  productId: string;
  type: string;
  qty: number;
  reason: string;
  createdAt: string;
}

const arr = <T>(d: unknown): T[] => (Array.isArray(d) ? (d as T[]) : []);

export const fetchSuppliers = createAsyncThunk('catalog/fetchSuppliers', async () =>
  arr<Supplier>((await api('GET', '/suppliers')).data),
);
export const fetchProducts = createAsyncThunk('catalog/fetchProducts', async () =>
  arr<Product>((await api('GET', '/products')).data),
);
export const fetchMovements = createAsyncThunk('catalog/fetchMovements', async () =>
  arr<StockMovement>((await api('GET', '/stock/movements')).data),
);

export const createSupplier = createAsyncThunk(
  'catalog/createSupplier',
  async (
    body: { name: string; document?: string; phone?: string; email?: string },
    { dispatch, rejectWithValue },
  ) => {
    const { status } = await api('POST', '/suppliers', body);
    if (status >= 300) return rejectWithValue('Erro ao salvar fornecedor.');
    await dispatch(fetchSuppliers());
    return true;
  },
);

export const createProduct = createAsyncThunk(
  'catalog/createProduct',
  async (
    body: {
      sku: string;
      name: string;
      priceCents: number;
      costCents: number;
      unit?: string;
    },
    { dispatch, rejectWithValue },
  ) => {
    const { status } = await api('POST', '/products', body);
    if (status >= 300) return rejectWithValue('Erro ao salvar produto.');
    await dispatch(fetchProducts());
    return true;
  },
);

export const adjustStock = createAsyncThunk(
  'catalog/adjustStock',
  async (
    body: { productId: string; qty: number; reason: string },
    { dispatch, rejectWithValue },
  ) => {
    const { status } = await api('POST', '/stock/adjust', body);
    if (status >= 300) return rejectWithValue('Erro ao ajustar estoque.');
    await Promise.all([dispatch(fetchMovements()), dispatch(fetchProducts())]);
    return true;
  },
);

interface CatalogState {
  suppliers: Supplier[];
  products: Product[];
  movements: StockMovement[];
}
const initialState: CatalogState = { suppliers: [], products: [], movements: [] };

const catalogSlice = createSlice({
  name: 'catalog',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSuppliers.fulfilled, (s, a) => {
        s.suppliers = a.payload;
      })
      .addCase(fetchProducts.fulfilled, (s, a) => {
        s.products = a.payload;
      })
      .addCase(fetchMovements.fulfilled, (s, a) => {
        s.movements = a.payload;
      });
  },
});

export default catalogSlice.reducer;
