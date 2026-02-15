/**
 * Unit tests for UrlStateManager
 * Requirements: 44.1, 44.2, 44.6, 44.7, 44.8, 44.9
 */

import { UrlStateManager } from '../UrlStateManager';

// Mock window.history methods
const mockReplaceState = jest.fn();
const mockPushState = jest.fn();

describe('UrlStateManager', () => {
  let manager: UrlStateManager;
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

    // Mock history methods
    window.history.replaceState = mockReplaceState;
    window.history.pushState = mockPushState;

    // Clear mocks
    mockReplaceState.mockClear();
    mockPushState.mockClear();

    // Create fresh manager instance
    manager = new UrlStateManager();
  });

  afterEach(() => {
    // Restore original location
    window.location = originalLocation;
    
    // Cleanup manager
    manager.destroy();
  });

  describe('URL Parameter Encoding/Decoding (Requirement 44.1, 44.9)', () => {
    it('should encode simple string parameters', (done) => {
      const state = { search: 'test query' };
      
      manager.updateUrl(state);

      // Wait for debounce
      setTimeout(() => {
        expect(mockReplaceState).toHaveBeenCalledWith(
          {},
          '',
          '/test?search=test+query'
        );
        done();
      }, 350);
    });

    it('should encode special characters properly', (done) => {
      const state = { filter: 'value&with=special' };
      
      manager.updateUrl(state);

      setTimeout(() => {
        const call = mockReplaceState.mock.calls[0];
        expect(call[2]).toContain('filter=value');
        expect(call[2]).toContain('with');
        expect(call[2]).toContain('special');
        done();
      }, 350);
    });

    it('should decode URL parameters correctly', () => {
      window.location.search = '?search=test+query&page=2';
      
      const state = manager.getStateFromUrl();
      
      expect(state.search).toBe('test query');
      expect(state.page).toBe(2);
    });

    it('should handle numeric parameters', () => {
      window.location.search = '?page=5&limit=100&offset=0';
      
      const state = manager.getStateFromUrl();
      
      expect(state.page).toBe(5);
      expect(state.limit).toBe(100);
      expect(state.offset).toBe(0);
    });

    it('should handle boolean parameters', () => {
      window.location.search = '?active=true&archived=false';
      
      const state = manager.getStateFromUrl();
      
      expect(state.active).toBe(true);
      expect(state.archived).toBe(false);
    });

    it('should sanitize dangerous characters', (done) => {
      const state = { search: '<script>alert("xss")</script>' };
      
      manager.updateUrl(state);

      setTimeout(() => {
        const call = mockReplaceState.mock.calls[0];
        expect(call[2]).not.toContain('<');
        expect(call[2]).not.toContain('>');
        expect(call[2]).not.toContain('"');
        done();
      }, 350);
    });
  });

  describe('Debouncing (Requirement 44.6)', () => {
    it('should debounce URL updates by 300ms', (done) => {
      manager.updateUrl({ search: 'first' });
      manager.updateUrl({ search: 'second' });
      manager.updateUrl({ search: 'third' });

      // Should not have called yet
      expect(mockReplaceState).not.toHaveBeenCalled();

      // Wait for debounce
      setTimeout(() => {
        // Should only call once with the last value
        expect(mockReplaceState).toHaveBeenCalledTimes(1);
        expect(mockReplaceState).toHaveBeenCalledWith(
          {},
          '',
          '/test?search=third'
        );
        done();
      }, 350);
    });

    it('should use custom debounce delay', (done) => {
      const customManager = new UrlStateManager({ debounceMs: 100 });
      
      customManager.updateUrl({ search: 'test' });

      setTimeout(() => {
        expect(mockReplaceState).not.toHaveBeenCalled();
      }, 50);

      setTimeout(() => {
        expect(mockReplaceState).toHaveBeenCalledTimes(1);
        customManager.destroy();
        done();
      }, 150);
    });

    it('should cancel pending updates on destroy', (done) => {
      manager.updateUrl({ search: 'test' });
      manager.destroy();

      setTimeout(() => {
        expect(mockReplaceState).not.toHaveBeenCalled();
        done();
      }, 350);
    });
  });

  describe('Array Parameter Handling (Requirement 44.7)', () => {
    it('should encode array parameters with multiple values', (done) => {
      const state = { tags: ['tag1', 'tag2', 'tag3'] };
      
      manager.updateUrl(state);

      setTimeout(() => {
        const call = mockReplaceState.mock.calls[0];
        const url = call[2];
        expect(url).toContain('tags=tag1');
        expect(url).toContain('tags=tag2');
        expect(url).toContain('tags=tag3');
        done();
      }, 350);
    });

    it('should decode array parameters correctly', () => {
      window.location.search = '?tags=tag1&tags=tag2&tags=tag3';
      
      const state = manager.getStateFromUrl();
      
      expect(Array.isArray(state.tags)).toBe(true);
      expect(state.tags).toEqual(['tag1', 'tag2', 'tag3']);
    });

    it('should handle numeric arrays', (done) => {
      const state = { ids: [1, 2, 3, 4, 5] };
      
      manager.updateUrl(state);

      setTimeout(() => {
        const call = mockReplaceState.mock.calls[0];
        const url = call[2];
        expect(url).toContain('ids=1');
        expect(url).toContain('ids=2');
        expect(url).toContain('ids=5');
        done();
      }, 350);
    });

    it('should handle empty arrays by removing parameter', (done) => {
      const state = { tags: [] };
      
      manager.updateUrl(state);

      setTimeout(() => {
        const call = mockReplaceState.mock.calls[0];
        expect(call[2]).toBe('/test');
        done();
      }, 350);
    });

    it('should filter out null/undefined values in arrays', (done) => {
      const state = { tags: ['tag1', null, 'tag2', undefined, 'tag3'] as any };
      
      manager.updateUrl(state);

      setTimeout(() => {
        const call = mockReplaceState.mock.calls[0];
        const url = call[2];
        expect(url).toContain('tags=tag1');
        expect(url).toContain('tags=tag2');
        expect(url).toContain('tags=tag3');
        expect(url).not.toContain('null');
        expect(url).not.toContain('undefined');
        done();
      }, 350);
    });
  });

  describe('Null/Empty Parameter Handling (Requirement 44.4)', () => {
    it('should remove null parameters from URL', (done) => {
      const state = { search: null, page: 2 };
      
      manager.updateUrl(state);

      setTimeout(() => {
        const call = mockReplaceState.mock.calls[0];
        expect(call[2]).toBe('/test?page=2');
        done();
      }, 350);
    });

    it('should remove undefined parameters from URL', (done) => {
      const state = { search: undefined, page: 2 };
      
      manager.updateUrl(state);

      setTimeout(() => {
        const call = mockReplaceState.mock.calls[0];
        expect(call[2]).toBe('/test?page=2');
        done();
      }, 350);
    });

    it('should remove empty string parameters from URL', (done) => {
      const state = { search: '', page: 2 };
      
      manager.updateUrl(state);

      setTimeout(() => {
        const call = mockReplaceState.mock.calls[0];
        expect(call[2]).toBe('/test?page=2');
        done();
      }, 350);
    });

    it('should clear URL when all parameters are null/empty', (done) => {
      const state = { search: null, filter: '', tags: [] };
      
      manager.updateUrl(state);

      setTimeout(() => {
        const call = mockReplaceState.mock.calls[0];
        expect(call[2]).toBe('/test');
        done();
      }, 350);
    });
  });

  describe('Validation and Sanitization (Requirement 44.8)', () => {
    it('should use custom validator', (done) => {
      const customManager = new UrlStateManager({
        validator: (key, value) => {
          // Only allow 'search' parameter
          return key === 'search' && value !== null && value !== '';
        },
      });

      const state = { search: 'test', page: 2, filter: 'active' };
      
      customManager.updateUrl(state);

      setTimeout(() => {
        const call = mockReplaceState.mock.calls[0];
        expect(call[2]).toBe('/test?search=test');
        customManager.destroy();
        done();
      }, 350);
    });

    it('should use custom sanitizer', (done) => {
      const customManager = new UrlStateManager({
        sanitizer: (key, value) => {
          if (typeof value === 'string') {
            return value.toUpperCase();
          }
          return value;
        },
      });

      const state = { search: 'test' };
      
      customManager.updateUrl(state);

      setTimeout(() => {
        const call = mockReplaceState.mock.calls[0];
        expect(call[2]).toContain('search=TEST');
        customManager.destroy();
        done();
      }, 350);
    });

    it('should validate parameters when reading from URL', () => {
      window.location.search = '?search=&page=2&filter=';
      
      const state = manager.getStateFromUrl();
      
      // Empty values should be filtered out
      expect(state.search).toBeUndefined();
      expect(state.filter).toBeUndefined();
      expect(state.page).toBe(2);
    });
  });

  describe('History Management (Requirement 44.2)', () => {
    it('should use replaceState by default', (done) => {
      manager.updateUrl({ search: 'test' });

      setTimeout(() => {
        expect(mockReplaceState).toHaveBeenCalledTimes(1);
        expect(mockPushState).not.toHaveBeenCalled();
        done();
      }, 350);
    });

    it('should use pushState when configured', (done) => {
      const pushManager = new UrlStateManager({ useReplaceState: false });
      
      pushManager.updateUrl({ search: 'test' });

      setTimeout(() => {
        expect(mockPushState).toHaveBeenCalledTimes(1);
        expect(mockReplaceState).not.toHaveBeenCalled();
        pushManager.destroy();
        done();
      }, 350);
    });
  });

  describe('State Synchronization (Requirement 44.3)', () => {
    it('should sync state from URL on initialization', () => {
      window.location.search = '?search=test&page=2&active=true';
      
      const defaultState = { search: '', page: 1, active: false };
      const syncedState = manager.syncFromUrl(defaultState);
      
      expect(syncedState.search).toBe('test');
      expect(syncedState.page).toBe(2);
      expect(syncedState.active).toBe(true);
    });

    it('should preserve default values for missing parameters', () => {
      window.location.search = '?search=test';
      
      const defaultState = { search: '', page: 1, limit: 10 };
      const syncedState = manager.syncFromUrl(defaultState);
      
      expect(syncedState.search).toBe('test');
      expect(syncedState.page).toBe(1);
      expect(syncedState.limit).toBe(10);
    });
  });

  describe('URL Utilities', () => {
    it('should get current URL', () => {
      window.location.href = 'http://localhost/test?search=query';
      
      const url = manager.getCurrentUrl();
      
      expect(url).toBe('http://localhost/test?search=query');
    });

    it('should clear all URL parameters', (done) => {
      window.location.search = '?search=test&page=2';
      
      manager.clearUrl();

      setTimeout(() => {
        expect(mockReplaceState).toHaveBeenCalledWith({}, '', '/test');
        done();
      }, 50);
    });

    it('should copy URL to clipboard', async () => {
      const mockWriteText = jest.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: mockWriteText,
        },
      });

      window.location.href = 'http://localhost/test?search=query';
      
      const result = await manager.copyUrlToClipboard();
      
      expect(result).toBe(true);
      expect(mockWriteText).toHaveBeenCalledWith('http://localhost/test?search=query');
    });

    it('should handle clipboard copy failure', async () => {
      const mockWriteText = jest.fn().mockRejectedValue(new Error('Permission denied'));
      Object.assign(navigator, {
        clipboard: {
          writeText: mockWriteText,
        },
      });

      const result = await manager.copyUrlToClipboard();
      
      expect(result).toBe(false);
    });
  });

  describe('Browser Navigation (Requirement 44.11)', () => {
    it('should listen for popstate events', () => {
      const callback = jest.fn();
      const cleanup = manager.onPopState(callback);

      // Simulate browser back/forward
      window.location.search = '?search=test';
      window.dispatchEvent(new PopStateEvent('popstate'));

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'test' })
      );

      // Cleanup
      cleanup();
    });

    it('should cleanup popstate listener', () => {
      const callback = jest.fn();
      const cleanup = manager.onPopState(callback);

      cleanup();

      // Should not call after cleanup
      window.dispatchEvent(new PopStateEvent('popstate'));
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('Complex State Scenarios', () => {
    it('should handle mixed parameter types', (done) => {
      const state = {
        search: 'test query',
        page: 2,
        active: true,
        tags: ['tag1', 'tag2'],
        limit: 50,
      };
      
      manager.updateUrl(state);

      setTimeout(() => {
        const call = mockReplaceState.mock.calls[0];
        const url = call[2];
        expect(url).toContain('search=test');
        expect(url).toContain('page=2');
        expect(url).toContain('active=true');
        expect(url).toContain('tags=tag1');
        expect(url).toContain('tags=tag2');
        expect(url).toContain('limit=50');
        done();
      }, 350);
    });

    it('should handle state updates with partial changes', (done) => {
      const state1 = { search: 'test', page: 1 };
      const state2 = { search: 'test', page: 2 };
      
      manager.updateUrl(state1);

      setTimeout(() => {
        manager.updateUrl(state2);

        setTimeout(() => {
          const call = mockReplaceState.mock.calls[1];
          expect(call[2]).toContain('search=test');
          expect(call[2]).toContain('page=2');
          done();
        }, 350);
      }, 350);
    });
  });
});
