/**
 * Navigation Header Component
 * Main navigation bar with search, tools menu, and settings
 * Requirements: 6.1, 6.2, 6.3, 6.4, 40.15
 */

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
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Search as SearchIcon,
  Info as InfoIcon,
  Devices as DevicesIcon,
  Settings as SettingsIcon,
  Refresh as RefreshIcon,
  AccountTree as TopologyIcon,
  Monitor as MonitorIcon,
  Login as LoginIcon,
  MapOutlined as MapIcon,
  Dashboard as DashboardIcon,
  Build as ToolsIcon,
  Visibility as LineOfSightIcon,
  BarChart as AnalyticsIcon,
} from '@mui/icons-material';
import ConnectionStatus from '../ConnectionStatus';
import Settings from '../Settings';
import CustomLinksMenu from '../CustomLinksMenu';
import { AuthModal, UserMenu } from '../Auth';
import ThemeToggle from './ThemeToggle';
import { selectIsAuthenticated, selectUser } from '../../store/slices/authSlice';
import { loadAppName } from '../../services/config';

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
  onOpenMQTTMonitor?: () => void;
}

const NavigationHeader: React.FC<NavigationHeaderProps> = ({
  onSearch,
  onRefresh,
  onOpenTopology,
  onOpenMQTTMonitor,
}) => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authEnabled, setAuthEnabled] = useState(false);
  const [appName, setAppName] = useState('Meshtastic Node Mapper');
  const [toolsMenuAnchor, setToolsMenuAnchor] = useState<null | HTMLElement>(null);
  const navigate = useNavigate();
  
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const user = useSelector(selectUser);

  const toolsMenuOpen = Boolean(toolsMenuAnchor);

  // Load app name from config
  React.useEffect(() => {
    loadAppName().then(name => {
      setAppName(name);
      // Also update document title
      document.title = name;
    });
  }, []);

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

  const handleOpenToolsMenu = (event: React.MouseEvent<HTMLElement>) => {
    setToolsMenuAnchor(event.currentTarget);
  };

  const handleCloseToolsMenu = () => {
    setToolsMenuAnchor(null);
  };

  const handleToolsMenuItemClick = (path: string) => {
    handleCloseToolsMenu();
    navigate(path);
  };

  return (
    <AppBar position="static">
      <Toolbar>
        {/* Logo and Site Name */}
        <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
          <Box
            component="img"
            src="/logo.png"
            alt={`${appName} Logo`}
            sx={{
              height: 40,
              width: 'auto',
              mr: 1.5,
              display: 'block'
            }}
          />
          <Typography
            variant="h6"
            component="div"
            sx={{ display: 'flex', alignItems: 'center', fontWeight: 'bold' }}
          >
            {appName}
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
            aria-label="map"
            title="Map"
            onClick={() => navigate('/')}
          >
            <MapIcon />
          </IconButton>
          
          <IconButton
            color="inherit"
            aria-label="nodes"
            title="Nodes"
            onClick={() => navigate('/nodes')}
          >
            <DevicesIcon />
          </IconButton>
          
          <IconButton
            color="inherit"
            aria-label="tools"
            title="Tools"
            onClick={handleOpenToolsMenu}
          >
            <ToolsIcon />
          </IconButton>
          
          <Menu
            anchorEl={toolsMenuAnchor}
            open={toolsMenuOpen}
            onClose={handleCloseToolsMenu}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
          >
            <MenuItem onClick={() => handleToolsMenuItemClick('/line-of-sight')}>
              <ListItemIcon>
                <LineOfSightIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Line of Sight Analysis</ListItemText>
            </MenuItem>
            <MenuItem onClick={onOpenMQTTMonitor}>
              <ListItemIcon>
                <MonitorIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>MQTT Monitor</ListItemText>
            </MenuItem>
            <MenuItem onClick={onOpenTopology}>
              <ListItemIcon>
                <TopologyIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Network Topology</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => handleToolsMenuItemClick('/insights')}>
              <ListItemIcon>
                <AnalyticsIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Network Insights</ListItemText>
            </MenuItem>
          </Menu>
          
          <IconButton
            color="inherit"
            aria-label="settings"
            title="Settings"
            onClick={handleOpenSettings}
          >
            <SettingsIcon />
          </IconButton>
          
          <CustomLinksMenu />
          
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
            aria-label="refresh map"
            title="Refresh Map"
            onClick={onRefresh}
          >
            <RefreshIcon />
          </IconButton>
          
          <ThemeToggle />
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