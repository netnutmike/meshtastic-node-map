/**
 * TimeRangePicker Component
 * Reusable time range selection with presets
 * Requirements: 43.13
 */

import React, { useState } from 'react';
import {
  Box,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  SelectChangeEvent,
  Stack
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFnsV2';

export interface TimeRange {
  start: Date | null;
  end: Date | null;
}

export interface TimeRangePickerProps {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
  label?: string;
  showPresets?: boolean;
  fullWidth?: boolean;
  size?: 'small' | 'medium';
  disabled?: boolean;
}

type PresetValue = 'custom' | '1h' | '6h' | '24h' | '7d' | '30d';

interface TimePreset {
  value: PresetValue;
  label: string;
  getRange: () => TimeRange;
}

const TIME_PRESETS: TimePreset[] = [
  {
    value: 'custom',
    label: 'Custom Range',
    getRange: () => ({ start: null, end: null })
  },
  {
    value: '1h',
    label: 'Last Hour',
    getRange: () => ({
      start: new Date(Date.now() - 60 * 60 * 1000),
      end: new Date()
    })
  },
  {
    value: '6h',
    label: 'Last 6 Hours',
    getRange: () => ({
      start: new Date(Date.now() - 6 * 60 * 60 * 1000),
      end: new Date()
    })
  },
  {
    value: '24h',
    label: 'Last 24 Hours',
    getRange: () => ({
      start: new Date(Date.now() - 24 * 60 * 60 * 1000),
      end: new Date()
    })
  },
  {
    value: '7d',
    label: 'Last 7 Days',
    getRange: () => ({
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      end: new Date()
    })
  },
  {
    value: '30d',
    label: 'Last 30 Days',
    getRange: () => ({
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: new Date()
    })
  }
];

const TimeRangePicker: React.FC<TimeRangePickerProps> = ({
  value,
  onChange,
  label = 'Time Range',
  showPresets = true,
  fullWidth = true,
  size = 'medium',
  disabled = false
}) => {
  const [preset, setPreset] = useState<PresetValue>('24h');

  const handlePresetChange = (event: SelectChangeEvent<PresetValue>) => {
    const newPreset = event.target.value as PresetValue;
    setPreset(newPreset);

    if (newPreset !== 'custom') {
      const presetConfig = TIME_PRESETS.find(p => p.value === newPreset);
      if (presetConfig) {
        onChange(presetConfig.getRange());
      }
    }
  };

  const handleStartChange = (date: Date | null) => {
    setPreset('custom');
    onChange({ ...value, start: date });
  };

  const handleEndChange = (date: Date | null) => {
    setPreset('custom');
    onChange({ ...value, end: date });
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Stack spacing={2} sx={{ width: fullWidth ? '100%' : 'auto' }}>
        {showPresets && (
          <FormControl fullWidth={fullWidth} size={size} disabled={disabled}>
            <InputLabel>{label}</InputLabel>
            <Select
              value={preset}
              onChange={handlePresetChange}
              label={label}
            >
              {TIME_PRESETS.map((preset) => (
                <MenuItem key={preset.value} value={preset.value}>
                  {preset.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {preset === 'custom' && (
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <DateTimePicker
              label="Start Time"
              value={value.start}
              onChange={handleStartChange}
              disabled={disabled}
              slotProps={{
                textField: {
                  size: size,
                  fullWidth: fullWidth,
                  sx: { flex: 1, minWidth: 200 }
                }
              }}
            />
            <DateTimePicker
              label="End Time"
              value={value.end}
              onChange={handleEndChange}
              disabled={disabled}
              minDateTime={value.start || undefined}
              slotProps={{
                textField: {
                  size: size,
                  fullWidth: fullWidth,
                  sx: { flex: 1, minWidth: 200 }
                }
              }}
            />
          </Box>
        )}
      </Stack>
    </LocalizationProvider>
  );
};

export default TimeRangePicker;
