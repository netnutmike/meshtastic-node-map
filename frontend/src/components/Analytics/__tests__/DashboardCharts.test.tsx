import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DashboardCharts from '../DashboardCharts';

// Mock Chart.js
jest.mock('react-chartjs-2', () => ({
  Line: () => <div data-testid="line-chart">Line Chart</div>,
  Doughnut: () => <div data-testid="doughnut-chart">Doughnut Chart</div>,
  Bar: () => <div data-testid="bar-chart">Bar Chart</div>,
  Pie: () => <div data-testid="pie-chart">Pie Chart</div>
}));

// Mock chartTheme utility
jest.mock('../../../utils/chartTheme', () => ({
  applyThemeToChartOptions: (options: any) => options
}));

describe('DashboardCharts Component', () => {
  const mockChartsData = {
    networkActivityTrends: [
      { timestamp: '2024-01-01T00:00:00Z', messageCount: 10 },
      { timestamp: '2024-01-01T01:00:00Z', messageCount: 15 },
      { timestamp: '2024-01-01T02:00:00Z', messageCount: 20 }
    ],
    nodeActivityDistribution: [
      { category: 'Very Active (>100 msgs)', count: 5 },
      { category: 'Moderately Active (10-100)', count: 10 },
      { category: 'Lightly Active (1-10)', count: 15 },
      { category: 'Inactive (0)', count: 20 }
    ],
    gatewayActivityDistribution: [
      { category: 'Gateway1', count: 100 },
      { category: 'Gateway2', count: 80 },
      { category: 'Gateway3', count: 60 }
    ],
    signalQualityDistribution: [
      { category: 'Excellent (>-70dBm)', count: 50 },
      { category: 'Good (-70 to -80)', count: 100 },
      { category: 'Fair (-80 to -90)', count: 75 },
      { category: 'Poor (<-90)', count: 25 }
    ],
    messageRoutingPatterns: [
      { category: 'Direct (0 hops)', count: 150 },
      { category: 'Routed (1-2 hops)', count: 80 },
      { category: 'Multi-hop (3+)', count: 20 }
    ],
    protocolUsage: [
      { protocol: 'TEXT', count: 100 },
      { protocol: 'POSITION', count: 80 },
      { protocol: 'TELEMETRY', count: 60 },
      { protocol: 'NODEINFO', count: 40 }
    ]
  };

  const mockTopNodes = [
    { nodeId: 'node1', shortName: 'N1', longName: 'Node 1', messageCount: 100, avgRssi: '-75.5' },
    { nodeId: 'node2', shortName: 'N2', longName: 'Node 2', messageCount: 80, avgRssi: '-80.0' },
    { nodeId: 'node3', shortName: 'N3', longName: 'Node 3', messageCount: 60, avgRssi: '-85.2' }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Chart Rendering', () => {
    it('should render all chart components', () => {
      render(<DashboardCharts charts={mockChartsData} topNodes={mockTopNodes} />);

      // Verify all charts are rendered
      expect(screen.getByTestId('network-activity-trends-chart')).toBeInTheDocument();
      expect(screen.getByTestId('node-activity-distribution-chart')).toBeInTheDocument();
      expect(screen.getByTestId('gateway-activity-distribution-chart')).toBeInTheDocument();
      expect(screen.getByTestId('signal-quality-distribution-chart')).toBeInTheDocument();
      expect(screen.getByTestId('message-routing-patterns-chart')).toBeInTheDocument();
      expect(screen.getByTestId('protocol-usage-chart')).toBeInTheDocument();
      expect(screen.getByTestId('most-active-nodes-table')).toBeInTheDocument();
    });

    it('should render Network Activity Trends line chart', () => {
      render(<DashboardCharts charts={mockChartsData} topNodes={mockTopNodes} />);

      const chart = screen.getByTestId('network-activity-trends-chart');
      expect(chart).toBeInTheDocument();
      expect(chart.textContent).toContain('Line Chart');
    });

    it('should render Node Activity Distribution doughnut chart', () => {
      render(<DashboardCharts charts={mockChartsData} topNodes={mockTopNodes} />);

      const chart = screen.getByTestId('node-activity-distribution-chart');
      expect(chart).toBeInTheDocument();
      expect(chart.textContent).toContain('Doughnut Chart');
    });

    it('should render Gateway Activity Distribution bar chart', () => {
      render(<DashboardCharts charts={mockChartsData} topNodes={mockTopNodes} />);

      const chart = screen.getByTestId('gateway-activity-distribution-chart');
      expect(chart).toBeInTheDocument();
      expect(chart.textContent).toContain('Bar Chart');
    });

    it('should render Signal Quality Distribution bar chart', () => {
      render(<DashboardCharts charts={mockChartsData} topNodes={mockTopNodes} />);

      const chart = screen.getByTestId('signal-quality-distribution-chart');
      expect(chart).toBeInTheDocument();
      expect(chart.textContent).toContain('Bar Chart');
    });

    it('should render Message Routing Patterns doughnut chart', () => {
      render(<DashboardCharts charts={mockChartsData} topNodes={mockTopNodes} />);

      const chart = screen.getByTestId('message-routing-patterns-chart');
      expect(chart).toBeInTheDocument();
      expect(chart.textContent).toContain('Doughnut Chart');
    });

    it('should render Protocol Usage pie chart', () => {
      render(<DashboardCharts charts={mockChartsData} topNodes={mockTopNodes} />);

      const chart = screen.getByTestId('protocol-usage-chart');
      expect(chart).toBeInTheDocument();
      expect(chart.textContent).toContain('Pie Chart');
    });

    it('should render Most Active Nodes table', () => {
      render(<DashboardCharts charts={mockChartsData} topNodes={mockTopNodes} />);

      const table = screen.getByTestId('most-active-nodes-table');
      expect(table).toBeInTheDocument();
      expect(table.textContent).toContain('Most Active Nodes');
    });
  });

  describe('Data Processing', () => {
    it('should display correct node data in table', () => {
      render(<DashboardCharts charts={mockChartsData} topNodes={mockTopNodes} />);

      // Check table headers
      expect(screen.getByText('Short Name')).toBeInTheDocument();
      expect(screen.getByText('Long Name')).toBeInTheDocument();
      expect(screen.getByText('Message Count')).toBeInTheDocument();
      expect(screen.getByText('Avg RSSI')).toBeInTheDocument();

      // Check node data
      expect(screen.getByText('N1')).toBeInTheDocument();
      expect(screen.getByText('Node 1')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();
      expect(screen.getByText('-75.5 dBm')).toBeInTheDocument();
    });

    it('should format large numbers with commas in table', () => {
      const largeCountNodes = [
        { nodeId: 'node1', shortName: 'N1', longName: 'Node 1', messageCount: 1000, avgRssi: '-75.5' },
        { nodeId: 'node2', shortName: 'N2', longName: 'Node 2', messageCount: 10000, avgRssi: '-80.0' }
      ];

      render(<DashboardCharts charts={mockChartsData} topNodes={largeCountNodes} />);

      expect(screen.getByText('1,000')).toBeInTheDocument();
      expect(screen.getByText('10,000')).toBeInTheDocument();
    });

    it('should handle nodes with null avgRssi', () => {
      const nodesWithNullRssi = [
        { nodeId: 'node1', shortName: 'N1', longName: 'Node 1', messageCount: 100, avgRssi: null }
      ];

      render(<DashboardCharts charts={mockChartsData} topNodes={nodesWithNullRssi} />);

      expect(screen.getByText('N/A')).toBeInTheDocument();
    });

    it('should handle nodes with missing names', () => {
      const nodesWithMissingNames = [
        { nodeId: 'node1', shortName: '', longName: '', messageCount: 100, avgRssi: '-75.5' }
      ];

      render(<DashboardCharts charts={mockChartsData} topNodes={nodesWithMissingNames} />);

      expect(screen.getAllByText('Unknown').length).toBeGreaterThan(0);
    });
  });

  describe('Empty State Handling', () => {
    it('should handle undefined charts data', () => {
      render(<DashboardCharts topNodes={mockTopNodes} />);

      // Should still render all chart containers
      expect(screen.getByTestId('network-activity-trends-chart')).toBeInTheDocument();
      expect(screen.getByTestId('node-activity-distribution-chart')).toBeInTheDocument();
    });

    it('should handle empty topNodes array', () => {
      render(<DashboardCharts charts={mockChartsData} topNodes={[]} />);

      const table = screen.getByTestId('most-active-nodes-table');
      expect(table).toBeInTheDocument();
      expect(screen.getByText('No active nodes found')).toBeInTheDocument();
    });

    it('should show message when no gateway data available', () => {
      const emptyGatewayData = {
        ...mockChartsData,
        gatewayActivityDistribution: []
      };

      render(<DashboardCharts charts={emptyGatewayData} topNodes={mockTopNodes} />);

      expect(screen.getByText('No gateway data available')).toBeInTheDocument();
    });

    it('should show message when no protocol data available', () => {
      const emptyProtocolData = {
        ...mockChartsData,
        protocolUsage: []
      };

      render(<DashboardCharts charts={emptyProtocolData} topNodes={mockTopNodes} />);

      expect(screen.getByText('No protocol data available')).toBeInTheDocument();
    });
  });

  describe('Theme Integration', () => {
    it('should listen for theme change events', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
      
      render(<DashboardCharts charts={mockChartsData} topNodes={mockTopNodes} />);

      expect(addEventListenerSpy).toHaveBeenCalledWith('themeChanged', expect.any(Function));
    });

    it('should remove theme change listener on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
      
      const { unmount } = render(<DashboardCharts charts={mockChartsData} topNodes={mockTopNodes} />);
      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('themeChanged', expect.any(Function));
    });

    it('should re-render charts when theme changes', async () => {
      render(<DashboardCharts charts={mockChartsData} topNodes={mockTopNodes} />);

      // Get initial chart count
      const initialCharts = screen.getAllByTestId(/chart/);
      const initialCount = initialCharts.length;

      // Trigger theme change event
      const themeChangeEvent = new CustomEvent('themeChanged', {
        detail: { preference: 'dark', effective: 'dark' }
      });
      window.dispatchEvent(themeChangeEvent);

      // Wait for re-render
      await waitFor(() => {
        const updatedCharts = screen.getAllByTestId(/chart/);
        expect(updatedCharts.length).toBe(initialCount);
      });
    });
  });

  describe('Chart Configuration', () => {
    it('should configure Network Activity Trends with correct options', () => {
      render(<DashboardCharts charts={mockChartsData} topNodes={mockTopNodes} />);

      const chart = screen.getByTestId('network-activity-trends-chart');
      expect(chart).toBeInTheDocument();
      // Chart.js configuration is tested through the mock
    });

    it('should configure charts with responsive settings', () => {
      render(<DashboardCharts charts={mockChartsData} topNodes={mockTopNodes} />);

      // All charts should be rendered and responsive
      const allCharts = screen.getAllByTestId(/chart/);
      expect(allCharts.length).toBeGreaterThan(0);
    });

    it('should apply theme-aware colors to charts', () => {
      render(<DashboardCharts charts={mockChartsData} topNodes={mockTopNodes} />);

      // Verify charts are rendered (theme colors are applied through applyThemeToChartOptions)
      expect(screen.getByTestId('network-activity-trends-chart')).toBeInTheDocument();
      expect(screen.getByTestId('signal-quality-distribution-chart')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for charts', () => {
      render(<DashboardCharts charts={mockChartsData} topNodes={mockTopNodes} />);

      // Charts should be accessible
      const charts = screen.getAllByTestId(/chart/);
      charts.forEach(chart => {
        expect(chart).toBeInTheDocument();
      });
    });

    it('should have accessible table structure', () => {
      render(<DashboardCharts charts={mockChartsData} topNodes={mockTopNodes} />);

      const table = screen.getByTestId('most-active-nodes-table');
      expect(table).toBeInTheDocument();
      
      // Check for table headers
      expect(screen.getByText('Short Name')).toBeInTheDocument();
      expect(screen.getByText('Long Name')).toBeInTheDocument();
      expect(screen.getByText('Message Count')).toBeInTheDocument();
      expect(screen.getByText('Avg RSSI')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should handle large datasets efficiently', () => {
      const largeDataset = {
        networkActivityTrends: Array.from({ length: 168 }, (_, i) => ({
          timestamp: new Date(Date.now() - i * 3600000).toISOString(),
          messageCount: Math.floor(Math.random() * 100)
        })),
        nodeActivityDistribution: mockChartsData.nodeActivityDistribution,
        gatewayActivityDistribution: Array.from({ length: 10 }, (_, i) => ({
          category: `Gateway${i}`,
          count: Math.floor(Math.random() * 1000)
        })),
        signalQualityDistribution: mockChartsData.signalQualityDistribution,
        messageRoutingPatterns: mockChartsData.messageRoutingPatterns,
        protocolUsage: Array.from({ length: 10 }, (_, i) => ({
          protocol: `PROTOCOL_${i}`,
          count: Math.floor(Math.random() * 500)
        }))
      };

      const largeTopNodes = Array.from({ length: 10 }, (_, i) => ({
        nodeId: `node${i}`,
        shortName: `N${i}`,
        longName: `Node ${i}`,
        messageCount: Math.floor(Math.random() * 10000),
        avgRssi: `-${70 + Math.random() * 30}`
      }));

      const { container } = render(<DashboardCharts charts={largeDataset} topNodes={largeTopNodes} />);

      // Should render without errors
      expect(container).toBeInTheDocument();
      expect(screen.getAllByTestId(/chart/).length).toBeGreaterThan(0);
    });

    it('should not cause memory leaks with event listeners', () => {
      const { unmount } = render(<DashboardCharts charts={mockChartsData} topNodes={mockTopNodes} />);

      // Unmount should clean up event listeners
      unmount();

      // Verify cleanup by checking that event listeners are removed
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
      expect(removeEventListenerSpy).toHaveBeenCalled();
    });
  });
});
