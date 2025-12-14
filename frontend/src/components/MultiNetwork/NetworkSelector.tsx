/**
 * Network Selector Component
 * Provides network selection and filtering interface for multi-network support
 * Requirements: 27.2 - Network selection filters and visual indicators
 */

import React, { useState, useEffect } from 'react';
import { 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel, 
  Chip, 
  Box, 
  Typography, 
  IconButton,
  Tooltip,
  Badge,
  Switch,
  FormControlLabel
} from '@mui/material';
import { 
  NetworkCheck, 
  NetworkWifi, 
  NetworkWifiOff, 
  Security, 
  Public, 
  Lock,
  Refresh,
  Settings
} from '@mui/icons-material';
import { apiService } from '../../services/api';

export interface NetworkInfo {
  id: string;
  name: string;
  description?: string;
  region: string;
  isConnected: boolean;
  lastConnected?: string;
  nodeCount: number;
  accessLevel: 'public' | 'restricted' | 'private';
  federationEnabled: boolean;
}

interface NetworkSelectorProps {
  selectedNetworks: string[];
  onNetworkSelectionChange: (networkIds: string[]) => void;
  onNetworkSettingsClick?: (networkId: string) => void;
  showAllNetworks?: boolean;
  onShowAllNetworksChange?: (showAll: boolean) => void;
  className?: string;
}

export const NetworkSelector: React.FC<NetworkSelectorProps> = ({
  selectedNetworks,
  onNetworkSelectionChange,
  onNetworkSettingsClick,
  showAllNetworks = false,
  onShowAllNetworksChange,
  className
}) => {
  const [networks, setNetworks] = useState<NetworkInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load available networks
  const loadNetworks = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiService.request<NetworkInfo[]>('/multi-network/networks');
      setNetworks(response.data);
    } catch (err) {
      console.error('Failed to load networks:', err);
      setError('Failed to load networks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNetworks();
  }, []);

  // Get network status icon
  const getNetworkStatusIcon = (network: NetworkInfo) => {
    if (!network.isConnected) {
      return <NetworkWifiOff color="error" />;
    }
    return <NetworkWifi color="success" />;
  };

  // Get access level icon
  const getAccessLevelIcon = (accessLevel: string) => {
    switch (accessLevel) {
      case 'public':
        return <Public color="success" />;
      case 'restricted':
        return <Security color="warning" />;
      case 'private':
        return <Lock color="error" />;
      default:
        return <Public />;
    }
  };

  // Get access level color
  const getAccessLevelColor = (accessLevel: string) => {
    switch (accessLevel) {
      case 'public':
        return 'success';
      case 'restricted':
        return 'warning';
      case 'private':
        return 'error';
      default:
        return 'default';
    }
  };

  // Handle network selection
  const handleNetworkChange = (event: any) => {
    const value = event.target.value;
    onNetworkSelectionChange(typeof value === 'string' ? value.split(',') : value);
  };

  // Handle refresh
  const handleRefresh = () => {
    loadNetworks();
  };

  // Filter networks based on showAllNetworks setting
  const filteredNetworks = showAllNetworks 
    ? networks 
    : networks.filter(network => network.isConnected);

  return (
    <Box className={className}>
      <Box display="flex" alignItems="center" gap={1} mb={2}>
        <Typography variant="h6" component="h3">
          Network Selection
        </Typography>
        <Tooltip title="Refresh networks">
          <IconButton onClick={handleRefresh} size="small" disabled={loading}>
            <Refresh />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Show all networks toggle */}
      {onShowAllNetworksChange && (
        <FormControlLabel
          control={
            <Switch
              checked={showAllNetworks}
              onChange={(e) => onShowAllNetworksChange(e.target.checked)}
              size="small"
            />
          }
          label="Show all networks"
          sx={{ mb: 2 }}
        />
      )}

      {/* Network selector */}
      <FormControl fullWidth variant="outlined" disabled={loading}>
        <InputLabel>Select Networks</InputLabel>
        <Select
          multiple
          value={selectedNetworks}
          onChange={handleNetworkChange}
          label="Select Networks"
          renderValue={(selected) => (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {(selected as string[]).map((networkId) => {
                const network = networks.find(n => n.id === networkId);
                if (!network) return null;
                
                return (
                  <Chip
                    key={networkId}
                    label={network.name}
                    size="small"
                    color={getAccessLevelColor(network.accessLevel) as any}
                    icon={getNetworkStatusIcon(network)}
                    onDelete={() => {
                      const newSelection = selectedNetworks.filter(id => id !== networkId);
                      onNetworkSelectionChange(newSelection);
                    }}
                  />
                );
              })}
            </Box>
          )}
        >
          {filteredNetworks.map((network) => (
            <MenuItem key={network.id} value={network.id}>
              <Box display="flex" alignItems="center" width="100%" gap={1}>
                {/* Connection status */}
                <Tooltip title={network.isConnected ? 'Connected' : 'Disconnected'}>
                  {getNetworkStatusIcon(network)}
                </Tooltip>

                {/* Network name and info */}
                <Box flex={1}>
                  <Typography variant="body2" fontWeight="medium">
                    {network.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {network.region} • {network.nodeCount} nodes
                  </Typography>
                </Box>

                {/* Access level indicator */}
                <Tooltip title={`Access level: ${network.accessLevel}`}>
                  {getAccessLevelIcon(network.accessLevel)}
                </Tooltip>

                {/* Federation indicator */}
                {network.federationEnabled && (
                  <Tooltip title="Federation enabled">
                    <Badge color="primary" variant="dot">
                      <NetworkCheck fontSize="small" />
                    </Badge>
                  </Tooltip>
                )}

                {/* Settings button */}
                {onNetworkSettingsClick && (
                  <Tooltip title="Network settings">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        onNetworkSettingsClick(network.id);
                      }}
                    >
                      <Settings fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Error display */}
      {error && (
        <Typography color="error" variant="body2" sx={{ mt: 1 }}>
          {error}
        </Typography>
      )}

      {/* Network summary */}
      <Box mt={2}>
        <Typography variant="body2" color="text.secondary">
          {filteredNetworks.length} networks available • {' '}
          {filteredNetworks.filter(n => n.isConnected).length} connected • {' '}
          {selectedNetworks.length} selected
        </Typography>
      </Box>
    </Box>
  );
};

export default NetworkSelector;