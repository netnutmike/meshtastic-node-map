import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface MapState {
  center: [number, number];
  zoom: number;
  tileLayer: string;
  showNodes: boolean;
  showNeighbors: boolean;
  showLegend: boolean;
  showPositionHistory: boolean;
  showNodeLabels: boolean;
  nodeDisplayMode: 'all' | 'routers' | 'clustered' | 'none';
  viewMode: 'nodes' | 'nodeTypes' | 'bandwidthUtilization';
  clusteringEnabled: boolean;
  animationsEnabled: boolean;
  topologyGraphOpen: boolean;
  showRFLinks: boolean;
  showTracerouteLinks: boolean;
  showPacketLinks: boolean;
  showDistanceLabels: boolean; // New: toggle for distance labels on RF links
  hopDepthFilter: number | null; // null = all hops, 1/2/3 = specific hop depth
  selectedNodeForHopFilter: string | null; // Node ID to calculate hops from
}

const defaultMapState: MapState = {
  center: [40.7128, -74.0060], // Default to NYC (will be updated by geolocation)
  zoom: 10,
  tileLayer: 'openstreetmap',
  showNodes: true,
  showNeighbors: false,
  showLegend: true,
  showPositionHistory: false,
  showNodeLabels: false,
  nodeDisplayMode: 'all',
  viewMode: 'nodes',
  clusteringEnabled: true,
  animationsEnabled: true,
  topologyGraphOpen: false,
  showRFLinks: false,
  showTracerouteLinks: true,
  showPacketLinks: true,
  showDistanceLabels: false,
  hopDepthFilter: null,
  selectedNodeForHopFilter: null,
};

// Request user's geolocation
const getUserLocation = (): Promise<[number, number]> => {
  return new Promise((resolve) => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('User location obtained:', position.coords.latitude, position.coords.longitude);
          resolve([position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          console.warn('Geolocation error:', error.message);
          // Fall back to default location
          resolve(defaultMapState.center);
        },
        {
          enableHighAccuracy: false,
          timeout: 5000,
          maximumAge: 300000, // Cache for 5 minutes
        }
      );
    } else {
      console.warn('Geolocation not supported');
      resolve(defaultMapState.center);
    }
  });
};

// Load map preferences from localStorage
const loadMapPreferencesFromStorage = (): MapState => {
  try {
    const savedPreferences = localStorage.getItem('meshtastic-node-mapper-map-preferences');
    if (savedPreferences) {
      const parsed = JSON.parse(savedPreferences);
      // Merge with defaults to handle new preferences added in updates
      // Don't persist topologyGraphOpen (should always start closed)
      return { ...defaultMapState, ...parsed, topologyGraphOpen: false };
    }
  } catch (error) {
    console.warn('Failed to load map preferences from localStorage:', error);
  }
  return defaultMapState;
};

// Save map preferences to localStorage
const saveMapPreferencesToStorage = (state: MapState) => {
  try {
    // Don't save topologyGraphOpen (should always start closed)
    const { topologyGraphOpen, ...preferencesToSave } = state;
    localStorage.setItem('meshtastic-node-mapper-map-preferences', JSON.stringify(preferencesToSave));
  } catch (error) {
    console.warn('Failed to save map preferences to localStorage:', error);
  }
};

const initialState: MapState = loadMapPreferencesFromStorage();

const mapSlice = createSlice({
  name: 'map',
  initialState,
  reducers: {
    setCenter: (state, action: PayloadAction<[number, number]>) => {
      state.center = action.payload;
      saveMapPreferencesToStorage(state);
    },
    setZoom: (state, action: PayloadAction<number>) => {
      state.zoom = action.payload;
      saveMapPreferencesToStorage(state);
    },
    setTileLayer: (state, action: PayloadAction<string>) => {
      state.tileLayer = action.payload;
      saveMapPreferencesToStorage(state);
    },
    toggleNodes: (state) => {
      state.showNodes = !state.showNodes;
      saveMapPreferencesToStorage(state);
    },
    toggleNeighbors: (state) => {
      state.showNeighbors = !state.showNeighbors;
      saveMapPreferencesToStorage(state);
    },
    toggleLegend: (state) => {
      state.showLegend = !state.showLegend;
      saveMapPreferencesToStorage(state);
    },
    togglePositionHistory: (state) => {
      state.showPositionHistory = !state.showPositionHistory;
      saveMapPreferencesToStorage(state);
    },
    toggleNodeLabels: (state) => {
      state.showNodeLabels = !state.showNodeLabels;
      saveMapPreferencesToStorage(state);
    },
    setNodeDisplayMode: (state, action: PayloadAction<'all' | 'routers' | 'clustered' | 'none'>) => {
      state.nodeDisplayMode = action.payload;
      saveMapPreferencesToStorage(state);
    },
    setViewMode: (state, action: PayloadAction<'nodes' | 'nodeTypes' | 'bandwidthUtilization'>) => {
      state.viewMode = action.payload;
      saveMapPreferencesToStorage(state);
    },
    toggleClustering: (state) => {
      state.clusteringEnabled = !state.clusteringEnabled;
      saveMapPreferencesToStorage(state);
    },
    toggleAnimations: (state) => {
      state.animationsEnabled = !state.animationsEnabled;
      saveMapPreferencesToStorage(state);
    },
    openTopologyGraph: (state) => {
      state.topologyGraphOpen = true;
      // Don't save topologyGraphOpen
    },
    closeTopologyGraph: (state) => {
      state.topologyGraphOpen = false;
      // Don't save topologyGraphOpen
    },
    setUserLocation: (state, action: PayloadAction<[number, number]>) => {
      // Only update center if it's still the default (user hasn't moved the map yet)
      const isDefaultCenter = 
        state.center[0] === defaultMapState.center[0] && 
        state.center[1] === defaultMapState.center[1];
      
      if (isDefaultCenter) {
        state.center = action.payload;
        state.zoom = 12; // Zoom in a bit when using user location
        saveMapPreferencesToStorage(state);
      }
    },
    toggleRFLinks: (state) => {
      state.showRFLinks = !state.showRFLinks;
      saveMapPreferencesToStorage(state);
    },
    toggleTracerouteLinks: (state) => {
      state.showTracerouteLinks = !state.showTracerouteLinks;
      saveMapPreferencesToStorage(state);
    },
    togglePacketLinks: (state) => {
      state.showPacketLinks = !state.showPacketLinks;
      saveMapPreferencesToStorage(state);
    },
    setHopDepthFilter: (state, action: PayloadAction<number | null>) => {
      state.hopDepthFilter = action.payload;
      saveMapPreferencesToStorage(state);
    },
    setSelectedNodeForHopFilter: (state, action: PayloadAction<string | null>) => {
      state.selectedNodeForHopFilter = action.payload;
      // Don't save selected node to storage (should reset on page load)
    },
    clearHopDepthFilter: (state) => {
      state.hopDepthFilter = null;
      state.selectedNodeForHopFilter = null;
      saveMapPreferencesToStorage(state);
    },
    toggleDistanceLabels: (state) => {
      state.showDistanceLabels = !state.showDistanceLabels;
      saveMapPreferencesToStorage(state);
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
  togglePositionHistory,
  toggleNodeLabels,
  setNodeDisplayMode,
  setViewMode,
  toggleClustering,
  toggleAnimations,
  openTopologyGraph,
  closeTopologyGraph,
  setUserLocation,
  toggleRFLinks,
  toggleTracerouteLinks,
  togglePacketLinks,
  setHopDepthFilter,
  setSelectedNodeForHopFilter,
  clearHopDepthFilter,
  toggleDistanceLabels,
} = mapSlice.actions;

export { getUserLocation };

export default mapSlice.reducer;