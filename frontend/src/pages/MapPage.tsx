import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { Box } from '@mui/material';
import NavigationHeader from '../components/Layout/NavigationHeader';
import MapComponent from '../components/Map/MapComponent';
import { setNodes, setLoading, setError, Node } from '../store/slices/nodeSlice';
import { openTopologyGraph } from '../store/slices/mapSlice';
import { apiService } from '../services/api';

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

  useEffect(() => {
    // Load nodes from API on component mount
    loadNodes();
  }, [dispatch]);

  const loadNodes = async () => {
    try {
      dispatch(setLoading(true));
      const response = await apiService.getNodes();
      
      // Transform API response to frontend format
      const transformedNodes = response.data.map((node: any) => ({
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
    } catch (error) {
      console.error('Failed to load nodes:', error);
      dispatch(setError('Failed to load nodes'));
      
      // Fallback to mock data for development
      dispatch(setNodes(mockNodes));
    }
  };

  const handleSearch = (query: string) => {
    // TODO: Implement search functionality
    console.log('Search query:', query);
  };

  const handleRefresh = () => {
    console.log('Refreshing map data...');
    loadNodes();
  };

  const handleOpenTopology = () => {
    dispatch(openTopologyGraph());
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <NavigationHeader 
        onSearch={handleSearch} 
        onRefresh={handleRefresh}
        onOpenTopology={handleOpenTopology}
      />
      <Box sx={{ flexGrow: 1 }}>
        <MapComponent height="100%" />
      </Box>
    </Box>
  );
};

export default MapPage;