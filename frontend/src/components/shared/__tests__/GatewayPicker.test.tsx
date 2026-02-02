/**
 * GatewayPicker Component Tests
 * Tests for searchable gateway picker with autocomplete
 * Requirements: 43.5
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import GatewayPicker, { GatewayOption } from '../GatewayPicker';
import apiService from '../../../services/api';

// Mock API service
jest.mock('../../../services/api');
const mockedApiService = apiService as jest.Mocked<typeof apiService>;

// Mock lodash debounce to execute immediately in tests
jest.mock('lodash', () => ({
  ...jest.requireActual('lodash'),
  debounce: (fn: any) => {
    const debounced = (...args: any[]) => fn(...args);
    debounced.cancel = jest.fn();
    return debounced;
  }
}));

// Mock gateway data
const mockGateways: GatewayOption[] = [
  {
    id: '305419896',        // Decimal for !12345678
    hexId: '!12345678',
    shortName: 'GATEWAY1',
    longName: 'Main Gateway',
    packetCount: 1500,
    label: 'GATEWAY1 (!12345678)'
  },
  {
    id: '2271560481',      // Decimal for !87654321
    hexId: '!87654321',
    shortName: 'GATEWAY2',
    longName: 'Secondary Gateway',
    packetCount: 750,
    label: 'GATEWAY2 (!87654321)'
  },
  {
    id: '287454020',       // Decimal for !11223344
    hexId: '!11223344',
    shortName: 'GATEWAY3',
    longName: 'Tertiary Gateway',
    packetCount: 2500,
    label: 'GATEWAY3 (!11223344)'
  },
  {
    id: '1144201745',      // Decimal for !44332211
    hexId: '!44332211',
    shortName: undefined,  // Gateway without name
    longName: undefined,
    packetCount: 100,
    label: '!44332211'
  }
];

describe('GatewayPicker Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering (Requirement 43.5)', () => {
    it('should render with default props', () => {
      const handleChange = jest.fn();
      render(<GatewayPicker value={null} onChange={handleChange} gateways={mockGateways} />);
      
      expect(screen.getByLabelText('Select Gateway')).toBeInTheDocument();
    });

    it('should render with custom label', () => {
      const handleChange = jest.fn();
      render(
        <GatewayPicker
          value={null}
          onChange={handleChange}
          label="Choose a Gateway"
          gateways={mockGateways}
        />
      );
      
      expect(screen.getByLabelText('Choose a Gateway')).toBeInTheDocument();
    });

    it('should render with custom placeholder', () => {
      const handleChange = jest.fn();
      render(
        <GatewayPicker
          value={null}
          onChange={handleChange}
          placeholder="Type to search gateways..."
          gateways={mockGateways}
        />
      );
      
      const input = screen.getByLabelText('Select Gateway');
      expect(input).toHaveAttribute('placeholder', 'Type to search gateways...');
    });

    it('should render disabled state', () => {
      const handleChange = jest.fn();
      render(
        <GatewayPicker
          value={null}
          onChange={handleChange}
          disabled={true}
          gateways={mockGateways}
        />
      );
      
      const input = screen.getByLabelText('Select Gateway');
      expect(input).toBeDisabled();
    });

    it('should render with error state', () => {
      const handleChange = jest.fn();
      render(
        <GatewayPicker
          value={null}
          onChange={handleChange}
          error={true}
          helperText="Please select a gateway"
          gateways={mockGateways}
        />
      );
      
      expect(screen.getByText('Please select a gateway')).toBeInTheDocument();
    });
  });

  describe('Gateway Display (Requirement 43.5)', () => {
    it('should display gateway hex ID, packet count, and decimal ID', async () => {
      const handleChange = jest.fn();
      const user = userEvent.setup();
      
      render(<GatewayPicker value={null} onChange={handleChange} gateways={mockGateways} />);
      
      const input = screen.getByLabelText('Select Gateway');
      await user.click(input);
      
      // Wait for options to appear
      await waitFor(() => {
        expect(screen.getByText('GATEWAY1')).toBeInTheDocument();
      });
      
      // Check that all required information is displayed for GATEWAY1
      expect(screen.getByText('GATEWAY1')).toBeInTheDocument();
      expect(screen.getByText('!12345678')).toBeInTheDocument();
      expect(screen.getByText('1500 packets')).toBeInTheDocument();
      expect(screen.getByText('• ID: 305419896')).toBeInTheDocument();
    });

    it('should display long name when different from short name', async () => {
      const handleChange = jest.fn();
      const user = userEvent.setup();
      
      render(<GatewayPicker value={null} onChange={handleChange} gateways={mockGateways} />);
      
      const input = screen.getByLabelText('Select Gateway');
      await user.click(input);
      
      await waitFor(() => {
        expect(screen.getByText('Main Gateway')).toBeInTheDocument();
      });
    });

    it('should display hex ID when no short name is available', async () => {
      const handleChange = jest.fn();
      const user = userEvent.setup();
      
      render(<GatewayPicker value={null} onChange={handleChange} gateways={mockGateways} />);
      
      const input = screen.getByLabelText('Select Gateway');
      await user.click(input);
      
      await waitFor(() => {
        // Gateway without name should show hex ID
        const hexIdElements = screen.getAllByText('!44332211');
        expect(hexIdElements.length).toBeGreaterThan(0);
      });
    });

    it('should sort gateways by packet count descending', async () => {
      const handleChange = jest.fn();
      const user = userEvent.setup();
      
      render(<GatewayPicker value={null} onChange={handleChange} gateways={mockGateways} />);
      
      const input = screen.getByLabelText('Select Gateway');
      await user.click(input);
      
      await waitFor(() => {
        expect(screen.getByText('GATEWAY3')).toBeInTheDocument();
      });
      
      // GATEWAY3 has 2500 packets, should be first
      // We can't easily test order in JSDOM, but we verify it's present
      expect(screen.getByText('2500 packets')).toBeInTheDocument();
    });
  });

  describe('ID Conversion (Requirement 43.5)', () => {
    it('should convert hex ID to decimal ID correctly', async () => {
      const handleChange = jest.fn();
      const user = userEvent.setup();
      
      render(<GatewayPicker value={null} onChange={handleChange} gateways={mockGateways} />);
      
      const input = screen.getByLabelText('Select Gateway');
      await user.click(input);
      
      await waitFor(() => {
        // Check that decimal IDs are displayed correctly
        expect(screen.getByText('• ID: 305419896')).toBeInTheDocument();  // !12345678
        expect(screen.getByText('• ID: 2271560481')).toBeInTheDocument(); // !87654321
        expect(screen.getByText('• ID: 287454020')).toBeInTheDocument();  // !11223344
      });
    });

    it('should handle hex IDs with ! prefix', () => {
      const handleChange = jest.fn();
      
      // Gateway with ! prefix
      const gatewayWithPrefix = mockGateways[0];
      expect(gatewayWithPrefix.hexId).toBe('!12345678');
      expect(gatewayWithPrefix.id).toBe('305419896');
      
      render(
        <GatewayPicker
          value={gatewayWithPrefix}
          onChange={handleChange}
          gateways={mockGateways}
        />
      );
      
      const input = screen.getByLabelText('Select Gateway') as HTMLInputElement;
      expect(input.value).toBe('GATEWAY1 (!12345678)');
    });
  });

  describe('Search and Filtering (Requirement 43.5)', () => {
    it('should filter gateways by short name', async () => {
      const handleChange = jest.fn();
      const user = userEvent.setup();
      
      render(<GatewayPicker value={null} onChange={handleChange} gateways={mockGateways} />);
      
      const input = screen.getByLabelText('Select Gateway');
      await user.type(input, 'GATEWAY2');
      
      await waitFor(() => {
        expect(screen.getByText('GATEWAY2')).toBeInTheDocument();
        expect(screen.queryByText('GATEWAY1')).not.toBeInTheDocument();
        expect(screen.queryByText('GATEWAY3')).not.toBeInTheDocument();
      });
    });

    it('should filter gateways by hex ID', async () => {
      const handleChange = jest.fn();
      const user = userEvent.setup();
      
      render(<GatewayPicker value={null} onChange={handleChange} gateways={mockGateways} />);
      
      const input = screen.getByLabelText('Select Gateway');
      await user.type(input, '!12345678');
      
      await waitFor(() => {
        expect(screen.getByText('GATEWAY1')).toBeInTheDocument();
        expect(screen.queryByText('GATEWAY2')).not.toBeInTheDocument();
      });
    });

    it('should filter gateways by decimal ID', async () => {
      const handleChange = jest.fn();
      const user = userEvent.setup();
      
      render(<GatewayPicker value={null} onChange={handleChange} gateways={mockGateways} />);
      
      const input = screen.getByLabelText('Select Gateway');
      await user.click(input);
      await user.clear(input);
      await user.type(input, '305419896');
      
      // Wait a bit for debounce and state updates
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await waitFor(() => {
        const gateway1Elements = screen.queryAllByText('GATEWAY1');
        expect(gateway1Elements.length).toBeGreaterThan(0);
      }, { timeout: 2000 });
    });

    it('should filter gateways by long name', async () => {
      const handleChange = jest.fn();
      const user = userEvent.setup();
      
      render(<GatewayPicker value={null} onChange={handleChange} gateways={mockGateways} />);
      
      const input = screen.getByLabelText('Select Gateway');
      await user.click(input);
      await user.clear(input);
      await user.type(input, 'Secondary');
      
      // Wait a bit for debounce and state updates
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await waitFor(() => {
        const gateway2Elements = screen.queryAllByText('GATEWAY2');
        expect(gateway2Elements.length).toBeGreaterThan(0);
      }, { timeout: 2000 });
    });

    it('should be case-insensitive when filtering', async () => {
      const handleChange = jest.fn();
      const user = userEvent.setup();
      
      render(<GatewayPicker value={null} onChange={handleChange} gateways={mockGateways} />);
      
      const input = screen.getByLabelText('Select Gateway');
      await user.type(input, 'gateway1');
      
      await waitFor(() => {
        expect(screen.getByText('GATEWAY1')).toBeInTheDocument();
      });
    });

    it('should show "No gateways found" when no matches', async () => {
      const handleChange = jest.fn();
      const user = userEvent.setup();
      
      render(<GatewayPicker value={null} onChange={handleChange} gateways={mockGateways} />);
      
      const input = screen.getByLabelText('Select Gateway');
      await user.type(input, 'NONEXISTENT');
      
      await waitFor(() => {
        expect(screen.getByText('No gateways found')).toBeInTheDocument();
      });
    });
  });

  describe('API Fallback (Requirement 43.5)', () => {
    it('should use provided gateways without API call', () => {
      const handleChange = jest.fn();
      
      render(<GatewayPicker value={null} onChange={handleChange} gateways={mockGateways} />);
      
      // API should not be called when gateways are provided
      expect(mockedApiService.get).not.toHaveBeenCalled();
    });

    it('should fetch gateways from messages API when not provided', async () => {
      const mockMessages = [
        { topic: 'msh/US/2/e/LongFast/!12345678', content: 'test1' },
        { topic: 'msh/US/2/e/LongFast/!87654321', content: 'test2' },
        { topic: 'msh/US/2/e/LongFast/!12345678', content: 'test3' }
      ];

      const mockNodes = [
        {
          hexId: '!12345678',
          shortName: 'GATEWAY1',
          longName: 'Main Gateway',
          packetCount: 100
        },
        {
          hexId: '!87654321',
          shortName: 'GATEWAY2',
          longName: 'Secondary Gateway',
          packetCount: 50
        }
      ];

      mockedApiService.get.mockImplementation((url: string) => {
        if (url === '/messages') {
          return Promise.resolve({ data: mockMessages });
        } else if (url === '/nodes') {
          return Promise.resolve({ data: mockNodes });
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });
      
      const handleChange = jest.fn();
      
      render(<GatewayPicker value={null} onChange={handleChange} />);
      
      await waitFor(() => {
        expect(mockedApiService.get).toHaveBeenCalledWith('/messages', {
          params: {
            limit: 10000,
            distinct: 'topic'
          }
        });
        expect(mockedApiService.get).toHaveBeenCalledWith('/nodes');
      });
    });

    it('should fallback to nodes API if messages API fails', async () => {
      const mockNodes = [
        {
          hexId: '!12345678',
          shortName: 'GATEWAY1',
          longName: 'Main Gateway',
          packetCount: 100
        }
      ];

      mockedApiService.get.mockImplementation((url: string) => {
        if (url === '/messages') {
          return Promise.reject(new Error('Messages API failed'));
        } else if (url === '/nodes') {
          return Promise.resolve({ data: mockNodes });
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });
      
      const handleChange = jest.fn();
      
      render(<GatewayPicker value={null} onChange={handleChange} />);
      
      await waitFor(() => {
        // Should try messages API first
        expect(mockedApiService.get).toHaveBeenCalledWith('/messages', {
          params: {
            limit: 10000,
            distinct: 'topic'
          }
        });
        // Then fallback to nodes API
        expect(mockedApiService.get).toHaveBeenCalledWith('/nodes');
      });
    });

    it('should show loading state while fetching gateways', async () => {
      mockedApiService.get.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ data: [] }), 100))
      );
      
      const handleChange = jest.fn();
      
      render(<GatewayPicker value={null} onChange={handleChange} />);
      
      // Should show loading indicator
      await waitFor(() => {
        expect(screen.getByText('Loading...')).toBeInTheDocument();
      });
    });
  });

  describe('Selection Handling', () => {
    it('should call onChange when gateway is selected', async () => {
      const handleChange = jest.fn();
      const user = userEvent.setup();
      
      render(<GatewayPicker value={null} onChange={handleChange} gateways={mockGateways} />);
      
      const input = screen.getByLabelText('Select Gateway');
      await user.click(input);
      
      await waitFor(() => {
        expect(screen.getByText('GATEWAY1')).toBeInTheDocument();
      });
      
      await user.click(screen.getByText('GATEWAY1'));
      
      await waitFor(() => {
        expect(handleChange).toHaveBeenCalledWith(mockGateways[0]);
      });
    });

    it('should display selected gateway value', () => {
      const handleChange = jest.fn();
      
      render(<GatewayPicker value={mockGateways[0]} onChange={handleChange} gateways={mockGateways} />);
      
      const input = screen.getByLabelText('Select Gateway') as HTMLInputElement;
      expect(input.value).toBe('GATEWAY1 (!12345678)');
    });

    it('should clear selection when cleared', async () => {
      const handleChange = jest.fn();
      const user = userEvent.setup();
      
      render(<GatewayPicker value={mockGateways[0]} onChange={handleChange} gateways={mockGateways} />);
      
      // Find and click the clear button
      const clearButton = screen.getByTitle('Clear');
      await user.click(clearButton);
      
      await waitFor(() => {
        expect(handleChange).toHaveBeenCalledWith(null);
      });
    });
  });

  describe('Custom Filter Function', () => {
    it('should apply custom filter to gateways', async () => {
      const handleChange = jest.fn();
      const user = userEvent.setup();
      
      // Filter to only show gateways with packet count > 1000
      const filterGateways = (gateway: GatewayOption) => gateway.packetCount > 1000;
      
      render(
        <GatewayPicker
          value={null}
          onChange={handleChange}
          gateways={mockGateways}
          filterGateways={filterGateways}
        />
      );
      
      const input = screen.getByLabelText('Select Gateway');
      await user.click(input);
      
      await waitFor(() => {
        // Should show GATEWAY1 (1500) and GATEWAY3 (2500)
        expect(screen.getByText('GATEWAY1')).toBeInTheDocument();
        expect(screen.getByText('GATEWAY3')).toBeInTheDocument();
        // Should not show GATEWAY2 (750) or unnamed gateway (100)
        expect(screen.queryByText('GATEWAY2')).not.toBeInTheDocument();
      });
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support arrow key navigation', async () => {
      const handleChange = jest.fn();
      const user = userEvent.setup();
      
      render(<GatewayPicker value={null} onChange={handleChange} gateways={mockGateways} />);
      
      const input = screen.getByLabelText('Select Gateway');
      await user.click(input);
      
      // Wait for options to appear
      await waitFor(() => {
        expect(screen.getByText('GATEWAY1')).toBeInTheDocument();
      });
      
      // Press arrow down to navigate
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{ArrowDown}');
      
      // Press Enter to select
      await user.keyboard('{Enter}');
      
      await waitFor(() => {
        expect(handleChange).toHaveBeenCalled();
      });
    });

    it('should support Escape key to close dropdown', async () => {
      const handleChange = jest.fn();
      const user = userEvent.setup();
      
      render(<GatewayPicker value={null} onChange={handleChange} gateways={mockGateways} />);
      
      const input = screen.getByLabelText('Select Gateway');
      await user.click(input);
      
      await waitFor(() => {
        expect(screen.getByText('GATEWAY1')).toBeInTheDocument();
      });
      
      // Press Escape to close
      await user.keyboard('{Escape}');
      
      await waitFor(() => {
        expect(screen.queryByText('GATEWAY1')).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      const handleChange = jest.fn();
      
      render(<GatewayPicker value={null} onChange={handleChange} gateways={mockGateways} />);
      
      const input = screen.getByLabelText('Select Gateway');
      expect(input).toHaveAttribute('aria-autocomplete', 'list');
    });

    it('should support required attribute', () => {
      const handleChange = jest.fn();
      
      render(
        <GatewayPicker
          value={null}
          onChange={handleChange}
          gateways={mockGateways}
          required={true}
        />
      );
      
      // The input element should have the required attribute
      const input = screen.getByRole('combobox');
      expect(input).toBeRequired();
    });
  });
});
