import packageJson from '../../package.json';

export interface AppConfig {
  name: string;
  version: string;
  description: string;
  author?: string;
  license?: string;
  repository?: string;
  homepage?: string;
}

export interface CustomContentSection {
  title: string;
  content: string;
  type: 'text' | 'html' | 'markdown';
}

export interface CustomLink {
  name: string;
  description: string;
  url: string;
  icon?: string;
}

export interface AboutPageConfig {
  appInfo: AppConfig;
  customContent?: CustomContentSection[];
  showTechnicalDetails?: boolean;
  showContributors?: boolean;
}

/**
 * Get application configuration from package.json
 */
export const getAppConfig = (): AppConfig => {
  return {
    name: packageJson.name || 'Meshtastic Node Mapper',
    version: packageJson.version || '1.0.0',
    description: packageJson.description || 'Web-based visualization for Meshtastic mesh networks',
    author: 'Meshtastic Community',
    license: 'GPL-3.0',
    repository: 'https://github.com/meshtastic/node-mapper',
    homepage: 'https://meshtastic.org',
  };
};

/**
 * Load about page configuration
 * In a real implementation, this could fetch from an API or config service
 */
export const loadAboutPageConfig = async (): Promise<AboutPageConfig> => {
  try {
    // For now, return a static configuration
    // In the future, this could fetch from /api/config/about or similar
    const appInfo = getAppConfig();
    
    const config: AboutPageConfig = {
      appInfo,
      customContent: [
        {
          title: 'About Meshtastic',
          content: 'Meshtastic is an open source, off-grid, decentralized, mesh network built to run on affordable, low-power devices. This application provides real-time visualization and monitoring capabilities for Meshtastic mesh networks.',
          type: 'text',
        },
        {
          title: 'Features',
          content: `• Real-time node visualization on interactive maps
• Comprehensive telemetry monitoring and historical data
• Message tracking and routing path analysis
• Network topology visualization and analysis
• Multi-network support for distributed deployments
• Advanced analytics and predictive insights
• Mobile-responsive design for field use
• Configurable alerts and notifications`,
          type: 'text',
        },
        {
          title: 'Getting Started',
          content: `This application connects to your Meshtastic network via MQTT to provide real-time monitoring and visualization. Nodes appear on the map as colored dots indicating their status:

• Green: Online and connected to MQTT
• Blue: Disconnected from MQTT but recently seen
• Red: Offline for an extended period

Click on any node to view detailed information, telemetry data, and message history.`,
          type: 'text',
        },
      ],
      showTechnicalDetails: true,
      showContributors: true,
    };

    return config;
  } catch (error) {
    console.error('Failed to load about page configuration:', error);
    
    // Fallback configuration
    return {
      appInfo: getAppConfig(),
      showTechnicalDetails: false,
      showContributors: false,
    };
  }
};

/**
 * Load custom links configuration
 * In a real implementation, this would fetch from the backend API
 */
export const loadCustomLinks = async (): Promise<CustomLink[]> => {
  try {
    // For now, return static configuration matching the YAML structure
    // In the future, this could fetch from /api/config/custom-links or similar
    const customLinks: CustomLink[] = [
      {
        name: "Meshtastic Documentation",
        description: "Official Meshtastic documentation",
        url: "https://meshtastic.org/docs",
        icon: "book"
      },
      {
        name: "Community Forum",
        description: "Meshtastic community discussions",
        url: "https://meshtastic.discourse.group",
        icon: "forum"
      }
    ];

    return customLinks;
  } catch (error) {
    console.error('Failed to load custom links configuration:', error);
    return [];
  }
};

/**
 * Get system information for display
 */
export const getSystemInfo = () => {
  return {
    version: getAppConfig().version,
    buildDate: new Date().toISOString(),
    userAgent: navigator.userAgent,
    screenResolution: `${window.screen.width} × ${window.screen.height}`,
    viewport: `${window.innerWidth} × ${window.innerHeight}`,
    language: navigator.language,
    platform: navigator.platform,
    cookieEnabled: navigator.cookieEnabled,
    onlineStatus: navigator.onLine,
  };
};