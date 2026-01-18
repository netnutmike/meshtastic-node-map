import React from 'react';
import { useSelector } from 'react-redux';
import { Box, Paper, Typography } from '@mui/material';
import { RootState } from '../../store';

const MapDebugInfo: React.FC = () => {
  const { nodes } = useSelector((state: RootState) => state.nodes);
  const { showNodes, nodeDisplayMode, zoom } = useSelector((state: RootState) => state.map);
  const { showAll, nodesMaxAge } = useSelector((state: RootState) => state.settings);

  const nodesWithPosition = nodes.filter(n => n.position);
  const now = Date.now();
  const recentNodes = nodesWithPosition.filter(n => {
    if (!n.lastSeen) return false;
    const ageSeconds = (now - new Date(n.lastSeen).getTime()) / 1000;
    return ageSeconds <= nodesMaxAge;
  });

  return (
    <Paper
      sx={{
        position: 'absolute',
        top: 80,
        left: 16,
        zIndex: 1000,
        p: 2,
        maxWidth: 300,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
      }}
    >
      <Typography variant="h6" gutterBottom>
        Map Debug Info
      </Typography>
      <Typography variant="body2">
        <strong>Total Nodes:</strong> {nodes.length}
      </Typography>
      <Typography variant="body2">
        <strong>Nodes with Position:</strong> {nodesWithPosition.length}
      </Typography>
      <Typography variant="body2">
        <strong>Recent Nodes (within {nodesMaxAge}s):</strong> {recentNodes.length}
      </Typography>
      <Typography variant="body2" sx={{ mt: 1 }}>
        <strong>Show Nodes:</strong> {showNodes ? 'Yes' : 'No'}
      </Typography>
      <Typography variant="body2">
        <strong>Show All:</strong> {showAll ? 'Yes' : 'No'}
      </Typography>
      <Typography variant="body2">
        <strong>Display Mode:</strong> {nodeDisplayMode}
      </Typography>
      <Typography variant="body2">
        <strong>Zoom Level:</strong> {zoom}
      </Typography>
      <Typography variant="body2">
        <strong>Max Age:</strong> {nodesMaxAge}s ({Math.floor(nodesMaxAge / 3600)}h)
      </Typography>
      
      {nodesWithPosition.length > 0 && (
        <>
          <Typography variant="body2" sx={{ mt: 1, fontWeight: 'bold' }}>
            Sample Node:
          </Typography>
          <Typography variant="body2" sx={{ fontSize: '11px' }}>
            {nodesWithPosition[0].shortName || nodesWithPosition[0].id}
          </Typography>
          <Typography variant="body2" sx={{ fontSize: '11px' }}>
            Pos: {nodesWithPosition[0].position?.latitude.toFixed(4)}, {nodesWithPosition[0].position?.longitude.toFixed(4)}
          </Typography>
          <Typography variant="body2" sx={{ fontSize: '11px' }}>
            Last Seen: {nodesWithPosition[0].lastSeen ? new Date(nodesWithPosition[0].lastSeen).toLocaleString() : 'Never'}
          </Typography>
        </>
      )}
    </Paper>
  );
};

export default MapDebugInfo;
