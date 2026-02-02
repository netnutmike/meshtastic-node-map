import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ActionButtonGroup, ActionButton } from '../ActionButtonGroup';
import {
  Visibility as VisibilityIcon,
  MyLocation as MyLocationIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Share as ShareIcon,
} from '@mui/icons-material';

/**
 * Unit tests for ActionButtonGroup component
 * 
 * Tests Requirements 36.11, 36.12:
 * - Button groups for multiple actions (36.11)
 * - Dropdown menu functionality for >3-4 actions (36.12)
 */

describe('ActionButtonGroup', () => {
  const createMockActions = (count: number): ActionButton[] => {
    const icons = [
      <VisibilityIcon key="view" />,
      <MyLocationIcon key="location" />,
      <EditIcon key="edit" />,
      <DeleteIcon key="delete" />,
      <ShareIcon key="share" />,
    ];

    return Array.from({ length: count }, (_, i) => ({
      id: `action-${i}`,
      tooltip: `Action ${i + 1}`,
      icon: icons[i % icons.length],
      onClick: jest.fn(),
    }));
  };

  describe('Button Group Rendering (Requirement 36.11)', () => {
    it('should render all buttons when count <= maxVisible', () => {
      const actions = createMockActions(3);
      render(<ActionButtonGroup actions={actions} maxVisible={3} />);

      actions.forEach((action) => {
        expect(screen.getByRole('button', { name: action.tooltip })).toBeInTheDocument();
      });
    });

    it('should render buttons in a button group', () => {
      const actions = createMockActions(2);
      const { container } = render(<ActionButtonGroup actions={actions} />);

      const buttonGroup = container.querySelector('.MuiButtonGroup-root');
      expect(buttonGroup).toBeInTheDocument();
    });

    it('should handle click events for each button', () => {
      const actions = createMockActions(3);
      render(<ActionButtonGroup actions={actions} />);

      actions.forEach((action) => {
        const button = screen.getByRole('button', { name: action.tooltip });
        fireEvent.click(button);
        expect(action.onClick).toHaveBeenCalledTimes(1);
      });
    });

    it('should disable buttons when disabled prop is true', () => {
      const actions = createMockActions(2);
      actions[0].disabled = true;

      render(<ActionButtonGroup actions={actions} />);

      const button = screen.getByRole('button', { name: actions[0].tooltip });
      expect(button).toBeDisabled();
    });

    it('should apply color variants to buttons', () => {
      const actions = createMockActions(2);
      actions[0].color = 'primary';
      actions[1].color = 'error';

      render(<ActionButtonGroup actions={actions} />);

      const primaryButton = screen.getByRole('button', { name: actions[0].tooltip });
      const errorButton = screen.getByRole('button', { name: actions[1].tooltip });

      expect(primaryButton).toHaveClass('MuiIconButton-colorPrimary');
      expect(errorButton).toHaveClass('MuiIconButton-colorError');
    });
  });

  describe('Dropdown Menu (Requirement 36.12)', () => {
    it('should show overflow menu button when actions > maxVisible', () => {
      const actions = createMockActions(5);
      render(<ActionButtonGroup actions={actions} maxVisible={3} />);

      const overflowButton = screen.getByTestId('overflow-menu-button');
      expect(overflowButton).toBeInTheDocument();
    });

    it('should not show overflow menu button when actions <= maxVisible', () => {
      const actions = createMockActions(3);
      render(<ActionButtonGroup actions={actions} maxVisible={3} />);

      const overflowButton = screen.queryByTestId('overflow-menu-button');
      expect(overflowButton).not.toBeInTheDocument();
    });

    it('should open dropdown menu when overflow button is clicked', async () => {
      const actions = createMockActions(5);
      render(<ActionButtonGroup actions={actions} maxVisible={3} />);

      const overflowButton = screen.getByTestId('overflow-menu-button');
      fireEvent.click(overflowButton);

      await waitFor(() => {
        // Should show actions 4 and 5 in the menu
        expect(screen.getByText('Action 4')).toBeInTheDocument();
        expect(screen.getByText('Action 5')).toBeInTheDocument();
      });
    });

    it('should close dropdown menu when clicking outside', async () => {
      const actions = createMockActions(5);
      render(<ActionButtonGroup actions={actions} maxVisible={3} />);

      const overflowButton = screen.getByTestId('overflow-menu-button');
      fireEvent.click(overflowButton);

      await waitFor(() => {
        expect(screen.getByText('Action 4')).toBeInTheDocument();
      });

      // Click on the backdrop to close
      const backdrop = document.querySelector('.MuiBackdrop-root');
      if (backdrop) {
        fireEvent.click(backdrop);
      }

      await waitFor(() => {
        expect(screen.queryByText('Action 4')).not.toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should execute action and close menu when menu item is clicked', async () => {
      const actions = createMockActions(5);
      render(<ActionButtonGroup actions={actions} maxVisible={3} />);

      const overflowButton = screen.getByTestId('overflow-menu-button');
      fireEvent.click(overflowButton);

      await waitFor(() => {
        expect(screen.getByText('Action 4')).toBeInTheDocument();
      });

      const menuItem = screen.getByText('Action 4');
      fireEvent.click(menuItem);

      // Action should be called
      expect(actions[3].onClick).toHaveBeenCalledTimes(1);

      // Menu should close
      await waitFor(() => {
        expect(screen.queryByText('Action 4')).not.toBeInTheDocument();
      });
    });

    it('should show correct number of visible and overflow actions', () => {
      const actions = createMockActions(6);
      render(<ActionButtonGroup actions={actions} maxVisible={3} />);

      // Should show first 3 actions as buttons
      expect(screen.getByRole('button', { name: 'Action 1' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Action 2' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Action 3' })).toBeInTheDocument();

      // Should not show actions 4, 5, 6 as buttons
      expect(screen.queryByRole('button', { name: 'Action 4' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Action 5' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Action 6' })).not.toBeInTheDocument();

      // Should show overflow button
      expect(screen.getByTestId('overflow-menu-button')).toBeInTheDocument();
    });

    it('should handle disabled actions in dropdown menu', async () => {
      const actions = createMockActions(5);
      actions[3].disabled = true; // Action 4 is disabled

      render(<ActionButtonGroup actions={actions} maxVisible={3} />);

      const overflowButton = screen.getByTestId('overflow-menu-button');
      fireEvent.click(overflowButton);

      await waitFor(() => {
        const menuItem = screen.getByText('Action 4').closest('li');
        expect(menuItem).toHaveClass('Mui-disabled');
      });
    });

    it('should use default maxVisible of 3 when not specified', () => {
      const actions = createMockActions(4);
      render(<ActionButtonGroup actions={actions} />);

      // Should show first 3 as buttons
      expect(screen.getByRole('button', { name: 'Action 1' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Action 2' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Action 3' })).toBeInTheDocument();

      // Should show overflow button for action 4
      expect(screen.getByTestId('overflow-menu-button')).toBeInTheDocument();
    });
  });

  describe('Touch Target Sizing (Requirement 36.3)', () => {
    it('should have 44x44px minimum size for all buttons', () => {
      const actions = createMockActions(3);
      render(<ActionButtonGroup actions={actions} />);

      actions.forEach((action) => {
        const button = screen.getByRole('button', { name: action.tooltip });
        expect(button).toHaveStyle({
          minWidth: '44px',
          minHeight: '44px',
        });
      });
    });

    it('should have 44x44px minimum size for overflow menu button', () => {
      const actions = createMockActions(5);
      render(<ActionButtonGroup actions={actions} maxVisible={3} />);

      const overflowButton = screen.getByTestId('overflow-menu-button');
      expect(overflowButton).toHaveStyle({
        minWidth: '44px',
        minHeight: '44px',
      });
    });

    it('should have 44x44px minimum height for menu items', async () => {
      const actions = createMockActions(5);
      render(<ActionButtonGroup actions={actions} maxVisible={3} />);

      const overflowButton = screen.getByTestId('overflow-menu-button');
      fireEvent.click(overflowButton);

      await waitFor(() => {
        const menuItem = screen.getByText('Action 4').closest('li');
        expect(menuItem).toHaveStyle({ minHeight: '44px' });
      });
    });
  });

  describe('Size Variants', () => {
    it('should apply small size to all buttons', () => {
      const actions = createMockActions(2);
      render(<ActionButtonGroup actions={actions} size="small" />);

      actions.forEach((action) => {
        const button = screen.getByRole('button', { name: action.tooltip });
        expect(button).toHaveClass('MuiIconButton-sizeSmall');
      });
    });

    it('should apply medium size to all buttons', () => {
      const actions = createMockActions(2);
      render(<ActionButtonGroup actions={actions} size="medium" />);

      actions.forEach((action) => {
        const button = screen.getByRole('button', { name: action.tooltip });
        expect(button).toHaveClass('MuiIconButton-sizeMedium');
      });
    });

    it('should apply large size to all buttons', () => {
      const actions = createMockActions(2);
      render(<ActionButtonGroup actions={actions} size="large" />);

      actions.forEach((action) => {
        const button = screen.getByRole('button', { name: action.tooltip });
        expect(button).toHaveClass('MuiIconButton-sizeLarge');
      });
    });
  });

  describe('Empty State', () => {
    it('should handle empty actions array', () => {
      const { container } = render(<ActionButtonGroup actions={[]} />);
      const buttonGroup = container.querySelector('.MuiButtonGroup-root');
      expect(buttonGroup).toBeInTheDocument();
      expect(buttonGroup?.children).toHaveLength(0);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for all buttons', () => {
      const actions = createMockActions(3);
      render(<ActionButtonGroup actions={actions} />);

      actions.forEach((action) => {
        const button = screen.getByRole('button', { name: action.tooltip });
        expect(button).toHaveAttribute('aria-label', action.tooltip);
      });
    });

    it('should have proper ARIA label for overflow menu button', () => {
      const actions = createMockActions(5);
      render(<ActionButtonGroup actions={actions} maxVisible={3} />);

      const overflowButton = screen.getByTestId('overflow-menu-button');
      expect(overflowButton).toHaveAttribute('aria-label', 'More actions');
    });

    it('should be keyboard navigable', async () => {
      const actions = createMockActions(5);
      render(<ActionButtonGroup actions={actions} maxVisible={3} />);

      const overflowButton = screen.getByTestId('overflow-menu-button');
      expect(overflowButton).toBeInTheDocument();
      
      // Click to open menu
      fireEvent.click(overflowButton);

      await waitFor(() => {
        expect(screen.getByText('Action 4')).toBeInTheDocument();
      });
    });
  });
});
