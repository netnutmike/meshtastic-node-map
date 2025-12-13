import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import './ConnectionStatus.css';

interface ConnectionStatusProps {
  showDetails?: boolean;
  className?: string;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ 
  showDetails = false, 
  className = '' 
}) => {
  const connection = useSelector((state: RootState) => state.connection);

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'connected':
        return '#4caf50'; // Green
      case 'connecting':
        return '#ff9800'; // Orange
      case 'disconnected':
        return '#757575'; // Gray
      case 'error':
        return '#f44336'; // Red
      default:
        return '#757575';
    }
  };

  const getStatusIcon = (status: string): string => {
    switch (status) {
      case 'connected':
        return '●';
      case 'connecting':
        return '◐';
      case 'disconnected':
        return '○';
      case 'error':
        return '✕';
      default:
        return '○';
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'disconnected':
        return 'Disconnected';
      case 'error':
        return 'Connection Error';
      default:
        return 'Unknown';
    }
  };

  const formatLastUpdate = (timestamp?: string): string => {
    if (!timestamp) return 'Never';
    
    const now = new Date();
    const update = new Date(timestamp);
    const diffMs = now.getTime() - update.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    
    if (diffSecs < 60) {
      return `${diffSecs}s ago`;
    } else if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else {
      const diffHours = Math.floor(diffMins / 60);
      return `${diffHours}h ago`;
    }
  };

  if (!showDetails) {
    // Compact status indicator
    return (
      <div className={`connection-status-compact ${className}`}>
        <span 
          className="status-indicator"
          style={{ color: getStatusColor(connection.websocket.status) }}
          title={`WebSocket: ${getStatusText(connection.websocket.status)}`}
        >
          {getStatusIcon(connection.websocket.status)}
        </span>
        <span 
          className="status-indicator"
          style={{ color: getStatusColor(connection.mqtt.status) }}
          title={`MQTT: ${getStatusText(connection.mqtt.status)}`}
        >
          {getStatusIcon(connection.mqtt.status)}
        </span>
      </div>
    );
  }

  // Detailed status panel
  return (
    <div className={`connection-status-detailed ${className}`}>
      <div className="connection-header">
        <h3>Connection Status</h3>
        {connection.offlineMode && (
          <span className="offline-badge">Offline Mode</span>
        )}
      </div>

      <div className="connection-section">
        <div className="connection-item">
          <span className="connection-label">WebSocket:</span>
          <span 
            className="connection-value"
            style={{ color: getStatusColor(connection.websocket.status) }}
          >
            {getStatusIcon(connection.websocket.status)} {getStatusText(connection.websocket.status)}
          </span>
          {connection.websocket.reconnectAttempts > 0 && (
            <span className="reconnect-info">
              (Attempt {connection.websocket.reconnectAttempts})
            </span>
          )}
        </div>

        <div className="connection-item">
          <span className="connection-label">MQTT:</span>
          <span 
            className="connection-value"
            style={{ color: getStatusColor(connection.mqtt.status) }}
          >
            {getStatusIcon(connection.mqtt.status)} {getStatusText(connection.mqtt.status)}
          </span>
          {connection.mqtt.messageCount > 0 && (
            <span className="message-count">
              ({connection.mqtt.messageCount} messages)
            </span>
          )}
        </div>

        {connection.mqtt.brokerUrl && (
          <div className="connection-item">
            <span className="connection-label">Broker:</span>
            <span className="connection-value">{connection.mqtt.brokerUrl}</span>
          </div>
        )}
      </div>

      {Object.keys(connection.networks).length > 0 && (
        <div className="connection-section">
          <h4>Networks</h4>
          {Object.values(connection.networks).map((network) => (
            <div key={network.id} className="connection-item">
              <span className="connection-label">{network.name}:</span>
              <span 
                className="connection-value"
                style={{ color: getStatusColor(network.status) }}
              >
                {getStatusIcon(network.status)} {getStatusText(network.status)}
              </span>
              {network.error && (
                <span className="error-info" title={network.error}>
                  ⚠️
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="connection-section">
        <div className="connection-item">
          <span className="connection-label">Last Update:</span>
          <span className="connection-value">
            {formatLastUpdate(connection.lastDataUpdate)}
          </span>
        </div>
        {connection.websocket.lastConnected && (
          <div className="connection-item">
            <span className="connection-label">Connected Since:</span>
            <span className="connection-value">
              {formatLastUpdate(connection.websocket.lastConnected)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConnectionStatus;