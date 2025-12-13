import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { Box } from '@mui/material';
import NavigationHeader from '../components/Layout/NavigationHeader';
import MapComponent from '../components/Map/MapComponent';
import { setNodes } from '../store/slices/nodeSlice';
import { Node } from '../store/slices/nodeSlice';

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
  },
];

const MapPage: React.FC = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    // Load mock data on component mount
    // In a real application, this would be an API call
    dispatch(setNodes(mockNodes));
  }, [dispatch]);

  const handleSearch = (query: string) => {
    // TODO: Implement search functionality
    console.log('Search query:', query);
  };

  const handleRefresh = () => {
    // TODO: Implement refresh functionality
    console.log('Refreshing map data...');
    dispatch(setNodes(mockNodes)); // For now, just reload mock data
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <NavigationHeader onSearch={handleSearch} onRefresh={handleRefresh} />
      <Box sx={{ flexGrow: 1 }}>
        <MapComponent height="100%" />
      </Box>
    </Box>
  );
};

export default MapPage;