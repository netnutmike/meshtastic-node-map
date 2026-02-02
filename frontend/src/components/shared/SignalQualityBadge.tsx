/**
 * SignalQualityBadge Component
 * Consistent signal quality display with color coding
 * Requirements: 43.12
 */

import React from 'react';
import { Chip, Tooltip } from '@mui/material';
import SignalCellularAltIcon from '@mui/icons-material/SignalCellularAlt';

export interface SignalQualityBadgeProps {
  rssi?: number;
  snr?: number;
  showIcon?: boolean;
  size?: 'small' | 'medium';
  variant?: 'filled' | 'outlined';
}

/**
 * Determine signal quality category based on RSSI
 * Excellent: > -70 dBm
 * Good: -70 to -80 dBm
 * Fair: -80 to -90 dBm
 * Poor: < -90 dBm
 */
function getSignalQuality(rssi: number): {
  label: string;
  color: 'success' | 'info' | 'warning' | 'error';
  description: string;
} {
  if (rssi > -70) {
    return {
      label: 'Excellent',
      color: 'success',
      description: 'Very strong signal (> -70 dBm)'
    };
  } else if (rssi > -80) {
    return {
      label: 'Good',
      color: 'info',
      description: 'Good signal (-70 to -80 dBm)'
    };
  } else if (rssi > -90) {
    return {
      label: 'Fair',
      color: 'warning',
      description: 'Fair signal (-80 to -90 dBm)'
    };
  } else {
    return {
      label: 'Poor',
      color: 'error',
      description: 'Weak signal (< -90 dBm)'
    };
  }
}

/**
 * Format signal values for display
 */
function formatSignalValues(rssi?: number, snr?: number): string {
  const parts: string[] = [];
  
  if (rssi !== undefined) {
    parts.push(`RSSI: ${rssi} dBm`);
  }
  
  if (snr !== undefined) {
    parts.push(`SNR: ${snr} dB`);
  }
  
  return parts.join(', ') || 'No signal data';
}

const SignalQualityBadge: React.FC<SignalQualityBadgeProps> = ({
  rssi,
  snr,
  showIcon = true,
  size = 'small',
  variant = 'filled'
}) => {
  // If no RSSI provided, show unknown state
  if (rssi === undefined) {
    return (
      <Tooltip title="No signal data available">
        <Chip
          label="Unknown"
          size={size}
          variant={variant}
          color="default"
          icon={showIcon ? <SignalCellularAltIcon /> : undefined}
        />
      </Tooltip>
    );
  }

  const quality = getSignalQuality(rssi);
  const tooltipText = `${quality.description}\n${formatSignalValues(rssi, snr)}`;

  return (
    <Tooltip title={tooltipText} arrow>
      <Chip
        label={quality.label}
        size={size}
        variant={variant}
        color={quality.color}
        icon={showIcon ? <SignalCellularAltIcon /> : undefined}
      />
    </Tooltip>
  );
};

export default SignalQualityBadge;
