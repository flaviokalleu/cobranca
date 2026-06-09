import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { api } from '@/lib/http-client';
import { asArray } from '@/lib/pagination';

export interface DocumentRequirement {
  id: string;
  name: string;
  category: string;
  description?: string | null;
}

export interface CustomerDocument {
  id: string;
  customerId: string;
  requirementId?: string | null;
  name: string;
  status: string;
  fileName?: string | null;
  fileUrl?: string | null;
  notes?: string | null;
  updatedAt: string;
}

export const fetchRequirements = createAsyncThunk('documents/requirements', async () =>
  asArray<DocumentRequirement>((await api('GET', '/documents/requirements')).data),
);

export const createRequirement = createAsyncThunk(
  'documents/createRequirement',
  async (
    body: { name: string; category?: string; description?: string },
    { dispatch, rejectWithValue },
  ) => {
    const { status } = await api('POST', '/documents/requirements', body);
    if (status >= 300) return rejectWithValue('Erro ao criar requisito documental.');
    await dispatch(fetchRequirements());
    return true;
  },
);

export const updateRequirement = createAsyncThunk(
  'documents/updateRequirement',
  async (
    body: { id: string; name?: string; category?: string; description?: string | null },
    { dispatch, rejectWithValue },
  ) => {
    const { id, ...payload } = body;
    const { status } = await api('PATCH', `/documents/requirements/${id}`, payload);
    if (status >= 300) return rejectWithValue('Erro ao atualizar requisito documental.');
    await dispatch(fetchRequirements());
    return true;
  },
);

export const deleteRequirement = createAsyncThunk(
  'documents/deleteRequirement',
  async (id: string, { dispatch, rejectWithValue }) => {
    const { status } = await api('DELETE', `/documents/requirements/${id}`);
    if (status >= 300) return rejectWithValue('Erro ao excluir requisito documental.');
    await dispatch(fetchRequirements());
    return true;
  },
);

export const fetchCustomerDocuments = createAsyncThunk(
  'documents/customerDocuments',
  async (customerId: string) =>
    asArray<CustomerDocument>((await api('GET', `/documents/customers/${customerId}`)).data),
);

export const createCustomerDocument = createAsyncThunk(
  'documents/createCustomerDocument',
  async (
    body: {
      customerId: string;
      name: string;
      status?: string;
      fileName?: string;
      fileUrl?: string;
      notes?: string;
    },
    { dispatch, rejectWithValue },
  ) => {
    const { customerId, ...payload } = body;
    const { status } = await api('POST', `/documents/customers/${customerId}`, payload);
    if (status >= 300) return rejectWithValue('Erro ao criar documento do cliente.');
    await dispatch(fetchCustomerDocuments(customerId));
    return true;
  },
);

export const updateCustomerDocumentStatus = createAsyncThunk(
  'documents/updateStatus',
  async (
    body: { id: string; customerId: string; status: string; fileName?: string; fileUrl?: string; notes?: string },
    { dispatch, rejectWithValue },
  ) => {
    const { id, customerId, ...payload } = body;
    const { status } = await api('PATCH', `/documents/customer-documents/${id}/status`, payload);
    if (status >= 300) return rejectWithValue('Erro ao atualizar status do documento.');
    await dispatch(fetchCustomerDocuments(customerId));
    return true;
  },
);

export const updateCustomerDocument = createAsyncThunk(
  'documents/updateCustomerDocument',
  async (
    body: {
      id: string;
      customerId: string;
      requirementId?: string | null;
      name?: string;
      status?: string;
      fileName?: string | null;
      fileUrl?: string | null;
      notes?: string | null;
    },
    { dispatch, rejectWithValue },
  ) => {
    const { id, customerId, ...payload } = body;
    const { status } = await api('PATCH', `/documents/customer-documents/${id}`, payload);
    if (status >= 300) return rejectWithValue('Erro ao atualizar documento do cliente.');
    await dispatch(fetchCustomerDocuments(customerId));
    return true;
  },
);

export const deleteCustomerDocument = createAsyncThunk(
  'documents/deleteCustomerDocument',
  async (body: { id: string; customerId: string }, { dispatch, rejectWithValue }) => {
    const { status } = await api('DELETE', `/documents/customer-documents/${body.id}`);
    if (status >= 300) return rejectWithValue('Erro ao excluir documento do cliente.');
    await dispatch(fetchCustomerDocuments(body.customerId));
    return true;
  },
);

interface DocumentsState {
  requirements: DocumentRequirement[];
  customerDocuments: CustomerDocument[];
  error: string | null;
}

const initialState: DocumentsState = {
  requirements: [],
  customerDocuments: [],
  error: null,
};

const documentsSlice = createSlice({
  name: 'documents',
  initialState,
  reducers: {
    clearDocumentsError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRequirements.fulfilled, (state, action) => {
        state.requirements = action.payload;
      })
      .addCase(fetchCustomerDocuments.fulfilled, (state, action) => {
        state.customerDocuments = action.payload;
      })
      .addMatcher(
        (action) => action.type.startsWith('documents/') && action.type.endsWith('/rejected'),
        (state, action: { payload?: unknown }) => {
          state.error = typeof action.payload === 'string' ? action.payload : 'Erro em documentos.';
        },
      );
  },
});

export const { clearDocumentsError } = documentsSlice.actions;
export default documentsSlice.reducer;
