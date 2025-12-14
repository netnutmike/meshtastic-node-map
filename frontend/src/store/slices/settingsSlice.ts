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

const defaultSettings: SettingsState = {
  nodesMaxAge: 86400, // 24 hours
  nodesDisconnectedAge: 3600, // 1 hour
  nodesOfflineAge: 300, // 5 minutes
  defaultZoom: 10,
  temperatureFormat: 'celsius',
  autoUpdatePositionInUrl: true,
  showAll: false,
};

// Load settings from localStorage
const loadSettingsFromStorage = (): SettingsState => {
  try {
    const savedSettings = localStorage.getItem('meshtastic-node-mapper-settings');
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      // Merge with defaults to handle new settings added in updates
      return { ...defaultSettings, ...parsed };
    }
  } catch (error) {
    console.warn('Failed to load settings from localStorage:', error);
  }
  return defaultSettings;
};

// Save settings to localStorage
const saveSettingsToStorage = (settings: SettingsState) => {
  try {
    localStorage.setItem('meshtastic-node-mapper-settings', JSON.stringify(settings));
  } catch (error) {
    console.warn('Failed to save settings to localStorage:', error);
  }
};

const initialState: SettingsState = loadSettingsFromStorage();

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    updateSettings: (state, action: PayloadAction<Partial<SettingsState>>) => {
      const newState = { ...state, ...action.payload };
      saveSettingsToStorage(newState);
      return newState;
    },
    resetSettings: () => {
      saveSettingsToStorage(defaultSettings);
      return defaultSettings;
    },
    toggleShowAll: (state) => {
      state.showAll = !state.showAll;
      saveSettingsToStorage(state);
    },
  },
});

export const {
  updateSettings,
  resetSettings,
  toggleShowAll,
} = settingsSlice.actions;

export default settingsSlice.reducer;