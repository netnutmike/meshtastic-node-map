/**
 * RF Link Analysis Component
 * Displays distance vs signal quality scatter plots for RF links
 * Requirements: 39.15
 */

import React, { useEffect, useState, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import { apiService } from '../../services/api';
import {
  generateScatterPlotData,
  generateDistanceVsRSSIChart,
  generateDistanceVsSNRChart,
} from '../../utils/distanceCalculation';
import './RFLinkAnalysis.css';

Chart.register(...registerables);

interface RFLink {
  from_node_id: string;
  to_node_id: string;
  link_type: 'traceroute' | 'packet';
  packet_count: number;
  avg_rssi: number;
  avg_snr: number;
  last_seen: Date;
  success_rate: number;
  is_bidirectional: boolean;
}

const RFLinkAnalysis: React.FC = () => {
  const [links, setLinks] = useState<RFLink[]>([]);
  const [nodes, setNodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const rssiChartRef = useRef<HTMLCanvasElement>(null);
  const snrChartRef = useRef<HTMLCanvasElement>(null);
  const rssiChartInstance = useRef<Chart | null>(null);
  const snrChartInstance = useRef<Chart | null>(null);

  // Fetch RF links and nodes
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch RF links
        const linksResponse = await apiService.getRFLinks({ hours: 24 });
        
        // Fetch nodes
        const nodesResponse = await apiService.getNodes();

        if (linksResponse.data && nodesResponse.data) {
          setLinks(linksResponse.data.all_links);
          setNodes(nodesResponse.data);
        }
      } catch (err) {
        console.error('Failed to fetch RF link data:', err);
        setError('Failed to load RF link analysis data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Update charts when data changes
  useEffect(() => {
    if (links.length === 0 || nodes.length === 0) {
      return;
    }

    // Generate scatter plot data
    const scatterData = generateScatterPlotData(links, nodes);

    if (scatterData.length === 0) {
      return;
    }

    // Create RSSI chart
    if (rssiChartRef.current) {
      // Destroy existing chart
      if (rssiChartInstance.current) {
        rssiChartInstance.current.destroy();
      }

      const rssiConfig = generateDistanceVsRSSIChart(scatterData);
      rssiChartInstance.current = new Chart(rssiChartRef.current, rssiConfig as any);
    }

    // Create SNR chart
    if (snrChartRef.current) {
      // Destroy existing chart
      if (snrChartInstance.current) {
        snrChartInstance.current.destroy();
      }

      const snrConfig = generateDistanceVsSNRChart(scatterData);
      snrChartInstance.current = new Chart(snrChartRef.current, snrConfig as any);
    }

    // Cleanup function
    return () => {
      if (rssiChartInstance.current) {
        rssiChartInstance.current.destroy();
      }
      if (snrChartInstance.current) {
        snrChartInstance.current.destroy();
      }
    };
  }, [links, nodes]);

  // Update charts on theme change
  useEffect(() => {
    const handleThemeChange = () => {
      // Trigger chart re-render by updating data
      if (rssiChartInstance.current) {
        rssiChartInstance.current.update();
      }
      if (snrChartInstance.current) {
        snrChartInstance.current.update();
      }
    };

    window.addEventListener('themeChanged', handleThemeChange);
    return () => window.removeEventListener('themeChanged', handleThemeChange);
  }, []);

  if (loading) {
    return (
      <div className="rf-link-analysis">
        <div className="loading-spinner">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p>Loading RF link analysis...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rf-link-analysis">
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      </div>
    );
  }

  if (links.length === 0) {
    return (
      <div className="rf-link-analysis">
        <div className="alert alert-info" role="alert">
          No RF link data available. Enable RF links on the map to collect data.
        </div>
      </div>
    );
  }

  return (
    <div className="rf-link-analysis">
      <h3>RF Link Analysis</h3>
      <p className="text-muted">
        Analyzing {links.length} RF links from the last 24 hours
      </p>

      <div className="charts-container">
        <div className="chart-wrapper">
          <canvas ref={rssiChartRef} />
        </div>

        <div className="chart-wrapper">
          <canvas ref={snrChartRef} />
        </div>
      </div>

      <div className="analysis-info">
        <h5>About This Analysis</h5>
        <p>
          These scatter plots show the relationship between distance and signal quality
          for RF links in your mesh network. Generally, signal strength (RSSI) and
          signal-to-noise ratio (SNR) decrease as distance increases, but terrain,
          obstacles, and antenna configuration can significantly affect performance.
        </p>
        <ul>
          <li>
            <strong>RSSI (Received Signal Strength Indicator):</strong> Measured in dBm,
            higher values (closer to 0) indicate stronger signals. Typical range: -30 dBm
            (excellent) to -120 dBm (very weak).
          </li>
          <li>
            <strong>SNR (Signal-to-Noise Ratio):</strong> Measured in dB, higher values
            indicate cleaner signals with less interference. Values above 5 dB are
            generally good for LoRa communication.
          </li>
        </ul>
      </div>
    </div>
  );
};

export default RFLinkAnalysis;
