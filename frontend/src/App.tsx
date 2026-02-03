import React, { useEffect, useState, useMemo } from 'react';
import { Provider } from 'react-redux';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { useMediaQuery } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import { store } from './store';
import AppRouter from './routes/AppRouter';
import webSocketService from './services/websocket';
import offlineService from './services/offline.service';
import { MOTD } from './components/MOTD';
import { loadMOTDConfig, MOTDConfig } from './services/config';
import { getDarkModeToggle } from './utils/DarkModeToggle';
import './App.css';
import './styles/mobile.css';

function App() {
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light');

  // Create theme based on current mode
  const theme = useMemo(() => createTheme({
    palette: {
      mode: themeMode,
      primary: {
        main: '#1976d2',
      },
      secondary: {
        main: '#dc004e',
      },
    },
    breakpoints: {
      values: {
        xs: 0,
        sm: 600,
        md: 768,
        lg: 1024,
        xl: 1200,
      },
    },
    components: {
      // Mobile-optimized component overrides
      MuiButton: {
        styleOverrides: {
          root: {
            '@media (max-width: 768px)': {
              minHeight: 44,
              minWidth: 44,
            },
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            '@media (max-width: 768px)': {
              padding: 12,
            },
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '@media (max-width: 768px)': {
              '& input': {
                fontSize: '16px', // Prevent zoom on iOS
              },
            },
          },
        },
      },
    },
  }), [themeMode]);
  const [servicesInitialized, setServicesInitialized] = React.useState(false);
  const [motdConfig, setMotdConfig] = React.useState<MOTDConfig>({
    enabled: false,
    title: '',
    message: '',
    dismissible: true
  });

  useEffect(() => {
    // Initialize dark mode toggle and set initial theme
    const darkModeToggle = getDarkModeToggle();
    const effectiveTheme = darkModeToggle.getEffectiveTheme();
    setThemeMode(effectiveTheme);

    // Listen for theme changes
    const handleThemeChange = (event: Event) => {
      const customEvent = event as CustomEvent;
      setThemeMode(customEvent.detail.effective);
    };
    
    window.addEventListener('themeChanged', handleThemeChange);

    // Load MOTD configuration
    loadMOTDConfig().then(config => {
      setMotdConfig(config);
    });

    // Delay initialization to ensure React and Redux are fully ready
    const timer = setTimeout(async () => {
      try {
        // Enable Redux dispatching for websocket service
        webSocketService.enableReduxDispatching();
        
        // Initialize offline service (which also enables Redux dispatching)
        await offlineService.initialize();
        
        // Now connect websocket after services are ready
        webSocketService.connect();
        
        setServicesInitialized(true);
        console.log('Services initialized successfully');
      } catch (error) {
        console.error('Failed to initialize services:', error);
      }
    }, 100); // Small delay to ensure React is fully mounted

    // Set up viewport meta tag for mobile
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      viewport.setAttribute('content', 
        'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
      );
    }

    // Prevent default touch behaviors that interfere with map interaction
    const preventDefaultTouch = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };

    document.addEventListener('touchstart', preventDefaultTouch, { passive: false });
    document.addEventListener('touchmove', preventDefaultTouch, { passive: false });

    // Cleanup on unmount
    return () => {
      clearTimeout(timer);
      window.removeEventListener('themeChanged', handleThemeChange);
      webSocketService.disconnect();
      offlineService.destroy();
      darkModeToggle.destroy();
      document.removeEventListener('touchstart', preventDefaultTouch);
      document.removeEventListener('touchmove', preventDefaultTouch);
    };
  }, []);

  return (
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AppRouter />
        <MOTD config={motdConfig} />
      </ThemeProvider>
    </Provider>
  );
}

export default App;