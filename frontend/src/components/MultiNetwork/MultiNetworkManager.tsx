/**
 * Multi-Network Manager Component
 * Main component for managing multiple network connections and federation
 * Requirements: 27.1, 27.2, 27.3, 27.4, 27.5
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Typography,
  Paper,
  Alert,
  Snackbar,
  Fab,
  Tooltip
} from '@mui/material';
import { Refresh, Settings } from '@mui/icons-material';
import NetworkSelector from './NetworkSelector';
import CrossNetworkAnalytics from './CrossNetworkAnalytics';
import NetworkIsolationPanel from './NetworkIsolationPanel';
import { apiService } from '../../services/api';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`multi-network-tabpanel-${index}`}
      aria-labelledby={`multi-network-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

interface MultiNetworkManagerProps {
  className?: string;
}

export const MultiNetworkManager: React.FC<MultiNetworkManagerProps> = ({
  className
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [selectedNetworks, setSelectedNetworks] = useState<string[]>([]);
  const [showAllNetworks, setShowAllNetworks] = useState(false);
  const [selectedNetworkForIsolation, setSelectedNetworkForIsolation] = useState<string | null>(null);
  const [networkNames, setNetworkNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load network information
  const loadNetworkInfo = async () => {
    try {
      setLoading(true);
      const response = await apiService.get<any[]>('/multi-network/networks');
      
      const names: Record<string, string> = {};
      response.data.forEach((network: any) => {
        names[network.id] = network.name;
      });
      setNetworkNames(names);
      
      // Auto-select first network for isolation panel if none selected
      if (!selectedNetworkForIsolation && response.data.length > 0) {
        setSelectedNetworkForIsolation(response.data[0].id);
      }
    } catch (err) {
      console.error('Failed to load network info:', err);
      setError('Failed to load network information');
    } finally {
      setLoading(false);
    }
  };

  // Refresh all data
  const handleRefresh = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Reload networks
      await apiService.post('/multi-network/reload');
      await loadNetworkInfo();
      
      setSuccessMessage('Network configurations reloaded successfully');
    } catch (err) {
      console.error('Failed to refresh networks:', err);
      setError('Failed to refresh network configurations');
    } finally {
      setLoading(false);
    }
  };

  // Handle network selection change
  const handleNetworkSelectionChange = (networkIds: string[]) => {
    setSelectedNetworks(networkIds);
    
    // Update isolation panel selection if current selection is not in the list
    if (selectedNetworkForIsolation && !networkIds.includes(selectedNetworkForIsolation)) {
      setSelectedNetworkForIsolation(networkIds[0] || null);
    }
  };

  // Handle network settings click
  const handleNetworkSettingsClick = (networkId: string) => {
    setSelectedNetworkForIsolation(networkId);
    setActiveTab(2); // Switch to isolation panel tab
  };

  // Handle access controls change
  const handleAccessControlsChange = (networkId: string, accessControls: any) => {
    setSuccessMessage(`Access controls updated for ${networkNames[networkId] || networkId}`);
  };

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  useEffect(() => {
    loadNetworkInfo();
  }, []);

  return (
    <Box className={className}>
      {/* Header */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Typography variant="h4" component="h1">
          Multi-Network Manager
        </Typography>
        <Tooltip title="Refresh all networks">
          <Fab
            color="primary"
            size="small"
            onClick={handleRefresh}
            disabled={loading}
          >
            <Refresh />
          </Fab>
        </Tooltip>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Main Content */}
      <Paper elevation={1}>
        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={handleTabChange} aria-label="multi-network tabs">
            <Tab label="Network Selection" id="multi-network-tab-0" />
            <Tab label="Cross-Network Analytics" id="multi-network-tab-1" />
            <Tab label="Network Isolation" id="multi-network-tab-2" />
          </Tabs>
        </Box>

        {/* Network Selection Tab */}
        <TabPanel value={activeTab} index={0}>
          <NetworkSelector
            selectedNetworks={selectedNetworks}
            onNetworkSelectionChange={handleNetworkSelectionChange}
            onNetworkSettingsClick={handleNetworkSettingsClick}
            showAllNetworks={showAllNetworks}
            onShowAllNetworksChange={setShowAllNetworks}
          />
          
          {selectedNetworks.length > 0 && (
            <Box mt={4}>
              <Alert severity="info">
                <Typography variant="body2">
                  <strong>{selectedNetworks.length} network(s) selected:</strong>{' '}
                  {selectedNetworks.map(id => networkNames[id] || id).join(', ')}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Switch to the Analytics tab to view cross-network data and insights.
                </Typography>
              </Alert>
            </Box>
          )}
        </TabPanel>

        {/* Cross-Network Analytics Tab */}
        <TabPanel value={activeTab} index={1}>
          {selectedNetworks.length > 0 ? (
            <CrossNetworkAnalytics
              selectedNetworks={selectedNetworks}
              refreshInterval={30000}
            />
          ) : (
            <Alert severity="info">
              <Typography variant="body1">
                Please select one or more networks from the Network Selection tab to view analytics.
              </Typography>
            </Alert>
          )}
        </TabPanel>

        {/* Network Isolation Tab */}
        <TabPanel value={activeTab} index={2}>
          {selectedNetworkForIsolation ? (
            <NetworkIsolationPanel
              networkId={selectedNetworkForIsolation}
              networkName={networkNames[selectedNetworkForIsolation] || selectedNetworkForIsolation}
              onAccessControlsChange={handleAccessControlsChange}
            />
          ) : (
            <Alert severity="info">
              <Typography variant="body1">
                Please select a network to configure isolation and access controls.
              </Typography>
            </Alert>
          )}
          
          {/* Network Selection for Isolation */}
          {Object.keys(networkNames).length > 1 && (
            <Box mt={3}>
              <Typography variant="h6" gutterBottom>
                Select Network for Configuration
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={1}>
                {Object.entries(networkNames).map(([id, name]) => (
                  <Box
                    key={id}
                    component="button"
                    onClick={() => setSelectedNetworkForIsolation(id)}
                    sx={{
                      p: 2,
                      border: 1,
                      borderColor: selectedNetworkForIsolation === id ? 'primary.main' : 'grey.300',
                      borderRadius: 1,
                      backgroundColor: selectedNetworkForIsolation === id ? 'primary.50' : 'transparent',
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: 'grey.50'
                      }
                    }}
                  >
                    <Typography variant="body2" fontWeight="medium">
                      {name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {id}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </TabPanel>
      </Paper>

      {/* Success Snackbar */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={6000}
        onClose={() => setSuccessMessage(null)}
        message={successMessage}
      />
    </Box>
  );
};

export default MultiNetworkManager;