import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Typography,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Autocomplete,
  Slider,
  Paper
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Clear as ClearIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
  Map as MapIcon
} from '@mui/icons-material';
// Date picker imports removed for simplicity - using regular date inputs
import { useSelector } from 'react-redux';
import { RootState } from '../../store';

export interface SearchFilters {
  search?: string;
  hardwareModel?: string;
  role?: string;
  isOnline?: boolean;
  mqttConnected?: boolean;
  minBattery?: number;
  maxAge?: number;
  startDate?: Date;
  endDate?: Date;
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

interface SearchAndFilteringProps {
  onFilter: (filters: SearchFilters) => void;
  resultCount?: number;
  onDrawBounds?: () => void;
}

const HARDWARE_MODELS = [
  'TBEAM', 'HELTEC_V3', 'RAK4631', 'STATION_G1', 'NANO_G1',
  'LORA32_V2_1', 'T_ECHO', 'PORTDUINO', 'ANDROID_SIM', 'DIY_V1'
];

const NODE_ROLES = [
  'CLIENT', 'CLIENT_MUTE', 'ROUTER', 'ROUTER_CLIENT', 'REPEATER',
  'TRACKER', 'SENSOR', 'TAK', 'CLIENT_HIDDEN', 'LOST_AND_FOUND', 'TAK_TRACKER'
];

const SearchAndFiltering: React.FC<SearchAndFilteringProps> = ({
  onFilter,
  resultCount,
  onDrawBounds
}) => {
  const nodes = useSelector((state: RootState) => state.nodes.nodes);
  
  const [filters, setFilters] = useState<SearchFilters>({});
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [boundsDrawing, setBoundsDrawing] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});

  // Load saved filters from localStorage on mount
  useEffect(() => {
    const savedFilters = localStorage.getItem('nodeFilters');
    if (savedFilters) {
      try {
        const parsed = JSON.parse(savedFilters);
        setFilters(parsed);
        onFilter(parsed);
      } catch (error) {
        console.error('Failed to parse saved filters:', error);
      }
    }
  }, [onFilter]);

  // Save filters to localStorage whenever they change
  useEffect(() => {
    if (Object.keys(filters).length > 0) {
      localStorage.setItem('nodeFilters', JSON.stringify(filters));
    }
  }, [filters]);

  // Generate search suggestions based on current nodes
  useEffect(() => {
    const suggestions = new Set<string>();
    nodes.forEach(node => {
      if (node.shortName) suggestions.add(node.shortName);
      if (node.longName) suggestions.add(node.longName);
      if (node.hexId) suggestions.add(node.hexId);
      if (node.id) suggestions.add(node.id);
    });
    setSearchSuggestions(Array.from(suggestions).sort());
  }, [nodes]);

  const updateFilter = useCallback((key: keyof SearchFilters, value: any) => {
    const newFilters = { ...filters };
    const newErrors = { ...validationErrors };
    
    if (value === '' || value === null || value === undefined) {
      delete newFilters[key];
      delete newErrors[key];
    } else {
      newFilters[key] = value;
      
      // Validate date ranges
      if (key === 'startDate' || key === 'endDate') {
        const startDate = key === 'startDate' ? new Date(value) : newFilters.startDate;
        const endDate = key === 'endDate' ? new Date(value) : newFilters.endDate;
        
        if (startDate && endDate && startDate >= endDate) {
          newErrors.dateRange = 'End date must be after start date';
        } else {
          delete newErrors.dateRange;
        }
      }
    }
    
    setFilters(newFilters);
    setValidationErrors(newErrors);
    onFilter(newFilters);
  }, [filters, validationErrors, onFilter]);

  const clearAllFilters = useCallback(() => {
    setFilters({});
    onFilter({});
    localStorage.removeItem('nodeFilters');
  }, [onFilter]);

  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    updateFilter('search', event.target.value);
  }, [updateFilter]);

  const handleAutocompleteChange = useCallback((_event: any, value: string | null) => {
    updateFilter('search', value || '');
  }, [updateFilter]);

  const handleDrawBounds = useCallback(() => {
    setBoundsDrawing(true);
    onDrawBounds?.();
  }, [onDrawBounds]);

  const getActiveFilterCount = () => {
    return Object.keys(filters).length;
  };

  const formatResultCount = (count: number) => {
    if (count === 0) return 'No nodes found';
    if (count === 1) return '1 node found';
    return `${count} nodes found`;
  };

  return (
    <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <SearchIcon color="primary" />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Search & Filter Nodes
          </Typography>
          {resultCount !== undefined && (
            <Typography variant="body2" color="text.secondary">
              {formatResultCount(resultCount)}
            </Typography>
          )}
          <Button
            onClick={clearAllFilters} 
            disabled={getActiveFilterCount() === 0}
            size="small"
            startIcon={<ClearIcon />}
            variant="outlined"
          >
            Clear Filters
          </Button>
        </Box>

        {/* Search Bar */}
        <Box sx={{ mb: 2 }}>
          <Autocomplete
            freeSolo
            options={searchSuggestions}
            value={filters.search || ''}
            onInputChange={handleAutocompleteChange}
            renderInput={(params) => (
              <TextField
                {...params}
                fullWidth
                placeholder="Search nodes by name, ID, or hex ID..."
                variant="outlined"
                size="small"
                InputProps={{
                  ...params.InputProps,
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                }}
                onChange={handleSearchChange}
              />
            )}
          />
        </Box>

        {/* Quick Filters */}
        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel id="hardware-type-label">Hardware Type</InputLabel>
            <Select
              labelId="hardware-type-label"
              id="hardware-type-select"
              value={filters.hardwareModel || ''}
              label="Hardware Type"
              onChange={(e) => updateFilter('hardwareModel', e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              {HARDWARE_MODELS.map(model => (
                <MenuItem key={model} value={model}>{model}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel id="role-label">Role</InputLabel>
            <Select
              labelId="role-label"
              id="role-select"
              value={filters.role || ''}
              label="Role"
              onChange={(e) => updateFilter('role', e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              {NODE_ROLES.map(role => (
                <MenuItem key={role} value={role}>{role}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel id="status-label">Status</InputLabel>
            <Select
              labelId="status-label"
              id="status-select"
              value={filters.isOnline === undefined ? '' : filters.isOnline ? 'online' : 'offline'}
              label="Status"
              onChange={(e) => {
                const value = e.target.value;
                if (value === '') {
                  updateFilter('isOnline', undefined);
                } else {
                  updateFilter('isOnline', value === 'online');
                }
              }}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="online">Online</MenuItem>
              <MenuItem value="offline">Offline</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel id="mqtt-status-label">MQTT Status</InputLabel>
            <Select
              labelId="mqtt-status-label"
              id="mqtt-status-select"
              value={filters.mqttConnected === undefined ? '' : filters.mqttConnected ? 'connected' : 'disconnected'}
              label="MQTT Status"
              onChange={(e) => {
                const value = e.target.value;
                if (value === '') {
                  updateFilter('mqttConnected', undefined);
                } else {
                  updateFilter('mqttConnected', value === 'connected');
                }
              }}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="connected">Connected</MenuItem>
              <MenuItem value="disconnected">Disconnected</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Advanced Filters */}
        <Accordion expanded={isAdvancedOpen} onChange={(_e, expanded) => setIsAdvancedOpen(expanded)}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FilterIcon />
              <Typography>Advanced Filters</Typography>
              {getActiveFilterCount() > 0 && (
                <Chip 
                  label={getActiveFilterCount()} 
                  size="small" 
                  color="primary" 
                  sx={{ ml: 1 }}
                />
              )}
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={3}>
              {/* Battery Level Filter */}
              <Grid item xs={12} sm={6}>
                <Typography gutterBottom>Minimum Battery Level (%)</Typography>
                <Slider
                  value={filters.minBattery || 0}
                  onChange={(_e, value) => updateFilter('minBattery', value as number)}
                  valueLabelDisplay="auto"
                  min={0}
                  max={100}
                  marks={[
                    { value: 0, label: '0%' },
                    { value: 25, label: '25%' },
                    { value: 50, label: '50%' },
                    { value: 75, label: '75%' },
                    { value: 100, label: '100%' }
                  ]}
                />
              </Grid>

              {/* Max Age Filter */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Maximum Age (hours)"
                  type="number"
                  size="small"
                  value={filters.maxAge || ''}
                  onChange={(e) => updateFilter('maxAge', e.target.value ? parseInt(e.target.value) : undefined)}
                  helperText="Hide nodes older than this many hours"
                />
              </Grid>

              {/* Date Range Filters */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Start Date"
                  type="date"
                  size="small"
                  value={filters.startDate ? (filters.startDate instanceof Date ? filters.startDate.toISOString().split('T')[0] : filters.startDate) : ''}
                  onChange={(e) => updateFilter('startDate', e.target.value || undefined)}
                  InputLabelProps={{ shrink: true }}
                  error={!!validationErrors.dateRange}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="End Date"
                  type="date"
                  size="small"
                  value={filters.endDate ? (filters.endDate instanceof Date ? filters.endDate.toISOString().split('T')[0] : filters.endDate) : ''}
                  onChange={(e) => updateFilter('endDate', e.target.value || undefined)}
                  InputLabelProps={{ shrink: true }}
                  inputProps={{
                    min: filters.startDate ? (filters.startDate instanceof Date ? filters.startDate.toISOString().split('T')[0] : filters.startDate) : undefined
                  }}
                  error={!!validationErrors.dateRange}
                  helperText={validationErrors.dateRange}
                />
              </Grid>

              {/* Date Range Validation Error Display */}
              {validationErrors.dateRange && (
                <Grid item xs={12}>
                  <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                    {validationErrors.dateRange}
                  </Typography>
                </Grid>
              )}

              {/* Geographic Bounds Filter */}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography>Geographic Area Filter</Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<MapIcon />}
                    onClick={handleDrawBounds}
                    disabled={boundsDrawing}
                  >
                    {boundsDrawing ? 'Drawing...' : 'Draw on Map'}
                  </Button>
                  {filters.bounds && (
                    <Chip
                      label="Area Selected"
                      onDelete={() => updateFilter('bounds', undefined)}
                      color="primary"
                      size="small"
                    />
                  )}
                </Box>
                <TextField
                  fullWidth
                  label="Geographic Bounds"
                  placeholder="north,south,east,west (e.g., 40.8,40.6,-74.2,-73.8)"
                  size="small"
                  sx={{ mt: 1 }}
                  value={filters.bounds ? `${filters.bounds.north},${filters.bounds.south},${filters.bounds.east},${filters.bounds.west}` : ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    const newErrors = { ...validationErrors };
                    
                    if (!value) {
                      updateFilter('bounds', undefined);
                      delete newErrors.bounds;
                      setValidationErrors(newErrors);
                      return;
                    }
                    
                    const parts = value.split(',').map(p => parseFloat(p.trim()));
                    if (parts.length === 4 && parts.every(p => !isNaN(p))) {
                      updateFilter('bounds', {
                        north: parts[0],
                        south: parts[1],
                        east: parts[2],
                        west: parts[3]
                      });
                      delete newErrors.bounds;
                    } else {
                      newErrors.bounds = 'Invalid bounds format';
                    }
                    setValidationErrors(newErrors);
                  }}
                  error={!!validationErrors.bounds}
                  helperText={validationErrors.bounds || "Enter bounds as: north,south,east,west coordinates"}
                />
                {filters.bounds && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Bounds: N{filters.bounds.north.toFixed(4)}, S{filters.bounds.south.toFixed(4)}, 
                    E{filters.bounds.east.toFixed(4)}, W{filters.bounds.west.toFixed(4)}
                  </Typography>
                )}
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Active Filters Display */}
        {getActiveFilterCount() > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Active Filters:
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {filters.search && (
                <Chip
                  label={`Search: "${filters.search}"`}
                  onDelete={() => updateFilter('search', '')}
                  size="small"
                />
              )}
              {filters.hardwareModel && (
                <Chip
                  label={`Hardware: ${filters.hardwareModel}`}
                  onDelete={() => updateFilter('hardwareModel', '')}
                  size="small"
                />
              )}
              {filters.role && (
                <Chip
                  label={`Role: ${filters.role}`}
                  onDelete={() => updateFilter('role', '')}
                  size="small"
                />
              )}
              {filters.isOnline !== undefined && (
                <Chip
                  label={`Status: ${filters.isOnline ? 'Online' : 'Offline'}`}
                  onDelete={() => updateFilter('isOnline', undefined)}
                  size="small"
                />
              )}
              {filters.mqttConnected !== undefined && (
                <Chip
                  label={`MQTT: ${filters.mqttConnected ? 'Connected' : 'Disconnected'}`}
                  onDelete={() => updateFilter('mqttConnected', undefined)}
                  size="small"
                />
              )}
              {filters.minBattery && filters.minBattery > 0 && (
                <Chip
                  label={`Battery ≥ ${filters.minBattery}%`}
                  onDelete={() => updateFilter('minBattery', 0)}
                  size="small"
                />
              )}
              {filters.maxAge && (
                <Chip
                  label={`Age ≤ ${filters.maxAge}h`}
                  onDelete={() => updateFilter('maxAge', undefined)}
                  size="small"
                />
              )}
              {(filters.startDate || filters.endDate) && (
                <Chip
                  label="Date Range"
                  onDelete={() => {
                    updateFilter('startDate', undefined);
                    updateFilter('endDate', undefined);
                  }}
                  size="small"
                />
              )}
              {filters.bounds && (
                <Chip
                  label="Geographic Area"
                  onDelete={() => updateFilter('bounds', undefined)}
                  size="small"
                />
              )}
            </Box>
          </Box>
        )}
      </Paper>
  );
};

export default SearchAndFiltering;