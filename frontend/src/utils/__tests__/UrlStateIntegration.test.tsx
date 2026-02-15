/**
 * Integration tests for URL state management across pages
 * Requirements: 44.3, 44.4, 44.5, 44.10, 44.11
 * 
 * Tests state restoration on load, browser navigation, and bookmark functionality
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { BrowserRouter, useSearchParams, useNavigate } from 'react-router-dom';
import { useUrlState, UrlStateManager } from '../UrlStateManager';

// Mock component that uses URL state
interface TestPageProps {
  onStateChange?: (state: any) => void;
}

const TestPage: React.FC<TestPageProps> = ({ onStateChange }) => {
  const [state, updateState, manager] = useUrlState({
    search: '',
    page: 1,
    active: false,
    tags: [] as string[],
  });

  React.useEffect(() => {
    if (onStateChange) {
      onStateChange(state);
    }
  }, [state, onStateChange]);

  return (
    <div>
      <div data-testid="search-value">{state.search}</div>
      <div data-testid="page-value">{state.page}</div>
      <div data-testid="active-value">{String(state.active)}</div>
      <div data-testid="tags-value">{state.tags.join(',')}</div>
      <button
        data-testid="update-search"
        onClick={() => updateState({ search: 'test query' })}
      >
        Update Search
      </button>
      <button
        data-testid="update-page"
        onClick={() => updateState({ page: 2 })}
      >
        Update Page
      </button>
      <button
        data-testid="update-active"
        onClick={() => updateState({ active: true })}
      >
        Update Active
      </button>
      <button
        data-testid="update-tags"
        onClick={() => updateState({ tags: ['tag1', 'tag2'] })}
      >
        Update Tags
      </button>
      <button
        data-testid="clear-search"
        onClick={() => updateState({ search: '' })}
      >
        Clear Search
      </button>
      <button
        data-testid="copy-url"
        onClick={() => manager.copyUrlToClipboard()}
      >
        Copy URL
      </button>
    </div>
  );
};

// Wrapper component with router
const TestWrapper: React.FC<{ children: React.ReactNode; initialUrl?: string }> = ({
  children,
  initialUrl = '/',
}) => {
  // Set initial URL
  React.useEffect(() => {
    if (initialUrl !== '/') {
      window.history.replaceState({}, '', initialUrl);
    }
  }, [initialUrl]);

  return <BrowserRouter>{children}</BrowserRouter>;
};

describe('URL State Integration', () => {
  let originalLocation: Location;

  beforeEach(() => {
    // Save original location
    originalLocation = window.location;

    // Mock window.location
    delete (window as any).location;
    window.location = {
      ...originalLocation,
      pathname: '/test',
      search: '',
      href: 'http://localhost/test',
    } as Location;

    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
    });
  });

  afterEach(() => {
    // Restore original location
    window.location = originalLocation;
  });

  describe('State Restoration on Load (Requirement 44.3)', () => {
    it('should restore filter state from URL on page load', async () => {
      // Set URL with parameters
      window.location.search = '?search=test&page=2&active=true';

      const stateCallback = jest.fn();

      render(
        <TestWrapper initialUrl="/test?search=test&page=2&active=true">
          <TestPage onStateChange={stateCallback} />
        </TestWrapper>
      );

      // Wait for initial state to be set
      await waitFor(() => {
        expect(stateCallback).toHaveBeenCalled();
      });

      // Verify state was restored from URL
      const lastCall = stateCallback.mock.calls[stateCallback.mock.calls.length - 1][0];
      expect(lastCall.search).toBe('test');
      expect(lastCall.page).toBe(2);
      expect(lastCall.active).toBe(true);
    });

    it('should restore array parameters from URL', async () => {
      window.location.search = '?tags=tag1&tags=tag2&tags=tag3';

      const stateCallback = jest.fn();

      render(
        <TestWrapper initialUrl="/test?tags=tag1&tags=tag2&tags=tag3">
          <TestPage onStateChange={stateCallback} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(stateCallback).toHaveBeenCalled();
      });

      const lastCall = stateCallback.mock.calls[stateCallback.mock.calls.length - 1][0];
      expect(Array.isArray(lastCall.tags)).toBe(true);
      expect(lastCall.tags).toEqual(['tag1', 'tag2', 'tag3']);
    });

    it('should use default values for missing URL parameters', async () => {
      window.location.search = '?search=test';

      const stateCallback = jest.fn();

      render(
        <TestWrapper initialUrl="/test?search=test">
          <TestPage onStateChange={stateCallback} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(stateCallback).toHaveBeenCalled();
      });

      const lastCall = stateCallback.mock.calls[stateCallback.mock.calls.length - 1][0];
      expect(lastCall.search).toBe('test');
      expect(lastCall.page).toBe(1); // Default value
      expect(lastCall.active).toBe(false); // Default value
      expect(lastCall.tags).toEqual([]); // Default value
    });

    it('should handle complex URL with multiple parameter types', async () => {
      window.location.search = '?search=test+query&page=5&active=true&tags=tag1&tags=tag2';

      const stateCallback = jest.fn();

      render(
        <TestWrapper initialUrl="/test?search=test+query&page=5&active=true&tags=tag1&tags=tag2">
          <TestPage onStateChange={stateCallback} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(stateCallback).toHaveBeenCalled();
      });

      const lastCall = stateCallback.mock.calls[stateCallback.mock.calls.length - 1][0];
      expect(lastCall.search).toBe('test query');
      expect(lastCall.page).toBe(5);
      expect(lastCall.active).toBe(true);
      expect(lastCall.tags).toEqual(['tag1', 'tag2']);
    });
  });

  describe('URL Updates on State Changes (Requirement 44.4, 44.5)', () => {
    it('should update URL when state changes', async () => {
      // Test the manager directly since React hooks don't trigger in test environment
      const manager = new UrlStateManager();
      const mockReplaceState = jest.fn();
      window.history.replaceState = mockReplaceState;

      manager.updateUrl({ search: 'test query', page: 1 });

      // Wait for debounce
      await new Promise((resolve) => setTimeout(resolve, 350));

      // Verify URL was updated
      expect(mockReplaceState).toHaveBeenCalled();
      const call = mockReplaceState.mock.calls[mockReplaceState.mock.calls.length - 1];
      expect(call[2]).toContain('search=test');

      manager.destroy();
    });

    it('should remove null/empty parameters from URL (Requirement 44.4)', async () => {
      const manager = new UrlStateManager();
      const mockReplaceState = jest.fn();
      window.history.replaceState = mockReplaceState;

      // First set some values
      manager.updateUrl({ search: 'test', page: 2 });
      await new Promise((resolve) => setTimeout(resolve, 350));

      // Then clear search
      manager.updateUrl({ search: '', page: 2 });
      await new Promise((resolve) => setTimeout(resolve, 350));

      // Verify empty search parameter was removed
      const calls = mockReplaceState.mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[2]).not.toContain('search=');
      expect(lastCall[2]).toContain('page=2');

      manager.destroy();
    });

    it('should handle multiple rapid state changes with debouncing', async () => {
      const manager = new UrlStateManager();
      const mockReplaceState = jest.fn();
      window.history.replaceState = mockReplaceState;

      // Make multiple rapid changes
      manager.updateUrl({ search: 'first' });
      manager.updateUrl({ search: 'second' });
      manager.updateUrl({ search: 'third', page: 2, active: true });

      // Wait for debounce
      await new Promise((resolve) => setTimeout(resolve, 350));

      // Should only update once due to debouncing
      expect(mockReplaceState).toHaveBeenCalledTimes(1);

      // Verify all changes are in the URL
      const call = mockReplaceState.mock.calls[0];
      expect(call[2]).toContain('search=third');
      expect(call[2]).toContain('page=2');
      expect(call[2]).toContain('active=true');

      manager.destroy();
    });
  });

  describe('Browser Navigation (Requirement 44.11)', () => {
    it('should maintain filter state on browser back/forward', async () => {
      const mockReplaceState = jest.fn();
      window.history.replaceState = mockReplaceState;

      const stateCallback = jest.fn();

      const { getByTestId } = render(
        <TestWrapper>
          <TestPage onStateChange={stateCallback} />
        </TestWrapper>
      );

      // Update state
      act(() => {
        getByTestId('update-search').click();
      });

      // Wait for URL update
      await waitFor(
        () => {
          expect(mockReplaceState).toHaveBeenCalled();
        },
        { timeout: 500 }
      );

      // Simulate browser back button by changing URL and firing popstate
      act(() => {
        window.location.search = '';
        window.dispatchEvent(new PopStateEvent('popstate'));
      });

      // Wait for state to update
      await waitFor(() => {
        const lastCall = stateCallback.mock.calls[stateCallback.mock.calls.length - 1][0];
        expect(lastCall.search).toBe('');
      });
    });

    it('should restore state when navigating forward', async () => {
      const stateCallback = jest.fn();

      render(
        <TestWrapper>
          <TestPage onStateChange={stateCallback} />
        </TestWrapper>
      );

      // Simulate browser forward button with URL parameters
      act(() => {
        window.location.search = '?search=forward&page=3';
        window.dispatchEvent(new PopStateEvent('popstate'));
      });

      // Wait for state to update
      await waitFor(() => {
        const lastCall = stateCallback.mock.calls[stateCallback.mock.calls.length - 1][0];
        expect(lastCall.search).toBe('forward');
        expect(lastCall.page).toBe(3);
      });
    });
  });

  describe('Bookmark Functionality (Requirement 44.10)', () => {
    it('should restore exact filter state when bookmark is opened', async () => {
      // Simulate opening a bookmarked URL with complex state
      const bookmarkedUrl = '/test?search=bookmarked&page=5&active=true&tags=tag1&tags=tag2&tags=tag3';
      window.location.search = '?search=bookmarked&page=5&active=true&tags=tag1&tags=tag2&tags=tag3';

      const stateCallback = jest.fn();

      render(
        <TestWrapper initialUrl={bookmarkedUrl}>
          <TestPage onStateChange={stateCallback} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(stateCallback).toHaveBeenCalled();
      });

      // Verify exact state restoration
      const lastCall = stateCallback.mock.calls[stateCallback.mock.calls.length - 1][0];
      expect(lastCall.search).toBe('bookmarked');
      expect(lastCall.page).toBe(5);
      expect(lastCall.active).toBe(true);
      expect(lastCall.tags).toEqual(['tag1', 'tag2', 'tag3']);
    });

    it('should generate shareable URL with all filters', async () => {
      const mockWriteText = jest.fn().mockResolvedValue(undefined);
      const mockReplaceState = jest.fn();
      
      Object.assign(navigator, {
        clipboard: {
          writeText: mockWriteText,
        },
      });
      
      window.history.replaceState = mockReplaceState;

      // Use manager directly
      const manager = new UrlStateManager();
      
      // Set some state
      manager.updateUrl({ search: 'test query', page: 2, tags: ['tag1', 'tag2'] });

      // Wait for URL update
      await new Promise((resolve) => setTimeout(resolve, 350));

      // Update window.location.href to reflect the new URL
      const lastCall = mockReplaceState.mock.calls[mockReplaceState.mock.calls.length - 1];
      window.location.href = `http://localhost${lastCall[2]}`;

      // Copy URL
      const result = await manager.copyUrlToClipboard();
      expect(result).toBe(true);

      // Verify URL contains all parameters
      const copiedUrl = mockWriteText.mock.calls[0][0];
      expect(copiedUrl).toContain('search=test');
      expect(copiedUrl).toContain('page=2');
      expect(copiedUrl).toContain('tags=tag1');
      expect(copiedUrl).toContain('tags=tag2');

      manager.destroy();
    });

    it('should handle bookmarks with special characters', async () => {
      const encodedUrl = '/test?search=test%20with%20spaces&filter=value%26special';
      window.location.search = '?search=test%20with%20spaces&filter=value%26special';

      const stateCallback = jest.fn();

      render(
        <TestWrapper initialUrl={encodedUrl}>
          <TestPage onStateChange={stateCallback} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(stateCallback).toHaveBeenCalled();
      });

      const lastCall = stateCallback.mock.calls[stateCallback.mock.calls.length - 1][0];
      expect(lastCall.search).toBe('test with spaces');
      // Note: sanitizer removes & character
      expect(lastCall.filter).toBeDefined();
    });
  });

  describe('Cross-Page Consistency', () => {
    it('should maintain state when navigating between pages', async () => {
      // This test simulates the behavior across different pages
      const manager = new UrlStateManager();
      const mockReplaceState = jest.fn();
      window.history.replaceState = mockReplaceState;

      // Set state on "page 1"
      const state1 = { search: 'test', page: 1, active: true };
      manager.updateUrl(state1);

      // Wait for debounce
      await new Promise((resolve) => setTimeout(resolve, 350));

      // Update window.location.search to reflect the change
      const lastCall = mockReplaceState.mock.calls[mockReplaceState.mock.calls.length - 1];
      if (lastCall && lastCall[2]) {
        const url = new URL(`http://localhost${lastCall[2]}`);
        window.location.search = url.search;
      }

      // Simulate navigation to "page 2" with same URL
      const restoredState = manager.getStateFromUrl();

      expect(restoredState.search).toBe('test');
      expect(restoredState.page).toBe(1);
      expect(restoredState.active).toBe(true);

      manager.destroy();
    });

    it('should handle page-specific parameters', async () => {
      const manager = new UrlStateManager();
      const mockReplaceState = jest.fn();
      window.history.replaceState = mockReplaceState;

      // Set state with page-specific parameters
      const state = {
        // Common parameters
        search: 'test',
        active: true,
        // Page-specific parameters
        viewMode: 'grid',
        sortBy: 'name',
      };

      manager.updateUrl(state);

      await new Promise((resolve) => setTimeout(resolve, 350));

      // Update window.location.search to reflect the change
      const lastCall = mockReplaceState.mock.calls[mockReplaceState.mock.calls.length - 1];
      if (lastCall && lastCall[2]) {
        const url = new URL(`http://localhost${lastCall[2]}`);
        window.location.search = url.search;
      }

      const restoredState = manager.getStateFromUrl();

      expect(restoredState.search).toBe('test');
      expect(restoredState.active).toBe(true);
      expect(restoredState.viewMode).toBe('grid');
      expect(restoredState.sortBy).toBe('name');

      manager.destroy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty URL gracefully', async () => {
      window.location.search = '';

      const stateCallback = jest.fn();

      render(
        <TestWrapper initialUrl="/test">
          <TestPage onStateChange={stateCallback} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(stateCallback).toHaveBeenCalled();
      });

      // Should use default values
      const lastCall = stateCallback.mock.calls[stateCallback.mock.calls.length - 1][0];
      expect(lastCall.search).toBe('');
      expect(lastCall.page).toBe(1);
      expect(lastCall.active).toBe(false);
      expect(lastCall.tags).toEqual([]);
    });

    it('should handle malformed URL parameters', async () => {
      window.location.search = '?page=invalid&active=notboolean';

      const stateCallback = jest.fn();

      render(
        <TestWrapper initialUrl="/test?page=invalid&active=notboolean">
          <TestPage onStateChange={stateCallback} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(stateCallback).toHaveBeenCalled();
      });

      const lastCall = stateCallback.mock.calls[stateCallback.mock.calls.length - 1][0];
      // Invalid number should be treated as string
      expect(lastCall.page).toBe('invalid');
      // Invalid boolean should be treated as string
      expect(lastCall.active).toBe('notboolean');
    });

    it('should handle very long URLs', async () => {
      const longSearch = 'a'.repeat(1000);
      window.location.search = `?search=${longSearch}`;

      const stateCallback = jest.fn();

      render(
        <TestWrapper initialUrl={`/test?search=${longSearch}`}>
          <TestPage onStateChange={stateCallback} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(stateCallback).toHaveBeenCalled();
      });

      const lastCall = stateCallback.mock.calls[stateCallback.mock.calls.length - 1][0];
      // Should handle long strings (after sanitization)
      expect(lastCall.search).toBeDefined();
      expect(typeof lastCall.search).toBe('string');
    });

    it('should handle duplicate parameter names correctly', async () => {
      // This should be treated as an array
      window.location.search = '?id=1&id=2&id=3';

      const manager = new UrlStateManager();
      const state = manager.getStateFromUrl();

      expect(Array.isArray(state.id)).toBe(true);
      expect(state.id).toEqual(['1', '2', '3']);

      manager.destroy();
    });
  });
});
