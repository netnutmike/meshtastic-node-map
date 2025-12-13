import { configureStore } from '@reduxjs/toolkit';
import mapReducer from './slices/mapSlice';
import nodeReducer from './slices/nodeSlice';
import settingsReducer from './slices/settingsSlice';

export const store = configureStore({
  reducer: {
    map: mapReducer,
    nodes: nodeReducer,
    settings: settingsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;