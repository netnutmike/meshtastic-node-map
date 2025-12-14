import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  IconButton,
  InputBase,
  alpha,
  styled,
  Button,
} from '@mui/material';
import {
  Search as SearchIcon,
  Info as InfoIcon,
  Devices as DevicesIcon,
  Settings as SettingsIcon,
  Refresh as RefreshIcon,
  AccountTree as TopologyIcon,
  Map as MapOptionsIcon,
  Monitor as MonitorIcon,
  Login as LoginIcon,
} from '@mui/icons-material';
import ConnectionStatus from '../ConnectionStatus';
import Settings from '../Settings';
import CustomLinksMenu from '../CustomLinksMenu';
import { AuthModal, UserMenu } from '../Auth';
import { selectIsAuthenticated, selectUser } from '../../store/slices/authSlice';

const Search = styled('div')(({ theme }) => ({
  position: 'relative',
  borderRadius: theme.shape.borderRadius,
  backgroundColor: alpha(theme.palette.common.white, 0.15),
  '&:hover': {
    backgroundColor: alpha(theme.palette.common.white, 0.25),
  },
  marginLeft: 0,
  width: '100%',
  [theme.breakpoints.up('sm')]: {
    marginLeft: theme.spacing(1),
    width: 'auto',
  },
}));

const SearchIconWrapper = styled('div')(({ theme }) => ({
  padding: theme.spacing(0, 2),
  height: '100%',
  position: 'absolute',
  pointerEvents: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: 'inherit',
  '& .MuiInputBase-input': {
    padding: theme.spacing(1, 1, 1, 0),
    paddingLeft: `calc(1em + ${theme.spacing(4)})`,
    transition: theme.transitions.create('width'),
    width: '100%',
    [theme.breakpoints.up('sm')]: {
      width: '20ch',
      '&:focus': {
        width: '30ch',
      },
    },
  },
}));

interface NavigationHeaderProps {
  onSearch?: (query: string) => void;
  onRefresh?: () => void;
  onOpenTopology?: () => void;
  onOpenMapOptions?: () => void;
  onOpenMQTTMonitor?: () => void;
}

const NavigationHeader: React.FC<NavigationHeaderProps> = ({
  onSearch,
  onRefresh,
  onOpenTopology,
  onOpenMapOptions,
  onOpenMQTTMonitor,
}) => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authEnabled, setAuthEnabled] = useState(false);
  const navigate = useNavigate();
  
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const user = useSelector(selectUser);

  // Check if authentication is enabled via API
  React.useEffect(() => {
    const checkAuthConfig = async () => {
      try {
        const response = await fetch('/api/auth/config');
        if (response.ok) {
          const config = await response.json();
          setAuthEnabled(config.enabled);
        }
      } catch (error) {
        // If auth config endpoint doesn't exist or fails, assume auth is disabled
        setAuthEnabled(false);
      }
    };
    
    checkAuthConfig();
  }, []);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onSearch?.(event.target.value);
  };

  const handleOpenSettings = () => {
    setSettingsOpen(true);
  };

  const handleCloseSettings = () => {
    setSettingsOpen(false);
  };

  return (
    <AppBar position="static">
      <Toolbar>
        {/* Logo and Site Name */}
        <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
          <Typography
            variant="h6"
            component="div"
            sx={{ display: 'flex', alignItems: 'center', fontWeight: 'bold' }}
          >
            🗺️ Meshtastic Node Mapper
          </Typography>
        </Box>

        {/* Search Bar */}
        <Search sx={{ flexGrow: 1, maxWidth: 400 }}>
          <SearchIconWrapper>
            <SearchIcon />
          </SearchIconWrapper>
          <StyledInputBase
            placeholder="Search nodes..."
            inputProps={{ 'aria-label': 'search' }}
            onChange={handleSearchChange}
          />
        </Search>

        {/* Connection Status */}
        <Box sx={{ mx: 2 }}>
          <ConnectionStatus />
        </Box>

        {/* Navigation Icons */}
        <Box sx={{ display: 'flex', alignItems: 'center', ml: 2 }}>
          <IconButton
            color="inherit"
            aria-label="about"
            title="About"
            onClick={() => navigate('/about')}
          >
            <InfoIcon />
          </IconButton>
          
          <IconButton
            color="inherit"
            aria-label="devices"
            title="Devices"
          >
            <DevicesIcon />
          </IconButton>
          
          <IconButton
            color="inherit"
            aria-label="settings"
            title="Settings"
            onClick={handleOpenSettings}
          >
            <SettingsIcon />
          </IconButton>
          
          <IconButton
            color="inherit"
            aria-label="mqtt monitor"
            title="MQTT Monitor"
            onClick={onOpenMQTTMonitor}
          >
            <MonitorIcon />
          </IconButton>
          
          <IconButton
            color="inherit"
            aria-label="network topology"
            title="Network Topology Graph"
            onClick={onOpenTopology}
          >
            <TopologyIcon />
          </IconButton>
          
          <IconButton
            color="inherit"
            aria-label="map options"
            title="Map Options"
            onClick={onOpenMapOptions}
          >
            <MapOptionsIcon />
          </IconButton>
          
          <CustomLinksMenu />
          
          <IconButton
            color="inherit"
            aria-label="refresh map"
            title="Refresh Map"
            onClick={onRefresh}
          >
            <RefreshIcon />
          </IconButton>
        </Box>

        {/* Authentication Section - Only show if auth is enabled */}
        {authEnabled && (
          <Box sx={{ ml: 2 }}>
            {isAuthenticated && user ? (
              <UserMenu user={user} />
            ) : (
              <Button
                color="inherit"
                startIcon={<LoginIcon />}
                onClick={() => setAuthModalOpen(true)}
              >
                Sign In
              </Button>
            )}
          </Box>
        )}
      </Toolbar>

      {/* Settings Dialog */}
      <Settings 
        open={settingsOpen} 
        onClose={handleCloseSettings} 
      />

      {/* Authentication Modal - Only render if auth is enabled */}
      {authEnabled && (
        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
        />
      )}
    </AppBar>
  );
};

export default NavigationHeader;