/**
 * ModernTable Component
 * Lightweight table with pagination, sorting, search, and URL state management
 * Requirements: 43.6, 43.7, 43.8, 43.9
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Paper,
  TextField,
  Box,
  Pagination,
  Typography,
  Stack,
  InputAdornment
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

// Simple debounce implementation to avoid lodash dependency
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export interface ColumnDef<T> {
  id: string;
  label: string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  width?: string | number;
  minWidth?: string | number;
  // Custom render function for cell content
  render?: (value: any, row: T, index: number) => React.ReactNode;
  // Custom value accessor for sorting/filtering
  getValue?: (row: T) => any;
}

export interface ModernTableProps<T> {
  // Data
  data: T[];
  columns: ColumnDef<T>[];
  
  // Unique key for each row
  getRowKey: (row: T, index: number) => string | number;
  
  // Pagination
  pageSize?: number;
  showPagination?: boolean;
  
  // Search
  searchable?: boolean;
  searchPlaceholder?: string;
  searchFields?: string[]; // Field names to search in
  
  // Sorting
  defaultSortColumn?: string;
  defaultSortDirection?: 'asc' | 'desc';
  
  // URL State Management
  urlStateKey?: string; // Unique key for this table's URL state
  
  // Styling
  stickyHeader?: boolean;
  maxHeight?: string | number;
  
  // Empty state
  emptyMessage?: string;
  
  // Row click handler
  onRowClick?: (row: T, index: number) => void;
  
  // Loading state
  loading?: boolean;
}

interface TableState {
  page: number;
  sortColumn: string;
  sortDirection: 'asc' | 'desc';
  searchTerm: string;
}

function ModernTable<T extends Record<string, any>>({
  data,
  columns,
  getRowKey,
  pageSize = 50,
  showPagination = true,
  searchable = true,
  searchPlaceholder = 'Search...',
  searchFields,
  defaultSortColumn,
  defaultSortDirection = 'asc',
  urlStateKey,
  stickyHeader = true,
  maxHeight = 'calc(100vh - 300px)',
  emptyMessage = 'No data available',
  onRowClick,
  loading = false
}: ModernTableProps<T>) {
  // Initialize state from URL if urlStateKey is provided
  const getInitialState = (): TableState => {
    if (urlStateKey && typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const prefix = `${urlStateKey}_`;
      
      return {
        page: parseInt(params.get(`${prefix}page`) || '1', 10),
        sortColumn: params.get(`${prefix}sort`) || defaultSortColumn || '',
        sortDirection: (params.get(`${prefix}dir`) as 'asc' | 'desc') || defaultSortDirection,
        searchTerm: params.get(`${prefix}search`) || ''
      };
    }
    
    return {
      page: 1,
      sortColumn: defaultSortColumn || '',
      sortDirection: defaultSortDirection,
      searchTerm: ''
    };
  };

  const [state, setState] = useState<TableState>(getInitialState);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(state.searchTerm);

  // Debounced search handler (300ms)
  const debouncedSearch = useMemo(
    () =>
      debounce((term: string) => {
        setDebouncedSearchTerm(term);
        // Reset to page 1 when search changes
        setState(prev => ({ ...prev, page: 1 }));
      }, 300),
    []
  );

  // Update URL when state changes (debounced by 300ms)
  const updateURL = useMemo(
    () =>
      debounce((newState: TableState) => {
        if (!urlStateKey || typeof window === 'undefined') return;
        
        const params = new URLSearchParams(window.location.search);
        const prefix = `${urlStateKey}_`;
        
        // Update or remove parameters
        if (newState.page > 1) {
          params.set(`${prefix}page`, newState.page.toString());
        } else {
          params.delete(`${prefix}page`);
        }
        
        if (newState.sortColumn) {
          params.set(`${prefix}sort`, newState.sortColumn);
          params.set(`${prefix}dir`, newState.sortDirection);
        } else {
          params.delete(`${prefix}sort`);
          params.delete(`${prefix}dir`);
        }
        
        if (newState.searchTerm) {
          params.set(`${prefix}search`, newState.searchTerm);
        } else {
          params.delete(`${prefix}search`);
        }
        
        // Update URL without page reload
        const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
        window.history.replaceState({}, '', newUrl);
      }, 300),
    [urlStateKey]
  );

  // Update URL when state changes
  useEffect(() => {
    updateURL(state);
  }, [state, updateURL]);

  // Handle search input change
  const handleSearchChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setState(prev => ({ ...prev, searchTerm: value }));
      debouncedSearch(value);
    },
    [debouncedSearch]
  );

  // Handle sort change
  const handleSortChange = useCallback((columnId: string) => {
    setState(prev => {
      const isCurrentColumn = prev.sortColumn === columnId;
      return {
        ...prev,
        sortColumn: columnId,
        sortDirection: isCurrentColumn && prev.sortDirection === 'asc' ? 'desc' : 'asc'
      };
    });
  }, []);

  // Handle page change
  const handlePageChange = useCallback((_event: React.ChangeEvent<unknown>, page: number) => {
    setState(prev => ({ ...prev, page }));
  }, []);

  // Get value from row for a column
  const getColumnValue = useCallback((row: T, column: ColumnDef<T>): any => {
    if (column.getValue) {
      return column.getValue(row);
    }
    return row[column.id];
  }, []);

  // Filter data based on search term
  const filteredData = useMemo(() => {
    if (!debouncedSearchTerm) return data;
    
    const lowerSearch = debouncedSearchTerm.toLowerCase();
    
    return data.filter(row => {
      // If searchFields is specified, only search those fields
      if (searchFields && searchFields.length > 0) {
        return searchFields.some(field => {
          const value = row[field];
          if (value == null) return false;
          return String(value).toLowerCase().includes(lowerSearch);
        });
      }
      
      // Otherwise, search all columns
      return columns.some(column => {
        const value = getColumnValue(row, column);
        if (value == null) return false;
        return String(value).toLowerCase().includes(lowerSearch);
      });
    });
  }, [data, debouncedSearchTerm, searchFields, columns, getColumnValue]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!state.sortColumn) return filteredData;
    
    const column = columns.find(col => col.id === state.sortColumn);
    if (!column) return filteredData;
    
    return [...filteredData].sort((a, b) => {
      const aValue = getColumnValue(a, column);
      const bValue = getColumnValue(b, column);
      
      // Handle null/undefined values
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;
      
      // Compare values
      let comparison = 0;
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      } else if (aValue instanceof Date && bValue instanceof Date) {
        comparison = aValue.getTime() - bValue.getTime();
      } else {
        comparison = String(aValue).localeCompare(String(bValue));
      }
      
      return state.sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredData, state.sortColumn, state.sortDirection, columns, getColumnValue]);

  // Paginate data
  const paginatedData = useMemo(() => {
    if (!showPagination) return sortedData;
    
    const startIndex = (state.page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return sortedData.slice(startIndex, endIndex);
  }, [sortedData, state.page, pageSize, showPagination]);

  // Calculate total pages
  const totalPages = useMemo(() => {
    return Math.ceil(sortedData.length / pageSize);
  }, [sortedData.length, pageSize]);

  // Reset to page 1 if current page is out of bounds
  useEffect(() => {
    if (state.page > totalPages && totalPages > 0) {
      setState(prev => ({ ...prev, page: 1 }));
    }
  }, [state.page, totalPages]);

  return (
    <Box sx={{ width: '100%' }}>
      {/* Search Bar */}
      {searchable && (
        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            size="small"
            placeholder={searchPlaceholder}
            value={state.searchTerm}
            onChange={handleSearchChange}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Box>
      )}

      {/* Table */}
      <TableContainer 
        component={Paper} 
        sx={{ maxHeight: stickyHeader ? maxHeight : undefined }}
      >
        <Table stickyHeader={stickyHeader}>
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell
                  key={column.id}
                  align={column.align || 'left'}
                  style={{
                    width: column.width,
                    minWidth: column.minWidth
                  }}
                >
                  {column.sortable !== false ? (
                    <TableSortLabel
                      active={state.sortColumn === column.id}
                      direction={state.sortColumn === column.id ? state.sortDirection : 'asc'}
                      onClick={() => handleSortChange(column.id)}
                    >
                      {column.label}
                    </TableSortLabel>
                  ) : (
                    column.label
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length} align="center" sx={{ py: 4 }}>
                  <Typography variant="body1" color="text.secondary">
                    Loading...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} align="center" sx={{ py: 4 }}>
                  <Typography variant="body1" color="text.secondary">
                    {emptyMessage}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((row, index) => (
                <TableRow
                  key={getRowKey(row, index)}
                  hover
                  onClick={onRowClick ? () => onRowClick(row, index) : undefined}
                  sx={{
                    cursor: onRowClick ? 'pointer' : 'default',
                    '&:hover': onRowClick ? { backgroundColor: 'action.hover' } : undefined
                  }}
                >
                  {columns.map((column) => {
                    const value = getColumnValue(row, column);
                    const displayValue = column.render 
                      ? column.render(value, row, index)
                      : value;
                    
                    return (
                      <TableCell key={column.id} align={column.align || 'left'}>
                        {displayValue}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      {showPagination && !loading && sortedData.length > pageSize && (
        <Stack spacing={2} alignItems="center" sx={{ mt: 3, mb: 2 }}>
          <Pagination
            count={totalPages}
            page={state.page}
            onChange={handlePageChange}
            color="primary"
            showFirstButton
            showLastButton
          />
          <Typography variant="body2" color="text.secondary">
            Showing {((state.page - 1) * pageSize) + 1} - {Math.min(state.page * pageSize, sortedData.length)} of {sortedData.length} items
          </Typography>
        </Stack>
      )}
    </Box>
  );
}

export default ModernTable;
