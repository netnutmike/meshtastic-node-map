import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Box,
  Typography,
  Divider,
  Grid,
} from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { updateSettings, resetSettings } from '../../store/slices/settingsSlice';

interface SettingsProps {
  open: boolean;
  onClose: () => void;
}

const Settings: React.FC<SettingsProps> = ({ open, onClose }) => {
  const dispatch = useDispatch();
  const settings = useSelector((state: RootState) => state.settings);
  
  // Local state for form values
  const [formValues, setFormValues] = useState(settings);

  // Update local form values when settings change
  React.useEffect(() => {
    setFormValues(settings);
  }, [settings]);

  const handleInputChange = (field: string, value: any) => {
    setFormValues(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = () => {
    dispatch(updateSettings(formValues));
    onClose();
  };

  const handleReset = () => {
    dispatch(resetSettings());
    setFormValues({
      nodesMaxAge: 86400,
      nodesDisconnectedAge: 3600,
      nodesOfflineAge: 300,
      defaultZoom: 10,
      temperatureFormat: 'celsius',
      autoUpdatePositionInUrl: true,
      showAll: false,
    });
  };

  const handleCancel = () => {
    setFormValues(settings); // Reset to current settings
    onClose();
  };

  // Convert seconds to hours for display
  const secondsToHours = (seconds: number) => seconds / 3600;
  const hoursToSeconds = (hours: number) => hours * 3600;

  // Convert seconds to minutes for display
  const secondsToMinutes = (seconds: number) => seconds / 60;
  const minutesToSeconds = (minutes: number) => minutes * 60;

  return (
    <Dialog 
      open={open} 
      onClose={handleCancel}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Typography variant="h5" component="div">
          Settings
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Configure application behavior and display preferences
        </Typography>
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {/* Node Age Settings */}
          <Typography variant="h6" gutterBottom>
            Node Age Limits
          </Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Max Age (hours)"
                type="number"
                value={secondsToHours(formValues.nodesMaxAge)}
                onChange={(e) => handleInputChange('nodesMaxAge', hoursToSeconds(Number(e.target.value)))}
                helperText="Hide nodes older than this"
                inputProps={{ min: 0, step: 0.5 }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Disconnected Age (hours)"
                type="number"
                value={secondsToHours(formValues.nodesDisconnectedAge)}
                onChange={(e) => handleInputChange('nodesDisconnectedAge', hoursToSeconds(Number(e.target.value)))}
                helperText="Mark as disconnected after"
                inputProps={{ min: 0, step: 0.1 }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Offline Age (minutes)"
                type="number"
                value={secondsToMinutes(formValues.nodesOfflineAge)}
                onChange={(e) => handleInputChange('nodesOfflineAge', minutesToSeconds(Number(e.target.value)))}
                helperText="Mark as offline after"
                inputProps={{ min: 0, step: 1 }}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          {/* Display Preferences */}
          <Typography variant="h6" gutterBottom>
            Display Preferences
          </Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Default Zoom Level"
                type="number"
                value={formValues.defaultZoom}
                onChange={(e) => handleInputChange('defaultZoom', Number(e.target.value))}
                helperText="Initial map zoom (1-18)"
                inputProps={{ min: 1, max: 18, step: 1 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Temperature Format</InputLabel>
                <Select
                  value={formValues.temperatureFormat}
                  label="Temperature Format"
                  onChange={(e) => handleInputChange('temperatureFormat', e.target.value)}
                >
                  <MenuItem value="celsius">Celsius (°C)</MenuItem>
                  <MenuItem value="fahrenheit">Fahrenheit (°F)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          {/* Advanced Options */}
          <Typography variant="h6" gutterBottom>
            Advanced Options
          </Typography>
          <Box sx={{ mb: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={formValues.autoUpdatePositionInUrl}
                  onChange={(e) => handleInputChange('autoUpdatePositionInUrl', e.target.checked)}
                />
              }
              label="Auto-update position in URL"
            />
            <Typography variant="body2" color="text.secondary" sx={{ ml: 4 }}>
              Automatically update the browser URL with map position for bookmarking
            </Typography>
          </Box>

          <Box sx={{ mb: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={formValues.showAll}
                  onChange={(e) => handleInputChange('showAll', e.target.checked)}
                />
              }
              label="Show All Nodes"
            />
            <Typography variant="body2" color="text.secondary" sx={{ ml: 4 }}>
              Disable age-based filtering and show all nodes regardless of last update time
            </Typography>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleReset} color="warning">
          Reset to Defaults
        </Button>
        <Box sx={{ flexGrow: 1 }} />
        <Button onClick={handleCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave} variant="contained">
          Save Settings
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default Settings;