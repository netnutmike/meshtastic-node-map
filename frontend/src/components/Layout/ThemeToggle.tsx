/**
 * ThemeToggle Component
 * 
 * Provides a button to cycle through theme preferences: light → dark → auto
 * Displays appropriate icon for current theme mode
 * 
 * Requirements: 35.12
 */

import React, { useState, useEffect } from 'react';
import { IconButton, Tooltip } from '@mui/material';
import {
  LightMode as LightModeIcon,
  DarkMode as DarkModeIcon,
  Brightness4 as AutoModeIcon,
} from '@mui/icons-material';
import { getDarkModeToggle, ThemePreference } from '../../utils/DarkModeToggle';

const ThemeToggle: React.FC = () => {
  const [themePreference, setThemePreference] = useState<ThemePreference>('auto');
  const darkModeToggle = getDarkModeToggle();

  useEffect(() => {
    // Initialize with current theme preference
    setThemePreference(darkModeToggle.getThemePreference());

    // Listen for theme changes
    const handleThemeChange = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail && customEvent.detail.preference) {
        setThemePreference(customEvent.detail.preference);
      }
    };

    window.addEventListener('themeChanged', handleThemeChange);

    return () => {
      window.removeEventListener('themeChanged', handleThemeChange);
    };
  }, [darkModeToggle]);

  const handleToggleTheme = () => {
    darkModeToggle.cycleTheme();
  };

  // Get icon based on current theme preference
  const getThemeIcon = () => {
    switch (themePreference) {
      case 'light':
        return <LightModeIcon />;
      case 'dark':
        return <DarkModeIcon />;
      case 'auto':
        return <AutoModeIcon />;
      default:
        return <AutoModeIcon />;
    }
  };

  // Get tooltip text based on current theme
  const getTooltipText = () => {
    switch (themePreference) {
      case 'light':
        return 'Theme: Light (click to switch to Dark)';
      case 'dark':
        return 'Theme: Dark (click to switch to Auto)';
      case 'auto':
        return 'Theme: Auto (click to switch to Light)';
      default:
        return 'Toggle theme';
    }
  };

  // Get aria-label based on current theme
  const getAriaLabel = () => {
    switch (themePreference) {
      case 'light':
        return 'Switch to dark theme';
      case 'dark':
        return 'Switch to auto theme';
      case 'auto':
        return 'Switch to light theme';
      default:
        return 'Toggle theme';
    }
  };

  return (
    <Tooltip title={getTooltipText()}>
      <IconButton
        color="inherit"
        onClick={handleToggleTheme}
        aria-label={getAriaLabel()}
        sx={{
          ml: 1,
          '&:focus': {
            outline: '2px solid currentColor',
            outlineOffset: '2px',
          },
        }}
      >
        {getThemeIcon()}
      </IconButton>
    </Tooltip>
  );
};

export default ThemeToggle;
