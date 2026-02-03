/**
 * Data Cleanup Admin Panel
 * Provides UI for manual cleanup trigger and monitoring
 * Requirements: 42.7, 42.8, 42.12, 42.13, 42.14
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Grid,
  Alert,
  CircularProgress,
  Divider,
  FormControlLabel,
  Switch,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  LinearProgress,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Storage as StorageIcon,
  History as HistoryIcon,
  Archive as ArchiveIcon,
} from '@mui/icons-material';
import apiService from '../../services/api';

interface CleanupStatus {
  scheduler: {
    running: boolean;
    lastRun: string | null;
    nextRun: string | null;
  };
  config: {
    enabled: boolean;
    policies: {
      messages: number;
      telemetry: number;
      positions: number;
      traceroutes: number;
    };
    batchSize: number;
    vacuumThreshold: number;
  };
  dataAge: {
    oldestMessage: string | null;
    oldestTelemetry: string | null;
    oldestPosition: string | null;
    totalMessages: number;
    totalTelemetry: number;
    totalPositions: number;
  };
}

interface DiskSpaceInfo {
  totalBytes: number;
  usedBytes: number;
  freeBytes: number;
  usedPercentage: number;
  warning: boolean;
}

interface AuditLogEntry {
  id: string;
  operation: string;
  timestamp: string;
  recordsDeleted: number;
  manual: boolean;
  triggeredBy?: string;
  errors: string[];
  executionTimeMs: number;
  spaceFreedBytes?: number;
}

const DataCleanupPanel: React.FC = () => {
  const [status, setStatus] = useState<CleanupStatus | null>(null);
  const [diskSpace, setDiskSpace] = useState<DiskSpaceInfo | null>(null);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [enableArchive, setEnableArchive] = useState(false);
  const [triggeredBy, setTriggeredBy] = useState('');
  const [lastResult, setLastResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStatus();
    loadDiskSpace();
    loadAuditLog();
  }, []);

  const loadStatus = async () => {
    try {
      setLoading(true);
      const response = await apiService.get('/cleanup/status');
      setStatus(response.data);
    } catch (err) {
      setError('Failed to load cleanup status');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadDiskSpace = async () => {
    try {
      const response = await apiService.get('/cleanup/disk-space');
      setDiskSpace(response.data);
    } catch (err) {
      console.error('Failed to load disk space info', err);
    }
  };

  const loadAuditLog = async () => {
    try {
      const response = await apiService.get('/cleanup/audit-log');
      setAuditLog(response.data.entries || []);
    } catch (err) {
      console.error('Failed to load audit log', err);
    }
  };

  const handleExecuteCleanup = async () => {
    try {
      setExecuting(true);
      setError(null);
      
      const response = await apiService.post('/cleanup/execute', {
        archive: enableArchive,
        triggeredBy: triggeredBy || undefined,
      });

      setLastResult(response.data.result);
      
      // Reload status and audit log
      await Promise.all([
        loadStatus(),
        loadDiskSpace(),
        loadAuditLog(),
      ]);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Cleanup execution failed');
      console.error(err);
    } finally {
      setExecuting(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Data Cleanup Administration
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Monitor and control automatic data retention and cleanup operations
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {lastResult && (
        <Alert 
          severity={lastResult.errors?.length > 0 ? 'warning' : 'success'} 
          sx={{ mb: 2 }}
          onClose={() => setLastResult(null)}
        >
          <Typography variant="body2">
            Cleanup completed: {lastResult.totalDeleted} records deleted
            {lastResult.spaceFreedBytes && ` (${formatBytes(lastResult.spaceFreedBytes)} freed)`}
          </Typography>
          {lastResult.errors?.length > 0 && (
            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
              Errors: {lastResult.errors.join(', ')}
            </Typography>
          )}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Disk Space Card */}
        {diskSpace && (
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <StorageIcon sx={{ mr: 1 }} />
                  <Typography variant="h6">Disk Space</Typography>
                </Box>
                
                {diskSpace.warning && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    Disk space usage above 90%!
                  </Alert>
                )}

                <Box sx={{ mb: 2 }}>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2">Used</Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {diskSpace.usedPercentage.toFixed(1)}%
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={diskSpace.usedPercentage}
                    color={diskSpace.warning ? 'error' : 'primary'}
                    sx={{ height: 10, borderRadius: 1 }}
                  />
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Used
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {formatBytes(diskSpace.usedBytes)}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Free
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {formatBytes(diskSpace.freeBytes)}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Configuration Card */}
        {status && (
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Retention Configuration
                </Typography>
                
                <Box sx={{ mb: 2 }}>
                  <Chip 
                    label={status.config.enabled ? 'Enabled' : 'Disabled'}
                    color={status.config.enabled ? 'success' : 'default'}
                    size="small"
                  />
                </Box>

                <Typography variant="body2" gutterBottom>
                  Retention Periods:
                </Typography>
                <Box sx={{ pl: 2 }}>
                  <Typography variant="caption" display="block">
                    Messages: {status.config.policies.messages / 24} days
                  </Typography>
                  <Typography variant="caption" display="block">
                    Telemetry: {status.config.policies.telemetry / 24} days
                  </Typography>
                  <Typography variant="caption" display="block">
                    Positions: {status.config.policies.positions / 24} days
                  </Typography>
                  <Typography variant="caption" display="block">
                    Traceroutes: {status.config.policies.traceroutes / 24} days
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Data Statistics Card */}
        {status && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Current Data Statistics
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" color="text.secondary">
                      Total Messages
                    </Typography>
                    <Typography variant="h5">
                      {status.dataAge.totalMessages.toLocaleString()}
                    </Typography>
                    {status.dataAge.oldestMessage && (
                      <Typography variant="caption" color="text.secondary">
                        Oldest: {new Date(status.dataAge.oldestMessage).toLocaleDateString()}
                      </Typography>
                    )}
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" color="text.secondary">
                      Total Telemetry
                    </Typography>
                    <Typography variant="h5">
                      {status.dataAge.totalTelemetry.toLocaleString()}
                    </Typography>
                    {status.dataAge.oldestTelemetry && (
                      <Typography variant="caption" color="text.secondary">
                        Oldest: {new Date(status.dataAge.oldestTelemetry).toLocaleDateString()}
                      </Typography>
                    )}
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" color="text.secondary">
                      Total Positions
                    </Typography>
                    <Typography variant="h5">
                      {status.dataAge.totalPositions.toLocaleString()}
                    </Typography>
                    {status.dataAge.oldestPosition && (
                      <Typography variant="caption" color="text.secondary">
                        Oldest: {new Date(status.dataAge.oldestPosition).toLocaleDateString()}
                      </Typography>
                    )}
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Manual Cleanup Card */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <DeleteIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Manual Cleanup</Typography>
              </Box>

              <Alert severity="info" sx={{ mb: 2 }}>
                Manually trigger data cleanup to remove old records according to retention policies.
              </Alert>

              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={enableArchive}
                        onChange={(e) => setEnableArchive(e.target.checked)}
                        disabled={executing}
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2">Archive before delete</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Export data to archive before deletion
                        </Typography>
                      </Box>
                    }
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Triggered By (optional)"
                    value={triggeredBy}
                    onChange={(e) => setTriggeredBy(e.target.value)}
                    disabled={executing}
                    placeholder="admin@example.com"
                    helperText="For audit trail"
                  />
                </Grid>
              </Grid>

              <Box display="flex" gap={2}>
                <Button
                  variant="contained"
                  color="error"
                  startIcon={executing ? <CircularProgress size={20} /> : <DeleteIcon />}
                  onClick={handleExecuteCleanup}
                  disabled={executing || !status?.config.enabled}
                >
                  {executing ? 'Executing...' : 'Execute Cleanup'}
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={loadStatus}
                  disabled={executing}
                >
                  Refresh Status
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Audit Log Card */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Box display="flex" alignItems="center">
                  <HistoryIcon sx={{ mr: 1 }} />
                  <Typography variant="h6">Audit Log</Typography>
                </Box>
                <Button
                  size="small"
                  startIcon={<RefreshIcon />}
                  onClick={loadAuditLog}
                >
                  Refresh
                </Button>
              </Box>

              {auditLog.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No cleanup operations recorded yet
                </Typography>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Timestamp</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell align="right">Records Deleted</TableCell>
                        <TableCell align="right">Space Freed</TableCell>
                        <TableCell align="right">Duration</TableCell>
                        <TableCell>Triggered By</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {auditLog.slice(0, 10).map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell>
                            {new Date(entry.timestamp).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={entry.manual ? 'Manual' : 'Automatic'}
                              size="small"
                              color={entry.manual ? 'primary' : 'default'}
                            />
                          </TableCell>
                          <TableCell align="right">
                            {entry.recordsDeleted.toLocaleString()}
                          </TableCell>
                          <TableCell align="right">
                            {entry.spaceFreedBytes ? formatBytes(entry.spaceFreedBytes) : '-'}
                          </TableCell>
                          <TableCell align="right">
                            {formatDuration(entry.executionTimeMs)}
                          </TableCell>
                          <TableCell>
                            {entry.triggeredBy || '-'}
                          </TableCell>
                          <TableCell>
                            {entry.errors.length > 0 ? (
                              <Chip label="Errors" size="small" color="error" />
                            ) : (
                              <Chip label="Success" size="small" color="success" />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DataCleanupPanel;
