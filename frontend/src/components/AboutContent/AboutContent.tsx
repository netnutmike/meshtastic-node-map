import React, { useEffect, useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Divider,
  Chip,
  Link,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Info as InfoIcon,
  Code as CodeIcon,
  GitHub as GitHubIcon,
  Description as DocsIcon,
} from '@mui/icons-material';
import { 
  loadAboutPageConfig, 
  getSystemInfo,
  type AboutPageConfig,
  type CustomContentSection 
} from '../../services/config';

const AboutContent: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [config, setConfig] = useState<AboutPageConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load about page configuration and version information
    const loadAboutConfig = async () => {
      try {
        const aboutConfig = await loadAboutPageConfig();
        setConfig(aboutConfig);
      } catch (error) {
        console.error('Failed to load about configuration:', error);
        // Set config to null to show error state
        setConfig(null);
      } finally {
        setLoading(false);
      }
    };

    loadAboutConfig();
  }, []);

  const renderCustomContent = (content: CustomContentSection) => {
    switch (content.type) {
      case 'html':
        return (
          <Typography
            component="div"
            dangerouslySetInnerHTML={{ __html: content.content }}
          />
        );
      case 'markdown':
        // In a real implementation, you'd use a markdown parser
        return (
          <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
            {content.content}
          </Typography>
        );
      default:
        return (
          <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
            {content.content}
          </Typography>
        );
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" align="center">
          Loading...
        </Typography>
      </Container>
    );
  }

  if (!config) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" align="center" color="error">
          Failed to load about information
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Grid container spacing={3}>
        {/* Main Application Information */}
        <Grid item xs={12}>
          <Paper elevation={3} sx={{ p: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <InfoIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
              <Box>
                <Typography variant="h3" component="h1" gutterBottom>
                  {config.appInfo.name}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Chip
                    label={`Version ${config.appInfo.version}`}
                    color="primary"
                    variant="outlined"
                  />
                  {config.appInfo.license && (
                    <Chip
                      label={config.appInfo.license}
                      color="secondary"
                      variant="outlined"
                    />
                  )}
                </Box>
              </Box>
            </Box>
            
            <Typography variant="h6" color="text.secondary" paragraph>
              {config.appInfo.description}
            </Typography>

            {config.appInfo.author && (
              <Typography variant="body2" color="text.secondary">
                Created by {config.appInfo.author}
              </Typography>
            )}
          </Paper>
        </Grid>

        {/* Application Features */}
        <Grid item xs={12} md={6}>
          <Card elevation={2} sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h5" component="h2" gutterBottom>
                Features
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
                {`• Real-time node visualization on interactive maps
• Comprehensive telemetry monitoring and historical data
• Message tracking and routing path analysis
• Network topology visualization and analysis
• Multi-network support for distributed deployments
• Advanced analytics and predictive insights
• Mobile-responsive design for field use
• Configurable alerts and notifications`}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Getting Started */}
        <Grid item xs={12} md={6}>
          <Card elevation={2} sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h5" component="h2" gutterBottom>
                Getting Started
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="body1" paragraph>
                This application connects to your Meshtastic network via MQTT to provide real-time monitoring and visualization. Nodes appear on the map as colored dots indicating their status:
              </Typography>
              <Typography variant="body2" component="div" sx={{ ml: 2 }}>
                • Green: Online and connected to MQTT<br />
                • Blue: Disconnected from MQTT but recently seen<br />
                • Red: Offline for an extended period
              </Typography>
              <Typography variant="body1" sx={{ mt: 2 }}>
                Click on any node to view detailed information, telemetry data, and message history.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Application Resources */}
        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <DocsIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h5" component="h2">
                  Application Resources
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Link
                  href="https://github.com/netnutmike/meshtastic-node-map"
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ display: 'flex', alignItems: 'center' }}
                >
                  <GitHubIcon sx={{ mr: 1, fontSize: 20 }} />
                  GitHub Repository
                </Link>
                <Link
                  href="https://github.com/netnutmike/meshtastic-node-map/blob/main/docs/user-guide.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ display: 'flex', alignItems: 'center' }}
                >
                  <DocsIcon sx={{ mr: 1, fontSize: 20 }} />
                  User Guide
                </Link>
                <Link
                  href="https://github.com/netnutmike/meshtastic-node-map/blob/main/docs/installation.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ display: 'flex', alignItems: 'center' }}
                >
                  <DocsIcon sx={{ mr: 1, fontSize: 20 }} />
                  Installation Guide
                </Link>
                <Link
                  href="https://github.com/netnutmike/meshtastic-node-map/blob/main/docs/api-guide.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ display: 'flex', alignItems: 'center' }}
                >
                  <CodeIcon sx={{ mr: 1, fontSize: 20 }} />
                  API Documentation
                </Link>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Technical Details */}
        {config.showTechnicalDetails && (
          <Grid item xs={12} md={6}>
            <Card elevation={2}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <CodeIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h5" component="h2">
                    Technical Details
                  </Typography>
                </Box>
                <Divider sx={{ mb: 2 }} />
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Frontend Framework
                  </Typography>
                  <Typography variant="body2">React 18 with TypeScript</Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Mapping Library
                  </Typography>
                  <Typography variant="body2">Leaflet.js with OpenStreetMap</Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Real-time Communication
                  </Typography>
                  <Typography variant="body2">WebSocket with Socket.io</Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Data Protocol
                  </Typography>
                  <Typography variant="body2">MQTT with Meshtastic Protobuf</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* About Meshtastic */}
        <Grid item xs={12}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h5" component="h2" gutterBottom>
                About Meshtastic
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="body1" paragraph>
                Meshtastic is an open source, off-grid, decentralized, mesh network built to run on affordable, low-power devices. This application provides real-time visualization and monitoring capabilities for Meshtastic mesh networks.
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Meshtastic Resources
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, ml: 2 }}>
                  <Link
                    href="https://meshtastic.org"
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ display: 'flex', alignItems: 'center' }}
                  >
                    <InfoIcon sx={{ mr: 1, fontSize: 20 }} />
                    Official Website
                  </Link>
                  <Link
                    href="https://meshtastic.org/docs"
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ display: 'flex', alignItems: 'center' }}
                  >
                    <DocsIcon sx={{ mr: 1, fontSize: 20 }} />
                    Meshtastic Documentation
                  </Link>
                  <Link
                    href="https://meshtastic.discourse.group"
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ display: 'flex', alignItems: 'center' }}
                  >
                    <InfoIcon sx={{ mr: 1, fontSize: 20 }} />
                    Community Forum
                  </Link>
                  <Link
                    href="https://github.com/meshtastic"
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ display: 'flex', alignItems: 'center' }}
                  >
                    <GitHubIcon sx={{ mr: 1, fontSize: 20 }} />
                    Meshtastic GitHub
                  </Link>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* System Information */}
        <Grid item xs={12}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h5" component="h2" gutterBottom>
                System Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                {(() => {
                  const systemInfo = getSystemInfo();
                  return (
                    <>
                      <Grid item xs={12} sm={6} md={3}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Application Version
                        </Typography>
                        <Typography variant="body2">{systemInfo.version}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Build Date
                        </Typography>
                        <Typography variant="body2">
                          {new Date(systemInfo.buildDate).toLocaleDateString()}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Browser
                        </Typography>
                        <Typography variant="body2">{systemInfo.browser}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Language
                        </Typography>
                        <Typography variant="body2">{systemInfo.language}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Online Status
                        </Typography>
                        <Typography variant="body2">
                          {systemInfo.onlineStatus ? 'Online' : 'Offline'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Cookies Enabled
                        </Typography>
                        <Typography variant="body2">
                          {systemInfo.cookieEnabled ? 'Yes' : 'No'}
                        </Typography>
                      </Grid>
                    </>
                  );
                })()}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default AboutContent;