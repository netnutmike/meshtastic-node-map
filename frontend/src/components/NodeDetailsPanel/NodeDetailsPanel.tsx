import React, { useState } from 'react';
import { Node } from '../../store/slices/nodeSlice';
import './NodeDetailsPanel.css';

interface NodeDetailsPanelProps {
  node: Node | null;
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'overview' | 'messages' | 'details' | 'lora' | 'position';

const NodeDetailsPanel: React.FC<NodeDetailsPanelProps> = ({ node, isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  if (!isOpen || !node) return null;

  const getNodeStatus = (): 'online' | 'disconnected' | 'offline' => {
    if (!node.isOnline) return 'offline';
    if (!node.mqttConnected) return 'disconnected';
    return 'online';
  };

  const status = getNodeStatus();
  const statusColors = {
    online: '#4caf50',
    disconnected: '#2196f3',
    offline: '#f44336',
  };

  const renderOverviewTab = () => (
    <div className="tab-content">
      <div className="node-header">
        <div className="node-status-indicator">
          <div 
            className="status-dot" 
            style={{ backgroundColor: statusColors[status] }}
          />
          <h2>{node.longName || node.shortName}</h2>
          <span className={`status-badge status-${status}`}>
            {status.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="info-grid">
        <div className="info-item">
          <label>Short Name:</label>
          <span>{node.shortName}</span>
        </div>
        <div className="info-item">
          <label>ID:</label>
          <span>{node.id}</span>
        </div>
        <div className="info-item">
          <label>Hex ID:</label>
          <span>{node.hexId}</span>
        </div>
        <div className="info-item">
          <label>Hardware:</label>
          <span>{node.hardwareModel}</span>
        </div>
        <div className="info-item">
          <label>Role:</label>
          <span>{node.role}</span>
        </div>
        <div className="info-item">
          <label>MQTT Status:</label>
          <span className={`mqtt-status mqtt-${node.mqttConnected ? 'connected' : 'disconnected'}`}>
            {node.mqttConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        
        {node.batteryLevel !== undefined && node.batteryLevel !== null && (
          <div className="info-item">
            <label>Battery Level:</label>
            <span className={`battery-level ${
              node.batteryLevel > 50 ? 'good' : 
              node.batteryLevel > 20 ? 'warning' : 'critical'
            }`}>
              {node.batteryLevel}%
            </span>
          </div>
        )}
        
        {node.voltage !== undefined && node.voltage !== null && !isNaN(node.voltage) && (
          <div className="info-item">
            <label>Voltage:</label>
            <span>{node.voltage.toFixed(2)}V</span>
          </div>
        )}
        
        {node.channelUtilization !== undefined && node.channelUtilization !== null && (
          <div className="info-item">
            <label>Channel Utilization:</label>
            <span>{node.channelUtilization}%</span>
          </div>
        )}
        
        {node.airUtilTx !== undefined && node.airUtilTx !== null && (
          <div className="info-item">
            <label>Air Utilization TX:</label>
            <span>{node.airUtilTx}%</span>
          </div>
        )}
        
        {node.position?.altitude !== undefined && node.position?.altitude !== null && (
          <div className="info-item">
            <label>Altitude:</label>
            <span>{node.position.altitude}m</span>
          </div>
        )}
        
        {node.position?.precision !== undefined && node.position?.precision !== null && (
          <div className="info-item">
            <label>Position Precision:</label>
            <span>±{node.position.precision}m</span>
          </div>
        )}
      </div>

      <div className="timestamps">
        <div className="timestamp-item">
          <label>Last Seen:</label>
          <span>{new Date(node.lastSeen).toLocaleString()}</span>
        </div>
        <div className="timestamp-item">
          <label>Last Heard:</label>
          <span>{new Date(node.lastHeard).toLocaleString()}</span>
        </div>
        {node.position && (
          <div className="timestamp-item">
            <label>Last Position Update:</label>
            <span>{new Date(node.lastSeen).toLocaleString()}</span>
          </div>
        )}
      </div>
    </div>
  );

  const renderMessagesTab = () => (
    <div className="tab-content">
      <div className="message-buttons">
        <button className="message-btn sent">
          Sent Messages
        </button>
        <button className="message-btn received">
          Received Messages
        </button>
        <button className="message-btn gated">
          Gated Messages
        </button>
      </div>
      <div className="message-placeholder">
        <p>Message history functionality will be implemented in future tasks.</p>
        <p>This section will display filtered message history based on the selected type.</p>
      </div>
    </div>
  );

  const renderDetailsTab = () => (
    <div className="tab-content">
      <h3>Device Details</h3>
      <div className="details-grid">
        <div className="detail-section">
          <h4>Identification</h4>
          <div className="info-item">
            <label>Node ID:</label>
            <span className="monospace">{node.id}</span>
          </div>
          <div className="info-item">
            <label>Hex ID:</label>
            <span className="monospace">{node.hexId}</span>
          </div>
        </div>

        <div className="detail-section">
          <h4>Hardware Information</h4>
          <div className="info-item">
            <label>Hardware Model:</label>
            <span>{node.hardwareModel}</span>
          </div>
          <div className="info-item">
            <label>Role:</label>
            <span>{node.role}</span>
          </div>
        </div>

        <div className="detail-section">
          <h4>Firmware Information</h4>
          <div className="info-item">
            <label>Firmware Version:</label>
            <span>{node.firmwareVersion}</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderLoRaTab = () => (
    <div className="tab-content">
      <h3>LoRa Configuration</h3>
      <div className="lora-grid">
        <div className="lora-section">
          <h4>Region Settings</h4>
          <div className="info-item">
            <label>Region:</label>
            <span>US915 (Default)</span>
          </div>
          <div className="info-item">
            <label>Frequency Band:</label>
            <span>902-928 MHz</span>
          </div>
        </div>

        <div className="lora-section">
          <h4>Modem Configuration</h4>
          <div className="info-item">
            <label>Modem Preset:</label>
            <span>Long Range (Default)</span>
          </div>
          <div className="info-item">
            <label>Bandwidth:</label>
            <span>125 kHz</span>
          </div>
          <div className="info-item">
            <label>Spreading Factor:</label>
            <span>SF12</span>
          </div>
          <div className="info-item">
            <label>Coding Rate:</label>
            <span>4/5</span>
          </div>
        </div>

        <div className="lora-section">
          <h4>Channel Status</h4>
          <div className="info-item">
            <label>Default Channel:</label>
            <span className="channel-active">Active</span>
          </div>
          <div className="info-item">
            <label>Channel Index:</label>
            <span>0</span>
          </div>
          <div className="info-item">
            <label>Channel Name:</label>
            <span>LongFast</span>
          </div>
        </div>
      </div>
      
      <div className="lora-note">
        <p><strong>Note:</strong> LoRa configuration data will be populated from actual device settings in future updates.</p>
      </div>
    </div>
  );

  const renderPositionTab = () => (
    <div className="tab-content">
      <h3>Position Information</h3>
      {node.position ? (
        <div className="position-grid">
          <div className="position-section">
            <h4>Coordinates</h4>
            <div className="coordinate-item">
              <label>Latitude:</label>
              <span className="coordinate">{node.position.latitude.toFixed(6)}°</span>
            </div>
            <div className="coordinate-item">
              <label>Longitude:</label>
              <span className="coordinate">{node.position.longitude.toFixed(6)}°</span>
            </div>
            {node.position.altitude !== undefined && node.position.altitude !== null && (
              <div className="coordinate-item">
                <label>Altitude:</label>
                <span className="coordinate">{node.position.altitude} meters</span>
              </div>
            )}
          </div>

          <div className="position-section">
            <h4>Position Quality</h4>
            {node.position.precision !== undefined && node.position.precision !== null && (
              <div className="info-item">
                <label>GPS Precision:</label>
                <span className={`precision ${
                  node.position.precision < 5 ? 'excellent' :
                  node.position.precision < 10 ? 'good' :
                  node.position.precision < 20 ? 'fair' : 'poor'
                }`}>
                  ±{node.position.precision}m
                </span>
              </div>
            )}
            <div className="info-item">
              <label>Position Source:</label>
              <span>GPS</span>
            </div>
          </div>

          <div className="position-section">
            <h4>Formatted Coordinates</h4>
            <div className="coordinate-formats">
              <div className="format-item">
                <label>Decimal Degrees:</label>
                <span className="monospace">
                  {node.position.latitude.toFixed(6)}, {node.position.longitude.toFixed(6)}
                </span>
              </div>
              <div className="format-item">
                <label>DMS:</label>
                <span className="monospace">
                  {convertToDMS(node.position.latitude, 'lat')}, {convertToDMS(node.position.longitude, 'lng')}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="no-position">
          <p>No position data available for this node.</p>
        </div>
      )}
    </div>
  );

  const convertToDMS = (decimal: number, type: 'lat' | 'lng'): string => {
    const absolute = Math.abs(decimal);
    const degrees = Math.floor(absolute);
    const minutes = Math.floor((absolute - degrees) * 60);
    const seconds = ((absolute - degrees - minutes / 60) * 3600).toFixed(2);
    
    const direction = type === 'lat' 
      ? (decimal >= 0 ? 'N' : 'S')
      : (decimal >= 0 ? 'E' : 'W');
    
    return `${degrees}°${minutes}'${seconds}"${direction}`;
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverviewTab();
      case 'messages':
        return renderMessagesTab();
      case 'details':
        return renderDetailsTab();
      case 'lora':
        return renderLoRaTab();
      case 'position':
        return renderPositionTab();
      default:
        return renderOverviewTab();
    }
  };

  return (
    <div className="node-details-overlay">
      <div className="node-details-panel">
        <div className="panel-header">
          <h1>Node Details</h1>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="tab-navigation">
          <button
            className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={`tab-btn ${activeTab === 'messages' ? 'active' : ''}`}
            onClick={() => setActiveTab('messages')}
          >
            Messages
          </button>
          <button
            className={`tab-btn ${activeTab === 'details' ? 'active' : ''}`}
            onClick={() => setActiveTab('details')}
          >
            Details
          </button>
          <button
            className={`tab-btn ${activeTab === 'lora' ? 'active' : ''}`}
            onClick={() => setActiveTab('lora')}
          >
            LoRa Config
          </button>
          <button
            className={`tab-btn ${activeTab === 'position' ? 'active' : ''}`}
            onClick={() => setActiveTab('position')}
          >
            Position
          </button>
        </div>

        <div className="panel-content">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default NodeDetailsPanel;