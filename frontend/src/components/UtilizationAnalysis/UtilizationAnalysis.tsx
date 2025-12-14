import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import './UtilizationAnalysis.css';

interface ChannelUtilizationStats {
  averageUtilization: number;
  peakUtilization: number;
  minimumUtilization: number;
  totalNodes: number;
  utilizationDistribution: Array<{
    range: string;
    count: number;
    percentage: number;
  }>;
}

interface UtilizationHeatmapPoint {
  latitude: number;
  longitude: number;
  utilization: number;
  nodeCount: number;
  averageChannelUtilization: number;
  averageAirUtilization: number;
}

interface UtilizationHeatmap {
  heatmapPoints: UtilizationHeatmapPoint[];
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  generatedAt: string;
}

interface CapacityPlanningReport {
  currentUtilization: {
    averageChannel: number;
    averageAir: number;
    peakChannel: number;
    peakAir: number;
  };
  recommendations: Array<{
    type: 'optimization' | 'expansion' | 'monitoring';
    priority: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    estimatedImpact: string;
  }>;
  projectedCapacity: {
    daysUntilCapacity: number;
    recommendedActions: string[];
    confidenceLevel: number;
  };
}

interface UtilizationAnalysisProps {
  networkId?: string;
  onHeatmapUpdate?: (heatmap: UtilizationHeatmap) => void;
}

const UtilizationAnalysis: React.FC<UtilizationAnalysisProps> = ({ 
  networkId, 
  onHeatmapUpdate 
}) => {
  const [channelStats, setChannelStats] = useState<ChannelUtilizationStats | null>(null);
  const [heatmap, setHeatmap] = useState<UtilizationHeatmap | null>(null);
  const [capacityReport, setCapacityReport] = useState<CapacityPlanningReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'heatmap' | 'capacity' | 'alerts'>('overview');
  const [alertThresholds, setAlertThresholds] = useState({ warning: 75, critical: 90 });
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    fetchUtilizationData();
  }, [networkId]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchUtilizationData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [statsResponse, heatmapResponse, capacityResponse] = await Promise.all([
        apiService.getChannelUtilizationStats(networkId),
        apiService.getUtilizationHeatmap(networkId),
        apiService.getCapacityPlanningReport(networkId)
      ]);

      setChannelStats(statsResponse.data);
      setHeatmap(heatmapResponse.data);
      setCapacityReport(capacityResponse.data);

      // Notify parent component about heatmap update
      if (onHeatmapUpdate && heatmapResponse.data) {
        onHeatmapUpdate(heatmapResponse.data);
      }
    } catch (err) {
      console.error('Failed to fetch utilization data:', err);
      setError('Failed to load utilization analysis. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const checkAlerts = async () => {
    try {
      const response = await apiService.checkUtilizationThresholds(alertThresholds);
      setAlerts(response.data.alerts || []);
    } catch (err) {
      console.error('Failed to check alerts:', err);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return '#dc3545';
      case 'high': return '#fd7e14';
      case 'medium': return '#ffc107';
      case 'low': return '#28a745';
      default: return '#6c757d';
    }
  };

  const getUtilizationColor = (utilization: number) => {
    if (utilization >= 90) return '#dc3545'; // Critical - Red
    if (utilization >= 75) return '#fd7e14'; // High - Orange
    if (utilization >= 50) return '#ffc107'; // Medium - Yellow
    if (utilization >= 25) return '#28a745'; // Good - Green
    return '#17a2b8'; // Low - Blue
  };

  if (loading) {
    return (
      <div className="utilization-analysis-container">
        <div className="loading">Loading utilization analysis...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="utilization-analysis-container">
        <div className="error">
          {error}
          <button onClick={fetchUtilizationData} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="utilization-analysis-container">
      <div className="utilization-header">
        <h2>Network Utilization Analysis</h2>
        <button onClick={fetchUtilizationData} className="refresh-button">
          Refresh
        </button>
      </div>

      <div className="utilization-tabs">
        <button 
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={`tab ${activeTab === 'heatmap' ? 'active' : ''}`}
          onClick={() => setActiveTab('heatmap')}
        >
          Heatmap
        </button>
        <button 
          className={`tab ${activeTab === 'capacity' ? 'active' : ''}`}
          onClick={() => setActiveTab('capacity')}
        >
          Capacity Planning
        </button>
        <button 
          className={`tab ${activeTab === 'alerts' ? 'active' : ''}`}
          onClick={() => setActiveTab('alerts')}
        >
          Alerts
        </button>
      </div>

      <div className="utilization-content">
        {activeTab === 'overview' && channelStats && (
          <div className="overview-tab">
            <div className="stats-grid">
              <div className="stat-card">
                <h3>Average Utilization</h3>
                <div 
                  className="stat-value"
                  style={{ color: getUtilizationColor(channelStats.averageUtilization) }}
                >
                  {channelStats.averageUtilization.toFixed(1)}%
                </div>
              </div>
              <div className="stat-card">
                <h3>Peak Utilization</h3>
                <div 
                  className="stat-value"
                  style={{ color: getUtilizationColor(channelStats.peakUtilization) }}
                >
                  {channelStats.peakUtilization.toFixed(1)}%
                </div>
              </div>
              <div className="stat-card">
                <h3>Minimum Utilization</h3>
                <div className="stat-value">
                  {channelStats.minimumUtilization.toFixed(1)}%
                </div>
              </div>
              <div className="stat-card">
                <h3>Total Nodes</h3>
                <div className="stat-value">{channelStats.totalNodes}</div>
              </div>
            </div>

            <div className="utilization-distribution">
              <h3>Utilization Distribution</h3>
              <div className="distribution-chart">
                {channelStats.utilizationDistribution.map((item, index) => (
                  <div key={index} className="distribution-bar">
                    <div className="bar-label">{item.range}</div>
                    <div className="bar-container">
                      <div 
                        className="bar-fill"
                        style={{ 
                          width: `${item.percentage}%`,
                          backgroundColor: getUtilizationColor(index * 20 + 10)
                        }}
                      />
                    </div>
                    <div className="bar-stats">
                      <span className="count">{item.count} nodes</span>
                      <span className="percentage">({item.percentage.toFixed(1)}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'heatmap' && heatmap && (
          <div className="heatmap-tab">
            <div className="heatmap-info">
              <h3>Utilization Heatmap</h3>
              <p>Geographic distribution of network utilization</p>
              <div className="heatmap-stats">
                <div className="stat">
                  <span className="label">Heatmap Points:</span>
                  <span className="value">{heatmap.heatmapPoints.length}</span>
                </div>
                <div className="stat">
                  <span className="label">Generated:</span>
                  <span className="value">
                    {new Date(heatmap.generatedAt).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="heatmap-legend">
              <h4>Utilization Levels</h4>
              <div className="legend-items">
                <div className="legend-item">
                  <div className="legend-color" style={{ backgroundColor: '#17a2b8' }}></div>
                  <span>0-25% (Low)</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color" style={{ backgroundColor: '#28a745' }}></div>
                  <span>25-50% (Good)</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color" style={{ backgroundColor: '#ffc107' }}></div>
                  <span>50-75% (Medium)</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color" style={{ backgroundColor: '#fd7e14' }}></div>
                  <span>75-90% (High)</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color" style={{ backgroundColor: '#dc3545' }}></div>
                  <span>90%+ (Critical)</span>
                </div>
              </div>
            </div>

            <div className="heatmap-points-list">
              <h4>High Utilization Areas</h4>
              {heatmap.heatmapPoints
                .filter(point => point.utilization > 50)
                .sort((a, b) => b.utilization - a.utilization)
                .slice(0, 10)
                .map((point, index) => (
                  <div key={index} className="heatmap-point">
                    <div className="point-location">
                      {point.latitude.toFixed(4)}, {point.longitude.toFixed(4)}
                    </div>
                    <div className="point-stats">
                      <span 
                        className="utilization"
                        style={{ color: getUtilizationColor(point.utilization) }}
                      >
                        {point.utilization.toFixed(1)}%
                      </span>
                      <span className="node-count">{point.nodeCount} nodes</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {activeTab === 'capacity' && capacityReport && (
          <div className="capacity-tab">
            <div className="current-utilization">
              <h3>Current Utilization</h3>
              <div className="utilization-metrics">
                <div className="metric">
                  <span className="label">Average Channel:</span>
                  <span 
                    className="value"
                    style={{ color: getUtilizationColor(capacityReport.currentUtilization.averageChannel) }}
                  >
                    {capacityReport.currentUtilization.averageChannel.toFixed(1)}%
                  </span>
                </div>
                <div className="metric">
                  <span className="label">Peak Channel:</span>
                  <span 
                    className="value"
                    style={{ color: getUtilizationColor(capacityReport.currentUtilization.peakChannel) }}
                  >
                    {capacityReport.currentUtilization.peakChannel.toFixed(1)}%
                  </span>
                </div>
                <div className="metric">
                  <span className="label">Average Air:</span>
                  <span 
                    className="value"
                    style={{ color: getUtilizationColor(capacityReport.currentUtilization.averageAir) }}
                  >
                    {capacityReport.currentUtilization.averageAir.toFixed(1)}%
                  </span>
                </div>
                <div className="metric">
                  <span className="label">Peak Air:</span>
                  <span 
                    className="value"
                    style={{ color: getUtilizationColor(capacityReport.currentUtilization.peakAir) }}
                  >
                    {capacityReport.currentUtilization.peakAir.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            <div className="capacity-projection">
              <h3>Capacity Projection</h3>
              <div className="projection-stats">
                <div className="stat">
                  <span className="label">Days Until Capacity:</span>
                  <span className="value">
                    {capacityReport.projectedCapacity.daysUntilCapacity > 0 
                      ? `${capacityReport.projectedCapacity.daysUntilCapacity} days`
                      : 'No capacity issues detected'
                    }
                  </span>
                </div>
                <div className="stat">
                  <span className="label">Confidence Level:</span>
                  <span className="value">
                    {(capacityReport.projectedCapacity.confidenceLevel * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>

            <div className="recommendations">
              <h3>Recommendations</h3>
              <div className="recommendation-list">
                {capacityReport.recommendations.map((rec, index) => (
                  <div key={index} className="recommendation-item">
                    <div 
                      className="priority-indicator"
                      style={{ backgroundColor: getPriorityColor(rec.priority) }}
                    />
                    <div className="recommendation-content">
                      <div className="recommendation-header">
                        <span className="type">{rec.type}</span>
                        <span className="priority">{rec.priority}</span>
                      </div>
                      <div className="description">{rec.description}</div>
                      <div className="impact">Impact: {rec.estimatedImpact}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="recommended-actions">
              <h3>Recommended Actions</h3>
              <ul className="action-list">
                {capacityReport.projectedCapacity.recommendedActions.map((action, index) => (
                  <li key={index} className="action-item">{action}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'alerts' && (
          <div className="alerts-tab">
            <div className="alert-configuration">
              <h3>Alert Thresholds</h3>
              <div className="threshold-controls">
                <div className="threshold-input">
                  <label>Warning Threshold:</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={alertThresholds.warning}
                    onChange={(e) => setAlertThresholds({
                      ...alertThresholds,
                      warning: parseInt(e.target.value)
                    })}
                  />
                  <span>%</span>
                </div>
                <div className="threshold-input">
                  <label>Critical Threshold:</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={alertThresholds.critical}
                    onChange={(e) => setAlertThresholds({
                      ...alertThresholds,
                      critical: parseInt(e.target.value)
                    })}
                  />
                  <span>%</span>
                </div>
                <button onClick={checkAlerts} className="check-alerts-button">
                  Check Alerts
                </button>
              </div>
            </div>

            <div className="active-alerts">
              <h3>Active Alerts ({alerts.length})</h3>
              {alerts.length === 0 ? (
                <div className="no-alerts">No active alerts</div>
              ) : (
                <div className="alert-list">
                  {alerts.map((alert, index) => (
                    <div key={index} className={`alert-item ${alert.severity}`}>
                      <div className="alert-header">
                        <span className="node-id">{alert.shortName || alert.nodeId}</span>
                        <span className="severity">{alert.severity}</span>
                        <span className="utilization">
                          {alert.currentUtilization.toFixed(1)}%
                        </span>
                      </div>
                      <div className="alert-description">{alert.description}</div>
                      <div className="alert-timestamp">
                        {new Date(alert.timestamp).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UtilizationAnalysis;