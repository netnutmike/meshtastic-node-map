/**
 * Network Isolation Panel Component
 * Displays and manages network isolation and access controls
 * Requirements: 27.3 - Access controls per network segment with user-specific visibility rules
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Switch,
  FormControlLabel,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  LinearProgress,
  Tooltip,
  IconButton
} from '@mui/material';
import {
  Security,
  Lock,
  Public,
  Group,
  Person,
  Shield,
  NetworkCheck,
  Visibility,
  VisibilityOff,
  Edit,
  Save,
  Cancel,
  Science
} from '@mui/icons-material';
import { apiService } from '../../services/api';

interface NetworkAccessControl {
  allowedUsers: string[];
  allowedRoles: string[];
  dataVisibility: 'public' | 'restricted' | 'private';
  crossNetworkSharing: boolean;
  federationEnabled: boolean;
}

interface NetworkIsolationTest {
  networkId: string;
  networkName: string;
  accessLevel: string;
  canAccess: boolean;
  isolationScore: number;
  testResults: {
    dataVisibility: string;
    crossNetworkAccess: boolean;
    userPermissions: string[];
  };
}

interface NetworkIsolationPanelProps {
  networkId: string;
  networkName: string;
  onAccessControlsChange?: (networkId: string, accessControls: NetworkAccessControl) => void;
  className?: string;
}

export const NetworkIsolationPanel: React.FC<NetworkIsolationPanelProps> = ({
  networkId,
  networkName,
  onAccessControlsChange,
  className
}) => {
  const [accessControls, setAccessControls] = useState<NetworkAccessControl>({
    allowedUsers: [],
    allowedRoles: [],
    dataVisibility: 'public',
    crossNetworkSharing: false,
    federationEnabled: false
  });
  const [isolationTest, setIsolationTest] = useState<NetworkIsolationTest | null>(null);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load current access controls
  const loadAccessControls = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiService.get<any>('/multi-network/status');
      const networkStatus = response.data.status[networkId];
      
      if (networkStatus?.accessControls) {
        setAccessControls(networkStatus.accessControls);
      }
    } catch (err) {
      console.error('Failed to load access controls:', err);
      setError('Failed to load access controls');
    } finally {
      setLoading(false);
    }
  };

  // Run isolation test
  const runIsolationTest = async () => {
    try {
      setTesting(true);
      setError(null);
      
      const response = await apiService.get<NetworkIsolationTest>(
        `/multi-network/networks/${networkId}/isolation-test`
      );
      
      setIsolationTest(response.data);
    } catch (err) {
      console.error('Failed to run isolation test:', err);
      setError('Failed to run isolation test');
    } finally {
      setTesting(false);
    }
  };

  // Update access controls
  const updateAccessControls = async (newAccessControls: NetworkAccessControl) => {
    try {
      setLoading(true);
      setError(null);
      
      await apiService.put(
        `/multi-network/networks/${networkId}/access-controls`,
        newAccessControls
      );
      
      setAccessControls(newAccessControls);
      onAccessControlsChange?.(networkId, newAccessControls);
      setEditDialogOpen(false);
    } catch (err) {
      console.error('Failed to update access controls:', err);
      setError('Failed to update access controls');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccessControls();
  }, [networkId]);

  // Get visibility icon
  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case 'public':
        return <Public color="success" />;
      case 'restricted':
        return <Visibility color="warning" />;
      case 'private':
        return <VisibilityOff color="error" />;
      default:
        return <Public />;
    }
  };

  // Get visibility color
  const getVisibilityColor = (visibility: string) => {
    switch (visibility) {
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

  // Get isolation score color
  const getIsolationScoreColor = (score: number) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'error';
  };

  return (
    <Box className={className}>
      <Card>
        <CardContent>
          {/* Header */}
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
            <Typography variant="h6" component="h3">
              Network Isolation & Access Controls
            </Typography>
            <Box display="flex" gap={1}>
              <Tooltip title="Run isolation test">
                <IconButton onClick={runIsolationTest} disabled={testing}>
                  <Science />
                </IconButton>
              </Tooltip>
              <Tooltip title="Edit access controls">
                <IconButton onClick={() => setEditDialogOpen(true)}>
                  <Edit />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {loading && <LinearProgress sx={{ mb: 2 }} />}

          {/* Network Info */}
          <Box mb={3}>
            <Typography variant="subtitle1" gutterBottom>
              Network: {networkName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              ID: {networkId}
            </Typography>
          </Box>

          {/* Access Controls Summary */}
          <Grid container spacing={3} mb={3}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2} mb={2}>
                    {getVisibilityIcon(accessControls.dataVisibility)}
                    <Typography variant="h6">
                      Data Visibility
                    </Typography>
                  </Box>
                  <Chip
                    label={accessControls.dataVisibility.toUpperCase()}
                    color={getVisibilityColor(accessControls.dataVisibility) as any}
                    size="small"
                  />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {accessControls.dataVisibility === 'public' && 'All users can access network data'}
                    {accessControls.dataVisibility === 'restricted' && 'Only authorized users can access data'}
                    {accessControls.dataVisibility === 'private' && 'No external access allowed'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2} mb={2}>
                    <NetworkCheck color={accessControls.federationEnabled ? 'success' : 'disabled'} />
                    <Typography variant="h6">
                      Federation
                    </Typography>
                  </Box>
                  <Chip
                    label={accessControls.federationEnabled ? 'ENABLED' : 'DISABLED'}
                    color={accessControls.federationEnabled ? 'success' : 'default'}
                    size="small"
                  />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {accessControls.federationEnabled 
                      ? 'Data can be shared with other networks'
                      : 'Network operates in isolation'
                    }
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Access Control Details */}
          <Box mb={3}>
            <Typography variant="subtitle1" gutterBottom>
              Access Control Details
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon>
                  <Person />
                </ListItemIcon>
                <ListItemText
                  primary="Allowed Users"
                  secondary={accessControls.allowedUsers.length > 0 
                    ? accessControls.allowedUsers.join(', ')
                    : 'No specific users configured'
                  }
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <Group />
                </ListItemIcon>
                <ListItemText
                  primary="Allowed Roles"
                  secondary={accessControls.allowedRoles.length > 0 
                    ? accessControls.allowedRoles.join(', ')
                    : 'No specific roles configured'
                  }
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <Shield />
                </ListItemIcon>
                <ListItemText
                  primary="Cross-Network Sharing"
                />
                <ListItemSecondaryAction>
                  <Chip
                    label={accessControls.crossNetworkSharing ? 'Enabled' : 'Disabled'}
                    color={accessControls.crossNetworkSharing ? 'success' : 'default'}
                    size="small"
                  />
                </ListItemSecondaryAction>
              </ListItem>
            </List>
          </Box>

          {/* Isolation Test Results */}
          {isolationTest && (
            <Box>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="subtitle1" gutterBottom>
                Isolation Test Results
              </Typography>
              <Box mb={2}>
                <Box display="flex" alignItems="center" gap={2} mb={1}>
                  <Typography variant="body2">
                    Isolation Score:
                  </Typography>
                  <Chip
                    label={`${isolationTest.isolationScore}%`}
                    color={getIsolationScoreColor(isolationTest.isolationScore) as any}
                    size="small"
                  />
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={isolationTest.isolationScore}
                  color={getIsolationScoreColor(isolationTest.isolationScore) as any}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Access Status"
                    secondary={isolationTest.canAccess ? 'Access granted' : 'Access denied'}
                  />
                  <ListItemSecondaryAction>
                    <Chip
                      label={isolationTest.canAccess ? 'Granted' : 'Denied'}
                      color={isolationTest.canAccess ? 'success' : 'error'}
                      size="small"
                    />
                  </ListItemSecondaryAction>
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="User Permissions"
                    secondary={isolationTest.testResults.userPermissions.join(', ') || 'None'}
                  />
                </ListItem>
              </List>
            </Box>
          )}

          {testing && (
            <Box display="flex" alignItems="center" gap={2} mt={2}>
              <CircularProgress size={20} />
              <Typography variant="body2">
                Running isolation test...
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Edit Access Controls Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Access Controls</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Data Visibility</InputLabel>
                  <Select
                    value={accessControls.dataVisibility}
                    label="Data Visibility"
                    onChange={(e) => setAccessControls({
                      ...accessControls,
                      dataVisibility: e.target.value as any
                    })}
                  >
                    <MenuItem value="public">Public - All users can access</MenuItem>
                    <MenuItem value="restricted">Restricted - Authorized users only</MenuItem>
                    <MenuItem value="private">Private - No external access</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Allowed Users (comma-separated)"
                  value={accessControls.allowedUsers.join(', ')}
                  onChange={(e) => setAccessControls({
                    ...accessControls,
                    allowedUsers: e.target.value.split(',').map(u => u.trim()).filter(u => u)
                  })}
                  helperText="Enter usernames or email addresses"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Allowed Roles (comma-separated)"
                  value={accessControls.allowedRoles.join(', ')}
                  onChange={(e) => setAccessControls({
                    ...accessControls,
                    allowedRoles: e.target.value.split(',').map(r => r.trim()).filter(r => r)
                  })}
                  helperText="Enter role names (e.g., admin, operator, viewer)"
                />
              </Grid>

              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={accessControls.crossNetworkSharing}
                      onChange={(e) => setAccessControls({
                        ...accessControls,
                        crossNetworkSharing: e.target.checked
                      })}
                    />
                  }
                  label="Enable cross-network data sharing"
                />
              </Grid>

              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={accessControls.federationEnabled}
                      onChange={(e) => setAccessControls({
                        ...accessControls,
                        federationEnabled: e.target.checked
                      })}
                    />
                  }
                  label="Enable federation with other networks"
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => updateAccessControls(accessControls)}
            variant="contained"
            disabled={loading}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default NetworkIsolationPanel;