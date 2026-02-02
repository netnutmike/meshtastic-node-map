/**
 * NodePicker Component
 * Reusable searchable dropdown with autocomplete for node selection
 * Requirements: 43.1, 43.2, 43.3, 43.4
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Autocomplete, TextField, Box, Typography, Chip } from '@mui/material';
import { debounce } from 'lodash';
import apiService from '../../services/api';

export interface NodeOption {
  id: string;
  hexId: string;
  shortName: string;
  longName: string;
  hardwareModel?: string;
  packetCount?: number;
  label: string;
}

interface NodePickerProps {
  value: NodeOption | null;
  onChange: (node: NodeOption | null) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
  required?: boolean;
  fullWidth?: boolean;
  size?: 'small' | 'medium';
  // Optional: provide pre-loaded nodes to avoid API calls
  nodes?: NodeOption[];
  // Optional: filter function to limit available nodes
  filterNodes?: (node: NodeOption) => boolean;
}

const NodePicker: React.FC<NodePickerProps> = ({
  value,
  onChange,
  label = 'Select Node',
  placeholder = 'Search nodes...',
  disabled = false,
  error = false,
  helperText,
  required = false,
  fullWidth = true,
  size = 'medium',
  nodes: providedNodes,
  filterNodes
}) => {
  const [nodeList, setNodeList] = useState<NodeOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [inputValue, setInputValue] = useState('');

  // Fetch nodes from API if not provided
  useEffect(() => {
    if (providedNodes) {
      setNodeList(providedNodes);
    } else {
      fetchNodes();
    }
  }, [providedNodes]);

  const fetchNodes = async () => {
    setLoading(true);
    try {
      const response = await apiService.get('/nodes');
      const fetchedNodes: NodeOption[] = response.data
        .filter((node: any) => node.shortName && node.shortName.trim() !== '')
        .map((node: any) => ({
          id: node.id,
          hexId: node.hexId,
          shortName: node.shortName || 'Unknown',
          longName: node.longName || 'Unknown',
          hardwareModel: node.hardwareModel,
          packetCount: node.packetCount || 0,
          label: `${node.shortName} (${node.hexId})`
        }))
        .sort((a: NodeOption, b: NodeOption) => a.shortName.localeCompare(b.shortName));
      
      setNodeList(fetchedNodes);
    } catch (error) {
      console.error('Error fetching nodes:', error);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search handler (300ms)
  const debouncedSearch = useMemo(
    () =>
      debounce((term: string) => {
        setSearchTerm(term);
      }, 300),
    []
  );

  // Handle input change with debouncing
  const handleInputChange = useCallback(
    (event: React.SyntheticEvent, newInputValue: string) => {
      setInputValue(newInputValue);
      debouncedSearch(newInputValue);
    },
    [debouncedSearch]
  );

  // Filter nodes based on search term and optional filter function
  const filteredNodes = useMemo(() => {
    let filtered = nodeList;

    // Apply custom filter if provided
    if (filterNodes) {
      filtered = filtered.filter(filterNodes);
    }

    // Apply search filter
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (node) =>
          node.shortName.toLowerCase().includes(lowerSearch) ||
          node.longName.toLowerCase().includes(lowerSearch) ||
          node.hexId.toLowerCase().includes(lowerSearch) ||
          node.id.toLowerCase().includes(lowerSearch) ||
          (node.hardwareModel && node.hardwareModel.toLowerCase().includes(lowerSearch))
      );
    }

    return filtered;
  }, [nodeList, searchTerm, filterNodes]);

  // Custom option rendering with node details
  const renderOption = (props: any, option: NodeOption) => (
    <Box component="li" {...props} key={option.id}>
      <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body1" sx={{ fontWeight: 500 }}>
            {option.shortName}
          </Typography>
          <Chip
            label={option.hexId}
            size="small"
            sx={{ ml: 1 }}
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
          {option.hardwareModel && (
            <Typography variant="caption" color="text.secondary">
              {option.hardwareModel}
            </Typography>
          )}
          {option.packetCount !== undefined && option.packetCount > 0 && (
            <Typography variant="caption" color="text.secondary">
              • {option.packetCount} packets
            </Typography>
          )}
        </Box>
        {option.longName !== option.shortName && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.25 }}>
            {option.longName}
          </Typography>
        )}
      </Box>
    </Box>
  );

  // Custom input rendering
  const renderInput = (params: any) => (
    <TextField
      {...params}
      label={label}
      placeholder={placeholder}
      error={error}
      helperText={helperText}
      required={required}
      InputProps={{
        ...params.InputProps,
        endAdornment: (
          <>
            {loading ? <Typography variant="caption">Loading...</Typography> : null}
            {params.InputProps.endAdornment}
          </>
        ),
      }}
    />
  );

  return (
    <Autocomplete
      value={value}
      onChange={(_, newValue) => onChange(newValue)}
      inputValue={inputValue}
      onInputChange={handleInputChange}
      options={filteredNodes}
      loading={loading}
      disabled={disabled}
      fullWidth={fullWidth}
      size={size}
      renderInput={renderInput}
      renderOption={renderOption}
      getOptionLabel={(option) => option.label}
      isOptionEqualToValue={(option, value) => option.id === value.id}
      noOptionsText={searchTerm ? 'No nodes found' : 'Start typing to search...'}
      // Enable keyboard navigation
      autoHighlight
      openOnFocus
      clearOnBlur
      selectOnFocus
      handleHomeEndKeys
      // Disable built-in filtering since we handle it ourselves
      filterOptions={(x) => x}
    />
  );
};

export default NodePicker;
