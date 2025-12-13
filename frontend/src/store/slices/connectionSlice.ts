import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface ConnectionState {
  websocket: {
    status: 'connected' | 'disconnected' | 'connecting' | 'error';
    lastConnected?: string;
    reconnectAttempts: number;
  };
  mqtt: {
    status: 'connected' | 'disconnected' | 'error';
    brokerUrl?: string;
    messageCount: number;
    lastMessage?: string;
  };
  networks: Record<string, {
    id: string;
    name: string;
    status: 'connected' | 'disconnected' | 'error';
    error?: string;
    lastUpdate: string;
  }>;
  offlineMode: boolean;
  lastDataUpdate?: string;
}

const initialState: ConnectionState = {
  websocket: {
    status: 'disconnected',
    reconnectAttempts: 0,
  },
  mqtt: {
    status: 'disconnected',
    messageCount: 0,
  },
  networks: {},
  offlineMode: false,
};

const connectionSlice = createSlice({
  name: 'connection',
  initialState,
  reducers: {
    setWebSocketStatus: (state, action: PayloadAction<{
      status: 'connected' | 'disconnected' | 'connecting' | 'error';
      reconnectAttempts?: number;
    }>) => {
      state.websocket.status = action.payload.status;
      if (action.payload.reconnectAttempts !== undefined) {
        state.websocket.reconnectAttempts = action.payload.reconnectAttempts;
      }
      if (action.payload.status === 'connected') {
        state.websocket.lastConnected = new Date().toISOString();
        state.websocket.reconnectAttempts = 0;
        state.offlineMode = false;
      }
    },

    setMqttStatus: (state, action: PayloadAction<{
      status: 'connected' | 'disconnected' | 'error';
      brokerUrl?: string;
      messageCount?: number;
      lastMessage?: string;
    }>) => {
      state.mqtt.status = action.payload.status;
      if (action.payload.brokerUrl) {
        state.mqtt.brokerUrl = action.payload.brokerUrl;
      }
      if (action.payload.messageCount !== undefined) {
        state.mqtt.messageCount = action.payload.messageCount;
      }
      if (action.payload.lastMessage) {
        state.mqtt.lastMessage = action.payload.lastMessage;
      }
    },

    setNetworkStatus: (state, action: PayloadAction<{
      networkId: string;
      name?: string;
      status: 'connected' | 'disconnected' | 'error';
      error?: string;
    }>) => {
      const { networkId, name, status, error } = action.payload;
      state.networks[networkId] = {
        id: networkId,
        name: name || state.networks[networkId]?.name || 'Unknown Network',
        status,
        error,
        lastUpdate: new Date().toISOString(),
      };
    },

    removeNetwork: (state, action: PayloadAction<string>) => {
      delete state.networks[action.payload];
    },

    setOfflineMode: (state, action: PayloadAction<boolean>) => {
      state.offlineMode = action.payload;
    },

    updateLastDataUpdate: (state) => {
      state.lastDataUpdate = new Date().toISOString();
    },

    incrementMqttMessageCount: (state) => {
      state.mqtt.messageCount += 1;
    },

    resetConnectionState: (state) => {
      return {
        ...initialState,
        networks: state.networks, // Keep network info
      };
    },
  },
});

export const {
  setWebSocketStatus,
  setMqttStatus,
  setNetworkStatus,
  removeNetwork,
  setOfflineMode,
  updateLastDataUpdate,
  incrementMqttMessageCount,
  resetConnectionState,
} = connectionSlice.actions;

export default connectionSlice.reducer;