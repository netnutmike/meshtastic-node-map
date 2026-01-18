import { io, Socket } from 'socket.io-client';
import { store } from '../store';
import { addNode, updateNode } from '../store/slices/nodeSlice';
import { 
  setWebSocketStatus, 
  setMqttStatus, 
  setNetworkStatus, 
  updateLastDataUpdate,
  incrementMqttMessageCount 
} from '../store/slices/connectionSlice';
import offlineService from './offline.service';

export interface WebSocketService {
  connect(): void;
  disconnect(): void;
  isConnected(): boolean;
  getConnectionStatus(): 'connected' | 'disconnected' | 'connecting' | 'error';
}

class WebSocketServiceImpl implements WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private maxReconnectDelay = 30000; // Max 30 seconds
  private connectionStatus: 'connected' | 'disconnected' | 'connecting' | 'error' = 'disconnected';
  private reconnectTimer: NodeJS.Timeout | null = null;
  private canDispatchToRedux = false;

  constructor() {
    this.connect = this.connect.bind(this);
    this.disconnect = this.disconnect.bind(this);
    this.handleConnect = this.handleConnect.bind(this);
    this.handleDisconnect = this.handleDisconnect.bind(this);
    this.handleReconnect = this.handleReconnect.bind(this);
    this.handleConnectError = this.handleConnectError.bind(this);
    this.handleNodeUpdate = this.handleNodeUpdate.bind(this);
    this.handleNetworkStatus = this.handleNetworkStatus.bind(this);
    this.handleMqttStatus = this.handleMqttStatus.bind(this);
    this.dispatchConnectionStatus = this.dispatchConnectionStatus.bind(this);
    this.dispatchNetworkStatus = this.dispatchNetworkStatus.bind(this);
    this.dispatchMqttStatus = this.dispatchMqttStatus.bind(this);
  }

  // Enable Redux dispatching after React is ready
  public enableReduxDispatching(): void {
    this.canDispatchToRedux = true;
  }

  connect(): void {
    if (this.socket?.connected) {
      return;
    }

    this.connectionStatus = 'connecting';
    
    const wsUrl = process.env.REACT_APP_WS_URL || window.location.origin;
    
    this.socket = io(wsUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      reconnection: false, // We'll handle reconnection manually
    });

    this.setupEventListeners();
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.connectionStatus = 'disconnected';
    this.reconnectAttempts = 0;
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getConnectionStatus(): 'connected' | 'disconnected' | 'connecting' | 'error' {
    return this.connectionStatus;
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', this.handleConnect);
    this.socket.on('disconnect', this.handleDisconnect);
    this.socket.on('connect_error', this.handleConnectError);
    
    // Real-time data update handlers
    this.socket.on('nodeUpdate', this.handleNodeUpdate);
    this.socket.on('networkStatus', this.handleNetworkStatus);
    this.socket.on('mqttStatus', this.handleMqttStatus);
  }

  private handleConnect(): void {
    console.log('WebSocket connected');
    this.connectionStatus = 'connected';
    this.reconnectAttempts = 0;
    this.reconnectDelay = 1000; // Reset delay
    
    // Request current MQTT status
    this.socket?.emit('getMQTTStatus');
    
    // Dispatch connection status update
    this.dispatchConnectionStatus('connected');
  }

  private handleDisconnect(reason: string): void {
    console.log('WebSocket disconnected:', reason);
    this.connectionStatus = 'disconnected';
    
    // Dispatch connection status update
    this.dispatchConnectionStatus('disconnected');
    
    // Attempt to reconnect unless it was a manual disconnect
    if (reason !== 'io client disconnect') {
      this.scheduleReconnect();
    }
  }

  private handleConnectError(error: Error): void {
    console.error('WebSocket connection error:', error);
    this.connectionStatus = 'error';
    
    // Dispatch connection status update
    this.dispatchConnectionStatus('error');
    
    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.connectionStatus = 'error';
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), this.maxReconnectDelay);
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    this.reconnectTimer = setTimeout(() => {
      this.handleReconnect();
    }, delay);
  }

  private handleReconnect(): void {
    if (this.socket?.connected) {
      return;
    }

    console.log('Attempting to reconnect...');
    this.connectionStatus = 'connecting';
    this.connect();
  }

  private handleNodeUpdate(data: any): void {
    console.log('Received node update:', data);
    
    if (!this.canDispatchToRedux) {
      console.warn('Redux not ready, skipping node update');
      return;
    }
    
    try {
      const { type, nodeId, data: nodeData } = data;
      
      switch (type) {
        case 'node_created':
        case 'node_updated':
        case 'position_updated':
        case 'telemetry_updated':
          // Transform backend data to frontend format
          const transformedNode = this.transformNodeData(nodeData);
          
          if (type === 'node_created') {
            store.dispatch(addNode(transformedNode));
          } else {
            store.dispatch(updateNode({ id: nodeId, ...transformedNode }));
          }
          
          // Cache the node data for offline use
          offlineService.cacheData(`node_${nodeId}`, transformedNode, 24 * 60 * 60 * 1000); // 24 hours TTL
          
          // Update last data update timestamp
          store.dispatch(updateLastDataUpdate());
          break;
          
        default:
          console.warn('Unknown node update type:', type);
      }
    } catch (error) {
      console.error('Error handling node update:', error);
    }
  }

  private handleNetworkStatus(data: any): void {
    console.log('Received network status:', data);
    
    if (!this.canDispatchToRedux) {
      console.warn('Redux not ready, skipping network status update');
      return;
    }
    
    // Update network connection status in store if needed
    // This could be expanded to handle multiple networks
    const { networkId, status, error } = data;
    
    // Dispatch network status update to store
    this.dispatchNetworkStatus(networkId, status, error);
  }

  private handleMqttStatus(data: any): void {
    console.log('Received MQTT status:', data);
    
    if (!this.canDispatchToRedux) {
      console.warn('Redux not ready, skipping MQTT status update');
      return;
    }
    
    // Handle MQTT broker status updates
    // This could include connection counts, message rates, etc.
    this.dispatchMqttStatus(data);
  }

  private transformNodeData(backendNode: any): any {
    // Transform backend node data format to frontend format
    return {
      id: backendNode.id,
      hexId: backendNode.hexId,
      shortName: backendNode.shortName,
      longName: backendNode.longName,
      hardwareModel: backendNode.hardwareModel,
      firmwareVersion: backendNode.firmwareVersion,
      role: backendNode.role,
      position: backendNode.position ? {
        latitude: backendNode.position.latitude,
        longitude: backendNode.position.longitude,
        altitude: backendNode.position.altitude,
        precision: backendNode.position.precision,
      } : null,
      lastSeen: backendNode.lastSeen,
      lastHeard: backendNode.lastHeard,
      isOnline: backendNode.isOnline,
      mqttConnected: backendNode.mqttConnected,
      batteryLevel: backendNode.batteryLevel,
      voltage: backendNode.voltage,
      channelUtilization: backendNode.channelUtilization,
      airUtilTx: backendNode.airUtilTx,
      neighbors: backendNode.neighbors || [],
    };
  }

  private dispatchConnectionStatus(status: 'connected' | 'disconnected' | 'error'): void {
    console.log('Connection status changed:', status);
    if (this.canDispatchToRedux) {
      store.dispatch(setWebSocketStatus({ 
        status, 
        reconnectAttempts: this.reconnectAttempts 
      }));
    }
  }

  private dispatchNetworkStatus(networkId: string, status: string, error?: string): void {
    console.log(`Network ${networkId} status: ${status}`, error ? `Error: ${error}` : '');
    if (this.canDispatchToRedux) {
      store.dispatch(setNetworkStatus({ 
        networkId, 
        status: status as 'connected' | 'disconnected' | 'error', 
        error 
      }));
    }
  }

  private dispatchMqttStatus(data: any): void {
    console.log('MQTT status update:', data);
    if (this.canDispatchToRedux) {
      store.dispatch(setMqttStatus({
        status: data.connected ? 'connected' : 'disconnected',
        brokerUrl: data.brokerUrl,
        messageCount: data.messageCount,
        lastMessage: data.lastMessage
      }));
    }
  }
}

// Create singleton instance
export const webSocketService = new WebSocketServiceImpl();

export default webSocketService;