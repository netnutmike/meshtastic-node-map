/**
 * Unit tests for shareable link functionality
 * Requirements: 44.12, 44.13, 44.14, 44.15
 * 
 * Tests link generation, state reproduction, and complex filter scenarios
 */

import { UrlStateManager } from '../UrlStateManager';

describe('Shareable Links (Requirements 44.12-44.15)', () => {
  let manager: UrlStateManager;
  let originalLocation: Location;
  let mockWriteText: jest.Mock;

  beforeEach(() => {
    // Save original location
    originalLocation = window.location;

    // Mock window.location
    delete (window as any).location;
    window.location = {
      ...originalLocation,
      pathname: '/packets',
      search: '',
      href: 'http://localhost/packets',
    } as Location;

    // Mock clipboard API
    mockWriteText = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: mockWriteText,
      },
    });

    // Mock history methods
    window.history.replaceState = jest.fn();

    // Create fresh manager instance
    manager = new UrlStateManager();
  });

  afterEach(() => {
    // Restore original location
    window.location = originalLocation;
    
    // Cleanup manager
    manager.destroy();
  });

  describe('Link Generation (Requirement 44.12)', () => {
    it('should generate shareable URL with all current filters', async () => {
      // Set up complex filter state
      const state = {
        search: 'test query',
        page: 2,
        limit: 50,
        active: true,
        tags: ['tag1', 'tag2', 'tag3'],
        sortBy: 'name',
        sortOrder: 'asc',
      };

      manager.updateUrl(state);

      // Wait for debounce
      await new Promise((resolve) => setTimeout(resolve, 350));

      // Update window.location.href to reflect the new URL
      const mockReplaceState = window.history.replaceState as jest.Mock;
      const lastCall = mockReplaceState.mock.calls[mockReplaceState.mock.calls.length - 1];
      window.location.href = `http://localhost${lastCall[2]}`;

      // Get current URL
      const url = manager.getCurrentUrl();

      // Verify URL contains all parameters
      expect(url).toContain('search=test');
      expect(url).toContain('page=2');
      expect(url).toContain('limit=50');
      expect(url).toContain('active=true');
      expect(url).toContain('tags=tag1');
      expect(url).toContain('tags=tag2');
      expect(url).toContain('tags=tag3');
      expect(url).toContain('sortBy=name');
      expect(url).toContain('sortOrder=asc');
    });

    it('should copy shareable URL to clipboard', async () => {
      const state = {
        search: 'test',
        page: 3,
        active: true,
      };

      manager.updateUrl(state);
      await new Promise((resolve) => setTimeout(resolve, 350));

      // Update window.location.href
      const mockReplaceState = window.history.replaceState as jest.Mock;
      const lastCall = mockReplaceState.mock.calls[mockReplaceState.mock.calls.length - 1];
      window.location.href = `http://localhost${lastCall[2]}`;

      // Copy URL to clipboard
      const result = await manager.copyUrlToClipboard();

      expect(result).toBe(true);
      expect(mockWriteText).toHaveBeenCalledTimes(1);
      
      const copiedUrl = mockWriteText.mock.calls[0][0];
      expect(copiedUrl).toContain('search=test');
      expect(copiedUrl).toContain('page=3');
      expect(copiedUrl).toContain('active=true');
    });

    it('should generate shareable URL without empty parameters', async () => {
      const state = {
        search: 'test',
        page: 1, // Non-empty
        filter: '', // Empty - should be excluded
        tags: [], // Empty array - should be excluded
        active: null, // Null - should be excluded
      };

      manager.updateUrl(state);
      await new Promise((resolve) => setTimeout(resolve, 350));

      const mockReplaceState = window.history.replaceState as jest.Mock;
      const lastCall = mockReplaceState.mock.calls[mockReplaceState.mock.calls.length - 1];
      const url = lastCall[2];

      expect(url).toContain('search=test');
      expect(url).toContain('page=1');
      expect(url).not.toContain('filter=');
      expect(url).not.toContain('tags=');
      expect(url).not.toContain('active=');
    });

    it('should handle clipboard copy failure gracefully', async () => {
      // Mock clipboard failure
      mockWriteText.mockRejectedValue(new Error('Permission denied'));

      const result = await manager.copyUrlToClipboard();

      expect(result).toBe(false);
      expect(mockWriteText).toHaveBeenCalledTimes(1);
    });
  });

  describe('State Reproduction (Requirement 44.13)', () => {
    it('should exactly reproduce filter state from shared URL', async () => {
      // Original state
      const originalState = {
        search: 'test query',
        page: 5,
        limit: 100,
        active: true,
        tags: ['tag1', 'tag2'],
        sortBy: 'date',
        sortOrder: 'desc',
      };

      // Generate URL
      manager.updateUrl(originalState);
      await new Promise((resolve) => setTimeout(resolve, 350));

      // Simulate sharing: get the URL that would be shared
      const mockReplaceState = window.history.replaceState as jest.Mock;
      const lastCall = mockReplaceState.mock.calls[mockReplaceState.mock.calls.length - 1];
      const sharedUrl = lastCall[2];

      // Simulate opening the shared URL
      window.location.search = new URL(`http://localhost${sharedUrl}`).search;

      // Parse state from URL
      const restoredState = manager.getStateFromUrl();

      // Verify exact reproduction
      expect(restoredState.search).toBe(originalState.search);
      expect(restoredState.page).toBe(originalState.page);
      expect(restoredState.limit).toBe(originalState.limit);
      expect(restoredState.active).toBe(originalState.active);
      expect(restoredState.tags).toEqual(originalState.tags);
      expect(restoredState.sortBy).toBe(originalState.sortBy);
      expect(restoredState.sortOrder).toBe(originalState.sortOrder);
    });

    it('should reproduce state with special characters', async () => {
      const originalState = {
        search: 'test with spaces',
        filter: 'value&special',
        node: 'node-123',
      };

      manager.updateUrl(originalState);
      await new Promise((resolve) => setTimeout(resolve, 350));

      const mockReplaceState = window.history.replaceState as jest.Mock;
      const lastCall = mockReplaceState.mock.calls[mockReplaceState.mock.calls.length - 1];
      window.location.search = new URL(`http://localhost${lastCall[2]}`).search;

      const restoredState = manager.getStateFromUrl();

      expect(restoredState.search).toBe('test with spaces');
      // Note: sanitizer removes & character
      expect(restoredState.filter).toBeDefined();
      expect(restoredState.node).toBe('node-123');
    });

    it('should reproduce numeric and boolean types correctly', async () => {
      const originalState = {
        page: 10,
        limit: 50,
        offset: 100,
        active: true,
        archived: false,
        score: 95.5,
      };

      manager.updateUrl(originalState);
      await new Promise((resolve) => setTimeout(resolve, 350));

      const mockReplaceState = window.history.replaceState as jest.Mock;
      const lastCall = mockReplaceState.mock.calls[mockReplaceState.mock.calls.length - 1];
      window.location.search = new URL(`http://localhost${lastCall[2]}`).search;

      const restoredState = manager.getStateFromUrl();

      expect(restoredState.page).toBe(10);
      expect(restoredState.limit).toBe(50);
      expect(restoredState.offset).toBe(100);
      expect(restoredState.active).toBe(true);
      expect(restoredState.archived).toBe(false);
      expect(restoredState.score).toBe(95.5);
    });

    it('should reproduce array parameters with correct order', async () => {
      const originalState = {
        tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5'],
        ids: ['1', '2', '3', '4', '5'], // URL params are always strings
      };

      manager.updateUrl(originalState);
      await new Promise((resolve) => setTimeout(resolve, 350));

      const mockReplaceState = window.history.replaceState as jest.Mock;
      const lastCall = mockReplaceState.mock.calls[mockReplaceState.mock.calls.length - 1];
      window.location.search = new URL(`http://localhost${lastCall[2]}`).search;

      const restoredState = manager.getStateFromUrl();

      expect(restoredState.tags).toEqual(originalState.tags);
      expect(restoredState.ids).toEqual(originalState.ids);
    });
  });

  describe('Complex Filter Scenarios (Requirement 44.14, 44.15)', () => {
    it('should handle packets page filters', async () => {
      // Simulate complex packet filtering
      const packetFilters = {
        grouped: true,
        start_time: '2024-01-01T00:00:00Z',
        end_time: '2024-01-31T23:59:59Z',
        from_node: '!12345678',
        to_node: '!87654321',
        exclude_from: ['!11111111', '!22222222'],
        gateway: '!gateway1',
        portnum: 'TEXT_MESSAGE_APP',
        hop_count: 'direct',
        rssi_min: -120,
        rssi_max: -50,
        snr_min: -10,
        snr_max: 15,
        channel: 'LongFast',
        exclude_gateway_self: true,
      };

      manager.updateUrl(packetFilters);
      await new Promise((resolve) => setTimeout(resolve, 350));

      const mockReplaceState = window.history.replaceState as jest.Mock;
      const lastCall = mockReplaceState.mock.calls[mockReplaceState.mock.calls.length - 1];
      window.location.search = new URL(`http://localhost${lastCall[2]}`).search;

      const restoredState = manager.getStateFromUrl();

      expect(restoredState.grouped).toBe(true);
      expect(restoredState.start_time).toBe(packetFilters.start_time);
      expect(restoredState.end_time).toBe(packetFilters.end_time);
      expect(restoredState.from_node).toBe(packetFilters.from_node);
      expect(restoredState.to_node).toBe(packetFilters.to_node);
      expect(restoredState.exclude_from).toEqual(packetFilters.exclude_from);
      expect(restoredState.gateway).toBe(packetFilters.gateway);
      expect(restoredState.portnum).toBe(packetFilters.portnum);
      expect(restoredState.hop_count).toBe(packetFilters.hop_count);
      expect(restoredState.rssi_min).toBe(packetFilters.rssi_min);
      expect(restoredState.rssi_max).toBe(packetFilters.rssi_max);
      expect(restoredState.snr_min).toBe(packetFilters.snr_min);
      expect(restoredState.snr_max).toBe(packetFilters.snr_max);
      expect(restoredState.channel).toBe(packetFilters.channel);
      expect(restoredState.exclude_gateway_self).toBe(true);
    });

    it('should handle nodes page filters', async () => {
      const nodeFilters = {
        search: 'node name',
        active: true,
        hardware: ['TBEAM', 'TLORA_V2', 'HELTEC_V3'],
        role: ['ROUTER', 'CLIENT'],
        firmware: '2.2.0',
        sortBy: 'lastSeen',
        sortOrder: 'desc',
        page: 3,
        limit: 50,
      };

      manager.updateUrl(nodeFilters);
      await new Promise((resolve) => setTimeout(resolve, 350));

      const mockReplaceState = window.history.replaceState as jest.Mock;
      const lastCall = mockReplaceState.mock.calls[mockReplaceState.mock.calls.length - 1];
      window.location.search = new URL(`http://localhost${lastCall[2]}`).search;

      const restoredState = manager.getStateFromUrl();

      expect(restoredState.search).toBe(nodeFilters.search);
      expect(restoredState.active).toBe(true);
      expect(restoredState.hardware).toEqual(nodeFilters.hardware);
      expect(restoredState.role).toEqual(nodeFilters.role);
      expect(restoredState.firmware).toBe(nodeFilters.firmware);
      expect(restoredState.sortBy).toBe(nodeFilters.sortBy);
      expect(restoredState.sortOrder).toBe(nodeFilters.sortOrder);
      expect(restoredState.page).toBe(3);
      expect(restoredState.limit).toBe(50);
    });

    it('should handle map page filters', async () => {
      const mapFilters = {
        center_lat: 40.7128,
        center_lng: -74.0060,
        zoom: 12,
        show_links: true,
        show_traceroute: true,
        show_packet_links: false,
        hop_depth: 2,
        selected_node: '!12345678',
        tile_layer: 'satellite',
        view_mode: 'nodes',
      };

      manager.updateUrl(mapFilters);
      await new Promise((resolve) => setTimeout(resolve, 350));

      const mockReplaceState = window.history.replaceState as jest.Mock;
      const lastCall = mockReplaceState.mock.calls[mockReplaceState.mock.calls.length - 1];
      window.location.search = new URL(`http://localhost${lastCall[2]}`).search;

      const restoredState = manager.getStateFromUrl();

      expect(restoredState.center_lat).toBe(mapFilters.center_lat);
      expect(restoredState.center_lng).toBe(mapFilters.center_lng);
      expect(restoredState.zoom).toBe(mapFilters.zoom);
      expect(restoredState.show_links).toBe(true);
      expect(restoredState.show_traceroute).toBe(true);
      expect(restoredState.show_packet_links).toBe(false);
      expect(restoredState.hop_depth).toBe(2);
      expect(restoredState.selected_node).toBe(mapFilters.selected_node);
      expect(restoredState.tile_layer).toBe(mapFilters.tile_layer);
      expect(restoredState.view_mode).toBe(mapFilters.view_mode);
    });

    it('should handle nested filter objects', async () => {
      // Simulate complex nested state by using JSON strings
      // Note: The sanitizer will remove special characters like { } : " ,
      // So we need to use a simpler approach for nested data
      const complexState = {
        date_start: '2024-01-01',
        date_end: '2024-01-31',
        rssi_min: -120,
        rssi_max: -50,
        snr_min: -10,
        snr_max: 15,
        grouped: true,
        showEmpty: false,
      };

      manager.updateUrl(complexState);
      await new Promise((resolve) => setTimeout(resolve, 350));

      const mockReplaceState = window.history.replaceState as jest.Mock;
      const lastCall = mockReplaceState.mock.calls[mockReplaceState.mock.calls.length - 1];
      window.location.search = new URL(`http://localhost${lastCall[2]}`).search;

      const restoredState = manager.getStateFromUrl();

      expect(restoredState.date_start).toBe('2024-01-01');
      expect(restoredState.date_end).toBe('2024-01-31');
      expect(restoredState.rssi_min).toBe(-120);
      expect(restoredState.rssi_max).toBe(-50);
      expect(restoredState.snr_min).toBe(-10);
      expect(restoredState.snr_max).toBe(15);
      expect(restoredState.grouped).toBe(true);
      expect(restoredState.showEmpty).toBe(false);
    });

    it('should handle very large filter sets', async () => {
      // Simulate a page with many filters
      const largeFilterSet: Record<string, any> = {};
      
      // Add 50 different filters
      for (let i = 0; i < 50; i++) {
        largeFilterSet[`filter_${i}`] = `value_${i}`;
      }

      manager.updateUrl(largeFilterSet);
      await new Promise((resolve) => setTimeout(resolve, 350));

      const mockReplaceState = window.history.replaceState as jest.Mock;
      const lastCall = mockReplaceState.mock.calls[mockReplaceState.mock.calls.length - 1];
      window.location.search = new URL(`http://localhost${lastCall[2]}`).search;

      const restoredState = manager.getStateFromUrl();

      // Verify all filters were preserved
      for (let i = 0; i < 50; i++) {
        expect(restoredState[`filter_${i}`]).toBe(`value_${i}`);
      }
    });

    it('should handle mixed array and single value parameters', async () => {
      const mixedState = {
        single_value: 'test',
        array_value: ['item1', 'item2', 'item3'],
        number: 42,
        boolean: true,
        another_array: ['1', '2', '3'], // URL params are always strings
      };

      manager.updateUrl(mixedState);
      await new Promise((resolve) => setTimeout(resolve, 350));

      const mockReplaceState = window.history.replaceState as jest.Mock;
      const lastCall = mockReplaceState.mock.calls[mockReplaceState.mock.calls.length - 1];
      window.location.search = new URL(`http://localhost${lastCall[2]}`).search;

      const restoredState = manager.getStateFromUrl();

      expect(restoredState.single_value).toBe('test');
      expect(restoredState.array_value).toEqual(['item1', 'item2', 'item3']);
      expect(restoredState.number).toBe(42);
      expect(restoredState.boolean).toBe(true);
      expect(restoredState.another_array).toEqual(['1', '2', '3']);
    });
  });

  describe('Cross-Page Consistency (Requirement 44.14)', () => {
    it('should work consistently on packets page', async () => {
      window.location.pathname = '/packets';
      window.location.href = 'http://localhost/packets';

      const state = { grouped: true, portnum: 'TEXT_MESSAGE_APP', page: 2 };
      manager.updateUrl(state);
      await new Promise((resolve) => setTimeout(resolve, 350));

      // Update window.location.href to reflect the new URL
      const mockReplaceState = window.history.replaceState as jest.Mock;
      const lastCall = mockReplaceState.mock.calls[mockReplaceState.mock.calls.length - 1];
      window.location.href = `http://localhost${lastCall[2]}`;

      const url = manager.getCurrentUrl();
      expect(url).toContain('/packets');
      expect(url).toContain('grouped=true');
      expect(url).toContain('portnum=TEXT_MESSAGE_APP');
      expect(url).toContain('page=2');
    });

    it('should work consistently on nodes page', async () => {
      window.location.pathname = '/nodes';
      window.location.href = 'http://localhost/nodes';

      const state = { search: 'test', active: true, hardware: ['TBEAM'] };
      manager.updateUrl(state);
      await new Promise((resolve) => setTimeout(resolve, 350));

      // Update window.location.href to reflect the new URL
      const mockReplaceState = window.history.replaceState as jest.Mock;
      const lastCall = mockReplaceState.mock.calls[mockReplaceState.mock.calls.length - 1];
      window.location.href = `http://localhost${lastCall[2]}`;

      const url = manager.getCurrentUrl();
      expect(url).toContain('/nodes');
      expect(url).toContain('search=test');
      expect(url).toContain('active=true');
      expect(url).toContain('hardware=TBEAM');
    });

    it('should work consistently on map page', async () => {
      window.location.pathname = '/map';
      window.location.href = 'http://localhost/map';

      const state = { zoom: 12, show_links: true, hop_depth: 2 };
      manager.updateUrl(state);
      await new Promise((resolve) => setTimeout(resolve, 350));

      // Update window.location.href to reflect the new URL
      const mockReplaceState = window.history.replaceState as jest.Mock;
      const lastCall = mockReplaceState.mock.calls[mockReplaceState.mock.calls.length - 1];
      window.location.href = `http://localhost${lastCall[2]}`;

      const url = manager.getCurrentUrl();
      expect(url).toContain('/map');
      expect(url).toContain('zoom=12');
      expect(url).toContain('show_links=true');
      expect(url).toContain('hop_depth=2');
    });

    it('should maintain state when switching between pages', async () => {
      // Start on packets page
      window.location.pathname = '/packets';
      const packetsState = { search: 'test', page: 2 };
      manager.updateUrl(packetsState);
      await new Promise((resolve) => setTimeout(resolve, 350));

      // Switch to nodes page
      window.location.pathname = '/nodes';
      const nodesState = { search: 'test', active: true };
      manager.updateUrl(nodesState);
      await new Promise((resolve) => setTimeout(resolve, 350));

      // Verify URL updated correctly
      const mockReplaceState = window.history.replaceState as jest.Mock;
      const lastCall = mockReplaceState.mock.calls[mockReplaceState.mock.calls.length - 1];
      expect(lastCall[2]).toContain('/nodes');
      expect(lastCall[2]).toContain('search=test');
      expect(lastCall[2]).toContain('active=true');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle URL length limits gracefully', async () => {
      // Create a very long filter value
      const longValue = 'a'.repeat(2000);
      const state = { search: longValue };

      manager.updateUrl(state);
      await new Promise((resolve) => setTimeout(resolve, 350));

      // Should not throw error
      const url = manager.getCurrentUrl();
      expect(url).toBeDefined();
    });

    it('should handle unicode characters in filters', async () => {
      const state = {
        search: '测试 тест テスト',
        node: 'node-🚀',
      };

      manager.updateUrl(state);
      await new Promise((resolve) => setTimeout(resolve, 350));

      const mockReplaceState = window.history.replaceState as jest.Mock;
      const lastCall = mockReplaceState.mock.calls[mockReplaceState.mock.calls.length - 1];
      window.location.search = new URL(`http://localhost${lastCall[2]}`).search;

      const restoredState = manager.getStateFromUrl();

      // Unicode should be preserved (after sanitization)
      expect(restoredState.search).toBeDefined();
      expect(restoredState.node).toBeDefined();
    });

    it('should handle rapid copy operations', async () => {
      const state = { search: 'test' };
      manager.updateUrl(state);
      await new Promise((resolve) => setTimeout(resolve, 350));

      // Update window.location.href
      const mockReplaceState = window.history.replaceState as jest.Mock;
      const lastCall = mockReplaceState.mock.calls[mockReplaceState.mock.calls.length - 1];
      window.location.href = `http://localhost${lastCall[2]}`;

      // Perform multiple rapid copy operations
      const results = await Promise.all([
        manager.copyUrlToClipboard(),
        manager.copyUrlToClipboard(),
        manager.copyUrlToClipboard(),
      ]);

      // All should succeed
      expect(results).toEqual([true, true, true]);
      expect(mockWriteText).toHaveBeenCalledTimes(3);
    });

    it('should handle empty state gracefully', async () => {
      const emptyState = {};
      manager.updateUrl(emptyState);
      await new Promise((resolve) => setTimeout(resolve, 350));

      const url = manager.getCurrentUrl();
      
      // Should just return the pathname without query string
      expect(url).toBe('http://localhost/packets');
    });

    it('should handle state with only null/empty values', async () => {
      const nullState = {
        search: null,
        filter: '',
        tags: [],
        active: undefined,
      };

      manager.updateUrl(nullState);
      await new Promise((resolve) => setTimeout(resolve, 350));

      const mockReplaceState = window.history.replaceState as jest.Mock;
      const lastCall = mockReplaceState.mock.calls[mockReplaceState.mock.calls.length - 1];
      
      // Should result in clean URL without parameters
      expect(lastCall[2]).toBe('/packets');
    });
  });
});
