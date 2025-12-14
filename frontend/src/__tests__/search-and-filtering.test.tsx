import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import '@testing-library/jest-dom';
import SearchAndFiltering from '../components/SearchAndFiltering/SearchAndFiltering';
import nodeReducer, { Node } from '../store/slices/nodeSlice';
import mapReducer from '../store/slices/mapSlice';

// Mock nodes for testing
const mockNodes: Node[] = [
  {
    id: '1',
    hexId: '!12345678',
    shortName: 'NODE1',
    longName: 'Test Node 1',
    hardwareModel: 'TBEAM',
    firmwareVersion: '2.3.2',
    role: 'ROUTER',
    position: { latitude: 40.7128, longitude: -74.0060 },
    lastSeen: '2024-01-15T10:00:00Z',
    lastHeard: '2024-01-15T09:55:00Z',
    isOnline: true,
    mqttConnected: true,
    batteryLevel: 85,
    voltage: 4.1,
    channelUtilization: 15,
    airUtilTx: 8
  },
  {
    id: '2',
    hexId: '!87654321',
    shortName: 'NODE2',
    longName: 'Test Node 2',
    hardwareModel: 'HELTEC_V3',
    firmwareVersion: '2.3.1',
    role: 'CLIENT',
    position: { latitude: 40.7589, longitude: -73.9851 },
    lastSeen: '2024-01-15T08:00:00Z',
    lastHeard: '2024-01-15T07:55:00Z',
    isOnline: false,
    mqttConnected: false,
    batteryLevel: 45,
    voltage: 3.8,
    channelUtilization: 25,
    airUtilTx: 12
  },
  {
    id: '3',
    hexId: '!11223344',
    shortName: 'NODE3',
    longName: 'Test Node 3',
    hardwareModel: 'RAK4631',
    firmwareVersion: '2.3.2',
    role: 'REPEATER',
    position: { latitude: 40.6892, longitude: -74.0445 },
    lastSeen: '2024-01-14T15:00:00Z',
    lastHeard: '2024-01-14T14:55:00Z',
    isOnline: false,
    mqttConnected: true,
    batteryLevel: 92,
    voltage: 4.2,
    channelUtilization: 5,
    airUtilTx: 3
  }
];

const createTestStore = (initialNodes: Node[] = mockNodes) => {
  return configureStore({
    reducer: {
      nodes: nodeReducer,
      map: mapReducer
    },
    preloadedState: {
      nodes: {
        nodes: initialNodes,
        selectedNodeId: null,
        detailsPanelOpen: false,
        neighborVisualizationActive: false,
        neighborVisualizationNodeId: null,
        neighborVisualizationDirection: null,
        loading: false,
        error: null
      },
      map: {
        center: [40.7128, -74.0060],
        zoom: 10,
        tileLayer: 'openstreetmap',
        showNodes: true,
        showNeighbors: false,
        showLegend: true,
        viewMode: 'nodes',
        clusteringEnabled: true,
        animationsEnabled: true,
        topologyGraphOpen: false
      }
    }
  });
};

const renderWithStore = (component: React.ReactElement, store = createTestStore()) => {
  return render(
    <Provider store={store}>
      {component}
    </Provider>
  );
};

describe('Search and Filtering Component', () => {
  describe('Search Functionality', () => {
    test('should filter nodes by short name', async () => {
      const mockOnFilter = jest.fn();
      renderWithStore(<SearchAndFiltering onFilter={mockOnFilter} />);
      
      const searchInput = screen.getByPlaceholderText(/search nodes/i);
      fireEvent.change(searchInput, { target: { value: 'NODE1' } });
      
      await waitFor(() => {
        expect(mockOnFilter).toHaveBeenCalledWith(
          expect.objectContaining({
            search: 'NODE1'
          })
        );
      });
    });

    test('should filter nodes by long name', async () => {
      const mockOnFilter = jest.fn();
      renderWithStore(<SearchAndFiltering onFilter={mockOnFilter} />);
      
      const searchInput = screen.getByPlaceholderText(/search nodes/i);
      fireEvent.change(searchInput, { target: { value: 'Test Node 2' } });
      
      await waitFor(() => {
        expect(mockOnFilter).toHaveBeenCalledWith(
          expect.objectContaining({
            search: 'Test Node 2'
          })
        );
      });
    });

    test('should filter nodes by hex ID', async () => {
      const mockOnFilter = jest.fn();
      renderWithStore(<SearchAndFiltering onFilter={mockOnFilter} />);
      
      const searchInput = screen.getByPlaceholderText(/search nodes/i);
      fireEvent.change(searchInput, { target: { value: '!12345678' } });
      
      await waitFor(() => {
        expect(mockOnFilter).toHaveBeenCalledWith(
          expect.objectContaining({
            search: '!12345678'
          })
        );
      });
    });

    test('should provide autocomplete suggestions', async () => {
      renderWithStore(<SearchAndFiltering onFilter={jest.fn()} />);
      
      const searchInput = screen.getByPlaceholderText(/search nodes/i);
      fireEvent.focus(searchInput);
      fireEvent.change(searchInput, { target: { value: 'NODE' } });
      
      await waitFor(() => {
        expect(screen.getByText('NODE1')).toBeInTheDocument();
        expect(screen.getByText('NODE2')).toBeInTheDocument();
        expect(screen.getByText('NODE3')).toBeInTheDocument();
      });
    });

    test('should clear search when input is empty', async () => {
      const mockOnFilter = jest.fn();
      renderWithStore(<SearchAndFiltering onFilter={mockOnFilter} />);
      
      const searchInput = screen.getByPlaceholderText(/search nodes/i);
      fireEvent.change(searchInput, { target: { value: 'NODE1' } });
      fireEvent.change(searchInput, { target: { value: '' } });
      
      await waitFor(() => {
        expect(mockOnFilter).toHaveBeenLastCalledWith(
          expect.objectContaining({
            search: ''
          })
        );
      });
    });
  });

  describe('Hardware Type Filtering', () => {
    test('should filter nodes by hardware model', async () => {
      const mockOnFilter = jest.fn();
      renderWithStore(<SearchAndFiltering onFilter={mockOnFilter} />);
      
      const hardwareSelect = screen.getByLabelText(/hardware type/i);
      fireEvent.mouseDown(hardwareSelect);
      
      const tbeamOption = screen.getByRole('option', { name: 'TBEAM' });
      fireEvent.click(tbeamOption);
      
      await waitFor(() => {
        expect(mockOnFilter).toHaveBeenCalledWith(
          expect.objectContaining({
            hardwareModel: 'TBEAM'
          })
        );
      });
    });

    test('should show all hardware types in dropdown', () => {
      renderWithStore(<SearchAndFiltering onFilter={jest.fn()} />);
      
      const hardwareSelect = screen.getByLabelText(/hardware type/i);
      fireEvent.mouseDown(hardwareSelect);
      
      expect(screen.getByRole('option', { name: 'TBEAM' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'HELTEC_V3' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'RAK4631' })).toBeInTheDocument();
    });

    test('should reset hardware filter when "All" is selected', async () => {
      const mockOnFilter = jest.fn();
      renderWithStore(<SearchAndFiltering onFilter={mockOnFilter} />);
      
      const hardwareSelect = screen.getByLabelText(/hardware type/i);
      fireEvent.mouseDown(hardwareSelect);
      
      const tbeamOption = screen.getByRole('option', { name: 'TBEAM' });
      fireEvent.click(tbeamOption);
      
      fireEvent.mouseDown(hardwareSelect);
      const allOption = screen.getByRole('option', { name: 'All' });
      fireEvent.click(allOption);
      
      await waitFor(() => {
        expect(mockOnFilter).toHaveBeenLastCalledWith(
          expect.not.objectContaining({
            hardwareModel: expect.anything()
          })
        );
      });
    });
  });

  describe('Role Filtering', () => {
    test('should filter nodes by role', async () => {
      const mockOnFilter = jest.fn();
      renderWithStore(<SearchAndFiltering onFilter={mockOnFilter} />);
      
      const roleSelect = screen.getByLabelText(/^role$/i);
      fireEvent.mouseDown(roleSelect);
      
      const routerOption = screen.getByRole('option', { name: 'ROUTER' });
      fireEvent.click(routerOption);
      
      await waitFor(() => {
        expect(mockOnFilter).toHaveBeenCalledWith(
          expect.objectContaining({
            role: 'ROUTER'
          })
        );
      });
    });

    test('should show all roles in dropdown', () => {
      renderWithStore(<SearchAndFiltering onFilter={jest.fn()} />);
      
      const roleSelect = screen.getByLabelText(/^role$/i);
      fireEvent.mouseDown(roleSelect);
      
      expect(screen.getByRole('option', { name: 'ROUTER' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'CLIENT' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'REPEATER' })).toBeInTheDocument();
    });
  });

  describe('Status Filtering', () => {
    test('should filter nodes by online status', async () => {
      const mockOnFilter = jest.fn();
      renderWithStore(<SearchAndFiltering onFilter={mockOnFilter} />);
      
      const statusSelect = screen.getByLabelText(/^status$/i);
      fireEvent.mouseDown(statusSelect);
      
      const onlineOption = screen.getByRole('option', { name: 'Online' });
      fireEvent.click(onlineOption);
      
      await waitFor(() => {
        expect(mockOnFilter).toHaveBeenCalledWith(
          expect.objectContaining({
            isOnline: true
          })
        );
      });
    });

    test('should filter nodes by offline status', async () => {
      const mockOnFilter = jest.fn();
      renderWithStore(<SearchAndFiltering onFilter={mockOnFilter} />);
      
      const statusSelect = screen.getByLabelText(/^status$/i);
      fireEvent.mouseDown(statusSelect);
      
      const offlineOption = screen.getByRole('option', { name: 'Offline' });
      fireEvent.click(offlineOption);
      
      await waitFor(() => {
        expect(mockOnFilter).toHaveBeenCalledWith(
          expect.objectContaining({
            isOnline: false
          })
        );
      });
    });

    test('should filter nodes by MQTT connection status', async () => {
      const mockOnFilter = jest.fn();
      renderWithStore(<SearchAndFiltering onFilter={mockOnFilter} />);
      
      const mqttSelect = screen.getByLabelText(/mqtt status/i);
      fireEvent.mouseDown(mqttSelect);
      
      const connectedOption = screen.getByRole('option', { name: 'Connected' });
      fireEvent.click(connectedOption);
      
      await waitFor(() => {
        expect(mockOnFilter).toHaveBeenCalledWith(
          expect.objectContaining({
            mqttConnected: true
          })
        );
      });
    });
  });

  describe('Geographic Area Filtering', () => {
    test('should apply geographic bounds filter', async () => {
      const mockOnFilter = jest.fn();
      renderWithStore(<SearchAndFiltering onFilter={mockOnFilter} />);
      
      // First expand the advanced filters section
      const advancedFiltersButton = screen.getByText(/advanced filters/i);
      fireEvent.click(advancedFiltersButton);
      
      const boundsInput = screen.getByLabelText(/geographic bounds/i);
      const bounds = {
        north: 40.8,
        south: 40.6,
        east: -73.9,
        west: -74.1
      };
      
      // Use comma-separated format as expected by the component
      fireEvent.change(boundsInput, { target: { value: '40.8,40.6,-73.9,-74.1' } });
      
      await waitFor(() => {
        expect(mockOnFilter).toHaveBeenCalledWith(
          expect.objectContaining({
            bounds
          })
        );
      });
    });

    test('should validate geographic bounds format', async () => {
      renderWithStore(<SearchAndFiltering onFilter={jest.fn()} />);
      
      // First expand the advanced filters section
      const advancedFiltersButton = screen.getByText(/advanced filters/i);
      fireEvent.click(advancedFiltersButton);
      
      const boundsInput = screen.getByLabelText(/geographic bounds/i);
      fireEvent.change(boundsInput, { target: { value: 'invalid-bounds' } });
      
      await waitFor(() => {
        expect(screen.getByText(/invalid bounds format/i)).toBeInTheDocument();
      });
    });
  });

  describe('Time-based Filtering', () => {
    test('should filter nodes by last seen date range', async () => {
      const mockOnFilter = jest.fn();
      renderWithStore(<SearchAndFiltering onFilter={mockOnFilter} />);
      
      // First expand the advanced filters section
      const advancedFiltersButton = screen.getByText(/advanced filters/i);
      fireEvent.click(advancedFiltersButton);
      
      const startDateInput = screen.getByLabelText(/start date/i);
      const endDateInput = screen.getByLabelText(/end date/i);
      
      fireEvent.change(startDateInput, { target: { value: '2024-01-14' } });
      fireEvent.change(endDateInput, { target: { value: '2024-01-15' } });
      
      await waitFor(() => {
        expect(mockOnFilter).toHaveBeenCalledWith(
          expect.objectContaining({
            startDate: '2024-01-14',
            endDate: '2024-01-15'
          })
        );
      });
    });

    test('should filter nodes by maximum age', async () => {
      const mockOnFilter = jest.fn();
      renderWithStore(<SearchAndFiltering onFilter={mockOnFilter} />);
      
      // First expand the advanced filters section
      const advancedFiltersButton = screen.getByText(/advanced filters/i);
      fireEvent.click(advancedFiltersButton);
      
      const maxAgeInput = screen.getByLabelText(/maximum age/i);
      fireEvent.change(maxAgeInput, { target: { value: '24' } });
      
      await waitFor(() => {
        expect(mockOnFilter).toHaveBeenCalledWith(
          expect.objectContaining({
            maxAge: 24
          })
        );
      });
    });

    test('should validate date range order', async () => {
      renderWithStore(<SearchAndFiltering onFilter={jest.fn()} />);
      
      // First expand the advanced filters section
      const advancedFiltersButton = screen.getByText(/advanced filters/i);
      fireEvent.click(advancedFiltersButton);
      
      const startDateInput = screen.getByLabelText(/start date/i);
      const endDateInput = screen.getByLabelText(/end date/i);
      
      fireEvent.change(startDateInput, { target: { value: '2024-01-15' } });
      fireEvent.change(endDateInput, { target: { value: '2024-01-14' } });
      
      await waitFor(() => {
        expect(screen.getByText(/end date must be after start date/i)).toBeInTheDocument();
      });
    });
  });

  describe('Filter Combination Logic', () => {
    test('should combine multiple filters correctly', async () => {
      const mockOnFilter = jest.fn();
      renderWithStore(<SearchAndFiltering onFilter={mockOnFilter} />);
      
      const searchInput = screen.getByPlaceholderText(/search nodes/i);
      fireEvent.change(searchInput, { target: { value: 'NODE' } });
      
      const hardwareSelect = screen.getByLabelText(/hardware type/i);
      fireEvent.mouseDown(hardwareSelect);
      const tbeamOption = screen.getByRole('option', { name: 'TBEAM' });
      fireEvent.click(tbeamOption);
      
      const roleSelect = screen.getByLabelText(/^role$/i);
      fireEvent.mouseDown(roleSelect);
      const routerOption = screen.getByRole('option', { name: 'ROUTER' });
      fireEvent.click(routerOption);
      
      await waitFor(() => {
        expect(mockOnFilter).toHaveBeenCalledWith(
          expect.objectContaining({
            search: 'NODE',
            hardwareModel: 'TBEAM',
            role: 'ROUTER'
          })
        );
      });
    });

    test('should reset all filters when clear button is clicked', async () => {
      const mockOnFilter = jest.fn();
      renderWithStore(<SearchAndFiltering onFilter={mockOnFilter} />);
      
      // Apply some filters first
      const searchInput = screen.getByPlaceholderText(/search nodes/i);
      fireEvent.change(searchInput, { target: { value: 'NODE1' } });
      
      const hardwareSelect = screen.getByLabelText(/hardware type/i);
      fireEvent.mouseDown(hardwareSelect);
      const tbeamOption = screen.getByRole('option', { name: 'TBEAM' });
      fireEvent.click(tbeamOption);
      
      // Clear all filters
      const clearButton = screen.getByText(/clear filters/i);
      fireEvent.click(clearButton);
      
      await waitFor(() => {
        expect(mockOnFilter).toHaveBeenLastCalledWith({});
      });
    });
  });

  describe('Result Count Display', () => {
    test('should display correct result count', () => {
      const store = createTestStore(mockNodes);
      renderWithStore(<SearchAndFiltering onFilter={jest.fn()} resultCount={3} />, store);
      
      expect(screen.getByText(/3 nodes found/i)).toBeInTheDocument();
    });

    test('should display zero results message', () => {
      renderWithStore(<SearchAndFiltering onFilter={jest.fn()} resultCount={0} />);
      
      expect(screen.getByText(/no nodes found/i)).toBeInTheDocument();
    });

    test('should update result count when filters change', () => {
      const { rerender } = renderWithStore(<SearchAndFiltering onFilter={jest.fn()} resultCount={3} />);
      
      expect(screen.getByText(/3 nodes found/i)).toBeInTheDocument();
      
      rerender(
        <Provider store={createTestStore()}>
          <SearchAndFiltering onFilter={jest.fn()} resultCount={1} />
        </Provider>
      );
      
      expect(screen.getByText(/1 node found/i)).toBeInTheDocument();
    });
  });

  describe('Filter Persistence', () => {
    test('should save filters to local storage', async () => {
      const mockSetItem = jest.spyOn(Storage.prototype, 'setItem');
      renderWithStore(<SearchAndFiltering onFilter={jest.fn()} />);
      
      const searchInput = screen.getByPlaceholderText(/search nodes/i);
      fireEvent.change(searchInput, { target: { value: 'NODE1' } });
      
      await waitFor(() => {
        expect(mockSetItem).toHaveBeenCalledWith(
          'nodeFilters',
          JSON.stringify(expect.objectContaining({ search: 'NODE1' }))
        );
      });
      
      mockSetItem.mockRestore();
    });

    test('should restore filters from local storage on mount', () => {
      const mockGetItem = jest.spyOn(Storage.prototype, 'getItem');
      mockGetItem.mockReturnValue(JSON.stringify({ search: 'NODE1', role: 'ROUTER' }));
      
      renderWithStore(<SearchAndFiltering onFilter={jest.fn()} />);
      
      expect(screen.getByDisplayValue('NODE1')).toBeInTheDocument();
      expect(screen.getByDisplayValue('ROUTER')).toBeInTheDocument();
      
      mockGetItem.mockRestore();
    });
  });
});