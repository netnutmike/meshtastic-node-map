/**
 * LoadingSpinner Component Tests
 * Tests for consistent loading state indicator
 * Requirements: 43.14
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import LoadingSpinner from '../LoadingSpinner';

describe('LoadingSpinner', () => {
  describe('Rendering', () => {
    it('should render with default message', () => {
      render(<LoadingSpinner />);
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should render with custom message', () => {
      render(<LoadingSpinner message="Fetching data..." />);
      expect(screen.getByText('Fetching data...')).toBeInTheDocument();
    });

    it('should render without message when empty string provided', () => {
      render(<LoadingSpinner message="" />);
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    it('should render spinner element', () => {
      const { container } = render(<LoadingSpinner />);
      const spinner = container.querySelector('.MuiCircularProgress-root');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Size Variants', () => {
    it('should render with small size', () => {
      const { container } = render(<LoadingSpinner size="small" />);
      const spinner = container.querySelector('.MuiCircularProgress-root');
      expect(spinner).toBeInTheDocument();
      // Small size should be 24px
      expect(spinner).toHaveStyle({ width: '24px', height: '24px' });
    });

    it('should render with medium size', () => {
      const { container } = render(<LoadingSpinner size="medium" />);
      const spinner = container.querySelector('.MuiCircularProgress-root');
      expect(spinner).toBeInTheDocument();
      // Medium size should be 40px
      expect(spinner).toHaveStyle({ width: '40px', height: '40px' });
    });

    it('should render with large size', () => {
      const { container } = render(<LoadingSpinner size="large" />);
      const spinner = container.querySelector('.MuiCircularProgress-root');
      expect(spinner).toBeInTheDocument();
      // Large size should be 64px
      expect(spinner).toHaveStyle({ width: '64px', height: '64px' });
    });

    it('should render with custom numeric size', () => {
      const { container } = render(<LoadingSpinner size={50} />);
      const spinner = container.querySelector('.MuiCircularProgress-root');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveStyle({ width: '50px', height: '50px' });
    });
  });

  describe('Color Variants', () => {
    it('should render with primary color by default', () => {
      const { container } = render(<LoadingSpinner />);
      const spinner = container.querySelector('.MuiCircularProgress-colorPrimary');
      expect(spinner).toBeInTheDocument();
    });

    it('should render with secondary color', () => {
      const { container } = render(<LoadingSpinner color="secondary" />);
      const spinner = container.querySelector('.MuiCircularProgress-colorSecondary');
      expect(spinner).toBeInTheDocument();
    });

    it('should render with inherit color', () => {
      const { container } = render(<LoadingSpinner color="inherit" />);
      const spinner = container.querySelector('.MuiCircularProgress-colorInherit');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Full Screen Mode', () => {
    it('should render with full screen height when fullScreen is true', () => {
      const { container } = render(<LoadingSpinner fullScreen={true} />);
      const stack = container.querySelector('.MuiStack-root');
      expect(stack).toHaveStyle({ minHeight: '100vh' });
    });

    it('should render with default height when fullScreen is false', () => {
      const { container } = render(<LoadingSpinner fullScreen={false} />);
      const stack = container.querySelector('.MuiStack-root');
      expect(stack).toHaveStyle({ minHeight: '200px' });
    });
  });

  describe('Overlay Mode', () => {
    it('should render overlay when overlay is true', () => {
      const { container } = render(<LoadingSpinner overlay={true} />);
      const overlay = container.querySelector('[style*="position: fixed"]');
      expect(overlay).toBeInTheDocument();
    });

    it('should not render overlay when overlay is false', () => {
      const { container } = render(<LoadingSpinner overlay={false} />);
      const overlay = container.querySelector('[style*="position: fixed"]');
      expect(overlay).not.toBeInTheDocument();
    });

    it('should render overlay with semi-transparent background', () => {
      const { container } = render(<LoadingSpinner overlay={true} />);
      const overlay = container.querySelector('[style*="position: fixed"]');
      expect(overlay).toHaveStyle({
        backgroundColor: 'rgba(0, 0, 0, 0.5)'
      });
    });

    it('should render overlay with high z-index', () => {
      const { container } = render(<LoadingSpinner overlay={true} />);
      const overlay = container.querySelector('[style*="position: fixed"]');
      expect(overlay).toHaveStyle({ zIndex: '9999' });
    });

    it('should render content box inside overlay', () => {
      const { container } = render(<LoadingSpinner overlay={true} message="Loading..." />);
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      const contentBox = container.querySelector('[style*="background-color"]');
      expect(contentBox).toBeInTheDocument();
    });
  });

  describe('Layout', () => {
    it('should center content vertically and horizontally', () => {
      const { container } = render(<LoadingSpinner />);
      const stack = container.querySelector('.MuiStack-root');
      expect(stack).toHaveStyle({
        alignItems: 'center',
        justifyContent: 'center'
      });
    });

    it('should have full width', () => {
      const { container } = render(<LoadingSpinner />);
      const stack = container.querySelector('.MuiStack-root');
      expect(stack).toHaveStyle({ width: '100%' });
    });
  });

  describe('Accessibility', () => {
    it('should have appropriate ARIA attributes', () => {
      const { container } = render(<LoadingSpinner />);
      const spinner = container.querySelector('.MuiCircularProgress-root');
      expect(spinner).toHaveAttribute('role', 'progressbar');
    });

    it('should provide text alternative through message', () => {
      render(<LoadingSpinner message="Loading data, please wait..." />);
      expect(screen.getByText('Loading data, please wait...')).toBeInTheDocument();
    });
  });

  describe('Combined Props', () => {
    it('should handle fullScreen and overlay together', () => {
      const { container } = render(
        <LoadingSpinner fullScreen={true} overlay={true} />
      );
      const overlay = container.querySelector('[style*="position: fixed"]');
      expect(overlay).toBeInTheDocument();
      const stack = container.querySelector('.MuiStack-root');
      expect(stack).toHaveStyle({ minHeight: '100vh' });
    });

    it('should handle custom size with custom message', () => {
      const { container } = render(
        <LoadingSpinner size={80} message="Processing..." />
      );
      const spinner = container.querySelector('.MuiCircularProgress-root');
      expect(spinner).toHaveStyle({ width: '80px', height: '80px' });
      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });

    it('should handle all props together', () => {
      const { container } = render(
        <LoadingSpinner
          message="Custom loading message"
          size="large"
          fullScreen={true}
          overlay={true}
          color="secondary"
        />
      );
      expect(screen.getByText('Custom loading message')).toBeInTheDocument();
      const spinner = container.querySelector('.MuiCircularProgress-colorSecondary');
      expect(spinner).toBeInTheDocument();
    });
  });
});
