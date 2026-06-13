import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import dataReducer from './dataSlice';
import catalogReducer from './catalogSlice';
import financeReducer from './financeSlice';
import salesReducer from './salesSlice';
import purchaseReducer from './purchaseSlice';
import tasksReducer from './tasksSlice';
import crmReducer from './crmSlice';
import documentsReducer from './documentsSlice';
import calendarReducer from './calendarSlice';
import notificationsReducer from './notificationsSlice';
import aiReducer from './aiSlice';
import personalFinanceReducer from './personalFinanceSlice';
import financialEntriesReducer from './financialEntriesSlice';
import categoriesReducer from './categoriesSlice';

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
    documents: documentsReducer,
    calendar: calendarReducer,
    notifications: notificationsReducer,
    ai: aiReducer,
    personalFinance: personalFinanceReducer,
    financialEntries: financialEntriesReducer,
    categories: categoriesReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
