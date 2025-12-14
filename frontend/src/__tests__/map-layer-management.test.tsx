import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import '@testing-library/jest-dom';
import MapOptions from '../components/Map/MapOptions';
import MapLegend from '../components/Map/MapLegend';
import mapReducer, { 
  setTileLayer, 
  setNodeDisplayMode, 
  setViewMode, 
  toggleLegend, 
  toggleNeighbors, 
  togglePositionHistory 
} from '../store/slices/mapSlice';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';

// Create a test store
const createTestStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      map: mapReducer,
    },
    preloadedState: {
      map: {
        center: [40.7128, -74.0060],
        zoom: 10,
        tileLayer: 'openstreetmap',
        showNodes: true,
        showNeighbors: false,
        showLegend: true,
        showPositionHistory: false,
        nodeDisplayMode: 'all',
        viewMode: 'nodes',
        clusteringEnabled: true,
        animationsEnabled: true,
        topologyGraphOpen: false,
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

describe('Map Layer Management', () => {
  describe('MapOptions Component', () => {
    it('should render all map option controls when open', () => {
      renderWithStore(<MapOptions isOpen={true} onClose={() => {}} />);
      
      // Check for main sections
      expect(screen.getByText('Map Options')).toBeInTheDocument();
      expect(screen.getByText('Map Sources')).toBeInTheDocument();
      expect(screen.getByText('Node Display')).toBeInTheDocument();
      expect(screen.getByText('Overlays')).toBeInTheDocument();
      
      // Check for tile source selector
      expect(screen.getAllByText('Tile Source').length).toBeGreaterThan(0);
      
      // Check for node display mode selector
      expect(screen.getAllByText('Display Mode').length).toBeGreaterThan(0);
      
      // Check for view mode selector
      expect(screen.getAllByText('View Mode').length).toBeGreaterThan(0);
      
      // Check for overlay toggles
      expect(screen.getByLabelText('Legend')).toBeInTheDocument();
      expect(screen.getByLabelText('Neighbors')).toBeInTheDocument();
      expect(screen.getByLabelText('Position History')).toBeInTheDocument();
    });

    it('should not render when closed', () => {
      renderWithStore(<MapOptions isOpen={false} onClose={() => {}} />);
      
      expect(screen.queryByText('Map Options')).not.toBeInTheDocument();
    });

    it('should call onClose when close button is clicked', () => {
      const onClose = jest.fn();
      renderWithStore(<MapOptions isOpen={true} onClose={onClose} />);
      
      const closeButton = screen.getByRole('button', { name: '' }); // Close icon button
      fireEvent.click(closeButton);
      
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Tile Source Selection', () => {
    it('should display current tile source in selector', () => {
      const store = createTestStore({ tileLayer: 'satellite' });
      renderWithStore(<MapOptions isOpen={true} onClose={() => {}} />, store);
      
      // The select should show the current value
      expect(screen.getByText('Esri Satellite')).toBeInTheDocument();
    });

    it('should update tile source when selection changes', async () => {
      const { store } = renderWithStore(<MapOptions isOpen={true} onClose={() => {}} />);
      
      // Find and click the tile source selector
      const comboboxes = screen.getAllByRole('combobox');
      const tileSelect = comboboxes[0]; // First combobox is Tile Source
      fireEvent.mouseDown(tileSelect);
      
      // Select a different tile source
      const satelliteOption = await screen.findByText('Esri Satellite');
      fireEvent.click(satelliteOption);
      
      await waitFor(() => {
        const state = store.getState();
        expect(state.map.tileLayer).toBe('satellite');
      });
    });

    it('should support all required tile sources', async () => {
      renderWithStore(<MapOptions isOpen={true} onClose={() => {}} />);
      
      const comboboxes = screen.getAllByRole('combobox');
      const tileSelect = comboboxes[0]; // First combobox is Tile Source
      fireEvent.mouseDown(tileSelect);
      
      // Check that all required tile sources are available (Requirements 8.1)
      await waitFor(() => {
        expect(screen.getAllByText('OpenStreetMap').length).toBeGreaterThan(0);
        expect(screen.getByText('OpenTopoMap')).toBeInTheDocument();
        expect(screen.getByText('Esri Satellite')).toBeInTheDocument();
        expect(screen.getByText('Google Satellite')).toBeInTheDocument();
        expect(screen.getByText('Google Hybrid')).toBeInTheDocument();
      });
    });
  });

  describe('Node Display Mode Selection', () => {
    it('should display current node display mode', () => {
      const store = createTestStore({ nodeDisplayMode: 'routers' });
      renderWithStore(<MapOptions isOpen={true} onClose={() => {}} />, store);
      
      const displayModeSelect = screen.getByText('Routers Only');
      expect(displayModeSelect).toBeInTheDocument();
    });

    it('should update node display mode when selection changes', async () => {
      const { store } = renderWithStore(<MapOptions isOpen={true} onClose={() => {}} />);
      
      // Find all comboboxes and select the second one (Display Mode)
      const comboboxes = screen.getAllByRole('combobox');
      const displayModeSelect = comboboxes[1]; // Second combobox is Display Mode
      fireEvent.mouseDown(displayModeSelect);
      
      const routersOption = await screen.findByText('Routers Only');
      fireEvent.click(routersOption);
      
      await waitFor(() => {
        const state = store.getState();
        expect(state.map.nodeDisplayMode).toBe('routers');
      });
    });

    it('should support all required node display modes', async () => {
      renderWithStore(<MapOptions isOpen={true} onClose={() => {}} />);
      
      const comboboxes = screen.getAllByRole('combobox');
      const displayModeSelect = comboboxes[1]; // Second combobox is Display Mode
      fireEvent.mouseDown(displayModeSelect);
      
      // Check that all required display modes are available (Requirements 8.2)
      await waitFor(() => {
        expect(screen.getAllByText('All Nodes').length).toBeGreaterThan(0);
        expect(screen.getByText('Routers Only')).toBeInTheDocument();
        expect(screen.getByText('Clustered')).toBeInTheDocument();
        expect(screen.getByText('None')).toBeInTheDocument();
      });
    });
  });

  describe('View Mode Selection', () => {
    it('should display current view mode', () => {
      const store = createTestStore({ viewMode: 'nodeTypes' });
      renderWithStore(<MapOptions isOpen={true} onClose={() => {}} />, store);
      
      const viewModeSelect = screen.getByText('Node Types');
      expect(viewModeSelect).toBeInTheDocument();
    });

    it('should update view mode when selection changes', async () => {
      const { store } = renderWithStore(<MapOptions isOpen={true} onClose={() => {}} />);
      
      const comboboxes = screen.getAllByRole('combobox');
      const viewModeSelect = comboboxes[2]; // Third combobox is View Mode
      fireEvent.mouseDown(viewModeSelect);
      
      const bandwidthOption = await screen.findByText('Bandwidth Utilization');
      fireEvent.click(bandwidthOption);
      
      await waitFor(() => {
        const state = store.getState();
        expect(state.map.viewMode).toBe('bandwidthUtilization');
      });
    });

    it('should support all required view modes', async () => {
      renderWithStore(<MapOptions isOpen={true} onClose={() => {}} />);
      
      const comboboxes = screen.getAllByRole('combobox');
      const viewModeSelect = comboboxes[2]; // Third combobox is View Mode
      fireEvent.mouseDown(viewModeSelect);
      
      // Check that all required view modes are available (Requirements 8.4)
      await waitFor(() => {
        expect(screen.getAllByText('Nodes').length).toBeGreaterThan(0);
        expect(screen.getByText('Node Types')).toBeInTheDocument();
        expect(screen.getByText('Bandwidth Utilization')).toBeInTheDocument();
      });
    });
  });

  describe('Overlay Toggle Behavior', () => {
    it('should toggle legend overlay when switch is clicked', async () => {
      const { store } = renderWithStore(<MapOptions isOpen={true} onClose={() => {}} />);
      
      const legendSwitch = screen.getByLabelText('Legend');
      expect(legendSwitch).toBeChecked(); // Default is true
      
      fireEvent.click(legendSwitch);
      
      await waitFor(() => {
        const state = store.getState();
        expect(state.map.showLegend).toBe(false);
      });
    });

    it('should toggle neighbors overlay when switch is clicked', async () => {
      const { store } = renderWithStore(<MapOptions isOpen={true} onClose={() => {}} />);
      
      const neighborsSwitch = screen.getByLabelText('Neighbors');
      expect(neighborsSwitch).not.toBeChecked(); // Default is false
      
      fireEvent.click(neighborsSwitch);
      
      await waitFor(() => {
        const state = store.getState();
        expect(state.map.showNeighbors).toBe(true);
      });
    });

    it('should toggle position history overlay when switch is clicked', async () => {
      const { store } = renderWithStore(<MapOptions isOpen={true} onClose={() => {}} />);
      
      const positionHistorySwitch = screen.getByLabelText('Position History');
      expect(positionHistorySwitch).not.toBeChecked(); // Default is false
      
      fireEvent.click(positionHistorySwitch);
      
      await waitFor(() => {
        const state = store.getState();
        expect(state.map.showPositionHistory).toBe(true);
      });
    });

    it('should reflect current overlay states in switches', () => {
      const store = createTestStore({
        showLegend: false,
        showNeighbors: true,
        showPositionHistory: true,
      });
      renderWithStore(<MapOptions isOpen={true} onClose={() => {}} />, store);
      
      expect(screen.getByLabelText('Legend')).not.toBeChecked();
      expect(screen.getByLabelText('Neighbors')).toBeChecked();
      expect(screen.getByLabelText('Position History')).toBeChecked();
    });
  });

  describe('MapLegend Component', () => {
    it('should render legend when showLegend is true', () => {
      const store = createTestStore({ showLegend: true });
      renderWithStore(<MapLegend />, store);
      
      expect(screen.getByText('Map Legend')).toBeInTheDocument();
    });

    it('should not render legend when showLegend is false', () => {
      const store = createTestStore({ showLegend: false });
      renderWithStore(<MapLegend />, store);
      
      expect(screen.queryByText('Map Legend')).not.toBeInTheDocument();
    });

    it('should display node status legend in nodes view mode', () => {
      const store = createTestStore({ showLegend: true, viewMode: 'nodes' });
      renderWithStore(<MapLegend />, store);
      
      expect(screen.getByText('Online (MQTT Connected)')).toBeInTheDocument();
      expect(screen.getByText('Disconnected (MQTT)')).toBeInTheDocument();
      expect(screen.getByText('Offline')).toBeInTheDocument();
    });

    it('should display node types legend in nodeTypes view mode', () => {
      const store = createTestStore({ showLegend: true, viewMode: 'nodeTypes' });
      renderWithStore(<MapLegend />, store);
      
      expect(screen.getByText('Router')).toBeInTheDocument();
      expect(screen.getByText('Repeater')).toBeInTheDocument();
      expect(screen.getByText('Client')).toBeInTheDocument();
      expect(screen.getByText('Tracker')).toBeInTheDocument();
    });

    it('should display bandwidth utilization legend in bandwidthUtilization view mode', () => {
      const store = createTestStore({ showLegend: true, viewMode: 'bandwidthUtilization' });
      renderWithStore(<MapLegend />, store);
      
      expect(screen.getByText('0-25% Utilization')).toBeInTheDocument();
      expect(screen.getByText('25-50% Utilization')).toBeInTheDocument();
      expect(screen.getByText('50-75% Utilization')).toBeInTheDocument();
      expect(screen.getByText('75-100% Utilization')).toBeInTheDocument();
    });
  });

  describe('View Mode Transitions', () => {
    it('should update legend content when view mode changes', async () => {
      const { store } = renderWithStore(<MapLegend />, createTestStore({ showLegend: true, viewMode: 'nodes' }));
      
      // Initially should show node status legend
      expect(screen.getByText('Online (MQTT Connected)')).toBeInTheDocument();
      
      // Change view mode
      store.dispatch(setViewMode('nodeTypes'));
      
      await waitFor(() => {
        expect(screen.queryByText('Online (MQTT Connected)')).not.toBeInTheDocument();
        expect(screen.getByText('Router')).toBeInTheDocument();
      });
    });

    it('should handle rapid view mode changes without errors', async () => {
      const { store } = renderWithStore(<MapLegend />, createTestStore({ showLegend: true }));
      
      // Rapidly change view modes
      store.dispatch(setViewMode('nodeTypes'));
      store.dispatch(setViewMode('bandwidthUtilization'));
      store.dispatch(setViewMode('nodes'));
      
      await waitFor(() => {
        expect(screen.getByText('Online (MQTT Connected)')).toBeInTheDocument();
      });
    });
  });

  describe('Redux State Management', () => {
    it('should update tile layer in state when action is dispatched', () => {
      const store = createTestStore();
      
      store.dispatch(setTileLayer('satellite'));
      
      const state = store.getState();
      expect(state.map.tileLayer).toBe('satellite');
    });

    it('should update node display mode in state when action is dispatched', () => {
      const store = createTestStore();
      
      store.dispatch(setNodeDisplayMode('routers'));
      
      const state = store.getState();
      expect(state.map.nodeDisplayMode).toBe('routers');
    });

    it('should update view mode in state when action is dispatched', () => {
      const store = createTestStore();
      
      store.dispatch(setViewMode('bandwidthUtilization'));
      
      const state = store.getState();
      expect(state.map.viewMode).toBe('bandwidthUtilization');
    });

    it('should toggle overlay states when actions are dispatched', () => {
      const store = createTestStore();
      
      store.dispatch(toggleLegend());
      store.dispatch(toggleNeighbors());
      store.dispatch(togglePositionHistory());
      
      const state = store.getState();
      expect(state.map.showLegend).toBe(false); // Was true, now false
      expect(state.map.showNeighbors).toBe(true); // Was false, now true
      expect(state.map.showPositionHistory).toBe(true); // Was false, now true
    });
  });

  describe('Integration Tests', () => {
    it('should maintain state consistency across multiple option changes', async () => {
      const { store } = renderWithStore(<MapOptions isOpen={true} onClose={() => {}} />);
      
      // Change tile layer
      const comboboxes = screen.getAllByRole('combobox');
      const tileSelect = comboboxes[0]; // First combobox is Tile Source
      fireEvent.mouseDown(tileSelect);
      const satelliteOption = await screen.findByText('Esri Satellite');
      fireEvent.click(satelliteOption);
      
      // Change display mode
      const displayModeSelect = comboboxes[1]; // Second combobox is Display Mode
      fireEvent.mouseDown(displayModeSelect);
      const routersOption = await screen.findByText('Routers Only');
      fireEvent.click(routersOption);
      
      // Toggle overlays
      const legendSwitch = screen.getByLabelText('Legend');
      fireEvent.click(legendSwitch);
      
      await waitFor(() => {
        const state = store.getState();
        expect(state.map.tileLayer).toBe('satellite');
        expect(state.map.nodeDisplayMode).toBe('routers');
        expect(state.map.showLegend).toBe(false);
      });
    });

    it('should handle invalid state values gracefully', () => {
      // Test with invalid initial state
      const store = createTestStore({
        tileLayer: 'invalid-layer',
        nodeDisplayMode: 'invalid-mode',
        viewMode: 'invalid-view',
      });
      
      // Component should still render without errors
      expect(() => {
        renderWithStore(<MapOptions isOpen={true} onClose={() => {}} />, store);
      }).not.toThrow();
    });
  });
});