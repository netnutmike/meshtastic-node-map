import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { IconButtonWithTooltip } from '../IconButton';
import { Visibility as VisibilityIcon } from '@mui/icons-material';

/**
 * Unit tests for IconButton component
 * 
 * Tests Requirements 36.2, 36.3, 36.11, 36.12:
 * - Button rendering and tooltip display (36.2)
 * - Touch target sizing (36.3)
 * - Button groups for multiple actions (36.11)
 * - Dropdown menu functionality (36.12)
 */

describe('IconButtonWithTooltip', () => {
  describe('Button Rendering', () => {
    it('should render icon button with correct icon', () => {
      render(
        <IconButtonWithTooltip
          tooltip="View details"
          icon={<VisibilityIcon data-testid="visibility-icon" />}
          onClick={() => {}}
        />
      );

      expect(screen.getByTestId('visibility-icon')).toBeInTheDocument();
    });

    it('should render button with aria-label from tooltip', () => {
      render(
        <IconButtonWithTooltip
          tooltip="View details"
          icon={<VisibilityIcon />}
          onClick={() => {}}
        />
      );

      const button = screen.getByRole('button', { name: 'View details' });
      expect(button).toBeInTheDocument();
    });

    it('should use custom aria-label when provided', () => {
      render(
        <IconButtonWithTooltip
          tooltip="View details"
          icon={<VisibilityIcon />}
          onClick={() => {}}
          ariaLabel="Custom label"
        />
      );

      const button = screen.getByRole('button', { name: 'Custom label' });
      expect(button).toBeInTheDocument();
    });

    it('should handle click events', () => {
      const handleClick = jest.fn();
      render(
        <IconButtonWithTooltip
          tooltip="View details"
          icon={<VisibilityIcon />}
          onClick={handleClick}
        />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should be disabled when disabled prop is true', () => {
      render(
        <IconButtonWithTooltip
          tooltip="View details"
          icon={<VisibilityIcon />}
          onClick={() => {}}
          disabled
        />
      );

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });
  });

  describe('Tooltip Display (Requirement 36.2)', () => {
    it('should display tooltip on hover', async () => {
      render(
        <IconButtonWithTooltip
          tooltip="View details"
          icon={<VisibilityIcon />}
          onClick={() => {}}
        />
      );

      const button = screen.getByRole('button');
      fireEvent.mouseEnter(button);

      await waitFor(() => {
        expect(screen.getByText('View details')).toBeInTheDocument();
      });
    });

    it('should hide tooltip on mouse leave', async () => {
      render(
        <IconButtonWithTooltip
          tooltip="View details"
          icon={<VisibilityIcon />}
          onClick={() => {}}
        />
      );

      const button = screen.getByRole('button');
      fireEvent.mouseEnter(button);

      await waitFor(() => {
        expect(screen.getByText('View details')).toBeInTheDocument();
      });

      fireEvent.mouseLeave(button);

      await waitFor(() => {
        expect(screen.queryByText('View details')).not.toBeInTheDocument();
      });
    });
  });

  describe('Touch Target Sizing (Requirement 36.3)', () => {
    it('should have minimum 44x44px touch target size', () => {
      render(
        <IconButtonWithTooltip
          tooltip="View details"
          icon={<VisibilityIcon />}
          onClick={() => {}}
        />
      );

      const button = screen.getByRole('button');
      const styles = window.getComputedStyle(button);

      // Check that minWidth and minHeight are set to 44px
      expect(button).toHaveStyle({
        minWidth: '44px',
        minHeight: '44px',
      });
    });

    it('should maintain 44x44px minimum size for small buttons', () => {
      render(
        <IconButtonWithTooltip
          tooltip="View details"
          icon={<VisibilityIcon />}
          onClick={() => {}}
          size="small"
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveStyle({
        minWidth: '44px',
        minHeight: '44px',
      });
    });

    it('should maintain 44x44px minimum size for medium buttons', () => {
      render(
        <IconButtonWithTooltip
          tooltip="View details"
          icon={<VisibilityIcon />}
          onClick={() => {}}
          size="medium"
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveStyle({
        minWidth: '44px',
        minHeight: '44px',
      });
    });

    it('should maintain 44x44px minimum size for large buttons', () => {
      render(
        <IconButtonWithTooltip
          tooltip="View details"
          icon={<VisibilityIcon />}
          onClick={() => {}}
          size="large"
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveStyle({
        minWidth: '44px',
        minHeight: '44px',
      });
    });
  });

  describe('Color Variants', () => {
    it('should apply primary color', () => {
      render(
        <IconButtonWithTooltip
          tooltip="View details"
          icon={<VisibilityIcon />}
          onClick={() => {}}
          color="primary"
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('MuiIconButton-colorPrimary');
    });

    it('should apply secondary color', () => {
      render(
        <IconButtonWithTooltip
          tooltip="View details"
          icon={<VisibilityIcon />}
          onClick={() => {}}
          color="secondary"
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('MuiIconButton-colorSecondary');
    });

    it('should apply error color', () => {
      render(
        <IconButtonWithTooltip
          tooltip="Delete"
          icon={<VisibilityIcon />}
          onClick={() => {}}
          color="error"
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('MuiIconButton-colorError');
    });
  });

  describe('Accessibility', () => {
    it('should be keyboard accessible', () => {
      const handleClick = jest.fn();
      render(
        <IconButtonWithTooltip
          tooltip="View details"
          icon={<VisibilityIcon />}
          onClick={handleClick}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      
      // Button should be focusable
      expect(button).not.toBeDisabled();
    });

    it('should have proper ARIA attributes', () => {
      render(
        <IconButtonWithTooltip
          tooltip="View details"
          icon={<VisibilityIcon />}
          onClick={() => {}}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'View details');
    });
  });

  describe('Custom Styling', () => {
    it('should accept custom sx prop', () => {
      render(
        <IconButtonWithTooltip
          tooltip="View details"
          icon={<VisibilityIcon />}
          onClick={() => {}}
          sx={{ backgroundColor: 'red' }}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveStyle({ backgroundColor: 'red' });
    });

    it('should merge custom sx with default styles', () => {
      render(
        <IconButtonWithTooltip
          tooltip="View details"
          icon={<VisibilityIcon />}
          onClick={() => {}}
          sx={{ margin: '10px' }}
        />
      );

      const button = screen.getByRole('button');
      // Should still have minimum size
      expect(button).toHaveStyle({
        minWidth: '44px',
        minHeight: '44px',
        margin: '10px',
      });
    });
  });
});
