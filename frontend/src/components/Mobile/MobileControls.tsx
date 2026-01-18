import React, { useState, useEffect } from 'react';
import {
  Box,
  Fab,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  Snackbar,
  Alert,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  MyLocation as MyLocationIcon,
  Layers as LayersIcon,
  Search as SearchIcon,
  Settings as SettingsIcon,
  CloudOff as OfflineIcon,
  CloudDone as OnlineIcon,
  Menu as MenuIcon,
} from '@mui/icons-material';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { setCenter } from '../../store/slices/mapSlice';
import locationService, { LocationData } from '../../services/location.service';
import offlineService from '../../services/offline.service';

interface MobileControlsProps {
  onOpenSearch?: () => void;
  onOpenSettings?: () => void;
  onOpenMapOptions?: () => void;
}

const MobileControls: React.FC<MobileControlsProps> = ({
  onOpenSearch,
  onOpenSettings,
  onOpenMapOptions,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const dispatch = useDispatch();
  
  const { offlineMode } = useSelector((state: RootState) => state.connection);
  
  const [speedDialOpen, setSpeedDialOpen] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<LocationData | null>(null);
  const [locationWatchId, setLocationWatchId] = useState<number | null>(null);
  const [storageUsage, setStorageUsage] = useState<{ used: number; quota: number }>({ used: 0, quota: 0 });

  // Update storage usage periodically
  useEffect(() => {
    const updateStorageUsage = async () => {
      try {
        const usage = await offlineService.getStorageUsage();
        setStorageUsage(usage);
      } catch (error) {
        console.error('Failed to get storage usage:', error);
      }
    };

    updateStorageUsage();
    const interval = setInterval(updateStorageUsage, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Handle location permission and tracking
  const handleLocationRequest = async () => {
    if (!locationService.isLocationSupported()) {
      setLocationError('Location services are not supported on this device');
      return;
    }

    setLocationLoading(true);
    setLocationError(null);

    try {
      // Check permission status first
      const permission = await locationService.getPermissionStatus();
      
      if (permission === 'denied') {
        setLocationError('Location access denied. Please enable location services in your browser settings.');
        return;
      }

      // Get current position
      const position = await locationService.getCurrentPosition();
      setUserLocation(position);
      
      // Center map on user location
      dispatch(setCenter([position.latitude, position.longitude]));

      // Start watching position if not already watching
      if (!locationWatchId) {
        const watchId = locationService.watchPosition((newPosition) => {
          setUserLocation(newPosition);
        });
        
        if (watchId) {
          setLocationWatchId(watchId);
        }
      }
      
    } catch (error: any) {
      console.error('Location error:', error);
      setLocationError(error.message || 'Failed to get location');
    } finally {
      setLocationLoading(false);
    }
  };

  // Stop location tracking
  const handleStopLocationTracking = () => {
    if (locationWatchId) {
      locationService.clearWatch(locationWatchId);
      setLocationWatchId(null);
    }
    setUserLocation(null);
  };

  // Handle offline mode toggle (for testing)
  const handleOfflineToggle = async () => {
    if (offlineMode) {
      // Try to sync when going online
      try {
        await offlineService.processSyncQueue();
      } catch (error) {
        console.error('Failed to sync offline data:', error);
      }
    }
  };

  // Speed dial actions
  const speedDialActions = [
    {
      icon: <MyLocationIcon />,
      name: locationWatchId ? 'Stop Location' : 'My Location',
      onClick: locationWatchId ? handleStopLocationTracking : handleLocationRequest,
      disabled: locationLoading,
    },
    {
      icon: <SearchIcon />,
      name: 'Search',
      onClick: onOpenSearch,
    },
    {
      icon: <LayersIcon />,
      name: 'Map Options',
      onClick: onOpenMapOptions,
    },
    {
      icon: <SettingsIcon />,
      name: 'Settings',
      onClick: onOpenSettings,
    },
  ];

  // Don't render on desktop
  if (!isMobile) {
    return null;
  }

  return (
    <>
      {/* Main Speed Dial */}
      <SpeedDial
        ariaLabel="Mobile Controls"
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          zIndex: 1000,
        }}
        icon={<SpeedDialIcon icon={<MenuIcon />} />}
        onClose={() => setSpeedDialOpen(false)}
        onOpen={() => setSpeedDialOpen(true)}
        open={speedDialOpen}
        direction="up"
      >
        {speedDialActions.filter(action => !action.disabled).map((action) => (
          <SpeedDialAction
            key={action.name}
            icon={action.icon}
            tooltipTitle={action.name}
            onClick={() => {
              action.onClick?.();
              setSpeedDialOpen(false);
            }}
          />
        ))}
      </SpeedDial>

      {/* Offline Status Indicator */}
      <Fab
        size="small"
        sx={{
          position: 'fixed',
          top: 16,
          right: 16,
          zIndex: 1000,
          backgroundColor: offlineMode ? theme.palette.warning.main : theme.palette.success.main,
          color: theme.palette.getContrastText(
            offlineMode ? theme.palette.warning.main : theme.palette.success.main
          ),
          '&:hover': {
            backgroundColor: offlineMode ? theme.palette.warning.dark : theme.palette.success.dark,
          },
        }}
        onClick={handleOfflineToggle}
      >
        {offlineMode ? <OfflineIcon /> : <OnlineIcon />}
      </Fab>

      {/* User Location Indicator */}
      {userLocation && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 100,
            left: 16,
            zIndex: 1000,
            backgroundColor: theme.palette.primary.main,
            color: theme.palette.primary.contrastText,
            padding: 1,
            borderRadius: 1,
            fontSize: '0.75rem',
            maxWidth: 200,
          }}
        >
          <div>Lat: {userLocation.latitude.toFixed(6)}</div>
          <div>Lng: {userLocation.longitude.toFixed(6)}</div>
          <div>Accuracy: ±{Math.round(userLocation.accuracy)}m</div>
        </Box>
      )}

      {/* Storage Usage Indicator */}
      {storageUsage.quota > 0 && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 16,
            left: 16,
            zIndex: 1000,
            backgroundColor: theme.palette.background.paper,
            color: theme.palette.text.primary,
            padding: 1,
            borderRadius: 1,
            fontSize: '0.75rem',
            border: `1px solid ${theme.palette.divider}`,
            minWidth: 120,
          }}
        >
          <div>Storage:</div>
          <div>
            {Math.round((storageUsage.used / 1024 / 1024) * 100) / 100} MB / 
            {Math.round((storageUsage.quota / 1024 / 1024) * 100) / 100} MB
          </div>
          <div>
            ({Math.round((storageUsage.used / storageUsage.quota) * 100)}% used)
          </div>
        </Box>
      )}

      {/* Location Error Snackbar */}
      <Snackbar
        open={!!locationError}
        autoHideDuration={6000}
        onClose={() => setLocationError(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setLocationError(null)}
          severity="error"
          sx={{ width: '100%' }}
        >
          {locationError}
        </Alert>
      </Snackbar>
    </>
  );
};

export default MobileControls;