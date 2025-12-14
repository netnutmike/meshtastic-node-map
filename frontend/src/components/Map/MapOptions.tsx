import React from 'react';
import {
  Box,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormGroup,
  FormControlLabel,
  Switch,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Close as CloseIcon,
  Map as MapIcon,
  Layers as LayersIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import {
  setTileLayer,
  setNodeDisplayMode,
  toggleLegend,
  toggleNeighbors,
  togglePositionHistory,
  setViewMode,
} from '../../store/slices/mapSlice';

interface MapOptionsProps {
  isOpen: boolean;
  onClose: () => void;
}

const TILE_SOURCES = [
  { value: 'openstreetmap', label: 'OpenStreetMap' },
  { value: 'opentopomap', label: 'OpenTopoMap' },
  { value: 'satellite', label: 'Esri Satellite' },
  { value: 'googlesatellite', label: 'Google Satellite' },
  { value: 'googlehybrid', label: 'Google Hybrid' },
  { value: 'cartolight', label: 'Carto Light' },
  { value: 'cartodark', label: 'Carto Dark' },
];

const NODE_DISPLAY_MODES = [
  { value: 'all', label: 'All Nodes' },
  { value: 'routers', label: 'Routers Only' },
  { value: 'clustered', label: 'Clustered' },
  { value: 'none', label: 'None' },
];

const VIEW_MODES = [
  { value: 'nodes', label: 'Nodes' },
  { value: 'nodeTypes', label: 'Node Types' },
  { value: 'bandwidthUtilization', label: 'Bandwidth Utilization' },
];

const MapOptions: React.FC<MapOptionsProps> = ({ isOpen, onClose }) => {
  const dispatch = useDispatch();
  const {
    tileLayer,
    nodeDisplayMode,
    showLegend,
    showNeighbors,
    showPositionHistory,
    viewMode,
  } = useSelector((state: RootState) => state.map);

  if (!isOpen) return null;

  return (
    <Paper
      elevation={8}
      sx={{
        position: 'absolute',
        top: 16,
        right: 16,
        width: 320,
        maxHeight: 'calc(100vh - 32px)',
        overflowY: 'auto',
        zIndex: 1000,
        p: 2,
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <MapIcon />
          Map Options
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Map Sources Section */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <LayersIcon fontSize="small" />
          Map Sources
        </Typography>
        <FormControl fullWidth size="small">
          <InputLabel>Tile Source</InputLabel>
          <Select
            value={tileLayer}
            label="Tile Source"
            onChange={(e) => dispatch(setTileLayer(e.target.value))}
          >
            {TILE_SOURCES.map((source) => (
              <MenuItem key={source.value} value={source.value}>
                {source.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Node Display Options */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <VisibilityIcon fontSize="small" />
          Node Display
        </Typography>
        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
          <InputLabel>Display Mode</InputLabel>
          <Select
            value={nodeDisplayMode}
            label="Display Mode"
            onChange={(e) => dispatch(setNodeDisplayMode(e.target.value as any))}
          >
            {NODE_DISPLAY_MODES.map((mode) => (
              <MenuItem key={mode.value} value={mode.value}>
                {mode.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth size="small">
          <InputLabel>View Mode</InputLabel>
          <Select
            value={viewMode}
            label="View Mode"
            onChange={(e) => dispatch(setViewMode(e.target.value as any))}
          >
            {VIEW_MODES.map((mode) => (
              <MenuItem key={mode.value} value={mode.value}>
                {mode.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Overlay Options */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>
          Overlays
        </Typography>
        <FormGroup>
          <Tooltip title="Show/hide map legend" placement="left">
            <FormControlLabel
              control={
                <Switch
                  checked={showLegend}
                  onChange={() => dispatch(toggleLegend())}
                  size="small"
                />
              }
              label="Legend"
            />
          </Tooltip>
          <Tooltip title="Show/hide neighbor connections" placement="left">
            <FormControlLabel
              control={
                <Switch
                  checked={showNeighbors}
                  onChange={() => dispatch(toggleNeighbors())}
                  size="small"
                />
              }
              label="Neighbors"
            />
          </Tooltip>
          <Tooltip title="Show/hide position history trails" placement="left">
            <FormControlLabel
              control={
                <Switch
                  checked={showPositionHistory}
                  onChange={() => dispatch(togglePositionHistory())}
                  size="small"
                />
              }
              label="Position History"
            />
          </Tooltip>
        </FormGroup>
      </Box>

      {/* Help Text */}
      <Box sx={{ mt: 2, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
        <Typography variant="caption" color="text.secondary">
          Use these options to customize the map display and overlays. Changes are applied immediately.
        </Typography>
      </Box>
    </Paper>
  );
};

export default MapOptions;