import React from 'react';
import { ButtonGroup, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import { MoreVert as MoreVertIcon } from '@mui/icons-material';
import { IconButtonWithTooltip } from './IconButton';

/**
 * ActionButtonGroup Component
 * 
 * Groups action buttons together with optional overflow menu.
 * Implements Requirements 36.11, 36.12:
 * - Button groups for multiple actions (36.11)
 * - Dropdown menu for >3-4 actions (36.12)
 */

export interface ActionButton {
  /** Unique identifier for the action */
  id: string;
  /** Tooltip text */
  tooltip: string;
  /** Icon element */
  icon: React.ReactNode;
  /** Click handler */
  onClick: () => void;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Color variant */
  color?: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
}

export interface ActionButtonGroupProps {
  /** Array of action buttons to display */
  actions: ActionButton[];
  /** Maximum number of buttons to show before using dropdown (default: 3) */
  maxVisible?: number;
  /** Size of the buttons */
  size?: 'small' | 'medium' | 'large';
}

/**
 * ActionButtonGroup
 * Displays action buttons in a group, with overflow menu for >maxVisible actions
 */
export const ActionButtonGroup: React.FC<ActionButtonGroupProps> = ({
  actions,
  maxVisible = 3,
  size = 'medium',
}) => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const menuOpen = Boolean(anchorEl);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleMenuItemClick = (action: ActionButton) => {
    action.onClick();
    handleMenuClose();
  };

  // Split actions into visible and overflow
  const visibleActions = actions.slice(0, maxVisible);
  const overflowActions = actions.slice(maxVisible);

  return (
    <>
      <ButtonGroup
        variant="text"
        size={size}
        sx={{
          gap: 0.5,
          '& .MuiButtonGroup-grouped': {
            minWidth: '44px',
            minHeight: '44px',
          },
        }}
      >
        {visibleActions.map((action) => (
          <IconButtonWithTooltip
            key={action.id}
            tooltip={action.tooltip}
            icon={action.icon}
            onClick={action.onClick}
            disabled={action.disabled}
            color={action.color}
            size={size}
            ariaLabel={action.tooltip}
          />
        ))}
        
        {overflowActions.length > 0 && (
          <IconButtonWithTooltip
            tooltip="More actions"
            icon={<MoreVertIcon />}
            onClick={handleMenuOpen}
            size={size}
            ariaLabel="More actions"
            data-testid="overflow-menu-button"
          />
        )}
      </ButtonGroup>

      {overflowActions.length > 0 && (
        <Menu
          anchorEl={anchorEl}
          open={menuOpen}
          onClose={handleMenuClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
        >
          {overflowActions.map((action) => (
            <MenuItem
              key={action.id}
              onClick={() => handleMenuItemClick(action)}
              disabled={action.disabled}
              sx={{
                minHeight: '44px', // Touch-friendly
              }}
            >
              <ListItemIcon>{action.icon}</ListItemIcon>
              <ListItemText>{action.tooltip}</ListItemText>
            </MenuItem>
          ))}
        </Menu>
      )}
    </>
  );
};

export default ActionButtonGroup;
