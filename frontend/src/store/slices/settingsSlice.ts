import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface SettingsState {
  nodesMaxAge: number;
  nodesDisconnectedAge: number;
  nodesOfflineAge: number;
  defaultZoom: number;
  temperatureFormat: 'celsius' | 'fahrenheit';
  autoUpdatePositionInUrl: boolean;
  showAll: boolean;
}

const initialState: SettingsState = {
  nodesMaxAge: 86400, // 24 hours
  nodesDisconnectedAge: 3600, // 1 hour
  nodesOfflineAge: 300, // 5 minutes
  defaultZoom: 10,
  temperatureFormat: 'celsius',
  autoUpdatePositionInUrl: true,
  showAll: false,
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    updateSettings: (state, action: PayloadAction<Partial<SettingsState>>) => {
      return { ...state, ...action.payload };
    },
    resetSettings: () => initialState,
    toggleShowAll: (state) => {
      state.showAll = !state.showAll;
    },
  },
});

export const {
  updateSettings,
  resetSettings,
  toggleShowAll,
} = settingsSlice.actions;

export default settingsSlice.reducer;