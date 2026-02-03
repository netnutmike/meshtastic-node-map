import React from 'react';
import { Paper, Typography, Box, Chip } from '@mui/material';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';

const MapLegend: React.FC = () => {
  const { showLegend, viewMode } = useSelector((state: RootState) => state.map);

  if (!showLegend) return null;

  const getLegendItems = () => {
    switch (viewMode) {
      case 'nodeTypes':
        return [
          { color: '#9c27b0', label: 'Router' },
          { color: '#ff5722', label: 'Repeater' },
          { color: '#00bcd4', label: 'Client' },
          { color: '#607d8b', label: 'Client Mute' },
          { color: '#795548', label: 'Client Hidden' },
          { color: '#ff9800', label: 'Tracker' },
          { color: '#4caf50', label: 'Sensor' },
          { color: '#e91e63', label: 'TAK' },
          { color: '#f44336', label: 'TAK Tracker' },
          { color: '#3f51b5', label: 'Telemetry Request' },
        ];
      case 'bandwidthUtilization':
        return [
          { color: '#4caf50', label: '0-25% Utilization' },
          { color: '#ffeb3b', label: '25-50% Utilization' },
          { color: '#ff9800', label: '50-75% Utilization' },
          { color: '#f44336', label: '75-100% Utilization' },
        ];
      default: // 'nodes'
        return [
          { color: '#4caf50', label: 'Online (MQTT Connected)' },
          { color: '#2196f3', label: 'Disconnected (MQTT)' },
          { color: '#f44336', label: 'Offline' },
        ];
    }
  };

  const legendItems = getLegendItems();

  return (
    <Paper
      elevation={4}
      sx={{
        position: 'absolute',
        bottom: 16,
        left: 16,
        p: 2,
        minWidth: 200,
        maxWidth: 300,
        zIndex: 1000,
        backgroundColor: (theme) => 
          theme.palette.mode === 'dark' 
            ? 'rgba(33, 37, 41, 0.95)' 
            : 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
        Map Legend
      </Typography>
      
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {legendItems.map((item, index) => (
          <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor: item.color,
                border: (theme) => 
                  theme.palette.mode === 'dark' 
                    ? '2px solid #555' 
                    : '2px solid white',
                boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
                flexShrink: 0,
              }}
            />
            <Typography variant="caption" sx={{ fontSize: '11px' }}>
              {item.label}
            </Typography>
          </Box>
        ))}
      </Box>

      {viewMode === 'nodes' && (
        <Box sx={{ 
          mt: 1, 
          pt: 1, 
          borderTop: (theme) => 
            theme.palette.mode === 'dark' 
              ? '1px solid #555' 
              : '1px solid #eee' 
        }}>
          <Typography variant="caption" sx={{ fontSize: '10px', color: 'text.secondary' }}>
            Nodes may appear faded or marked as "OLD" based on age settings
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default MapLegend;