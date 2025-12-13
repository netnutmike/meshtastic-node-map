import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  IconButton,
  InputBase,
  alpha,
  styled,
} from '@mui/material';
import {
  Search as SearchIcon,
  Info as InfoIcon,
  Devices as DevicesIcon,
  Settings as SettingsIcon,
  Build as ToolsIcon,
  Link as LinkIcon,
  Refresh as RefreshIcon,
  AccountTree as TopologyIcon,
} from '@mui/icons-material';
import ConnectionStatus from '../ConnectionStatus';

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
}

const NavigationHeader: React.FC<NavigationHeaderProps> = ({
  onSearch,
  onRefresh,
  onOpenTopology,
}) => {
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onSearch?.(event.target.value);
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
          >
            <SettingsIcon />
          </IconButton>
          
          <IconButton
            color="inherit"
            aria-label="tools"
            title="Tools"
          >
            <ToolsIcon />
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
            aria-label="custom links"
            title="Custom Links"
          >
            <LinkIcon />
          </IconButton>
          
          <IconButton
            color="inherit"
            aria-label="refresh map"
            title="Refresh Map"
            onClick={onRefresh}
          >
            <RefreshIcon />
          </IconButton>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default NavigationHeader;