import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import DashboardMetricCards from '../DashboardMetricCards';

describe('DashboardMetricCards Component', () => {
  const mockMetrics = {
    totalNodes: 150,
    activeNodes24h: 120,
    activeNodesPercentage: 80,
    gatewayDiversity: 5,
    protocolDiversity: 8,
    totalMessages: 45678,
    successRate: 96.5
  };

  describe('Card Rendering and Data Display', () => {
    it('should render all 6 metric cards', () => {
      render(<DashboardMetricCards metrics={mockMetrics} />);

      // Check for all 6 card titles
      expect(screen.getByText('Total Nodes')).toBeInTheDocument();
      expect(screen.getByText('Active Nodes (24h)')).toBeInTheDocument();
      expect(screen.getByText('Gateway Diversity')).toBeInTheDocument();
      expect(screen.getByText('Protocol Diversity')).toBeInTheDocument();
      expect(screen.getByText('Total Messages')).toBeInTheDocument();
      expect(screen.getByText('Processing Success Rate')).toBeInTheDocument();
    });

    it('should display correct metric values', () => {
      render(<DashboardMetricCards metrics={mockMetrics} />);

      // Check for metric values
      expect(screen.getByText('150')).toBeInTheDocument(); // Total Nodes
      expect(screen.getByText('120')).toBeInTheDocument(); // Active Nodes
      expect(screen.getByText('5')).toBeInTheDocument(); // Gateway Diversity
      expect(screen.getByText('8')).toBeInTheDocument(); // Protocol Diversity
      expect(screen.getByText('45,678')).toBeInTheDocument(); // Total Messages (formatted)
      expect(screen.getByText('96.5%')).toBeInTheDocument(); // Success Rate
    });

    it('should display network coverage percentage for Active Nodes', () => {
      render(<DashboardMetricCards metrics={mockMetrics} />);

      // Check for coverage percentage
      expect(screen.getByText(/80% coverage/i)).toBeInTheDocument();
    });

    it('should handle zero values gracefully', () => {
      const zeroMetrics = {
        totalNodes: 0,
        activeNodes24h: 0,
        activeNodesPercentage: 0,
        gatewayDiversity: 0,
        protocolDiversity: 0,
        totalMessages: 0,
        successRate: 0
      };

      render(<DashboardMetricCards metrics={zeroMetrics} />);

      // Should display zeros without errors
      expect(screen.getAllByText('0').length).toBeGreaterThan(0);
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('should handle undefined metrics gracefully', () => {
      render(<DashboardMetricCards metrics={undefined as any} />);

      // Should render without crashing
      expect(screen.getByText('Total Nodes')).toBeInTheDocument();
    });
  });

  describe('Number Formatting', () => {
    it('should format large numbers with commas', () => {
      const largeMetrics = {
        ...mockMetrics,
        totalMessages: 1234567
      };

      render(<DashboardMetricCards metrics={largeMetrics} />);

      // Check for comma-formatted number
      expect(screen.getByText('1,234,567')).toBeInTheDocument();
    });

    it('should format numbers under 1000 without commas', () => {
      const smallMetrics = {
        ...mockMetrics,
        totalMessages: 999
      };

      render(<DashboardMetricCards metrics={smallMetrics} />);

      expect(screen.getByText('999')).toBeInTheDocument();
    });

    it('should format success rate with one decimal place', () => {
      const metrics = {
        ...mockMetrics,
        successRate: 98.76543
      };

      render(<DashboardMetricCards metrics={metrics} />);

      expect(screen.getByText('98.8%')).toBeInTheDocument();
    });

    it('should format success rate as integer when whole number', () => {
      const metrics = {
        ...mockMetrics,
        successRate: 100
      };

      render(<DashboardMetricCards metrics={metrics} />);

      expect(screen.getByText('100%')).toBeInTheDocument();
    });
  });

  describe('Color-Coding Logic', () => {
    it('should apply green color for success rate >= 95%', () => {
      const highSuccessMetrics = {
        ...mockMetrics,
        successRate: 97
      };

      const { container } = render(<DashboardMetricCards metrics={highSuccessMetrics} />);

      // Find the success rate card and check for green color class or style
      const successRateCard = container.querySelector('[data-testid="success-rate-card"]');
      expect(successRateCard).toHaveClass('success-high');
    });

    it('should apply yellow color for success rate between 85% and 94%', () => {
      const mediumSuccessMetrics = {
        ...mockMetrics,
        successRate: 90
      };

      const { container } = render(<DashboardMetricCards metrics={mediumSuccessMetrics} />);

      const successRateCard = container.querySelector('[data-testid="success-rate-card"]');
      expect(successRateCard).toHaveClass('success-medium');
    });

    it('should apply red color for success rate < 85%', () => {
      const lowSuccessMetrics = {
        ...mockMetrics,
        successRate: 75
      };

      const { container } = render(<DashboardMetricCards metrics={lowSuccessMetrics} />);

      const successRateCard = container.querySelector('[data-testid="success-rate-card"]');
      expect(successRateCard).toHaveClass('success-low');
    });

    it('should apply blue color for Gateway Diversity card', () => {
      const { container } = render(<DashboardMetricCards metrics={mockMetrics} />);

      const gatewayCard = container.querySelector('[data-testid="gateway-diversity-card"]');
      expect(gatewayCard).toHaveClass('gateway-diversity');
    });

    it('should apply info blue color for Protocol Diversity card', () => {
      const { container } = render(<DashboardMetricCards metrics={mockMetrics} />);

      const protocolCard = container.querySelector('[data-testid="protocol-diversity-card"]');
      expect(protocolCard).toHaveClass('protocol-diversity');
    });
  });

  describe('Real-time Updates', () => {
    it('should update when metrics prop changes', () => {
      const { rerender } = render(<DashboardMetricCards metrics={mockMetrics} />);

      expect(screen.getByText('150')).toBeInTheDocument();

      const updatedMetrics = {
        ...mockMetrics,
        totalNodes: 175
      };

      rerender(<DashboardMetricCards metrics={updatedMetrics} />);

      expect(screen.getByText('175')).toBeInTheDocument();
      expect(screen.queryByText('150')).not.toBeInTheDocument();
    });

    it('should update success rate color when threshold changes', () => {
      const { container, rerender } = render(
        <DashboardMetricCards metrics={{ ...mockMetrics, successRate: 97 }} />
      );

      let successRateCard = container.querySelector('[data-testid="success-rate-card"]');
      expect(successRateCard).toHaveClass('success-high');

      rerender(<DashboardMetricCards metrics={{ ...mockMetrics, successRate: 80 }} />);

      successRateCard = container.querySelector('[data-testid="success-rate-card"]');
      expect(successRateCard).toHaveClass('success-low');
    });

    it('should update active nodes percentage when values change', () => {
      const { rerender } = render(<DashboardMetricCards metrics={mockMetrics} />);

      expect(screen.getByText(/80% coverage/i)).toBeInTheDocument();

      const updatedMetrics = {
        ...mockMetrics,
        activeNodes24h: 90,
        activeNodesPercentage: 60
      };

      rerender(<DashboardMetricCards metrics={updatedMetrics} />);

      expect(screen.getByText(/60% coverage/i)).toBeInTheDocument();
      expect(screen.queryByText(/80% coverage/i)).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large numbers', () => {
      const largeMetrics = {
        ...mockMetrics,
        totalMessages: 999999999
      };

      render(<DashboardMetricCards metrics={largeMetrics} />);

      expect(screen.getByText('999,999,999')).toBeInTheDocument();
    });

    it('should handle decimal success rates correctly', () => {
      const decimalMetrics = {
        ...mockMetrics,
        successRate: 94.9
      };

      render(<DashboardMetricCards metrics={decimalMetrics} />);

      expect(screen.getByText('94.9%')).toBeInTheDocument();
    });

    it('should handle 100% active nodes percentage', () => {
      const fullActiveMetrics = {
        ...mockMetrics,
        totalNodes: 100,
        activeNodes24h: 100,
        activeNodesPercentage: 100
      };

      render(<DashboardMetricCards metrics={fullActiveMetrics} />);

      expect(screen.getByText(/100% coverage/i)).toBeInTheDocument();
    });

    it('should handle 0% active nodes percentage', () => {
      const noActiveMetrics = {
        ...mockMetrics,
        totalNodes: 100,
        activeNodes24h: 0,
        activeNodesPercentage: 0
      };

      render(<DashboardMetricCards metrics={noActiveMetrics} />);

      expect(screen.getByText(/0% coverage/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for metric cards', () => {
      const { container } = render(<DashboardMetricCards metrics={mockMetrics} />);

      const cards = container.querySelectorAll('[role="article"]');
      expect(cards.length).toBe(6);
    });

    it('should have readable text contrast', () => {
      const { container } = render(<DashboardMetricCards metrics={mockMetrics} />);

      // Check that cards have appropriate classes for styling
      const cards = container.querySelectorAll('.metric-card');
      expect(cards.length).toBe(6);
    });
  });
});
