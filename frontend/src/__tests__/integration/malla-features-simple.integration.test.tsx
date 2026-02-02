/**
 * Malla Features Simple Integration Tests
 * 
 * Simplified integration tests for Malla-inspired features that focus on
 * testing the integration between components without complex mocking.
 * 
 * Task: 69.1 Write integration tests for user workflows
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Import utilities
import { DarkModeToggle } from '../../utils/DarkModeToggle';
import { UrlStateManager } from '../../utils/UrlStateManager';
import { calculateDistance } from '../../utils/distanceCalculation';
import { computeNodesWithinHops, RFLink } from '../../utils/hopDepthCalculation';

describe('Malla Features Simple Integration Tests', () => {
  beforeEach(() => {
    // Reset DOM
    document.documentElement.removeAttribute('data-bs-theme');
    
    // Mock localStorage with actual storage
    const storage: { [key: string]: string } = {};
    const localStorageMock = {
      getItem: jest.fn((key: string) => storage[key] || null),
      setItem: jest.fn((key: string, value: string) => {
        storage[key] = value;
      }),
      removeItem: jest.fn((key: string) => {
        delete storage[key];
      }),
      clear: jest.fn(() => {
        Object.keys(storage).forEach(key => delete storage[key]);
      })
    };
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
      configurable: true
    });

    // Mock window.location and history
    delete (window as any).location;
    (window as any).location = {
      href: 'http://localhost/',
      search: '',
      pathname: '/',
      replace: jest.fn(),
      assign: jest.fn()
    };

    delete (window as any).history;
    (window as any).history = {
      pushState: jest.fn(),
      replaceState: jest.fn((state, title, url) => {
        // Update location.search when replaceState is called
        const urlObj = new URL(url, 'http://localhost');
        (window as any).location.search = urlObj.search;
        (window as any).location.pathname = urlObj.pathname;
      }),
      back: jest.fn(),
      forward: jest.fn(),
      go: jest.fn()
    };

    // Mock matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
  });

  describe('Theme System Integration', () => {
    it('should cycle through theme modes', () => {
      const darkModeToggle = new DarkModeToggle();
      
      // Initial state should be auto
      expect(darkModeToggle.getThemePreference()).toBe('auto');
      
      // Cycle: auto -> light
      darkModeToggle.cycleTheme();
      expect(darkModeToggle.getThemePreference()).toBe('light');
      expect(document.documentElement.getAttribute('data-bs-theme')).toBe('light');
      
      // Cycle: light -> dark
      darkModeToggle.cycleTheme();
      expect(darkModeToggle.getThemePreference()).toBe('dark');
      expect(document.documentElement.getAttribute('data-bs-theme')).toBe('dark');
      
      // Cycle: dark -> auto
      darkModeToggle.cycleTheme();
      expect(darkModeToggle.getThemePreference()).toBe('auto');
    });

    it('should persist theme preference', () => {
      const darkModeToggle = new DarkModeToggle();
      
      darkModeToggle.setTheme('dark');
      
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'malla-theme-preference',
        'dark'
      );
    });

    it('should dispatch theme change events', () => {
      const darkModeToggle = new DarkModeToggle();
      const eventListener = jest.fn();
      
      window.addEventListener('themeChanged', eventListener);
      
      darkModeToggle.setTheme('dark');
      
      expect(eventListener).toHaveBeenCalled();
      expect(eventListener.mock.calls[0][0].detail.effective).toBe('dark');
      
      window.removeEventListener('themeChanged', eventListener);
    });

    it('should respect system preference in auto mode', () => {
      // Mock dark mode preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-color-scheme: dark)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      const darkModeToggle = new DarkModeToggle();
      darkModeToggle.setTheme('auto');
      
      expect(darkModeToggle.getEffectiveTheme()).toBe('dark');
    });
  });

  describe('URL State Management Integration', () => {
    it('should encode and decode URL parameters', async () => {
      const urlManager = new UrlStateManager();
      
      const state = {
        portnum: 'TEXT_MESSAGE_APP',
        from_node_id: '123456789',
        hop_limit: 3
      };
      
      urlManager.updateUrl(state);
      
      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 350));
      
      // Verify URL was updated
      expect(window.location.search).toContain('portnum=TEXT_MESSAGE_APP');
      expect(window.location.search).toContain('from_node_id=123456789');
      expect(window.location.search).toContain('hop_limit=3');
    });

    it('should handle array parameters', async () => {
      const urlManager = new UrlStateManager();
      
      const state = {
        node_ids: ['123456789', '987654321']
      };
      
      urlManager.updateUrl(state);
      
      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 350));
      
      expect(window.location.search).toContain('node_ids=123456789');
      expect(window.location.search).toContain('node_ids=987654321');
    });

    it('should restore state from URL', () => {
      (window as any).location.search = '?portnum=TEXT_MESSAGE_APP&from_node_id=123456789&hop_limit=3';
      
      const urlManager = new UrlStateManager();
      const state = urlManager.getStateFromUrl();
      
      expect(state.portnum).toBe('TEXT_MESSAGE_APP');
      expect(state.from_node_id).toBe(123456789); // Parsed as number
      expect(state.hop_limit).toBe(3); // Parsed as number
    });

    it('should remove null and empty parameters', async () => {
      const urlManager = new UrlStateManager();
      
      const state = {
        portnum: 'TEXT_MESSAGE_APP',
        from_node_id: null,
        to_node_id: '',
        hop_limit: 3
      };
      
      urlManager.updateUrl(state);
      
      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 350));
      
      expect(window.location.search).toContain('portnum=TEXT_MESSAGE_APP');
      expect(window.location.search).not.toContain('from_node_id');
      expect(window.location.search).not.toContain('to_node_id');
      expect(window.location.search).toContain('hop_limit=3');
    });

    it('should debounce URL updates', async () => {
      const urlManager = new UrlStateManager();
      
      // Make multiple rapid updates
      urlManager.updateUrl({ portnum: 'TEXT_MESSAGE_APP' });
      urlManager.updateUrl({ portnum: 'POSITION_APP' });
      urlManager.updateUrl({ portnum: 'TELEMETRY_APP' });
      
      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 350));
      
      // Only the last update should be applied
      expect(window.location.search).toContain('portnum=TELEMETRY_APP');
    });
  });

  describe('Distance Calculation Integration', () => {
    it('should calculate distance between two points', () => {
      const point1 = { latitude: 40.7128, longitude: -74.0060 };
      const point2 = { latitude: 40.7589, longitude: -73.9851 };
      
      const distance = calculateDistance(
        point1.latitude,
        point1.longitude,
        point2.latitude,
        point2.longitude
      );
      
      // Distance should be approximately 5.4 km
      expect(distance).toBeGreaterThan(5);
      expect(distance).toBeLessThan(6);
    });

    it('should return 0 for same point', () => {
      const distance = calculateDistance(40.7128, -74.0060, 40.7128, -74.0060);
      expect(distance).toBe(0);
    });

    it('should handle antipodal points', () => {
      // Points on opposite sides of Earth
      const distance = calculateDistance(0, 0, 0, 180);
      
      // Should be approximately half Earth's circumference (20,000 km)
      expect(distance).toBeGreaterThan(19000);
      expect(distance).toBeLessThan(21000);
    });
  });

  describe('Hop Depth Calculation Integration', () => {
    it('should calculate nodes within hop depth', () => {
      const links: RFLink[] = [
        { from_node_id: 'A', to_node_id: 'B', link_type: 'traceroute', packet_count: 10, avg_rssi: -85, avg_snr: 8.5, last_seen: new Date(), success_rate: 95, is_bidirectional: true },
        { from_node_id: 'B', to_node_id: 'C', link_type: 'traceroute', packet_count: 10, avg_rssi: -85, avg_snr: 8.5, last_seen: new Date(), success_rate: 95, is_bidirectional: true },
        { from_node_id: 'C', to_node_id: 'D', link_type: 'traceroute', packet_count: 10, avg_rssi: -85, avg_snr: 8.5, last_seen: new Date(), success_rate: 95, is_bidirectional: true },
        { from_node_id: 'A', to_node_id: 'E', link_type: 'traceroute', packet_count: 10, avg_rssi: -85, avg_snr: 8.5, last_seen: new Date(), success_rate: 95, is_bidirectional: true }
      ];
      
      const nodesWithin1Hop = computeNodesWithinHops('A', 1, links);
      expect(nodesWithin1Hop).toContain('A');
      expect(nodesWithin1Hop).toContain('B');
      expect(nodesWithin1Hop).toContain('E');
      expect(nodesWithin1Hop).not.toContain('C');
      expect(nodesWithin1Hop).not.toContain('D');
      
      const nodesWithin2Hops = computeNodesWithinHops('A', 2, links);
      expect(nodesWithin2Hops).toContain('A');
      expect(nodesWithin2Hops).toContain('B');
      expect(nodesWithin2Hops).toContain('C');
      expect(nodesWithin2Hops).toContain('E');
      expect(nodesWithin2Hops).not.toContain('D');
      
      const nodesWithin3Hops = computeNodesWithinHops('A', 3, links);
      expect(nodesWithin3Hops).toContain('A');
      expect(nodesWithin3Hops).toContain('B');
      expect(nodesWithin3Hops).toContain('C');
      expect(nodesWithin3Hops).toContain('D');
      expect(nodesWithin3Hops).toContain('E');
    });

    it('should handle bidirectional links', () => {
      const links: RFLink[] = [
        { from_node_id: 'A', to_node_id: 'B', link_type: 'traceroute', packet_count: 10, avg_rssi: -85, avg_snr: 8.5, last_seen: new Date(), success_rate: 95, is_bidirectional: true },
        { from_node_id: 'B', to_node_id: 'A', link_type: 'traceroute', packet_count: 10, avg_rssi: -85, avg_snr: 8.5, last_seen: new Date(), success_rate: 95, is_bidirectional: true },
        { from_node_id: 'B', to_node_id: 'C', link_type: 'traceroute', packet_count: 10, avg_rssi: -85, avg_snr: 8.5, last_seen: new Date(), success_rate: 95, is_bidirectional: true }
      ];
      
      const nodesWithin1Hop = computeNodesWithinHops('A', 1, links);
      expect(nodesWithin1Hop).toContain('A');
      expect(nodesWithin1Hop).toContain('B');
      expect(nodesWithin1Hop).not.toContain('C');
    });

    it('should handle disconnected nodes', () => {
      const links: RFLink[] = [
        { from_node_id: 'A', to_node_id: 'B', link_type: 'traceroute', packet_count: 10, avg_rssi: -85, avg_snr: 8.5, last_seen: new Date(), success_rate: 95, is_bidirectional: true },
        { from_node_id: 'C', to_node_id: 'D', link_type: 'traceroute', packet_count: 10, avg_rssi: -85, avg_snr: 8.5, last_seen: new Date(), success_rate: 95, is_bidirectional: true }
      ];
      
      const nodesWithin10Hops = computeNodesWithinHops('A', 10, links);
      expect(nodesWithin10Hops).toContain('A');
      expect(nodesWithin10Hops).toContain('B');
      expect(nodesWithin10Hops).not.toContain('C');
      expect(nodesWithin10Hops).not.toContain('D');
    });

    it('should handle circular networks', () => {
      const links: RFLink[] = [
        { from_node_id: 'A', to_node_id: 'B', link_type: 'traceroute', packet_count: 10, avg_rssi: -85, avg_snr: 8.5, last_seen: new Date(), success_rate: 95, is_bidirectional: true },
        { from_node_id: 'B', to_node_id: 'C', link_type: 'traceroute', packet_count: 10, avg_rssi: -85, avg_snr: 8.5, last_seen: new Date(), success_rate: 95, is_bidirectional: true },
        { from_node_id: 'C', to_node_id: 'A', link_type: 'traceroute', packet_count: 10, avg_rssi: -85, avg_snr: 8.5, last_seen: new Date(), success_rate: 95, is_bidirectional: true }
      ];
      
      const nodesWithin1Hop = computeNodesWithinHops('A', 1, links);
      expect(nodesWithin1Hop.size).toBe(3); // A, B, and C (all within 1 hop due to circular topology)
      
      const nodesWithin2Hops = computeNodesWithinHops('A', 2, links);
      expect(nodesWithin2Hops.size).toBe(3); // Still A, B, and C
    });
  });

  describe('Cross-Feature Integration', () => {
    it('should maintain theme when URL state changes', async () => {
      const darkModeToggle = new DarkModeToggle();
      const urlManager = new UrlStateManager();
      
      // Set dark theme
      darkModeToggle.setTheme('dark');
      expect(document.documentElement.getAttribute('data-bs-theme')).toBe('dark');
      
      // Update URL state
      urlManager.updateUrl({ portnum: 'TEXT_MESSAGE_APP' });
      
      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 350));
      
      // Theme should still be dark
      expect(document.documentElement.getAttribute('data-bs-theme')).toBe('dark');
    });

    it('should calculate distances for hop depth filtered nodes', () => {
      const links: RFLink[] = [
        { from_node_id: 'A', to_node_id: 'B', link_type: 'traceroute', packet_count: 10, avg_rssi: -85, avg_snr: 8.5, last_seen: new Date(), success_rate: 95, is_bidirectional: true },
        { from_node_id: 'B', to_node_id: 'C', link_type: 'traceroute', packet_count: 10, avg_rssi: -85, avg_snr: 8.5, last_seen: new Date(), success_rate: 95, is_bidirectional: true }
      ];
      
      const nodes = {
        'A': { latitude: 40.7128, longitude: -74.0060 },
        'B': { latitude: 40.7589, longitude: -73.9851 },
        'C': { latitude: 40.8000, longitude: -73.9500 }
      };
      
      const nodesWithin1Hop = computeNodesWithinHops('A', 1, links);
      
      // Calculate distances for filtered nodes
      const distances: { [key: string]: number } = {};
      nodesWithin1Hop.forEach(nodeId => {
        if (nodeId !== 'A' && nodes[nodeId]) {
          distances[nodeId] = calculateDistance(
            nodes['A'].latitude,
            nodes['A'].longitude,
            nodes[nodeId].latitude,
            nodes[nodeId].longitude
          );
        }
      });
      
      // Distance from A to B should be approximately 5.4 km
      expect(distances['B']).toBeGreaterThan(5);
      expect(distances['B']).toBeLessThan(6);
      expect(distances['C']).toBeUndefined(); // C is not within 1 hop
    });

    it('should generate shareable URLs with theme preference', async () => {
      const darkModeToggle = new DarkModeToggle();
      const urlManager = new UrlStateManager();
      
      darkModeToggle.setTheme('dark');
      urlManager.updateUrl({ portnum: 'TEXT_MESSAGE_APP', from_node_id: '123456789' });
      
      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 350));
      
      // Shareable URL should include filters
      expect(window.location.search).toContain('portnum=TEXT_MESSAGE_APP');
      expect(window.location.search).toContain('from_node_id=123456789');
      
      // Theme preference should be in localStorage
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'malla-theme-preference',
        'dark'
      );
    });
  });

  describe('Performance Integration', () => {
    it('should handle large hop depth calculations efficiently', () => {
      // Create a large network (100 nodes, 200 links)
      const links: RFLink[] = [];
      for (let i = 0; i < 100; i++) {
        links.push({ 
          from_node_id: `node_${i}`, 
          to_node_id: `node_${i + 1}`,
          link_type: 'traceroute',
          packet_count: 10,
          avg_rssi: -85,
          avg_snr: 8.5,
          last_seen: new Date(),
          success_rate: 95,
          is_bidirectional: true
        });
        if (i % 10 === 0) {
          links.push({ 
            from_node_id: `node_${i}`, 
            to_node_id: `node_${i + 10}`,
            link_type: 'traceroute',
            packet_count: 10,
            avg_rssi: -85,
            avg_snr: 8.5,
            last_seen: new Date(),
            success_rate: 95,
            is_bidirectional: true
          });
        }
      }
      
      const startTime = performance.now();
      const nodesWithin5Hops = computeNodesWithinHops('node_0', 5, links);
      const endTime = performance.now();
      
      // Should complete in under 100ms
      expect(endTime - startTime).toBeLessThan(100);
      expect(nodesWithin5Hops.size).toBeGreaterThan(5);
    });

    it('should handle many distance calculations efficiently', () => {
      const points = [];
      for (let i = 0; i < 100; i++) {
        points.push({
          latitude: 40.7128 + (Math.random() - 0.5) * 0.1,
          longitude: -74.0060 + (Math.random() - 0.5) * 0.1
        });
      }
      
      const startTime = performance.now();
      const distances = [];
      for (let i = 0; i < points.length - 1; i++) {
        distances.push(calculateDistance(
          points[i].latitude,
          points[i].longitude,
          points[i + 1].latitude,
          points[i + 1].longitude
        ));
      }
      const endTime = performance.now();
      
      // Should complete 99 calculations in under 50ms
      expect(endTime - startTime).toBeLessThan(50);
      expect(distances.length).toBe(99);
    });

    it('should debounce rapid URL updates efficiently', async () => {
      const urlManager = new UrlStateManager();
      
      const startTime = performance.now();
      
      // Make 100 rapid updates
      for (let i = 0; i < 100; i++) {
        urlManager.updateUrl({ counter: i });
      }
      
      const updateTime = performance.now() - startTime;
      
      // Updates should be queued efficiently (< 50ms)
      expect(updateTime).toBeLessThan(50);
      
      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 350));
      
      // Only the last update should be applied
      expect(window.location.search).toContain('counter=99');
    });
  });
});
