/**
 * MQTT Monitor Component
 * Real-time MQTT traffic monitoring interface with filtering and debugging tools
 * Requirements: 11.1
 */

import React, { useState, useEffect, useCallback } from 'react';
import './MQTTMonitor.css';

interface MQTTMessage {
  id: string;
  topic: string;
  payload: string;
  timestamp: Date;
  size: number;
  qos: number;
  retain: boolean;
  parsed?: {
    nodeId?: string;
    type?: string;
    encrypted?: boolean;
    decryptionFailed?: boolean;
    channel?: number;
    priority?: string;
    content?: any;
  };
}

interface MessageStatistics {
  totalMessages: number;
  messagesByType: Record<string, number>;
  messagesByChannel: Record<number, number>;
  encryptedMessages: number;
  unencryptedMessages: number;
  averageMessageSize: number;
  messagesPerMinute: number;
  topNodes: Array<{ nodeId: string; shortName?: string; longName?: string; count: number }>;
  timeRange: string;
}

interface TrafficRate {
  timestamp: Date;
  messagesPerSecond: number;
  bytesPerSecond: number;
  interval: string;
}

interface MQTTMonitorProps {
  isVisible: boolean;
  onClose: () => void;
}

export const MQTTMonitor: React.FC<MQTTMonitorProps> = ({ isVisible, onClose }) => {
  const [messages, setMessages] = useState<MQTTMessage[]>([]);
  const [statistics, setStatistics] = useState<MessageStatistics | null>(null);
  const [trafficRate, setTrafficRate] = useState<TrafficRate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states
  const [filters, setFilters] = useState({
    messageType: '',
    nodeId: '',
    encrypted: '',
    channel: '',
    search: ''
  });
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const messagesPerPage = 50;
  
  // Active tab
  const [activeTab, setActiveTab] = useState<'messages' | 'statistics' | 'traffic'>('messages');
  
  // Auto-refresh
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5000); // 5 seconds
  
  // Selected message for inspection
  const [selectedMessage, setSelectedMessage] = useState<MQTTMessage | null>(null);

  // Fetch messages with current filters
  const fetchMessages = useCallback(async () => {
    if (!isVisible) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: messagesPerPage.toString(),
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== '')
        )
      });
      
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${API_BASE_URL}/v1/mqtt-monitor/messages?${queryParams}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      setMessages(data.data.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      })));
      
      setTotalPages(data.pagination.pages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch messages');
      console.error('Error fetching MQTT messages:', err);
    } finally {
      setLoading(false);
    }
  }, [isVisible, currentPage, filters]);

  // Fetch statistics
  const fetchStatistics = useCallback(async () => {
    if (!isVisible || activeTab !== 'statistics') return;
    
    try {
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${API_BASE_URL}/v1/mqtt-monitor/statistics?timeRange=1h`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setStatistics(data.data);
    } catch (err) {
      console.error('Error fetching statistics:', err);
    }
  }, [isVisible, activeTab]);

  // Fetch traffic rate
  const fetchTrafficRate = useCallback(async () => {
    if (!isVisible || activeTab !== 'traffic') return;
    
    try {
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${API_BASE_URL}/v1/mqtt-monitor/traffic-rate?interval=1m`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setTrafficRate(data.data.map((rate: any) => ({
        ...rate,
        timestamp: new Date(rate.timestamp)
      })));
    } catch (err) {
      console.error('Error fetching traffic rate:', err);
    }
  }, [isVisible, activeTab]);

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh || !isVisible) return;
    
    const interval = setInterval(() => {
      if (activeTab === 'messages') {
        fetchMessages();
      } else if (activeTab === 'statistics') {
        fetchStatistics();
      } else if (activeTab === 'traffic') {
        fetchTrafficRate();
      }
    }, refreshInterval);
    
    return () => clearInterval(interval);
  }, [autoRefresh, isVisible, activeTab, refreshInterval, fetchMessages, fetchStatistics, fetchTrafficRate]);

  // Initial data fetch
  useEffect(() => {
    if (isVisible) {
      if (activeTab === 'messages') {
        fetchMessages();
      } else if (activeTab === 'statistics') {
        fetchStatistics();
      } else if (activeTab === 'traffic') {
        fetchTrafficRate();
      }
    }
  }, [isVisible, activeTab, fetchMessages, fetchStatistics, fetchTrafficRate]);

  // Handle filter changes
  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filters change
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      messageType: '',
      nodeId: '',
      encrypted: '',
      channel: '',
      search: ''
    });
    setCurrentPage(1);
  };

  // Format message size
  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Format timestamp
  const formatTimestamp = (timestamp: Date): string => {
    return timestamp.toLocaleString();
  };

  // Render message type badge
  const renderMessageTypeBadge = (type?: string) => {
    if (!type) return null;
    
    const colors: Record<string, string> = {
      'TEXT': 'bg-blue-100 text-blue-800',
      'POSITION': 'bg-green-100 text-green-800',
      'TELEMETRY': 'bg-purple-100 text-purple-800',
      'NODEINFO': 'bg-orange-100 text-orange-800',
      'ROUTING': 'bg-gray-100 text-gray-800'
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[type] || 'bg-gray-100 text-gray-800'}`}>
        {type}
      </span>
    );
  };

  if (!isVisible) return null;

  return (
    <div className="mqtt-monitor-overlay">
      <div className="mqtt-monitor-container">
        {/* Header */}
        <div className="mqtt-monitor-header">
          <h2 className="mqtt-monitor-title">MQTT Traffic Monitor</h2>
          <div className="mqtt-monitor-controls">
            <label className="auto-refresh-control">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              Auto-refresh ({refreshInterval / 1000}s)
            </label>
            <button
              className="refresh-button"
              onClick={() => {
                if (activeTab === 'messages') fetchMessages();
                else if (activeTab === 'statistics') fetchStatistics();
                else if (activeTab === 'traffic') fetchTrafficRate();
              }}
              disabled={loading}
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
            <button className="close-button" onClick={onClose}>
              ×
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mqtt-monitor-tabs">
          <button
            className={`tab-button ${activeTab === 'messages' ? 'active' : ''}`}
            onClick={() => setActiveTab('messages')}
          >
            Messages
          </button>
          <button
            className={`tab-button ${activeTab === 'statistics' ? 'active' : ''}`}
            onClick={() => setActiveTab('statistics')}
          >
            Statistics
          </button>
          <button
            className={`tab-button ${activeTab === 'traffic' ? 'active' : ''}`}
            onClick={() => setActiveTab('traffic')}
          >
            Traffic Rate
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="error-message">
            Error: {error}
          </div>
        )}

        {/* Messages Tab */}
        {activeTab === 'messages' && (
          <div className="messages-tab">
            {/* Filters */}
            <div className="filters-section">
              <div className="filter-row">
                <select
                  value={filters.messageType}
                  onChange={(e) => handleFilterChange('messageType', e.target.value)}
                  className="filter-select"
                >
                  <option value="">All Message Types</option>
                  <option value="TEXT">Text</option>
                  <option value="POSITION">Position</option>
                  <option value="TELEMETRY">Telemetry</option>
                  <option value="NODEINFO">Node Info</option>
                  <option value="ROUTING">Routing</option>
                </select>
                
                <input
                  type="text"
                  placeholder="Node ID"
                  value={filters.nodeId}
                  onChange={(e) => handleFilterChange('nodeId', e.target.value)}
                  className="filter-input"
                />
                
                <select
                  value={filters.encrypted}
                  onChange={(e) => handleFilterChange('encrypted', e.target.value)}
                  className="filter-select"
                >
                  <option value="">All Encryption</option>
                  <option value="true">Encrypted</option>
                  <option value="false">Unencrypted</option>
                </select>
                
                <input
                  type="number"
                  placeholder="Channel"
                  value={filters.channel}
                  onChange={(e) => handleFilterChange('channel', e.target.value)}
                  className="filter-input"
                  min="0"
                  max="7"
                />
                
                <input
                  type="text"
                  placeholder="Search content..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="filter-input search-input"
                />
                
                <button onClick={clearFilters} className="clear-filters-button">
                  Clear
                </button>
              </div>
            </div>

            {/* Messages List */}
            <div className="messages-list">
              {loading && messages.length === 0 ? (
                <div className="loading-message">Loading messages...</div>
              ) : messages.length === 0 ? (
                <div className="no-messages">No messages found</div>
              ) : (
                <div className="messages-table">
                  <div className="table-header">
                    <div className="col-timestamp">Timestamp</div>
                    <div className="col-topic">Topic</div>
                    <div className="col-type">Type</div>
                    <div className="col-node">Node</div>
                    <div className="col-size">Size</div>
                    <div className="col-encrypted">Encrypted</div>
                    <div className="col-actions">Actions</div>
                  </div>
                  
                  {messages.map((message) => (
                    <div key={message.id} className="table-row">
                      <div className="col-timestamp">
                        {formatTimestamp(message.timestamp)}
                      </div>
                      <div className="col-topic" title={message.topic}>
                        {message.topic}
                      </div>
                      <div className="col-type">
                        {renderMessageTypeBadge(message.parsed?.type)}
                      </div>
                      <div className="col-node">
                        {message.parsed?.nodeId || '-'}
                      </div>
                      <div className="col-size">
                        {formatSize(message.size)}
                      </div>
                      <div className="col-encrypted">
                        {message.parsed?.decryptionFailed ? (
                          <span className="decryption-failed-badge" title="Decryption failed - check encryption key">
                            🔒❌
                          </span>
                        ) : message.parsed?.encrypted ? (
                          <span className="encrypted-badge" title="Encrypted">🔒</span>
                        ) : (
                          <span className="unencrypted-badge" title="Unencrypted">🔓</span>
                        )}
                      </div>
                      <div className="col-actions">
                        <button
                          onClick={() => setSelectedMessage(message)}
                          className="inspect-button"
                        >
                          Inspect
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="pagination-button"
                >
                  Previous
                </button>
                <span className="pagination-info">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="pagination-button"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {/* Statistics Tab */}
        {activeTab === 'statistics' && (
          <div className="statistics-tab">
            {statistics ? (
              <div className="statistics-content">
                <div className="stats-grid">
                  <div className="stat-card">
                    <h3>Total Messages</h3>
                    <div className="stat-value">{statistics.totalMessages}</div>
                  </div>
                  
                  <div className="stat-card">
                    <h3>Messages/Minute</h3>
                    <div className="stat-value">{statistics.messagesPerMinute.toFixed(1)}</div>
                  </div>
                  
                  <div className="stat-card">
                    <h3>Encrypted</h3>
                    <div className="stat-value">{statistics.encryptedMessages}</div>
                  </div>
                  
                  <div className="stat-card">
                    <h3>Avg Size</h3>
                    <div className="stat-value">{formatSize(Math.round(statistics.averageMessageSize))}</div>
                  </div>
                </div>

                <div className="stats-sections">
                  <div className="stats-section">
                    <h3>Messages by Type</h3>
                    <div className="stats-list">
                      {Object.entries(statistics.messagesByType)
                        .filter(([type, count]) => count > 0)
                        .map(([type, count]) => (
                          <div key={type} className="stats-item">
                            <span className="stats-label">{type}</span>
                            <span className="stats-count">{count}</span>
                          </div>
                        ))}
                      {Object.entries(statistics.messagesByType).filter(([_, count]) => count > 0).length === 0 && (
                        <div className="stats-item">
                          <span className="stats-label">No messages</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="stats-section">
                    <h3>Messages by Channel</h3>
                    <div className="stats-list">
                      {Object.entries(statistics.messagesByChannel)
                        .filter(([channel, count]) => count > 0)
                        .map(([channel, count]) => (
                          <div key={channel} className="stats-item">
                            <span className="stats-label">Channel {channel}</span>
                            <span className="stats-count">{count}</span>
                          </div>
                        ))}
                      {Object.entries(statistics.messagesByChannel).filter(([_, count]) => count > 0).length === 0 && (
                        <div className="stats-item">
                          <span className="stats-label">No messages</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="stats-section">
                    <h3>Top Nodes</h3>
                    <div className="stats-list">
                      {statistics.topNodes.map((node) => (
                        <div key={node.nodeId} className="stats-item">
                          <span className="stats-label">
                            {node.shortName && node.longName 
                              ? `${node.shortName} (${node.longName})`
                              : node.shortName || node.longName || node.nodeId}
                          </span>
                          <span className="stats-count">{node.count}</span>
                        </div>
                      ))}
                      {statistics.topNodes.length === 0 && (
                        <div className="stats-item">
                          <span className="stats-label">No nodes</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="loading-message">Loading statistics...</div>
            )}
          </div>
        )}

        {/* Traffic Rate Tab */}
        {activeTab === 'traffic' && (
          <div className="traffic-tab">
            {trafficRate.length > 0 ? (
              <div className="traffic-content">
                <div className="traffic-chart">
                  <h3>Traffic Rate (Last Hour)</h3>
                  <div className="chart-placeholder">
                    {/* Simple text-based chart for now */}
                    <div className="traffic-stats">
                      <div>Current Rate: {trafficRate[0]?.messagesPerSecond.toFixed(2)} msg/s</div>
                      <div>Bandwidth: {formatSize(trafficRate[0]?.bytesPerSecond || 0)}/s</div>
                    </div>
                    
                    <div className="traffic-history">
                      {trafficRate.slice(0, 10).map((rate, index) => (
                        <div key={index} className="traffic-point">
                          <span className="traffic-time">
                            {rate.timestamp.toLocaleTimeString()}
                          </span>
                          <span className="traffic-rate">
                            {rate.messagesPerSecond.toFixed(2)} msg/s
                          </span>
                          <span className="traffic-bytes">
                            {formatSize(rate.bytesPerSecond)}/s
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="loading-message">Loading traffic data...</div>
            )}
          </div>
        )}

        {/* Message Inspector Modal */}
        {selectedMessage && (
          <div className="message-inspector-overlay">
            <div className="message-inspector">
              <div className="inspector-header">
                <h3>Message Inspector</h3>
                <button
                  onClick={() => setSelectedMessage(null)}
                  className="close-button"
                >
                  ×
                </button>
              </div>
              
              <div className="inspector-content">
                <div className="inspector-section">
                  <h4>Basic Information</h4>
                  <div className="inspector-field">
                    <label>ID:</label>
                    <span>{selectedMessage.id}</span>
                  </div>
                  <div className="inspector-field">
                    <label>Topic:</label>
                    <span>{selectedMessage.topic}</span>
                  </div>
                  <div className="inspector-field">
                    <label>Timestamp:</label>
                    <span>{formatTimestamp(selectedMessage.timestamp)}</span>
                  </div>
                  <div className="inspector-field">
                    <label>Size:</label>
                    <span>{formatSize(selectedMessage.size)}</span>
                  </div>
                  <div className="inspector-field">
                    <label>QoS:</label>
                    <span>{selectedMessage.qos}</span>
                  </div>
                  <div className="inspector-field">
                    <label>Retain:</label>
                    <span>{selectedMessage.retain ? 'Yes' : 'No'}</span>
                  </div>
                </div>

                {selectedMessage.parsed && (
                  <div className="inspector-section">
                    <h4>Parsed Data</h4>
                    <div className="inspector-field">
                      <label>Node ID:</label>
                      <span>{selectedMessage.parsed.nodeId || 'N/A'}</span>
                    </div>
                    <div className="inspector-field">
                      <label>Type:</label>
                      <span>{selectedMessage.parsed.type || 'N/A'}</span>
                    </div>
                    <div className="inspector-field">
                      <label>Encrypted:</label>
                      <span>{selectedMessage.parsed.encrypted ? 'Yes' : 'No'}</span>
                    </div>
                    <div className="inspector-field">
                      <label>Channel:</label>
                      <span>{selectedMessage.parsed.channel ?? 'N/A'}</span>
                    </div>
                    <div className="inspector-field">
                      <label>Priority:</label>
                      <span>{selectedMessage.parsed.priority || 'N/A'}</span>
                    </div>
                  </div>
                )}

                <div className="inspector-section">
                  <h4>Raw Payload</h4>
                  <pre className="payload-content">
                    {selectedMessage.payload}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};