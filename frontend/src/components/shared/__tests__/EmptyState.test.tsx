/**
 * EmptyState Component Tests
 * Tests for consistent empty state display
 * Requirements: 43.15
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import EmptyState from '../EmptyState';
import SearchIcon from '@mui/icons-material/Search';

describe('EmptyState', () => {
  describe('Rendering', () => {
    it('should render with default title', () => {
      render(<EmptyState />);
      expect(screen.getByText('No data available')).toBeInTheDocument();
    });

    it('should render with custom title', () => {
      render(<EmptyState title="No results found" />);
      expect(screen.getByText('No results found')).toBeInTheDocument();
    });

    it('should render with message', () => {
      render(<EmptyState message="Try adjusting your filters" />);
      expect(screen.getByText('Try adjusting your filters')).toBeInTheDocument();
    });

    it('should render without message when not provided', () => {
      render(<EmptyState title="Empty" />);
      expect(screen.queryByText('Try adjusting')).not.toBeInTheDocument();
    });
  });

  describe('Icon Variants', () => {
    it('should render inbox icon by default', () => {
      const { container } = render(<EmptyState />);
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('should render search icon when specified', () => {
      const { container } = render(<EmptyState icon="search" />);
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('should render error icon when specified', () => {
      const { container } = render(<EmptyState icon="error" />);
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('should render info icon when specified', () => {
      const { container } = render(<EmptyState icon="info" />);
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('should render custom icon component', () => {
      const CustomIcon = <SearchIcon data-testid="custom-icon" />;
      render(<EmptyState icon={CustomIcon} />);
      expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('should render primary action button', () => {
      const handleAction = jest.fn();
      render(
        <EmptyState
          actionLabel="Add Item"
          onAction={handleAction}
        />
      );
      expect(screen.getByText('Add Item')).toBeInTheDocument();
    });

    it('should call onAction when primary button clicked', () => {
      const handleAction = jest.fn();
      render(
        <EmptyState
          actionLabel="Add Item"
          onAction={handleAction}
        />
      );
      fireEvent.click(screen.getByText('Add Item'));
      expect(handleAction).toHaveBeenCalledTimes(1);
    });

    it('should render secondary action button', () => {
      const handleSecondary = jest.fn();
      render(
        <EmptyState
          secondaryActionLabel="Learn More"
          onSecondaryAction={handleSecondary}
        />
      );
      expect(screen.getByText('Learn More')).toBeInTheDocument();
    });

    it('should call onSecondaryAction when secondary button clicked', () => {
      const handleSecondary = jest.fn();
      render(
        <EmptyState
          secondaryActionLabel="Learn More"
          onSecondaryAction={handleSecondary}
        />
      );
      fireEvent.click(screen.getByText('Learn More'));
      expect(handleSecondary).toHaveBeenCalledTimes(1);
    });

    it('should render both action buttons', () => {
      const handlePrimary = jest.fn();
      const handleSecondary = jest.fn();
      render(
        <EmptyState
          actionLabel="Add Item"
          onAction={handlePrimary}
          secondaryActionLabel="Learn More"
          onSecondaryAction={handleSecondary}
        />
      );
      expect(screen.getByText('Add Item')).toBeInTheDocument();
      expect(screen.getByText('Learn More')).toBeInTheDocument();
    });

    it('should not render buttons when no action provided', () => {
      render(<EmptyState />);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('should not render primary button when only label provided', () => {
      render(<EmptyState actionLabel="Add Item" />);
      expect(screen.queryByText('Add Item')).not.toBeInTheDocument();
    });

    it('should not render secondary button when only label provided', () => {
      render(<EmptyState secondaryActionLabel="Learn More" />);
      expect(screen.queryByText('Learn More')).not.toBeInTheDocument();
    });
  });

  describe('Layout', () => {
    it('should have default minimum height', () => {
      const { container } = render(<EmptyState />);
      const box = container.firstChild;
      expect(box).toHaveStyle({ minHeight: '300px' });
    });

    it('should accept custom minimum height as number', () => {
      const { container } = render(<EmptyState minHeight={500} />);
      const box = container.firstChild;
      expect(box).toHaveStyle({ minHeight: '500px' });
    });

    it('should accept custom minimum height as string', () => {
      const { container } = render(<EmptyState minHeight="50vh" />);
      const box = container.firstChild;
      expect(box).toHaveStyle({ minHeight: '50vh' });
    });

    it('should center content', () => {
      const { container } = render(<EmptyState />);
      const box = container.firstChild;
      expect(box).toHaveStyle({
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      });
    });

    it('should have text centered', () => {
      const { container } = render(<EmptyState />);
      const box = container.firstChild;
      expect(box).toHaveStyle({ textAlign: 'center' });
    });
  });

  describe('Complete Examples', () => {
    it('should render complete empty search state', () => {
      const handleClear = jest.fn();
      render(
        <EmptyState
          title="No results found"
          message="We couldn't find any items matching your search criteria"
          icon="search"
          actionLabel="Clear Filters"
          onAction={handleClear}
        />
      );

      expect(screen.getByText('No results found')).toBeInTheDocument();
      expect(screen.getByText("We couldn't find any items matching your search criteria")).toBeInTheDocument();
      expect(screen.getByText('Clear Filters')).toBeInTheDocument();
    });

    it('should render complete error state', () => {
      const handleRetry = jest.fn();
      const handleSupport = jest.fn();
      render(
        <EmptyState
          title="Something went wrong"
          message="We encountered an error while loading your data"
          icon="error"
          actionLabel="Try Again"
          onAction={handleRetry}
          secondaryActionLabel="Contact Support"
          onSecondaryAction={handleSupport}
        />
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('We encountered an error while loading your data')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
      expect(screen.getByText('Contact Support')).toBeInTheDocument();
    });

    it('should render complete info state', () => {
      const handleLearnMore = jest.fn();
      render(
        <EmptyState
          title="Get started"
          message="Add your first item to begin using this feature"
          icon="info"
          actionLabel="Add Item"
          onAction={handleLearnMore}
        />
      );

      expect(screen.getByText('Get started')).toBeInTheDocument();
      expect(screen.getByText('Add your first item to begin using this feature')).toBeInTheDocument();
      expect(screen.getByText('Add Item')).toBeInTheDocument();
    });
  });

  describe('Button Variants', () => {
    it('should render primary button with contained variant', () => {
      const { container } = render(
        <EmptyState
          actionLabel="Primary Action"
          onAction={() => {}}
        />
      );
      const button = container.querySelector('.MuiButton-contained');
      expect(button).toBeInTheDocument();
    });

    it('should render secondary button with outlined variant', () => {
      const { container } = render(
        <EmptyState
          secondaryActionLabel="Secondary Action"
          onSecondaryAction={() => {}}
        />
      );
      const button = container.querySelector('.MuiButton-outlined');
      expect(button).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      render(<EmptyState title="No data" />);
      const heading = screen.getByText('No data');
      expect(heading.tagName).toBe('H6');
    });

    it('should have descriptive text for screen readers', () => {
      render(
        <EmptyState
          title="Empty inbox"
          message="You have no messages"
        />
      );
      expect(screen.getByText('Empty inbox')).toBeInTheDocument();
      expect(screen.getByText('You have no messages')).toBeInTheDocument();
    });

    it('should have accessible buttons', () => {
      render(
        <EmptyState
          actionLabel="Add Item"
          onAction={() => {}}
        />
      );
      const button = screen.getByRole('button', { name: 'Add Item' });
      expect(button).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long title', () => {
      const longTitle = 'This is a very long title that might wrap to multiple lines in the empty state component';
      render(<EmptyState title={longTitle} />);
      expect(screen.getByText(longTitle)).toBeInTheDocument();
    });

    it('should handle very long message', () => {
      const longMessage = 'This is a very long message that provides detailed information about why the state is empty and what the user can do about it. It should wrap properly and remain readable.';
      render(<EmptyState message={longMessage} />);
      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });

    it('should handle empty strings', () => {
      render(<EmptyState title="" message="" />);
      expect(screen.queryByRole('heading')).toBeInTheDocument();
    });
  });
});
