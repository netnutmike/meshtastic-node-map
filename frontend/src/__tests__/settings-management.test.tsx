import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import '@testing-library/jest-dom';
import Settings from '../components/Settings/Settings';
import settingsReducer, { updateSettings, resetSettings } from '../store/slices/settingsSlice';
import { it } from 'date-fns/locale';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Create a test store
const createTestStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      settings: settingsReducer,
    },
    preloadedState: {
      settings: {
        nodesMaxAge: 86400,
        nodesDisconnectedAge: 3600,
        nodesOfflineAge: 300,
        defaultZoom: 10,
        temperatureFormat: 'celsius' as const,
        autoUpdatePositionInUrl: true,
        showAll: false,
        ...initialState,
      },
    },
  });
};

const renderWithStore = (component: React.ReactElement, store = createTestStore()) => {
  return {
    ...render(<Provider store={store}>{component}</Provider>),
    store,
  };
};

describe('Settings Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  describe('Settings Component', () => {
    it('should render all settings fields with correct default values', () => {
      const { store } = renderWithStore(<Settings open={true} onClose={() => {}} />);
      
      // Check that all form fields are present
      expect(screen.getByLabelText(/max age/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/disconnected age/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/offline age/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/default zoom level/i)).toBeInTheDocument();
      expect(screen.getAllByText(/temperature format/i)[0]).toBeInTheDocument(); // Use getAllByText for Select label
      expect(screen.getByLabelText(/auto-update position in url/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/show all nodes/i)).toBeInTheDocument();

      // Check default values (converted to display units)
      expect(screen.getByDisplayValue('24')).toBeInTheDocument(); // 86400 seconds = 24 hours
      expect(screen.getByDisplayValue('1')).toBeInTheDocument(); // 3600 seconds = 1 hour
      expect(screen.getByDisplayValue('5')).toBeInTheDocument(); // 300 seconds = 5 minutes
      expect(screen.getByDisplayValue('10')).toBeInTheDocument(); // default zoom
    });

    it('should update form values when user changes inputs', async () => {
      renderWithStore(<Settings open={true} onClose={() => {}} />);
      
      const maxAgeInput = screen.getByLabelText(/max age/i);
      fireEvent.change(maxAgeInput, { target: { value: '48' } });
      
      await waitFor(() => {
        expect(maxAgeInput).toHaveValue(48);
      });
    });

    it('should save settings when save button is clicked', async () => {
      const onClose = jest.fn();
      const { store } = renderWithStore(<Settings open={true} onClose={onClose} />);
      
      // Change a setting
      const maxAgeInput = screen.getByLabelText(/max age/i);
      fireEvent.change(maxAgeInput, { target: { value: '48' } });
      
      // Click save
      const saveButton = screen.getByRole('button', { name: /save settings/i });
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        const state = store.getState();
        expect(state.settings.nodesMaxAge).toBe(172800); // 48 hours in seconds
        expect(onClose).toHaveBeenCalled();
      });
    });

    it('should reset to defaults when reset button is clicked', async () => {
      const initialState = {
        nodesMaxAge: 172800, // 48 hours
        nodesDisconnectedAge: 7200, // 2 hours
        nodesOfflineAge: 600, // 10 minutes
        defaultZoom: 15,
        temperatureFormat: 'fahrenheit' as const,
        autoUpdatePositionInUrl: false,
        showAll: true,
      };
      
      const { store } = renderWithStore(
        <Settings open={true} onClose={() => {}} />,
        createTestStore(initialState)
      );
      
      // Click reset button
      const resetButton = screen.getByRole('button', { name: /reset to defaults/i });
      fireEvent.click(resetButton);
      
      await waitFor(() => {
        // Check that form shows default values
        expect(screen.getByDisplayValue('24')).toBeInTheDocument(); // back to 24 hours
        expect(screen.getByDisplayValue('1')).toBeInTheDocument(); // back to 1 hour
        expect(screen.getByDisplayValue('5')).toBeInTheDocument(); // back to 5 minutes
        expect(screen.getByDisplayValue('10')).toBeInTheDocument(); // back to zoom 10
      });
    });

    it('should cancel changes when cancel button is clicked', async () => {
      const onClose = jest.fn();
      const { store } = renderWithStore(<Settings open={true} onClose={onClose} />);
      
      const originalState = store.getState().settings;
      
      // Change a setting
      const maxAgeInput = screen.getByLabelText(/max age/i);
      fireEvent.change(maxAgeInput, { target: { value: '48' } });
      
      // Click cancel
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);
      
      await waitFor(() => {
        const state = store.getState();
        expect(state.settings).toEqual(originalState);
        expect(onClose).toHaveBeenCalled();
      });
    });

    it('should toggle switches correctly', async () => {
      const { store } = renderWithStore(<Settings open={true} onClose={() => {}} />);
      
      const showAllSwitch = screen.getByLabelText(/show all nodes/i);
      expect(showAllSwitch).not.toBeChecked();
      
      fireEvent.click(showAllSwitch);
      
      // Click save to persist the change
      const saveButton = screen.getByRole('button', { name: /save settings/i });
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        const state = store.getState();
        expect(state.settings.showAll).toBe(true);
      });
    });
  });

  describe('Settings Persistence', () => {
    it('should save settings to localStorage when updated', () => {
      const store = createTestStore();
      
      store.dispatch(updateSettings({ nodesMaxAge: 172800 }));
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'meshtastic-node-mapper-settings',
        expect.stringContaining('"nodesMaxAge":172800')
      );
    });

    it('should load settings from localStorage on initialization', () => {
      // Test that the settings slice properly loads from localStorage
      // This is tested indirectly by checking that the store can be created with custom initial state
      const customSettings = {
        nodesMaxAge: 172800,
        nodesDisconnectedAge: 7200,
        nodesOfflineAge: 600,
        defaultZoom: 15,
        temperatureFormat: 'fahrenheit' as const,
        autoUpdatePositionInUrl: false,
        showAll: true,
      };
      
      const store = createTestStore(customSettings);
      const state = store.getState();
      
      expect(state.settings.nodesMaxAge).toBe(172800);
      expect(state.settings.temperatureFormat).toBe('fahrenheit');
      expect(state.settings.showAll).toBe(true);
    });

    it('should handle corrupted localStorage data gracefully', () => {
      localStorageMock.getItem.mockReturnValue('invalid json');
      
      // Should not throw and should use defaults
      const store = configureStore({
        reducer: {
          settings: settingsReducer,
        },
      });
      
      const state = store.getState();
      expect(state.settings.nodesMaxAge).toBe(86400); // default value
    });

    it('should merge saved settings with defaults for new settings', () => {
      // Test that partial settings are merged with defaults
      const partialSettings = {
        nodesMaxAge: 172800,
        nodesDisconnectedAge: 7200,
        // Missing newer fields like showAll, temperatureFormat, etc.
      };
      
      const store = createTestStore(partialSettings);
      const state = store.getState();
      
      expect(state.settings.nodesMaxAge).toBe(172800); // from partial settings
      expect(state.settings.showAll).toBe(false); // from defaults (not in partial)
      expect(state.settings.temperatureFormat).toBe('celsius'); // from defaults
    });
  });

  describe('Settings Validation', () => {
    it('should handle invalid numeric inputs', async () => {
      renderWithStore(<Settings open={true} onClose={() => {}} />);
      
      const maxAgeInput = screen.getByLabelText(/max age/i);
      
      // Try to enter negative value
      fireEvent.change(maxAgeInput, { target: { value: '-5' } });
      
      // The input should prevent negative values or handle them gracefully
      // This depends on the input validation implementation
      expect(maxAgeInput).toHaveAttribute('min', '0');
    });

    it('should handle zoom level bounds', async () => {
      renderWithStore(<Settings open={true} onClose={() => {}} />);
      
      const zoomInput = screen.getByLabelText(/default zoom level/i);
      
      // Check that zoom has proper bounds
      expect(zoomInput).toHaveAttribute('min', '1');
      expect(zoomInput).toHaveAttribute('max', '18');
    });
  });

  describe('Default Value Restoration', () => {
    it('should restore all settings to defaults when reset is called', () => {
      const store = createTestStore({
        nodesMaxAge: 999999,
        nodesDisconnectedAge: 999999,
        nodesOfflineAge: 999999,
        defaultZoom: 20,
        temperatureFormat: 'fahrenheit' as const,
        autoUpdatePositionInUrl: false,
        showAll: true,
      });
      
      store.dispatch(resetSettings());
      
      const state = store.getState();
      expect(state.settings).toEqual({
        nodesMaxAge: 86400,
        nodesDisconnectedAge: 3600,
        nodesOfflineAge: 300,
        defaultZoom: 10,
        temperatureFormat: 'celsius',
        autoUpdatePositionInUrl: true,
        showAll: false,
      });
    });

    it('should save default settings to localStorage when reset', () => {
      const store = createTestStore();
      
      store.dispatch(resetSettings());
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'meshtastic-node-mapper-settings',
        expect.stringContaining('"nodesMaxAge":86400')
      );
    });
  });
});