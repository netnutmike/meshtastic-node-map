import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, Typography, Container } from '@mui/material';
import './App.css';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ flexGrow: 1 }}>
        <Container maxWidth="lg">
          <Box sx={{ my: 4 }}>
            <Typography variant="h3" component="h1" gutterBottom align="center">
              🗺️ Meshtastic Node Mapper
            </Typography>
            <Typography variant="h6" component="h2" gutterBottom align="center" color="text.secondary">
              Real-time visualization and monitoring of Meshtastic mesh networks
            </Typography>
            <Box sx={{ mt: 4, p: 3, border: '1px solid #e0e0e0', borderRadius: 2 }}>
              <Typography variant="body1" paragraph>
                Welcome to the Meshtastic Node Mapper! This application provides comprehensive
                visualization and monitoring capabilities for Meshtastic mesh networks.
              </Typography>
              <Typography variant="body2" color="text.secondary">
                🚧 Application is starting up... The full interface will be available once
                all services are initialized.
              </Typography>
            </Box>
          </Box>
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;