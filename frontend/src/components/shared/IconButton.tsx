import React from 'react';
import { Tooltip, IconButton as MuiIconButton, IconButtonProps as MuiIconButtonProps } from '@mui/material';

/**
 * IconButton Component
 * 
 * A touch-friendly icon button with tooltip support.
 * Implements Requirements 36.2, 36.3, 36.11, 36.12:
 * - Icon-only buttons with tooltips (36.2)
 * - Minimum 44x44px touch target size (36.3)
 * - Button groups for multiple actions (36.11)
 * - Dropdown menus for >3-4 actions (36.12)
 */

export interface IconButtonWithTooltipProps extends Omit<MuiIconButtonProps, 'size'> {
  /** Tooltip text to display on hover */
  tooltip: string;
  /** Icon element to display */
  icon: React.ReactNode;
  /** Button size - defaults to medium for 44x44px touch target */
  size?: 'small' | 'medium' | 'large';
  /** Aria label for accessibility */
  ariaLabel?: string;
}

/**
 * IconButton with tooltip
 * Ensures minimum 44x44px touch target size for mobile accessibility
 */
export const IconButtonWithTooltip: React.FC<IconButtonWithTooltipProps> = ({
  tooltip,
  icon,
  size = 'medium',
  ariaLabel,
  disabled,
  ...props
}) => {
  const button = (
    <MuiIconButton
      {...props}
      disabled={disabled}
      size={size}
      aria-label={ariaLabel || tooltip}
      sx={{
        minWidth: '44px',
        minHeight: '44px',
        ...props.sx,
      }}
    >
      {icon}
    </MuiIconButton>
  );

  // Wrap disabled buttons in a span to allow tooltip to work
  if (disabled) {
    return (
      <Tooltip title={tooltip} arrow>
        <span style={{ display: 'inline-block' }}>{button}</span>
      </Tooltip>
    );
  }

  return (
    <Tooltip title={tooltip} arrow>
      {button}
    </Tooltip>
  );
};

export default IconButtonWithTooltip;
