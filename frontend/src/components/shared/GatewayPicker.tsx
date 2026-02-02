/**
 * GatewayPicker Component
 * Reusable searchable dropdown with autocomplete for gateway selection
 * Requirements: 43.5
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Autocomplete, TextField, Box, Typography, Chip } from '@mui/material';
import { debounce } from 'lodash';
import apiService from '../../services/api';

export interface GatewayOption {
  id: string;           // Decimal node ID
  hexId: string;        // Hex ID format (e.g., !abc123)
  shortName?: string;   // Gateway short name if available
  longName?: string;    // Gateway long name if available
  packetCount: number;  // Number of packets received by this gateway
  label: string;        // Display label
}

interface GatewayPickerProps {
  value: GatewayOption | null;
  onChange: (gateway: GatewayOption | null) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
  required?: boolean;
  fullWidth?: boolean;
  size?: 'small' | 'medium';
  // Optional: provide pre-loaded gateways to avoid API calls
  gateways?: GatewayOption[];
  // Optional: filter function to limit available gateways
  filterGateways?: (gateway: GatewayOption) => boolean;
}

const GatewayPicker: React.FC<GatewayPickerProps> = ({
  value,
  onChange,
  label = 'Select Gateway',
  placeholder = 'Search gateways...',
  disabled = false,
  error = false,
  helperText,
  required = false,
  fullWidth = true,
  size = 'medium',
  gateways: providedGateways,
  filterGateways
}) => {
  const [gatewayList, setGatewayList] = useState<GatewayOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [inputValue, setInputValue] = useState('');

  // Fetch gateways from API if not provided
  useEffect(() => {
    if (providedGateways) {
      setGatewayList(providedGateways);
    } else {
      fetchGateways();
    }
  }, [providedGateways]);

  /**
   * Convert hex ID to decimal node ID
   * Hex format: !abc123 (with ! prefix)
   * Decimal format: numeric string
   */
  const hexToDecimal = (hexId: string): string => {
    // Remove ! prefix if present
    const hex = hexId.startsWith('!') ? hexId.substring(1) : hexId;
    // Convert hex to decimal
    return parseInt(hex, 16).toString();
  };

  /**
   * Convert decimal node ID to hex ID
   * Decimal format: numeric string
   * Hex format: !abc123 (with ! prefix)
   */
  const decimalToHex = (decimalId: string): string => {
    const num = parseInt(decimalId, 10);
    const hex = num.toString(16).padStart(8, '0');
    return `!${hex}`;
  };

  const fetchGateways = async () => {
    setLoading(true);
    try {
      // Fetch unique gateways from messages
      // Gateway IDs are extracted from MQTT topics
      const response = await apiService.get('/messages', {
        params: {
          limit: 10000,
          distinct: 'topic'
        }
      });

      // Extract gateway IDs from topics and count packets
      const gatewayMap = new Map<string, { count: number; nodeId?: string }>();
      
      response.data.forEach((message: any) => {
        if (message.topic) {
          // Extract gateway ID from topic (last part of topic path)
          const parts = message.topic.split('/');
          if (parts.length > 0) {
            const gatewayHexId = parts[parts.length - 1];
            
            // Only include if it looks like a valid hex ID
            if (gatewayHexId.startsWith('!')) {
              const existing = gatewayMap.get(gatewayHexId) || { count: 0 };
              gatewayMap.set(gatewayHexId, {
                count: existing.count + 1,
                nodeId: existing.nodeId
              });
            }
          }
        }
      });

      // Fetch node information for gateways
      const nodesResponse = await apiService.get('/nodes');
      const nodesMap = new Map(
        nodesResponse.data.map((node: any) => [node.hexId, node])
      );

      // Convert to GatewayOption array
      const fetchedGateways: GatewayOption[] = Array.from(gatewayMap.entries())
        .map(([hexId, data]) => {
          const node = nodesMap.get(hexId);
          const decimalId = hexToDecimal(hexId);
          
          return {
            id: decimalId,
            hexId: hexId,
            shortName: node?.shortName,
            longName: node?.longName,
            packetCount: data.count,
            label: node?.shortName 
              ? `${node.shortName} (${hexId})` 
              : hexId
          };
        })
        .sort((a, b) => b.packetCount - a.packetCount); // Sort by packet count descending
      
      setGatewayList(fetchedGateways);
    } catch (error) {
      console.error('Error fetching gateways:', error);
      
      // Fallback: Try to get gateways from nodes API
      try {
        const nodesResponse = await apiService.get('/nodes');
        const fallbackGateways: GatewayOption[] = nodesResponse.data
          .filter((node: any) => node.hexId && node.hexId.startsWith('!'))
          .map((node: any) => ({
            id: hexToDecimal(node.hexId),
            hexId: node.hexId,
            shortName: node.shortName,
            longName: node.longName,
            packetCount: node.packetCount || 0,
            label: node.shortName 
              ? `${node.shortName} (${node.hexId})` 
              : node.hexId
          }))
          .sort((a: GatewayOption, b: GatewayOption) => 
            b.packetCount - a.packetCount
          );
        
        setGatewayList(fallbackGateways);
      } catch (fallbackError) {
        console.error('Error in fallback gateway fetch:', fallbackError);
      }
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
    (_event: React.SyntheticEvent, newInputValue: string) => {
      setInputValue(newInputValue);
      debouncedSearch(newInputValue);
    },
    [debouncedSearch]
  );

  // Filter gateways based on search term and optional filter function
  const filteredGateways = useMemo(() => {
    let filtered = gatewayList;

    // Apply custom filter if provided
    if (filterGateways) {
      filtered = filtered.filter(filterGateways);
    }

    // Apply search filter
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (gateway) =>
          gateway.hexId.toLowerCase().includes(lowerSearch) ||
          gateway.id.toLowerCase().includes(lowerSearch) ||
          (gateway.shortName && gateway.shortName.toLowerCase().includes(lowerSearch)) ||
          (gateway.longName && gateway.longName.toLowerCase().includes(lowerSearch))
      );
    }

    return filtered;
  }, [gatewayList, searchTerm, filterGateways]);

  // Custom option rendering with gateway details
  const renderOption = (props: any, option: GatewayOption) => (
    <Box component="li" {...props} key={option.id}>
      <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body1" sx={{ fontWeight: 500 }}>
            {option.shortName || option.hexId}
          </Typography>
          <Chip
            label={option.hexId}
            size="small"
            sx={{ ml: 1 }}
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
          <Typography variant="caption" color="text.secondary">
            {option.packetCount} packets
          </Typography>
          <Typography variant="caption" color="text.secondary">
            • ID: {option.id}
          </Typography>
        </Box>
        {option.longName && option.longName !== option.shortName && (
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
      options={filteredGateways}
      loading={loading}
      disabled={disabled}
      fullWidth={fullWidth}
      size={size}
      renderInput={renderInput}
      renderOption={renderOption}
      getOptionLabel={(option) => option.label}
      isOptionEqualToValue={(option, value) => option.id === value.id}
      noOptionsText={searchTerm ? 'No gateways found' : 'Start typing to search...'}
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

export default GatewayPicker;
