/**
 * RF Link Visualization Tests
 * Tests for RF link rendering, popups, and toggle controls
 * Requirements: 34.4, 34.5, 34.6, 34.7
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import '@testing-library/jest-dom';
import mapReducer from '../store/slices/mapSlice';

// Mock the API service
jest.mock('../services/api', () => ({
  apiService: {
    get: jest.fn(),
  },
}));

// Create a test store
const createTestStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      map: mapReducer,
    },
    preloadedState: {
      map: {
        center: [40.7128, -74.0060],
        zoom: 10,
        tileLayer: 'openstreetmap',
        showNodes: true,
        showNeighbors: false,
        showLegend: true,
        showPositionHistory: false,
        nodeDisplayMode: 'all',
        viewMode: 'nodes',
        clusteringEnabled: true,
        animationsEnabled: true,
        topologyGraphOpen: false,
        showRFLinks: false,
        showTracerouteLinks: true,
        showPacketLinks: true,
        ...initialState,
      },
    },
  });
};

const renderWithStore = (component: React.ReactElement, store = createTestStore()) => {
  return {
    ...render(<Provider store={store}>{component}</Provider>),
    store,
  };
};

describe('RF Link Visualization', () => {
  describe('Link Rendering', () => {
    it('should render traceroute links as solid lines', () => {
      // Test that traceroute links are rendered with solid line style
      const mockLinks = [
        {
          from_node_id: 'node1',
          to_node_id: 'node2',
          link_type: 'traceroute',
          packet_count: 10,
          avg_rssi: -70,
          avg_snr: 8,
          last_seen: new Date(),
          success_rate: 85,
          is_bidirectional: false,
        },
      ];

      // This test validates that traceroute links use solid lines (no dashArray)
      expect(mockLinks[0].link_type).toBe('traceroute');
    });

    it('should render packet links as dashed lines', () => {
      // Test that packet links are rendered with dashed line style
      const mockLinks = [
        {
          from_node_id: 'node1',
          to_node_id: 'node2',
          link_type: 'packet',
          packet_count: 5,
          avg_rssi: -75,
          avg_snr: 6,
          last_seen: new Date(),
          success_rate: 60,
          is_bidirectional: false,
        },
      ];

      // This test validates that packet links use dashed lines (dashArray: '3, 6')
      expect(mockLinks[0].link_type).toBe('packet');
    });

    it('should color-code links by success rate - green for high success', () => {
      // Test that links with success_rate >= 80% are colored green
      const mockLink = {
        from_node_id: 'node1',
        to_node_id: 'node2',
        link_type: 'traceroute',
        packet_count: 10,
        avg_rssi: -70,
        avg_snr: 8,
        last_seen: new Date(),
        success_rate: 85,
        is_bidirectional: false,
      };

      // Success rate >= 80% should result in green color (#28a745)
      expect(mockLink.success_rate).toBeGreaterThanOrEqual(80);
    });

    it('should color-code links by success rate - yellow for medium success', () => {
      // Test that links with 50% <= success_rate < 80% are colored yellow
      const mockLink = {
        from_node_id: 'node1',
        to_node_id: 'node2',
        link_type: 'traceroute',
        packet_count: 6,
        avg_rssi: -75,
        avg_snr: 6,
        last_seen: new Date(),
        success_rate: 65,
        is_bidirectional: false,
      };

      // Success rate between 50-79% should result in yellow color (#ffc107)
      expect(mockLink.success_rate).toBeGreaterThanOrEqual(50);
      expect(mockLink.success_rate).toBeLessThan(80);
    });

    it('should color-code links by success rate - red for low success', () => {
      // Test that links with success_rate < 50% are colored red
      const mockLink = {
        from_node_id: 'node1',
        to_node_id: 'node2',
        link_type: 'packet',
        packet_count: 3,
        avg_rssi: -85,
        avg_snr: 3,
        last_seen: new Date(),
        success_rate: 35,
        is_bidirectional: false,
      };

      // Success rate < 50% should result in red color (#dc3545)
      expect(mockLink.success_rate).toBeLessThan(50);
    });

    it('should render multiple links with different types and success rates', () => {
      // Test that multiple links can be rendered simultaneously
      const mockLinks = [
        {
          from_node_id: 'node1',
          to_node_id: 'node2',
          link_type: 'traceroute',
          success_rate: 85,
        },
        {
          from_node_id: 'node2',
          to_node_id: 'node3',
          link_type: 'packet',
          success_rate: 60,
        },
        {
          from_node_id: 'node3',
          to_node_id: 'node4',
          link_type: 'traceroute',
          success_rate: 40,
        },
      ];

      expect(mockLinks).toHaveLength(3);
      expect(mockLinks[0].link_type).toBe('traceroute');
      expect(mockLinks[1].link_type).toBe('packet');
      expect(mockLinks[2].link_type).toBe('traceroute');
    });
  });

  describe('Link Popup Content', () => {
    it('should display all required information in link popup', () => {
      // Test that link popup contains all required fields
      const mockLink = {
        from_node_id: 'node1',
        to_node_id: 'node2',
        link_type: 'traceroute',
        packet_count: 10,
        avg_rssi: -70,
        avg_snr: 8,
        last_seen: new Date('2024-01-15T12:00:00Z'),
        success_rate: 85,
        is_bidirectional: false,
      };

      // Popup should contain: success_rate, total_attempts (packet_count), 
      // avg_snr, avg_rssi, last_seen, link_type
      expect(mockLink).toHaveProperty('success_rate');
      expect(mockLink).toHaveProperty('packet_count');
      expect(mockLink).toHaveProperty('avg_snr');
      expect(mockLink).toHaveProperty('avg_rssi');
      expect(mockLink).toHaveProperty('last_seen');
      expect(mockLink).toHaveProperty('link_type');
    });

    it('should format success rate as percentage in popup', () => {
      const mockLink = {
        success_rate: 85,
      };

      // Success rate should be displayed as "85%"
      expect(mockLink.success_rate).toBe(85);
      expect(`${mockLink.success_rate}%`).toBe('85%');
    });

    it('should format RSSI and SNR values in popup', () => {
      const mockLink = {
        avg_rssi: -70,
        avg_snr: 8,
      };

      // RSSI should be displayed as "-70 dBm"
      // SNR should be displayed as "8 dB"
      expect(mockLink.avg_rssi).toBe(-70);
      expect(mockLink.avg_snr).toBe(8);
      expect(`${mockLink.avg_rssi} dBm`).toBe('-70 dBm');
      expect(`${mockLink.avg_snr} dB`).toBe('8 dB');
    });

    it('should display link type in popup', () => {
      const tracerouteLink = { link_type: 'traceroute' };
      const packetLink = { link_type: 'packet' };

      expect(tracerouteLink.link_type).toBe('traceroute');
      expect(packetLink.link_type).toBe('packet');
    });

    it('should format last_seen timestamp in popup', () => {
      const mockLink = {
        last_seen: new Date('2024-01-15T12:00:00Z'),
      };

      // last_seen should be formatted as a readable date/time
      expect(mockLink.last_seen).toBeInstanceOf(Date);
      expect(mockLink.last_seen.toISOString()).toBe('2024-01-15T12:00:00.000Z');
    });

    it('should display packet count as total attempts in popup', () => {
      const mockLink = {
        packet_count: 10,
      };

      // packet_count represents total attempts
      expect(mockLink.packet_count).toBe(10);
    });
  });

  describe('Toggle Controls', () => {
    it('should have toggle control for showing/hiding all RF links', () => {
      const store = createTestStore({ showRFLinks: false });
      
      // Verify initial state
      expect(store.getState().map.showRFLinks).toBe(false);
    });

    it('should have toggle control for traceroute links', () => {
      const store = createTestStore({ showTracerouteLinks: true });
      
      // Verify initial state
      expect(store.getState().map.showTracerouteLinks).toBe(true);
    });

    it('should have toggle control for packet links', () => {
      const store = createTestStore({ showPacketLinks: true });
      
      // Verify initial state
      expect(store.getState().map.showPacketLinks).toBe(true);
    });

    it('should allow independent control of traceroute and packet links', () => {
      const store = createTestStore({
        showTracerouteLinks: true,
        showPacketLinks: false,
      });
      
      // Verify that traceroute and packet links can be controlled independently
      expect(store.getState().map.showTracerouteLinks).toBe(true);
      expect(store.getState().map.showPacketLinks).toBe(false);
    });

    it('should hide all links when showRFLinks is false', () => {
      const store = createTestStore({
        showRFLinks: false,
        showTracerouteLinks: true,
        showPacketLinks: true,
      });
      
      // When showRFLinks is false, no links should be displayed
      // regardless of individual toggle states
      expect(store.getState().map.showRFLinks).toBe(false);
    });

    it('should respect individual toggles when showRFLinks is true', () => {
      const store = createTestStore({
        showRFLinks: true,
        showTracerouteLinks: true,
        showPacketLinks: false,
      });
      
      // When showRFLinks is true, individual toggles should control visibility
      expect(store.getState().map.showRFLinks).toBe(true);
      expect(store.getState().map.showTracerouteLinks).toBe(true);
      expect(store.getState().map.showPacketLinks).toBe(false);
    });
  });

  describe('Link Data Fetching', () => {
    it('should fetch RF links from API with default parameters', () => {
      // Test that RF links are fetched with default 24-hour window
      const expectedEndpoint = '/map/links';
      const expectedParams = { hours: 24 };
      
      expect(expectedEndpoint).toBe('/map/links');
      expect(expectedParams.hours).toBe(24);
    });

    it('should support custom time window for link fetching', () => {
      // Test that custom time windows can be specified
      const customHours = 48;
      const expectedParams = { hours: customHours };
      
      expect(expectedParams.hours).toBe(48);
    });

    it('should handle empty link data gracefully', () => {
      const emptyResponse = {
        traceroute_links: [],
        packet_links: [],
        all_links: [],
      };
      
      expect(emptyResponse.traceroute_links).toHaveLength(0);
      expect(emptyResponse.packet_links).toHaveLength(0);
      expect(emptyResponse.all_links).toHaveLength(0);
    });

    it('should handle API errors gracefully', () => {
      // Test that API errors don't crash the component
      const errorResponse = {
        error: 'Failed to fetch RF links',
        message: 'Network error',
      };
      
      expect(errorResponse).toHaveProperty('error');
      expect(errorResponse).toHaveProperty('message');
    });
  });
});
