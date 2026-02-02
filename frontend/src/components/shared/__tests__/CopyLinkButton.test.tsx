/**
 * Unit tests for CopyLinkButton component
 * Requirements: 44.12, 44.13, 44.14, 44.15
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CopyLinkButton, CopyLinkIconButton } from '../CopyLinkButton';
import { urlStateManager } from '../../../utils/UrlStateManager';

// Mock the urlStateManager
jest.mock('../../../utils/UrlStateManager', () => ({
  urlStateManager: {
    copyUrlToClipboard: jest.fn(),
    getCurrentUrl: jest.fn(),
  },
}));

describe('CopyLinkButton', () => {
  const mockCopyUrlToClipboard = urlStateManager.copyUrlToClipboard as jest.Mock;
  const mockGetCurrentUrl = urlStateManager.getCurrentUrl as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentUrl.mockReturnValue('http://localhost/test?search=query');
  });

  describe('Basic Rendering', () => {
    it('should render with default props', () => {
      render(<CopyLinkButton />);
      
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('Copy Link');
      expect(button).toHaveClass('btn-outline-primary');
      expect(button).toHaveClass('btn-sm');
    });

    it('should render with custom text', () => {
      render(<CopyLinkButton text="Share This View" />);
      
      expect(screen.getByText('Share This View')).toBeInTheDocument();
    });

    it('should render with custom variant', () => {
      render(<CopyLinkButton variant="primary" />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('btn-primary');
    });

    it('should render with custom size', () => {
      render(<CopyLinkButton size="lg" />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('btn-lg');
    });

    it('should render with custom className', () => {
      render(<CopyLinkButton className="custom-class" />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
    });

    it('should render with icon by default', () => {
      render(<CopyLinkButton />);
      
      const icon = screen.getByRole('button').querySelector('i');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass('bi-link-45deg');
    });

    it('should render without icon when showIcon is false', () => {
      render(<CopyLinkButton showIcon={false} />);
      
      const icon = screen.getByRole('button').querySelector('i');
      expect(icon).not.toBeInTheDocument();
    });
  });

  describe('Copy Functionality', () => {
    it('should copy URL to clipboard on click', async () => {
      mockCopyUrlToClipboard.mockResolvedValue(true);

      render(<CopyLinkButton />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockCopyUrlToClipboard).toHaveBeenCalledTimes(1);
      });
    });

    it('should show "Copied!" message after successful copy', async () => {
      mockCopyUrlToClipboard.mockResolvedValue(true);

      render(<CopyLinkButton />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(button).toHaveTextContent('Copied!');
      });

      // Check for success icon
      const icon = button.querySelector('i');
      expect(icon).toHaveClass('bi-check-circle-fill');
    });

    it('should reset to original state after 2 seconds', async () => {
      jest.useFakeTimers();
      mockCopyUrlToClipboard.mockResolvedValue(true);

      render(<CopyLinkButton />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(button).toHaveTextContent('Copied!');
      });

      // Fast-forward 2 seconds
      jest.advanceTimersByTime(2000);

      await waitFor(() => {
        expect(button).toHaveTextContent('Copy Link');
      });

      jest.useRealTimers();
    });

    it('should show "Copying..." state while copying', async () => {
      let resolvePromise: (value: boolean) => void;
      const promise = new Promise<boolean>((resolve) => {
        resolvePromise = resolve;
      });
      mockCopyUrlToClipboard.mockReturnValue(promise);

      render(<CopyLinkButton />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);

      // Should show copying state immediately
      expect(button).toHaveTextContent('Copying...');
      expect(button).toBeDisabled();

      // Resolve the promise
      resolvePromise!(true);

      await waitFor(() => {
        expect(button).toHaveTextContent('Copied!');
      });
    });

    it('should call onCopy callback with URL on success', async () => {
      mockCopyUrlToClipboard.mockResolvedValue(true);
      const onCopy = jest.fn();

      render(<CopyLinkButton onCopy={onCopy} />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(onCopy).toHaveBeenCalledWith('http://localhost/test?search=query');
      });
    });

    it('should call onError callback on failure', async () => {
      mockCopyUrlToClipboard.mockResolvedValue(false);
      const onError = jest.fn();

      render(<CopyLinkButton onError={onError} />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(onError).toHaveBeenCalled();
      });
    });

    it('should handle clipboard API errors gracefully', async () => {
      const error = new Error('Clipboard permission denied');
      mockCopyUrlToClipboard.mockRejectedValue(error);
      const onError = jest.fn();

      render(<CopyLinkButton onError={onError} />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(error);
      });
    });

    it('should prevent multiple simultaneous copy operations', async () => {
      let resolvePromise: (value: boolean) => void;
      const promise = new Promise<boolean>((resolve) => {
        resolvePromise = resolve;
      });
      mockCopyUrlToClipboard.mockReturnValue(promise);

      render(<CopyLinkButton />);
      
      const button = screen.getByRole('button');
      
      // Click multiple times rapidly
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);

      // Should only call once
      expect(mockCopyUrlToClipboard).toHaveBeenCalledTimes(1);

      // Resolve the promise
      resolvePromise!(true);

      await waitFor(() => {
        expect(button).toHaveTextContent('Copied!');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper title attribute', () => {
      render(<CopyLinkButton />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', 'Copy shareable link to clipboard');
    });

    it('should update title when copied', async () => {
      mockCopyUrlToClipboard.mockResolvedValue(true);

      render(<CopyLinkButton />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(button).toHaveAttribute('title', 'Link copied!');
      });
    });

    it('should be keyboard accessible', async () => {
      mockCopyUrlToClipboard.mockResolvedValue(true);

      render(<CopyLinkButton />);
      
      const button = screen.getByRole('button');
      
      // Simulate keyboard interaction
      button.focus();
      expect(button).toHaveFocus();
      
      fireEvent.keyDown(button, { key: 'Enter' });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockCopyUrlToClipboard).toHaveBeenCalled();
      });
    });
  });
});

describe('CopyLinkIconButton', () => {
  const mockCopyUrlToClipboard = urlStateManager.copyUrlToClipboard as jest.Mock;
  const mockGetCurrentUrl = urlStateManager.getCurrentUrl as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentUrl.mockReturnValue('http://localhost/test?search=query');
  });

  describe('Basic Rendering', () => {
    it('should render icon-only button', () => {
      render(<CopyLinkIconButton />);
      
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      
      const icon = button.querySelector('i');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass('bi-link-45deg');
      
      // Should not have text content (only icon)
      expect(button.textContent?.trim()).toBe('');
    });

    it('should have aria-label for accessibility', () => {
      render(<CopyLinkIconButton />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Copy link');
    });

    it('should update aria-label when copied', async () => {
      mockCopyUrlToClipboard.mockResolvedValue(true);

      render(<CopyLinkIconButton />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(button).toHaveAttribute('aria-label', 'Link copied');
      });
    });

    it('should show success icon when copied', async () => {
      mockCopyUrlToClipboard.mockResolvedValue(true);

      render(<CopyLinkIconButton />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        const icon = button.querySelector('i');
        expect(icon).toHaveClass('bi-check-circle-fill');
      });
    });

    it('should work with custom variant and size', () => {
      render(<CopyLinkIconButton variant="primary" size="lg" />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('btn-primary');
      expect(button).toHaveClass('btn-lg');
    });
  });

  describe('Copy Functionality', () => {
    it('should copy URL to clipboard on click', async () => {
      mockCopyUrlToClipboard.mockResolvedValue(true);

      render(<CopyLinkIconButton />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockCopyUrlToClipboard).toHaveBeenCalledTimes(1);
      });
    });

    it('should call onCopy callback with URL on success', async () => {
      mockCopyUrlToClipboard.mockResolvedValue(true);
      const onCopy = jest.fn();

      render(<CopyLinkIconButton onCopy={onCopy} />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(onCopy).toHaveBeenCalledWith('http://localhost/test?search=query');
      });
    });

    it('should call onError callback on failure', async () => {
      mockCopyUrlToClipboard.mockResolvedValue(false);
      const onError = jest.fn();

      render(<CopyLinkIconButton onError={onError} />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(onError).toHaveBeenCalled();
      });
    });
  });
});
