import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Box, Drawer, IconButton, Tooltip, CircularProgress } from '@mui/material';
import { FilterList as FilterIcon, Map as MapOptionsIcon, MyLocation as MyLocationIcon } from '@mui/icons-material';
import NavigationHeader from '../components/Layout/NavigationHeader';
import MapComponent from '../components/Map/MapComponent';
import SearchAndFiltering, { SearchFilters } from '../components/SearchAndFiltering';
import { MQTTMonitor } from '../components/MQTTMonitor';
import { setNodes, setLoading, setError, setSearchFilters, Node } from '../store/slices/nodeSlice';
import { openTopologyGraph, getUserLocation, setUserLocation, setCenter, setZoom } from '../store/slices/mapSlice';
import { apiService } from '../services/api';
import { RootState } from '../store';

// Mock data for initial testing - this will be replaced with API calls
const mockNodes: Node[] = [
  {
    id: '1',
    hexId: '0x12345678',
    shortName: 'NODE1',
    longName: 'Test Node 1',
    hardwareModel: 'TBEAM',
    firmwareVersion: '2.2.0',
    role: 'ROUTER',
    position: {
      latitude: 40.7589,
      longitude: -73.9851,
      altitude: 10,
      precision: 5,
    },
    lastSeen: new Date().toISOString(),
    lastHeard: new Date().toISOString(),
    isOnline: true,
    mqttConnected: true,
    batteryLevel: 85,
    voltage: 4.1,
    channelUtilization: 15,
    airUtilTx: 8,
    neighbors: [
      {
        id: 'neighbor_1_2',
        neighborId: '2',
        rssi: -45,
        snr: 12,
        lastHeard: new Date().toISOString(),
        hopCount: 1
      },
      {
        id: 'neighbor_1_3',
        neighborId: '3',
        rssi: -78,
        snr: 3,
        lastHeard: new Date(Date.now() - 300000).toISOString(),
        hopCount: 1
      }
    ]
  },
  {
    id: '2',
    hexId: '0x87654321',
    shortName: 'NODE2',
    longName: 'Test Node 2',
    hardwareModel: 'HELTEC_V3',
    firmwareVersion: '2.2.0',
    role: 'CLIENT',
    position: {
      latitude: 40.7505,
      longitude: -73.9934,
      altitude: 25,
      precision: 3,
    },
    lastSeen: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
    lastHeard: new Date(Date.now() - 300000).toISOString(),
    isOnline: true,
    mqttConnected: false,
    batteryLevel: 42,
    voltage: 3.8,
    channelUtilization: 22,
    airUtilTx: 12,
    neighbors: [
      {
        id: 'neighbor_2_1',
        neighborId: '1',
        rssi: -52,
        snr: 8,
        lastHeard: new Date().toISOString(),
        hopCount: 1
      }
    ]
  },
  {
    id: '3',
    hexId: '0xABCDEF00',
    shortName: 'NODE3',
    longName: 'Test Node 3',
    hardwareModel: 'RAK4631',
    firmwareVersion: '2.1.18',
    role: 'REPEATER',
    position: {
      latitude: 40.7614,
      longitude: -73.9776,
      altitude: 15,
      precision: 8,
    },
    lastSeen: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    lastHeard: new Date(Date.now() - 3600000).toISOString(),
    isOnline: false,
    mqttConnected: false,
    batteryLevel: 0,
    voltage: 3.2,
    channelUtilization: 0,
    airUtilTx: 0,
    neighbors: [
      {
        id: 'neighbor_3_1',
        neighborId: '1',
        rssi: -85,
        snr: -2,
        lastHeard: new Date(Date.now() - 3600000).toISOString(),
        hopCount: 1
      }
    ]
  },
];

const MapPage: React.FC = () => {
  const dispatch = useDispatch();
  const { filteredNodes } = useSelector((state: RootState) => state.nodes);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [currentFilters, setCurrentFilters] = useState<SearchFilters>({});
  const [mqttMonitorOpen, setMqttMonitorOpen] = useState(false);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    // Load nodes from API on component mount
    console.log('MapPage: Component mounted, loading nodes...');
    loadNodes();
    
    // Request user's geolocation
    getUserLocation().then((location) => {
      console.log('Setting map center to user location:', location);
      dispatch(setUserLocation(location));
    });
  }, [dispatch]);

  const loadNodes = async (filters?: SearchFilters) => {
    try {
      console.log('MapPage: Starting loadNodes...');
      dispatch(setLoading(true));
      
      // Fetch all nodes by making multiple paginated requests (same as NodesPage)
      let allNodes: any[] = [];
      let currentPage = 1;
      let hasMorePages = true;
      const pageSize = 100; // Maximum allowed by backend
      
      while (hasMorePages) {
        const response = await apiService.getNodes({
          ...filters,
          page: currentPage,
          limit: pageSize,
          sortBy: 'lastSeen',
          sortOrder: 'desc'
        });
        
        allNodes = allNodes.concat(response.data || []);
        
        // Check if there are more pages
        if (response.pagination) {
          const { page, pages, total } = response.pagination;
          hasMorePages = page < pages;
          currentPage++;
          console.log(`MapPage: Loaded page ${page}/${pages} (${response.data.length} nodes, ${allNodes.length}/${total} total)`);
        } else {
          hasMorePages = false;
        }
        
        // Safety check to prevent infinite loops
        if (currentPage > 100) {
          console.warn('MapPage: Reached maximum page limit (100), stopping pagination');
          break;
        }
      }
      
      console.log('MapPage: Received all nodes:', allNodes.length);
      
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
      
      console.log('MapPage: Transformed nodes:', transformedNodes.length, 'nodes');
      console.log('MapPage: Nodes with positions:', transformedNodes.filter(n => n.position).length);
      dispatch(setNodes(transformedNodes));
      console.log('MapPage: Dispatched setNodes to Redux');
    } catch (error) {
      console.error('MapPage: Failed to load nodes:', error);
      dispatch(setError('Failed to load nodes'));
      
      // Fallback to mock data for development
      console.log('MapPage: Using mock data fallback');
      dispatch(setNodes(mockNodes));
    }
  };

  const handleSearch = (query: string) => {
    const filters = { ...currentFilters, search: query };
    setCurrentFilters(filters);
    dispatch(setSearchFilters(filters));
    loadNodes(filters);
  };

  const handleFilter = useCallback((filters: SearchFilters) => {
    setCurrentFilters(filters);
    dispatch(setSearchFilters(filters));
    loadNodes(filters);
  }, [dispatch]);

  const handleRefresh = () => {
    console.log('Refreshing map data...');
    loadNodes(currentFilters);
  };

  const handleOpenTopology = () => {
    dispatch(openTopologyGraph());
  };

  const handleOpenMapOptions = () => {
    // Use the global function exposed by MapComponent
    if ((window as any).openMapOptions) {
      (window as any).openMapOptions();
    }
  };

  const handleOpenMQTTMonitor = () => {
    setMqttMonitorOpen(true);
  };

  const handleCloseMQTTMonitor = () => {
    setMqttMonitorOpen(false);
  };

  const handleDrawBounds = () => {
    // TODO: Implement map drawing functionality
    console.log('Drawing bounds on map...');
  };

  const toggleFilterDrawer = () => {
    setFilterDrawerOpen(!filterDrawerOpen);
  };

  const handleCenterOnMyLocation = () => {
    setLocating(true);

    if (!navigator.geolocation) {
      console.error('Geolocation is not supported by your browser');
      setLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        dispatch(setCenter([latitude, longitude]));
        dispatch(setZoom(15));
        setLocating(false);
      },
      (error) => {
        let errorMessage = 'Unable to retrieve your location';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission denied';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out';
            break;
        }
        console.error('Geolocation error:', errorMessage);
        setLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <NavigationHeader 
        onSearch={handleSearch} 
        onRefresh={handleRefresh}
        onOpenTopology={handleOpenTopology}
        onOpenMQTTMonitor={handleOpenMQTTMonitor}
      />
      
      {/* Filter Toggle Button */}
      <Box sx={{ position: 'absolute', top: 80, right: 16, zIndex: 1000 }}>
        <Tooltip title="Search & Filter">
          <IconButton
            onClick={toggleFilterDrawer}
            sx={{
              backgroundColor: 'background.paper',
              boxShadow: 2,
              '&:hover': {
                backgroundColor: 'background.paper',
                boxShadow: 4,
              },
            }}
          >
            <FilterIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Map Options Button */}
      <Box sx={{ position: 'absolute', top: 140, right: 16, zIndex: 1000 }}>
        <Tooltip title="Map Options">
          <IconButton
            onClick={handleOpenMapOptions}
            sx={{
              backgroundColor: 'background.paper',
              boxShadow: 2,
              '&:hover': {
                backgroundColor: 'background.paper',
                boxShadow: 4,
              },
            }}
          >
            <MapOptionsIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Center on My Location Button */}
      <Box sx={{ position: 'absolute', top: 200, right: 16, zIndex: 1000 }}>
        <Tooltip title={locating ? "Locating..." : "Center on My Location"}>
          <IconButton
            onClick={handleCenterOnMyLocation}
            disabled={locating}
            sx={{
              backgroundColor: 'background.paper',
              boxShadow: 2,
              '&:hover': {
                backgroundColor: 'background.paper',
                boxShadow: 4,
              },
              '&:disabled': {
                backgroundColor: 'background.paper',
              },
            }}
          >
            {locating ? <CircularProgress size={24} /> : <MyLocationIcon />}
          </IconButton>
        </Tooltip>
      </Box>

      {/* Search and Filtering Drawer */}
      <Drawer
        anchor="right"
        open={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        sx={{
          '& .MuiDrawer-paper': {
            width: 400,
            maxWidth: '90vw',
            top: 64, // Below the navigation header
            height: 'calc(100vh - 64px)',
          },
        }}
      >
        <SearchAndFiltering
          onFilter={handleFilter}
          resultCount={filteredNodes.length}
          onDrawBounds={handleDrawBounds}
        />
      </Drawer>

      <Box sx={{ flexGrow: 1 }}>
        <MapComponent height="100%" onOpenMapOptions={handleOpenMapOptions} />
      </Box>

      {/* MQTT Monitor */}
      <MQTTMonitor 
        isVisible={mqttMonitorOpen}
        onClose={handleCloseMQTTMonitor}
      />
    </Box>
  );
};

export default MapPage;