/**
 * SignalQualityBadge Component Tests
 * Tests for signal quality display with color coding
 * Requirements: 43.12
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import SignalQualityBadge from '../SignalQualityBadge';

describe('SignalQualityBadge', () => {
  describe('Signal Quality Categories', () => {
    it('should display "Excellent" for RSSI > -70 dBm', () => {
      render(<SignalQualityBadge rssi={-65} />);
      expect(screen.getByText('Excellent')).toBeInTheDocument();
    });

    it('should display "Good" for RSSI between -70 and -80 dBm', () => {
      render(<SignalQualityBadge rssi={-75} />);
      expect(screen.getByText('Good')).toBeInTheDocument();
    });

    it('should display "Fair" for RSSI between -80 and -90 dBm', () => {
      render(<SignalQualityBadge rssi={-85} />);
      expect(screen.getByText('Fair')).toBeInTheDocument();
    });

    it('should display "Poor" for RSSI < -90 dBm', () => {
      render(<SignalQualityBadge rssi={-95} />);
      expect(screen.getByText('Poor')).toBeInTheDocument();
    });

    it('should display "Unknown" when no RSSI provided', () => {
      render(<SignalQualityBadge />);
      expect(screen.getByText('Unknown')).toBeInTheDocument();
    });
  });

  describe('Boundary Values', () => {
    it('should handle RSSI exactly at -70 dBm as Good', () => {
      render(<SignalQualityBadge rssi={-70} />);
      expect(screen.getByText('Good')).toBeInTheDocument();
    });

    it('should handle RSSI exactly at -80 dBm as Fair', () => {
      render(<SignalQualityBadge rssi={-80} />);
      expect(screen.getByText('Fair')).toBeInTheDocument();
    });

    it('should handle RSSI exactly at -90 dBm as Poor', () => {
      render(<SignalQualityBadge rssi={-90} />);
      expect(screen.getByText('Poor')).toBeInTheDocument();
    });

    it('should handle very strong signal (0 dBm)', () => {
      render(<SignalQualityBadge rssi={0} />);
      expect(screen.getByText('Excellent')).toBeInTheDocument();
    });

    it('should handle very weak signal (-120 dBm)', () => {
      render(<SignalQualityBadge rssi={-120} />);
      expect(screen.getByText('Poor')).toBeInTheDocument();
    });
  });

  describe('Tooltip Content', () => {
    it('should show RSSI in tooltip', async () => {
      const user = userEvent.setup();
      render(<SignalQualityBadge rssi={-75} />);
      
      const badge = screen.getByText('Good');
      await user.hover(badge);

      // Tooltip should contain RSSI value
      const tooltip = await screen.findByRole('tooltip');
      expect(tooltip).toHaveTextContent('RSSI: -75 dBm');
    });

    it('should show both RSSI and SNR in tooltip', async () => {
      const user = userEvent.setup();
      render(<SignalQualityBadge rssi={-75} snr={8.5} />);
      
      const badge = screen.getByText('Good');
      await user.hover(badge);

      const tooltip = await screen.findByRole('tooltip');
      expect(tooltip).toHaveTextContent('RSSI: -75 dBm');
      expect(tooltip).toHaveTextContent('SNR: 8.5 dB');
    });

    it('should show quality description in tooltip', async () => {
      const user = userEvent.setup();
      render(<SignalQualityBadge rssi={-65} />);
      
      const badge = screen.getByText('Excellent');
      await user.hover(badge);

      const tooltip = await screen.findByRole('tooltip');
      expect(tooltip).toHaveTextContent('Very strong signal');
    });

    it('should show "No signal data available" for unknown state', async () => {
      const user = userEvent.setup();
      render(<SignalQualityBadge />);
      
      const badge = screen.getByText('Unknown');
      await user.hover(badge);

      const tooltip = await screen.findByRole('tooltip');
      expect(tooltip).toHaveTextContent('No signal data available');
    });
  });

  describe('Visual Properties', () => {
    it('should render with icon by default', () => {
      const { container } = render(<SignalQualityBadge rssi={-75} />);
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('should render without icon when showIcon is false', () => {
      const { container } = render(<SignalQualityBadge rssi={-75} showIcon={false} />);
      const icon = container.querySelector('svg');
      expect(icon).not.toBeInTheDocument();
    });

    it('should render with small size', () => {
      render(<SignalQualityBadge rssi={-75} size="small" />);
      const badge = screen.getByText('Good');
      expect(badge).toBeInTheDocument();
    });

    it('should render with medium size', () => {
      render(<SignalQualityBadge rssi={-75} size="medium" />);
      const badge = screen.getByText('Good');
      expect(badge).toBeInTheDocument();
    });

    it('should render with outlined variant', () => {
      render(<SignalQualityBadge rssi={-75} variant="outlined" />);
      const badge = screen.getByText('Good');
      expect(badge).toBeInTheDocument();
    });

    it('should render with filled variant', () => {
      render(<SignalQualityBadge rssi={-75} variant="filled" />);
      const badge = screen.getByText('Good');
      expect(badge).toBeInTheDocument();
    });
  });

  describe('SNR Only', () => {
    it('should show only SNR when RSSI is not provided', async () => {
      const user = userEvent.setup();
      render(<SignalQualityBadge snr={10} />);
      
      const badge = screen.getByText('Unknown');
      await user.hover(badge);

      // Should show unknown since RSSI is required for quality determination
      expect(badge).toBeInTheDocument();
    });
  });

  describe('Color Coding', () => {
    it('should use success color for Excellent quality', () => {
      const { container } = render(<SignalQualityBadge rssi={-65} />);
      const chip = container.querySelector('.MuiChip-colorSuccess');
      expect(chip).toBeInTheDocument();
    });

    it('should use info color for Good quality', () => {
      const { container } = render(<SignalQualityBadge rssi={-75} />);
      const chip = container.querySelector('.MuiChip-colorInfo');
      expect(chip).toBeInTheDocument();
    });

    it('should use warning color for Fair quality', () => {
      const { container } = render(<SignalQualityBadge rssi={-85} />);
      const chip = container.querySelector('.MuiChip-colorWarning');
      expect(chip).toBeInTheDocument();
    });

    it('should use error color for Poor quality', () => {
      const { container } = render(<SignalQualityBadge rssi={-95} />);
      const chip = container.querySelector('.MuiChip-colorError');
      expect(chip).toBeInTheDocument();
    });

    it('should use default color for Unknown state', () => {
      const { container } = render(<SignalQualityBadge />);
      const chip = container.querySelector('.MuiChip-colorDefault');
      expect(chip).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle negative zero RSSI', () => {
      render(<SignalQualityBadge rssi={-0} />);
      expect(screen.getByText('Excellent')).toBeInTheDocument();
    });

    it('should handle positive RSSI values', () => {
      render(<SignalQualityBadge rssi={10} />);
      expect(screen.getByText('Excellent')).toBeInTheDocument();
    });

    it('should handle undefined SNR', () => {
      render(<SignalQualityBadge rssi={-75} snr={undefined} />);
      expect(screen.getByText('Good')).toBeInTheDocument();
    });

    it('should handle zero SNR', () => {
      render(<SignalQualityBadge rssi={-75} snr={0} />);
      expect(screen.getByText('Good')).toBeInTheDocument();
    });

    it('should handle negative SNR', () => {
      render(<SignalQualityBadge rssi={-75} snr={-5} />);
      expect(screen.getByText('Good')).toBeInTheDocument();
    });
  });
});
