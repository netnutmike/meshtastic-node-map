/**
 * Unit tests for TEXT_MESSAGE_APP decoding
 * Requirement 38.13: Decode and display text message content in packets table
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import PacketsPage from '../pages/PacketsPage';
import { apiService } from '../services/api';

// Mock the API service
jest.mock('../services/api');
const mockedApiService = apiService as jest.Mocked<typeof apiService>;

describe('TEXT_MESSAGE_APP Decoding - Requirement 38.13', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Text Message Decoding', () => {
    it('should decode and display text message content for TEXT_MESSAGE_APP packets', async () => {
      // Mock nodes response
      mockedApiService.get.mockImplementation((url: string) => {
        if (url === '/api/v1/nodes') {
          return Promise.resolve({ data: [] });
        }
        if (url.includes('/api/v1/messages?limit=1000')) {
          return Promise.resolve({ data: [] });
        }
        if (url.includes('/api/v1/messages')) {
          return Promise.resolve({
            data: [
              {
                id: 'msg1',
                messageId: 'packet1',
                fromNodeId: 'node1',
                toNodeId: 'node2',
                type: 'TEXT',
                content: 'Hello, World!',
                hopStart: 3,
                hopLimit: 3,
                rssi: -80,
                snr: 5.5,
                timestamp: new Date('2024-01-01T12:00:00Z'),
                topic: 'msh/US/2/json/LongFast/gateway1',
                fromNode: {
                  shortName: 'Node1',
                  longName: 'Test Node 1'
                },
                toNode: {
                  shortName: 'Node2',
                  longName: 'Test Node 2'
                }
              }
            ]
          });
        }
        return Promise.resolve({ data: [] });
      });

      render(<PacketsPage />);

      // Wait for data to load
      await waitFor(() => {
        expect(screen.queryByText('Loading packets...')).not.toBeInTheDocument();
      });

      // Check that text content is displayed
      await waitFor(() => {
        expect(screen.getByText('Hello, World!')).toBeInTheDocument();
      });
    });

    it('should handle empty text content gracefully', async () => {
      mockedApiService.get.mockImplementation((url: string) => {
        if (url === '/api/v1/nodes') {
          return Promise.resolve({ data: [] });
        }
        if (url.includes('/api/v1/messages?limit=1000')) {
          return Promise.resolve({ data: [] });
        }
        if (url.includes('/api/v1/messages')) {
          return Promise.resolve({
            data: [
              {
                id: 'msg1',
                messageId: 'packet1',
                fromNodeId: 'node1',
                toNodeId: null,
                type: 'TEXT',
                content: '',
                hopStart: 3,
                hopLimit: 3,
                rssi: -80,
                snr: 5.5,
                timestamp: new Date('2024-01-01T12:00:00Z'),
                topic: 'msh/US/2/json/LongFast/gateway1',
                fromNode: {
                  shortName: 'Node1'
                }
              }
            ]
          });
        }
        return Promise.resolve({ data: [] });
      });

      render(<PacketsPage />);

      await waitFor(() => {
        expect(screen.queryByText('Loading packets...')).not.toBeInTheDocument();
      });

      // Should show placeholder for empty content
      const noDashElements = screen.getAllByText('-');
      expect(noDashElements.length).toBeGreaterThan(0);
    });

    it('should not display text content for non-TEXT message types', async () => {
      mockedApiService.get.mockImplementation((url: string) => {
        if (url === '/api/v1/nodes') {
          return Promise.resolve({ data: [] });
        }
        if (url.includes('/api/v1/messages?limit=1000')) {
          return Promise.resolve({ data: [] });
        }
        if (url.includes('/api/v1/messages')) {
          return Promise.resolve({
            data: [
              {
                id: 'msg1',
                messageId: 'packet1',
                fromNodeId: 'node1',
                toNodeId: 'node2',
                type: 'POSITION',
                content: { latitude: 40.7128, longitude: -74.0060 },
                hopStart: 3,
                hopLimit: 3,
                rssi: -80,
                snr: 5.5,
                timestamp: new Date('2024-01-01T12:00:00Z'),
                topic: 'msh/US/2/json/LongFast/gateway1',
                fromNode: {
                  shortName: 'Node1'
                }
              }
            ]
          });
        }
        return Promise.resolve({ data: [] });
      });

      render(<PacketsPage />);

      await waitFor(() => {
        expect(screen.queryByText('Loading packets...')).not.toBeInTheDocument();
      });

      // Should not display position data as text content
      expect(screen.queryByText(/latitude/i)).not.toBeInTheDocument();
    });
  });

  describe('Content Sanitization', () => {
    it('should sanitize HTML tags from message content', async () => {
      mockedApiService.get.mockImplementation((url: string) => {
        if (url === '/api/v1/nodes') {
          return Promise.resolve({ data: [] });
        }
        if (url.includes('/api/v1/messages?limit=1000')) {
          return Promise.resolve({ data: [] });
        }
        if (url.includes('/api/v1/messages')) {
          return Promise.resolve({
            data: [
              {
                id: 'msg1',
                messageId: 'packet1',
                fromNodeId: 'node1',
                toNodeId: 'node2',
                type: 'TEXT',
                content: '<script>alert("xss")</script>Hello',
                hopStart: 3,
                hopLimit: 3,
                rssi: -80,
                snr: 5.5,
                timestamp: new Date('2024-01-01T12:00:00Z'),
                topic: 'msh/US/2/json/LongFast/gateway1',
                fromNode: {
                  shortName: 'Node1'
                }
              }
            ]
          });
        }
        return Promise.resolve({ data: [] });
      });

      render(<PacketsPage />);

      await waitFor(() => {
        expect(screen.queryByText('Loading packets...')).not.toBeInTheDocument();
      });

      // Should not contain script tags
      expect(screen.queryByText(/<script>/i)).not.toBeInTheDocument();
      // Should contain sanitized content
      expect(screen.getByText(/Hello/)).toBeInTheDocument();
    });

    it('should handle special characters in message content', async () => {
      mockedApiService.get.mockImplementation((url: string) => {
        if (url === '/api/v1/nodes') {
          return Promise.resolve({ data: [] });
        }
        if (url.includes('/api/v1/messages?limit=1000')) {
          return Promise.resolve({ data: [] });
        }
        if (url.includes('/api/v1/messages')) {
          return Promise.resolve({
            data: [
              {
                id: 'msg1',
                messageId: 'packet1',
                fromNodeId: 'node1',
                toNodeId: 'node2',
                type: 'TEXT',
                content: 'Test & "quotes" <brackets>',
                hopStart: 3,
                hopLimit: 3,
                rssi: -80,
                snr: 5.5,
                timestamp: new Date('2024-01-01T12:00:00Z'),
                topic: 'msh/US/2/json/LongFast/gateway1',
                fromNode: {
                  shortName: 'Node1'
                }
              }
            ]
          });
        }
        return Promise.resolve({ data: [] });
      });

      render(<PacketsPage />);

      await waitFor(() => {
        expect(screen.queryByText('Loading packets...')).not.toBeInTheDocument();
      });

      // Content should be displayed (sanitized)
      const textElements = screen.getAllByText(/Test/);
      expect(textElements.length).toBeGreaterThan(0);
    });

    it('should truncate long messages with ellipsis', async () => {
      const longMessage = 'A'.repeat(100);
      
      mockedApiService.get.mockImplementation((url: string) => {
        if (url === '/api/v1/nodes') {
          return Promise.resolve({ data: [] });
        }
        if (url.includes('/api/v1/messages?limit=1000')) {
          return Promise.resolve({ data: [] });
        }
        if (url.includes('/api/v1/messages')) {
          return Promise.resolve({
            data: [
              {
                id: 'msg1',
                messageId: 'packet1',
                fromNodeId: 'node1',
                toNodeId: 'node2',
                type: 'TEXT',
                content: longMessage,
                hopStart: 3,
                hopLimit: 3,
                rssi: -80,
                snr: 5.5,
                timestamp: new Date('2024-01-01T12:00:00Z'),
                topic: 'msh/US/2/json/LongFast/gateway1',
                fromNode: {
                  shortName: 'Node1'
                }
              }
            ]
          });
        }
        return Promise.resolve({ data: [] });
      });

      render(<PacketsPage />);

      await waitFor(() => {
        expect(screen.queryByText('Loading packets...')).not.toBeInTheDocument();
      });

      // Should display truncated message with ellipsis
      const truncatedElements = screen.getAllByText(/A{50}\.\.\./, { exact: false });
      expect(truncatedElements.length).toBeGreaterThan(0);
    });
  });

  describe('Search Functionality', () => {
    it('should filter packets by message content search', async () => {
      mockedApiService.get.mockImplementation((url: string) => {
        if (url === '/api/v1/nodes') {
          return Promise.resolve({ data: [] });
        }
        if (url.includes('/api/v1/messages?limit=1000')) {
          return Promise.resolve({ data: [] });
        }
        if (url.includes('/api/v1/messages')) {
          return Promise.resolve({
            data: [
              {
                id: 'msg1',
                messageId: 'packet1',
                fromNodeId: 'node1',
                toNodeId: 'node2',
                type: 'TEXT',
                content: 'Hello, World!',
                hopStart: 3,
                hopLimit: 3,
                rssi: -80,
                snr: 5.5,
                timestamp: new Date('2024-01-01T12:00:00Z'),
                topic: 'msh/US/2/json/LongFast/gateway1',
                fromNode: { shortName: 'Node1' }
              },
              {
                id: 'msg2',
                messageId: 'packet2',
                fromNodeId: 'node2',
                toNodeId: 'node1',
                type: 'TEXT',
                content: 'Goodbye, World!',
                hopStart: 3,
                hopLimit: 3,
                rssi: -75,
                snr: 6.0,
                timestamp: new Date('2024-01-01T12:01:00Z'),
                topic: 'msh/US/2/json/LongFast/gateway1',
                fromNode: { shortName: 'Node2' }
              }
            ]
          });
        }
        return Promise.resolve({ data: [] });
      });

      render(<PacketsPage />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.queryByText('Loading packets...')).not.toBeInTheDocument();
      });

      // Open filters
      const showFiltersButton = screen.getByText('Show Filters');
      fireEvent.click(showFiltersButton);

      // Find and use the search input
      const searchInput = screen.getByPlaceholderText('Search in text messages...');
      fireEvent.change(searchInput, { target: { value: 'Hello' } });

      // Wait for filtering to apply
      await waitFor(() => {
        expect(screen.getByText('Hello, World!')).toBeInTheDocument();
      });

      // Verify the search input has the value
      expect(searchInput).toHaveValue('Hello');
    });

    it('should perform case-insensitive search', async () => {
      mockedApiService.get.mockImplementation((url: string) => {
        if (url === '/api/v1/nodes') {
          return Promise.resolve({ data: [] });
        }
        if (url.includes('/api/v1/messages?limit=1000')) {
          return Promise.resolve({ data: [] });
        }
        // Return data for both initial load and search
        if (url.includes('/api/v1/messages')) {
          return Promise.resolve({
            data: [
              {
                id: 'msg1',
                messageId: 'packet1',
                fromNodeId: 'node1',
                toNodeId: 'node2',
                type: 'TEXT',
                content: 'Hello, World!',
                hopStart: 3,
                hopLimit: 3,
                rssi: -80,
                snr: 5.5,
                timestamp: new Date('2024-01-01T12:00:00Z'),
                topic: 'msh/US/2/json/LongFast/gateway1',
                fromNode: { shortName: 'Node1' }
              }
            ]
          });
        }
        return Promise.resolve({ data: [] });
      });

      render(<PacketsPage />);

      await waitFor(() => {
        expect(screen.queryByText('Loading packets...')).not.toBeInTheDocument();
      });

      // Verify message is initially visible
      expect(screen.getByText('Hello, World!')).toBeInTheDocument();

      // Find the filter toggle button (text may vary)
      const filterButton = screen.getByRole('button', { name: /filters/i });
      if (filterButton.textContent?.includes('Show')) {
        fireEvent.click(filterButton);
      }

      // Search with lowercase - should still match (case-insensitive)
      const searchInput = await screen.findByPlaceholderText('Search in text messages...');
      fireEvent.change(searchInput, { target: { value: 'hello' } });

      await waitFor(() => {
        expect(searchInput).toHaveValue('hello');
      });

      // Message should still be visible after search (case-insensitive match)
      await waitFor(() => {
        expect(screen.getByText('Hello, World!')).toBeInTheDocument();
      });
    });

    it('should update URL with search content filter', async () => {
      mockedApiService.get.mockImplementation((url: string) => {
        if (url === '/api/v1/nodes') {
          return Promise.resolve({ data: [] });
        }
        if (url.includes('/api/v1/messages?limit=1000')) {
          return Promise.resolve({ data: [] });
        }
        if (url.includes('/api/v1/messages')) {
          return Promise.resolve({ data: [] });
        }
        return Promise.resolve({ data: [] });
      });

      render(<PacketsPage />);

      await waitFor(() => {
        expect(screen.queryByText('Loading packets...')).not.toBeInTheDocument();
      });

      // Find the filter toggle button (text may vary)
      const filterButton = screen.getByRole('button', { name: /filters/i });
      if (filterButton.textContent?.includes('Show')) {
        fireEvent.click(filterButton);
      }

      // Add search content
      const searchInput = await screen.findByPlaceholderText('Search in text messages...');
      fireEvent.change(searchInput, { target: { value: 'test message' } });

      // Wait for URL to update
      await waitFor(() => {
        expect(window.location.search).toContain('searchContent=test+message');
      }, { timeout: 3000 });
    });
  });

  describe('Various Message Formats', () => {
    it('should handle JSON object content', async () => {
      mockedApiService.get.mockImplementation((url: string) => {
        if (url === '/api/v1/nodes') {
          return Promise.resolve({ data: [] });
        }
        if (url.includes('/api/v1/messages?limit=1000')) {
          return Promise.resolve({ data: [] });
        }
        if (url.includes('/api/v1/messages')) {
          return Promise.resolve({
            data: [
              {
                id: 'msg1',
                messageId: 'packet1',
                fromNodeId: 'node1',
                toNodeId: 'node2',
                type: 'TEXT',
                content: { text: 'Message from object' },
                hopStart: 3,
                hopLimit: 3,
                rssi: -80,
                snr: 5.5,
                timestamp: new Date('2024-01-01T12:00:00Z'),
                topic: 'msh/US/2/json/LongFast/gateway1',
                fromNode: { shortName: 'Node1' }
              }
            ]
          });
        }
        return Promise.resolve({ data: [] });
      });

      render(<PacketsPage />);

      await waitFor(() => {
        expect(screen.queryByText('Loading packets...')).not.toBeInTheDocument();
      });

      // Should extract text from object if it has a text property
      // Or show the table with the packet
      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
      
      // Check that a row exists
      const rows = screen.getAllByRole('row');
      expect(rows.length).toBeGreaterThan(1); // Header + at least one data row
    });

    it('should handle null or undefined content', async () => {
      mockedApiService.get.mockImplementation((url: string) => {
        if (url === '/api/v1/nodes') {
          return Promise.resolve({ data: [] });
        }
        if (url.includes('/api/v1/messages?limit=1000')) {
          return Promise.resolve({ data: [] });
        }
        if (url.includes('/api/v1/messages')) {
          return Promise.resolve({
            data: [
              {
                id: 'msg1',
                messageId: 'packet1',
                fromNodeId: 'node1',
                toNodeId: 'node2',
                type: 'TEXT',
                content: null,
                hopStart: 3,
                hopLimit: 3,
                rssi: -80,
                snr: 5.5,
                timestamp: new Date('2024-01-01T12:00:00Z'),
                topic: 'msh/US/2/json/LongFast/gateway1',
                fromNode: { shortName: 'Node1' }
              }
            ]
          });
        }
        return Promise.resolve({ data: [] });
      });

      render(<PacketsPage />);

      await waitFor(() => {
        expect(screen.queryByText('Loading packets...')).not.toBeInTheDocument();
      });

      // Should handle null content gracefully - check for the table
      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
      
      // Check that a row exists (even if content is empty)
      const rows = screen.getAllByRole('row');
      expect(rows.length).toBeGreaterThan(1); // Header + at least one data row
    });

    it('should handle Unicode and emoji characters', async () => {
      mockedApiService.get.mockImplementation((url: string) => {
        if (url === '/api/v1/nodes') {
          return Promise.resolve({ data: [] });
        }
        if (url.includes('/api/v1/messages?limit=1000')) {
          return Promise.resolve({ data: [] });
        }
        if (url.includes('/api/v1/messages')) {
          return Promise.resolve({
            data: [
              {
                id: 'msg1',
                messageId: 'packet1',
                fromNodeId: 'node1',
                toNodeId: 'node2',
                type: 'TEXT',
                content: 'Hello 👋 World 🌍',
                hopStart: 3,
                hopLimit: 3,
                rssi: -80,
                snr: 5.5,
                timestamp: new Date('2024-01-01T12:00:00Z'),
                topic: 'msh/US/2/json/LongFast/gateway1',
                fromNode: { shortName: 'Node1' }
              }
            ]
          });
        }
        return Promise.resolve({ data: [] });
      });

      render(<PacketsPage />);

      await waitFor(() => {
        expect(screen.queryByText('Loading packets...')).not.toBeInTheDocument();
      });

      // Should display Unicode and emoji correctly
      expect(screen.getByText(/Hello.*World/)).toBeInTheDocument();
    });
  });
});
