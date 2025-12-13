import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface MapState {
  center: [number, number];
  zoom: number;
  tileLayer: string;
  showNodes: boolean;
  showNeighbors: boolean;
  showLegend: boolean;
  viewMode: 'nodes' | 'nodeTypes' | 'bandwidthUtilization';
  clusteringEnabled: boolean;
  animationsEnabled: boolean;
}

const initialState: MapState = {
  center: [40.7128, -74.0060], // Default to NYC
  zoom: 10,
  tileLayer: 'openstreetmap',
  showNodes: true,
  showNeighbors: false,
  showLegend: true,
  viewMode: 'nodes',
  clusteringEnabled: true,
  animationsEnabled: true,
};

const mapSlice = createSlice({
  name: 'map',
  initialState,
  reducers: {
    setCenter: (state, action: PayloadAction<[number, number]>) => {
      state.center = action.payload;
    },
    setZoom: (state, action: PayloadAction<number>) => {
      state.zoom = action.payload;
    },
    setTileLayer: (state, action: PayloadAction<string>) => {
      state.tileLayer = action.payload;
    },
    toggleNodes: (state) => {
      state.showNodes = !state.showNodes;
    },
    toggleNeighbors: (state) => {
      state.showNeighbors = !state.showNeighbors;
    },
    toggleLegend: (state) => {
      state.showLegend = !state.showLegend;
    },
    setViewMode: (state, action: PayloadAction<'nodes' | 'nodeTypes' | 'bandwidthUtilization'>) => {
      state.viewMode = action.payload;
    },
    toggleClustering: (state) => {
      state.clusteringEnabled = !state.clusteringEnabled;
    },
    toggleAnimations: (state) => {
      state.animationsEnabled = !state.animationsEnabled;
    },
  },
});

export const {
  setCenter,
  setZoom,
  setTileLayer,
  toggleNodes,
  toggleNeighbors,
  toggleLegend,
  setViewMode,
  toggleClustering,
  toggleAnimations,
} = mapSlice.actions;

export default mapSlice.reducer;