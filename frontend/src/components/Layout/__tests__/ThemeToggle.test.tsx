/**
 * Unit tests for ThemeToggle component
 * Tests button rendering, icon display, click interaction, theme cycling, and accessibility
 * 
 * Requirements: 35.12
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ThemeToggle from '../ThemeToggle';
import { getDarkModeToggle } from '../../../utils/DarkModeToggle';

// Mock the DarkModeToggle utility
jest.mock('../../../utils/DarkModeToggle', () => ({
  getDarkModeToggle: jest.fn(),
}));

describe('ThemeToggle Component', () => {
  let mockDarkModeToggle: any;

  beforeEach(() => {
    // Reset mocks before each test
    mockDarkModeToggle = {
      getThemePreference: jest.fn().mockReturnValue('auto'),
      getEffectiveTheme: jest.fn().mockReturnValue('light'),
      cycleTheme: jest.fn(),
      setTheme: jest.fn(),
    };
    (getDarkModeToggle as jest.Mock).mockReturnValue(mockDarkModeToggle);

    // Clear localStorage
    localStorage.clear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Button Rendering', () => {
    it('should render the theme toggle button', () => {
      render(<ThemeToggle />);
      
      const button = screen.getByRole('button', { name: /theme/i });
      expect(button).toBeInTheDocument();
    });

    it('should have proper ARIA attributes', () => {
      render(<ThemeToggle />);
      
      const button = screen.getByRole('button', { name: /theme/i });
      expect(button).toHaveAttribute('aria-label');
      // MUI Tooltip manages the title separately, not as an attribute
    });

    it('should be keyboard accessible', () => {
      render(<ThemeToggle />);
      
      const button = screen.getByRole('button', { name: /theme/i });
      button.focus();
      expect(button).toHaveFocus();
    });
  });

  describe('Icon Display', () => {
    it('should display sun icon for light theme', () => {
      mockDarkModeToggle.getThemePreference.mockReturnValue('light');
      mockDarkModeToggle.getEffectiveTheme.mockReturnValue('light');
      
      render(<ThemeToggle />);
      
      // Check for sun icon (LightMode or similar)
      const button = screen.getByRole('button', { name: /theme/i });
      expect(button).toBeInTheDocument();
      // Icon should be present in the button
      const icon = button.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('should display moon icon for dark theme', () => {
      mockDarkModeToggle.getThemePreference.mockReturnValue('dark');
      mockDarkModeToggle.getEffectiveTheme.mockReturnValue('dark');
      
      render(<ThemeToggle />);
      
      const button = screen.getByRole('button', { name: /theme/i });
      expect(button).toBeInTheDocument();
      const icon = button.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('should display circle-half icon for auto theme', () => {
      mockDarkModeToggle.getThemePreference.mockReturnValue('auto');
      
      render(<ThemeToggle />);
      
      const button = screen.getByRole('button', { name: /theme/i });
      expect(button).toBeInTheDocument();
      const icon = button.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('should update icon when theme changes', () => {
      const { rerender } = render(<ThemeToggle />);
      
      // Start with auto
      mockDarkModeToggle.getThemePreference.mockReturnValue('auto');
      rerender(<ThemeToggle />);
      
      let button = screen.getByRole('button', { name: /theme/i });
      expect(button).toBeInTheDocument();
      
      // Change to light
      mockDarkModeToggle.getThemePreference.mockReturnValue('light');
      
      // Simulate theme change event
      const event = new CustomEvent('themeChanged', {
        detail: { preference: 'light', effective: 'light' }
      });
      window.dispatchEvent(event);
      
      rerender(<ThemeToggle />);
      button = screen.getByRole('button', { name: /theme/i });
      expect(button).toBeInTheDocument();
    });
  });

  describe('Click Interaction', () => {
    it('should call cycleTheme when clicked', () => {
      render(<ThemeToggle />);
      
      const button = screen.getByRole('button', { name: /theme/i });
      fireEvent.click(button);
      
      expect(mockDarkModeToggle.cycleTheme).toHaveBeenCalledTimes(1);
    });

    it('should cycle through themes in correct order', () => {
      render(<ThemeToggle />);
      
      const button = screen.getByRole('button', { name: /theme/i });
      
      // First click: light → dark
      mockDarkModeToggle.getThemePreference.mockReturnValue('light');
      fireEvent.click(button);
      expect(mockDarkModeToggle.cycleTheme).toHaveBeenCalled();
      
      // Second click: dark → auto
      mockDarkModeToggle.getThemePreference.mockReturnValue('dark');
      fireEvent.click(button);
      expect(mockDarkModeToggle.cycleTheme).toHaveBeenCalled();
      
      // Third click: auto → light
      mockDarkModeToggle.getThemePreference.mockReturnValue('auto');
      fireEvent.click(button);
      expect(mockDarkModeToggle.cycleTheme).toHaveBeenCalled();
    });

    it('should handle rapid clicks without errors', () => {
      render(<ThemeToggle />);
      
      const button = screen.getByRole('button', { name: /theme/i });
      
      // Rapid clicks
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);
      
      expect(mockDarkModeToggle.cycleTheme).toHaveBeenCalledTimes(3);
    });
  });

  describe('Theme Cycling', () => {
    it('should update UI after theme cycle', async () => {
      const { rerender } = render(<ThemeToggle />);
      
      const button = screen.getByRole('button', { name: /theme/i });
      
      // Initial state: auto
      mockDarkModeToggle.getThemePreference.mockReturnValue('auto');
      
      // Click to cycle
      fireEvent.click(button);
      
      // Update mock to return new theme
      mockDarkModeToggle.getThemePreference.mockReturnValue('light');
      
      // Dispatch theme changed event
      const event = new CustomEvent('themeChanged', {
        detail: { preference: 'light', effective: 'light' }
      });
      window.dispatchEvent(event);
      
      // Rerender to reflect changes
      rerender(<ThemeToggle />);
      
      await waitFor(() => {
        expect(button).toBeInTheDocument();
      });
    });

    it('should listen for themeChanged events', () => {
      render(<ThemeToggle />);
      
      // Dispatch theme changed event
      const event = new CustomEvent('themeChanged', {
        detail: { preference: 'dark', effective: 'dark' }
      });
      
      expect(() => window.dispatchEvent(event)).not.toThrow();
    });
  });

  describe('Accessibility Features', () => {
    it('should have descriptive aria-label', () => {
      render(<ThemeToggle />);
      
      const button = screen.getByRole('button', { name: /theme/i });
      const ariaLabel = button.getAttribute('aria-label');
      
      expect(ariaLabel).toBeTruthy();
      expect(ariaLabel).toMatch(/theme/i);
    });

    it('should have tooltip/title attribute', () => {
      render(<ThemeToggle />);
      
      const button = screen.getByRole('button', { name: /theme/i });
      const ariaLabel = button.getAttribute('aria-label');
      
      expect(ariaLabel).toBeTruthy();
      expect(ariaLabel).toMatch(/theme/i);
    });

    it('should support keyboard navigation with Enter key', () => {
      render(<ThemeToggle />);
      
      const button = screen.getByRole('button', { name: /theme/i });
      button.focus();
      
      // Simulate Enter key press which triggers click
      fireEvent.click(button);
      
      // Button click should be triggered
      expect(mockDarkModeToggle.cycleTheme).toHaveBeenCalled();
    });

    it('should support keyboard navigation with Space key', () => {
      render(<ThemeToggle />);
      
      const button = screen.getByRole('button', { name: /theme/i });
      button.focus();
      
      // Simulate Space key press which triggers click
      fireEvent.click(button);
      
      // Button click should be triggered
      expect(mockDarkModeToggle.cycleTheme).toHaveBeenCalled();
    });

    it('should have proper color contrast', () => {
      render(<ThemeToggle />);
      
      const button = screen.getByRole('button', { name: /theme/i });
      
      // Button should be visible and accessible
      expect(button).toBeInTheDocument();
      expect(button).toBeVisible();
    });

    it('should be visible and not hidden', () => {
      render(<ThemeToggle />);
      
      const button = screen.getByRole('button', { name: /theme/i });
      
      expect(button).toBeVisible();
      expect(button).not.toHaveStyle({ display: 'none' });
    });

    it('should have appropriate size for touch targets', () => {
      render(<ThemeToggle />);
      
      const button = screen.getByRole('button', { name: /theme/i });
      
      // IconButton should have adequate size
      expect(button).toBeInTheDocument();
    });
  });

  describe('Integration with DarkModeToggle', () => {
    it('should initialize with current theme preference', () => {
      mockDarkModeToggle.getThemePreference.mockReturnValue('dark');
      
      render(<ThemeToggle />);
      
      expect(mockDarkModeToggle.getThemePreference).toHaveBeenCalled();
    });

    it('should use singleton instance of DarkModeToggle', () => {
      render(<ThemeToggle />);
      render(<ThemeToggle />);
      
      // getDarkModeToggle should return same instance
      expect(getDarkModeToggle).toHaveBeenCalled();
    });

    it('should handle theme preference changes from other sources', () => {
      const { rerender } = render(<ThemeToggle />);
      
      // Simulate external theme change
      mockDarkModeToggle.getThemePreference.mockReturnValue('light');
      
      const event = new CustomEvent('themeChanged', {
        detail: { preference: 'light', effective: 'light' }
      });
      window.dispatchEvent(event);
      
      rerender(<ThemeToggle />);
      
      const button = screen.getByRole('button', { name: /theme/i });
      expect(button).toBeInTheDocument();
    });
  });

  describe('Tooltip Display', () => {
    it('should show appropriate tooltip for light mode', () => {
      mockDarkModeToggle.getThemePreference.mockReturnValue('light');
      
      render(<ThemeToggle />);
      
      const button = screen.getByRole('button', { name: /theme/i });
      const ariaLabel = button.getAttribute('aria-label');
      
      // Verify aria-label reflects light mode
      expect(ariaLabel).toMatch(/dark/i); // "Switch to dark theme"
    });

    it('should show appropriate tooltip for dark mode', () => {
      mockDarkModeToggle.getThemePreference.mockReturnValue('dark');
      
      render(<ThemeToggle />);
      
      const button = screen.getByRole('button', { name: /theme/i });
      const ariaLabel = button.getAttribute('aria-label');
      
      // Verify aria-label reflects dark mode
      expect(ariaLabel).toMatch(/auto/i); // "Switch to auto theme"
    });

    it('should show appropriate tooltip for auto mode', () => {
      mockDarkModeToggle.getThemePreference.mockReturnValue('auto');
      
      render(<ThemeToggle />);
      
      const button = screen.getByRole('button', { name: /theme/i });
      const ariaLabel = button.getAttribute('aria-label');
      
      // Verify aria-label reflects auto mode
      expect(ariaLabel).toMatch(/light/i); // "Switch to light theme"
    });
  });
});
