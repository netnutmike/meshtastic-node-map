import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface NodeNeighbor {
  id: string;
  neighborId: string;
  rssi?: number;
  snr?: number;
  lastHeard: string;
  hopCount: number;
}

export interface Node {
  id: string;
  hexId: string;
  shortName?: string;
  longName?: string;
  hardwareModel?: string;
  firmwareVersion?: string;
  role: string;
  position: {
    latitude: number;
    longitude: number;
    altitude?: number;
    precision?: number;
  } | null;
  lastSeen?: string;
  lastHeard?: string;
  isOnline: boolean;
  mqttConnected: boolean;
  batteryLevel?: number;
  voltage?: number;
  channelUtilization?: number;
  airUtilTx?: number;
  neighbors?: NodeNeighbor[];
}

export interface SearchFilters {
  search?: string;
  hardwareModel?: string;
  role?: string;
  isOnline?: boolean;
  mqttConnected?: boolean;
  minBattery?: number;
  maxAge?: number;
  startDate?: Date;
  endDate?: Date;
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

interface NodeState {
  nodes: Node[];
  filteredNodes: Node[];
  selectedNodeId: string | null;
  detailsPanelOpen: boolean;
  returnPath: string | null; // Track where to return when closing details panel
  neighborVisualizationActive: boolean;
  neighborVisualizationNodeId: string | null;
  neighborVisualizationDirection: 'heard-us' | 'we-heard' | null;
  searchFilters: SearchFilters;
  loading: boolean;
  error: string | null;
}

const initialState: NodeState = {
  nodes: [],
  filteredNodes: [],
  selectedNodeId: null,
  detailsPanelOpen: false,
  returnPath: null,
  neighborVisualizationActive: false,
  neighborVisualizationNodeId: null,
  neighborVisualizationDirection: null,
  searchFilters: {},
  loading: false,
  error: null,
};

// Helper function to apply filters
const applyFilters = (nodes: Node[], filters: SearchFilters): Node[] => {
  return nodes.filter(node => {
    // Search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      const matchesSearch = 
        node.shortName?.toLowerCase().includes(searchTerm) ||
        node.longName?.toLowerCase().includes(searchTerm) ||
        node.id.toLowerCase().includes(searchTerm) ||
        node.hexId.toLowerCase().includes(searchTerm);
      if (!matchesSearch) return false;
    }

    // Hardware model filter
    if (filters.hardwareModel && node.hardwareModel !== filters.hardwareModel) {
      return false;
    }

    // Role filter
    if (filters.role && node.role !== filters.role) {
      return false;
    }

    // Online status filter
    if (filters.isOnline !== undefined && node.isOnline !== filters.isOnline) {
      return false;
    }

    // MQTT connection filter
    if (filters.mqttConnected !== undefined && node.mqttConnected !== filters.mqttConnected) {
      return false;
    }

    // Battery level filter
    if (filters.minBattery && node.batteryLevel && node.batteryLevel < filters.minBattery) {
      return false;
    }

    // Age filter
    if (filters.maxAge && node.lastSeen) {
      const nodeAge = (Date.now() - new Date(node.lastSeen).getTime()) / (1000 * 60 * 60); // hours
      if (nodeAge > filters.maxAge) return false;
    }

    // Date range filter
    if (filters.startDate && node.lastSeen) {
      if (new Date(node.lastSeen) < filters.startDate) return false;
    }
    if (filters.endDate && node.lastSeen) {
      if (new Date(node.lastSeen) > filters.endDate) return false;
    }

    // Geographic bounds filter
    if (filters.bounds && node.position) {
      const { north, south, east, west } = filters.bounds;
      const { latitude, longitude } = node.position;
      if (latitude < south || latitude > north || longitude < west || longitude > east) {
        return false;
      }
    }

    return true;
  });
};

const nodeSlice = createSlice({
  name: 'nodes',
  initialState,
  reducers: {
    setNodes: (state, action: PayloadAction<Node[]>) => {
      console.log('nodeSlice: setNodes called with', action.payload.length, 'nodes');
      console.log('nodeSlice: Nodes with positions:', action.payload.filter(n => n.position).length);
      state.nodes = action.payload;
      state.filteredNodes = applyFilters(action.payload, state.searchFilters);
      console.log('nodeSlice: Filtered nodes:', state.filteredNodes.length);
      state.loading = false;
      state.error = null;
    },
    addNode: (state, action: PayloadAction<Node>) => {
      const existingIndex = state.nodes.findIndex(node => node.id === action.payload.id);
      if (existingIndex >= 0) {
        state.nodes[existingIndex] = action.payload;
      } else {
        state.nodes.push(action.payload);
      }
      state.filteredNodes = applyFilters(state.nodes, state.searchFilters);
    },
    updateNode: (state, action: PayloadAction<Partial<Node> & { id: string }>) => {
      const index = state.nodes.findIndex(node => node.id === action.payload.id);
      if (index >= 0) {
        // Update existing node
        state.nodes[index] = { ...state.nodes[index], ...action.payload };
      } else {
        // Add new node if it doesn't exist (treat as addNode)
        // This handles the case where WebSocket sends node_updated for a new node
        if (action.payload.position) {
          // Only add if we have enough data to create a valid node
          state.nodes.push(action.payload as Node);
        }
      }
      state.filteredNodes = applyFilters(state.nodes, state.searchFilters);
    },
    selectNode: (state, action: PayloadAction<string | null>) => {
      state.selectedNodeId = action.payload;
    },
    openDetailsPanel: (state, action: PayloadAction<{ nodeId: string; returnPath?: string }>) => {
      state.selectedNodeId = action.payload.nodeId;
      state.detailsPanelOpen = true;
      state.returnPath = action.payload.returnPath || null;
    },
    closeDetailsPanel: (state) => {
      state.detailsPanelOpen = false;
      state.selectedNodeId = null;
      state.returnPath = null;
    },
    activateNeighborVisualization: (state, action: PayloadAction<{ nodeId: string; direction: 'heard-us' | 'we-heard' }>) => {
      state.neighborVisualizationActive = true;
      state.neighborVisualizationNodeId = action.payload.nodeId;
      state.neighborVisualizationDirection = action.payload.direction;
    },
    deactivateNeighborVisualization: (state) => {
      state.neighborVisualizationActive = false;
      state.neighborVisualizationNodeId = null;
      state.neighborVisualizationDirection = null;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setSearchFilters: (state, action: PayloadAction<SearchFilters>) => {
      state.searchFilters = action.payload;
      state.filteredNodes = applyFilters(state.nodes, action.payload);
    },
    clearSearchFilters: (state) => {
      state.searchFilters = {};
      state.filteredNodes = state.nodes;
    },
  },
});

export const {
  setNodes,
  addNode,
  updateNode,
  selectNode,
  openDetailsPanel,
  closeDetailsPanel,
  activateNeighborVisualization,
  deactivateNeighborVisualization,
  setLoading,
  setError,
  setSearchFilters,
  clearSearchFilters,
} = nodeSlice.actions;

export default nodeSlice.reducer;