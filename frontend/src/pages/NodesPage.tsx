import React, { useState, useMemo, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  Switch,
  FormControlLabel,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  Pagination,
  Stack,
} from '@mui/material';
import { 
  Visibility as VisibilityIcon,
  MyLocation as MyLocationIcon 
} from '@mui/icons-material';
import { RootState } from '../store';
import { openDetailsPanel, setNodes, setLoading, setError } from '../store/slices/nodeSlice';
import { setCenter, setZoom } from '../store/slices/mapSlice';
import NavigationHeader from '../components/Layout/NavigationHeader';
import { MQTTMonitor } from '../components/MQTTMonitor';
import apiService from '../services/api';

type Order = 'asc' | 'desc';

interface Column {
  id: string;
  label: string;
  minWidth?: number;
  align?: 'left' | 'right' | 'center';
  format?: (value: any) => string;
}

const columns: Column[] = [
  { id: 'hexId', label: 'ID', minWidth: 100 },
  { id: 'shortName', label: 'Short Name', minWidth: 100 },
  { id: 'longName', label: 'Long Name', minWidth: 150 },
  { id: 'hardwareModel', label: 'Hardware', minWidth: 120 },
  { id: 'firmwareVersion', label: 'Firmware', minWidth: 100 },
  { id: 'role', label: 'Role', minWidth: 100 },
  { id: 'altitude', label: 'Altitude (m)', minWidth: 100, align: 'right', format: (value) => value?.toFixed(0) || '' },
  { id: 'latitude', label: 'Latitude', minWidth: 100, align: 'right', format: (value) => value?.toFixed(6) || '' },
  { id: 'longitude', label: 'Longitude', minWidth: 100, align: 'right', format: (value) => value?.toFixed(6) || '' },
  { id: 'neighborCount', label: 'Neighbors', minWidth: 80, align: 'center' },
  { id: 'batteryLevel', label: 'Battery %', minWidth: 90, align: 'right', format: (value) => value ? `${value}%` : '' },
  { id: 'voltage', label: 'Voltage (V)', minWidth: 100, align: 'right', format: (value) => value?.toFixed(2) || '' },
  { id: 'channelUtilization', label: 'Ch. Util. %', minWidth: 100, align: 'right', format: (value) => value ? `${value.toFixed(1)}%` : '' },
  { id: 'lastSeen', label: 'Last Seen', minWidth: 150 },
  { id: 'owner', label: 'Owner', minWidth: 120 },
  { id: 'actions', label: 'Actions', minWidth: 80, align: 'center' },
];

const NodesPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const nodes = useSelector((state: RootState) => state.nodes.nodes);
  const { nodesOfflineAge } = useSelector((state: RootState) => state.settings);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState(true); // ON by default
  const [showUnknown, setShowUnknown] = useState(false); // OFF by default
  const [orderBy, setOrderBy] = useState<string>('shortName');
  const [order, setOrder] = useState<Order>('asc');
  const [mqttMonitorOpen, setMqttMonitorOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalNodes, setTotalNodes] = useState(0);
  const [pageSize] = useState(50); // Items per page for client-side pagination

  // Load nodes when component mounts (only once, not on page change)
  useEffect(() => {
    console.log('NodesPage: Loading nodes...');
    loadNodes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadNodes = async () => {
    try {
      console.log(`NodesPage: Fetching all nodes from API...`);
      dispatch(setLoading(true));
      
      // Fetch all nodes by making multiple paginated requests
      let allNodes: any[] = [];
      let currentPage = 1;
      let hasMorePages = true;
      const pageSize = 100; // Maximum allowed by backend
      let totalCount = 0;
      
      while (hasMorePages) {
        const response = await apiService.getNodes({
          page: currentPage,
          limit: pageSize,
          sortBy: 'lastSeen',
          sortOrder: 'desc'
        });
        
        allNodes = allNodes.concat(response.data || []);
        
        // Check if there are more pages
        if (response.pagination) {
          const { page, pages, total } = response.pagination;
          totalCount = total;
          hasMorePages = page < pages;
          currentPage++;
          console.log(`NodesPage: Loaded page ${page}/${pages} (${response.data.length} nodes, ${allNodes.length}/${total} total)`);
        } else {
          hasMorePages = false;
        }
        
        // Safety check to prevent infinite loops
        if (currentPage > 100) {
          console.warn('NodesPage: Reached maximum page limit (100), stopping pagination');
          break;
        }
      }
      
      console.log('NodesPage: Received all nodes:', allNodes.length);
      
      // Update total count from API
      setTotalNodes(totalCount || allNodes.length);
      
      // Transform API response to frontend format
      const transformedNodes = allNodes.map((node: any) => ({
        id: node.id,
        hexId: node.hexId,
        shortName: node.shortName,
        longName: node.longName,
        hardwareModel: node.hardwareModel,
        firmwareVersion: node.firmwareVersion,
        role: node.role,
        position: node.positions && node.positions.length > 0 ? {
          latitude: node.positions[0].latitude,
          longitude: node.positions[0].longitude,
          altitude: node.positions[0].altitude,
          precision: node.positions[0].precision,
        } : null,
        lastSeen: node.lastSeen,
        lastHeard: node.lastHeard,
        isOnline: node.isOnline,
        mqttConnected: node.mqttConnected,
        batteryLevel: node.batteryLevel,
        voltage: node.voltage,
        channelUtilization: node.channelUtilization,
        airUtilTx: node.airUtilTx,
        neighbors: node.neighborsFrom || [],
      }));
      
      dispatch(setNodes(transformedNodes));
      dispatch(setLoading(false));
      console.log('NodesPage: Nodes loaded into Redux store:', transformedNodes.length);
    } catch (error) {
      console.error('NodesPage: Failed to load nodes:', error);
      dispatch(setError('Failed to load nodes'));
      dispatch(setLoading(false));
    }
  };

  const handleRequestSort = (property: string) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleViewNode = (nodeId: string) => {
    dispatch(openDetailsPanel({ nodeId, returnPath: '/nodes' }));
    navigate('/map');
  };

  const handleCenterMapOnNode = (node: any) => {
    // Check if node has valid position data
    if (node.position && node.position.latitude && node.position.longitude) {
      // Set map center to node's position
      dispatch(setCenter([node.position.latitude, node.position.longitude]));
      // Zoom in to see the node clearly
      dispatch(setZoom(15));
      // Navigate to map page (without opening details panel)
      navigate('/map');
    }
  };

  const handleOpenMQTTMonitor = () => {
    setMqttMonitorOpen(true);
  };

  const handleCloseMQTTMonitor = () => {
    setMqttMonitorOpen(false);
  };

  const handleOpenTopology = () => {
    // Navigate to map and open topology
    navigate('/map');
    // The map page will handle opening the topology
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const formatLastSeen = (timestamp: string | undefined): string => {
    if (!timestamp) return 'Never';
    
    const now = new Date();
    const lastSeen = new Date(timestamp);
    const diffMs = now.getTime() - lastSeen.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const isNodeActive = (lastSeen: string | undefined): boolean => {
    if (!lastSeen) return false;
    const now = new Date();
    const lastSeenDate = new Date(lastSeen);
    const diffSeconds = (now.getTime() - lastSeenDate.getTime()) / 1000;
    // Use the same threshold as the map (nodesOfflineAge from settings)
    return diffSeconds < nodesOfflineAge;
  };

  const filteredAndSortedNodes = useMemo(() => {
    let filtered = [...nodes];

    // Filter out unknown nodes (nodes without shortName) unless showUnknown is enabled
    if (!showUnknown) {
      filtered = filtered.filter(node => node.shortName && node.shortName.trim() !== '');
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(node =>
        node.shortName?.toLowerCase().includes(query) ||
        node.longName?.toLowerCase().includes(query) ||
        node.hexId?.toLowerCase().includes(query) ||
        node.id?.toLowerCase().includes(query)
      );
    }

    // Apply active filter
    if (showActiveOnly) {
      filtered = filtered.filter(node => isNodeActive(node.lastSeen));
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any = a[orderBy as keyof typeof a];
      let bValue: any = b[orderBy as keyof typeof b];

      // Handle special cases
      if (orderBy === 'neighborCount') {
        aValue = a.neighbors?.length || 0;
        bValue = b.neighbors?.length || 0;
      } else if (orderBy === 'altitude' || orderBy === 'latitude' || orderBy === 'longitude') {
        aValue = a.position?.[orderBy as keyof typeof a.position] || 0;
        bValue = b.position?.[orderBy as keyof typeof b.position] || 0;
      }

      // Handle null/undefined values
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      // Compare values
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return order === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return order === 'asc' 
        ? (aValue < bValue ? -1 : 1)
        : (bValue < aValue ? -1 : 1);
    });

    return filtered;
  }, [nodes, searchQuery, showActiveOnly, showUnknown, orderBy, order, nodesOfflineAge]);

  // Paginate the filtered results
  const paginatedNodes = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredAndSortedNodes.slice(startIndex, endIndex);
  }, [filteredAndSortedNodes, currentPage, pageSize]);

  const getNodeValue = (node: any, columnId: string): any => {
    switch (columnId) {
      case 'neighborCount':
        return node.neighbors?.length || 0;
      case 'altitude':
      case 'latitude':
      case 'longitude':
        return node.position?.[columnId];
      case 'lastSeen':
        return formatLastSeen(node.lastSeen);
      case 'owner':
        return node.user?.longName || node.user?.shortName || 'Unknown';
      case 'actions':
        return null;
      default:
        return node[columnId];
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <NavigationHeader 
        onOpenMQTTMonitor={handleOpenMQTTMonitor}
        onOpenTopology={handleOpenTopology}
      />
      
      <Box sx={{ p: 3, flexGrow: 1, overflow: 'auto' }}>
        <Typography variant="h4" gutterBottom>
          Network Nodes
        </Typography>

        <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            label="Search nodes"
            variant="outlined"
            size="small"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or ID..."
            sx={{ minWidth: 300 }}
          />
          
          <FormControlLabel
            control={
              <Switch
                checked={showActiveOnly}
                onChange={(e) => setShowActiveOnly(e.target.checked)}
                color="primary"
              />
            }
            label="Show active only"
          />

          <FormControlLabel
            control={
              <Switch
                checked={showUnknown}
                onChange={(e) => setShowUnknown(e.target.checked)}
                color="primary"
              />
            }
            label="Show unknown"
          />

          <Chip 
            label={`${filteredAndSortedNodes.length} node${filteredAndSortedNodes.length !== 1 ? 's' : ''}`}
            color="primary"
            variant="outlined"
          />
          
          {totalNodes > filteredAndSortedNodes.length && (
            <Typography variant="body2" color="text.secondary">
              (filtered from {totalNodes} total)
            </Typography>
          )}
        </Box>

        <TableContainer component={Paper} sx={{ maxHeight: 'calc(100vh - 250px)' }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                {columns.map((column) => (
                  <TableCell
                    key={column.id}
                    align={column.align}
                    style={{ minWidth: column.minWidth, fontWeight: 'bold' }}
                  >
                    {column.id !== 'actions' ? (
                      <TableSortLabel
                        active={orderBy === column.id}
                        direction={orderBy === column.id ? order : 'asc'}
                        onClick={() => handleRequestSort(column.id)}
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
              {paginatedNodes.map((node) => {
                const active = isNodeActive(node.lastSeen);
                return (
                  <TableRow 
                    key={node.id} 
                    hover
                    sx={{ 
                      opacity: active ? 1 : 0.6,
                      '&:hover': { backgroundColor: 'action.hover' }
                    }}
                  >
                    {columns.map((column) => {
                      const value = getNodeValue(node, column.id);
                      
                      if (column.id === 'actions') {
                        return (
                          <TableCell key={column.id} align={column.align}>
                            <Tooltip title="View details">
                              <IconButton
                                size="small"
                                onClick={() => handleViewNode(node.id)}
                                color="primary"
                              >
                                <VisibilityIcon />
                              </IconButton>
                            </Tooltip>
                            {node.position && node.position.latitude && node.position.longitude && (
                              <Tooltip title="Center map on node">
                                <IconButton
                                  size="small"
                                  onClick={() => handleCenterMapOnNode(node)}
                                  color="secondary"
                                  sx={{ ml: 0.5 }}
                                >
                                  <MyLocationIcon />
                                </IconButton>
                              </Tooltip>
                            )}
                          </TableCell>
                        );
                      }

                      const displayValue = column.format ? column.format(value) : (value || '');
                      
                      return (
                        <TableCell key={column.id} align={column.align}>
                          {column.id === 'role' && value ? (
                            <Chip label={value} size="small" />
                          ) : (
                            displayValue
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
              {paginatedNodes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={columns.length} align="center" sx={{ py: 4 }}>
                    <Typography variant="body1" color="text.secondary">
                      No nodes found
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination Controls */}
        {filteredAndSortedNodes.length > pageSize && (
          <Stack spacing={2} alignItems="center" sx={{ mt: 3, mb: 2 }}>
            <Pagination 
              count={Math.ceil(filteredAndSortedNodes.length / pageSize)}
              page={currentPage}
              onChange={handlePageChange}
              color="primary"
              size="large"
              showFirstButton
              showLastButton
            />
            <Typography variant="body2" color="text.secondary">
              Page {currentPage} of {Math.ceil(filteredAndSortedNodes.length / pageSize)}
            </Typography>
          </Stack>
        )}
      </Box>

      {/* MQTT Monitor */}
      <MQTTMonitor 
        isVisible={mqttMonitorOpen}
        onClose={handleCloseMQTTMonitor}
      />
    </Box>
  );
};

export default NodesPage;
