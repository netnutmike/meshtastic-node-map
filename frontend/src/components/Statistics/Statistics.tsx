import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import './Statistics.css';

interface NetworkStatistics {
  overview: {
    totalNodes: number;
    onlineNodes: number;
    offlineNodes: number;
    mqttConnectedNodes: number;
    totalMessages: number;
    totalNetworks: number;
    lastUpdated: string;
  };
  nodeBreakdown: {
    byRole: Record<string, number>;
    byHardware: Record<string, number>;
    byFirmware: Record<string, number>;
    byStatus: {
      online: number;
      offline: number;
      mqttConnected: number;
      mqttDisconnected: number;
    };
  };
  messageBreakdown: {
    byType: Record<string, number>;
    byPriority: Record<string, number>;
    byEncryption: {
      encrypted: number;
      unencrypted: number;
    };
    byRouting: {
      directMessages: number;
      routedMessages: number;
      averageHops: number;
    };
  };
  networkUtilization: {
    totalChannelUtilization: number;
    averageChannelUtilization: number;
    totalAirUtilization: number;
    averageAirUtilization: number;
    messagesPerHour: number;
    messagesPerDay: number;
  };
  timeRangeStats: {
    last24Hours: {
      newNodes: number;
      totalMessages: number;
      uniqueActiveNodes: number;
    };
    last7Days: {
      newNodes: number;
      totalMessages: number;
      uniqueActiveNodes: number;
    };
    last30Days: {
      newNodes: number;
      totalMessages: number;
      uniqueActiveNodes: number;
    };
  };
}

interface NodeTypeDistribution {
  role: string;
  count: number;
  percentage: number;
  averageBattery?: number;
  averageChannelUtilization?: number;
}

interface StatisticsProps {
  networkId?: string;
}

const Statistics: React.FC<StatisticsProps> = ({ networkId }) => {
  const [statistics, setStatistics] = useState<NetworkStatistics | null>(null);
  const [nodeDistribution, setNodeDistribution] = useState<NodeTypeDistribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'nodes' | 'messages' | 'utilization'>('overview');

  useEffect(() => {
    fetchStatistics();
  }, [networkId]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      setError(null);

      const [statsResponse, distributionResponse] = await Promise.all([
        apiService.getNetworkStatistics({ networkId }),
        apiService.getNodeTypeDistribution(networkId)
      ]);

      setStatistics(statsResponse.data);
      setNodeDistribution(distributionResponse.data);
    } catch (err) {
      console.error('Failed to fetch statistics:', err);
      setError('Failed to load statistics. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'csv' | 'json' | 'pdf', type: 'network' | 'messages' | 'utilization') => {
    try {
      const blob = await apiService.exportStatistics(format, type, networkId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}-statistics-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Export failed. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="statistics-container">
        <div className="loading">Loading statistics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="statistics-container">
        <div className="error">
          {error}
          <button onClick={fetchStatistics} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!statistics) {
    return (
      <div className="statistics-container">
        <div className="no-data">No statistics available</div>
      </div>
    );
  }

  return (
    <div className="statistics-container">
      <div className="statistics-header">
        <h2>Network Statistics</h2>
        <div className="export-buttons">
          <button onClick={() => handleExport('json', 'network')} className="export-button">
            Export JSON
          </button>
          <button onClick={() => handleExport('csv', 'network')} className="export-button">
            Export CSV
          </button>
        </div>
      </div>

      <div className="statistics-tabs">
        <button 
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={`tab ${activeTab === 'nodes' ? 'active' : ''}`}
          onClick={() => setActiveTab('nodes')}
        >
          Nodes
        </button>
        <button 
          className={`tab ${activeTab === 'messages' ? 'active' : ''}`}
          onClick={() => setActiveTab('messages')}
        >
          Messages
        </button>
        <button 
          className={`tab ${activeTab === 'utilization' ? 'active' : ''}`}
          onClick={() => setActiveTab('utilization')}
        >
          Utilization
        </button>
      </div>

      <div className="statistics-content">
        {activeTab === 'overview' && (
          <div className="overview-tab">
            <div className="stats-grid">
              <div className="stat-card">
                <h3>Total Nodes</h3>
                <div className="stat-value">{statistics.overview.totalNodes}</div>
              </div>
              <div className="stat-card">
                <h3>Online Nodes</h3>
                <div className="stat-value">{statistics.overview.onlineNodes}</div>
                <div className="stat-percentage">
                  {((statistics.overview.onlineNodes / statistics.overview.totalNodes) * 100).toFixed(1)}%
                </div>
              </div>
              <div className="stat-card">
                <h3>MQTT Connected</h3>
                <div className="stat-value">{statistics.overview.mqttConnectedNodes}</div>
                <div className="stat-percentage">
                  {((statistics.overview.mqttConnectedNodes / statistics.overview.totalNodes) * 100).toFixed(1)}%
                </div>
              </div>
              <div className="stat-card">
                <h3>Total Messages</h3>
                <div className="stat-value">{statistics.overview.totalMessages.toLocaleString()}</div>
              </div>
            </div>

            <div className="time-range-stats">
              <h3>Activity Summary</h3>
              <div className="time-stats-grid">
                <div className="time-stat">
                  <h4>Last 24 Hours</h4>
                  <p>New Nodes: {statistics.timeRangeStats.last24Hours.newNodes}</p>
                  <p>Messages: {statistics.timeRangeStats.last24Hours.totalMessages}</p>
                  <p>Active Nodes: {statistics.timeRangeStats.last24Hours.uniqueActiveNodes}</p>
                </div>
                <div className="time-stat">
                  <h4>Last 7 Days</h4>
                  <p>New Nodes: {statistics.timeRangeStats.last7Days.newNodes}</p>
                  <p>Messages: {statistics.timeRangeStats.last7Days.totalMessages}</p>
                  <p>Active Nodes: {statistics.timeRangeStats.last7Days.uniqueActiveNodes}</p>
                </div>
                <div className="time-stat">
                  <h4>Last 30 Days</h4>
                  <p>New Nodes: {statistics.timeRangeStats.last30Days.newNodes}</p>
                  <p>Messages: {statistics.timeRangeStats.last30Days.totalMessages}</p>
                  <p>Active Nodes: {statistics.timeRangeStats.last30Days.uniqueActiveNodes}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'nodes' && (
          <div className="nodes-tab">
            <div className="node-breakdown">
              <h3>Node Distribution by Role</h3>
              <div className="distribution-list">
                {nodeDistribution.map((item) => (
                  <div key={item.role} className="distribution-item">
                    <div className="role-name">{item.role}</div>
                    <div className="role-stats">
                      <span className="count">{item.count} nodes</span>
                      <span className="percentage">({item.percentage.toFixed(1)}%)</span>
                      {item.averageBattery && (
                        <span className="battery">Avg Battery: {item.averageBattery.toFixed(1)}%</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="hardware-breakdown">
              <h3>Hardware Distribution</h3>
              <div className="breakdown-list">
                {Object.entries(statistics.nodeBreakdown.byHardware).map(([hardware, count]) => (
                  <div key={hardware} className="breakdown-item">
                    <span className="label">{hardware}</span>
                    <span className="value">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="firmware-breakdown">
              <h3>Firmware Distribution</h3>
              <div className="breakdown-list">
                {Object.entries(statistics.nodeBreakdown.byFirmware).map(([firmware, count]) => (
                  <div key={firmware} className="breakdown-item">
                    <span className="label">{firmware}</span>
                    <span className="value">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'messages' && (
          <div className="messages-tab">
            <div className="message-breakdown">
              <h3>Message Types</h3>
              <div className="breakdown-list">
                {Object.entries(statistics.messageBreakdown.byType).map(([type, count]) => (
                  <div key={type} className="breakdown-item">
                    <span className="label">{type}</span>
                    <span className="value">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="encryption-breakdown">
              <h3>Encryption Status</h3>
              <div className="encryption-stats">
                <div className="encryption-item">
                  <span className="label">Encrypted</span>
                  <span className="value">{statistics.messageBreakdown.byEncryption.encrypted}</span>
                  <span className="percentage">
                    ({((statistics.messageBreakdown.byEncryption.encrypted / statistics.overview.totalMessages) * 100).toFixed(1)}%)
                  </span>
                </div>
                <div className="encryption-item">
                  <span className="label">Unencrypted</span>
                  <span className="value">{statistics.messageBreakdown.byEncryption.unencrypted}</span>
                  <span className="percentage">
                    ({((statistics.messageBreakdown.byEncryption.unencrypted / statistics.overview.totalMessages) * 100).toFixed(1)}%)
                  </span>
                </div>
              </div>
            </div>

            <div className="routing-breakdown">
              <h3>Routing Analysis</h3>
              <div className="routing-stats">
                <p>Direct Messages: {statistics.messageBreakdown.byRouting.directMessages}</p>
                <p>Routed Messages: {statistics.messageBreakdown.byRouting.routedMessages}</p>
                <p>Average Hops: {statistics.messageBreakdown.byRouting.averageHops.toFixed(2)}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'utilization' && (
          <div className="utilization-tab">
            <div className="utilization-stats">
              <h3>Network Utilization</h3>
              <div className="utilization-grid">
                <div className="utilization-item">
                  <span className="label">Average Channel Utilization</span>
                  <span className="value">{statistics.networkUtilization.averageChannelUtilization.toFixed(1)}%</span>
                </div>
                <div className="utilization-item">
                  <span className="label">Average Air Utilization</span>
                  <span className="value">{statistics.networkUtilization.averageAirUtilization.toFixed(1)}%</span>
                </div>
                <div className="utilization-item">
                  <span className="label">Messages per Hour</span>
                  <span className="value">{statistics.networkUtilization.messagesPerHour}</span>
                </div>
                <div className="utilization-item">
                  <span className="label">Messages per Day</span>
                  <span className="value">{statistics.networkUtilization.messagesPerDay}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="statistics-footer">
        <p>Last updated: {new Date(statistics.overview.lastUpdated).toLocaleString()}</p>
        <button onClick={fetchStatistics} className="refresh-button">
          Refresh
        </button>
      </div>
    </div>
  );
};

export default Statistics;