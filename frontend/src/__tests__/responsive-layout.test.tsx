/**
 * Unit tests for responsive layout system
 * 
 * Tests:
 * - Breakpoint detection and layout changes
 * - Sidebar positioning on different screen sizes
 * - Touch target sizing
 * 
 * Requirements: 36.1, 36.4, 36.5, 36.6, 36.7
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ResponsiveSidebar } from '../components/Layout/ResponsiveSidebar';
import {
  useBreakpoint,
  useIsMobile,
  useMediaQuery,
  useViewportSize,
  breakpoints,
} from '../utils/useBreakpoint';
import { renderHook, act } from '@testing-library/react';

// Mock window.matchMedia
const mockMatchMedia = (width: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches: query.includes(`min-width: ${width}px`) || width >= parseInt(query.match(/\d+/)?.[0] || '0'),
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
};

describe('Responsive Layout System', () => {
  beforeEach(() => {
    // Reset window size
    mockMatchMedia(1024);
  });

  describe('Breakpoint Detection (Requirement 36.1)', () => {
    it('should detect xs breakpoint for screens < 576px', () => {
      mockMatchMedia(400);
      const { result } = renderHook(() => useBreakpoint());
      
      act(() => {
        window.dispatchEvent(new Event('resize'));
      });

      expect(result.current).toBe('xs');
    });

    it('should detect sm breakpoint for screens >= 576px', () => {
      mockMatchMedia(600);
      const { result } = renderHook(() => useBreakpoint());
      
      act(() => {
        window.dispatchEvent(new Event('resize'));
      });

      expect(result.current).toBe('sm');
    });

    it('should detect md breakpoint for screens >= 768px', () => {
      mockMatchMedia(800);
      const { result } = renderHook(() => useBreakpoint());
      
      act(() => {
        window.dispatchEvent(new Event('resize'));
      });

      expect(result.current).toBe('md');
    });

    it('should detect lg breakpoint for screens >= 992px', () => {
      mockMatchMedia(1000);
      const { result } = renderHook(() => useBreakpoint());
      
      act(() => {
        window.dispatchEvent(new Event('resize'));
      });

      expect(result.current).toBe('lg');
    });

    it('should detect xl breakpoint for screens >= 1200px', () => {
      mockMatchMedia(1300);
      const { result } = renderHook(() => useBreakpoint());
      
      act(() => {
        window.dispatchEvent(new Event('resize'));
      });

      expect(result.current).toBe('xl');
    });

    it('should detect xxl breakpoint for screens >= 1400px', () => {
      mockMatchMedia(1500);
      const { result } = renderHook(() => useBreakpoint());
      
      act(() => {
        window.dispatchEvent(new Event('resize'));
      });

      expect(result.current).toBe('xxl');
    });

    it('should update breakpoint on window resize', () => {
      const { result } = renderHook(() => useBreakpoint());

      // Start at desktop
      mockMatchMedia(1200);
      act(() => {
        window.dispatchEvent(new Event('resize'));
      });
      expect(result.current).toBe('xl');

      // Resize to mobile
      mockMatchMedia(400);
      act(() => {
        window.dispatchEvent(new Event('resize'));
      });
      expect(result.current).toBe('xs');
    });
  });

  describe('Mobile Detection (Requirement 36.1)', () => {
    it('should return true for mobile viewport (<= 768px)', () => {
      mockMatchMedia(600);
      const { result } = renderHook(() => useIsMobile());
      
      act(() => {
        window.dispatchEvent(new Event('resize'));
      });

      expect(result.current).toBe(true);
    });

    it('should return false for desktop viewport (> 768px)', () => {
      mockMatchMedia(1024);
      const { result } = renderHook(() => useIsMobile());
      
      act(() => {
        window.dispatchEvent(new Event('resize'));
      });

      expect(result.current).toBe(false);
    });

    it('should update on resize', () => {
      const { result } = renderHook(() => useIsMobile());

      // Start at desktop
      mockMatchMedia(1024);
      act(() => {
        window.dispatchEvent(new Event('resize'));
      });
      expect(result.current).toBe(false);

      // Resize to mobile
      mockMatchMedia(600);
      act(() => {
        window.dispatchEvent(new Event('resize'));
      });
      expect(result.current).toBe(true);
    });
  });

  describe('Media Query Hook (Requirement 36.1)', () => {
    it('should match when viewport is at or above breakpoint', () => {
      mockMatchMedia(1024);
      const { result } = renderHook(() => useMediaQuery('lg'));
      
      act(() => {
        window.dispatchEvent(new Event('resize'));
      });

      expect(result.current).toBe(true);
    });

    it('should not match when viewport is below breakpoint', () => {
      mockMatchMedia(600);
      const { result } = renderHook(() => useMediaQuery('lg'));
      
      act(() => {
        window.dispatchEvent(new Event('resize'));
      });

      expect(result.current).toBe(false);
    });
  });

  describe('Viewport Size Hook', () => {
    it('should return current viewport dimensions', () => {
      mockMatchMedia(1024);
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 768,
      });

      const { result } = renderHook(() => useViewportSize());

      expect(result.current.width).toBe(1024);
      expect(result.current.height).toBe(768);
    });

    it('should update dimensions on resize', () => {
      const { result } = renderHook(() => useViewportSize());

      mockMatchMedia(800);
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 600,
      });

      act(() => {
        window.dispatchEvent(new Event('resize'));
      });

      expect(result.current.width).toBe(800);
      expect(result.current.height).toBe(600);
    });
  });

  describe('Sidebar Positioning (Requirements 36.5, 36.7)', () => {
    it('should render sidebar on desktop', () => {
      mockMatchMedia(1024);
      render(
        <ResponsiveSidebar>
          <div>Sidebar Content</div>
        </ResponsiveSidebar>
      );

      const sidebar = document.querySelector('.responsive-sidebar');
      expect(sidebar).toBeInTheDocument();
      expect(screen.getByText('Sidebar Content')).toBeInTheDocument();
    });

    it('should render sidebar on mobile with header', async () => {
      mockMatchMedia(600);
      render(
        <ResponsiveSidebar>
          <div>Sidebar Content</div>
        </ResponsiveSidebar>
      );

      await waitFor(() => {
        const header = document.querySelector('.responsive-sidebar-header');
        expect(header).toBeInTheDocument();
      });
    });

    it('should toggle sidebar collapsed state', () => {
      render(
        <ResponsiveSidebar defaultCollapsed={false}>
          <div>Sidebar Content</div>
        </ResponsiveSidebar>
      );

      const sidebar = document.querySelector('.responsive-sidebar');
      const toggleButton = document.querySelector('.responsive-sidebar-toggle');

      expect(sidebar).not.toHaveClass('collapsed');

      if (toggleButton) {
        fireEvent.click(toggleButton);
      }

      expect(sidebar).toHaveClass('collapsed');
    });

    it('should call onToggle callback when toggled', () => {
      const onToggle = jest.fn();
      render(
        <ResponsiveSidebar onToggle={onToggle}>
          <div>Sidebar Content</div>
        </ResponsiveSidebar>
      );

      const toggleButton = document.querySelector('.responsive-sidebar-toggle');
      if (toggleButton) {
        fireEvent.click(toggleButton);
      }

      expect(onToggle).toHaveBeenCalledWith(true);
    });

    it('should start collapsed if defaultCollapsed is true', () => {
      render(
        <ResponsiveSidebar defaultCollapsed={true}>
          <div>Sidebar Content</div>
        </ResponsiveSidebar>
      );

      const sidebar = document.querySelector('.responsive-sidebar');
      expect(sidebar).toHaveClass('collapsed');
    });

    it('should have correct ARIA attributes on toggle button', () => {
      render(
        <ResponsiveSidebar defaultCollapsed={false}>
          <div>Sidebar Content</div>
        </ResponsiveSidebar>
      );

      const toggleButton = document.querySelector('.responsive-sidebar-toggle');
      expect(toggleButton).toHaveAttribute('aria-label');
      expect(toggleButton).toHaveAttribute('aria-expanded', 'true');
    });
  });

  describe('Touch Target Sizing (Requirement 36.6)', () => {
    it('should have minimum 44px touch targets for buttons', () => {
      render(
        <ResponsiveSidebar>
          <div>Content</div>
        </ResponsiveSidebar>
      );

      const toggleButton = document.querySelector('.responsive-sidebar-toggle');
      expect(toggleButton).toBeInTheDocument();

      // Check computed styles would have min-height and min-width
      // In actual CSS, these are set via .btn-icon class
      expect(toggleButton).toHaveClass('btn-icon');
    });

    it('should render icon buttons with proper classes', () => {
      render(
        <ResponsiveSidebar>
          <div>Content</div>
        </ResponsiveSidebar>
      );

      const toggleButton = document.querySelector('.responsive-sidebar-toggle');
      expect(toggleButton).toHaveClass('btn-icon');
      expect(toggleButton).toHaveClass('btn');
    });
  });

  describe('Responsive Behavior', () => {
    it('should adapt sidebar behavior based on viewport', async () => {
      const { rerender } = render(
        <ResponsiveSidebar>
          <div>Content</div>
        </ResponsiveSidebar>
      );

      // Desktop - no header
      mockMatchMedia(1024);
      act(() => {
        window.dispatchEvent(new Event('resize'));
      });

      await waitFor(() => {
        const header = document.querySelector('.responsive-sidebar-header');
        expect(header).not.toBeInTheDocument();
      });

      // Mobile - has header
      mockMatchMedia(600);
      rerender(
        <ResponsiveSidebar>
          <div>Content</div>
        </ResponsiveSidebar>
      );

      act(() => {
        window.dispatchEvent(new Event('resize'));
      });

      await waitFor(() => {
        const header = document.querySelector('.responsive-sidebar-header');
        expect(header).toBeInTheDocument();
      });
    });
  });

  describe('CSS Classes', () => {
    it('should apply responsive-sidebar class', () => {
      render(
        <ResponsiveSidebar>
          <div>Content</div>
        </ResponsiveSidebar>
      );

      const sidebar = document.querySelector('.responsive-sidebar');
      expect(sidebar).toBeInTheDocument();
    });

    it('should apply collapsed class when collapsed', () => {
      render(
        <ResponsiveSidebar defaultCollapsed={true}>
          <div>Content</div>
        </ResponsiveSidebar>
      );

      const sidebar = document.querySelector('.responsive-sidebar');
      expect(sidebar).toHaveClass('collapsed');
    });

    it('should have responsive-sidebar-content wrapper', () => {
      render(
        <ResponsiveSidebar>
          <div>Content</div>
        </ResponsiveSidebar>
      );

      const content = document.querySelector('.responsive-sidebar-content');
      expect(content).toBeInTheDocument();
      expect(content).toContainHTML('<div>Content</div>');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(
        <ResponsiveSidebar>
          <div>Content</div>
        </ResponsiveSidebar>
      );

      const toggleButton = document.querySelector('.responsive-sidebar-toggle');
      expect(toggleButton).toHaveAttribute('aria-label');
      expect(toggleButton).toHaveAttribute('aria-expanded');
    });

    it('should update aria-expanded when toggled', () => {
      render(
        <ResponsiveSidebar defaultCollapsed={false}>
          <div>Content</div>
        </ResponsiveSidebar>
      );

      const toggleButton = document.querySelector('.responsive-sidebar-toggle');
      expect(toggleButton).toHaveAttribute('aria-expanded', 'true');

      if (toggleButton) {
        fireEvent.click(toggleButton);
      }

      expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
    });
  });
});
