import React, { useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import { Node } from '../../store/slices/nodeSlice';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

interface TelemetryData {
  id: string;
  nodeId: string;
  type: 'DEVICE_METRICS' | 'ENVIRONMENT_METRICS' | 'POWER_METRICS';
  timestamp: string;
  data: {
    // Device Metrics
    batteryLevel?: number;
    voltage?: number;
    channelUtilization?: number;
    airUtilTx?: number;
    uptimeSeconds?: number;
    
    // Environmental Metrics
    temperature?: number;
    humidity?: number;
    pressure?: number;
    gasResistance?: number;
    iaq?: number;
  };
}

interface TelemetryChartProps {
  node: Node;
  telemetryData: TelemetryData[];
  timeRange: string;
}

type TimeRangeOption = {
  value: string;
  label: string;
  hours: number;
};

const timeRangeOptions: TimeRangeOption[] = [
  { value: '1h', label: 'Last Hour', hours: 1 },
  { value: '6h', label: 'Last 6 Hours', hours: 6 },
  { value: '24h', label: 'Last 24 Hours', hours: 24 },
  { value: '7d', label: 'Last 7 Days', hours: 168 },
  { value: '30d', label: 'Last 30 Days', hours: 720 },
];

const TelemetryChart: React.FC<TelemetryChartProps> = ({ node, telemetryData, timeRange }) => {
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange || '24h');

  // Filter telemetry data by time range
  const filterDataByTimeRange = (data: TelemetryData[], range: string) => {
    const now = new Date();
    const rangeOption = timeRangeOptions.find(opt => opt.value === range);
    if (!rangeOption) return data;

    const cutoffTime = new Date(now.getTime() - rangeOption.hours * 60 * 60 * 1000);
    return data.filter(item => new Date(item.timestamp) >= cutoffTime);
  };

  const filteredData = filterDataByTimeRange(telemetryData, selectedTimeRange);

  // Separate device and environmental metrics
  const deviceMetrics = filteredData.filter(item => item.type === 'DEVICE_METRICS');
  const environmentalMetrics = filteredData.filter(item => item.type === 'ENVIRONMENT_METRICS');

  // Get latest values for current display
  const latestDeviceMetrics = deviceMetrics
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
  
  const latestEnvironmentalMetrics = environmentalMetrics
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

  // Chart configuration
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: false,
      },
    },
    scales: {
      x: {
        type: 'time' as const,
        time: {
          displayFormats: {
            hour: 'HH:mm',
            day: 'MMM dd',
          },
        },
      },
      y: {
        beginAtZero: true,
      },
    },
  };

  // Create chart data for device metrics
  const createDeviceChartData = (metric: string, label: string, color: string) => {
    const data = deviceMetrics
      .filter(item => item.data[metric as keyof typeof item.data] !== undefined && item.data[metric as keyof typeof item.data] !== null)
      .map(item => ({
        x: new Date(item.timestamp),
        y: item.data[metric as keyof typeof item.data] as number,
      }))
      .sort((a, b) => a.x.getTime() - b.x.getTime());

    return {
      labels: data.map(point => point.x),
      datasets: [
        {
          label,
          data,
          borderColor: color,
          backgroundColor: color + '20',
          tension: 0.1,
        },
      ],
    };
  };

  // Create chart data for environmental metrics
  const createEnvironmentalChartData = (metric: string, label: string, color: string) => {
    const data = environmentalMetrics
      .filter(item => item.data[metric as keyof typeof item.data] !== undefined && item.data[metric as keyof typeof item.data] !== null)
      .map(item => ({
        x: new Date(item.timestamp),
        y: item.data[metric as keyof typeof item.data] as number,
      }))
      .sort((a, b) => a.x.getTime() - b.x.getTime());

    return {
      labels: data.map(point => point.x),
      datasets: [
        {
          label,
          data,
          borderColor: color,
          backgroundColor: color + '20',
          tension: 0.1,
        },
      ],
    };
  };

  const hasDeviceMetrics = deviceMetrics.length > 0;
  const hasEnvironmentalMetrics = environmentalMetrics.length > 0;

  return (
    <div className="telemetry-chart-container">
      {/* Time Range Selector */}
      <div className="time-range-selector" style={{ marginBottom: '20px' }}>
        <label htmlFor="time-range-select" style={{ marginRight: '10px', fontWeight: 'bold' }}>
          Time Range:
        </label>
        <select
          id="time-range-select"
          value={selectedTimeRange}
          onChange={(e) => setSelectedTimeRange(e.target.value)}
          style={{
            padding: '5px 10px',
            borderRadius: '4px',
            border: '1px solid #ccc',
            fontSize: '14px',
          }}
        >
          {timeRangeOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Device Metrics Section */}
      {hasDeviceMetrics && (
        <div className="device-metrics-section" style={{ marginBottom: '30px' }}>
          <h3 style={{ marginBottom: '20px', color: '#333' }}>Device Metrics</h3>
          
          {/* Current Values */}
          {latestDeviceMetrics && (
            <div className="current-values" style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '15px', 
              marginBottom: '20px',
              padding: '15px',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
            }}>
              <h4 style={{ gridColumn: '1 / -1', margin: '0 0 10px 0', color: '#555' }}>Current Values</h4>
              
              {latestDeviceMetrics.data.batteryLevel !== undefined && latestDeviceMetrics.data.batteryLevel !== null && (
                <div className="metric-item">
                  <span style={{ fontWeight: 'bold', color: '#666' }}>Battery Level:</span>
                  <span style={{ marginLeft: '8px', color: '#333' }}>{latestDeviceMetrics.data.batteryLevel}%</span>
                </div>
              )}
              
              {latestDeviceMetrics.data.voltage !== undefined && latestDeviceMetrics.data.voltage !== null && (
                <div className="metric-item">
                  <span style={{ fontWeight: 'bold', color: '#666' }}>Voltage:</span>
                  <span style={{ marginLeft: '8px', color: '#333' }}>{latestDeviceMetrics.data.voltage.toFixed(2)}V</span>
                </div>
              )}
              
              {latestDeviceMetrics.data.channelUtilization !== undefined && latestDeviceMetrics.data.channelUtilization !== null && (
                <div className="metric-item">
                  <span style={{ fontWeight: 'bold', color: '#666' }}>Channel Utilization:</span>
                  <span style={{ marginLeft: '8px', color: '#333' }}>{latestDeviceMetrics.data.channelUtilization}%</span>
                </div>
              )}
              
              {latestDeviceMetrics.data.airUtilTx !== undefined && latestDeviceMetrics.data.airUtilTx !== null && (
                <div className="metric-item">
                  <span style={{ fontWeight: 'bold', color: '#666' }}>Air Utilization TX:</span>
                  <span style={{ marginLeft: '8px', color: '#333' }}>{latestDeviceMetrics.data.airUtilTx}%</span>
                </div>
              )}
              
              <div className="metric-item">
                <span style={{ fontWeight: 'bold', color: '#666' }}>Last Update:</span>
                <span style={{ marginLeft: '8px', color: '#333' }}>
                  {new Date(latestDeviceMetrics.timestamp).toLocaleString()}
                </span>
              </div>
            </div>
          )}

          {/* Historical Charts */}
          <div className="historical-charts" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
            {/* Battery Level Chart */}
            {deviceMetrics.some(item => item.data.batteryLevel !== undefined && item.data.batteryLevel !== null) && (
              <div className="chart-container" style={{ height: '300px', padding: '15px', border: '1px solid #e0e0e0', borderRadius: '8px' }}>
                <h4 style={{ marginBottom: '15px', color: '#555' }}>Battery Level (%)</h4>
                <Line 
                  data={createDeviceChartData('batteryLevel', 'Battery Level (%)', '#4caf50')} 
                  options={chartOptions} 
                />
              </div>
            )}

            {/* Channel Utilization Chart */}
            {deviceMetrics.some(item => item.data.channelUtilization !== undefined && item.data.channelUtilization !== null) && (
              <div className="chart-container" style={{ height: '300px', padding: '15px', border: '1px solid #e0e0e0', borderRadius: '8px' }}>
                <h4 style={{ marginBottom: '15px', color: '#555' }}>Channel Utilization (%)</h4>
                <Line 
                  data={createDeviceChartData('channelUtilization', 'Channel Utilization (%)', '#2196f3')} 
                  options={chartOptions} 
                />
              </div>
            )}

            {/* Air Utilization TX Chart */}
            {deviceMetrics.some(item => item.data.airUtilTx !== undefined && item.data.airUtilTx !== null) && (
              <div className="chart-container" style={{ height: '300px', padding: '15px', border: '1px solid #e0e0e0', borderRadius: '8px' }}>
                <h4 style={{ marginBottom: '15px', color: '#555' }}>Air Utilization TX (%)</h4>
                <Line 
                  data={createDeviceChartData('airUtilTx', 'Air Utilization TX (%)', '#ff9800')} 
                  options={chartOptions} 
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Environmental Metrics Section */}
      {hasEnvironmentalMetrics && (
        <div className="environmental-metrics-section">
          <h3 style={{ marginBottom: '20px', color: '#333' }}>Environmental Metrics</h3>
          
          {/* Current Values */}
          {latestEnvironmentalMetrics && (
            <div className="current-values" style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '15px', 
              marginBottom: '20px',
              padding: '15px',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
            }}>
              <h4 style={{ gridColumn: '1 / -1', margin: '0 0 10px 0', color: '#555' }}>Current Environmental Values</h4>
              
              {latestEnvironmentalMetrics.data.temperature !== undefined && latestEnvironmentalMetrics.data.temperature !== null && (
                <div className="metric-item">
                  <span style={{ fontWeight: 'bold', color: '#666' }}>Temperature:</span>
                  <span style={{ marginLeft: '8px', color: '#333' }}>{latestEnvironmentalMetrics.data.temperature.toFixed(1)}°C</span>
                </div>
              )}
              
              {latestEnvironmentalMetrics.data.humidity !== undefined && latestEnvironmentalMetrics.data.humidity !== null && (
                <div className="metric-item">
                  <span style={{ fontWeight: 'bold', color: '#666' }}>Relative Humidity:</span>
                  <span style={{ marginLeft: '8px', color: '#333' }}>{latestEnvironmentalMetrics.data.humidity.toFixed(1)}%</span>
                </div>
              )}
              
              {latestEnvironmentalMetrics.data.pressure !== undefined && latestEnvironmentalMetrics.data.pressure !== null && (
                <div className="metric-item">
                  <span style={{ fontWeight: 'bold', color: '#666' }}>Barometric Pressure:</span>
                  <span style={{ marginLeft: '8px', color: '#333' }}>{latestEnvironmentalMetrics.data.pressure.toFixed(1)} hPa</span>
                </div>
              )}
              
              <div className="metric-item">
                <span style={{ fontWeight: 'bold', color: '#666' }}>Last Update:</span>
                <span style={{ marginLeft: '8px', color: '#333' }}>
                  {new Date(latestEnvironmentalMetrics.timestamp).toLocaleString()}
                </span>
              </div>
            </div>
          )}

          {/* Historical Charts */}
          <div className="historical-charts" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
            {/* Temperature Chart */}
            {environmentalMetrics.some(item => item.data.temperature !== undefined && item.data.temperature !== null) && (
              <div className="chart-container" style={{ height: '300px', padding: '15px', border: '1px solid #e0e0e0', borderRadius: '8px' }}>
                <h4 style={{ marginBottom: '15px', color: '#555' }}>Temperature (°C)</h4>
                <Line 
                  data={createEnvironmentalChartData('temperature', 'Temperature (°C)', '#f44336')} 
                  options={chartOptions} 
                />
              </div>
            )}

            {/* Humidity Chart */}
            {environmentalMetrics.some(item => item.data.humidity !== undefined && item.data.humidity !== null) && (
              <div className="chart-container" style={{ height: '300px', padding: '15px', border: '1px solid #e0e0e0', borderRadius: '8px' }}>
                <h4 style={{ marginBottom: '15px', color: '#555' }}>Humidity (%)</h4>
                <Line 
                  data={createEnvironmentalChartData('humidity', 'Humidity (%)', '#3f51b5')} 
                  options={chartOptions} 
                />
              </div>
            )}

            {/* Pressure Chart */}
            {environmentalMetrics.some(item => item.data.pressure !== undefined && item.data.pressure !== null) && (
              <div className="chart-container" style={{ height: '300px', padding: '15px', border: '1px solid #e0e0e0', borderRadius: '8px' }}>
                <h4 style={{ marginBottom: '15px', color: '#555' }}>Barometric Pressure (hPa)</h4>
                <Line 
                  data={createEnvironmentalChartData('pressure', 'Pressure (hPa)', '#9c27b0')} 
                  options={chartOptions} 
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* No Data Message */}
      {!hasDeviceMetrics && !hasEnvironmentalMetrics && (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px', 
          color: '#666',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          border: '1px solid #e0e0e0'
        }}>
          <h3>No Telemetry Data Available</h3>
          <p>No telemetry data found for the selected time range.</p>
        </div>
      )}
    </div>
  );
};

export default TelemetryChart;