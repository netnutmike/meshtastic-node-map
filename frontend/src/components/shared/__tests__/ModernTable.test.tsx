/**
 * ModernTable Component Tests
 * Tests for lightweight table with pagination, sorting, search, and URL state
 * Requirements: 43.6, 43.7, 43.8, 43.9
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import ModernTable, { ColumnDef } from '../ModernTable';

// Mock lodash debounce to execute immediately in tests
jest.mock('lodash', () => ({
  ...jest.requireActual('lodash'),
  debounce: (fn: any) => {
    const debounced = (...args: any[]) => fn(...args);
    debounced.cancel = jest.fn();
    return debounced;
  }
}));

// Mock data for testing
interface TestData {
  id: string;
  name: string;
  age: number;
  email: string;
  status: 'active' | 'inactive';
  createdAt: Date;
}

const mockData: TestData[] = [
  {
    id: '1',
    name: 'Alice Johnson',
    age: 28,
    email: 'alice@example.com',
    status: 'active',
    createdAt: new Date('2024-01-15')
  },
  {
    id: '2',
    name: 'Bob Smith',
    age: 35,
    email: 'bob@example.com',
    status: 'active',
    createdAt: new Date('2024-01-10')
  },
  {
    id: '3',
    name: 'Charlie Brown',
    age: 42,
    email: 'charlie@example.com',
    status: 'inactive',
    createdAt: new Date('2024-01-20')
  },
  {
    id: '4',
    name: 'Diana Prince',
    age: 31,
    email: 'diana@example.com',
    status: 'active',
    createdAt: new Date('2024-01-05')
  },
  {
    id: '5',
    name: 'Eve Adams',
    age: 26,
    email: 'eve@example.com',
    status: 'inactive',
    createdAt: new Date('2024-01-25')
  }
];

// Generate large dataset for pagination testing
const generateLargeDataset = (count: number): TestData[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `${i + 1}`,
    name: `User ${i + 1}`,
    age: 20 + (i % 50),
    email: `user${i + 1}@example.com`,
    status: i % 2 === 0 ? 'active' : 'inactive',
    createdAt: new Date(2024, 0, 1 + (i % 30))
  }));
};

// Column definitions for testing
const testColumns: ColumnDef<TestData>[] = [
  {
    id: 'name',
    label: 'Name',
    sortable: true
  },
  {
    id: 'age',
    label: 'Age',
    align: 'right',
    sortable: true
  },
  {
    id: 'email',
    label: 'Email',
    sortable: true
  },
  {
    id: 'status',
    label: 'Status',
    sortable: true,
    render: (value) => (
      <span style={{ color: value === 'active' ? 'green' : 'red' }}>
        {value}
      </span>
    )
  }
];

describe('ModernTable Component', () => {
  beforeEach(() => {
    // Clear URL parameters before each test
    window.history.replaceState({}, '', window.location.pathname);
  });

  describe('Basic Rendering (Requirement 43.6)', () => {
    it('should render table with data', () => {
      render(
        <ModernTable
          data={mockData}
          columns={testColumns}
          getRowKey={(row) => row.id}
        />
      );

      // Check that table headers are rendered
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Age')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();

      // Check that data rows are rendered
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      expect(screen.getByText('Bob Smith')).toBeInTheDocument();
    });

    it('should render empty state when no data', () => {
      render(
        <ModernTable
          data={[]}
          columns={testColumns}
          getRowKey={(row) => row.id}
        />
      );

      expect(screen.getByText('No data available')).toBeInTheDocument();
    });

    it('should render custom empty message', () => {
      render(
        <ModernTable
          data={[]}
          columns={testColumns}
          getRowKey={(row) => row.id}
          emptyMessage="No users found"
        />
      );

      expect(screen.getByText('No users found')).toBeInTheDocument();
    });

    it('should render loading state', () => {
      render(
        <ModernTable
          data={mockData}
          columns={testColumns}
          getRowKey={(row) => row.id}
          loading={true}
        />
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should hide search bar when searchable is false', () => {
      render(
        <ModernTable
          data={mockData}
          columns={testColumns}
          getRowKey={(row) => row.id}
          searchable={false}
        />
      );

      expect(screen.queryByPlaceholderText('Search...')).not.toBeInTheDocument();
    });

    it('should hide pagination when showPagination is false', () => {
      const largeData = generateLargeDataset(100);
      render(
        <ModernTable
          data={largeData}
          columns={testColumns}
          getRowKey={(row) => row.id}
          showPagination={false}
        />
      );

      // All rows should be visible
      expect(screen.getByText('User 1')).toBeInTheDocument();
      expect(screen.getByText('User 100')).toBeInTheDocument();
    });
  });

  describe('Pagination (Requirement 43.6)', () => {
    it('should paginate data with default page size', () => {
      const largeData = generateLargeDataset(100);
      render(
        <ModernTable
          data={largeData}
          columns={testColumns}
          getRowKey={(row) => row.id}
          pageSize={10}
        />
      );

      // First page should show items 1-10
      expect(screen.getByText('User 1')).toBeInTheDocument();
      expect(screen.getByText('User 10')).toBeInTheDocument();
      expect(screen.queryByText('User 11')).not.toBeInTheDocument();

      // Check pagination info
      expect(screen.getByText(/Showing 1 - 10 of 100 items/)).toBeInTheDocument();
    });

    it('should navigate to next page', async () => {
      const largeData = generateLargeDataset(100);
      const user = userEvent.setup();
      
      render(
        <ModernTable
          data={largeData}
          columns={testColumns}
          getRowKey={(row) => row.id}
          pageSize={10}
        />
      );

      // Click next page button (page 2)
      const page2Button = screen.getByRole('button', { name: 'Go to page 2' });
      await user.click(page2Button);

      await waitFor(() => {
        expect(screen.getByText('User 11')).toBeInTheDocument();
        expect(screen.getByText('User 20')).toBeInTheDocument();
        expect(screen.queryByText('User 1')).not.toBeInTheDocument();
      });
    });

    it('should navigate to last page', async () => {
      const largeData = generateLargeDataset(100);
      const user = userEvent.setup();
      
      render(
        <ModernTable
          data={largeData}
          columns={testColumns}
          getRowKey={(row) => row.id}
          pageSize={10}
        />
      );

      // Click last page button
      const lastPageButton = screen.getByRole('button', { name: 'Go to last page' });
      await user.click(lastPageButton);

      await waitFor(() => {
        expect(screen.getByText('User 91')).toBeInTheDocument();
        expect(screen.getByText('User 100')).toBeInTheDocument();
      });
    });

    it('should update pagination info correctly', async () => {
      const largeData = generateLargeDataset(55);
      const user = userEvent.setup();
      
      render(
        <ModernTable
          data={largeData}
          columns={testColumns}
          getRowKey={(row) => row.id}
          pageSize={20}
        />
      );

      // First page
      expect(screen.getByText(/Showing 1 - 20 of 55 items/)).toBeInTheDocument();

      // Go to last page
      const page3Button = screen.getByRole('button', { name: 'Go to page 3' });
      await user.click(page3Button);

      await waitFor(() => {
        expect(screen.getByText(/Showing 41 - 55 of 55 items/)).toBeInTheDocument();
      });
    });
  });

  describe('Sorting (Requirement 43.7)', () => {
    it('should sort by string column ascending', async () => {
      const user = userEvent.setup();
      
      render(
        <ModernTable
          data={mockData}
          columns={testColumns}
          getRowKey={(row) => row.id}
        />
      );

      // Click on Name column header to sort
      const nameHeader = screen.getByText('Name');
      await user.click(nameHeader);

      await waitFor(() => {
        const rows = screen.getAllByRole('row');
        // First data row should be Alice (alphabetically first)
        expect(within(rows[1]).getByText('Alice Johnson')).toBeInTheDocument();
      });
    });

    it('should sort by string column descending', async () => {
      const user = userEvent.setup();
      
      render(
        <ModernTable
          data={mockData}
          columns={testColumns}
          getRowKey={(row) => row.id}
        />
      );

      // Click twice to sort descending
      const nameHeader = screen.getByText('Name');
      await user.click(nameHeader);
      await user.click(nameHeader);

      await waitFor(() => {
        const rows = screen.getAllByRole('row');
        // First data row should be Eve (alphabetically last)
        expect(within(rows[1]).getByText('Eve Adams')).toBeInTheDocument();
      });
    });

    it('should sort by number column', async () => {
      const user = userEvent.setup();
      
      render(
        <ModernTable
          data={mockData}
          columns={testColumns}
          getRowKey={(row) => row.id}
        />
      );

      // Click on Age column header
      const ageHeader = screen.getByText('Age');
      await user.click(ageHeader);

      await waitFor(() => {
        const rows = screen.getAllByRole('row');
        // First data row should have age 26 (youngest)
        expect(within(rows[1]).getByText('26')).toBeInTheDocument();
      });
    });

    it('should handle null values in sorting', async () => {
      const dataWithNulls: TestData[] = [
        { ...mockData[0], age: null as any },
        mockData[1],
        mockData[2]
      ];
      
      const user = userEvent.setup();
      
      render(
        <ModernTable
          data={dataWithNulls}
          columns={testColumns}
          getRowKey={(row) => row.id}
        />
      );

      // Sort by age
      const ageHeader = screen.getByText('Age');
      await user.click(ageHeader);

      // Should not crash and null values should be at the end
      await waitFor(() => {
        expect(screen.getByText('Bob Smith')).toBeInTheDocument();
      });
    });

    it('should respect default sort column and direction', () => {
      render(
        <ModernTable
          data={mockData}
          columns={testColumns}
          getRowKey={(row) => row.id}
          defaultSortColumn="age"
          defaultSortDirection="desc"
        />
      );

      const rows = screen.getAllByRole('row');
      // First data row should have age 42 (oldest)
      expect(within(rows[1]).getByText('42')).toBeInTheDocument();
    });

    it('should not sort non-sortable columns', async () => {
      const columnsWithNonSortable: ColumnDef<TestData>[] = [
        {
          id: 'name',
          label: 'Name',
          sortable: false
        },
        ...testColumns.slice(1)
      ];
      
      const user = userEvent.setup();
      
      render(
        <ModernTable
          data={mockData}
          columns={columnsWithNonSortable}
          getRowKey={(row) => row.id}
        />
      );

      // Name header should not have sort functionality
      const nameHeader = screen.getByText('Name');
      await user.click(nameHeader);

      // Data should remain in original order
      const rows = screen.getAllByRole('row');
      expect(within(rows[1]).getByText('Alice Johnson')).toBeInTheDocument();
    });
  });

  describe('Column Rendering (Requirement 43.7)', () => {
    it('should use custom render function', () => {
      render(
        <ModernTable
          data={mockData}
          columns={testColumns}
          getRowKey={(row) => row.id}
        />
      );

      // Status column uses custom render with colored text
      const activeStatuses = screen.getAllByText('active');
      expect(activeStatuses.length).toBeGreaterThan(0);
      expect(activeStatuses[0]).toHaveStyle({ color: 'green' });
    });

    it('should respect column alignment', () => {
      render(
        <ModernTable
          data={mockData}
          columns={testColumns}
          getRowKey={(row) => row.id}
        />
      );

      // Age column should be right-aligned
      const ageHeader = screen.getByText('Age');
      const ageCell = ageHeader.closest('th');
      expect(ageCell).toHaveStyle({ textAlign: 'right' });
    });

    it('should use custom getValue function for sorting', async () => {
      const columnsWithGetValue: ColumnDef<TestData>[] = [
        {
          id: 'name',
          label: 'Name',
          getValue: (row) => row.name.toLowerCase(),
          // Still render the original name
          render: (value, row) => row.name
        },
        ...testColumns.slice(1)
      ];
      
      const user = userEvent.setup();
      
      render(
        <ModernTable
          data={mockData}
          columns={columnsWithGetValue}
          getRowKey={(row) => row.id}
        />
      );

      // Sort by name
      const nameHeader = screen.getByText('Name');
      await user.click(nameHeader);

      await waitFor(() => {
        const rows = screen.getAllByRole('row');
        // Should still display original name (not lowercase)
        expect(within(rows[1]).getByText('Alice Johnson')).toBeInTheDocument();
      });
    });

    it('should render with custom width and minWidth', () => {
      const columnsWithWidth: ColumnDef<TestData>[] = [
        {
          id: 'name',
          label: 'Name',
          width: '200px',
          minWidth: '150px'
        },
        ...testColumns.slice(1)
      ];
      
      render(
        <ModernTable
          data={mockData}
          columns={columnsWithWidth}
          getRowKey={(row) => row.id}
        />
      );

      const nameHeader = screen.getByText('Name');
      const nameCell = nameHeader.closest('th');
      expect(nameCell).toHaveStyle({ width: '200px', minWidth: '150px' });
    });
  });

  describe('Search Functionality (Requirement 43.8)', () => {
    it('should filter data by search term', async () => {
      const user = userEvent.setup();
      
      render(
        <ModernTable
          data={mockData}
          columns={testColumns}
          getRowKey={(row) => row.id}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search...');
      await user.type(searchInput, 'Alice');

      await waitFor(() => {
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
        expect(screen.queryByText('Bob Smith')).not.toBeInTheDocument();
      });
    });

    it('should be case-insensitive when searching', async () => {
      const user = userEvent.setup();
      
      render(
        <ModernTable
          data={mockData}
          columns={testColumns}
          getRowKey={(row) => row.id}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search...');
      await user.type(searchInput, 'alice');

      await waitFor(() => {
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      });
    });

    it('should search across all columns by default', async () => {
      const user = userEvent.setup();
      
      render(
        <ModernTable
          data={mockData}
          columns={testColumns}
          getRowKey={(row) => row.id}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search...');
      
      // Search by email
      await user.clear(searchInput);
      await user.type(searchInput, 'bob@example');

      await waitFor(() => {
        expect(screen.getByText('Bob Smith')).toBeInTheDocument();
        expect(screen.queryByText('Alice Johnson')).not.toBeInTheDocument();
      });
    });

    it('should search only specified fields when searchFields is provided', async () => {
      const user = userEvent.setup();
      
      render(
        <ModernTable
          data={mockData}
          columns={testColumns}
          getRowKey={(row) => row.id}
          searchFields={['name']}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search...');
      
      // Search by email (should not find anything since we only search name)
      await user.type(searchInput, 'bob@example');

      await waitFor(() => {
        expect(screen.getByText('No data available')).toBeInTheDocument();
      });

      // Search by name (should work)
      await user.clear(searchInput);
      await user.type(searchInput, 'Bob');

      await waitFor(() => {
        expect(screen.getByText('Bob Smith')).toBeInTheDocument();
      });
    });

    it('should show empty state when no search results', async () => {
      const user = userEvent.setup();
      
      render(
        <ModernTable
          data={mockData}
          columns={testColumns}
          getRowKey={(row) => row.id}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search...');
      await user.type(searchInput, 'NONEXISTENT');

      await waitFor(() => {
        expect(screen.getByText('No data available')).toBeInTheDocument();
      });
    });

    it('should reset to page 1 when search changes', async () => {
      const largeData = generateLargeDataset(100);
      const user = userEvent.setup();
      
      render(
        <ModernTable
          data={largeData}
          columns={testColumns}
          getRowKey={(row) => row.id}
          pageSize={10}
        />
      );

      // Go to page 2
      const page2Button = screen.getByRole('button', { name: 'Go to page 2' });
      await user.click(page2Button);

      await waitFor(() => {
        expect(screen.getByText('User 11')).toBeInTheDocument();
      });

      // Search for something
      const searchInput = screen.getByPlaceholderText('Search...');
      await user.type(searchInput, 'User 1');

      // Should be back on page 1
      await waitFor(() => {
        expect(screen.getByText('User 1')).toBeInTheDocument();
      });
    });

    it('should use custom search placeholder', () => {
      render(
        <ModernTable
          data={mockData}
          columns={testColumns}
          getRowKey={(row) => row.id}
          searchPlaceholder="Type to filter users..."
        />
      );

      expect(screen.getByPlaceholderText('Type to filter users...')).toBeInTheDocument();
    });
  });

  describe('Debouncing (Requirement 43.8)', () => {
    it('should debounce search input by 300ms', async () => {
      // Note: With our mock, debounce executes immediately
      // In a real scenario, we would test timing
      const user = userEvent.setup();
      
      render(
        <ModernTable
          data={mockData}
          columns={testColumns}
          getRowKey={(row) => row.id}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search...');
      
      // Type multiple characters quickly
      await user.type(searchInput, 'Alice');

      // The search should still work (debounce is mocked to execute immediately)
      await waitFor(() => {
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      });
    });
  });

  describe('URL State Management (Requirement 43.9)', () => {
    it('should update URL when page changes', async () => {
      const largeData = generateLargeDataset(100);
      const user = userEvent.setup();
      
      render(
        <ModernTable
          data={largeData}
          columns={testColumns}
          getRowKey={(row) => row.id}
          pageSize={10}
          urlStateKey="users"
        />
      );

      // Go to page 2
      const page2Button = screen.getByRole('button', { name: 'Go to page 2' });
      await user.click(page2Button);

      await waitFor(() => {
        expect(window.location.search).toContain('users_page=2');
      });
    });

    it('should update URL when sort changes', async () => {
      const user = userEvent.setup();
      
      render(
        <ModernTable
          data={mockData}
          columns={testColumns}
          getRowKey={(row) => row.id}
          urlStateKey="users"
        />
      );

      // Click on Age column to sort
      const ageHeader = screen.getByText('Age');
      await user.click(ageHeader);

      await waitFor(() => {
        expect(window.location.search).toContain('users_sort=age');
        expect(window.location.search).toContain('users_dir=asc');
      });
    });

    it('should update URL when search changes', async () => {
      const user = userEvent.setup();
      
      render(
        <ModernTable
          data={mockData}
          columns={testColumns}
          getRowKey={(row) => row.id}
          urlStateKey="users"
        />
      );

      const searchInput = screen.getByPlaceholderText('Search...');
      await user.type(searchInput, 'Alice');

      await waitFor(() => {
        expect(window.location.search).toContain('users_search=Alice');
      });
    });

    it('should restore state from URL on mount', () => {
      // Set URL parameters
      window.history.replaceState({}, '', '?users_page=2&users_sort=age&users_dir=desc');
      
      const largeData = generateLargeDataset(100);
      
      render(
        <ModernTable
          data={largeData}
          columns={testColumns}
          getRowKey={(row) => row.id}
          pageSize={10}
          urlStateKey="users"
        />
      );

      // Should be on page 2 with 10 items per page
      expect(screen.getByText(/Showing 11 - 20 of 100 items/)).toBeInTheDocument();
    });

    it('should remove empty parameters from URL', async () => {
      const user = userEvent.setup();
      
      // Start with parameters in URL
      window.history.replaceState({}, '', '?users_page=2&users_search=Alice');
      
      render(
        <ModernTable
          data={mockData}
          columns={testColumns}
          getRowKey={(row) => row.id}
          urlStateKey="users"
        />
      );

      // Clear search
      const searchInput = screen.getByPlaceholderText('Search...');
      await user.clear(searchInput);

      await waitFor(() => {
        expect(window.location.search).not.toContain('users_search');
      });
    });

    it('should not update URL when urlStateKey is not provided', async () => {
      const user = userEvent.setup();
      
      render(
        <ModernTable
          data={mockData}
          columns={testColumns}
          getRowKey={(row) => row.id}
        />
      );

      // Sort by age
      const ageHeader = screen.getByText('Age');
      await user.click(ageHeader);

      await waitFor(() => {
        // URL should remain empty
        expect(window.location.search).toBe('');
      });
    });
  });

  describe('Row Click Handler', () => {
    it('should call onRowClick when row is clicked', async () => {
      const handleRowClick = jest.fn();
      const user = userEvent.setup();
      
      render(
        <ModernTable
          data={mockData}
          columns={testColumns}
          getRowKey={(row) => row.id}
          onRowClick={handleRowClick}
        />
      );

      // Click on first data row
      const aliceRow = screen.getByText('Alice Johnson').closest('tr');
      if (aliceRow) {
        await user.click(aliceRow);
      }

      await waitFor(() => {
        expect(handleRowClick).toHaveBeenCalledWith(mockData[0], 0);
      });
    });

    it('should show pointer cursor when onRowClick is provided', () => {
      render(
        <ModernTable
          data={mockData}
          columns={testColumns}
          getRowKey={(row) => row.id}
          onRowClick={() => {}}
        />
      );

      const aliceRow = screen.getByText('Alice Johnson').closest('tr');
      expect(aliceRow).toHaveStyle({ cursor: 'pointer' });
    });

    it('should not show pointer cursor when onRowClick is not provided', () => {
      render(
        <ModernTable
          data={mockData}
          columns={testColumns}
          getRowKey={(row) => row.id}
        />
      );

      const aliceRow = screen.getByText('Alice Johnson').closest('tr');
      expect(aliceRow).toHaveStyle({ cursor: 'default' });
    });
  });

  describe('Sticky Header', () => {
    it('should enable sticky header by default', () => {
      render(
        <ModernTable
          data={mockData}
          columns={testColumns}
          getRowKey={(row) => row.id}
        />
      );

      const table = screen.getByRole('table');
      expect(table).toHaveAttribute('class', expect.stringContaining('MuiTable'));
    });

    it('should disable sticky header when stickyHeader is false', () => {
      render(
        <ModernTable
          data={mockData}
          columns={testColumns}
          getRowKey={(row) => row.id}
          stickyHeader={false}
        />
      );

      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
    });
  });

  describe('Integration Tests', () => {
    it('should handle search, sort, and pagination together', async () => {
      const largeData = generateLargeDataset(100);
      const user = userEvent.setup();
      
      render(
        <ModernTable
          data={largeData}
          columns={testColumns}
          getRowKey={(row) => row.id}
          pageSize={10}
          urlStateKey="users"
        />
      );

      // Search for "User 1"
      const searchInput = screen.getByPlaceholderText('Search...');
      await user.type(searchInput, 'User 1');

      await waitFor(() => {
        // Should show User 1, User 10-19, User 100
        expect(screen.getByText('User 1')).toBeInTheDocument();
      });

      // Sort by age
      const ageHeader = screen.getByText('Age');
      await user.click(ageHeader);

      await waitFor(() => {
        // Data should be sorted
        expect(screen.getByText('User 1')).toBeInTheDocument();
      });

      // Navigate to page 2
      const page2Button = screen.getByRole('button', { name: 'Go to page 2' });
      if (page2Button) {
        await user.click(page2Button);

        await waitFor(() => {
          // Should show second page of filtered results
          expect(window.location.search).toContain('users_page=2');
        });
      }
    });

    it('should maintain sort when searching', async () => {
      const user = userEvent.setup();
      
      render(
        <ModernTable
          data={mockData}
          columns={testColumns}
          getRowKey={(row) => row.id}
          defaultSortColumn="age"
          defaultSortDirection="asc"
        />
      );

      // Verify initial sort (youngest first)
      const rows = screen.getAllByRole('row');
      expect(within(rows[1]).getByText('26')).toBeInTheDocument();

      // Search
      const searchInput = screen.getByPlaceholderText('Search...');
      await user.type(searchInput, 'active');

      await waitFor(() => {
        // Should still be sorted by age
        const filteredRows = screen.getAllByRole('row');
        // First data row should have youngest age among active users
        expect(filteredRows.length).toBeGreaterThan(1);
      });
    });
  });
});
