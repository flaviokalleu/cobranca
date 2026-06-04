import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import dataReducer from './dataSlice';
import catalogReducer from './catalogSlice';
import financeReducer from './financeSlice';
import salesReducer from './salesSlice';
import purchaseReducer from './purchaseSlice';
import tasksReducer from './tasksSlice';
import crmReducer from './crmSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    data: dataReducer,
    catalog: catalogReducer,
    finance: financeReducer,
    sales: salesReducer,
    purchases: purchaseReducer,
    tasks: tasksReducer,
    crm: crmReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
