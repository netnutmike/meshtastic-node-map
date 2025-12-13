import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Node {
  id: string;
  hexId: string;
  shortName: string;
  longName: string;
  hardwareModel: string;
  firmwareVersion: string;
  role: string;
  position: {
    latitude: number;
    longitude: number;
    altitude?: number;
    precision?: number;
  } | null;
  lastSeen: string;
  lastHeard: string;
  isOnline: boolean;
  mqttConnected: boolean;
  batteryLevel?: number;
  voltage?: number;
  channelUtilization?: number;
  airUtilTx?: number;
}

interface NodeState {
  nodes: Node[];
  selectedNodeId: string | null;
  detailsPanelOpen: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: NodeState = {
  nodes: [],
  selectedNodeId: null,
  detailsPanelOpen: false,
  loading: false,
  error: null,
};

const nodeSlice = createSlice({
  name: 'nodes',
  initialState,
  reducers: {
    setNodes: (state, action: PayloadAction<Node[]>) => {
      state.nodes = action.payload;
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
    },
    updateNode: (state, action: PayloadAction<Partial<Node> & { id: string }>) => {
      const index = state.nodes.findIndex(node => node.id === action.payload.id);
      if (index >= 0) {
        state.nodes[index] = { ...state.nodes[index], ...action.payload };
      }
    },
    selectNode: (state, action: PayloadAction<string | null>) => {
      state.selectedNodeId = action.payload;
    },
    openDetailsPanel: (state, action: PayloadAction<string>) => {
      state.selectedNodeId = action.payload;
      state.detailsPanelOpen = true;
    },
    closeDetailsPanel: (state) => {
      state.detailsPanelOpen = false;
      state.selectedNodeId = null;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
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
  setLoading,
  setError,
} = nodeSlice.actions;

export default nodeSlice.reducer;